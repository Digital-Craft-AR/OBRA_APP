import { RotateCw } from "lucide-react";
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
  confirmBonusAriaLabel: string;
  confirmBumpAriaLabel: string;
  onChangeBonusTitle: (index: number, title: string) => void;
  onChangeBumpTitle: (index: number, title: string) => void;
  onBlurBonusTitle: (index: number) => void;
  onBlurBumpTitle: (index: number) => void;
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
  confirmAriaLabel: string,
  onChangeTitle: (index: number, title: string) => void,
  onBlurTitle: (index: number) => void,
  onToggleLock: (index: number) => void,
  onRegenerate: (index: number) => void,
) {
  const key = `${kind}-${index}`;
  const checkboxTestId = `${kind}-title-checkbox-${index}`;
  const isLoading = loadingKey === key;
  const aiBusy = loadingKey !== null;
  return (
    <div key={key} data-testid={`${kind}-title-row-${index}`} className="rounded-card bg-obra-neutral-100 px-4 py-3">
      <div className="flex items-center gap-3 text-xs">
        <input
          type="checkbox"
          data-testid={checkboxTestId}
          checked={item.locked}
          onChange={() => onToggleLock(index)}
          disabled={aiBusy}
          aria-label={`${confirmAriaLabel} ${index + 1}`}
          className="size-4 accent-obra-blue-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="min-w-[72px] text-xs font-medium text-obra-neutral-600">
          {kind === "bonus" ? "Bonus" : "Bump"} {index + 1}
        </div>

        <div className="flex-1">
          <input
            id={`${kind}-title-${index}`}
            data-testid={`${kind}-title-input-${index}`}
            value={item.title}
            onChange={(event) => onChangeTitle(index, event.target.value)}
            onBlur={(event) => {
              // Don't auto-check if AI is generating or if focus moved to the same-row
              // checkbox (the toggle will handle the state transition instead).
              const relatedTarget = event.relatedTarget as HTMLElement | null;
              if (aiBusy || relatedTarget?.dataset.testid === checkboxTestId) return;
              onBlurTitle(index);
            }}
            placeholder={`Write ${kind} title`}
            disabled={aiBusy}
            className="h-9 w-full border-0 border-b border-obra-neutral-300 bg-transparent px-0 text-xs text-obra-blue-950 outline-none focus:border-obra-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          data-testid={`${kind}-title-regen-${index}`}
          disabled={loadingKey !== null}
          onClick={() => onRegenerate(index)}
          className="size-8 p-0 flex items-center justify-center bg-transparent border-0 text-obra-neutral-400 hover:text-obra-blue-900 disabled:opacity-50"
          aria-label={`Regenerate ${kind} ${index + 1}`}
        >
          <RotateCw className={`size-4 stroke-[2.25] ${isLoading ? "animate-spin" : ""}`} aria-hidden />
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
  confirmBonusAriaLabel,
  confirmBumpAriaLabel,
  onChangeBonusTitle,
  onChangeBumpTitle,
  onBlurBonusTitle,
  onBlurBumpTitle,
  onToggleBonusLock,
  onToggleBumpLock,
  onRegenerateBonus,
  onRegenerateBump,
  onRegenerateAllBonus,
  onRegenerateAllBump,
}: StructureStepBonusBumpTitlesProps) {
  const allBonusLocked = showBonus && bonusItems.length > 0 && bonusItems.every((item) => item.locked);
  const allBumpLocked = showBump && bumpItems.length > 0 && bumpItems.every((item) => item.locked);

  return (
    <section className="space-y-6">
      {showBonus ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-obra-blue-950">{bonusSectionLabel}</h3>
            <button
              type="button"
              data-testid="bonus-regen-all-btn"
              onClick={onRegenerateAllBonus}
              disabled={loadingKey !== null || allBonusLocked}
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
              confirmBonusAriaLabel,
              onChangeBonusTitle,
              onBlurBonusTitle,
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
              data-testid="bump-regen-all-btn"
              onClick={onRegenerateAllBump}
              disabled={loadingKey !== null || allBumpLocked}
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
              confirmBumpAriaLabel,
              onChangeBumpTitle,
              onBlurBumpTitle,
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
