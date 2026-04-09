import { describe, expect, it } from "vitest";
import {
  isPathAllowedForOutcome,
  MINIMAL_ACCOUNT_PATH,
  outcomeToPath,
  parseDevEntitlementOverride,
  resolveEntitlement,
} from "./resolveEntitlement";

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

describe("isPathAllowedForOutcome", () => {
  it("allows full_app on dashboard, settings, and wizard entry routes", () => {
    expect(isPathAllowedForOutcome("full_app", "/app/dashboard")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/help")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/settings")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/settings/profile")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/settings/billing")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/projects/new")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/projects/project-1/wizard")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/projects/project-1/content")).toBe(true);
    expect(isPathAllowedForOutcome("full_app", "/app/projects/project-1/preview")).toBe(true);
  });

  it("rejects unknown settings subpaths for full_app", () => {
    expect(isPathAllowedForOutcome("full_app", "/app/settings/unknown")).toBe(false);
    expect(isPathAllowedForOutcome("full_app", "/app/settings/profile/extra")).toBe(false);
  });

  it("redirects full_app away from blocking shell paths", () => {
    expect(isPathAllowedForOutcome("full_app", "/app/pending-subscription")).toBe(false);
  });

  it("requires blocking outcomes to match their single shell path", () => {
    expect(isPathAllowedForOutcome("verify_email", "/app/verify-email")).toBe(true);
    expect(isPathAllowedForOutcome("verify_email", "/app/dashboard")).toBe(false);
  });

  it("allows minimal shells on canonical path and shared /app/account", () => {
    expect(isPathAllowedForOutcome("pending_subscription", "/app/pending-subscription")).toBe(true);
    expect(isPathAllowedForOutcome("pending_subscription", MINIMAL_ACCOUNT_PATH)).toBe(true);
    expect(isPathAllowedForOutcome("activating", "/app/activating")).toBe(true);
    expect(isPathAllowedForOutcome("activating", MINIMAL_ACCOUNT_PATH)).toBe(true);
    expect(isPathAllowedForOutcome("subscription_error", "/app/subscription-error")).toBe(true);
    expect(isPathAllowedForOutcome("subscription_error", MINIMAL_ACCOUNT_PATH)).toBe(true);
  });

  it("rejects cross-shell paths for minimal entitlements", () => {
    expect(isPathAllowedForOutcome("pending_subscription", "/app/activating")).toBe(false);
    expect(isPathAllowedForOutcome("activating", "/app/pending-subscription")).toBe(false);
  });

  it("rejects /app/account for verify_email and full_app", () => {
    expect(isPathAllowedForOutcome("verify_email", MINIMAL_ACCOUNT_PATH)).toBe(false);
    expect(isPathAllowedForOutcome("full_app", MINIMAL_ACCOUNT_PATH)).toBe(false);
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
