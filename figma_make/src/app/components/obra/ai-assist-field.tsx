import * as React from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../ui/utils";

export type AiStatus = "idle" | "loading" | "success" | "error";

export interface ObraAiAssistFieldProps {
  label?:       string;
  hint?:        string;
  error?:       string;
  value?:       string;
  onChange?:    (value: string) => void;
  onAiAssist?:  () => void;
  aiStatus?:    AiStatus;
  placeholder?: string;
  id?:          string;
  disabled?:    boolean;
  className?:   string;
}

export function ObraAiAssistField({
  label,
  hint,
  error,
  value,
  onChange,
  onAiAssist,
  aiStatus = "idle",
  placeholder,
  id,
  disabled,
  className,
}: ObraAiAssistFieldProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const isLoading = aiStatus === "loading";
  const isSuccess = aiStatus === "success";
  const isError   = aiStatus === "error";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium font-body text-obra-blue-950"
        >
          {label}
        </label>
      )}

      {/* Textarea wrapper */}
      <div className="relative">
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          className={cn(
            "w-full min-h-30 resize-y px-3 pt-3 pb-10 text-sm font-body",
            "bg-obra-neutral-100 border border-obra-neutral-200 rounded-input",
            "text-obra-neutral-900 placeholder:text-obra-neutral-400",
            "transition-all outline-none",
            "focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500"
          )}
        />

        {/* AI button — bottom-right inside textarea */}
        <button
          type="button"
          onClick={onAiAssist}
          disabled={isLoading || disabled}
          aria-label="Mejorar con IA"
          className={cn(
            "absolute bottom-4 right-3",
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            "text-xs font-semibold font-body transition-all",
            "outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
            isLoading
              ? "bg-obra-blue-50 text-obra-blue-700 border border-obra-blue-200"
              : isSuccess
              ? "bg-green-50 text-green-700 border border-green-200"
              : isError
              ? "bg-red-50 text-red-600 border border-red-200"
              : "bg-obra-blue-50 text-obra-blue-700 border border-obra-blue-200 hover:bg-obra-blue-100"
          )}
        >
          {isLoading && <Loader2 className="size-3 animate-spin" />}
          {isSuccess && <CheckCircle2 className="size-3" />}
          {isError   && <AlertCircle className="size-3" />}
          {!isLoading && !isSuccess && !isError && <Sparkles className="size-3" />}

          {isLoading ? "Mejorando…" : isSuccess ? "¡Listo!" : isError ? "Reintentar" : "Mejorar con IA"}
        </button>
      </div>

      {hint && !error && (
        <span id={`${fieldId}-hint`} className="text-xs text-obra-neutral-600 font-body">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={`${fieldId}-error`}
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