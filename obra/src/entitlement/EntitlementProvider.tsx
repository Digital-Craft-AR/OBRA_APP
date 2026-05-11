import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { toastApiFailure } from "@/lib/apiToast";
import { supabase } from "@/lib/supabaseClient";
import { isEmailVerifiedForEntitlement } from "@/lib/authEmailEntitlement";
import { normalizeUiLocale } from "@/lib/uiLocale";
import { clearCheckoutReturnPending, isCheckoutReturnPending } from "./checkoutReturn";
import {
  outcomeToPath,
  parseDevEntitlementOverride,
  resolveEntitlement,
} from "./resolveEntitlement";
import type { EntitlementOutcome, SubscriptionStatus } from "./types";

export type EntitlementContextValue = {
  outcome: EntitlementOutcome;
  targetPath: string;
  loading: boolean;
  loadError: string | null;
  user: User | null;
  subscriptionStatus: SubscriptionStatus;
  /** End of the current paid billing period; null if never paid. See #107. */
  subscriptionAccessUntil: Date | null;
  creditsBalance: number;
  refetchProfile: () => Promise<void>;
  reconcileSubscription: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearCheckoutReturn: () => void;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

// Tracks which users have already been reconciled in this page load.
// Module-level: resets on every page refresh, but survives SPA navigation.
const reconciledThisLoad = new Set<string>();

function normalizeSubscriptionStatus(raw: string | null | undefined): SubscriptionStatus {
  if (raw === "active" || raw === "past_due" || raw === "none" || raw === "cancelled") {
    return raw;
  }
  return "none";
}

function normalizeCreditsBalance(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function parseAccessUntil(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

type ProfileRowState = {
  subscription_status: SubscriptionStatus;
  subscription_access_until: string | null;
  ui_locale: string;
  credits_balance: number;
};

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const user = session?.user ?? null;

  const [profileRow, setProfileRow] = useState<ProfileRowState | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutBump, setCheckoutBump] = useState(0);

  const refetchProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfileRow(null);
      setProfileLoading(false);
      setLoadError(null);
      return;
    }
    setProfileLoading(true);
    setLoadError(null);

    const withCredits = await supabase
      .from("creator_profiles")
      .select("subscription_status, subscription_access_until, ui_locale, credits_balance")
      .maybeSingle();

    if (!withCredits.error) {
      const row = withCredits.data as {
        subscription_status?: string;
        subscription_access_until?: string | null;
        ui_locale?: string | null;
        credits_balance?: number | null;
      } | null;
      setProfileRow({
        subscription_status: normalizeSubscriptionStatus(row?.subscription_status),
        subscription_access_until: row?.subscription_access_until ?? null,
        ui_locale: normalizeUiLocale(row?.ui_locale ?? undefined),
        credits_balance: normalizeCreditsBalance(row?.credits_balance),
      });
      setProfileLoading(false);
      return;
    }

    const withLocale = await supabase
      .from("creator_profiles")
      .select("subscription_status, subscription_access_until, ui_locale")
      .maybeSingle();

    if (!withLocale.error) {
      const row = withLocale.data as {
        subscription_status?: string;
        subscription_access_until?: string | null;
        ui_locale?: string | null;
      } | null;
      setProfileRow({
        subscription_status: normalizeSubscriptionStatus(row?.subscription_status),
        subscription_access_until: row?.subscription_access_until ?? null,
        ui_locale: normalizeUiLocale(row?.ui_locale ?? undefined),
        credits_balance: 0,
      });
      setProfileLoading(false);
      return;
    }

    const minimal = await supabase.from("creator_profiles").select("subscription_status").maybeSingle();
    if (minimal.error) {
      setLoadError(minimal.error.message);
      setProfileRow(null);
    } else {
      const row = minimal.data as { subscription_status?: string } | null;
      setProfileRow({
        subscription_status: normalizeSubscriptionStatus(row?.subscription_status),
        subscription_access_until: null,
        ui_locale: normalizeUiLocale(undefined),
        credits_balance: 0,
      });
    }
    setProfileLoading(false);
  }, [session?.user?.id]);

  const refreshSession = useCallback(async () => {
    await supabase.auth.getSession();
  }, []);

  const reconcileSubscription = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data: fnData, error: fnError } = await supabase.functions.invoke<{
      subscription_status?: SubscriptionStatus;
      error?: string;
    }>("reconcile-subscription-status", {
      method: "POST",
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (fnError || fnData?.error) {
      toastApiFailure(i18n.getFixedT(i18n.language), "entitlement.reconcileError");
      await refetchProfile();
      return;
    }
    await refetchProfile();
  }, [refetchProfile, session?.access_token, session?.user?.id]);

  useEffect(() => {
    void refetchProfile();
  }, [refetchProfile]);

  // Auto-reconcile on session mount: MP doesn't send a webhook for user-initiated
  // cancellations, so we query MP directly on every page load.
  // Uses a module-level Set so it fires once per page load (resets on refresh)
  // but not on SPA navigation (provider stays mounted).
  useEffect(() => {
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId || !token) return;
    if (reconciledThisLoad.has(userId)) return;

    reconciledThisLoad.add(userId);
    void supabase.functions
      .invoke<{ subscription_status?: SubscriptionStatus; error?: string }>(
        "reconcile-subscription-status",
        { method: "POST", body: {}, headers: { Authorization: `Bearer ${token}` } },
      )
      .then(({ data }) => {
        if (data && !data.error) void refetchProfile();
      })
      .catch(() => {
        // Silent — reconcile failure does not block the app
      });
  }, [session?.user?.id, session?.access_token, refetchProfile]);


  const checkoutReturnPending = useMemo(() => {
    void checkoutBump;
    try {
      return isCheckoutReturnPending();
    } catch {
      return false;
    }
  }, [checkoutBump, session?.user?.id]);

  const emailVerified = isEmailVerifiedForEntitlement(user);
  const subscriptionStatus = profileRow?.subscription_status ?? "none";
  const subscriptionAccessUntil = parseAccessUntil(profileRow?.subscription_access_until);
  const creditsBalance = profileRow?.credits_balance ?? 0;

  let outcome = resolveEntitlement({
    emailVerified,
    subscriptionStatus,
    checkoutReturnPending,
    subscriptionAccessUntil,
  });

  if (import.meta.env.DEV) {
    const override = parseDevEntitlementOverride(import.meta.env.VITE_DEV_ENTITLEMENT_OUTCOME);
    if (override) {
      outcome = override;
    }
  }

  useEffect(() => {
    if (outcome === "full_app") {
      clearCheckoutReturnPending();
    }
  }, [outcome]);

  const clearCheckoutReturn = useCallback(() => {
    clearCheckoutReturnPending();
    setCheckoutBump((n) => n + 1);
    void refetchProfile();
  }, [refetchProfile]);

  const value = useMemo<EntitlementContextValue>(
    () => ({
      outcome,
      targetPath: outcomeToPath(outcome),
      loading: authLoading || profileLoading,
      loadError,
      user,
      subscriptionStatus,
      subscriptionAccessUntil,
      creditsBalance,
      refetchProfile,
      reconcileSubscription,
      refreshSession,
      clearCheckoutReturn,
    }),
    [
      outcome,
      authLoading,
      profileLoading,
      loadError,
      user,
      subscriptionStatus,
      subscriptionAccessUntil,
      creditsBalance,
      refetchProfile,
      reconcileSubscription,
      refreshSession,
      clearCheckoutReturn,
    ],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error("useEntitlement must be used within EntitlementProvider");
  }
  return ctx;
}
