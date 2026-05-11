import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContentArtifactTabs, type ArtifactTabItem } from "@/components/wizard/content/ContentArtifactTabs";

const tabs: ArtifactTabItem[] = [
  { key: "main", navTitle: "Mi ebook" },
  { key: "bonus:0", navTitle: "Bonus 1" },
  { key: "bump:0", navTitle: "Order Bump 1" },
];

function renderTabs(selectedKey = "main", approvedByKey?: Record<string, boolean>) {
  const onSelect = vi.fn();
  render(
    <ContentArtifactTabs
      tabs={tabs}
      selectedKey={selectedKey}
      onSelect={onSelect}
      approvedByKey={approvedByKey}
    />,
  );
  return { onSelect };
}

describe("ContentArtifactTabs", () => {
  it("renders a tab button for each item", () => {
    renderTabs();
    expect(screen.getByTestId("content-tab-main")).toBeTruthy();
    expect(screen.getByTestId("content-tab-bonus:0")).toBeTruthy();
    expect(screen.getByTestId("content-tab-bump:0")).toBeTruthy();
  });

  it("marks the selected tab as aria-selected", () => {
    renderTabs("bonus:0");
    expect(screen.getByTestId("content-tab-bonus:0").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("content-tab-main").getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelect with the correct key when clicking a tab", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTabs();
    await user.click(screen.getByTestId("content-tab-bump:0"));
    expect(onSelect).toHaveBeenCalledWith("bump:0");
  });

  it("renders an icon for each artifact type", () => {
    renderTabs();
    // Each button should contain an SVG (the lucide icon)
    for (const testId of ["content-tab-main", "content-tab-bonus:0", "content-tab-bump:0"]) {
      const btn = screen.getByTestId(testId);
      expect(btn.querySelector("svg")).toBeTruthy();
    }
  });

  it("shows the approved checkmark only for approved tabs", () => {
    renderTabs("main", { "bonus:0": true });
    // bonus:0 should have 2 SVGs: type icon + checkmark; others should have 1
    const bonusBtn = screen.getByTestId("content-tab-bonus:0");
    const mainBtn = screen.getByTestId("content-tab-main");
    expect(bonusBtn.querySelectorAll("svg").length).toBe(2);
    expect(mainBtn.querySelectorAll("svg").length).toBe(1);
  });
});
