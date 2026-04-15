type Props = {
  chapterNumber: number;
  title: string;
};

export function LayoutChapterOpener({ chapterNumber, title }: Props) {
  return (
    <section
      className="preview-page preview-chapter-opener"
      aria-label={`Capítulo ${chapterNumber}: ${title}`}
    >
      <div
        className="preview-chapter-opener__accent"
        aria-hidden
        style={{ backgroundColor: "var(--preview-color-accent)" }}
      />
      <p className="preview-chapter-opener__number">
        {String(chapterNumber).padStart(2, "0")}
      </p>
      <h2 className="preview-chapter-opener__title">{title}</h2>
    </section>
  );
}
