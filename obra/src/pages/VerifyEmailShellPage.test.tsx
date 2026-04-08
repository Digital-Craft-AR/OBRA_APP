import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { VerifyEmailShellPage } from "@/pages/VerifyEmailShellPage";

const refreshSession = vi.fn();
const { resend, useEntitlementMock } = vi.hoisted(() => {
  const resendFn = vi.fn();
  return {
    resend: resendFn,
    useEntitlementMock: vi.fn(() => ({
      user: { id: "u1", email: "verify@example.com" } as User,
      refreshSession,
    })),
  };
});

vi.mock("@/entitlement/EntitlementProvider", () => ({
  useEntitlement: () => useEntitlementMock(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      resend,
    },
  },
}));

describe("VerifyEmailShellPage", () => {
  beforeEach(() => {
    resend.mockReset();
    refreshSession.mockReset();
    resend.mockResolvedValue({ error: null });
    useEntitlementMock.mockReturnValue({
      user: { id: "u1", email: "verify@example.com" } as User,
      refreshSession,
    });
  });

  it("calls resend with signup type and emailRedirectTo", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<VerifyEmailShellPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("button", { name: /reenviar correo/i }));

    await waitFor(() => {
      expect(resend).toHaveBeenCalledWith({
        type: "signup",
        email: "verify@example.com",
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      i18n.t("auth.resendSent", { lng: "es" }),
    );
  });

  it("shows rate-limit message when resend fails with rate hint", async () => {
    resend.mockResolvedValue({ error: { message: "Too many requests" } });
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<VerifyEmailShellPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("button", { name: /reenviar correo/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        i18n.t("auth.resendRateLimited", { lng: "es" }),
      );
    });
  });

  it("uses email_change resend when new_email is pending", async () => {
    useEntitlementMock.mockReturnValue({
      user: {
        id: "u1",
        email: "old@example.com",
        email_confirmed_at: "2026-01-01T00:00:00Z",
        new_email: "new@example.com",
      } as User,
      refreshSession,
    });

    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<VerifyEmailShellPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("button", { name: /reenviar correo/i }));

    await waitFor(() => {
      expect(resend).toHaveBeenCalledWith({
        type: "email_change",
        email: "new@example.com",
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
    });
  });
});
