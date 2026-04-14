type Props = {
  chapterTitle: string;
  /** Sanitized rich HTML from chapters.content */
  contentHtml: string | null;
  imageUrl?: string | null;
  /** 1-based page number shown bottom-right. Omit on cover, TOC, chapter openers. */
  pageNumber?: number;
};

export function LayoutBody({ chapterTitle, contentHtml, imageUrl, pageNumber }: Props) {
  return (
    <section className="preview-page preview-body" aria-label={chapterTitle}>
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
    </section>
  );
}
