import { useEffect, useRef, useState } from "react";

type Props = {
  chapterTitle: string;
  /** Sanitized rich HTML from chapters.content */
  contentHtml: string | null;
  imageUrl?: string | null;
  /** 1-based page number shown bottom-right of the first page. Omit on cover, TOC, chapter openers. */
  pageNumber?: number;
  /**
   * Physical page dimensions in mm (already accounting for orientation).
   * Used by the ResizeObserver to compute where visual page-break lines fall.
   * When omitted the section is still rendered but no break lines are shown.
   */
  pageDimsMm?: { w: number; h: number };
};

/**
 * Renders the body content of one chapter.
 *
 * Unlike cover/TOC/chapter-opener pages, body sections are **not** clipped to
 * a single page height — chapter content can be arbitrarily long.  Visual
 * dashed lines are drawn at each page-boundary position so the creator can see
 * roughly where pages would break in the printed PDF.
 *
 * For the actual PDF (Puppeteer), pagination is handled by `@page` CSS and
 * `break-after: page` on `.preview-chapter`; the page-break divs are hidden
 * in print media via CSS.
 */
export function LayoutBody({ chapterTitle, contentHtml, imageUrl, pageNumber, pageDimsMm }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [breakPositions, setBreakPositions] = useState<number[]>([]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !pageDimsMm) {
      setBreakPositions([]);
      return;
    }

    function compute() {
      if (!el) return;
      const width = el.clientWidth;
      if (!width) return;
      // Page height at screen resolution = element width × (physical height / physical width)
      const pageHeight = Math.round(width * (pageDimsMm!.h / pageDimsMm!.w));
      if (pageHeight <= 0) return;
      const totalHeight = el.clientHeight;
      const breaks: number[] = [];
      for (let pos = pageHeight; pos < totalHeight; pos += pageHeight) {
        breaks.push(pos);
      }
      setBreakPositions(breaks);
    }

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageDimsMm]);

  return (
    <section ref={sectionRef} className="preview-page preview-body" aria-label={chapterTitle}>
      {imageUrl ? (
        <div className="preview-body__hero-slot">
          <img src={imageUrl} alt="" aria-hidden className="preview-body__hero-img" />
        </div>
      ) : null}
      {contentHtml ? (
        <div
          className="preview-body__content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <p className="preview-body__empty" aria-hidden>
          —
        </p>
      )}
      {pageNumber !== undefined ? (
        <span className="preview-page-number" aria-label={`Page ${pageNumber}`}>
          {pageNumber}
        </span>
      ) : null}
      {breakPositions.map((pos) => (
        <div
          key={pos}
          className="preview-page-break"
          aria-hidden
          style={{ top: pos }}
        />
      ))}
    </section>
  );
}
