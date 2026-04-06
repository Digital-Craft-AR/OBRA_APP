/** Session flag: set after Mercado Pago return (#35/#36); cleared when subscription becomes active. */
export const CHECKOUT_RETURN_SESSION_KEY = "obra_checkout_return";

export function setCheckoutReturnPending(): void {
  sessionStorage.setItem(CHECKOUT_RETURN_SESSION_KEY, "1");
}

export function clearCheckoutReturnPending(): void {
  sessionStorage.removeItem(CHECKOUT_RETURN_SESSION_KEY);
}

export function isCheckoutReturnPending(): boolean {
  return sessionStorage.getItem(CHECKOUT_RETURN_SESSION_KEY) === "1";
}
