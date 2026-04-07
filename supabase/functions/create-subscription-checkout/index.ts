import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MpPreferenceResponse = {
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
    return json({ error: "server_misconfigured", detail: "supabase" }, 500);
  }

  if (!mpToken || !appUrl) {
    return json({ error: "checkout_unavailable", detail: "missing_mercadopago_or_app_url" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }

  const jwt = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);

  if (userError || !user) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!user.email_confirmed_at) {
    return json({ error: "email_not_verified" });
  }

  const title = Deno.env.get("MERCADOPAGO_CHECKOUT_TITLE") ?? "Obra subscription";
  const unitPrice = Number(Deno.env.get("MERCADOPAGO_CHECKOUT_UNIT_PRICE") ?? "100");
  const currencyId = Deno.env.get("MERCADOPAGO_CHECKOUT_CURRENCY_ID") ?? "ARS";

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return json({ error: "server_misconfigured", detail: "price" }, 500);
  }

  const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

  const preferenceBody = {
    items: [
      {
        title,
        quantity: 1,
        currency_id: currencyId,
        unit_price: unitPrice,
      },
    ],
    payer: user.email ? { email: user.email } : undefined,
    external_reference: user.id,
    metadata: { obra_user_id: user.id },
    back_urls: {
      success: `${appUrl}/checkout/return?status=success`,
      failure: `${appUrl}/checkout/return?status=failure`,
      pending: `${appUrl}/checkout/return?status=pending`,
    },
    auto_return: "approved",
    notification_url: notificationUrl,
  };

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
  });

  if (!mpRes.ok) {
    const text = await mpRes.text();
    console.error("mercadopago_preference_failed", mpRes.status, text);
    return json({ error: "mercadopago_error", status: mpRes.status });
  }

  const pref = (await mpRes.json()) as MpPreferenceResponse;
  const useSandbox = mpToken.startsWith("TEST-");
  const redirectUrl = useSandbox ? pref.sandbox_init_point : pref.init_point;
  if (!redirectUrl) {
    return json({ error: "mercadopago_no_redirect" });
  }

  return json({ redirect_url: redirectUrl, preference_id: pref.id });
});
