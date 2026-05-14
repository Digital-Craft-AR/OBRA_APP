import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/** Must mirror TOP_UP_PRESETS in SettingsCreditsPanel.tsx. */
const ALLOWED_PRESETS: Array<{ credits: number; unitPrice: number }> = [
  { credits: 50,  unitPrice: 3000  },
  { credits: 150, unitPrice: 8000  },
  { credits: 350, unitPrice: 17000 },
];
import {
  buildCreditTopUpExternalReference,
  parseCreditTopUpExternalReference,
} from "../_shared/payment/creditTopUpRef.ts";
import { billingNeedsMercadoPagoAccessToken } from "../_shared/payment/billingEnv.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import {
  loadCreditsPackFromEnv,
  loadMercadoPagoAccessToken,
} from "../_shared/payment/mercadopago/loadEnv.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";

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

  const needMp = billingNeedsMercadoPagoAccessToken(billing);
  if (!appUrl) {
    return json({ error: "checkout_unavailable", detail: "missing_obra_app_url" });
  }
  if (needMp && !accessToken) {
    return json({ error: "checkout_unavailable", detail: "missing_mercadopago_token" });
  }
  if (!/^https?:\/\//i.test(appUrl)) {
    return json({ error: "checkout_unavailable", detail: "invalid_app_url_scheme" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  const jwt = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const userId = user.id;

  const { data: profile, error: profErr } = await supabase
    .from("creator_profiles")
    .select("id, subscription_status, subscription_access_until")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    console.error("creator_profiles_select", profErr.message);
    return json({ error: "db_profile" }, 500);
  }
  if (!isSubscriptionEntitled(profile as { subscription_status?: string; subscription_access_until?: string | null } | null)) {
    return json({ error: "subscription_required" }, 403);
  }

  let bodyCredits: number | undefined;
  let bodyUnitPrice: number | undefined;
  try {
    const body = await req.json();
    const rawAmount = body?.amount;
    const rawCredits = body?.credits;
    if (rawAmount !== undefined || rawCredits !== undefined) {
      const matched = ALLOWED_PRESETS.find(
        (p) =>
          p.credits === rawCredits &&
          p.unitPrice === rawAmount,
      );
      if (!matched) {
        return json({ error: "invalid_preset" }, 400);
      }
      bodyUnitPrice = matched.unitPrice;
      bodyCredits = matched.credits;
    }
  } catch { /* body is optional */ }

  const packCredits = bodyCredits ?? pack.packCredits;
  const unitPrice = bodyUnitPrice ?? pack.unitPrice;

  const notificationUrl = billing.webhookUrlForSupabaseProject(supabaseUrl);
  const backUrl = `${appUrl}/checkout/return`;
  const externalReference = buildCreditTopUpExternalReference(userId, packCredits);
  /** Lets the SPA route credit top-up returns to Settings → Credits (not subscription activating). */
  const creditReturnSuccess = `${backUrl}?status=success&checkout_kind=credits`;

  const result = await billing.createCreditsPackCheckout(accessToken ?? "", {
    creatorUserId: userId,
    payerEmail: user.email ?? undefined,
    notificationUrl,
    returnUrl: backUrl,
    backUrls: {
      success: creditReturnSuccess,
      failure: `${backUrl}?status=failure&checkout_kind=credits`,
      pending: `${backUrl}?status=pending&checkout_kind=credits`,
    },
    externalReference,
    metadata: {
      obra_kind: "credits_topup",
      obra_user_id: userId,
      obra_credits: String(packCredits),
    },
    lineItem: {
      title: pack.itemTitle,
      quantity: 1,
      unitPrice,
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

  /**
   * ObraPay skips real payments and never receives MP webhooks. Grant credits here so dev/staging
   * matches production semantics (balance updates before the user lands on the return URL).
   * Mercado Pago still relies on `mercadopago-webhook` after an approved payment.
   */
  if (billing.providerId === "obrapay") {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error("create_credits_checkout_obrapay_missing_service_role");
      return json({ error: "server_misconfigured", detail: "service_role" }, 500);
    }
    const creditTopUp = parseCreditTopUpExternalReference(externalReference);
    if (!creditTopUp) {
      console.error("create_credits_checkout_obrapay_bad_external_ref");
      return json({ error: "server_misconfigured", detail: "credit_ref" }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
      p_creator_id: creditTopUp.profileId,
      p_delta: creditTopUp.credits,
      p_reason: "top_up",
      p_idempotency_key: `obrapay_checkout:${externalReference}`,
      p_project_id: null,
    });
    if (rpcErr) {
      console.error("obrapay_credit_topup_ledger", rpcErr.message);
      return json({ error: "ledger_apply", detail: rpcErr.message }, 500);
    }
  }

  return json({
    redirect_url: result.redirectUrl,
    preference_id: result.providerCheckoutId,
  });
});
