import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/auth/authContext";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { consumeCheckoutReturnMessageKey } from "@/entitlement/checkoutReturn";
import { tCheckoutConfigError, tMercadoPagoProviderError } from "@/lib/checkoutEdgeErrors";
import { toastApiFailure } from "@/lib/apiToast";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/toast";

type CheckoutFnResponse = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

export function PendingSubscriptionShellPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { subscriptionStatus } = useEntitlement();
  const isCancelled = subscriptionStatus === "cancelled";
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const key = consumeCheckoutReturnMessageKey();
    if (key) setMessage(t(key));
  }, [t]);

  async function startCheckout() {
    setMessage(null);
    setBusy(true);
    if (!session?.access_token) {
      setBusy(false);
      const key = "shell.pending.checkoutStartError";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    const { data, error } = await supabase.functions.invoke<CheckoutFnResponse>(
      "create-subscription-checkout",
      {
        method: "POST",
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    setBusy(false);

    if (error) {
      const key = "shell.pending.checkoutStartError";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    if (data?.error === "unauthorized") {
      const key = "auth.callbackError";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    if (data?.error === "checkout_unavailable" || data?.error === "server_misconfigured") {
      const msg = tCheckoutConfigError(t, data.detail);
      setMessage(msg);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error === "email_not_verified") {
      const key = "shell.pending.checkoutEmailNotVerified";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    if (data?.error === "mercadopago_error" || data?.error === "mercadopago_no_redirect") {
      const msg = tMercadoPagoProviderError(t);
      setMessage(msg);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error === "method_not_allowed") {
      const key = "shell.pending.checkoutStartError";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    if (data?.error || !data?.redirect_url) {
      const key = "shell.pending.checkoutStartError";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }

    window.location.assign(data.redirect_url);
  }

  return (
    <BlockingShellFrame titleKey={isCancelled ? "shell.cancelled.title" : "shell.pending.title"}>
      <p className="text-sm text-obra-neutral-600">
        {t(isCancelled ? "shell.cancelled.body" : "shell.pending.body")}
      </p>
      <Button
        type="button"
        variant="cta"
        className="w-full sm:w-auto"
        disabled={busy}
        onClick={() => void startCheckout()}
      >
        {busy ? t("common.loading") : t(isCancelled ? "shell.cancelled.cta" : "shell.pending.cta")}
      </Button>
      {message ? (
        <p className="text-sm text-obra-neutral-700" role="status">
          {message}
        </p>
      ) : null}
      <p className="text-xs text-obra-neutral-600">{t("shell.pending.checkoutNote")}</p>
      <div className="mt-4">
        <Link
          to="/app/account"
          className="text-sm font-semibold text-obra-blue-700 underline-offset-2 hover:underline"
        >
          {t("shell.account.openMinimalPath")}
        </Link>
      </div>
    </BlockingShellFrame>
  );
}
