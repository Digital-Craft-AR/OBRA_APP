import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { VerifyEmailPanel } from "@/components/verification/VerifyEmailPanel";
import { Button } from "@/components/ui/Button";
import { useEmailVerificationResend } from "@/auth/useEmailVerificationResend";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { emitAuthInstrumentation } from "@/lib/authInstrumentation";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export function VerifyEmailShellPage() {
  const { t } = useTranslation();
  const { user, refreshSession } = useEntitlement();
  const currentEmail = user?.email ?? "";
  const pendingEmailChange = Boolean(user?.new_email?.trim());
  const resendTarget = pendingEmailChange ? (user?.new_email ?? "").trim() : currentEmail;
  const { busy, message, resend } = useEmailVerificationResend(resendTarget, {
    mode: pendingEmailChange ? "email_change" : "signup",
  });

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
        emitAuthInstrumentation({ flow: "resend_confirmation", outcome: "rate_limited" });
        setMessage(t("auth.resendRateLimited"));
        return;
      }
      emitAuthInstrumentation({ flow: "resend_confirmation", outcome: "error" });
      setMessage(t("auth.resendError"));
      return;
    }
    emitAuthInstrumentation({ flow: "resend_confirmation", outcome: "success" });
    setMessage(t("auth.resendSent"));
  }

  return (
    <BlockingShellFrame titleKey="shell.verify.title">
      <VerifyEmailPanel
        email={resendTarget}
        currentEmail={pendingEmailChange ? currentEmail : undefined}
        mode={pendingEmailChange ? "email_change" : "signup"}
        message={message}
        busy={busy}
        onResend={resend}
        secondaryAction={
          <Button type="button" variant="ghost" className="w-auto" disabled={busy} onClick={() => void refreshSession()}>
            {t("shell.verify.refreshedSession")}
          </Button>
        }
      />
    </BlockingShellFrame>
  );
}
