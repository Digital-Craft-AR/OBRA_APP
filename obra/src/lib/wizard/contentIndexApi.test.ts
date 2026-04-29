import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {},
}));

import {
  buildChapterInsertsPreservingContent,
  MAIN_TOC_MAX_CHAPTERS,
  MAIN_TOC_MIN_CHAPTERS,
  validateMainTocForConfirm,
} from "@/lib/wizard/contentIndexApi";

describe("buildChapterInsertsPreservingContent", () => {
  const ebookId = "ebook-1";

  it("preserves content and approved_at for chapters that remain by id", () => {
    const existing = [
      { id: "ch-1", title: "Old title 1", sort_order: 1, content: "<p>Body 1</p>", approved_at: "2026-01-01T00:00:00Z" },
      { id: "ch-2", title: "Old title 2", sort_order: 2, content: "<p>Body 2</p>", approved_at: null },
    ];
    const rows = [
      { id: "ch-1", title: "New title 1" },
      { id: "ch-2", title: "New title 2" },
    ];
    const inserts = buildChapterInsertsPreservingContent(ebookId, rows, existing);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({ sort_order: 1, title: "New title 1", content: "<p>Body 1</p>", approved_at: "2026-01-01T00:00:00Z" });
    expect(inserts[1]).toMatchObject({ sort_order: 2, title: "New title 2", content: "<p>Body 2</p>", approved_at: null });
  });

  it("assigns null content for newly added chapters (local id not in DB)", () => {
    const existing = [
      { id: "ch-1", title: "Chapter 1", sort_order: 1, content: "<p>Body</p>", approved_at: null },
    ];
    const rows = [
      { id: "ch-1", title: "Chapter 1" },
      { id: "local-uuid-new", title: "Brand new chapter" },
    ];
    const inserts = buildChapterInsertsPreservingContent(ebookId, rows, existing);
    expect(inserts[0]).toMatchObject({ content: "<p>Body</p>" });
    expect(inserts[1]).toMatchObject({ content: null, approved_at: null, title: "Brand new chapter" });
  });

  it("assigns correct sort_order regardless of original position", () => {
    const existing = [
      { id: "ch-1", title: "A", sort_order: 1, content: null, approved_at: null },
      { id: "ch-2", title: "B", sort_order: 2, content: null, approved_at: null },
      { id: "ch-3", title: "C", sort_order: 3, content: null, approved_at: null },
    ];
    // User reordered: ch-3, ch-1, ch-2
    const rows = [
      { id: "ch-3", title: "C" },
      { id: "ch-1", title: "A" },
      { id: "ch-2", title: "B" },
    ];
    const inserts = buildChapterInsertsPreservingContent(ebookId, rows, existing);
    expect(inserts.map((r) => r.sort_order)).toEqual([1, 2, 3]);
    expect(inserts.map((r) => r.title)).toEqual(["C", "A", "B"]);
  });

  it("returns empty array when rows is empty", () => {
    const existing = [{ id: "ch-1", title: "Chapter 1", sort_order: 1, content: "<p>x</p>", approved_at: null }];
    expect(buildChapterInsertsPreservingContent(ebookId, [], existing)).toEqual([]);
  });

  it("trims whitespace from titles and substitutes a space for blank titles", () => {
    const rows = [{ id: "local-1", title: "  " }, { id: "local-2", title: "  Real  " }];
    const inserts = buildChapterInsertsPreservingContent(ebookId, rows, []);
    expect(inserts[0].title).toBe(" ");
    expect(inserts[1].title).toBe("Real");
  });

  it("sets ebook_id on every insert", () => {
    const rows = [{ id: "ch-1", title: "Ch" }];
    const inserts = buildChapterInsertsPreservingContent("my-ebook", rows, []);
    expect(inserts[0].ebook_id).toBe("my-ebook");
  });
});

describe("validateMainTocForConfirm", () => {
  it("accepts non-empty titles within bounds", () => {
    expect(validateMainTocForConfirm([{ title: "A" }, { title: "B" }])).toBe("ok");
  });

  it("rejects empty titles", () => {
    expect(validateMainTocForConfirm([{ title: "   " }])).toBe("empty_title");
    expect(validateMainTocForConfirm([{ title: "Ok" }, { title: "" }])).toBe("empty_title");
  });

  it("rejects too few chapters", () => {
    expect(validateMainTocForConfirm([])).toBe("too_few");
  });

  it("rejects too many chapters", () => {
    const rows = Array.from({ length: MAIN_TOC_MAX_CHAPTERS + 1 }, (_, i) => ({
      title: `C${i}`,
    }));
    expect(validateMainTocForConfirm(rows)).toBe("too_many");
    expect(MAIN_TOC_MIN_CHAPTERS).toBeGreaterThanOrEqual(1);
  });
});
