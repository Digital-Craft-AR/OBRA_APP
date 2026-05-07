import { useEffect, useState } from "react";
import { BookOpen, Cookie, Hammer, Cloud, Sprout } from "lucide-react";

const ICONS = [BookOpen, Cookie, Hammer, Cloud, Sprout] as const;
const ICON_INTERVAL_MS = 1800;
const MSG_INTERVAL_MS = 3500;

type Props = {
  title: string;
  messages: string[];
  ariaLabel: string;
  /** Items processed so far. Shows progress bar when `total` is provided. */
  current?: number;
  /** Total items to process. When provided, renders a progress bar. */
  total?: number;
};

export function ObraGeneratingOverlay({ title, messages, ariaLabel, current, total }: Props) {
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

  const safeMessages = messages.length > 0 ? messages : [title];

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
  const showProgress = total !== undefined && total > 0;
  const safeTotal = Math.max(1, total ?? 1);
  const safeCurrent = Math.min(Math.max(current ?? 0, 0), safeTotal);
  const progressPercent = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-white/40 backdrop-blur-md"
      role="status"
      aria-label={ariaLabel}
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
        <p className="text-sm font-semibold text-obra-blue-950">{title}</p>
        <p
          className="max-w-xs text-xs text-obra-neutral-500 transition-opacity duration-400"
          style={{ opacity: msgVisible ? 1 : 0 }}
        >
          {safeMessages[msgIndex]}
        </p>
      </div>
      {showProgress && (
        <div className="flex w-52 flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-obra-blue-100">
            <div
              className="relative h-full overflow-hidden rounded-full bg-obra-blue-700 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              aria-hidden
            >
              <div className="absolute inset-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
          </div>
          <p className="text-center font-body text-xs text-obra-neutral-500">
            {safeCurrent}/{total}
          </p>
        </div>
      )}
    </div>
  );
}
