import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { OBRA_LOGO_SRC } from "@/lib/brand";

type ObraLogoLinkProps = {
  to?: string;
  /** Wrapper (link) classes */
  className?: string;
  /** Image sizing; default fits headers and shell chrome */
  imgClassName?: string;
  /** Optional visual treatment used by specific screens. */
  tone?: "default" | "solidBlue950";
};

export function ObraLogoLink({
  to = "/",
  className = "",
  imgClassName = "h-9 w-auto max-h-10 max-w-[200px] object-contain object-left",
  tone = "default",
}: ObraLogoLinkProps) {
  const { t } = useTranslation();
  const toneClass =
    tone === "solidBlue950"
      ? "[filter:brightness(0)_saturate(100%)_invert(13%)_sepia(36%)_saturate(937%)_hue-rotate(167deg)_brightness(94%)_contrast(90%)]"
      : "";

  return (
    <Link
      to={to}
      className={`inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      <img
        src={OBRA_LOGO_SRC}
        alt={t("app.name")}
        decoding="async"
        className={`${imgClassName} ${toneClass}`.trim()}
      />
    </Link>
  );
}
