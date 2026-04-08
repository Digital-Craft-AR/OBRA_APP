type StepStatus = "completed" | "active" | "upcoming";

export type WizardGlobalStep = {
  id: number;
  label: string;
  status: StepStatus;
};

type Props = {
  steps: WizardGlobalStep[];
};

export function WizardGlobalStepper({ steps }: Props) {
  return (
    <ol className="flex items-center gap-3" aria-label="Global wizard progress">
      {steps.map((step, index) => {
        const isCompleted = step.status === "completed";
        const isActive = step.status === "active";
        return (
          <li key={step.id} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full border text-xs font-semibold font-body ${
                  isCompleted
                    ? "border-obra-blue-700 bg-obra-blue-700 text-white"
                    : isActive
                      ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700"
                      : "border-obra-blue-100 bg-white text-obra-neutral-400"
                }`}
                aria-hidden
              >
                {step.id}
              </span>
              <span
                className={`text-sm font-body ${isCompleted || isActive ? "text-obra-blue-950" : "text-obra-neutral-400"}`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? <span className="h-px w-10 bg-obra-blue-100" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
