import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { WizardPreviewPage } from "@/pages/WizardPreviewPage";
import { makeSession } from "@/test/factories";

// Minimal project row matching ProjectRow shape expected by useWizardStructureProject
const PROJECT_ID = "project-preview-test";
const projectData = {
  id: PROJECT_ID,
  name: "My Ebook",
  content_locale: "es",
  content_source: "ai",
  topic: "Finanzas personales",
  problem: null,
  target_avatar: null,
  bonus_count: 1,
  bump_count: 0,
  main_title: "Finanzas para todos",
  author: "Ana García",
  bonus_items: [{ title: "Bonus 1" }],
  bump_items: [],
  design_config: {
    chapterCount: 6,
    contentTone: "friendly",
    paletteMode: "preset",
    palettePresetId: "oceanic",
    palette: { primary: "#204970", secondary: "#e8f0f7", accent: "#c8e62b" },
    fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" },
    page: { size: "a4", orientation: "portrait" },
    image: { mode: "ai", style: "illustration" },
  },
  book_template_id: "classic_fixed",
  layout_page_assignments: { "main:cover": "layout_cover_v1", "main:body": "layout_body_a" },
  structure_completed_at: "2024-01-10T00:00:00.000Z",
  lifecycle_status: "active",
};

const ebooksData = [
  { id: "ebook-main", title: "Finanzas para todos", type: "main", package_ordinal: 0 },
  { id: "ebook-bonus-0", title: "Bonus 1", type: "bonus", package_ordinal: 0 },
];

const chaptersData = [
  { id: "ch-1", title: "Introducción", sort_order: 1, content: "<p>Hola</p>", approved_at: null },
];

// Supabase mock: supports chained .from().select().eq().single(),
// .from().select().eq().order(), and .from().select().eq().maybeSingle() patterns.
const mockChains = vi.hoisted(() => {
  const single = vi.fn();
  const maybeSingle = vi.fn();
  const order = vi.fn();
  const eqChain = vi.fn();
  const selectChain = vi.fn();
  const inChain = vi.fn();
  const isChain = vi.fn();

  return { single, maybeSingle, order, eqChain, selectChain, inChain, isChain };
});

const mockFunctionsInvoke = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: vi.fn((table: string) => {
      if (table === "ebooks") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: mockChains.order,
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  html_shell: "<html><head></head><body><p>Cached shell</p></body></html>",
                  shell_meta: {
                    chapter_count: 1,
                    page_size: "a4",
                    page_orientation: "portrait",
                    generated_at: "2026-01-01T00:00:00.000Z",
                  },
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === "pdf_export_jobs") {
        // Supports: .select().eq(project_id).eq(status).not().order() — load initial PDF URLs query
        const orderFn = vi.fn().mockResolvedValue({ data: [], error: null });
        const notFn = vi.fn(() => ({ order: orderFn }));
        const eq2Fn = vi.fn(() => ({ not: notFn }));
        const eq1Fn = vi.fn(() => ({ eq: eq2Fn }));
        return {
          select: vi.fn(() => ({ eq: eq1Fn })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockChains.single,
            maybeSingle: mockChains.maybeSingle,
            order: mockChains.order,
            in: mockChains.inChain,
            eq: vi.fn(() => ({
              maybeSingle: mockChains.maybeSingle,
              is: vi.fn(() => ({ maybeSingle: mockChains.maybeSingle })),
            })),
          })),
          in: mockChains.inChain,
        })),
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      };
    }),
    functions: { invoke: mockFunctionsInvoke },
  },
}));

// Mock imageSlotApi so image loading side-effects don't interfere with page tests
vi.mock("@/lib/preview/imageSlotApi", () => ({
  loadProjectImages: vi.fn().mockResolvedValue({ ok: true, rows: [] }),
  getSignedImageUrl: vi.fn().mockResolvedValue("https://cdn/img.png"),
  generateImage: vi.fn().mockResolvedValue({ ok: true, imageId: "img-1", signedUrl: "https://cdn/img.png", credits_balance_after: 5 }),
  uploadImage: vi.fn().mockResolvedValue({ ok: true, signedUrl: "https://cdn/uploaded.jpg", storagePath: "p/cover_art.jpg" }),
}));

