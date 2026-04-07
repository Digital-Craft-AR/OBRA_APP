import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
import { authCardClass } from "@/lib/uiClasses";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-obra-blue-50 p-6 font-body">
      <div className={authCardClass}>
        <div className="flex justify-center">
          <ObraLogoLink to="/" imgClassName="h-10 w-auto max-w-[200px] object-contain" />
        </div>
        <p className="text-center text-sm text-obra-neutral-600">{t("auth.forgotPasswordSoon")}</p>
        <p className="text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-obra-blue-700 underline-offset-4 hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
