import { describe, expect, it } from "vitest";
import { outcomeToPath, parseDevEntitlementOverride, resolveEntitlement } from "./resolveEntitlement";

describe("resolveEntitlement", () => {
  it("requires email verification before any subscription state", () => {
    expect(
      resolveEntitlement({
        emailVerified: false,
        subscriptionStatus: "active",
        checkoutReturnPending: false,
      }),
    ).toBe("verify_email");
  });

  it("maps past_due to subscription_error after email is verified", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "past_due",
        checkoutReturnPending: false,
      }),
    ).toBe("subscription_error");
  });

  it("shows activating when checkout return is pending and not yet active", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "none",
        checkoutReturnPending: true,
      }),
    ).toBe("activating");
  });

  it("does not use activating once subscription is active", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "active",
        checkoutReturnPending: true,
      }),
    ).toBe("full_app");
  });

  it("maps unverified checkout path to verify_email first", () => {
    expect(
      resolveEntitlement({
        emailVerified: false,
        subscriptionStatus: "none",
        checkoutReturnPending: true,
      }),
    ).toBe("verify_email");
  });

  it("maps verified without subscription to pending_subscription", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "none",
        checkoutReturnPending: false,
      }),
    ).toBe("pending_subscription");
  });
});

describe("outcomeToPath", () => {
  it("returns stable paths under /app", () => {
    expect(outcomeToPath("verify_email")).toBe("/app/verify-email");
    expect(outcomeToPath("full_app")).toBe("/app/dashboard");
  });
});

describe("parseDevEntitlementOverride", () => {
  it("accepts known outcomes", () => {
    expect(parseDevEntitlementOverride("activating")).toBe("activating");
  });

  it("rejects unknown values", () => {
    expect(parseDevEntitlementOverride("nope")).toBeNull();
  });
});
