import { useTranslation } from "react-i18next";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";

type AuthFlowLoadingProps = {
  /** Larger logo on full-screen wait states */
  variant?: "inline" | "fullscreen";
};

export function AuthFlowLoading({ variant = "fullscreen" }: AuthFlowLoadingProps) {
  const { t } = useTranslation();

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center gap-4 text-obra-neutral-600">
        <ObraLogoLink to="/" imgClassName="h-10 w-auto max-w-[220px] object-contain" />
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-obra-blue-50 px-6">
      <ObraLogoLink to="/" imgClassName="h-11 w-auto max-w-[220px] object-contain" />
      <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p>
    </div>
  );
}
