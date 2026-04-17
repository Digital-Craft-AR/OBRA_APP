import type { TextareaHTMLAttributes } from "react";
import { Sparkles } from "lucide-react";

const textareaBase = [
  "min-h-[200px] w-full px-3 pt-3 pb-10 font-body text-sm transition-all outline-none",
  "rounded-input border border-obra-neutral-200 bg-obra-neutral-100",
  "text-obra-neutral-900 placeholder:text-obra-neutral-400",
  "focus:border-obra-blue-700 focus:ring-2 focus:ring-obra-blue-700",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

export type ObraAiStatus = "idle" | "loading" | "success" | "error";

export type ObraTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  assisted?: boolean;
  onAssist?: () => void;
  assistLabel?: string;
  assistLoading?: boolean;
  aiStatus?: ObraAiStatus;
};

export function ObraTextarea({
  label,
  hint,
  error,
  assisted = false,
  onAssist,
  assistLabel = "Improve with AI",
  assistLoading = false,
  aiStatus = "idle",
  id,
  className = "",
  ...props
}: ObraTextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const resolvedStatus: ObraAiStatus = assistLoading ? "loading" : aiStatus;
  const assistStateClass =
    resolvedStatus === "loading"
      ? "bg-obra-blue-50 text-obra-blue-700 border border-obra-blue-100"
      : resolvedStatus === "success"
        ? "bg-green-50 text-green-700 border border-green-200"
        : resolvedStatus === "error"
          ? "bg-red-50 text-red-600 border border-red-200"
          : "bg-obra-blue-50 text-obra-blue-700 border border-obra-blue-100 hover:bg-obra-blue-100";
  const assistStateLabel =
    resolvedStatus === "loading"
      ? "Improving..."
      : resolvedStatus === "success"
        ? "Done!"
        : resolvedStatus === "error"
          ? "Retry"
          : assistLabel;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={textareaId} className="font-body text-sm font-medium text-obra-blue-950">
        {label}
      </label>
      <div className="relative">
        <textarea
          id={textareaId}
          className={`${textareaBase} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`.trim()}
          aria-invalid={!!error}
          aria-busy={resolvedStatus === "loading"}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
          disabled={Boolean(props.disabled) || resolvedStatus === "loading"}
        />
        {assisted ? (
          <button
            type="button"
            onClick={onAssist}
            disabled={resolvedStatus === "loading" || props.disabled}
            className={`absolute bottom-3 right-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold font-body transition-all outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${assistStateClass}`.trim()}
          >
            {resolvedStatus === "idle" ? <Sparkles className="mr-1 size-3" /> : null}
            {assistStateLabel}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <span id={`${textareaId}-hint`} className="font-body text-xs text-obra-neutral-600">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${textareaId}-error`} role="alert" className="font-body text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
