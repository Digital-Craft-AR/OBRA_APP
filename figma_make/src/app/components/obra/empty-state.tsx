import * as React from "react";
import { cn } from "../ui/utils";
import { ObraButton, type ObraButtonProps } from "./button";

export interface ObraEmptyStateProps {
  illustration?: React.ReactNode;
  heading:       string;
  body?:         string;
  action?:       {
    label:   string;
    onClick: () => void;
    variant?: ObraButtonProps["variant"];
  };
  className?:    string;
}

function DefaultIllustration() {
  return (
    <div
      aria-hidden="true"
      className="size-30 rounded-card bg-obra-blue-50 border border-obra-blue-100 flex items-center justify-center"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-obra-neutral-400"
      >
        <rect x="8" y="12" width="32" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M16 8h16l6 6H10l6-6z" stroke="currentColor" strokeWidth="2" />
        <path d="M16 24h16M16 30h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ObraEmptyState({
  illustration,
  heading,
  body,
  action,
  className,
}: ObraEmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4 py-16 px-6 text-center", className)}
    >
      {illustration ?? <DefaultIllustration />}

      <div className="flex flex-col items-center gap-2">
        <h3 className="text-lg font-semibold font-body text-obra-blue-950">{heading}</h3>
        {body && (
          <p className="text-sm font-body text-obra-neutral-600 max-w-80">{body}</p>
        )}
      </div>

      {action && (
        <ObraButton variant={action.variant ?? "primary"} onClick={action.onClick}>
          {action.label}
        </ObraButton>
      )}
    </div>
  );
}