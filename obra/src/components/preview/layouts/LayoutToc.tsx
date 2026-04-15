type TocEntry = { title: string; pageHint?: number };

type Props = {
  ebookTitle: string;
  entries: TocEntry[];
};

export function LayoutToc({ ebookTitle, entries }: Props) {
  return (
    <section className="preview-page preview-toc" aria-label="Table of contents">
      <h2 className="preview-toc__heading">Índice</h2>
      <p className="preview-toc__ebook-title">{ebookTitle}</p>
      <ol className="preview-toc__list">
        {entries.map((entry, idx) => (
          <li key={idx} className="preview-toc__entry">
            <span className="preview-toc__entry-title">{entry.title}</span>
            {entry.pageHint != null ? (
              <span className="preview-toc__entry-page">{entry.pageHint}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
