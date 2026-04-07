import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";
import { consumeCheckoutReturnMessageKey } from "@/entitlement/checkoutReturn";
import { supabase } from "@/lib/supabaseClient";

type CheckoutFnResponse = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

export function PendingSubscriptionShellPage() {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const key = consumeCheckoutReturnMessageKey();
    if (key) setMessage(t(key));
  }, [t]);

  async function startCheckout() {
    setMessage(null);
    setBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setBusy(false);
      setMessage(t("shell.pending.checkoutStartError"));
      return;
    }

    const { data, error } = await supabase.functions.invoke<CheckoutFnResponse>(
      "create-subscription-checkout",
      {
        method: "POST",
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    setBusy(false);

    if (error) {
      setMessage(t("shell.pending.checkoutStartError"));
      return;
    }

    if (data?.error === "checkout_unavailable" || data?.error === "server_misconfigured") {
      setMessage(t("shell.pending.checkoutUnavailable"));
      return;
    }

    if (data?.error === "email_not_verified") {
      setMessage(t("shell.pending.checkoutEmailNotVerified"));
      return;
    }

    if (
      data?.error === "mercadopago_error" ||
      data?.error === "mercadopago_no_redirect" ||
      data?.error === "method_not_allowed"
    ) {
      setMessage(t("shell.pending.checkoutStartError"));
      return;
    }

    if (data?.error || !data?.redirect_url) {
      setMessage(t("shell.pending.checkoutStartError"));
      return;
    }

    window.location.assign(data.redirect_url);
  }

  return (
    <BlockingShellFrame titleKey="shell.pending.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.pending.body")}</p>
      {message ? (
        <p className="text-sm text-obra-neutral-700" role="status">
          {message}
        </p>
      ) : null}
      <Button
        type="button"
        variant="cta"
        className="w-full sm:w-auto"
        disabled={busy}
        onClick={() => void startCheckout()}
      >
        {busy ? t("common.loading") : t("shell.pending.cta")}
      </Button>
      <p className="text-xs text-obra-neutral-600">{t("shell.pending.checkoutNote")}</p>
    </BlockingShellFrame>
  );
}
