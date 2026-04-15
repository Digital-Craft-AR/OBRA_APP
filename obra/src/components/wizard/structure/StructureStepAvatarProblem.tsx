import { useTranslation } from "react-i18next";
import { ObraTextarea } from "@/components/obra/ObraTextarea";
import { CONTENT_TONE_KEYS, type ContentTone } from "@/lib/wizard/structureTypes";

type StructureStepAvatarProblemProps = {
  avatarLabel: string;
  avatarPlaceholder: string;
  avatarHint?: string;
  avatarValue: string;
  avatarError?: string;
  avatarImproving: boolean;
  problemLabel: string;
  problemPlaceholder: string;
  problemHint?: string;
  problemValue: string;
  problemError?: string;
  problemImproving: boolean;
  assistLabel: string;
  disabled: boolean;
  saving: boolean;
  savingLabel: string;
  footerMessage: string | null;
  contentTone: ContentTone;
  onContentToneChange: (tone: ContentTone) => void;
  onAvatarChange: (value: string) => void;
  onProblemChange: (value: string) => void;
  onImproveAvatar: () => void;
  onImproveProblem: () => void;
};

export function StructureStepAvatarProblem({
  avatarLabel,
  avatarPlaceholder,
  avatarHint,
  avatarValue,
  avatarError,
  avatarImproving,
  problemLabel,
  problemPlaceholder,
  problemHint,
  problemValue,
  problemError,
  problemImproving,
  assistLabel,
  disabled,
  saving,
  savingLabel,
  footerMessage,
  contentTone,
  onContentToneChange,
  onAvatarChange,
  onProblemChange,
  onImproveAvatar,
  onImproveProblem,
}: StructureStepAvatarProblemProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <ObraTextarea
        id="wizard-avatar"
        label={avatarLabel}
        hint={avatarHint}
        value={avatarValue}
        onChange={(event) => onAvatarChange(event.target.value)}
        placeholder={avatarPlaceholder}
        error={avatarError}
        assisted
        onAssist={onImproveAvatar}
        assistLabel={assistLabel}
        aiStatus={avatarImproving ? "loading" : "idle"}
        disabled={disabled || avatarImproving || problemImproving}
      />
      <ObraTextarea
        id="wizard-problem"
        label={problemLabel}
        hint={problemHint}
        value={problemValue}
        onChange={(event) => onProblemChange(event.target.value)}
        placeholder={problemPlaceholder}
        error={problemError}
        assisted
        onAssist={onImproveProblem}
        assistLabel={assistLabel}
        aiStatus={problemImproving ? "loading" : "idle"}
        disabled={disabled || avatarImproving || problemImproving}
      />

      <div className="flex flex-col gap-4 pt-1">
        <h3 className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.structure.avatarProblem.contentTone.title")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TONE_KEYS.map((toneKey) => {
            const selected = contentTone === toneKey;
            return (
              <button
                key={toneKey}
                type="button"
                disabled={disabled || avatarImproving || problemImproving}
                onClick={() => onContentToneChange(toneKey)}
                className={`min-h-[40px] min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors sm:basis-[calc(33.333%-0.25rem)] ${
                  selected
                    ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700"
                    : "border-obra-neutral-200 bg-white text-obra-neutral-600"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {t(`wizard.structure.avatarProblem.contentTone.${toneKey}`)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-obra-neutral-600">{t("wizard.structure.avatarProblem.contentTone.helper")}</p>
      </div>

      {saving ? <span className="text-xs text-obra-neutral-600">{savingLabel}</span> : null}
      {footerMessage ? (
        <div aria-live="polite" className="text-xs text-obra-neutral-600">
          {footerMessage}
        </div>
      ) : null}
    </section>
  );
}
