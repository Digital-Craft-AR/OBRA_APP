import type { BillingAdapter } from "../BillingAdapter.ts";
import type {
  BillingCheckoutResult,
  BillingPaymentSnapshot,
  BillingSubscriptionSnapshot,
  BillingWebhookResource,
  CreditsPackCheckoutInput,
  SubscriptionCheckoutInput,
  SubscriptionReconcileResult,
  WebhookVerificationInput,
} from "../types.ts";
import { verifyMercadoPagoWebhookSignature } from "./signature.ts";

const MP_API = "https://api.mercadopago.com";

type MpNotifyBody = {
  type?: string;
  action?: string;
  data?: { id?: string };
};

type MpSubscriptionResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MpPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MpPreapprovalJson = {
  id?: string;
  status?: string;
  external_reference?: string | null;
};

type MpPaymentJson = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
};

type MpPreapprovalSearch = {
  results?: MpPreapprovalJson[];
};

type MpPaymentSearch = {
  results?: MpPaymentJson[];
};

export class MercadoPagoAdapter implements BillingAdapter {
  readonly providerId = "mercadopago";

  webhookUrlForSupabaseProject(supabaseUrl: string): string {
    const base = supabaseUrl.replace(/\/$/, "");
    return `${base}/functions/v1/mercadopago-webhook`;
  }

  verifyWebhookSignature(input: WebhookVerificationInput): boolean {
    return verifyMercadoPagoWebhookSignature({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.resourceId,
      secret: input.secret,
    });
  }

  parseWebhookResource(body: unknown, url: URL): BillingWebhookResource | null {
    const queryDataId = url.searchParams.get("data.id");
    const b = body as MpNotifyBody;
    const bodyDataId = b.data?.id != null ? String(b.data.id) : null;
    const resourceId = queryDataId ?? bodyDataId;
    if (!resourceId) return null;

    const isPayment =
      b.type === "payment" ||
      (typeof b.action === "string" && b.action.startsWith("payment"));
    const isSubscription =
      b.type === "subscription_preapproval" ||
      (typeof b.action === "string" && b.action.startsWith("subscription_preapproval"));

    if (isSubscription) return { topic: "subscription", resourceId };
    if (isPayment) return { topic: "payment", resourceId };
    return null;
  }

  async fetchSubscriptionSnapshot(
    accessToken: string,
    resourceId: string,
  ): Promise<BillingSubscriptionSnapshot> {
    const res = await fetch(`${MP_API}/preapproval/${resourceId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`mp_preapproval_fetch_${res.status}`);
    }
    const sub = (await res.json()) as MpPreapprovalJson;
    return {
      status: sub.status ?? "unknown",
      externalReference: sub.external_reference?.trim() ?? null,
    };
  }

  async fetchPaymentSnapshot(accessToken: string, resourceId: string): Promise<BillingPaymentSnapshot> {
    const res = await fetch(`${MP_API}/v1/payments/${resourceId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`mp_payment_fetch_${res.status}`);
    }
    const payment = (await res.json()) as MpPaymentJson;
    const id = payment.id != null ? String(payment.id) : resourceId;
    return {
      providerPaymentId: id,
      status: payment.status ?? "unknown",
      externalReference: payment.external_reference?.trim() ?? null,
    };
  }

