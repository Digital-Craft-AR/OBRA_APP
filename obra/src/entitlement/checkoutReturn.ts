/** Session flag: set after Mercado Pago return (#35/#36); cleared when subscription becomes active. */
export const CHECKOUT_RETURN_SESSION_KEY = "obra_checkout_return";

/** i18n key shown once on pending shell after MP failure/pending return */
const CHECKOUT_LAST_ERROR_KEY = "obra_checkout_last_error_key";

export function setCheckoutReturnPending(): void {
  sessionStorage.setItem(CHECKOUT_RETURN_SESSION_KEY, "1");
}

export function clearCheckoutReturnPending(): void {
  sessionStorage.removeItem(CHECKOUT_RETURN_SESSION_KEY);
}

export function isCheckoutReturnPending(): boolean {
  return sessionStorage.getItem(CHECKOUT_RETURN_SESSION_KEY) === "1";
}

/** Store an i18n translation key (e.g. shell.pending.checkoutReturnedFailure). */
export function setCheckoutReturnMessageKey(key: string | null): void {
  if (!key) sessionStorage.removeItem(CHECKOUT_LAST_ERROR_KEY);
  else sessionStorage.setItem(CHECKOUT_LAST_ERROR_KEY, key);
}

export function consumeCheckoutReturnMessageKey(): string | null {
  const v = sessionStorage.getItem(CHECKOUT_LAST_ERROR_KEY);
  sessionStorage.removeItem(CHECKOUT_LAST_ERROR_KEY);
  return v;
}
