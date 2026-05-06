/**
 * E2E tests for AI wizard happy path — segment 3/5: Wizard Step 2, TOC phase (issue #239).
 *
 * Covers: load content page, generate main ebook index, generate bonus indexes,
 * confirm/freeze the global index, assert transition to chapter editing phase.
 *
 * Projects are created directly in the DB (via createProjectWithStructure) with
 * structure_completed_at already set, so the test starts at step 2 without
 * repeating the full wizard structure UI.
 *
 * All waits use DOM visibility or waitForResponse — no arbitrary timeouts.
 * Cleanup in finally block.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import {
  createProjectWithStructure,
  deleteProjectById,
} from "../helpers/db.js";

// ---------------------------------------------------------------------------
// 1. Full happy path: main index + 1 bonus index → confirm → chapter phase
// ---------------------------------------------------------------------------
test("content TOC: generate main + bonus index then confirm transitions to chapter phase", async ({
  page,
}) => {
  let createdProjectId: string | undefined;

  try {
    // Create a project with structure completed and 1 bonus at the DB level.
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E TOC Happy Path",
      mainTitle: "Cómo crear velas artesanales",
      topic: "Creación y venta de velas artesanales",
      bonusCount: 1,
      bonusItems: [{ title: "Kit de inicio rápido" }],
    });

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/content`);

    // ── Wait for content workspace to load ────────────────────────────────
    // The empty-state generate button appears when the main ebook has no chapters yet.
    await page.getByTestId("content-toc-empty-generate-btn").waitFor();

    // ── Generate main ebook index ─────────────────────────────────────────
    const mainIndexDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/ai-generate-index") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("content-toc-empty-generate-btn").click();
    await mainIndexDone;

    // After generation the TOC list replaces the empty-state prompt.
    await page.getByTestId("content-toc-list").waitFor();
    await expect(page.getByTestId("content-toc-list")).toBeVisible();

    // ── Switch to bonus tab and generate bonus index ───────────────────────
    await page.getByTestId("content-tab-bonus:0").click();

    // For bonus tabs the regenerate button is always shown (no empty-choice UI).
    await expect(page.getByTestId("content-toc-regenerate-btn")).toBeEnabled();

    const bonusIndexDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/ai-generate-all-bonus-index") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("content-toc-regenerate-btn").click();
    await bonusIndexDone;

    // After bonus generation the TOC list for the bonus shows the generated chapters.
    await page.getByTestId("content-toc-list").waitFor();
    await expect(page.getByTestId("content-toc-list")).toBeVisible();

    // ── Confirm global index ──────────────────────────────────────────────
    // The confirm button becomes enabled once all TOCs are valid.
    await expect(page.getByTestId("content-confirm-index-btn")).toBeEnabled({
      timeout: 10_000,
    });

    const confirmDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/project_content_progress") &&
        resp.request().method() === "PATCH",
    );
    await page.getByTestId("content-confirm-index-btn").click();
    await confirmDone;

    // ── Assert chapter editing phase ──────────────────────────────────────
    // contentUiPhase transitions to "generating" → content-chapter-section appears.
    await page.getByTestId("content-chapter-section").waitFor();
    await expect(page.getByTestId("content-chapter-section")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 2. Confirm button is disabled until the main TOC has been generated
// ---------------------------------------------------------------------------
test("content TOC: confirm button is disabled until main index is generated", async ({
  page,
}) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E TOC Validation",
      mainTitle: "Proyecto sin índice",
      topic: "E2E validation topic",
      bonusCount: 0,
    });

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/content`);

    // Wait for workspace to load — empty-state generate button visible.
    await page.getByTestId("content-toc-empty-generate-btn").waitFor();

    // Confirm button must be disabled when no main TOC has been generated.
    await expect(page.getByTestId("content-confirm-index-btn")).toBeDisabled();

    // Generate main index.
    const mainIndexDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/ai-generate-index") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("content-toc-empty-generate-btn").click();
    await mainIndexDone;

    // Wait for TOC list to appear, then confirm button should be enabled.
    await page.getByTestId("content-toc-list").waitFor();
    await expect(page.getByTestId("content-confirm-index-btn")).toBeEnabled();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});
