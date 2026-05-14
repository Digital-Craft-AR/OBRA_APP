import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { loadMercadoPagoAccessToken } from "../_shared/payment/mercadopago/loadEnv.ts";

const MP_API = "https://api.mercadopago.com";

type MpPreapprovalJson = {
  id?: string;
  status?: string;
};

type MpPreapprovalSearch = {
  results?: MpPreapprovalJson[];
};

function nowPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return corsJson({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRole) {
    return corsJson({ error: "misconfigured" }, 500);
  }

  const mpToken = loadMercadoPagoAccessToken();
  if (!mpToken) {
    return corsJson({ error: "misconfigured", detail: "payment_provider" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return corsJson({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7);

  const authClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(jwt);
  if (userError || !user) return corsJson({ error: "unauthorized" }, 401);

  const userId = user.id;

  // Resolve the active preapproval ID via external_reference
  const searchRes = await fetch(
    `${MP_API}/preapproval/search?external_reference=${encodeURIComponent(userId)}&status=authorized&limit=1`,
    { headers: { Authorization: `Bearer ${mpToken}` } },
  );

  if (!searchRes.ok) {
    const text = await searchRes.text();
    console.error("cancel_subscription_search_failed", JSON.stringify({ status: searchRes.status, detail: text, user_id_prefix: userId.slice(0, 8) }));
    return corsJson({ error: "mercadopago_error", detail: text }, 502);
  }

  const searchData = (await searchRes.json()) as MpPreapprovalSearch;
  const preapprovalId = searchData.results?.[0]?.id;

  if (!preapprovalId) {
    // No authorized subscription on MP — it was likely already cancelled via webhook or portal.
    // Treat as success so the frontend can call reconcile and sync the DB state.
    console.log("cancel_subscription_no_active", JSON.stringify({ user_id_prefix: userId.slice(0, 8) }));
    return corsJson({ ok: true, already_cancelled: true });
  }

  // Cancel the preapproval on MercadoPago
  const cancelRes = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${mpToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  if (!cancelRes.ok) {
    const text = await cancelRes.text();
    console.error("cancel_subscription_mp_failed", JSON.stringify({ status: cancelRes.status, detail: text, user_id_prefix: userId.slice(0, 8) }));
    return corsJson({ error: "mercadopago_error", detail: text }, 502);
  }

  // Update the creator_profiles row
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await admin
    .from("creator_profiles")
    .select("subscription_access_until")
    .eq("id", userId)
    .maybeSingle();

  const existingAccessUntil = (profile as { subscription_access_until?: string | null } | null)
    ?.subscription_access_until;
  const hasValidAccessUntil =
    existingAccessUntil != null && new Date(existingAccessUntil) > new Date();

  const accessUntil = hasValidAccessUntil ? existingAccessUntil! : nowPlusDays(30);

  const { error: upErr } = await admin
    .from("creator_profiles")
    .update({
      subscription_status: "cancelled",
      subscription_access_until: accessUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (upErr) {
    console.error("cancel_subscription_db_failed", JSON.stringify({ message: upErr.message, user_id_prefix: userId.slice(0, 8) }));
    return corsJson({ error: "db_update" }, 500);
  }

  console.log("cancel_subscription_ok", JSON.stringify({ user_id_prefix: userId.slice(0, 8), preapprovalId }));

  return corsJson({ ok: true, subscription_access_until: accessUntil });
});
