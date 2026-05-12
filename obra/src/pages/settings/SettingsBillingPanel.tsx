import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { tCheckoutConfigError, tMercadoPagoProviderError } from "@/lib/checkoutEdgeErrors";
import { toastApiFailure } from "@/lib/apiToast";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/toast";
import type { SubscriptionStatus } from "@/entitlement/types";

type CheckoutFnResponse = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

type Props = {
  subscriptionStatus: SubscriptionStatus;
  /** End of the current paid billing period. Used to show next payment date (active)
   * or access expiry (cancelled / past_due). See #107. */
  subscriptionAccessUntil: Date | null;
  onRefreshStatus: () => Promise<void>;
};

export function SettingsBillingPanel({ subscriptionStatus, subscriptionAccessUntil, onRefreshStatus }: Props) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);
  const mpUrl = import.meta.env.VITE_MERCADOPAGO_SUBSCRIBER_PORTAL_URL?.trim();

  const now = new Date();
  const inGracePeriod =
    subscriptionStatus === "cancelled" &&
    subscriptionAccessUntil != null &&
    subscriptionAccessUntil > now;

  async function refresh() {
    setBusy(true);
    await onRefreshStatus();
    setBusy(false);
  }

  function openMp() {
    if (!mpUrl) return;
    window.open(mpUrl, "_blank", "noopener,noreferrer");
  }

  async function reactivate() {
    setReactivateBusy(true);
    if (!session?.access_token) {
      setReactivateBusy(false);
      toastApiFailure(t, "shell.pending.checkoutStartError");
      return;
    }

    const { data, error } = await supabase.functions.invoke<CheckoutFnResponse>(
      "create-subscription-checkout",
      {
        method: "POST",
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );

    setReactivateBusy(false);

    if (error) {
      toastApiFailure(t, "shell.pending.checkoutStartError");
      return;
    }

    if (data?.error === "unauthorized") {
      toastApiFailure(t, "auth.callbackError");
      return;
    }

    if (data?.error === "email_not_verified") {
      toastApiFailure(t, "shell.pending.checkoutEmailNotVerified");
      return;
    }

    if (data?.error === "checkout_unavailable" || data?.error === "server_misconfigured") {
      const msg = tCheckoutConfigError(t, data.detail);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error === "mercadopago_error" || data?.error === "mercadopago_no_redirect") {
      const msg = tMercadoPagoProviderError(t);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error || !data?.redirect_url) {
      toastApiFailure(t, "shell.pending.checkoutStartError");
      return;
    }

    window.location.assign(data.redirect_url);
  }

  const statusKey =
    subscriptionStatus === "active"
      ? "settings.billing.status.active"
      : subscriptionStatus === "past_due"
        ? "settings.billing.status.pastDue"
        : subscriptionStatus === "cancelled"
          ? "settings.billing.status.cancelled"
          : "settings.billing.status.none";

  // Resolve which date line to show (if any).
  let dateLine: string | null = null;
  if (subscriptionAccessUntil) {
    const locale = i18n.language === "pt-BR" ? "pt-BR" : "es-AR";
    const dateStr = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(subscriptionAccessUntil);

    if (subscriptionStatus === "active") {
      dateLine = t("settings.billing.nextPayment", { date: dateStr });
    } else if (subscriptionStatus === "past_due" && subscriptionAccessUntil > now) {
      dateLine = t("settings.billing.accessUntil", { date: dateStr });
    } else if (subscriptionStatus === "cancelled" && subscriptionAccessUntil > now) {
      dateLine = t("settings.billing.activeUntil", { date: dateStr });
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.billing")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.billing.intro")}</p>
      </div>

      <div className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">{t("settings.billing.statusLabel")}</p>
        <p className="mt-2 font-body text-sm font-semibold text-obra-blue-950">{t(statusKey)}</p>
        {dateLine ? (
          <p className="mt-1 text-sm text-obra-neutral-600">{dateLine}</p>
        ) : null}
        <p className="mt-4 text-sm text-obra-neutral-600">{t("settings.billing.reconcileHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {/* Refresh enabled in grace period so user can confirm after reactivating via MP */}
          <Button
            type="button"
            variant="secondary"
            disabled={busy || (subscriptionStatus === "cancelled" && !inGracePeriod)}
            onClick={() => void refresh()}
          >
            {busy ? t("common.loading") : t("settings.billing.refresh")}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            disabled={!mpUrl || (subscriptionStatus === "cancelled" && !inGracePeriod)}
            onClick={openMp}
          >
            {t("settings.billing.openMp")}
          </Button>
          {inGracePeriod ? (
            <Button
              type="button"
              variant="cta"
              disabled={reactivateBusy}
              onClick={() => void reactivate()}
              data-testid="billing-reactivate-btn"
            >
              {reactivateBusy ? t("common.loading") : t("settings.billing.reactivate")}
            </Button>
          ) : null}
        </div>
        {!mpUrl ? <p className="mt-3 text-xs text-obra-neutral-500">{t("settings.billing.mpUrlMissing")}</p> : null}
      </div>
    </div>
  );
}