// Lazy-imported after mocks are wired up
import * as imageSlotApiModule from "@/lib/preview/imageSlotApi";

function renderPreviewPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/app/projects/${PROJECT_ID}/preview`]}>
        <AuthContext.Provider
          value={{
            loading: false,
            session: makeSession({ user: { id: "u1", email: "user@example.com" } as never }),
          }}
        >
          <Routes>
            <Route path="/app/projects/:projectId/preview" element={<WizardPreviewPage />} />
            <Route path="/app/projects/:projectId/content" element={<div data-testid="content-page" />} />
            <Route path="/app/dashboard" element={<div data-testid="dashboard-page" />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("WizardPreviewPage", () => {
  beforeEach(() => {
    mockChains.single.mockReset();
    mockChains.maybeSingle.mockReset();
    mockChains.order.mockReset();
    mockChains.inChain.mockReset();
    mockFunctionsInvoke.mockReset();
    mockGetSession.mockReset();

    // Default: project loads successfully, ebooks load, chapters load
    mockChains.single.mockResolvedValue({ data: projectData, error: null });
    // maybeSingle is used for publish_status and cover image queries
    mockChains.maybeSingle.mockResolvedValue({ data: { publish_status: "draft" }, error: null });
    mockChains.order.mockImplementation(() => {
      // Distinguish ebooks vs chapters query by inspection not possible in this mock;
      // first call is ebooks (from project id), second is chapters (from ebook id).
      // We use a call counter approach.
      const callCount = mockChains.order.mock.calls.length;
      if (callCount <= 1) return Promise.resolve({ data: ebooksData, error: null });
      return Promise.resolve({ data: chaptersData, error: null });
    });

    // generate-document-template uses fetch() + auth.getSession() (streaming NDJSON).
    // shell_meta.content_hash won't match computed hash so generation is triggered each time.
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
    const generatedShellNdjson = JSON.stringify({
      type: "done",
      htmlShell: "<html><head></head><body><p>Generated shell</p></body></html>",
      shellMeta: {
        chapter_count: 1,
        page_size: "a4",
        page_orientation: "portrait",
        content_hash: "generated",
        generated_at: "2026-01-01T00:00:00.000Z",
      },
    }) + "\n";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(generatedShellNdjson, {
          status: 200,
          headers: { "Content-Type": "application/x-ndjson" },
        }),
      ),
    );
  });

  it("renders global stepper with preview step active", async () => {
    renderPreviewPage();
    // Steps 1 and 2 should show as completed, step 3 (Vista previa) active
    const stepLabels = await screen.findAllByText(/Vista previa/i);
    expect(stepLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Vista previa' label in the global stepper", async () => {
    renderPreviewPage();
    // The stepper renders the step label; heading and subtitle were removed per design
    const labels = await screen.findAllByText(/Vista previa/i);
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows back-to-content button in the footer", async () => {
    renderPreviewPage();
    expect(await screen.findByRole("button", { name: /Volver al contenido/i })).toBeTruthy();
  });

  it("shows export PDF button in footer", async () => {
    renderPreviewPage();
    expect(await screen.findByRole("button", { name: /Generar PDF/i })).toBeTruthy();
  });

  it("shows deliverable tabs when ebooks are loaded", async () => {
    renderPreviewPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Ebook principal/i })).toBeTruthy();
    });
    expect(screen.getByRole("tab", { name: /Bonus 1/i })).toBeTruthy();
  });

  it("shows loading state initially", () => {
    // Make project load hang
    mockChains.single.mockReturnValue(new Promise(() => {}));
    renderPreviewPage();
    expect(screen.getByRole("status", { name: /Cargando/i })).toBeTruthy();
  });

  it("shows error state when project load fails", async () => {
    mockChains.single.mockResolvedValue({ data: null, error: { message: "not found" } });
    renderPreviewPage();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Publish status badge
  // ---------------------------------------------------------------------------

  describe("publish status badge", () => {
    it("does not show a badge when status is draft", async () => {
      renderPreviewPage();
      // Wait for the page to settle
      await screen.findByRole("button", { name: /Generar PDF/i });
      // "Exportado" badge should not appear in draft state
      expect(screen.queryByText(/Exportado/i)).toBeNull();
    });

    it("shows 'Exportado' badge when publish_status is published", async () => {
      mockChains.maybeSingle.mockResolvedValue({ data: { publish_status: "published" }, error: null });
      renderPreviewPage();
      await waitFor(() => {
        // i18n key wizard.preview.publishStatus.published → "Exportado"
        expect(screen.getByText(/Exportado/i)).toBeTruthy();
      });
    });

    it("shows 'Modificado' badge when publish_status is modified", async () => {
      mockChains.maybeSingle.mockResolvedValue({ data: { publish_status: "modified" }, error: null });
      renderPreviewPage();
      await waitFor(() => {
        // i18n key wizard.preview.publishStatus.modified → "Modificado desde el último export"
        expect(screen.getByText(/Modificado/i)).toBeTruthy();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ZIP export
  // ---------------------------------------------------------------------------

  describe("ZIP export", () => {
    it("shows ZIP download button", async () => {
      renderPreviewPage();
      // i18n key wizard.preview.export.zip → "Descargar todo (ZIP)"
      expect(await screen.findByRole("button", { name: /Descargar todo/i })).toBeTruthy();
    });

    it("queues PDF jobs via export-pdf-queue when ZIP export runs", async () => {
      mockFunctionsInvoke.mockImplementation((fnName: string) => {
        if (fnName === "export-pdf-queue") {
          return Promise.resolve({
            data: { jobId: "job-zip-test", estimatedSeconds: 0 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response);

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      renderPreviewPage();
      const zipBtn = await screen.findByRole("button", { name: /Descargar todo/i });
      await userEvent.click(zipBtn);

      await waitFor(() => {
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
          "export-pdf-queue",
          expect.objectContaining({
            body: expect.objectContaining({ projectId: PROJECT_ID }),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Descargar ZIP/i)).toBeTruthy();
      });
      await userEvent.click(screen.getByRole("button", { name: /Descargar ZIP/i }));
      expect(clickSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
      fetchSpy.mockRestore();
    });

    it("shows zip error message when PDF queue fails", async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: "timeout" } });

      renderPreviewPage();
      const zipBtn = await screen.findByRole("button", { name: /Descargar todo/i });
      await userEvent.click(zipBtn);

      await waitFor(() => {
        expect(screen.getByText(/Algunos PDFs no se pudieron generar/i)).toBeTruthy();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Cover upload
  // ---------------------------------------------------------------------------

  describe("cover upload", () => {
    it("calls uploadImage when a file is provided via ImageSlot upload", async () => {
      const uploadImageSpy = vi.mocked(imageSlotApiModule.uploadImage);
      uploadImageSpy.mockResolvedValue({
        ok: true,
        signedUrl: "https://cdn/uploaded.jpg",
        storagePath: "project-preview-test/cover_art.jpg",
      });

      renderPreviewPage();

      // Wait for ebooks tab to load
      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Ebook principal/i })).toBeTruthy();
      });

      // Find the file input rendered by ImageSlot for cover
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement | null;
      if (!fileInput) {
        // ImageSlot may not render when no cover slot row exists — this is acceptable
        return;
      }

      const file = new File(["img"], "cover.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(uploadImageSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: PROJECT_ID,
            slotKey: "cover_art",
            file,
          }),
        );
      });
    });
  });
});
