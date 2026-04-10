import type { TFunction } from "i18next";

/**
 * Maps `create-subscription-checkout` / `create-credits-checkout` JSON `{ error, detail }`
 * to user-facing i18n keys (Supabase Edge secrets / MP configuration).
 */
const CHECKOUT_CONFIG_DETAIL_KEYS: Record<string, string> = {
  missing_obra_app_url: "checkout.edge.missing_obra_app_url",
  missing_mercadopago_token: "checkout.edge.missing_mercadopago_token",
  /** @deprecated server no longer emits; kept for older deployed functions */
  missing_mercadopago_or_app_url: "checkout.edge.missing_mercadopago_or_app_url",
  invalid_app_url_scheme: "checkout.edge.invalid_app_url_scheme",
  supabase_auth: "checkout.edge.supabase_auth",
  payment_provider: "checkout.edge.payment_provider",
  price: "checkout.edge.price",
  frequency: "checkout.edge.frequency",
  credits_pack: "checkout.edge.credits_pack",
};

export function tCheckoutConfigError(t: TFunction, detail: string | undefined): string {
  const mapped = detail ? CHECKOUT_CONFIG_DETAIL_KEYS[detail] : undefined;
  const key = mapped ?? "checkout.edge.generic_checkout";
  return t(key);
}

export function tMercadoPagoProviderError(t: TFunction): string {
  return t("checkout.edge.mercadopago_provider");
}
