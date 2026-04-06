import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../ui/utils";

const inputBase = [
  "w-full px-3 py-2 text-sm font-body",
  "bg-obra-neutral-100 border border-obra-neutral-200 rounded-input",
  "text-obra-neutral-900 placeholder:text-obra-neutral-400",
  "transition-all outline-none",
  "focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

/* ── Input ─────────────────────────────────────────────────────────────── */
export interface ObraInputProps extends React.ComponentProps<"input"> {
  label?: string;
  hint?:  string;
  error?: string;
}

export function ObraInput({
  className,
  label,
  hint,
  error,
  id,
  ...props
}: ObraInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium font-body text-obra-blue-950"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          inputBase,
          "h-11",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-xs text-obra-neutral-600 font-body">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="flex items-center gap-1 text-xs text-red-500 font-body"
        >
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

/* ── Textarea ───────────────────────────────────────────────────────────── */
export interface ObraTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  hint?:  string;
  error?: string;
}

export function ObraTextarea({
  className,
  label,
  hint,
  error,
  id,
  ...props
}: ObraTextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium font-body text-obra-blue-950"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          inputBase,
          "min-h-30 resize-y",
          error && "border-red-500 focus:ring-red-500 focus:border-red-500",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <span id={`${textareaId}-hint`} className="text-xs text-obra-neutral-600 font-body">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={`${textareaId}-error`}
          role="alert"
          className="flex items-center gap-1 text-xs text-red-500 font-body"
        >
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}