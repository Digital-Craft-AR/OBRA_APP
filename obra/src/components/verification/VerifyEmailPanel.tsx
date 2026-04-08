import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

type VerifyEmailPanelProps = {
  email: string;
  /** Shown only for `email_change` (pending new address). */
  currentEmail?: string;
  mode?: "signup" | "email_change";
  message: string | null;
  busy: boolean;
  onResend: () => void | Promise<void>;
  secondaryAction?: ReactNode;
};

export function VerifyEmailPanel({
  email,
  currentEmail,
  mode = "signup",
  message,
  busy,
  onResend,
  secondaryAction,
}: VerifyEmailPanelProps) {
  const { t } = useTranslation();
  const bodyKey = mode === "email_change" ? "shell.verify.emailChangeBody" : "shell.verify.body";

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="max-w-md text-sm leading-relaxed text-obra-neutral-600">{t(bodyKey)}</p>

      {mode === "email_change" && currentEmail ? (
        <p className="max-w-md text-xs text-obra-neutral-500">{t("shell.verify.emailChangeCurrent", { email: currentEmail })}</p>
      ) : null}

      {email ? (
        <p className="rounded-full bg-obra-neutral-100 px-4 py-2 font-mono text-sm text-obra-neutral-900">{email}</p>
      ) : null}

      {message ? (
        <p className="text-sm text-obra-neutral-700" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex w-full items-center justify-between gap-4">
        <Button type="button" variant="tertiary" className="w-auto" disabled={busy} onClick={() => void onResend()}>
          {busy ? t("auth.working") : t("shell.verify.resend")}
        </Button>

        {secondaryAction ?? <span />}
      </div>
    </div>
  );
}
