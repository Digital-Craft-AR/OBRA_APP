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
      className={`rounded-card border p-4 text-left transition-all ${
        selected
          ? "border-obra-blue-700 bg-obra-blue-50"
          : "border-obra-blue-100 bg-white hover:border-obra-blue-700/50"
      }`}
    >
      <div className="flex items-start gap-2">
        {selected ? <Check className="mt-0.5 size-4 shrink-0 text-obra-blue-700" /> : null}
        <span className="text-sm text-obra-blue-950">{title}</span>
      </div>
    </button>
  );
}
