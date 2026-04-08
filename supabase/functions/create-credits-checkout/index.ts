import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { buildCreditTopUpExternalReference } from "../_shared/payment/creditTopUpRef.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import {
  loadCreditsPackFromEnv,
  loadMercadoPagoAccessToken,
} from "../_shared/payment/mercadopago/loadEnv.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const appUrl = Deno.env.get("OBRA_APP_URL")?.replace(/\/$/, "");
  const accessToken = loadMercadoPagoAccessToken();

  const pack = loadCreditsPackFromEnv();
  if ("error" in pack) {
    return json({ error: "server_misconfigured", detail: pack.error }, 500);
  }

  if (!supabaseUrl || !anonKey) {
    return json({ error: "server_misconfigured", detail: "supabase_auth" }, 500);
  }

  let billing;
  try {
    billing = getBillingAdapter();
  } catch (e) {
    console.error("billing_adapter", e);
    return json({ error: "server_misconfigured", detail: "payment_provider" }, 500);
  }

  if (!accessToken || !appUrl) {
    return json({ error: "checkout_unavailable", detail: "missing_mercadopago_or_app_url" });
  }
  if (!/^https?:\/\//i.test(appUrl)) {
    return json({ error: "checkout_unavailable", detail: "invalid_app_url_scheme" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  // Forward the caller JWT on every request so PostgREST RLS sees `auth.uid()` (getUser(jwt) alone does not attach it).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const userId = user.id;

  const { data: profile, error: profErr } = await supabase
    .from("creator_profiles")
    .select("id, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    console.error("creator_profiles_select", profErr.message);
    return json({ error: "db_profile" }, 500);
  }
  if (!profile || profile.subscription_status !== "active") {
    return json({ error: "subscription_required" }, 403);
  }

  const notificationUrl = billing.webhookUrlForSupabaseProject(supabaseUrl);
  const backUrl = `${appUrl}/checkout/return`;
  const externalReference = buildCreditTopUpExternalReference(userId, pack.packCredits);

  const result = await billing.createCreditsPackCheckout(accessToken, {
    creatorUserId: userId,
    payerEmail: user.email ?? undefined,
    notificationUrl,
    returnUrl: backUrl,
    externalReference,
    metadata: {
      obra_kind: "credits_topup",
      obra_user_id: userId,
      obra_credits: String(pack.packCredits),
    },
    lineItem: {
      title: pack.itemTitle,
      quantity: 1,
      unitPrice: pack.unitPrice,
      currencyId: pack.currencyId,
    },
  });

  if (!result.ok) {
    if (result.error.code === "provider_http_error") {
      console.error("billing_credits_http", result.error.status, result.error.detail);
      return json({ error: "mercadopago_error", status: result.error.status, detail: result.error.detail });
    }
    if (result.error.code === "provider_no_redirect") {
      return json({ error: "mercadopago_no_redirect", detail: result.error.detail });
    }
    return json({ error: "checkout_unavailable", detail: result.error.detail ?? result.error.code });
  }

  return json({
    redirect_url: result.redirectUrl,
    preference_id: result.providerCheckoutId,
  });
});
