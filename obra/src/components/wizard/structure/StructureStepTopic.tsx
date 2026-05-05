import { ObraTextarea } from "@/components/obra/ObraTextarea";

type StructureStepTopicProps = {
  label: string;
  placeholder: string;
  assistLabel: string;
  hint?: string;
  value: string;
  error?: string;
  disabled: boolean;
  improving: boolean;
  saving: boolean;
  savingLabel: string;
  onChange: (value: string) => void;
  onAssist: () => void;
};

export function StructureStepTopic({
  label,
  placeholder,
  assistLabel,
  hint,
  value,
  error,
  disabled,
  improving,
  saving,
  savingLabel,
  onChange,
  onAssist,
}: StructureStepTopicProps) {
  return (
    <section className="space-y-3">
      <ObraTextarea
        id="wizard-topic"
        data-testid="wizard-topic"
        label={label}
        hint={hint}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        error={error}
        assisted
        onAssist={onAssist}
        assistLabel={assistLabel}
        aiStatus={improving ? "loading" : "idle"}
        disabled={disabled || improving}
      />
      <div className="flex items-center gap-3">
        {saving ? <span className="text-xs text-obra-neutral-600">{savingLabel}</span> : null}
      </div>
    </section>
  );
}
