import type { EntitlementOutcome, SubscriptionStatus } from "./types";

export type ResolveEntitlementInput = {
  emailVerified: boolean;
  subscriptionStatus: SubscriptionStatus;
  /** True after Mercado Pago return while webhooks may still be pending (#36). */
  checkoutReturnPending: boolean;
};

/**
 * Fixed ordering: email verification before checkout or full app; activating only when
 * returning from checkout and subscription not yet active (signup-onboarding PRD).
 */
export function resolveEntitlement(input: ResolveEntitlementInput): EntitlementOutcome {
  if (!input.emailVerified) {
    return "verify_email";
  }
  if (input.subscriptionStatus === "past_due") {
    return "subscription_error";
  }
  if (input.checkoutReturnPending && input.subscriptionStatus !== "active") {
    return "activating";
  }
  if (input.subscriptionStatus !== "active") {
    return "pending_subscription";
  }
  return "full_app";
}

export function outcomeToPath(outcome: EntitlementOutcome): string {
  switch (outcome) {
    case "verify_email":
      return "/app/verify-email";
    case "pending_subscription":
      return "/app/pending-subscription";
    case "activating":
      return "/app/activating";
    case "subscription_error":
      return "/app/subscription-error";
    case "full_app":
      return "/app/dashboard";
  }
}

/** Under `full_app`, users may visit more than `/app/dashboard` (e.g. account settings). */
const FULL_APP_ALLOWED_PATHS: readonly string[] = ["/app/dashboard", "/app/settings"];

/**
 * Whether the current URL is allowed for this entitlement. Blocking shells use a single canonical path;
 * full product access allows multiple routes under `/app`.
 */
export function isPathAllowedForOutcome(outcome: EntitlementOutcome, pathname: string): boolean {
  if (outcome === "full_app") {
    return FULL_APP_ALLOWED_PATHS.includes(pathname);
  }
  return pathname === outcomeToPath(outcome);
}

export function parseDevEntitlementOverride(raw: string | undefined): EntitlementOutcome | null {
  if (!raw) return null;
  const allowed: EntitlementOutcome[] = [
    "verify_email",
    "pending_subscription",
    "activating",
    "subscription_error",
    "full_app",
  ];
  return allowed.includes(raw as EntitlementOutcome) ? (raw as EntitlementOutcome) : null;
}
