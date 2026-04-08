type StructureStepHeaderProps = {
  stepCounterLabel: string;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
};

export function StructureStepHeader({
  stepCounterLabel,
  currentStep,
  totalSteps,
  title,
  subtitle,
}: StructureStepHeaderProps) {
  return (
    <>
      <div className="border-b border-obra-blue-100 px-8 py-3">
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

      <header className="space-y-2">
        <h1 className="font-display text-2xl text-obra-blue-950">{title}</h1>
        <p className="text-sm text-obra-neutral-600">{subtitle}</p>
      </header>
    </>
  );
}
