import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { billingNeedsMercadoPagoAccessToken } from "../_shared/payment/billingEnv.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import { loadMercadoPagoAccessToken } from "../_shared/payment/mercadopago/loadEnv.ts";

type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = loadMercadoPagoAccessToken();

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return json({ error: "misconfigured" }, 500);
  }

  let billing;
  try {
    billing = getBillingAdapter();
  } catch (e) {
    console.error("billing_adapter", e);
    return json({ error: "misconfigured", detail: "payment_provider" }, 500);
  }

  if (billingNeedsMercadoPagoAccessToken(billing) && !accessToken) {
    return json({ error: "misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7);

  const authClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(jwt);
  if (userError || !user) return json({ error: "unauthorized" }, 401);
  const userId = user.id;

  const admin = createClient(supabaseUrl, serviceRole);
  const { data: profile } = await admin
    .from("creator_profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const currentStatus = normalizeStatus((profile as { subscription_status?: string } | null)?.subscription_status);
  let reconciledFrom: "subscription_preapproval" | "payment" | "profile" = "profile";
  let nextStatus = currentStatus;

  const remote = await billing.reconcileSubscriptionStatusForUser(accessToken ?? "", userId);
  if (remote.found) {
    reconciledFrom = remote.source === "subscription" ? "subscription_preapproval" : "payment";
    nextStatus = remote.subscriptionStatus;
  }

  if (nextStatus !== currentStatus) {
    const { error: upErr } = await admin
      .from("creator_profiles")
      .update({ subscription_status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (upErr) return json({ error: "db_update" }, 500);
  }

  return json({
    ok: true,
    subscription_status: nextStatus,
    changed: nextStatus !== currentStatus,
    reconciled_from: reconciledFrom,
  });
});

function normalizeStatus(raw: string | undefined): SubscriptionStatus {
  if (raw === "active" || raw === "past_due" || raw === "none" || raw === "cancelled") return raw;
  return "none";
}
