import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../ui/utils";

const obraButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
    "font-body font-semibold text-sm transition-all select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:     "bg-obra-green-400 text-obra-blue-950 hover:brightness-105",
        secondary:   "bg-obra-blue-700 text-white hover:bg-obra-blue-900",
        tertiary:    "bg-transparent text-obra-blue-700 border border-obra-blue-700 hover:bg-obra-blue-50",
        destructive: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        md: "h-10 px-5",
        sm: "h-8 px-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size:    "md",
    },
  }
);

export interface ObraButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof obraButtonVariants> {
  loading?: boolean;
}

export function ObraButton({
  className,
  variant,
  size,
  loading = false,
  children,
  disabled,
  ...props
}: ObraButtonProps) {
  return (
    <button
      className={cn(obraButtonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}