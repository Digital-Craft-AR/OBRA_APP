import type { TFunction } from "i18next";
import type { ContentSource } from "@/lib/projects";
import { ContentSourceCards } from "@/components/wizard/content/ContentSourceCards";

type Props = {
  t: TFunction;
  contentSource: ContentSource;
  /** When set, cards are real buttons and this runs after the user picks IA vs upload (may persist to the server). */
  onSelectSource?: (source: ContentSource) => void | Promise<void>;
  selectDisabled?: boolean;
};

/**
 * First inner step of Content: confirm or change the two-card choice (AI vs upload),
 * before manuscript or package TOC work.
 */
export function ContentSourceIntroPanel({ t, contentSource, onSelectSource, selectDisabled }: Props) {
  const interactive = Boolean(onSelectSource);
  return (
    <div className="rounded-card border border-obra-blue-100 bg-white px-5 py-8 shadow-sm">
      <header className="mb-6 space-y-2">
        <h2 className="font-display text-2xl text-obra-blue-950">{t("wizard.create.sourceChoice.title")}</h2>
        <p className="text-sm text-obra-neutral-600">{t("wizard.content.sourceIntro.subtitle")}</p>
      </header>
      <ContentSourceCards
        t={t}
        value={contentSource}
        variant={interactive ? "select" : "readonly"}
        onSelect={onSelectSource}
        disabled={selectDisabled}
      />
    </div>
  );
}
