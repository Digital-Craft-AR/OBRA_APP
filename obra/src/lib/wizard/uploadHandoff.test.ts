import { describe, expect, it } from "vitest";
import { buildPackageTocRowsForUploadHandoff, plainTextToChapterHtml } from "@/lib/wizard/uploadHandoff";

describe("plainTextToChapterHtml", () => {
  it("wraps plain lines in paragraphs and escapes HTML", () => {
    expect(plainTextToChapterHtml("Hello")).toBe("<p>Hello</p>");
    expect(plainTextToChapterHtml("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
  });

  it("uses blank lines as paragraph boundaries and preserves single newlines as br", () => {
    expect(plainTextToChapterHtml("a\nb\n\nc")).toBe("<p>a<br />b</p><p>c</p>");
  });

  it("returns empty paragraph for whitespace-only input", () => {
    expect(plainTextToChapterHtml("   \n\t  ")).toBe("<p></p>");
  });
});

describe("buildPackageTocRowsForUploadHandoff", () => {
  it("uses project bonus title when present", () => {
    const rows = buildPackageTocRowsForUploadHandoff(
      { kind: "bonus", index: 0 },
      undefined,
      { bonus_items: [{ title: "  Lead magnet  " }], bump_items: [] },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Lead magnet");
  });

  it("falls back to bump-derived chapter titles when current rows are empty", () => {
    const rows = buildPackageTocRowsForUploadHandoff(
      { kind: "bump", index: 0 },
      [],
      { bonus_items: [], bump_items: [{ title: "Fast track" }] },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.title.startsWith("Fast track")).toBe(true);
  });
});
