import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentPackSidebar } from "@/components/wizard/content/ContentPackSidebar";
import { i18n } from "@/i18n";
import type { ContentNavItem } from "@/lib/wizard/contentNav";

const sampleNav: ContentNavItem[] = [
  { key: "main", navTitle: "Main ebook", target: { kind: "main" } },
  {
    key: "bonus:0",
    navTitle: "Bonus One",
    target: { kind: "bonus", index: 0 },
    tocConfirmed: true,
  },
  { key: "bump:0", navTitle: "Bump One", target: { kind: "bump", index: 0 } },
];

function renderSidebar(
  props: Partial<{
    selectedKey: string;
    navItemDisabled: (key: string) => boolean;
  }> = {},
) {
  const onSelectKey = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ContentPackSidebar
        t={i18n.getFixedT("es")}
        navItems={sampleNav}
        selectedKey={props.selectedKey ?? "main"}
        onSelectKey={onSelectKey}
        navItemDisabled={props.navItemDisabled}
      />
    </I18nextProvider>,
  );
  return { onSelectKey };
}

describe("ContentPackSidebar", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("invokes onSelectKey when a visible pack row is activated", async () => {
    const user = userEvent.setup();
    const { onSelectKey } = renderSidebar();
    const bump = screen.getAllByRole("button", { name: "Bump One" })[0];
    expect(bump).toBeTruthy();
    await user.click(bump!);
    expect(onSelectKey).toHaveBeenCalledTimes(1);
    expect(onSelectKey).toHaveBeenCalledWith("bump:0");
  });

  it("disables pack rows when navItemDisabled returns true", () => {
    renderSidebar({
      navItemDisabled: (key) => key === "bump:0",
    });
    for (const el of screen.getAllByRole("button", { name: "Bump One" })) {
      expect(el).toBeDisabled();
    }
  });
});
