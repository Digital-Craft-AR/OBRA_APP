import { useEffect, useState } from "react";
import { BookOpen, Cookie, Hammer, Cloud, Sprout } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [BookOpen, Cookie, Hammer, Cloud, Sprout] as const;
const ICON_INTERVAL_MS = 1800;
const MSG_INTERVAL_MS = 3500;

export function ObraShellGeneratingOverlay() {
  const { t } = useTranslation();
  const [iconIndex, setIconIndex] = useState(0);
  const [iconVisible, setIconVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => {
      setIconVisible(false);
      setTimeout(() => {
        setIconIndex((i) => (i + 1) % ICONS.length);
        setIconVisible(true);
      }, 300);
    }, ICON_INTERVAL_MS);
    return () => clearInterval(tick);
  }, []);

  const msgs = t("wizard.preview.shell.loadingMsgs", { returnObjects: true }) as string[];
  const safeMessages = Array.isArray(msgs) && msgs.length > 0 ? msgs : [t("wizard.preview.shell.generatingHint")];

  useEffect(() => {
    const tick = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % safeMessages.length);
        setMsgVisible(true);
      }, 400);
    }, MSG_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [safeMessages.length]);

  const Icon = ICONS[iconIndex]!;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-white/90 backdrop-blur-sm"
      role="status"
      aria-label={t("wizard.preview.shell.generating")}
    >
      <div
        className="flex items-center justify-center transition-all duration-300 ease-in-out"
        style={{
          opacity: iconVisible ? 1 : 0,
          transform: iconVisible ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(15deg)",
        }}
      >
        <Icon className="size-12 text-obra-blue-700" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.preview.shell.generatingTitle")}
        </p>
        <p
          className="max-w-xs text-xs text-obra-neutral-500 transition-opacity duration-400"
          style={{ opacity: msgVisible ? 1 : 0 }}
        >
          {safeMessages[msgIndex]}
        </p>
      </div>
    </div>
  );
}
