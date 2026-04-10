import type { BillingAdapter } from "./BillingAdapter.ts";

/** Mercado Pago access token required for checkout, reconcile fetch, and webhook fetch. */
export function billingNeedsMercadoPagoAccessToken(adapter: BillingAdapter): boolean {
  return adapter.providerId === "mercadopago";
}

/** Webhook HMAC secret (Mercado Pago). ObraPay mock verifies without MP secrets. */
export function billingNeedsMercadoPagoWebhookSecret(adapter: BillingAdapter): boolean {
  return adapter.providerId === "mercadopago";
}
