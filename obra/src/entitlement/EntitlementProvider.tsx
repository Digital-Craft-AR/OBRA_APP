import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
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
  refetchProfile: () => Promise<void>;
  reconcileSubscription: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearCheckoutReturn: () => void;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

function normalizeSubscriptionStatus(raw: string | null | undefined): SubscriptionStatus {
  if (raw === "active" || raw === "past_due" || raw === "none") {
    return raw;
  }
  return "none";
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const user = session?.user ?? null;

  const [profileRow, setProfileRow] = useState<{
    subscription_status: SubscriptionStatus;
    ui_locale: string;
  } | null>(null);
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
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("subscription_status, ui_locale")
      .maybeSingle();
    if (error) {
      setLoadError(error.message);
      setProfileRow(null);
    } else {
      const row = data as { subscription_status?: string; ui_locale?: string | null } | null;
      setProfileRow({
        subscription_status: normalizeSubscriptionStatus(row?.subscription_status),
        ui_locale: normalizeUiLocale(row?.ui_locale ?? undefined),
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
      // Reconciliation is best-effort; fallback to normal profile read for UX continuity.
      await refetchProfile();
      return;
    }
    await refetchProfile();
  }, [refetchProfile, session?.access_token, session?.user?.id]);

  useEffect(() => {
    void refetchProfile();
  }, [refetchProfile]);

  useEffect(() => {
    if (!profileRow?.ui_locale) return;
    const lang = normalizeUiLocale(profileRow.ui_locale);
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [profileRow?.ui_locale]);

  const checkoutReturnPending = useMemo(() => {
    void checkoutBump;
    try {
      return isCheckoutReturnPending();
    } catch {
      return false;
    }
  }, [checkoutBump, session?.user?.id]);

  const emailVerified = Boolean(user?.email_confirmed_at);
  const subscriptionStatus = profileRow?.subscription_status ?? "none";

  let outcome = resolveEntitlement({
    emailVerified,
    subscriptionStatus,
    checkoutReturnPending,
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
