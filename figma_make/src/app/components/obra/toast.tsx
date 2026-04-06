import * as React from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "../ui/utils";

export type ObraToastVariant = "success" | "error" | "info";

export interface ObraToastProps {
  variant?:  ObraToastVariant;
  title:     string;
  message?:  string;
  onClose?:  () => void;
  className?: string;
}

const variantConfig: Record<
  ObraToastVariant,
  { bg: string; border: string; icon: React.ReactNode; iconColor: string }
> = {
  success: {
    bg:        "bg-green-50",
    border:    "border-l-4 border-l-green-600",
    iconColor: "text-green-600",
    icon:      <CheckCircle2 className="size-5" />,
  },
  error: {
    bg:        "bg-red-50",
    border:    "border-l-4 border-l-red-500",
    iconColor: "text-red-500",
    icon:      <XCircle className="size-5" />,
  },
  info: {
    bg:        "bg-obra-blue-50",
    border:    "border-l-4 border-l-obra-blue-700",
    iconColor: "text-obra-blue-700",
    icon:      <Info className="size-5" />,
  },
};

export function ObraToast({
  variant = "info",
  title,
  message,
  onClose,
  className,
}: ObraToastProps) {
  const { bg, border, icon, iconColor } = variantConfig[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 w-full max-w-toast rounded-card shadow-card-hover px-4 py-3",
        bg,
        border,
        className
      )}
    >
      {/* Icon */}
      <span className={cn("shrink-0 mt-0.5", iconColor)} aria-hidden="true">
        {icon}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-body text-obra-blue-950">{title}</p>
        {message && (
          <p className="text-xs text-obra-neutral-600 font-body mt-0.5">{message}</p>
        )}
      </div>

      {/* Close */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="shrink-0 p-1 rounded-full text-obra-neutral-600 hover:bg-black/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Toast Container ────────────────────────────────────────────────────── */
export interface ObraToastItem {
  id:       string;
  variant?: ObraToastVariant;
  title:    string;
  message?: string;
}

export function ObraToastContainer({
  toasts,
  onClose,
}: {
  toasts:   ObraToastItem[];
  onClose?: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <ObraToast
          key={t.id}
          variant={t.variant}
          title={t.title}
          message={t.message}
          onClose={onClose ? () => onClose(t.id) : undefined}
        />
      ))}
    </div>
  );
}