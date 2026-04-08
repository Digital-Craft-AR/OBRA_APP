type StructureStepInnerProgressProps = {
  stepCounterLabel: string;
  currentStep: number;
  totalSteps: number;
};

export function StructureStepInnerProgress({
  stepCounterLabel,
  currentStep,
  totalSteps,
}: StructureStepInnerProgressProps) {
  return (
    <div className="shrink-0 border-b border-obra-blue-100 px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-obra-neutral-600">{stepCounterLabel}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-9 rounded-full transition-all ${
                index <= currentStep ? "bg-obra-blue-700" : "bg-obra-blue-100"
              }`}
            />
          ))}
        </div>
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
