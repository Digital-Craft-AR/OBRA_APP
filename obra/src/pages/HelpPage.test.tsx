import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { HelpPage } from "@/pages/HelpPage";

const { signOut, useAuthMock, useEntitlementMock } = vi.hoisted(() => ({
  signOut: vi.fn(),
  useAuthMock: vi.fn(),
  useEntitlementMock: vi.fn(),
}));

vi.mock("@/auth/authContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/entitlement/EntitlementProvider", () => ({
  useEntitlement: () => useEntitlementMock(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut,
    },
  },
}));

function renderHelpPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/app/help"]}>
        <Routes>
          <Route path="/app/help" element={<HelpPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("HelpPage", () => {
  beforeEach(() => {
    signOut.mockReset();
    useAuthMock.mockReturnValue({ session: { user: { email: "help@example.com" } } });
    useEntitlementMock.mockReturnValue({ creditsBalance: 120 });
  });

  it("renders FAQ in spanish and allows toggling items", async () => {
    const user = userEvent.setup();
    await i18n.changeLanguage("es");
    renderHelpPage();

    expect(screen.getByRole("heading", { name: i18n.t("help.title", { lng: "es" }) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: i18n.t("help.faq.q1.question", { lng: "es" }) })).toBeInTheDocument();
    expect(screen.queryByText(i18n.t("help.faq.q2.answer", { lng: "es" }))).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: i18n.t("help.faq.q2.question", { lng: "es" }) }));

    expect(screen.getByText(i18n.t("help.faq.q2.answer", { lng: "es" }))).toBeInTheDocument();
    expect(screen.getByText("support@obra.app")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: i18n.t("help.contact.cta", { lng: "es" }) })).toHaveAttribute(
      "href",
      "mailto:support@obra.app?subject=Soporte+Obra",
    );
  });

  it("renders FAQ in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    renderHelpPage();

    expect(screen.getByRole("heading", { name: i18n.t("help.title", { lng: "pt-BR" }) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: i18n.t("help.faq.q10.question", { lng: "pt-BR" }) })).toBeInTheDocument();
  });
});