  async createSubscriptionCheckout(
    accessToken: string,
    input: SubscriptionCheckoutInput,
  ): Promise<BillingCheckoutResult> {
    const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const subscriptionBody = {
      reason: input.plan.reason,
      auto_recurring: {
        frequency: input.plan.frequency,
        frequency_type: input.plan.frequencyType,
        transaction_amount: input.plan.unitPrice,
        currency_id: input.plan.currencyId,
        start_date: startDate,
      },
      payer_email: input.payerEmail,
      external_reference: input.creatorUserId,
      metadata: { obra_user_id: input.creatorUserId },
      back_url: input.returnUrl,
      notification_url: input.notificationUrl,
    };

    const mpRes = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionBody),
    });

    if (!mpRes.ok) {
      const text = await mpRes.text();
      return { ok: false, error: { code: "provider_http_error", status: mpRes.status, detail: text } };
    }

    const pref = (await mpRes.json()) as MpSubscriptionResponse;

    console.log("pref", pref);

    const useSandbox = accessToken.startsWith("TEST-");
    const redirectUrl = useSandbox
      ? (pref.sandbox_init_point ?? pref.init_point)
      : (pref.init_point ?? pref.sandbox_init_point);
    if (!redirectUrl) {
      return {
        ok: false,
        error: { code: "provider_no_redirect", detail: JSON.stringify(pref) },
      };
    }

    return { ok: true, redirectUrl, providerCheckoutId: pref.id };
  }

  async createCreditsPackCheckout(
    accessToken: string,
    input: CreditsPackCheckoutInput,
  ): Promise<BillingCheckoutResult> {
    const backUrls = input.backUrls ?? {
      success: `${input.returnUrl}?status=success`,
      failure: `${input.returnUrl}?status=failure`,
      pending: `${input.returnUrl}?status=pending`,
    };

    const preferenceBody = {
      items: [
        {
          title: input.lineItem.title,
          quantity: input.lineItem.quantity,
          unit_price: input.lineItem.unitPrice,
          currency_id: input.lineItem.currencyId,
        },
      ],
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      external_reference: input.externalReference,
      metadata: input.metadata,
      back_urls: backUrls,
      auto_return: "approved",
      notification_url: input.notificationUrl,
    };

    const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpRes.ok) {
      const text = await mpRes.text();
      return { ok: false, error: { code: "provider_http_error", status: mpRes.status, detail: text } };
    }

    const pref = (await mpRes.json()) as MpPreferenceResponse;
    const useSandbox = accessToken.startsWith("TEST-");
    const redirectUrl = useSandbox
      ? (pref.sandbox_init_point ?? pref.init_point)
      : (pref.init_point ?? pref.sandbox_init_point);
    if (!redirectUrl) {
      return {
        ok: false,
        error: { code: "provider_no_redirect", detail: JSON.stringify(pref) },
      };
    }

    return { ok: true, redirectUrl, providerCheckoutId: pref.id };
  }

  async reconcileSubscriptionStatusForUser(
    accessToken: string,
    userExternalReference: string,
  ): Promise<SubscriptionReconcileResult> {
    const subSearch = await fetch(
      `${MP_API}/preapproval/search?external_reference=${encodeURIComponent(userExternalReference)}&limit=20&offset=0`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (subSearch.ok) {
      const subData = (await subSearch.json()) as MpPreapprovalSearch;
      const results = subData.results ?? [];
      // If any subscription is authorized, the user is active regardless of other cancelled ones.
      const hasAuthorized = results.some((r) => r.status === "authorized");
      if (hasAuthorized) {
        return { found: true, source: "subscription", subscriptionStatus: "active" };
      }
      // No active subscription — use the first mappable result.
      for (const r of results) {
        if (r.status) {
          const mapped = mapPreapprovalStatus(r.status);
          if (mapped) {
            return { found: true, source: "subscription", subscriptionStatus: mapped };
          }
        }
      }
    }

    const paySearch = await fetch(
      `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(userExternalReference)}&sort=date_created&criteria=desc&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (paySearch.ok) {
      const payData = (await paySearch.json()) as MpPaymentSearch;
      const latest = payData.results?.[0];
      if (latest?.status === "approved") {
        return { found: true, source: "payment", subscriptionStatus: "active" };
      }
    }

    return { found: false };
  }

  async hasAnyActiveSubscription(accessToken: string, userExternalReference: string): Promise<boolean> {
    const res = await fetch(
      `${MP_API}/preapproval/search?external_reference=${encodeURIComponent(userExternalReference)}&limit=20&offset=0`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      console.error("mp_has_active_fetch_failed", JSON.stringify({ status: res.status, externalReference: userExternalReference }));
      return false;
    }
    const data = (await res.json()) as MpPreapprovalSearch;
    const statuses = (data.results ?? []).map((r) => ({ id: r.id, status: r.status }));
    console.log("mp_preapproval_search_results", JSON.stringify({ externalReference: userExternalReference, results: statuses }));
    return statuses.some((r) => r.status === "authorized");
  }
}

function mapPreapprovalStatus(status: string): "none" | "active" | "past_due" | null {
  const st = status.toLowerCase();
  if (st === "authorized") return "active";
  if (st === "paused") return "past_due";
  if (st === "cancelled" || st === "pending" || st === "init") return "none";
  return null;
}
