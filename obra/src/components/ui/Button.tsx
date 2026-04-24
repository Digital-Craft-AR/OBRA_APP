import type { ButtonHTMLAttributes } from "react";

/**
 * Shared layout/focus ring — matches figma_make `ObraButton` (Figma design system).
 * Use with `buttonVariantClass` + `buttonSizeClass` for `<Link>` that should look like a button.
 */
export const buttonBaseClass = [
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
  "cursor-pointer font-body font-semibold text-sm transition-all",
  "outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

const greenPrimary = "bg-obra-green-400 text-obra-blue-950 hover:brightness-105";

export const buttonSizeClass = {
  medium: "h-10 px-5",
  small: "h-8 px-4",
  icon: "size-8 p-0",
} as const;

/** Variant mapping by visual mode (`light` by default). */
export const buttonVariantClass = {
  light: {
    primary: greenPrimary,
    cta: greenPrimary,
    secondary: "bg-obra-blue-900 text-white hover:bg-obra-blue-950",
    tertiary:
      "bg-transparent border border-obra-blue-700 text-obra-blue-700 hover:bg-obra-blue-50",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent border-0 p-0 h-auto text-obra-blue-900 hover:opacity-90",
    link: "bg-transparent border-0 p-0 h-auto text-obra-blue-900 underline underline-offset-4 hover:opacity-90",
    /** Legacy alias kept for current call sites on dark surfaces. */
    ghostDark: "bg-transparent text-white border border-white/20 hover:bg-white/10",
  },
  dark: {
    primary: greenPrimary,
    cta: greenPrimary,
    secondary: "bg-white text-obra-blue-700 hover:bg-white/90",
    tertiary: "bg-transparent border border-white/30 text-white hover:bg-white/10",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent border-0 p-0 h-auto text-white hover:opacity-90",
    link: "bg-transparent border-0 p-0 h-auto text-white underline underline-offset-4 hover:opacity-90",
    ghostDark: "bg-transparent text-white border border-white/20 hover:bg-white/10",
  },
} as const;

type Mode = keyof typeof buttonVariantClass;
type Variant = keyof (typeof buttonVariantClass)["light"];
type Size = keyof typeof buttonSizeClass;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  mode?: Mode;
  size?: Size;
};

export function Button({
  variant = "primary",
  mode = "light",
  size = "medium",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonBaseClass} ${buttonSizeClass[size]} ${buttonVariantClass[mode][variant]} ${className}`.trim()}
      {...rest}
    />
  );
}
