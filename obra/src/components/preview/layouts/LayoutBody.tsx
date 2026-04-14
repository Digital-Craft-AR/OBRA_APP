type Props = {
  chapterTitle: string;
  /** Sanitized rich HTML from chapters.content */
  contentHtml: string | null;
  imageUrl?: string | null;
};

export function LayoutBody({ chapterTitle, contentHtml, imageUrl }: Props) {
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
    </section>
  );
}
