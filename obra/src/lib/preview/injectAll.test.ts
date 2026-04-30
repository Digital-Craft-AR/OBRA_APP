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

  it("injects chapter image into chapter-N-image-1 slot (current format)", () => {
    const html = `<html><head></head><body>
      <div class="obra-image-slot obra-image-slot--chapter" data-slot-key="chapter-1-image-1"></div>
    </body></html>`;
    const out = injectAll(html, {
      images: { "chapter-1-image-1": "https://cdn/chapter1.jpg" },
    });
    expect(out).toContain('src="https://cdn/chapter1.jpg"');
  });

  it("injects chapter image into legacy chapter-N-img slot (old prompt format)", () => {
    const html = `<html><head></head><body>
      <div class="obra-image-slot obra-image-slot--chapter" data-slot-key="chapter-2-img"></div>
    </body></html>`;
    const out = injectAll(html, {
      images: { "chapter-2-img": "https://cdn/chapter2.jpg" },
    });
    expect(out).toContain('src="https://cdn/chapter2.jpg"');
  });

  it("does not inject into a chapter slot when no matching image key is provided", () => {
    const html = `<html><head></head><body>
      <div class="obra-image-slot obra-image-slot--chapter" data-slot-key="chapter-1-image-1"></div>
    </body></html>`;
    const out = injectAll(html, {
      images: { "chapter-2-image-1": "https://cdn/wrong-chapter.jpg" },
    });
    expect(out).not.toContain("<img");
  });
});
