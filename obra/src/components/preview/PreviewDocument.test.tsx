import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";
import { PreviewDocument } from "./PreviewDocument";

// Mock Google Fonts hook — no external network calls in tests
vi.mock("@/hooks/useGoogleFonts", () => ({
  useGoogleFonts: vi.fn(),
}));

// Mock layout-catalog resolver — always returns the same layout id
vi.mock("@obra/layout-catalog", () => ({
  resolveCanonicalLayoutId: (id: string) => id,
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseDesignConfig = {
  chapterCount: 6 as const,
  contentTone: "friendly" as const,
  paletteMode: "preset" as const,
  palettePresetId: "oceanic",
  palette: { primary: "#204970", secondary: "#e8f0f7", accent: "#c8e62b" },
  typographyMode: "preset" as const,
  typographyPresetId: "oceanic" as const,
  fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" },
  page: { size: "a4" as const, orientation: "portrait" as const },
  image: { mode: "ai" as const, style: "illustration" },
} as const satisfies WizardDesignConfig;

const baseEbook = {
  id: "ebook-main",
  title: "My Ebook",
  type: "main" as const,
};

const makeChapter = (id: string, idx: number) => ({
  id,
  title: `Chapter ${idx + 1}`,
  sort_order: idx + 1,
  content: `<p>Content ${idx + 1}</p>`,
  approved_at: null,
});

const baseLayoutPageAssignments = {
  "main:cover": "layout_cover_v1",
  "main:body": "layout_body_a",
};

function renderDoc(overrides?: Partial<Parameters<typeof PreviewDocument>[0]>) {
  const props = {
    ebook: baseEbook,
    chapters: [makeChapter("ch-1", 0), makeChapter("ch-2", 1), makeChapter("ch-3", 2)],
    designConfig: baseDesignConfig,
    author: "Ana García",
    layoutPageAssignments: baseLayoutPageAssignments,
    coverImageUrl: null,
    ...overrides,
  };
  return render(<PreviewDocument {...props} />);
}

// ---------------------------------------------------------------------------
// CSS custom properties injection
// ---------------------------------------------------------------------------

describe("PreviewDocument — CSS variables", () => {
  it("injects palette colors as CSS custom properties on root", () => {
    const { container } = renderDoc();
    const root = container.querySelector(".preview-document") as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue("--preview-color-primary")).toBe("#204970");
    expect(root.style.getPropertyValue("--preview-color-secondary")).toBe("#e8f0f7");
    expect(root.style.getPropertyValue("--preview-color-accent")).toBe("#c8e62b");
  });

  it("injects font family CSS vars on root", () => {
    const { container } = renderDoc();
    const root = container.querySelector(".preview-document") as HTMLElement;
    expect(root.style.getPropertyValue("--preview-font-heading")).toContain("Fraunces");
    expect(root.style.getPropertyValue("--preview-font-body")).toContain("Plus Jakarta Sans");
  });

  it("injects A4 portrait aspect ratio (210 / 297)", () => {
    const { container } = renderDoc();
    const root = container.querySelector(".preview-document") as HTMLElement;
    expect(root.style.getPropertyValue("--preview-page-aspect-ratio")).toBe("210 / 297");
  });

  it("injects landscape aspect ratio when orientation is landscape", () => {
    const { container } = renderDoc({
      designConfig: {
        ...baseDesignConfig,
        page: { size: "a4", orientation: "landscape" },
      },
    });
    const root = container.querySelector(".preview-document") as HTMLElement;
    expect(root.style.getPropertyValue("--preview-page-aspect-ratio")).toBe("297 / 210");
  });

  it("injects letter aspect ratio (215.9 / 279.4)", () => {
    const { container } = renderDoc({
      designConfig: {
        ...baseDesignConfig,
        page: { size: "letter", orientation: "portrait" },
      },
    });
    const root = container.querySelector(".preview-document") as HTMLElement;
    expect(root.style.getPropertyValue("--preview-page-aspect-ratio")).toBe("215.9 / 279.4");
  });
});

// ---------------------------------------------------------------------------
// Print CSS
// ---------------------------------------------------------------------------

describe("PreviewDocument — print CSS", () => {
  it("includes A4 @page rule for a4 portrait", () => {
    const { container } = renderDoc();
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("@page");
    expect(style?.textContent).toContain("A4");
    expect(style?.textContent).not.toContain("landscape");
  });

  it("includes landscape in @page rule for landscape orientation", () => {
    const { container } = renderDoc({
      designConfig: {
        ...baseDesignConfig,
        page: { size: "a4", orientation: "landscape" },
      },
    });
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("landscape");
  });

  it("uses 'letter' in @page rule for letter size", () => {
    const { container } = renderDoc({
      designConfig: {
        ...baseDesignConfig,
        page: { size: "letter", orientation: "portrait" },
      },
    });
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("letter");
  });
});

// ---------------------------------------------------------------------------
// Page numbers — body pages receive numbers, others do not
// ---------------------------------------------------------------------------

describe("PreviewDocument — page numbers", () => {
  it("renders a page number on each body page", () => {
    renderDoc();
    // 3 chapters → 3 body pages, each should have a page number span
    const pageNumbers = screen.getAllByLabelText(/^Page \d+/);
    expect(pageNumbers).toHaveLength(3);
  });

  it("page numbers are 1-based and sequential", () => {
    renderDoc();
    const pageNumbers = screen.getAllByLabelText(/^Page \d+/);
    expect(pageNumbers[0].textContent).toBe("1");
    expect(pageNumbers[1].textContent).toBe("2");
    expect(pageNumbers[2].textContent).toBe("3");
  });

  it("does NOT render page number on the cover section", () => {
    const { container } = renderDoc();
    const cover = container.querySelector(".preview-cover");
    expect(cover).toBeTruthy();
    // The cover section itself should have no .preview-page-number child
    expect(cover?.querySelector(".preview-page-number")).toBeNull();
  });

  it("does NOT render page number on the TOC section", () => {
    const { container } = renderDoc();
    const toc = container.querySelector(".preview-toc");
    expect(toc).toBeTruthy();
    expect(toc?.querySelector(".preview-page-number")).toBeNull();
  });

  it("does NOT render page number on chapter opener sections", () => {
    const { container } = renderDoc();
    const openers = container.querySelectorAll(".preview-chapter-opener");
    for (const opener of openers) {
      expect(opener.querySelector(".preview-page-number")).toBeNull();
    }
  });

  it("renders no page numbers when there are no chapters", () => {
    const { container } = renderDoc({ chapters: [] });
    expect(container.querySelectorAll(".preview-page-number")).toHaveLength(0);
    // No TOC either since chapters.length === 0
    expect(container.querySelector(".preview-toc")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pageDimsMm wiring — body sections receive dimensions for page-break computation
// ---------------------------------------------------------------------------

describe("PreviewDocument — pageDimsMm wiring", () => {
  it("body sections have pageDimsMm wired (no break lines in JSDOM, but no errors)", () => {
    // In JSDOM, clientWidth = 0 so no breaks are computed.
    // This test verifies the prop is accepted without throwing.
    const { container } = renderDoc();
    const bodies = container.querySelectorAll(".preview-body");
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    // No breaks in JSDOM (clientWidth = 0)
    expect(container.querySelectorAll(".preview-page-break")).toHaveLength(0);
  });

  it("body pages are NOT clipped — aspect-ratio is unset via CSS class", () => {
    const { container } = renderDoc();
    // The .preview-body class adds aspect-ratio: unset; overflow: visible via CSS.
    // We can't test computed styles in JSDOM, but we can assert the class is present.
    const bodyPage = container.querySelector(".preview-body");
    expect(bodyPage?.classList.contains("preview-body")).toBe(true);
    // Cover and TOC pages do NOT have preview-body class
    expect(container.querySelector(".preview-cover")?.classList.contains("preview-body")).toBeFalsy();
    expect(container.querySelector(".preview-toc")?.classList.contains("preview-body")).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Cover image
// ---------------------------------------------------------------------------

describe("PreviewDocument — cover image", () => {
  it("shows placeholder when coverImageUrl is null", () => {
    const { container } = renderDoc({ coverImageUrl: null });
    expect(container.querySelector(".preview-cover__art-placeholder")).toBeTruthy();
    expect(container.querySelector(".preview-cover__art")).toBeNull();
  });

  it("shows cover img when coverImageUrl is provided", () => {
    const { container } = renderDoc({ coverImageUrl: "https://cdn/cover.jpg" });
    const coverImg = container.querySelector(".preview-cover__art") as HTMLImageElement | null;
    expect(coverImg).toBeTruthy();
    expect(coverImg?.src).toContain("cover.jpg");
  });
});

// ---------------------------------------------------------------------------
// Author: shown for main ebook, hidden for bonus/bump
// ---------------------------------------------------------------------------

describe("PreviewDocument — author display", () => {
  it("renders author on main ebook cover", () => {
    const { container } = renderDoc({ ebook: { ...baseEbook, type: "main" }, author: "Ana García" });
    expect(container.querySelector(".preview-cover__author")?.textContent).toBe("Ana García");
  });

  it("does NOT render author on bonus ebook cover", () => {
    const { container } = renderDoc({ ebook: { ...baseEbook, type: "bonus" }, author: "Ana García" });
    expect(container.querySelector(".preview-cover__author")).toBeNull();
  });
});
