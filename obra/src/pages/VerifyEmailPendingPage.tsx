import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useEmailVerificationResend } from "@/auth/useEmailVerificationResend";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
import { VerifyEmailPanel } from "@/components/verification/VerifyEmailPanel";
import { authCardClass, authChromeLogoImgClass } from "@/lib/uiClasses";

type VerifyEmailLocationState = {
  email?: string;
};

export function VerifyEmailPendingPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const locationState = state as VerifyEmailLocationState | null;
  const email = locationState?.email ?? "";
  const { busy, message, resend } = useEmailVerificationResend(email);

  return (
    <div className="flex min-h-screen flex-col bg-obra-blue-50 font-body">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className={`${authCardClass} text-center`}>
          <div className="flex justify-center">
            <ObraLogoLink to="/" tone="solidBlue950" imgClassName={authChromeLogoImgClass} />
          </div>

          <h1 className="font-display text-2xl font-bold text-obra-blue-950">{t("shell.verify.title")}</h1>

          <VerifyEmailPanel
            email={email}
            message={message}
            busy={busy}
            onResend={resend}
            secondaryAction={
              <Link to="/login" className="text-sm font-medium text-obra-blue-700 underline-offset-4 hover:underline">
                {t("auth.backToLogin")}
              </Link>
            }
          />
        </div>
      </main>
    </div>
  );
}
