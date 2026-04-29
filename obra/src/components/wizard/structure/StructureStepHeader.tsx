type StructureStepInnerProgressProps = {
  stepName: string;
  currentStep: number;
  totalSteps: number;
};

export function StructureStepInnerProgress({
  stepName,
  currentStep,
  totalSteps,
}: StructureStepInnerProgressProps) {
  return (
    <div className="shrink-0 bg-obra-blue-900 px-8 pt-2 pb-4">
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={stepName}
          className="flex items-center gap-1"
        >
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-1 w-6 rounded-full transition-all ${
                index <= currentStep ? "bg-obra-green-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-white">{stepName}</span>
      </div>
    </div>
  );
}

type StructureStepTitleBlockProps = {
  title: string;
  subtitle: string;
};

export function StructureStepTitleBlock({ title, subtitle }: StructureStepTitleBlockProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-8 pb-6 pt-10">
      <header className="space-y-2">
        <h1 className="font-display text-2xl text-obra-blue-950">{title}</h1>
        <p className="text-sm text-obra-neutral-600">{subtitle}</p>
      </header>
    </div>
  );
}
