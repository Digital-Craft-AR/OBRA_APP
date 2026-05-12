import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { tCheckoutConfigError, tMercadoPagoProviderError } from "@/lib/checkoutEdgeErrors";
import { toastApiFailure } from "@/lib/apiToast";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/toast";
import { useEntitlement } from "@/entitlement/EntitlementProvider";

const DISMISSED_KEY = "softCancelBannerDismissed";

type CheckoutFnResponse = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

/**
 * Fixed top-of-viewport banner shown when the user is in "soft-cancel" state:
 * subscription cancelled but still within subscription_access_until grace period.
 * Dismissed per browser session via sessionStorage.
 */
export function SoftCancelBanner() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { subscriptionStatus, subscriptionAccessUntil } = useEntitlement();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  const inGracePeriod =
    subscriptionStatus === "cancelled" &&
    subscriptionAccessUntil != null &&
    subscriptionAccessUntil > new Date();

  if (!inGracePeriod || dismissed) return null;

  const locale = i18n.language === "pt-BR" ? "pt-BR" : "es-AR";
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(subscriptionAccessUntil);

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  }

  async function handleReactivate() {
    setBusy(true);
    if (!session?.access_token) {
      setBusy(false);
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

    setBusy(false);

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

  return (
    <div
      role="alert"
      data-testid="soft-cancel-banner"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
        <p className="text-sm text-obra-blue-950">
          {t("softCancel.banner.message", { date: dateStr })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          disabled={busy}
          onClick={() => void handleReactivate()}
        >
          {busy ? t("common.loading") : t("softCancel.banner.cta")}
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("softCancel.banner.dismiss")}
          className="rounded p-1 text-obra-neutral-600 transition-colors hover:bg-amber-100 hover:text-obra-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
