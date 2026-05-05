import { Lock, LockOpen, RotateCw } from "lucide-react";
import type { WizardTitleItem } from "@/lib/wizard/structureTypes";

type StructureStepBonusBumpTitlesProps = {
  bonusItems: WizardTitleItem[];
  bumpItems: WizardTitleItem[];
  showBonus?: boolean;
  showBump?: boolean;
  loadingKey: string | null;
  message: string | null;
  bonusSectionLabel: string;
  bumpSectionLabel: string;
  regenerateAllLabel: string;
  onChangeBonusTitle: (index: number, title: string) => void;
  onChangeBumpTitle: (index: number, title: string) => void;
  onToggleBonusLock: (index: number) => void;
  onToggleBumpLock: (index: number) => void;
  onRegenerateBonus: (index: number) => void;
  onRegenerateBump: (index: number) => void;
  onRegenerateAllBonus: () => void;
  onRegenerateAllBump: () => void;
};

function sectionRow(
  item: WizardTitleItem,
  index: number,
  kind: "bonus" | "bump",
  loadingKey: string | null,
  onChangeTitle: (index: number, title: string) => void,
  onToggleLock: (index: number) => void,
  onRegenerate: (index: number) => void,
) {
  const key = `${kind}-${index}`;
  const isLoading = loadingKey === key;
  const aiBusy = loadingKey !== null;
  return (
    <div key={key} className="rounded-card bg-obra-neutral-100 px-4 py-3">
      <div className="flex items-center gap-3 text-xs">
        <div className="min-w-[88px] text-xs font-medium text-obra-neutral-600">
          {kind === "bonus" ? "Bonus" : "Bump"} {index + 1}
        </div>

        <div className="flex-1">
          <input
            id={`${kind}-title-${index}`}
            value={item.title}
            onChange={(event) => onChangeTitle(index, event.target.value)}
            placeholder={`Write ${kind} title`}
            disabled={aiBusy}
            className="h-9 w-full border-0 border-b border-obra-neutral-300 bg-transparent px-0 text-xs text-obra-blue-950 outline-none focus:border-obra-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          disabled={item.locked || loadingKey !== null}
          onClick={() => onRegenerate(index)}
          className="size-8 p-0 flex items-center justify-center bg-transparent border-0 text-obra-neutral-400 hover:text-obra-blue-900 disabled:opacity-50"
          aria-label={`Regenerate ${kind} ${index + 1}`}
        >
          <RotateCw className={`size-4 stroke-[2.25] ${isLoading ? "animate-spin" : ""}`} aria-hidden />
        </button>
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => onToggleLock(index)}
          className={`size-8 p-0 flex items-center justify-center bg-transparent border-0 disabled:cursor-not-allowed disabled:opacity-50 ${
            item.locked ? "text-obra-blue-900" : "text-obra-neutral-400"
          }`}
          aria-label={`${item.locked ? "Unlock" : "Lock"} ${kind} ${index + 1}`}
        >
          {item.locked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export function StructureStepBonusBumpTitles({
  bonusItems,
  bumpItems,
  showBonus = true,
  showBump = true,
  loadingKey,
  message,
  bonusSectionLabel,
  bumpSectionLabel,
  regenerateAllLabel,
  onChangeBonusTitle,
  onChangeBumpTitle,
  onToggleBonusLock,
  onToggleBumpLock,
  onRegenerateBonus,
  onRegenerateBump,
  onRegenerateAllBonus,
  onRegenerateAllBump,
}: StructureStepBonusBumpTitlesProps) {
  return (
    <section
      data-testid={showBonus && !showBump ? "wizard-bonus-titles" : !showBonus && showBump ? "wizard-bump-titles" : undefined}
      className="space-y-6"
    >
      {showBonus ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-obra-blue-950">{bonusSectionLabel}</h3>
            <button
              type="button"
              onClick={onRegenerateAllBonus}
              disabled={loadingKey !== null}
              className="inline-flex items-center gap-2 text-sm text-obra-blue-900 hover:text-obra-blue-950 disabled:opacity-50"
            >
              <RotateCw className={`size-4 ${loadingKey === "bonus-all" ? "animate-spin" : ""}`} aria-hidden />
              {regenerateAllLabel}
            </button>
          </div>
          {bonusItems.map((item, index) =>
            sectionRow(
              item,
              index,
              "bonus",
              loadingKey,
              onChangeBonusTitle,
              onToggleBonusLock,
              onRegenerateBonus,
            ),
          )}
        </div>
      ) : null}

      {showBump ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-obra-blue-950">{bumpSectionLabel}</h3>
            <button
              type="button"
              onClick={onRegenerateAllBump}
              disabled={loadingKey !== null}
              className="inline-flex items-center gap-2 text-sm text-obra-blue-900 hover:text-obra-blue-950 disabled:opacity-50"
            >
              <RotateCw className={`size-4 ${loadingKey === "bump-all" ? "animate-spin" : ""}`} aria-hidden />
              {regenerateAllLabel}
            </button>
          </div>
          {bumpItems.map((item, index) =>
            sectionRow(
              item,
              index,
              "bump",
              loadingKey,
              onChangeBumpTitle,
              onToggleBumpLock,
              onRegenerateBump,
            ),
          )}
        </div>
      ) : null}

      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {message}
      </div>
    </section>
  );
}
