import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { buttonVariantClass } from "@/components/ui/Button";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-obra-blue-900">
        {t("app.name")}
      </h1>
      <p className="max-w-md text-center text-obra-neutral-600">{t("home.lead")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/login"
          className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${buttonVariantClass.cta}`}
        >
          {t("home.ctaLogin")}
        </Link>
        <Link
          to="/register"
          className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${buttonVariantClass.primary}`}
        >
          {t("home.ctaRegister")}
        </Link>
      </div>
    </div>
  );
}
