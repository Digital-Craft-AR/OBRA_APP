import type { InputHTMLAttributes } from "react";

const inputBase = [
  "h-11 w-full px-3 py-2 font-body text-sm transition-all outline-none",
  "rounded-input border border-obra-neutral-200 bg-obra-neutral-100",
  "text-obra-neutral-900 placeholder:text-obra-neutral-400",
  "focus:border-obra-blue-700 focus:ring-2 focus:ring-obra-blue-700",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

export type ObraInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function ObraInput({ label, hint, error, id, className = "", ...props }: ObraInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-body text-sm font-medium text-obra-blue-950">
        {label}
      </label>
      <input
        id={inputId}
        className={`${inputBase} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`.trim()}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />
      {hint && !error ? (
        <span id={`${inputId}-hint`} className="font-body text-xs text-obra-neutral-600">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} role="alert" className="font-body text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
