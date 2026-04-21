import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-obra-blue-900 px-8 text-center">
      <div className="mb-6 text-4xl">✦</div>
      <h1 className="mb-4 font-display text-2xl font-semibold text-white">
        {t("mobile.title")}
      </h1>
      <p className="max-w-xs text-base text-obra-blue-100">
        {t("mobile.body")}
      </p>
    </div>
  );
}
