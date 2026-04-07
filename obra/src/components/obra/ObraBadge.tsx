import type { HTMLAttributes } from "react";

const badgeVariants = {
  default: "bg-obra-blue-100 text-obra-blue-700",
  warning: "bg-yellow-50 text-yellow-700",
  draft: "bg-obra-blue-100 text-obra-blue-700",
  published: "bg-green-50 text-green-700",
  modified: "bg-yellow-50 text-yellow-700",
  credits: "bg-obra-green-400 text-obra-blue-950",
} as const;

const dotColors = {
  default: "bg-obra-blue-700",
  warning: "bg-yellow-600",
  draft: "bg-obra-blue-700",
  published: "bg-green-600",
  modified: "bg-yellow-600",
  credits: "bg-obra-blue-950",
} as const;

export type ObraBadgeVariant = keyof typeof badgeVariants;

export type ObraBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ObraBadgeVariant;
  showDot?: boolean;
};

export function ObraBadge({
  variant = "default",
  showDot = false,
  className = "",
  children,
  ...props
}: ObraBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold font-body ${badgeVariants[variant]} ${className}`.trim()}
      {...props}
    >
      {showDot ? <span className={`inline-block size-1.5 rounded-full ${dotColors[variant]}`} /> : null}
      {children}
    </span>
  );
}
