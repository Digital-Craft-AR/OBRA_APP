import DOMPurify from "dompurify";

/**
 * Sanitizes user- or model-produced HTML before persisting or comparing.
 * Call from the client (uses browser DOM APIs).
 */
export function sanitizeChapterHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "a",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "blockquote",
      "code",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

function textContentFromHtml(html: string): string {
  const safe = sanitizeChapterHtml(html);
  if (typeof document === "undefined") {
    return safe.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = safe;
  return el.textContent ?? "";
}

/** Compare stored vs editor HTML after normalization (whitespace / attribute order). */
export function chapterHtmlEquals(a: string, b: string): boolean {
  return sanitizeChapterHtml(a) === sanitizeChapterHtml(b);
}

/** True when there is no visible text (empty editor, empty paragraphs, etc.). */
export function isChapterHtmlEffectivelyEmpty(html: string): boolean {
  return textContentFromHtml(html).replace(/\s/g, "").length === 0;
}
