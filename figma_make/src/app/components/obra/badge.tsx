import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../ui/utils";

const obraBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold font-body whitespace-nowrap",
  {
    variants: {
      variant: {
        default:    "bg-obra-blue-100 text-obra-blue-700",
        warning:    "bg-yellow-50 text-yellow-700",
        draft:      "bg-obra-blue-100 text-obra-blue-700",
        published:  "bg-green-50 text-green-700",
        modified:   "bg-yellow-50 text-yellow-700",
        credits:    "bg-obra-green-400 text-obra-blue-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Dot indicator used inside status badges */
function StatusDot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full", className)} />;
}

export interface ObraBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof obraBadgeVariants> {
  showDot?: boolean;
}

export function ObraBadge({ className, variant, showDot, children, ...props }: ObraBadgeProps) {
  const dotColor: Record<string, string> = {
    default:   "bg-obra-blue-700",
    draft:     "bg-obra-blue-700",
    published: "bg-green-600",
    modified:  "bg-yellow-600",
    warning:   "bg-yellow-600",
    credits:   "bg-obra-blue-950",
  };

  return (
    <span className={cn(obraBadgeVariants({ variant, className }))} {...props}>
      {showDot && (
        <StatusDot className={dotColor[variant ?? "default"] ?? "bg-obra-blue-700"} />
      )}
      {children}
    </span>
  );
}
