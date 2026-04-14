import { useMemo } from "react";
import { resolveCanonicalLayoutId } from "@obra/layout-catalog";
import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import { LayoutCover } from "./layouts/LayoutCover";
import { LayoutToc } from "./layouts/LayoutToc";
import { LayoutChapterOpener } from "./layouts/LayoutChapterOpener";
import { LayoutBody } from "./layouts/LayoutBody";

export type EbookPreviewData = {
  id: string;
  title: string;
  type: "main" | "bonus" | "order_bump";
};

type Props = {
  ebook: EbookPreviewData;
  chapters: ChapterDraftRow[];
  designConfig: WizardDesignConfig;
  author: string | null;
  layoutPageAssignments: Record<string, string>;
  /** Cover image storage URL (resolved upstream, null until generated). */
  coverImageUrl?: string | null;
};

/**
 * Renders the full document for one deliverable (main ebook, bonus, or bump).
 *
 * CSS custom properties are injected on the root element from `designConfig`.
 * Layout components reference these vars; print CSS mirrors them for PDF output.
 */
export function PreviewDocument({
  ebook,
  chapters,
  designConfig,
  author,
  layoutPageAssignments,
  coverImageUrl,
}: Props) {
  const cssVars = useMemo<React.CSSProperties>(() => {
    const p = designConfig.palette;
    const f = designConfig.fonts;
    return {
      "--preview-color-primary": p.primary,
      "--preview-color-secondary": p.secondary,
      "--preview-color-accent": p.accent,
      "--preview-font-heading": `"${f.heading}", serif`,
      "--preview-font-body": `"${f.body}", sans-serif`,
    } as React.CSSProperties;
  }, [designConfig]);

  const printCss = useMemo(() => {
    const { size, orientation } = designConfig.page;
    const pageSize = size === "a4" ? "A4" : "letter";
    const pageOrientation = orientation === "landscape" ? " landscape" : "";
    return `@page { size: ${pageSize}${pageOrientation}; margin: 20mm; }`;
  }, [designConfig.page]);

  // Resolve body layout id for this ebook (stored per-project; per-ebook override not in MVP)
  const bodyLayoutId = useMemo(() => {
    const raw = layoutPageAssignments["main:body"] ?? null;
    return raw ? resolveCanonicalLayoutId(raw) : "layout_body_a";
  }, [layoutPageAssignments]);

  const tocEntries = useMemo(
    () => chapters.map((ch) => ({ title: ch.title })),
    [chapters],
  );

  return (
    <div
      className="preview-document"
      style={cssVars}
      data-layout-body={bodyLayoutId}
      data-ebook-id={ebook.id}
    >
      <style>{printCss}</style>

      <LayoutCover
        title={ebook.title}
        author={ebook.type === "main" ? author : null}
        designConfig={designConfig}
        coverImageUrl={coverImageUrl}
      />

      {chapters.length > 0 ? (
        <LayoutToc ebookTitle={ebook.title} entries={tocEntries} />
      ) : null}

      {chapters.map((chapter, idx) => (
        <div key={chapter.id} className="preview-chapter">
          <LayoutChapterOpener chapterNumber={idx + 1} title={chapter.title} />
          <LayoutBody
            chapterTitle={chapter.title}
            contentHtml={chapter.content}
          />
        </div>
      ))}
    </div>
  );
}
