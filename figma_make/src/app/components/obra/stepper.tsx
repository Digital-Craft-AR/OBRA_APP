import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../ui/utils";

export type StepStatus = "upcoming" | "active" | "completed";

export interface ObraStep {
  id:     number;
  label:  string;
  status: StepStatus;
}

export interface ObraGlobalStepperProps {
  steps:     ObraStep[];
  className?: string;
}

export function ObraGlobalStepper({ steps, className }: ObraGlobalStepperProps) {
  return (
    <div
      role="list"
      aria-label="Pasos del proceso"
      className={cn("flex items-center w-full", className)}
    >
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          {/* Step */}
          <div
            role="listitem"
            aria-current={step.status === "active" ? "step" : undefined}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            {/* Circle */}
            <div
              className={cn(
                "size-9 rounded-full flex items-center justify-center border-2 transition-all",
                step.status === "upcoming" && "border-obra-neutral-400 bg-white",
                step.status === "active" &&
                  "border-obra-blue-700 bg-obra-blue-700",
                step.status === "completed" &&
                  "border-obra-blue-700 bg-obra-blue-700"
              )}
            >
              {step.status === "completed" ? (
                <Check className="size-4 text-white" strokeWidth={2.5} />
              ) : (
                <span
                  className={cn(
                    "text-sm font-semibold font-body",
                    step.status === "upcoming" && "text-obra-neutral-400",
                    step.status === "active" && "text-white"
                  )}
                >
                  {step.id}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-sm font-body whitespace-nowrap",
                step.status === "upcoming" && "text-obra-neutral-400",
                step.status === "active" &&
                  "font-semibold text-obra-blue-700",
                step.status === "completed" && "text-obra-neutral-600"
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {idx < steps.length - 1 && (
            <div
              aria-hidden="true"
              className={cn(
                "flex-1 h-px mx-4 -mt-6 transition-colors",
                steps[idx + 1].status === "upcoming"
                  ? "bg-obra-neutral-200"
                  : "bg-obra-blue-700"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
