import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { parseCreditTopUpExternalReference } from "../_shared/payment/creditTopUpRef.ts";
import { billingNeedsMercadoPagoAccessToken, billingNeedsMercadoPagoWebhookSecret } from "../_shared/payment/billingEnv.ts";
import { getBillingAdapter } from "../_shared/payment/factory.ts";
import {
  loadMercadoPagoAccessToken,
  loadMercadoPagoWebhookSecret,
} from "../_shared/payment/mercadopago/loadEnv.ts";

/** Returns an ISO timestamp for one calendar month from now. */
function nowPlusOneMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

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

  const url = new URL(req.url);

  let body: unknown = {};
  let rawText = "";
  try {
    rawText = await req.text();
    if (rawText) body = JSON.parse(rawText) as unknown;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  console.log("mp_webhook_received", JSON.stringify({
    method: req.method,
    url: url.toString(),
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  }));

  let billing;
  try {
    billing = getBillingAdapter();
  } catch (e) {
    console.error("billing_adapter", e);
    return jsonResponse({ error: "misconfigured", detail: "payment_provider" }, 500);
  }

  const resource = billing.parseWebhookResource(body, url);
  if (!resource) {
    console.log("mp_webhook_ignored", JSON.stringify({ body, query: Object.fromEntries(url.searchParams.entries()) }));
    return jsonResponse({ ok: true, ignored: true });
  }

  console.log("mp_webhook_resource_parsed", JSON.stringify(resource));

  const secret = loadMercadoPagoWebhookSecret();
  const accessToken = loadMercadoPagoAccessToken();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const needMpSecret = billingNeedsMercadoPagoWebhookSecret(billing);
  const needMpToken = billingNeedsMercadoPagoAccessToken(billing);
  if (!supabaseUrl || !serviceKey) {
    console.error("mercadopago_webhook_misconfigured");
    return jsonResponse({ error: "misconfigured" }, 500);
  }
  if (needMpToken && !accessToken) {
    console.error("mercadopago_webhook_misconfigured");
    return jsonResponse({ error: "misconfigured" }, 500);
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  // Test accounts (MP users de prueba) don't have a webhook secret — skip signature
  // verification in that case. In production the secret is always set.
  if (needMpSecret && secret) {
    const sigOk = billing.verifyWebhookSignature({
      secret,
      xSignature,
      xRequestId,
      resourceId: resource.resourceId,
    });
    if (!sigOk) {
      console.warn("mercadopago_webhook_signature_rejected");
      return jsonResponse({ error: "unauthorized" }, 401);
    }
  } else if (needMpSecret) {
    console.warn("mercadopago_webhook_signature_skipped: no secret configured (test account)");
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const eventTopicKey = resource.topic === "subscription" ? "subscription_preapproval" : "payment";
  const eventKey = `${eventTopicKey}:${resource.resourceId}`;

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
  let profileStatus: "active" | "past_due" | "none" | "cancelled" = "active";
  let updateAccessUntil = false;

  try {
    if (resource.topic === "subscription") {
      const snap = await billing.fetchSubscriptionSnapshot(accessToken ?? "", resource.resourceId);
      const st = snap.status ?? "unknown";
      console.log("mp_subscription_snapshot", JSON.stringify({ resourceId: resource.resourceId, status: st, externalReference: snap.externalReference }));
      if (st !== "authorized" && st !== "paused" && st !== "cancelled") {
        console.log("mp_subscription_skipped", JSON.stringify({ status: st }));
        return jsonResponse({ ok: true, skipped_status: st });
      }
      ext = snap.externalReference;
      if (st === "authorized") {
        profileStatus = "active";
        updateAccessUntil = true;
      } else {
        // Before downgrading status, check if the user has another authorized subscription.
        const stillActive =
          ext && /^[0-9a-f-]{36}$/i.test(ext.trim())
            ? await billing.hasAnyActiveSubscription(accessToken ?? "", ext.trim())
            : false;
        console.log("mp_has_active_check", JSON.stringify({ externalReference: ext, status: st, stillActive }));
        if (stillActive) {
          profileStatus = "active";
          updateAccessUntil = true;
        } else if (st === "paused") {
          // Paused = payment failed; preserve subscription_access_until so access persists
          // until the already-paid period ends.
          profileStatus = "past_due";
        } else {
          // Cancelled = user (or MP) ended the subscription; preserve subscription_access_until
          // so the user keeps full_app access until the paid period expires.
          profileStatus = "cancelled";
        }
      }
    } else {
      const snap = await billing.fetchPaymentSnapshot(accessToken ?? "", resource.resourceId);
      if (snap.status !== "approved") {
        return jsonResponse({ ok: true, skipped_status: snap.status ?? "unknown" });
      }
      ext = snap.externalReference;
      profileStatus = "active";
      updateAccessUntil = true;

      const creditTopUp = parseCreditTopUpExternalReference(ext);
      if (creditTopUp) {
        const idempotencyKey = snap.providerPaymentId ? `mp_payment_${snap.providerPaymentId}` : null;

        const { data: creditProfile, error: creditProfErr } = await admin
          .from("creator_profiles")
          .select("id")
          .eq("id", creditTopUp.profileId)
          .maybeSingle();

        if (creditProfErr) {
          console.error("credit_profile_lookup", creditProfErr.message);
          return jsonResponse({ error: "db_profile" }, 500);
        }

        if (!creditProfile) {
          console.warn("credit_topup_unknown_profile", creditTopUp.profileId);
          return jsonResponse({ ok: true, skipped: "no_profile" });
        }

        const { error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
          p_creator_id: creditTopUp.profileId,
          p_delta: creditTopUp.credits,
          p_reason: "top_up",
          p_idempotency_key: idempotencyKey,
          p_project_id: null,
        });

        if (rpcErr) {
          console.error("credit_topup_ledger", rpcErr.message);
          return jsonResponse({ error: "ledger_apply" }, 500);
        }

        const { error: insErr } = await admin.from("obra_mp_processed_webhooks").insert({
          event_key: eventKey,
          profile_id: creditTopUp.profileId,
        });

        if (insErr) {
          if (insErr.code === "23505") {
            return jsonResponse({ ok: true, duplicate: true });
          }
          console.error("idempotency_insert", insErr.message);
          return jsonResponse({ error: "db_insert" }, 500);
        }

        return jsonResponse({ ok: true, credits_topup: creditTopUp.profileId });
      }
    }
  } catch (e) {
    console.error("billing_fetch_failed", e);
    return jsonResponse({ error: "provider_fetch" }, 502);
  }

  if (!ext || !/^[0-9a-f-]{36}$/i.test(ext)) {
    console.warn("webhook_missing_external_reference", resource.resourceId);
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

  const profileUpdate: Record<string, string> = {
    subscription_status: profileStatus,
    updated_at: new Date().toISOString(),
  };
  if (updateAccessUntil) {
    profileUpdate.subscription_access_until = nowPlusOneMonth();
  }

  const { error: upErr } = await admin
    .from("creator_profiles")
    .update(profileUpdate)
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
