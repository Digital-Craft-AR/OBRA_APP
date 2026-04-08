import { ObraTextarea } from "@/components/obra/ObraTextarea";

type StructureStepAvatarProblemProps = {
  avatarLabel: string;
  avatarPlaceholder: string;
  avatarValue: string;
  avatarError?: string;
  avatarImproving: boolean;
  problemLabel: string;
  problemPlaceholder: string;
  problemValue: string;
  problemError?: string;
  problemImproving: boolean;
  assistLabel: string;
  disabled: boolean;
  saving: boolean;
  savingLabel: string;
  message: string | null;
  onAvatarChange: (value: string) => void;
  onProblemChange: (value: string) => void;
  onImproveAvatar: () => void;
  onImproveProblem: () => void;
};

export function StructureStepAvatarProblem({
  avatarLabel,
  avatarPlaceholder,
  avatarValue,
  avatarError,
  avatarImproving,
  problemLabel,
  problemPlaceholder,
  problemValue,
  problemError,
  problemImproving,
  assistLabel,
  disabled,
  saving,
  savingLabel,
  message,
  onAvatarChange,
  onProblemChange,
  onImproveAvatar,
  onImproveProblem,
}: StructureStepAvatarProblemProps) {
  return (
    <section className="space-y-4">
      <ObraTextarea
        id="wizard-avatar"
        label={avatarLabel}
        value={avatarValue}
        onChange={(event) => onAvatarChange(event.target.value)}
        placeholder={avatarPlaceholder}
        error={avatarError}
        assisted
        onAssist={onImproveAvatar}
        assistLabel={assistLabel}
        aiStatus={avatarImproving ? "loading" : "idle"}
        disabled={disabled}
      />
      <ObraTextarea
        id="wizard-problem"
        label={problemLabel}
        value={problemValue}
        onChange={(event) => onProblemChange(event.target.value)}
        placeholder={problemPlaceholder}
        error={problemError}
        assisted
        onAssist={onImproveProblem}
        assistLabel={assistLabel}
        aiStatus={problemImproving ? "loading" : "idle"}
        disabled={disabled}
      />
      {saving ? <span className="text-xs text-obra-neutral-600">{savingLabel}</span> : null}
      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {message}
      </div>
    </section>
  );
}
