import type { TocChapterRow } from "@/lib/wizard/tocTypes";
import type { ContentPackageNavTarget } from "@/lib/wizard/contentNav";

function newRowId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 11)}`;
}

function escapeHtmlText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Converts normalized plain text into a minimal HTML fragment for `chapters.content`.
 * Paragraphs are split on blank lines; single newlines become `<br />` within a paragraph.
 */
export function plainTextToChapterHtml(plain: string): string {
  const normalized = plain.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").trim();
  if (!normalized.length) return "<p></p>";

  const blocks = normalized.split(/\n{2,}/);
  const parts: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const inner = lines
      .map((line) => escapeHtmlText(line))
      .join("<br />");
    parts.push(`<p>${inner || "<br />"}</p>`);
  }
  return parts.join("");
}

export type ProjectPackageTitles = {
  bonus_items: Array<{ title?: string | null }>;
  bump_items: Array<{ title?: string | null }>;
};

/**
 * Builds non-empty package TOC rows for upload handoff when the user has not visited the index UI yet.
 */
export function buildPackageTocRowsForUploadHandoff(
  target: Exclude<ContentPackageNavTarget, { kind: "main" }>,
  current: TocChapterRow[] | undefined,
  project: ProjectPackageTitles,
): TocChapterRow[] {
  if (target.kind === "bonus") {
    const title =
      project.bonus_items[target.index]?.title?.trim() ||
      `Bonus ${target.index + 1}`;
    return [{ id: newRowId(), title }];
  }

  const bumpTitle = project.bump_items[target.index]?.title?.trim() || `Bump ${target.index + 1}`;
  if (current?.length) {
    const cleaned = current.map((r) => ({ ...r, title: r.title.trim() || bumpTitle }));
    if (cleaned.every((r) => r.title.length > 0)) return cleaned;
  }

  return [
    { id: newRowId(), title: `${bumpTitle} — 1` },
    { id: newRowId(), title: `${bumpTitle} — 2` },
  ];
}
