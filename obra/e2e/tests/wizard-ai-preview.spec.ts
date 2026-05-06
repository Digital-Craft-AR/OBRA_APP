/**
 * E2E tests for AI wizard happy path — segment 5/5: Wizard Step 3, Preview & Export (issue #241).
 *
 * Covers: preview iframe renders after shell generation, PDF export triggers the
 * export-pdf-queue Edge Function, and the modal shows the success state.
 *
 * Projects are created at DB level (structure + index already frozen + chapters seeded)
 * so the test lands directly on /preview without repeating earlier wizard steps.
 *
 * Intercepts per test:
 *   - export-pdf-queue (not in global fixture) → fulfilled with a fake jobId
 *   - pdf_export_jobs polling → returns a "completed" job immediately
 *
 * All waits use DOM visibility or waitForResponse — no arbitrary timeouts.
 * Cleanup in finally block.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import {
  createProjectWithStructure,
  confirmProjectIndexWithChapters,
  deleteProjectById,
} from "../helpers/db.js";

const FAKE_JOB_ID = "e2e-test-job-00000000-0000-0000-0000-000000000000";

/** Intercept the export-pdf-queue Edge Function for the current test page. */
async function interceptExportPdfQueue(page: Parameters<typeof test.use>[0] extends never ? never : any) {
  await page.route("**/functions/v1/export-pdf-queue", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobId: FAKE_JOB_ID, estimatedSeconds: 0 }),
    }),
  );
}

/**
 * Intercept the pdf_export_jobs polling made by ExportPdfModal.
 * Returns a "completed" job immediately so the success state renders without waiting.
 */
async function interceptPdfJobPolling(page: Parameters<typeof test.use>[0] extends never ? never : any) {
  const completedJob = {
    id: FAKE_JOB_ID,
    project_id: "placeholder",
    ebook_id: "placeholder",
    user_id: "placeholder",
    status: "completed",
    pdf_url: "https://example.com/e2e-test.pdf",
    storage_path: null,
    error_message: null,
    retries: 0,
    render_duration_ms: 100,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
  await page.route(
    (url: URL) =>
      url.pathname.includes("/rest/v1/pdf_export_jobs") &&
      url.search.includes(`id=eq.${FAKE_JOB_ID}`),
    (route: any) =>
      route.fulfill({
        status: 200,
        // .single() sends Accept: application/vnd.pgrst.object+json and expects a
        // plain object back (not an array). Return the object directly.
        contentType: "application/vnd.pgrst.object+json",
        body: JSON.stringify(completedJob),
      }),
  );
}

// ---------------------------------------------------------------------------
// 1. Preview iframe renders after shell generation
// ---------------------------------------------------------------------------
test("preview: iframe renders after shell is generated", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E Preview Render",
      mainTitle: "Cómo crear velas artesanales",
      topic: "Creación y venta de velas artesanales",
    });

    await confirmProjectIndexWithChapters({
      projectId: createdProjectId,
      chapters: [
        { title: "Introducción al negocio digital" },
        { title: "Identifica a tu cliente ideal" },
      ],
    });

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/preview`);

    // The generate-document-template Edge Function is intercepted by the global fixture.
    // Wait for the iframe — it appears once shellCache[ebookId] is populated.
    await page.getByTestId("preview-iframe").waitFor({ timeout: 15_000 });
    await expect(page.getByTestId("preview-iframe")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 2. PDF export: queue → modal success state
// ---------------------------------------------------------------------------
test("preview: export PDF shows success state in modal", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E PDF Export",
      mainTitle: "Cómo crear velas artesanales",
      topic: "Creación y venta de velas artesanales",
    });

    await confirmProjectIndexWithChapters({
      projectId: createdProjectId,
      chapters: [{ title: "Introducción al negocio digital" }],
    });

    // Intercept export calls before loading the page.
    await interceptExportPdfQueue(page);
    await interceptPdfJobPolling(page);

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/preview`);

    // Wait for the preview iframe (shell loaded + ebook ready).
    await page.getByTestId("preview-iframe").waitFor({ timeout: 15_000 });

    // Export PDF button must be enabled (ebook selected, shell not loading).
    await expect(page.getByTestId("preview-export-pdf-btn")).toBeEnabled();

    // ── Trigger export ────────────────────────────────────────────────────
    const queueDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/export-pdf-queue") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("preview-export-pdf-btn").click();
    await queueDone;

    // ── Assert modal success state ────────────────────────────────────────
    // ExportPdfModal polls pdf_export_jobs immediately; the intercept returns
    // "completed" on the first call so isCompleted becomes true right away.
    await page.getByTestId("export-pdf-success").waitFor({ timeout: 10_000 });
    await expect(page.getByTestId("export-pdf-success")).toBeVisible();
    await expect(page.getByTestId("export-pdf-download-btn")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 3. ZIP export: clicking the button opens the ZIP modal
// ---------------------------------------------------------------------------
test("preview: export ZIP button opens the ZIP modal", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E ZIP Export",
      mainTitle: "Cómo crear velas artesanales",
      topic: "Creación y venta de velas artesanales",
    });

    await confirmProjectIndexWithChapters({
      projectId: createdProjectId,
      chapters: [{ title: "Introducción al negocio digital" }],
    });

    // Intercept export-pdf-queue so the ZIP modal's startExport doesn't error.
    await interceptExportPdfQueue(page);

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/preview`);

    // Wait for the preview iframe so the ebook is loaded and the ZIP button enabled.
    await page.getByTestId("preview-iframe").waitFor({ timeout: 15_000 });
    await expect(page.getByTestId("preview-export-zip-btn")).toBeEnabled();

    await page.getByTestId("preview-export-zip-btn").click();

    // ExportZipModal content should be visible.
    await page.getByTestId("export-zip-modal-content").waitFor();
    await expect(page.getByTestId("export-zip-modal-content")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});
