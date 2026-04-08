import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { buttonBaseClass, buttonSizeClass, buttonVariantClass } from "@/components/ui/Button";
import { looksLikePaymentReturnQuery } from "@/lib/paymentReturnParams";

export function HomePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/") return;
    if (!looksLikePaymentReturnQuery(searchParams)) return;
    const q = searchParams.toString();
    void navigate(q ? `/checkout/return?${q}` : "/checkout/return", { replace: true });
  }, [location.pathname, navigate, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-obra-blue-50 px-6">
      <h1 className="font-display text-3xl font-bold text-obra-blue-950">
        {t("app.name")}
      </h1>
      <p className="max-w-md text-center text-obra-neutral-600">{t("home.lead")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/design-system"
          className={`${buttonBaseClass} ${buttonSizeClass.medium} ${buttonVariantClass.light.tertiary}`}
        >
          Design system
        </Link>
        <Link
          to="/login"
          className={`${buttonBaseClass} ${buttonSizeClass.medium} ${buttonVariantClass.light.cta}`}
        >
          {t("home.ctaLogin")}
        </Link>
        <Link
          to="/register"
          className={`${buttonBaseClass} ${buttonSizeClass.medium} ${buttonVariantClass.light.secondary}`}
        >
          {t("home.ctaRegister")}
        </Link>
      </div>
    </div>
  );
}
