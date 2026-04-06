import type { ButtonHTMLAttributes } from "react";

export const buttonVariantClass = {
  primary:
    "bg-obra-blue-700 text-white hover:bg-obra-blue-900 disabled:opacity-50",
  cta: "bg-obra-green-400 text-obra-blue-950 hover:brightness-105 disabled:opacity-50",
  ghost:
    "bg-transparent text-obra-blue-700 hover:bg-obra-blue-50 disabled:opacity-50",
  destructive: "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50",
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
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${buttonVariantClass[variant]} ${className}`}
      {...rest}
    />
  );
}
