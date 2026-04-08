import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { NewProjectPage } from "@/pages/NewProjectPage";

const { insert, select, single, eq } = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert,
      select,
      single,
      eq,
    })),
  },
}));

function renderNewProject() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/app/projects/new"]}>
        <AuthContext.Provider
          value={{
            loading: false,
            session: { user: { id: "u1", email: "user@example.com" } } as never,
          }}
        >
          <Routes>
            <Route path="/app/projects/new" element={<NewProjectPage />} />
            <Route path="/app/projects/:projectId/wizard" element={<div data-testid="wizard-page" />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("NewProjectPage", () => {
  beforeEach(() => {
    insert.mockReset();
    select.mockReset();
    single.mockReset();
    eq.mockReset();
    insert.mockReturnValue({ select });
    select.mockReturnValue({ single });
    single.mockResolvedValue({ data: { id: "project-1" }, error: null });
  });

  it("creates project with locale and source, then navigates to wizard", async () => {
    const user = userEvent.setup();
    renderNewProject();

    const main = screen.getByRole("heading", { name: /crear proyecto/i }).closest("div");
    if (!main) throw new Error("Could not locate page container");

    await user.click(within(main).getByRole("button", { name: /english \(us\)/i }));
    await user.click(within(main).getByRole("button", { name: /subir manuscrito/i }));
    await user.click(within(main).getByRole("button", { name: /continuar al wizard/i }));

    await waitFor(() => {
      expect(insert).toHaveBeenCalledTimes(1);
    });

    expect(insert.mock.calls[0][0]).toMatchObject({
      user_id: "u1",
      content_locale: "en-US",
      content_source: "upload",
    });

    await waitFor(() => {
      expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
    });
  });

  it("shows error alert when insert fails", async () => {
    const user = userEvent.setup();
    single.mockResolvedValue({ data: null, error: { message: "boom" } });
    renderNewProject();

    await user.click(screen.getByRole("button", { name: /continuar al wizard/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/no pudimos crear el proyecto/i);
    });
  });
});
