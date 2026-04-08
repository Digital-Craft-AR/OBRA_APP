import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const LEDGER_LIMIT = 1000;

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
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: profile, error: profileError } = await admin
    .from("creator_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error(
      JSON.stringify({
        event: "export_user_data_profile_error",
        user_id_prefix: userId.slice(0, 8),
        code: profileError.code,
      }),
    );
    return json({ error: "export_failed" }, 500);
  }

  const { data: ledgerRows, error: ledgerError } = await admin
    .from("credit_ledger_entries")
    .select("id, created_at, delta, balance_after, reason, project_id")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(LEDGER_LIMIT);

  if (ledgerError) {
    console.error(
      JSON.stringify({
        event: "export_user_data_ledger_error",
        user_id_prefix: userId.slice(0, 8),
        code: ledgerError.code,
      }),
    );
    return json({ error: "export_failed" }, 500);
  }

  const payload = {
    export_version: 1,
    generated_at: new Date().toISOString(),
    subject: {
      user_id: userId,
      email: user.email ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
    },
    creator_profile: profile ?? null,
    credit_ledger_entries: ledgerRows ?? [],
    credit_ledger_truncated: (ledgerRows?.length ?? 0) >= LEDGER_LIMIT,
  };

  console.log(
    JSON.stringify({
      event: "export_user_data_ok",
      user_id_prefix: userId.slice(0, 8),
      ledger_rows: ledgerRows?.length ?? 0,
    }),
  );

  return json({ ok: true, data: payload });
});
