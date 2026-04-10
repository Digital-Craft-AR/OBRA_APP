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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PREFIX_SUB = "obrapaysub:";
const PREFIX_PAY = "obrapaypay:";

function utf8ToBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64;
}

function base64UrlToUtf8(s: string): string {
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (normalized.length % 4)) % 4;
  const bin = atob(normalized + "=".repeat(pad));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Mock billing adapter for local/staging: no Mercado Pago API calls.
 * Set `PAYMENT_PROVIDER=obrapay`. Do not use in production.
 *
 * - Checkout returns the app return URL immediately (simulates success redirect).
 * - `reconcileSubscriptionStatusForUser` always reports **active** so the pending shell can clear.
 * - Optional webhook body for tests / manual `curl` (see `parseWebhookResource`).
 */
export class ObraPayAdapter implements BillingAdapter {
  readonly providerId = "obrapay";

  webhookUrlForSupabaseProject(supabaseUrl: string): string {
    const base = supabaseUrl.replace(/\/$/, "");
    return `${base}/functions/v1/mercadopago-webhook`;
  }

  verifyWebhookSignature(_input: WebhookVerificationInput): boolean {
    return true;
  }

  /**
   * Recognize a manual mock payload (e.g. integration tests):
   * `{ "obrapay_mock": true, "topic": "subscription", "user_id": "<uuid>" }`
   * `{ "obrapay_mock": true, "topic": "payment", "external_reference": "<obra credit ref>" }`
   */
  parseWebhookResource(body: unknown, _url: URL): BillingWebhookResource | null {
    if (!body || typeof body !== "object") return null;
    const o = body as Record<string, unknown>;
    if (o.obrapay_mock !== true) return null;

    if (o.topic === "payment") {
      const ref = typeof o.external_reference === "string" ? o.external_reference.trim() : "";
      if (!ref) return null;
      return { topic: "payment", resourceId: `${PREFIX_PAY}${utf8ToBase64Url(ref)}` };
    }

    const userId = typeof o.user_id === "string" ? o.user_id.trim() : "";
    if (!UUID_RE.test(userId)) return null;
    return { topic: "subscription", resourceId: `${PREFIX_SUB}${userId.toLowerCase()}` };
  }

  fetchSubscriptionSnapshot(_accessToken: string, resourceId: string): Promise<BillingSubscriptionSnapshot> {
    if (!resourceId.startsWith(PREFIX_SUB)) {
      return Promise.reject(new Error("obrapay_bad_subscription_resource"));
    }
    const userId = resourceId.slice(PREFIX_SUB.length);
    if (!UUID_RE.test(userId)) {
      return Promise.reject(new Error("obrapay_bad_subscription_user"));
    }
    return Promise.resolve({
      status: "authorized",
      externalReference: userId.toLowerCase(),
    });
  }

  fetchPaymentSnapshot(_accessToken: string, resourceId: string): Promise<BillingPaymentSnapshot> {
    if (!resourceId.startsWith(PREFIX_PAY)) {
      return Promise.reject(new Error("obrapay_bad_payment_resource"));
    }
    const encoded = resourceId.slice(PREFIX_PAY.length);
    let externalReference: string;
    try {
      externalReference = base64UrlToUtf8(encoded);
    } catch {
      return Promise.reject(new Error("obrapay_bad_payment_ref_encoding"));
    }
    return Promise.resolve({
      providerPaymentId: "obrapay-mock-payment",
      status: "approved",
      externalReference,
    });
  }

  createSubscriptionCheckout(
    _accessToken: string,
    input: SubscriptionCheckoutInput,
  ): Promise<BillingCheckoutResult> {
    return Promise.resolve({
      ok: true,
      redirectUrl: input.returnUrl,
      providerCheckoutId: "obrapay_mock_subscription",
    });
  }

  /** Credits are posted in `create-credits-checkout` (service_role RPC); this only returns the success redirect URL. */
  createCreditsPackCheckout(
    _accessToken: string,
    input: CreditsPackCheckoutInput,
  ): Promise<BillingCheckoutResult> {
    const success =
      input.backUrls?.success ?? `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}status=success`;
    return Promise.resolve({
      ok: true,
      redirectUrl: success,
      providerCheckoutId: "obrapay_mock_preference",
    });
  }

  reconcileSubscriptionStatusForUser(
    _accessToken: string,
    _userExternalReference: string,
  ): Promise<SubscriptionReconcileResult> {
    return Promise.resolve({
      found: true,
      source: "subscription",
      subscriptionStatus: "active",
    });
  }
}
