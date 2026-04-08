import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";

export type EmailVerificationResendMode = "signup" | "email_change";

type Options = {
  /** Default `signup` (initial verification). Use `email_change` when `user.new_email` is set. */
  mode?: EmailVerificationResendMode;
};

export function useEmailVerificationResend(email: string, options?: Options) {
  const { t } = useTranslation();
  const mode: EmailVerificationResendMode = options?.mode ?? "signup";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    if (!email) {
      setMessage(t("auth.resendMissingEmail"));
      return;
    }

    setMessage(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resend({
      type: mode === "email_change" ? "email_change" : "signup",
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

  return {
    busy,
    message,
    resend,
  };
}
