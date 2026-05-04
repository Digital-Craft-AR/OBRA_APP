import { RotateCw } from "lucide-react";
import { ObraInput } from "@/components/obra/ObraInput";
import { TitleSuggestionCard } from "@/components/wizard/structure/TitleSuggestionCard";

type StructureStepDesignProps = {
  titleSuggestions: string[];
  selectedTitleIndex: number | null;
  customMainTitle: string;
  authorDraft: string;
  mainTitleError?: string;
  suggestionsLoading: boolean;
  saving: boolean;
  message: string | null;
  regenerateLabel: string;
  regenerateHint: string;
  customTitleLabel: string;
  customTitlePlaceholder: string;
  authorLabel: string;
  authorPlaceholder: string;
  suggestionsLoadingLabel: string;
  savingLabel: string;
  onSelectSuggestion: (index: number) => void;
  onRegenerate: () => void;
  onCustomTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
};

export function StructureStepDesign({
  titleSuggestions,
  selectedTitleIndex,
  customMainTitle,
  authorDraft,
  mainTitleError,
  suggestionsLoading,
  saving,
  message,
  regenerateLabel,
  regenerateHint,
  customTitleLabel,
  customTitlePlaceholder,
  authorLabel,
  authorPlaceholder,
  suggestionsLoadingLabel,
  savingLabel,
  onSelectSuggestion,
  onRegenerate,
  onCustomTitleChange,
  onAuthorChange,
}: StructureStepDesignProps) {
  const showSuggestionsError = !suggestionsLoading && titleSuggestions.length === 0 && !!message;

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        {suggestionsLoading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-card border border-obra-blue-100 bg-obra-neutral-100" />
              <div className="h-24 animate-pulse rounded-card border border-obra-blue-100 bg-obra-neutral-100" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-24 animate-pulse rounded-card border border-obra-blue-100 bg-obra-neutral-100" />
              <div className="h-24 animate-pulse rounded-card border border-obra-blue-100 bg-obra-neutral-100" />
              <div className="h-24 animate-pulse rounded-card border border-obra-blue-100 bg-obra-neutral-100" />
            </div>
          </>
        ) : showSuggestionsError ? (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {titleSuggestions.slice(0, 2).map((title, index) => (
                <TitleSuggestionCard
                  key={title}
                  title={title}
                  selected={selectedTitleIndex === index}
                  disabled={suggestionsLoading || saving}
                  onSelect={() => onSelectSuggestion(index)}
                  data-testid={`structure-title-suggestion-${index}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {titleSuggestions.slice(2).map((title, index) => {
                const realIndex = index + 2;
                return (
                  <TitleSuggestionCard
                    key={title}
                    title={title}
                    selected={selectedTitleIndex === realIndex}
                    disabled={suggestionsLoading || saving}
                    onSelect={() => onSelectSuggestion(realIndex)}
                    data-testid={`structure-title-suggestion-${realIndex}`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-medium text-obra-blue-700 hover:underline"
        disabled={suggestionsLoading}
        onClick={onRegenerate}
      >
        <RotateCw className={`size-4 ${suggestionsLoading ? "animate-spin" : ""}`} aria-hidden />
        {regenerateLabel}
      </button>
      <p className="text-xs text-obra-neutral-600">{regenerateHint}</p>

      <div className="space-y-4">
        <ObraInput
          id="wizard-main-title-custom"
          label={customTitleLabel}
          value={customMainTitle}
          onChange={(event) => onCustomTitleChange(event.target.value)}
          placeholder={customTitlePlaceholder}
          error={mainTitleError}
          disabled={suggestionsLoading || saving}
        />

        <ObraInput
          id="wizard-author"
          label={authorLabel}
          value={authorDraft}
          onChange={(event) => onAuthorChange(event.target.value)}
          placeholder={authorPlaceholder}
          disabled={suggestionsLoading || saving}
        />
      </div>

      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {saving ? savingLabel : suggestionsLoading ? suggestionsLoadingLabel : showSuggestionsError ? null : message}
      </div>
    </section>
  );
}
