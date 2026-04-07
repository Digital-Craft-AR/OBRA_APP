import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyMercadoPagoWebhookSignature } from "../_shared/mpSignature.ts";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
};

type MpPreapproval = {
  id?: string;
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
  const isSubscription =
    body.type === "subscription_preapproval" ||
    (typeof body.action === "string" && body.action.startsWith("subscription_preapproval"));

  if ((!isPayment && !isSubscription) || !dataId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const eventKey = `${isSubscription ? "subscription_preapproval" : "payment"}:${dataId}`;

  const { data: existing, error: selErr } = await admin
    .from("obra_mp_processed_webhooks")
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (selErr) {
    console.error("idempotency_select", selErr.message);
    return jsonResponse({ error: "db" }, 500);
  }

  if (existing) {
    return jsonResponse({ ok: true, duplicate: true });
  }

  let ext: string | null = null;
  let profileStatus: "active" | "past_due" = "active";

  if (isSubscription) {
    const subRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!subRes.ok) {
      console.error("mp_subscription_fetch_failed", subRes.status);
      return jsonResponse({ error: "subscription_fetch" }, 502);
    }
    const sub = (await subRes.json()) as MpPreapproval;
    const st = sub.status ?? "unknown";
    if (st !== "authorized" && st !== "paused" && st !== "cancelled") {
      return jsonResponse({ ok: true, skipped_status: st });
    }
    ext = sub.external_reference?.trim() ?? null;
    profileStatus = st === "authorized" ? "active" : "past_due";
  } else {
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
    ext = payment.external_reference?.trim() ?? null;
    profileStatus = "active";
  }

  if (!ext || !/^[0-9a-f-]{36}$/i.test(ext)) {
    console.warn("webhook_missing_external_reference", dataId);
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
      subscription_status: profileStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (upErr) {
    console.error("profile_update", upErr.message);
    return jsonResponse({ error: "db_update" }, 500);
  }

  const { error: insErr } = await admin.from("obra_mp_processed_webhooks").insert({
    event_key: eventKey,
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
