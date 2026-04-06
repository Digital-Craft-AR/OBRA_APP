import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { supabase } from "@/lib/supabaseClient";

export function VerifyEmailShellPage() {
  const { t } = useTranslation();
  const { user, refreshSession } = useEntitlement();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const email = user?.email ?? "";

  async function onResend() {
    if (!email) return;
    setMessage(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate") || msg.includes("429") || msg.includes("too many")) {
        setMessage(t("auth.resendRateLimited"));
        return;
      }
      setMessage(t("auth.resendError"));
      return;
    }
    setMessage(t("auth.resendSent"));
  }

  return (
    <BlockingShellFrame titleKey="shell.verify.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.verify.body")}</p>
      {email ? (
        <p className="rounded-full bg-obra-neutral-100 px-4 py-2 font-mono text-sm text-obra-neutral-900">
          {email}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-obra-neutral-700" role="status">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" disabled={busy || !email} onClick={() => void onResend()}>
          {busy ? t("auth.working") : t("shell.verify.resend")}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void refreshSession()}>
          {t("shell.verify.refreshedSession")}
        </Button>
      </div>
    </BlockingShellFrame>
  );
}
