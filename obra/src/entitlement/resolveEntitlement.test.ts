import { describe, expect, it } from "vitest";
import {
  isPathAllowedForOutcome,
  MINIMAL_ACCOUNT_PATH,
  outcomeToPath,
  parseDevEntitlementOverride,
  resolveEntitlement,
} from "./resolveEntitlement";

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000); // -1 day

describe("resolveEntitlement", () => {
  it("requires email verification before any subscription state", () => {
    expect(
      resolveEntitlement({
        emailVerified: false,
        subscriptionStatus: "active",
        checkoutReturnPending: false,
        subscriptionAccessUntil: null,
      }),
    ).toBe("verify_email");
  });

  it("maps past_due + expired access to subscription_error", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "past_due",
        checkoutReturnPending: false,
        subscriptionAccessUntil: null,
      }),
    ).toBe("subscription_error");
  });

  it("maps past_due + past access_until to subscription_error", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "past_due",
        checkoutReturnPending: false,
        subscriptionAccessUntil: PAST,
      }),
    ).toBe("subscription_error");
  });

  it("grants full_app for past_due when access_until is in the future", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "past_due",
        checkoutReturnPending: false,
        subscriptionAccessUntil: FUTURE,
      }),
    ).toBe("full_app");
  });

  it("maps cancelled + no access to pending_subscription", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "cancelled",
        checkoutReturnPending: false,
        subscriptionAccessUntil: null,
      }),
    ).toBe("pending_subscription");
  });

  it("maps cancelled + expired access_until to pending_subscription", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "cancelled",
        checkoutReturnPending: false,
        subscriptionAccessUntil: PAST,
      }),
    ).toBe("pending_subscription");
  });

  it("grants full_app for cancelled when access_until is in the future", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "cancelled",
        checkoutReturnPending: false,
        subscriptionAccessUntil: FUTURE,
      }),
    ).toBe("full_app");
  });

  it("shows activating when checkout return is pending and not yet active", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "none",
        checkoutReturnPending: true,
        subscriptionAccessUntil: null,
      }),
    ).toBe("activating");
  });

  it("shows activating for cancelled + checkoutReturnPending (re-subscriber before webhook fires)", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "cancelled",
        checkoutReturnPending: true,
        subscriptionAccessUntil: null,
      }),
    ).toBe("activating");
  });

  it("does not use activating once subscription is active", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "active",
        checkoutReturnPending: true,
        subscriptionAccessUntil: FUTURE,
      }),
    ).toBe("full_app");
  });

  it("maps unverified checkout path to verify_email first", () => {
    expect(
      resolveEntitlement({
        emailVerified: false,
        subscriptionStatus: "none",
        checkoutReturnPending: true,
        subscriptionAccessUntil: null,
      }),
    ).toBe("verify_email");
  });

  it("maps verified without subscription to pending_subscription", () => {
    expect(
      resolveEntitlement({
        emailVerified: true,
        subscriptionStatus: "none",
        checkoutReturnPending: false,
        subscriptionAccessUntil: null,
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
