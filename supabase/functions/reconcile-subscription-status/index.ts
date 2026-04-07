import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type SubscriptionStatus = "none" | "active" | "past_due";

type MpPreapproval = {
  id?: string;
  status?: string;
  external_reference?: string | null;
};

type MpPreapprovalSearch = {
  results?: MpPreapproval[];
};

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
};

type MpPaymentSearch = {
  results?: MpPayment[];
};

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
  const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

  if (!supabaseUrl || !anonKey || !serviceRole || !mpToken) {
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

  const subSearch = await fetch(
    `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&limit=1&offset=0`,
    { headers: { Authorization: `Bearer ${mpToken}` } },
  );

  if (subSearch.ok) {
    const subData = (await subSearch.json()) as MpPreapprovalSearch;
    const latest = subData.results?.[0];
    if (latest?.status) {
      const mapped = mapPreapprovalStatus(latest.status);
      if (mapped) {
        reconciledFrom = "subscription_preapproval";
        nextStatus = mapped;
      }
    }
  }

  if (reconciledFrom === "profile") {
    const paySearch = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(userId)}&sort=date_created&criteria=desc&limit=1`,
      { headers: { Authorization: `Bearer ${mpToken}` } },
    );
    if (paySearch.ok) {
      const payData = (await paySearch.json()) as MpPaymentSearch;
      const latest = payData.results?.[0];
      if (latest?.status === "approved") {
        reconciledFrom = "payment";
        nextStatus = "active";
      }
    }
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
  if (raw === "active" || raw === "past_due" || raw === "none") return raw;
  return "none";
}

function mapPreapprovalStatus(status: string): SubscriptionStatus | null {
  const st = status.toLowerCase();
  if (st === "authorized") return "active";
  if (st === "paused" || st === "cancelled") return "past_due";
  if (st === "pending" || st === "init") return "none";
  return null;
}
