import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/**
 * Short wizard “optimize with AI” proxy. Validates Supabase JWT (verify_jwt).
 * Deducts credits via `obra_credit_ledger_apply` (#68); Claude integration is still pending (#26).
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey) {
    return json({ error: "server_misconfigured", detail: "supabase_auth" }, 500);
  }
  if (!serviceKey) {
    return json({ error: "server_misconfigured", detail: "service_role" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  const jwt = authHeader.slice(7);
  const payload = await req.json().catch(() => null);
  const field = typeof payload?.field === "string" ? payload.field : "unknown";
  const contentPart =
    typeof payload?.content_part === "string" ? payload.content_part : null;
  const intent =
    typeof payload?.intent === "string"
      ? payload.intent
      : contentPart?.includes("suggestions")
        ? "suggest"
        : "improve";
  // TODO: remove content_part fallback once all clients send `intent`.

  const pub = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await pub.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const rawCost = Deno.env.get("AI_OPTIMIZE_CREDIT_COST");
  const cost = rawCost !== undefined && rawCost !== "" ? Number(rawCost) : 1;
  if (!Number.isFinite(cost) || cost <= 0) {
    return json({ error: "server_misconfigured", detail: "credit_cost" }, 500);
  }

  const delta = -Math.floor(cost);
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
    p_creator_id: user.id,
    p_delta: delta,
    p_reason: "consumption",
    p_idempotency_key: null,
    p_project_id: null,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("insufficient credits")) {
      return json({ error: "insufficient_credits" }, 402);
    }
    if (msg.includes("creator profile not found")) {
      return json({ error: "profile_not_found" }, 400);
    }
    console.error("obra_credit_ledger_apply", rpcErr);
    return json({ error: "ledger_failed" }, 500);
  }

  return json({
    ok: true,
    stub: true,
    field,
    intent,
    credits_balance_after: balanceAfter,
  });
});
