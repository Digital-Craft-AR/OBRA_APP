import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyMercadoPagoWebhookSignature } from "../_shared/mpSignature.ts";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
};

type MpNotifyBody = {
  type?: string;
  action?: string;
  data?: { id?: string };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secret || !mpToken || !supabaseUrl || !serviceKey) {
    console.error("mercadopago_webhook_misconfigured");
    return jsonResponse({ error: "misconfigured" }, 500);
  }

  const url = new URL(req.url);
  const queryDataId = url.searchParams.get("data.id");

  let body: MpNotifyBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as MpNotifyBody;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const bodyDataId = body.data?.id != null ? String(body.data.id) : null;
  const dataId = queryDataId ?? bodyDataId;

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const sigOk = verifyMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId,
    secret,
  });

  if (!sigOk) {
    console.warn("mercadopago_webhook_signature_rejected");
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const isPayment =
    body.type === "payment" ||
    (typeof body.action === "string" && body.action.startsWith("payment"));

  if (!isPayment || !dataId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: existing, error: selErr } = await admin
    .from("obra_mp_processed_webhooks")
    .select("mp_payment_id")
    .eq("mp_payment_id", dataId)
    .maybeSingle();

  if (selErr) {
    console.error("idempotency_select", selErr.message);
    return jsonResponse({ error: "db" }, 500);
  }

  if (existing) {
    return jsonResponse({ ok: true, duplicate: true });
  }

  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  });

  if (!payRes.ok) {
    console.error("mp_payment_fetch_failed", payRes.status);
    return jsonResponse({ error: "payment_fetch" }, 502);
  }

  const payment = (await payRes.json()) as MpPayment;
  if (payment.status !== "approved") {
    return jsonResponse({ ok: true, skipped_status: payment.status ?? "unknown" });
  }

  const ext = payment.external_reference?.trim();
  if (!ext || !/^[0-9a-f-]{36}$/i.test(ext)) {
    console.warn("payment_missing_external_reference", dataId);
    return jsonResponse({ ok: true, skipped: "no_external_reference" });
  }

  const profileId = ext.toLowerCase();

  const { data: profileRow, error: profErr } = await admin
    .from("creator_profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (profErr) {
    console.error("profile_lookup", profErr.message);
    return jsonResponse({ error: "db_profile" }, 500);
  }

  if (!profileRow) {
    console.warn("payment_unknown_profile", profileId);
    return jsonResponse({ ok: true, skipped: "no_profile" });
  }

  const { error: upErr } = await admin
    .from("creator_profiles")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (upErr) {
    console.error("profile_update", upErr.message);
    return jsonResponse({ error: "db_update" }, 500);
  }

  const { error: insErr } = await admin.from("obra_mp_processed_webhooks").insert({
    mp_payment_id: dataId,
    profile_id: profileId,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return jsonResponse({ ok: true, duplicate: true });
    }
    console.error("idempotency_insert", insErr.message);
    return jsonResponse({ error: "db_insert" }, 500);
  }

  return jsonResponse({ ok: true, activated: profileId });
});
