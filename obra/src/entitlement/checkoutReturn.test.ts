import { afterEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_RETURN_SESSION_KEY,
  clearCheckoutReturnPending,
  isCheckoutReturnPending,
  setCheckoutReturnPending,
} from "./checkoutReturn";

describe("checkoutReturn session flag", () => {
  afterEach(() => {
    sessionStorage.removeItem(CHECKOUT_RETURN_SESSION_KEY);
  });

  it("starts false", () => {
    expect(isCheckoutReturnPending()).toBe(false);
  });

  it("round-trips set and clear", () => {
    setCheckoutReturnPending();
    expect(isCheckoutReturnPending()).toBe(true);
    clearCheckoutReturnPending();
    expect(isCheckoutReturnPending()).toBe(false);
  });
});
