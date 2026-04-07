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
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-obra-blue-100">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-obra-blue-900"
            aria-hidden
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <p className="max-w-md text-sm leading-relaxed text-obra-neutral-600">{t("shell.verify.body")}</p>

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

        <Button type="button" variant="ghost" disabled={busy || !email} onClick={() => void onResend()}>
          {busy ? t("auth.working") : t("shell.verify.resend")}
        </Button>

        <button
          type="button"
          className="font-body text-sm text-obra-blue-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          disabled={busy}
          onClick={() => void refreshSession()}
        >
          {t("shell.verify.refreshedSession")}
        </button>
      </div>
    </BlockingShellFrame>
  );
}
