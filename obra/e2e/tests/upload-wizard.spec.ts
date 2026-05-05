/**
 * E2E happy path: Upload wizard (.docx → alignment → chapters → preview export).
 * Issue #197.
 *
 * Flow:
 *   1. Sign in as seeded user
 *   2. Create a new project with content_source="upload"
 *   3. Complete all 7 structure wizard steps
 *   4. Upload test-manuscript.docx (Libros de colorear para niños, 6 chapters) → manuscript-upload-parse (real edge fn)
 *   5. ai-split-proposal auto-triggers (intercepted)
 *   6. Alignment review panel appears → approve → approve-alignment (real edge fn)
 *   7. Chapter editing UI → approve artifact
 *   8. Go to preview → trigger PDF export (export-pdf-queue mocked)
 *
 * AI calls intercepted via test-fixture.ts: ai-optimize, ai-split-proposal.
 * Real edge functions: manuscript-upload-parse, approve-alignment.
 * Per-test mock: export-pdf-queue.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import { deleteProjectById } from "../helpers/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANUSCRIPT_PATH = resolve(__dirname, "../fixtures/test-manuscript.docx");

test.setTimeout(120_000);

let projectId: string | undefined;

test.afterEach(async () => {
  if (projectId) await deleteProjectById(projectId);
  projectId = undefined;
});

test("upload path happy path: docx → alignment → chapters → preview export", async ({ page }) => {
  // ── 1. Sign in ────────────────────────────────────────────────────────────
  await signIn(page, testUser(1));
  await expect(page).toHaveURL(/\/app\/dashboard/);

  // ── 2. New project: choose upload source, keep default locale (es) ────────
  await page.goto("/app/projects/new");
  await page.getByTestId("new-project-source-upload").click();

  // Register BEFORE the click that triggers the INSERT
  const projectInsertDone = page.waitForResponse(
    (r) => r.url().includes("/rest/v1/projects") && r.request().method() === "POST",
  );
  await page.getByTestId("new-project-create-btn").click();
  await projectInsertDone;

  // Capture project ID from URL for cleanup
  await page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);
  const wizardUrl = page.url();
  const projectIdMatch = wizardUrl.match(/\/projects\/([^/]+)\/wizard/);
  projectId = projectIdMatch?.[1];
  expect(projectId).toBeTruthy();

  // ── 3. Structure wizard — 7 steps ─────────────────────────────────────────
  const nextBtn = page.getByTestId("wizard-structure-next-btn");

  // Convenience: register a waiter for the next PATCH to the projects REST endpoint.
  // Always register BEFORE the click that triggers the save.
  function waitForProjectPatch() {
    return page.waitForResponse(
      (r) => r.url().includes("/rest/v1/projects") && r.request().method() === "PATCH",
    );
  }

  // Step 0 – Topic
  await page.getByTestId("wizard-topic").waitFor({ state: "visible" });
  await page.getByTestId("wizard-topic").fill(
    "Cómo crear y vender libros de colorear para niños usando inteligencia artificial",
  );
  const patch0 = waitForProjectPatch();
  await nextBtn.click();
  await patch0;
  // Confirm step 1 is now visible
  await page.getByTestId("wizard-avatar").waitFor({ state: "visible" });

  // Step 1 – Avatar & Problem
  await page.getByTestId("wizard-avatar").fill(
    "Madres creativas que quieren generar ingresos publicando libros infantiles",
  );
  await page.getByTestId("wizard-problem").fill(
    "No saben cómo pasar de la idea al libro publicado de forma sistemática",
  );
  const patch1 = waitForProjectPatch();
  await nextBtn.click();
  await patch1;

  // Step 2 – Package (defaults: 0 bonus, 0 bump — nothing to fill)
  const patch2 = waitForProjectPatch();
  await nextBtn.click();
  await patch2;

  // Step 3 – Main title (ai-optimize is intercepted; wait for input to be enabled)
  await page.getByTestId("wizard-main-title").waitFor({ state: "visible" });
  await expect(page.getByTestId("wizard-main-title")).not.toBeDisabled({ timeout: 10_000 });
  await page.getByTestId("wizard-main-title").fill("Libros de Colorear con IA: La Guía Completa para Publicar y Vender");
  const patch3 = waitForProjectPatch();
  await nextBtn.click();
  await patch3;

  // Step 4 – Bonus titles (empty with 0 bonus count — just advance)
  const patch4 = waitForProjectPatch();
  await nextBtn.click();
  await patch4;

  // Step 5 – Bump titles (empty with 0 bump count — just advance)
  const patch5 = waitForProjectPatch();
  await nextBtn.click();
  await patch5;

  // Step 6 – Design config → "Continue to content" → persists and navigates to /content
  const patch6 = waitForProjectPatch();
  await nextBtn.click();
  await patch6;
  await page.waitForURL(/\/app\/projects\/[^/]+\/content/);

  // ── 4. Upload manuscript ───────────────────────────────────────────────────

  // Register BEFORE setInputFiles. Execution order:
  //   setInputFiles → manuscript-upload-parse → (parse response triggers)
  //   → ContentUploadAlignmentPanel mounts with autoStart → ai-split-proposal
  const splitProposalDone = page.waitForResponse(
    (r) => r.url().includes("/functions/v1/ai-split-proposal"),
  );
  const parseDone = page.waitForResponse(
    (r) => r.url().includes("/functions/v1/manuscript-upload-parse"),
  );

  const fileInput = page.getByTestId("manuscript-file-input");
  await fileInput.waitFor({ state: "attached" });
  await fileInput.setInputFiles(MANUSCRIPT_PATH);
  await parseDone;

  // ── 5. Wait for AI split proposal (auto-triggered, intercepted) ───────────
  await splitProposalDone;

  // ── 6. Alignment review → approve ─────────────────────────────────────────
  await page.getByTestId("alignment-review").waitFor({ state: "visible" });

  // Register BEFORE click: approve-alignment is a real edge function
  const approveAlignmentDone = page.waitForResponse(
    (r) => r.url().includes("/functions/v1/approve-alignment"),
    { timeout: 30_000 },
  );
  await page.getByTestId("alignment-approve-btn").click();
  await approveAlignmentDone;

  // ── 7. Chapter editing → approve artifact ────────────────────────────────
  // After approve-alignment the phase transitions to main_chapter and chapters load.
  // content-approve-artifact-btn only renders in the "generating" contentUiPhase.
  await page.getByTestId("content-approve-artifact-btn").waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await expect(page.getByTestId("content-approve-artifact-btn")).not.toBeDisabled({
    timeout: 10_000,
  });

  await page.getByTestId("content-approve-artifact-btn").click();

  // After all chapters approved → "complete" phase → go-to-preview button appears
  await page.getByTestId("content-go-to-preview-btn").waitFor({
    state: "visible",
    timeout: 20_000,
  });

  // ── 8. Preview & PDF export ───────────────────────────────────────────────
  await page.getByTestId("content-go-to-preview-btn").click();
  await page.waitForURL(/\/app\/projects\/[^/]+\/preview/);

  // Mock the PDF export queue — no real Railway job in E2E
  await page.route("**/functions/v1/export-pdf-queue", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, jobId: "e2e-test-job-001" }),
    }),
  );

  // Wait for shell generation (generate-document-template intercepted) and ebook load
  await page.getByTestId("preview-export-pdf-btn").waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await expect(page.getByTestId("preview-export-pdf-btn")).not.toBeDisabled({
    timeout: 15_000,
  });

  const exportDone = page.waitForResponse(
    (r) => r.url().includes("/functions/v1/export-pdf-queue"),
  );
  await page.getByTestId("preview-export-pdf-btn").click();
  const exportResponse = await exportDone;

  expect(exportResponse.status()).toBe(200);
  const exportBody = (await exportResponse.json()) as { ok: boolean; jobId: string };
  expect(exportBody.ok).toBe(true);
});
