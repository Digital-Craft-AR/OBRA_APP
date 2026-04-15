import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LayoutBody } from "./LayoutBody";

// ResizeObserver is stubbed in src/test/setup.ts (no-op); clientWidth / clientHeight
// are 0 in JSDOM so break positions will always be empty in unit tests.
// We test the rendering of breaks separately by mocking the observer behaviour.

describe("LayoutBody", () => {
  it("renders chapter title as accessible label", () => {
    render(<LayoutBody chapterTitle="Introducción" contentHtml="<p>Hello</p>" />);
    expect(screen.getByRole("region", { name: "Introducción" })).toBeTruthy();
  });

  it("renders content HTML", () => {
    const { container } = render(
      <LayoutBody chapterTitle="Ch 1" contentHtml="<p>Body text here</p>" />,
    );
    expect(container.querySelector(".preview-body__content")).toBeTruthy();
    expect(container.querySelector(".preview-body__content")?.innerHTML).toContain("Body text here");
  });

  it("shows dash placeholder when contentHtml is null", () => {
    const { container } = render(<LayoutBody chapterTitle="Ch 1" contentHtml={null} />);
    const empty = container.querySelector(".preview-body__empty");
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toBe("—");
  });

  it("renders hero image when imageUrl is provided", () => {
    const { container } = render(
      <LayoutBody chapterTitle="Ch 2" contentHtml="<p>Text</p>" imageUrl="https://cdn/hero.jpg" />,
    );
    const img = container.querySelector(".preview-body__hero-img") as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img?.src).toContain("hero.jpg");
  });

  it("does NOT render hero image when imageUrl is absent", () => {
    const { container } = render(<LayoutBody chapterTitle="Ch 2" contentHtml="<p>Text</p>" />);
    expect(container.querySelector(".preview-body__hero-slot")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // pageNumber prop
  // -------------------------------------------------------------------------

  it("renders page number when pageNumber is provided", () => {
    render(<LayoutBody chapterTitle="Ch 3" contentHtml="<p>Text</p>" pageNumber={5} />);
    const pageNum = screen.getByLabelText("Page 5");
    expect(pageNum).toBeTruthy();
    expect(pageNum.textContent).toBe("5");
    expect(pageNum.className).toContain("preview-page-number");
  });

  it("does NOT render page number when pageNumber is omitted", () => {
    const { container } = render(<LayoutBody chapterTitle="Ch 3" contentHtml="<p>Text</p>" />);
    expect(container.querySelector(".preview-page-number")).toBeNull();
  });

  it("does NOT render page number when pageNumber is explicitly undefined", () => {
    const { container } = render(
      <LayoutBody chapterTitle="Ch 3" contentHtml="<p>Text</p>" pageNumber={undefined} />,
    );
    expect(container.querySelector(".preview-page-number")).toBeNull();
  });

  it("renders correct page number value for page 1", () => {
    render(<LayoutBody chapterTitle="Ch 1" contentHtml={null} pageNumber={1} />);
    expect(screen.getByLabelText("Page 1").textContent).toBe("1");
  });

  it("renders correct page number value for large page numbers", () => {
    render(<LayoutBody chapterTitle="Long" contentHtml={null} pageNumber={42} />);
    expect(screen.getByLabelText("Page 42").textContent).toBe("42");
  });
});

// -------------------------------------------------------------------------
// pageDimsMm prop — page-break lines via ResizeObserver
// -------------------------------------------------------------------------

describe("LayoutBody — page break lines", () => {
  it("renders no break lines when pageDimsMm is omitted", () => {
    const { container } = render(<LayoutBody chapterTitle="Ch" contentHtml="<p>text</p>" />);
    expect(container.querySelectorAll(".preview-page-break")).toHaveLength(0);
  });

  it("renders no break lines when pageDimsMm is provided but content fits one page (JSDOM clientHeight=0)", () => {
    // In JSDOM, clientWidth / clientHeight are always 0, so pageHeight = 0 and
    // no break positions are computed.
    const { container } = render(
      <LayoutBody chapterTitle="Ch" contentHtml="<p>text</p>" pageDimsMm={{ w: 210, h: 297 }} />,
    );
    expect(container.querySelectorAll(".preview-page-break")).toHaveLength(0);
  });

  it("renders break lines when ResizeObserver reports multi-page content", async () => {
    // Override ResizeObserver to immediately call the callback with a fake entry.
    // We simulate a section that is 3 pages tall: clientHeight = 3 × pageHeight.
    // pageHeight at clientWidth=600: 600 * (297/210) ≈ 849px → 3 × 849 = 2547px
    const PAGE_W = 600;
    const PAGE_H = Math.round(PAGE_W * (297 / 210)); // 849
    const TOTAL_H = PAGE_H * 3;

    // Spy on the section element so clientWidth / clientHeight return the fake values.
    const originalResizeObserver = globalThis.ResizeObserver;
    let capturedCallback: ResizeObserverCallback | null = null;

    globalThis.ResizeObserver = class MockRO {
      constructor(cb: ResizeObserverCallback) {
        capturedCallback = cb;
      }
      observe(target: Element) {
        // Stub clientWidth / clientHeight on the observed element
        Object.defineProperty(target, "clientWidth", { configurable: true, get: () => PAGE_W });
        Object.defineProperty(target, "clientHeight", { configurable: true, get: () => TOTAL_H });
        // Trigger the callback immediately
        capturedCallback?.([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    const { container } = render(
      <LayoutBody chapterTitle="Ch" contentHtml="<p>text</p>" pageDimsMm={{ w: 210, h: 297 }} />,
    );

    // Should have 2 break lines (at 1× and 2× page height; the 3rd page is the last so no line after it)
    const breaks = container.querySelectorAll(".preview-page-break");
    expect(breaks).toHaveLength(2);
    expect((breaks[0] as HTMLElement).style.top).toBe(`${PAGE_H}px`);
    expect((breaks[1] as HTMLElement).style.top).toBe(`${PAGE_H * 2}px`);

    // Restore
    globalThis.ResizeObserver = originalResizeObserver;
  });
});
