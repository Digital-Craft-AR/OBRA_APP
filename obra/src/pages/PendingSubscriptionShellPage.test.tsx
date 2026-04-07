import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { PendingSubscriptionShellPage } from "@/pages/PendingSubscriptionShellPage";

const { reconcileSubscription, invoke } = vi.hoisted(() => ({
  reconcileSubscription: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/auth/authContext", () => ({
  useAuth: () => ({
    session: { access_token: "token" },
  }),
}));

vi.mock("@/entitlement/EntitlementProvider", () => ({
  useEntitlement: () => ({
    user: {
      id: "u1",
      email: "jane@example.com",
      identities: [{ provider: "google" }, { provider: "email" }],
    },
    reconcileSubscription,
  }),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

describe("PendingSubscriptionShellPage", () => {
  beforeEach(() => {
    reconcileSubscription.mockReset();
    invoke.mockReset();
    invoke.mockResolvedValue({ data: {}, error: null });
  });

  it("shows minimal account summary and keeps top-up disabled", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PendingSubscriptionShellPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    const main = screen.getByRole("main");
    expect(within(main).getByText("j***@example.com")).toBeInTheDocument();
    expect(within(main).getByText("Google, Email/Password")).toBeInTheDocument();

    const topUpButton = within(main).getByRole("button", { name: /top-up deshabilitado/i });
    expect(topUpButton).toBeDisabled();

    await user.click(within(main).getByRole("button", { name: /actualizar estado/i }));
    expect(reconcileSubscription).toHaveBeenCalledTimes(1);
  });

  it("calls export edge function from minimal path", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PendingSubscriptionShellPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );

    const main = screen.getByRole("main");
    await user.click(within(main).getByRole("button", { name: /exportar mis datos/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("export-user-data", { method: "POST", body: {} });
    });
  });
});
