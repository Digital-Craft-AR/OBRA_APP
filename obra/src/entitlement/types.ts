/** DB-facing values for `creator_profiles.subscription_status`. */
export type SubscriptionStatus = "none" | "active" | "past_due";

/** Client routing outcome from the entitlement resolver (signup-onboarding PRD). */
export type EntitlementOutcome =
  | "verify_email"
  | "pending_subscription"
  | "activating"
  | "subscription_error"
  | "full_app";
