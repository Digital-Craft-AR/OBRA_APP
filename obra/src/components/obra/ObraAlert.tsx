import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ObraAlertVariant = "error" | "warning" | "info" | "success";

type ObraAlertProps = {
  variant?: ObraAlertVariant;
  title: string;
  description?: string | ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

const variantStyles: Record<
  ObraAlertVariant,
  { background: string; border: string; iconClassName: string; icon: ReactNode }
> = {
  error: {
    background: "bg-red-50",
    border: "border-l-4 border-l-red-500",
    iconClassName: "text-red-500",
    icon: <XCircle className="size-5" aria-hidden />,
  },
  warning: {
    background: "bg-amber-50",
    border: "border-l-4 border-l-amber-500",
    iconClassName: "text-amber-500",
    icon: <AlertTriangle className="size-5" aria-hidden />,
  },
  info: {
    background: "bg-obra-blue-50",
    border: "border-l-4 border-l-obra-blue-700",
    iconClassName: "text-obra-blue-700",
    icon: <Info className="size-5" aria-hidden />,
  },
  success: {
    background: "bg-green-50",
    border: "border-l-4 border-l-green-600",
    iconClassName: "text-green-600",
    icon: <CheckCircle2 className="size-5" aria-hidden />,
  },
};

export function ObraAlert({
  variant = "info",
  title,
  description,
  onDismiss,
  dismissLabel = "Cerrar",
  className = "",
}: ObraAlertProps) {
  const style = variantStyles[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={[
        "relative rounded-card py-3 pl-4 shadow-sm",
        onDismiss ? "pr-10" : "pr-4",
        style.background,
        style.border,
        className,
      ].join(" ")}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute right-2 top-2 rounded-md p-1 text-obra-neutral-600 transition-colors hover:bg-black/5 hover:text-obra-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${style.iconClassName}`}>{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-obra-blue-950">{title}</p>
          {description ? (
            <div className="mt-0.5 font-body text-xs text-obra-neutral-600">{description}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
