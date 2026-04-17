import { useMemo } from "react";
import { resolveCanonicalLayoutId } from "@obra/layout-catalog";
import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
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
 * ## Design system
 * CSS custom properties (`--preview-color-*`, `--preview-font-*`) are injected
 * inline from `designConfig.palette` and `designConfig.fonts`. All layout
 * components reference these vars — no hard-coded colors.
 *
 * ## Print / PDF pagination assumptions (see #63, #65)
 * - `@page` rule sets paper size + margin from `designConfig.page`.
 * - Each `.preview-page` has `break-after: page` so Puppeteer inserts page
 *   breaks between layout sections.
 * - Margin: 20mm on all sides (MVP; no bleed/crop marks in v1.0).
 * - Font rendering: Puppeteer must run with `--font-render-hinting=none` and
 *   the project fonts loaded via the same Google Fonts URL injected here.
 *   The PDF Edge Function mirrors this `@page` CSS at render time.
 */
export function PreviewDocument({
  ebook,
  chapters,
  designConfig,
  author,
  layoutPageAssignments,
  coverImageUrl,
}: Props) {
  // Load project fonts if they differ from the base app fonts already in index.html
  const fontFamilies = useMemo(
    () => [designConfig.fonts.heading, designConfig.fonts.body] as const,
    [designConfig.fonts.heading, designConfig.fonts.body],
  );
  useGoogleFonts(fontFamilies);

  // Physical page dimensions in mm (orientation-adjusted).
  // Shared between CSS vars injection and the LayoutBody page-break computation.
  const pageDimsMm = useMemo(() => {
    const { size, orientation } = designConfig.page;
    const base = size === "letter" ? { w: 215.9, h: 279.4 } : { w: 210, h: 297 };
    return orientation === "landscape"
      ? { w: base.h, h: base.w }
      : base;
  }, [designConfig.page]);

  const cssVars = useMemo<React.CSSProperties>(() => {
    const p = designConfig.palette;
    const f = designConfig.fonts;
    const { w, h } = pageDimsMm;

    return {
      "--preview-color-primary": p.primary,
      "--preview-color-secondary": p.secondary,
      "--preview-color-accent": p.accent,
      "--preview-font-heading": `"${f.heading}", serif`,
      "--preview-font-body": `"${f.body}", sans-serif`,
      "--preview-page-aspect-ratio": `${w} / ${h}`,
    } as React.CSSProperties;
  }, [designConfig, pageDimsMm]);

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
        <div key={chapter.id} id={`chapter-${chapter.id}`} className="preview-chapter">
          <LayoutChapterOpener chapterNumber={idx + 1} title={chapter.title} />
          <LayoutBody
            chapterTitle={chapter.title}
            contentHtml={chapter.content}
            pageNumber={idx + 1}
            pageDimsMm={pageDimsMm}
          />
        </div>
      ))}
    </div>
  );
}
