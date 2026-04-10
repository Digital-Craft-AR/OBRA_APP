import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { billingNeedsMercadoPagoAccessToken } from "../_shared/payment/billingEnv.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import { loadMercadoPagoAccessToken } from "../_shared/payment/mercadopago/loadEnv.ts";

type SubscriptionStatus = "none" | "active" | "past_due";

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

  if (!supabaseUrl || !anonKey || !serviceRole) {
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
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accessToken = loadMercadoPagoAccessToken();
  let billing: ReturnType<typeof getBillingAdapter> | null = null;
  try {
    billing = getBillingAdapter();
  } catch {
    billing = null;
  }

  const { data: profileBefore } = await admin
    .from("creator_profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  let currentStatus = normalizeStatus(
    (profileBefore as { subscription_status?: string } | null)?.subscription_status,
  );

  const canReconcile =
    billing &&
    (billingNeedsMercadoPagoAccessToken(billing) ? Boolean(accessToken) : true);
  if (canReconcile && billing) {
    const remote = await billing.reconcileSubscriptionStatusForUser(accessToken ?? "", userId);
    if (remote.found && remote.subscriptionStatus !== currentStatus) {
      await admin
        .from("creator_profiles")
        .update({ subscription_status: remote.subscriptionStatus, updated_at: new Date().toISOString() })
        .eq("id", userId);
      currentStatus = remote.subscriptionStatus;
    }
  }

  if (currentStatus === "active") {
    console.log(
      JSON.stringify({
        event: "account_delete_blocked",
        reason: "subscription_active",
        user_id_prefix: userId.slice(0, 8),
      }),
    );
    return json(
      {
        error: "subscription_blocks_delete",
        subscription_status: currentStatus,
        detail: "cancel_or_pause_subscription_first",
      },
      409,
    );
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error(
      JSON.stringify({
        event: "account_delete_failed",
        user_id_prefix: userId.slice(0, 8),
        message: delErr.message,
      }),
    );
    return json({ error: "delete_failed" }, 500);
  }

  console.log(
    JSON.stringify({
      event: "account_deleted",
      user_id_prefix: userId.slice(0, 8),
      subscription_status_at_request: currentStatus,
    }),
  );

  return json({ ok: true });
});

function normalizeStatus(raw: string | undefined): SubscriptionStatus {
  if (raw === "active" || raw === "past_due" || raw === "none") return raw;
  return "none";
}
