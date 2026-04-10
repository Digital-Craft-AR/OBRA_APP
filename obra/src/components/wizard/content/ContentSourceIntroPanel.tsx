import type { TFunction } from "i18next";
import type { ContentSource } from "@/lib/projects";
import { ContentSourceCards } from "@/components/wizard/content/ContentSourceCards";

type Props = {
  t: TFunction;
  contentSource: ContentSource;
};

/**
 * First inner step of Content: recap the two-card choice (AI vs upload) from project creation,
 * before manuscript or package TOC work.
 */
export function ContentSourceIntroPanel({ t, contentSource }: Props) {
  return (
    <div className="rounded-card border border-obra-blue-100 bg-white px-4 py-6 shadow-sm">
      <header className="mb-4 space-y-1">
        <h2 className="font-display text-lg text-obra-blue-950">{t("wizard.content.sourceIntro.title")}</h2>
        <p className="text-sm text-obra-neutral-600">{t("wizard.content.sourceIntro.subtitle")}</p>
      </header>
      <ContentSourceCards t={t} value={contentSource} variant="readonly" />
    </div>
  );
}
