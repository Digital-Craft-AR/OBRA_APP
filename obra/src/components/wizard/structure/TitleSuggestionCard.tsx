import { Check } from "lucide-react";

type TitleSuggestionCardProps = {
  title: string;
  selected: boolean;
  onSelect: () => void;
};

export function TitleSuggestionCard({ title, selected, onSelect }: TitleSuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-card border p-4 text-left transition-colors ${
        selected
          ? "border-obra-blue-700 bg-obra-blue-50"
          : "border-obra-neutral-200 bg-white hover:border-obra-blue-700/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-obra-blue-950">{title}</span>
        {selected ? (
          <Check className="mt-0.5 size-4 shrink-0 text-obra-blue-700" aria-hidden />
        ) : (
          <span className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
      </div>
    </button>
  );
}
