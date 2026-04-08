import type { User } from "@supabase/supabase-js";

/**
 * Email is considered verified for entitlement (checkout, full app) only when the
 * address is confirmed and there is no pending email change (#92 / signup-onboarding).
 */
export function isEmailVerifiedForEntitlement(user: User | null): boolean {
  if (!user?.email_confirmed_at) return false;
  if (user.new_email?.trim()) return false;
  return true;
}
