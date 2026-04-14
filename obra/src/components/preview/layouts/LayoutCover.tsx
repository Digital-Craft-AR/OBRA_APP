import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";

type Props = {
  title: string;
  author: string | null;
  designConfig: WizardDesignConfig;
  coverImageUrl?: string | null;
};

export function LayoutCover({ title, author, coverImageUrl }: Props) {
  return (
    <section
      className="preview-page preview-cover"
      aria-label={title}
      style={{ backgroundColor: "var(--preview-color-primary)" }}
    >
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          aria-hidden
          className="preview-cover__art"
        />
      ) : (
        <div className="preview-cover__art-placeholder" aria-hidden />
      )}
      <div className="preview-cover__text">
        <h1 className="preview-cover__title">{title}</h1>
        {author ? <p className="preview-cover__author">{author}</p> : null}
      </div>
    </section>
  );
}
