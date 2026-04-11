import { describe, expect, it } from "vitest";
import {
  chapterHtmlEquals,
  isChapterHtmlEffectivelyEmpty,
  sanitizeChapterHtml,
} from "./sanitizeChapterHtml";

describe("sanitizeChapterHtml", () => {
  it("passes through safe allowed tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeChapterHtml(input)).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("removes script tags (XSS vector)", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeChapterHtml(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Hello</p>");
  });

  it("removes on* event attributes (inline event handlers)", () => {
    const input = '<p onclick="evil()">Click me</p>';
    const result = sanitizeChapterHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me");
  });

  it("removes iframe tags", () => {
    const input = '<p>Text</p><iframe src="https://evil.com"></iframe>';
    const result = sanitizeChapterHtml(input);
    expect(result).not.toContain("iframe");
    expect(result).toContain("<p>Text</p>");
  });

  it("removes javascript: href links", () => {
    const input = '<a href="javascript:evil()">link</a>';
    const result = sanitizeChapterHtml(input);
    // DOMPurify removes javascript: hrefs; the anchor may or may not remain
    expect(result).not.toContain("javascript:");
  });

  it("preserves allowed heading tags h2 and h3", () => {
    const input = "<h2>Title</h2><h3>Subtitle</h3>";
    expect(sanitizeChapterHtml(input)).toBe("<h2>Title</h2><h3>Subtitle</h3>");
  });

  it("removes disallowed heading tag h1", () => {
    const input = "<h1>Not allowed</h1><p>ok</p>";
    const result = sanitizeChapterHtml(input);
    expect(result).not.toContain("<h1");
    expect(result).toContain("Not allowed");
  });

  it("preserves allowed list tags", () => {
    const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    expect(sanitizeChapterHtml(input)).toBe("<ul><li>Item 1</li><li>Item 2</li></ul>");
  });

  it("preserves anchor with href, target, rel", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    const result = sanitizeChapterHtml(input);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("Link");
  });

  it("handles empty string", () => {
    expect(sanitizeChapterHtml("")).toBe("");
  });
});

describe("chapterHtmlEquals", () => {
  it("returns true for identical HTML", () => {
    expect(chapterHtmlEquals("<p>Hello</p>", "<p>Hello</p>")).toBe(true);
  });

  it("returns false for different content", () => {
    expect(chapterHtmlEquals("<p>Hello</p>", "<p>World</p>")).toBe(false);
  });

  it("normalizes both sides before comparing (strips same disallowed tags)", () => {
    const a = '<p>Text</p><script>x</script>';
    const b = "<p>Text</p>";
    // After sanitization, script is removed from a → both become <p>Text</p>
    expect(chapterHtmlEquals(a, b)).toBe(true);
  });
});

describe("isChapterHtmlEffectivelyEmpty", () => {
  it("returns true for empty string", () => {
    expect(isChapterHtmlEffectivelyEmpty("")).toBe(true);
  });

  it("returns true for empty paragraph", () => {
    expect(isChapterHtmlEffectivelyEmpty("<p></p>")).toBe(true);
  });

  it("returns true for paragraph with only whitespace", () => {
    expect(isChapterHtmlEffectivelyEmpty("<p>   </p>")).toBe(true);
  });

  it("returns true for only line breaks", () => {
    expect(isChapterHtmlEffectivelyEmpty("<p><br></p>")).toBe(true);
  });

  it("returns false when text content is present", () => {
    expect(isChapterHtmlEffectivelyEmpty("<p>Hello</p>")).toBe(false);
  });

  it("returns false for whitespace between tags that has visible text", () => {
    expect(isChapterHtmlEffectivelyEmpty("<p> x </p>")).toBe(false);
  });
});
