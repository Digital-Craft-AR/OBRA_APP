import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MpSubscriptionResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
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
  const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const appUrl = Deno.env.get("OBRA_APP_URL")?.replace(/\/$/, "");

  if (!supabaseUrl || !anonKey) {
    return json({ error: "server_misconfigured", detail: "supabase_auth" }, 500);
  }

  if (!mpToken || !appUrl) {
    return json({ error: "checkout_unavailable", detail: "missing_mercadopago_or_app_url" });
  }
  if (!/^https?:\/\//i.test(appUrl)) {
    return json({ error: "checkout_unavailable", detail: "invalid_app_url_scheme" });
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

  const reason = Deno.env.get("MERCADOPAGO_SUBSCRIPTION_REASON") ?? "Obra recurring subscription";
  const unitPrice = Number(
    Deno.env.get("MERCADOPAGO_SUBSCRIPTION_AMOUNT") ??
      Deno.env.get("MERCADOPAGO_CHECKOUT_UNIT_PRICE") ??
      "100",
  );
  const currencyId =
    Deno.env.get("MERCADOPAGO_SUBSCRIPTION_CURRENCY_ID") ??
    Deno.env.get("MERCADOPAGO_CHECKOUT_CURRENCY_ID") ??
    "ARS";
  const frequency = Number(Deno.env.get("MERCADOPAGO_SUBSCRIPTION_FREQUENCY") ?? "1");
  const rawFrequencyType = Deno.env.get("MERCADOPAGO_SUBSCRIPTION_FREQUENCY_TYPE") ?? "months";
  const frequencyType = normalizeFrequencyType(rawFrequencyType);

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return json({ error: "server_misconfigured", detail: "price" }, 500);
  }

  if (!Number.isFinite(frequency) || frequency <= 0) {
    return json({ error: "server_misconfigured", detail: "frequency" }, 500);
  }

  const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;
  const backUrl = `${appUrl}/checkout/return`;
  // Mercado Pago can reject start_date when it is too close to "now".
  // Use a small future buffer to avoid clock-skew issues.
  const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const subscriptionBody = {
    reason,
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: unitPrice,
      currency_id: currencyId,
      start_date: startDate,
    },
    payer_email: userEmail,
    external_reference: userId,
    metadata: { obra_user_id: userId },
    back_url: backUrl,
    notification_url: notificationUrl,
  };

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscriptionBody),
  });

  if (!mpRes.ok) {
    const text = await mpRes.text();
    console.error("mercadopago_subscription_failed", mpRes.status, text);
    return json({ error: "mercadopago_error", status: mpRes.status, detail: text });
  }

  const pref = (await mpRes.json()) as MpSubscriptionResponse;
  const useSandbox = mpToken.startsWith("TEST-");
  const redirectUrl = useSandbox
    ? (pref.sandbox_init_point ?? pref.init_point)
    : (pref.init_point ?? pref.sandbox_init_point);
  if (!redirectUrl) {
    return json({ error: "mercadopago_no_redirect", detail: JSON.stringify(pref) });
  }

  return json({ redirect_url: redirectUrl, subscription_id: pref.id });
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

function normalizeFrequencyType(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "month" || value === "months") return "months";
  if (value === "day" || value === "days") return "days";
  return value;
}
