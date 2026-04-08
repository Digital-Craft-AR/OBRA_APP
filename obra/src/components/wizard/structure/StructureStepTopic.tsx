import { ObraTextarea } from "@/components/obra/ObraTextarea";

type StructureStepTopicProps = {
  label: string;
  placeholder: string;
  assistLabel: string;
  value: string;
  error?: string;
  disabled: boolean;
  improving: boolean;
  saving: boolean;
  savingLabel: string;
  message: string | null;
  onChange: (value: string) => void;
  onAssist: () => void;
};

export function StructureStepTopic({
  label,
  placeholder,
  assistLabel,
  value,
  error,
  disabled,
  improving,
  saving,
  savingLabel,
  message,
  onChange,
  onAssist,
}: StructureStepTopicProps) {
  return (
    <section className="space-y-3">
      <ObraTextarea
        id="wizard-topic"
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        error={error}
        assisted
        onAssist={onAssist}
        assistLabel={assistLabel}
        aiStatus={improving ? "loading" : "idle"}
        disabled={disabled}
      />
      <div className="flex items-center gap-3">
        {saving ? <span className="text-xs text-obra-neutral-600">{savingLabel}</span> : null}
      </div>
      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {message}
      </div>
    </section>
  );
}
