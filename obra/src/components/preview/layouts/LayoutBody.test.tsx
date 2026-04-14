import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LayoutBody } from "./LayoutBody";

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
