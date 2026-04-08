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
    <ol className="flex w-full items-center" aria-label="Global wizard progress">
      {steps.map((step, index) => {
        const isCompleted = step.status === "completed";
        const isActive = step.status === "active";
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className={`flex items-center ${isLast ? "" : "flex-1"} gap-3`}>
            <div
              className="flex flex-col items-center gap-1 rounded-card px-2 py-1"
            >
              <span
                className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold font-body ${
                  isCompleted
                    ? "border-2 border-obra-blue-700 bg-obra-blue-700 text-white"
                    : isActive
                      ? "bg-obra-blue-900 text-white"
                      : "border-2 border-obra-neutral-900 bg-white text-obra-neutral-400"
                }`}
                aria-hidden
              >
                {step.id}
              </span>
              <span
                className={`text-sm font-body ${
                  isActive
                    ? "font-bold text-obra-blue-900"
                    : isCompleted
                      ? "font-normal text-obra-blue-950"
                      : "font-normal text-obra-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast ? <span className="h-px flex-1 bg-obra-blue-100" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
