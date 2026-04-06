import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { RegisterPage } from "@/pages/RegisterPage";

const { signUp } = vi.hoisted(() => ({
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp,
    },
  },
}));

function renderRegister(options: { session?: unknown; loading?: boolean } = {}) {
  const { session = null, loading = false } = options;
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/register"]}>
        <AuthContext.Provider value={{ session: session as never, loading }}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/app" element={<div data-testid="app-landed">app</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    signUp.mockReset();
    signUp.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("submits signUp with emailRedirectTo pointing at auth callback", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: { session: { access_token: "x", user: { id: "u1" } } as never },
      error: null,
    });
    renderRegister();
    const main = screen.getByRole("main");

    await user.type(within(main).getByLabelText(/correo/i), "new@example.com");
    await user.type(within(main).getByLabelText(/contraseña/i), "password12");
    await user.click(within(main).getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledTimes(1);
    });

    const arg = signUp.mock.calls[0][0] as {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    };
    expect(arg.email).toBe("new@example.com");
    expect(arg.password).toBe("password12");
    expect(arg.options?.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it("navigates to /app when Supabase returns a session", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: {
        session: { access_token: "x", user: { id: "u1" } } as never,
      },
      error: null,
    });
    renderRegister();
    const main = screen.getByRole("main");

    await user.type(within(main).getByLabelText(/correo/i), "x@y.co");
    await user.type(within(main).getByLabelText(/contraseña/i), "password12");
    await user.click(within(main).getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(screen.getByTestId("app-landed")).toBeInTheDocument();
    });
  });

  it("shows check-email instructions when there is no session after signUp", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { session: null, user: null }, error: null });
    renderRegister();
    const main = screen.getByRole("main");

    await user.type(within(main).getByLabelText(/correo/i), "x@y.co");
    await user.type(within(main).getByLabelText(/contraseña/i), "password12");
    await user.click(within(main).getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t("auth.registerCheckEmail", { lng: "es" }))).toBeInTheDocument();
    });
  });

  it("shows localized message when email is already registered", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    });
    renderRegister();
    const main = screen.getByRole("main");

    await user.type(within(main).getByLabelText(/correo/i), "exists@example.com");
    await user.type(within(main).getByLabelText(/contraseña/i), "password12");
    await user.click(within(main).getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        i18n.t("auth.registerAlreadyExists", { lng: "es" }),
      );
    });
  });
});
