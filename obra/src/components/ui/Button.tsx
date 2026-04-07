import type { ButtonHTMLAttributes } from "react";

/**
 * Shared layout/focus ring — matches figma_make `ObraButton` (Figma design system).
 * Use with `buttonVariantClass` for `<Link>` that should look like a button.
 */
export const buttonBaseClass = [
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
  "h-10 cursor-pointer px-5 font-body font-semibold text-sm transition-all",
  "outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

const greenPrimary = "bg-obra-green-400 text-obra-blue-950 hover:brightness-105";

/** `primary` / `cta` — main green CTA. `secondary` — blue. `tertiary` — outlined. */
export const buttonVariantClass = {
  primary: greenPrimary,
  cta: greenPrimary,
  secondary: "bg-obra-blue-700 text-white hover:bg-obra-blue-900",
  tertiary: "bg-transparent text-obra-blue-700 border border-obra-blue-700 hover:bg-obra-blue-50",
  ghost: "h-auto border-0 bg-transparent px-0 text-obra-blue-700 hover:bg-transparent",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  /** Sidebar / dark surfaces (obra-blue-900); not in Figma CVA but same pill + border language. */
  ghostDark: "bg-transparent text-white border border-white/20 hover:bg-white/10",
} as const;

type Variant = keyof typeof buttonVariantClass;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonBaseClass} ${buttonVariantClass[variant]} ${className}`.trim()}
      {...rest}
    />
  );
}
