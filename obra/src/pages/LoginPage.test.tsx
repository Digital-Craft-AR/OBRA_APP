import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { LoginPage } from "@/pages/LoginPage";

const { signInWithOAuth, signInWithPassword } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithOAuth,
      signInWithPassword,
    },
  },
}));

function renderLogin(options: { session?: unknown; loading?: boolean } = {}) {
  const { session = null, loading = false } = options;
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthContext.Provider value={{ session: session as never, loading }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app" element={<div data-testid="app-landed">app</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithPassword.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
  });

  it("calls signInWithOAuth with google and redirectTo ending in /auth/callback", async () => {
    const user = userEvent.setup();
    renderLogin();
    const main = screen.getByRole("main");

    await user.click(within(main).getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    });

    const arg = signInWithOAuth.mock.calls[0][0] as {
      provider: string;
      options?: { redirectTo?: string };
    };
    expect(arg.provider).toBe("google");
    expect(arg.options?.redirectTo).toMatch(/\/auth\/callback$/);
    expect(arg.options?.redirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it("shows localized error when signInWithOAuth fails before redirect", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "fail" } });
    const user = userEvent.setup();
    renderLogin();
    const main = screen.getByRole("main");

    await user.click(within(main).getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        i18n.t("auth.oauthStartError", { lng: "es" }),
      );
    });
  });

  it("submits email/password and navigates to /app on success", async () => {
    const user = userEvent.setup();
    renderLogin();
    const main = screen.getByRole("main");

    await user.type(within(main).getByLabelText(/correo/i), "a@b.co");
    await user.type(within(main).getByLabelText(/contraseña/i), "secretpass");
    await user.click(within(main).getByRole("button", { name: /^entrar$/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "a@b.co",
        password: "secretpass",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-landed")).toBeInTheDocument();
    });
  });

  it("redirects to /app when already authenticated", () => {
    renderLogin({
      session: { access_token: "x", user: { id: "u1" } } as never,
      loading: false,
    });
    expect(screen.getByTestId("app-landed")).toBeInTheDocument();
  });
});
