import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import {
  createMemoryRouter,
  RouterProvider,
} from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { i18n } from "@/i18n";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";

const { exchangeCodeForSession, getSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession,
      getSession,
    },
  },
}));

function renderCallback(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: "/auth/callback", element: <AuthCallbackPage /> },
      { path: "/app", element: <div data-testid="app-landed">ok</div> },
      { path: "/login", element: <div data-testid="login-landed">login</div> },
    ],
    { initialEntries: [initialPath] },
  );

  return render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    getSession.mockReset();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(window.history.replaceState).mockRestore();
  });

  it("exchanges PKCE code then navigates to /app", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "t",
          refresh_token: "r",
          expires_in: 3600,
          expires_at: 9999999999,
          token_type: "bearer",
          user: { id: "u1" } as never,
        },
      },
      error: null,
    });

    renderCallback("/auth/callback?code=test-pkce-code");

    await waitFor(() => {
      expect(exchangeCodeForSession).toHaveBeenCalledWith("test-pkce-code");
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-landed")).toBeInTheDocument();
    });
  });

  it("shows provider error when OAuth returns error query params", async () => {
    renderCallback("/auth/callback?error=access_denied&error_description=User+cancelled");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/User cancelled|Google|acceso|fall/i);
    });

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("navigates to /app when exchange fails but session already exists", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "t",
          refresh_token: "r",
          expires_in: 3600,
          expires_at: 9999999999,
          token_type: "bearer",
          user: { id: "u1" } as never,
        },
      },
      error: null,
    });

    renderCallback("/auth/callback?code=reused-code");

    await waitFor(() => {
      expect(screen.getByTestId("app-landed")).toBeInTheDocument();
    });
  });

  it("shows callback error when there is no code and no session", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderCallback("/auth/callback");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        i18n.t("auth.callbackError", { lng: "es" }),
      );
    });
  });
});
