import { useEffect, useState } from "react";
import { BookOpen, Cookie, Hammer, Cloud, Sprout } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [BookOpen, Cookie, Hammer, Cloud, Sprout] as const;
const INTERVAL_MS = 1800;

export function ObraShellGeneratingOverlay() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ICONS.length);
        setVisible(true);
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(tick);
  }, []);

  const Icon = ICONS[index]!;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-white/90 backdrop-blur-sm"
      role="status"
      aria-label={t("wizard.preview.shell.generating")}
    >
      <div
        className="flex items-center justify-center transition-all duration-300 ease-in-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(15deg)",
        }}
      >
        <Icon className="size-12 text-obra-blue-700" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.preview.shell.generatingTitle")}
        </p>
        <p className="max-w-xs text-xs text-obra-neutral-500">
          {t("wizard.preview.shell.generatingHint")}
        </p>
      </div>
    </div>
  );
}
