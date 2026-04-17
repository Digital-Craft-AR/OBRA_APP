type StepStatus = "completed" | "active" | "upcoming";

export type WizardGlobalStep = {
  id: number;
  label: string;
  status: StepStatus;
  /** Navigate to this step. Only invoked for completed steps. */
  onClick?: () => void;
};

type Props = {
  steps: WizardGlobalStep[];
  dark?: boolean;
};

export function WizardGlobalStepper({ steps, dark = false }: Props) {
  return (
    <div className="flex justify-center">
      <ol className="flex items-center gap-2" aria-label="Global wizard progress">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const isLast = index === steps.length - 1;
          const isClickable = isCompleted && Boolean(step.onClick);

          const numberClass = dark
            ? isActive
              ? "bg-obra-green-400 text-obra-blue-950"
              : isCompleted
                ? "bg-obra-blue-700 text-white"
                : "border border-white/25 bg-transparent text-white/40"
            : isActive
              ? "bg-obra-blue-900 text-white"
              : isCompleted
                ? "bg-obra-blue-700 text-white"
                : "border border-obra-neutral-300 bg-white text-obra-neutral-400";

          const labelClass = dark
            ? isActive
              ? "font-semibold text-obra-green-400"
              : isCompleted
                ? "font-normal text-white/70"
                : "font-normal text-white/40"
            : isActive
              ? "font-semibold text-obra-blue-900"
              : isCompleted
                ? "font-normal text-obra-blue-700"
                : "font-normal text-obra-neutral-400";

          const separatorClass = dark ? "bg-white/20" : "bg-obra-blue-100";
          const hoverClass = dark
            ? "hover:bg-white/10 cursor-pointer"
            : "hover:bg-obra-blue-50 cursor-pointer";

          const inner = (
            <>
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold font-body ${numberClass}`}
                aria-hidden
              >
                {step.id}
              </span>
              <span className={`text-sm font-body ${labelClass}`}>
                {step.label}
              </span>
            </>
          );

          return (
            <li key={step.id} className="flex items-center gap-2">
              {isClickable ? (
                <button
                  type="button"
                  onClick={step.onClick}
                  aria-label={step.label}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${hoverClass}`}
                >
                  {inner}
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2 py-1"
                  aria-current={isActive ? "step" : undefined}
                >
                  {inner}
                </div>
              )}
              {!isLast ? (
                <span className={`h-px w-6 shrink-0 ${separatorClass}`} aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
