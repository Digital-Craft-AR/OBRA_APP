import type { EntitlementOutcome, SubscriptionStatus } from "./types";

/** Shared minimal account / privacy path for blocking shells (profile PRD #39). */
export const MINIMAL_ACCOUNT_PATH = "/app/account";

export type MinimalAccountEntitlementOutcome =
  | "pending_subscription"
  | "activating"
  | "subscription_error";

export function isMinimalAccountEntitlementOutcome(
  outcome: EntitlementOutcome,
): outcome is MinimalAccountEntitlementOutcome {
  return (
    outcome === "pending_subscription" ||
    outcome === "activating" ||
    outcome === "subscription_error"
  );
}

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

/** Under `full_app`, users may visit more than `/app/dashboard` (e.g. help, settings, project wizard/content/preview). */
const FULL_APP_ALLOWED_PATHS: readonly string[] = ["/app/dashboard", "/app/help", "/app/settings", "/app/projects/new"];

/** URL segment after `/app/settings/` for each settings subpage. */
export const SETTINGS_ROUTE_SECTIONS = ["profile", "security", "billing", "credits", "privacy"] as const;
export type SettingsRouteSection = (typeof SETTINGS_ROUTE_SECTIONS)[number];

export function parseSettingsRouteSection(raw: string | undefined): SettingsRouteSection | null {
  if (!raw) return null;
  return (SETTINGS_ROUTE_SECTIONS as readonly string[]).includes(raw) ? (raw as SettingsRouteSection) : null;
}

/** `/app/settings`, `/app/settings/profile`, etc. */
export function isFullAppSettingsPath(pathname: string): boolean {
  if (pathname === "/app/settings") return true;
  const m = /^\/app\/settings\/([^/]+)\/?$/.exec(pathname);
  if (!m) return false;
  return parseSettingsRouteSection(m[1]) !== null;
}

/** `/app/projects/:projectId/wizard` — structure step only. */
export function isFullAppWizardPath(pathname: string): boolean {
  return /^\/app\/projects\/[^/]+\/wizard\/?$/.test(pathname);
}

/**
 * `/app/projects/:projectId/(wizard|content|preview)` — global journey shells per project
 * (structure, contenido, vista previa).
 */
export function isFullAppProjectWorkspacePath(pathname: string): boolean {
  return /^\/app\/projects\/[^/]+\/(wizard|content|preview)\/?$/.test(pathname);
}

/**
 * Whether the current URL is allowed for this entitlement. Blocking shells use a single canonical path;
 * full product access allows multiple routes under `/app`.
 */
export function isPathAllowedForOutcome(outcome: EntitlementOutcome, pathname: string): boolean {
  if (outcome === "full_app") {
    return (
      FULL_APP_ALLOWED_PATHS.includes(pathname) ||
      isFullAppSettingsPath(pathname) ||
      isFullAppProjectWorkspacePath(pathname)
    );
  }
  if (isMinimalAccountEntitlementOutcome(outcome)) {
    return pathname === outcomeToPath(outcome) || pathname === MINIMAL_ACCOUNT_PATH;
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
