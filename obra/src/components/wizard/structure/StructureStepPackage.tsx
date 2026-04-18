import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

type StructureStepPackageProps = {
  bonusLabel: string;
  bonusHint: string;
  bonusCount: number;
  bumpLabel: string;
  bumpHint: string;
  bumpCount: number;
  saving: boolean;
  savingLabel: string;
  message: string | null;
  countsLocked: boolean;
  modifyBonusesLabel: string;
  modifyBumpsLabel: string;
  onOpenModifyBonuses: () => void;
  onOpenModifyBumps: () => void;
  onBonusChange: (next: number) => void;
  onBumpChange: (next: number) => void;
};

export function StructureStepPackage({
  bonusLabel,
  bonusHint,
  bonusCount,
  bumpLabel,
  bumpHint,
  bumpCount,
  saving,
  savingLabel,
  message,
  countsLocked,
  modifyBonusesLabel,
  modifyBumpsLabel,
  onOpenModifyBonuses,
  onOpenModifyBumps,
  onBonusChange,
  onBumpChange,
}: StructureStepPackageProps) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-obra-blue-950">{bonusLabel}</p>
          {countsLocked ? (
            <p className="text-3xl font-semibold text-obra-blue-950">{bonusCount}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="small"
                variant="tertiary"
                onClick={() => onBonusChange(Math.max(0, bonusCount - 1))}
                disabled={saving || bonusCount === 0}
                className="size-8 rounded-full p-0 flex items-center justify-center"
              >
                <Minus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
              </Button>
              <span className="w-8 text-center text-xl font-semibold text-obra-blue-950">{bonusCount}</span>
              <Button
                size="small"
                variant="tertiary"
                onClick={() => onBonusChange(Math.min(5, bonusCount + 1))}
                disabled={saving || bonusCount === 5}
                className="size-8 rounded-full p-0 flex items-center justify-center"
              >
                <Plus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
              </Button>
            </div>
          )}
          <p className="text-xs text-obra-neutral-600">{bonusHint}</p>
          {countsLocked ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={onOpenModifyBonuses}
            >
              {modifyBonusesLabel}
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-obra-blue-950">{bumpLabel}</p>
          {countsLocked ? (
            <p className="text-3xl font-semibold text-obra-blue-950">{bumpCount}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="small"
                variant="tertiary"
                onClick={() => onBumpChange(Math.max(0, bumpCount - 1))}
                disabled={saving || bumpCount === 0}
                className="size-8 rounded-full p-0 flex items-center justify-center"
              >
                <Minus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
              </Button>
              <span className="w-8 text-center text-xl font-semibold text-obra-blue-950">{bumpCount}</span>
              <Button
                size="small"
                variant="tertiary"
                onClick={() => onBumpChange(Math.min(2, bumpCount + 1))}
                disabled={saving || bumpCount === 2}
                className="size-8 rounded-full p-0 flex items-center justify-center"
              >
                <Plus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
              </Button>
            </div>
          )}
          <p className="text-xs text-obra-neutral-600">{bumpHint}</p>
          {countsLocked ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={onOpenModifyBumps}
            >
              {modifyBumpsLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {saving ? savingLabel : message}
      </div>
    </section>
  );
}
