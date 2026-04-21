import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { billingNeedsMercadoPagoAccessToken } from "../_shared/payment/billingEnv.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import { loadMercadoPagoAccessToken, loadRecurringPlanFromEnv } from "../_shared/payment/mercadopago/loadEnv.ts";
import type { RecurringPlanParams } from "../_shared/payment/types.ts";

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
  if (!/^https?:\/\//i.test(appUrl)) {
    return json({ error: "checkout_unavailable", detail: "invalid_app_url_scheme" });
  }
  if (needMp && !accessToken) {
    return json({ error: "checkout_unavailable", detail: "missing_mercadopago_token" });
  }

  let plan: RecurringPlanParams;
  if (needMp) {
    const loaded = loadRecurringPlanFromEnv();
    if ("error" in loaded) {
      return json({ error: "server_misconfigured", detail: loaded.error }, 500);
    }
    plan = loaded;
  } else {
    plan = {
      reason: "ObraPay mock subscription",
      unitPrice: 1,
      currencyId: "ARS",
      frequency: 1,
      frequencyType: "months",
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  const jwt = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }
  const claims = readJwtClaims(jwt);
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const userEmail = user.email ?? (typeof claims.email === "string" ? claims.email : undefined);
  if (!userId) {
    return json({ error: "unauthorized", detail: "missing_sub" }, 401);
  }

  const notificationUrl = billing.webhookUrlForSupabaseProject(supabaseUrl);
  // No query params here — MP appends preapproval_id with its own `?`, creating a malformed URL
  // if we already include `?status=success`. Success is detected via `preapproval_id` presence.
  const backUrl = `${appUrl}/checkout/return`;

  const result = await billing.createSubscriptionCheckout(accessToken ?? "", {
    creatorUserId: userId,
    payerEmail: userEmail,
    notificationUrl,
    returnUrl: backUrl,
    plan,
  });

  if (!result.ok) {
    if (result.error.code === "provider_http_error") {
      console.error("billing_subscription_http", result.error.status, result.error.detail);
      return json({ error: "mercadopago_error", status: result.error.status, detail: result.error.detail });
    }
    if (result.error.code === "provider_no_redirect") {
      return json({ error: "mercadopago_no_redirect", detail: result.error.detail });
    }
    return json({ error: "checkout_unavailable", detail: result.error.detail ?? result.error.code });
  }

  return json({
    redirect_url: result.redirectUrl,
    subscription_id: result.providerCheckoutId,
  });
});

function readJwtClaims(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  try {
    const jsonPayload = base64UrlDecode(parts[1]);
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
