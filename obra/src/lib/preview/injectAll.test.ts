import { describe, expect, it } from "vitest";
import { injectAll } from "./injectAll";

describe("injectAll", () => {
  it("escapes ampersands in signed image URLs so src attributes stay valid HTML", () => {
    const html = `<html><head></head><body>
      <ol class="obra-toc__list">{{TOC_ENTRIES}}</ol>
      <div class="obra-image-slot" data-slot-key="cover"></div>
    </body></html>`;
    const out = injectAll(html, {
      chapters: [{ sort_order: 1, title: "One", content: "<p>Hi</p>" }],
      images: { cover: "http://127.0.0.1/storage/v1/object/sign/bucket/x?token=abc&sig=1" },
    });
    expect(out).toContain('src="http://127.0.0.1/storage/v1/object/sign/bucket/x?token=abc&amp;sig=1"');
  });
});
