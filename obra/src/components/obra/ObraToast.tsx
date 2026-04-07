import { useEffect, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

export type ObraToastVariant = "success" | "error" | "info";

type ObraToastProps = HTMLAttributes<HTMLDivElement> & {
  variant?: ObraToastVariant;
  title: string;
  description: string;
  timeoutMs?: number;
  onTimeout?: () => void;
};

const variantStyles: Record<
  ObraToastVariant,
  { background: string; border: string; iconClassName: string; icon: ReactNode }
> = {
  success: {
    background: "bg-green-50",
    border: "border-l-4 border-l-green-600",
    iconClassName: "text-green-600",
    icon: <CheckCircle2 className="size-5" aria-hidden />,
  },
  error: {
    background: "bg-red-50",
    border: "border-l-4 border-l-red-500",
    iconClassName: "text-red-500",
    icon: <XCircle className="size-5" aria-hidden />,
  },
  info: {
    background: "bg-obra-blue-50",
    border: "border-l-4 border-l-obra-blue-700",
    iconClassName: "text-obra-blue-700",
    icon: <Info className="size-5" aria-hidden />,
  },
};

export function ObraToast({
  variant = "info",
  title,
  description,
  timeoutMs = 15_000,
  onTimeout,
  className = "",
  ...props
}: ObraToastProps) {
  const style = variantStyles[variant];
  const [remainingMs, setRemainingMs] = useState(timeoutMs);
  const [paused, setPaused] = useState(false);
  const timeoutHandledRef = useRef(false);

  useEffect(() => {
    setRemainingMs(timeoutMs);
    timeoutHandledRef.current = false;
  }, [timeoutMs, title, description, variant]);

  useEffect(() => {
    if (paused || remainingMs <= 0) return;
    const tickMs = 100;
    const timer = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - tickMs);
        if (next === 0) {
          window.clearInterval(timer);
        }
        return next;
      });
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [paused, remainingMs]);

  useEffect(() => {
    if (remainingMs > 0 || timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    onTimeout?.();
  }, [remainingMs, onTimeout]);

  const progress = useMemo(() => {
    if (timeoutMs <= 0) return 0;
    return remainingMs / timeoutMs;
  }, [remainingMs, timeoutMs]);
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - progress);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`w-full max-w-toast rounded-card px-4 py-3 shadow-card-hover ${style.background} ${style.border} ${className}`.trim()}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 inline-flex size-10 shrink-0 items-center justify-center p-[5px]">
          <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="20" cy="20" r={ringRadius} className="fill-none stroke-white/40" strokeWidth="2" />
            <circle
              cx="20"
              cy="20"
              r={ringRadius}
              className={`${style.iconClassName} fill-none stroke-current`}
              strokeWidth="2"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringDashOffset}
            />
          </svg>
          <span className={style.iconClassName}>{style.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-obra-blue-950">{title}</p>
          <p className="mt-0.5 font-body text-xs text-obra-neutral-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
