import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { OBRA_LOGO_SRC } from "@/lib/brand";

type ObraLogoLinkProps = {
  to?: string;
  /** Wrapper (link) classes */
  className?: string;
  /** Image sizing; default fits headers and shell chrome */
  imgClassName?: string;
};

export function ObraLogoLink({
  to = "/",
  className = "",
  imgClassName = "h-9 w-auto max-h-10 max-w-[200px] object-contain object-left",
}: ObraLogoLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      to={to}
      className={`inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      <img src={OBRA_LOGO_SRC} alt={t("app.name")} decoding="async" className={imgClassName} />
    </Link>
  );
}
