import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  title: string;
  body: string;
  stepLabel: string;
  skipLabel: string;
  previousLabel: string;
  nextLabel: string;
  finishLabel: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export function WizardGuidedTour({
  open,
  title,
  body,
  stepLabel,
  skipLabel,
  previousLabel,
  nextLabel,
  finishLabel,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onSkip,
  onFinish,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        onBack();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (canGoNext) onNext();
        else onFinish();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onSkip, canGoBack, onBack, canGoNext, onNext, onFinish]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div className="absolute inset-0 bg-obra-blue-950/20" />
      <section
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto absolute bottom-8 right-8 w-full max-w-md rounded-modal border border-obra-blue-100 bg-white p-6 shadow-card-hover"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-obra-blue-700">{stepLabel}</p>
        <h3 className="mt-2 text-lg font-semibold font-body text-obra-blue-950">{title}</h3>
        <p className="mt-2 text-sm font-body text-obra-neutral-600">{body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="tertiary" size="small" data-testid="wizard-tour-skip" onClick={onSkip}>
            {skipLabel}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="tertiary" size="small" disabled={!canGoBack} onClick={onBack}>
              {previousLabel}
            </Button>
            {canGoNext ? (
              <Button variant="primary" size="small" onClick={onNext}>
                {nextLabel}
              </Button>
            ) : (
              <Button variant="primary" size="small" onClick={onFinish}>
                {finishLabel}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
