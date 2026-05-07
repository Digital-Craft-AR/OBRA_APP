/**
 * E2E tests for AI wizard happy path — segment 4/5: Wizard Step 2, chapter phase (issue #240).
 *
 * Covers: chapter editing phase (global index already frozen), generate chapter content,
 * edit it in the Tiptap rich-text editor, approve the chapter, assert approved state.
 *
 * Projects are created and pre-seeded at DB level so the test lands directly in the
 * chapter editing phase without repeating the wizard structure or TOC generation UI.
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

const CHAPTER_TITLES = [
  "Introducción al negocio digital",
  "Identifica a tu cliente ideal",
];

// ---------------------------------------------------------------------------
// 1. Happy path: generate content → edit in editor → approve → assert badge
// ---------------------------------------------------------------------------
test("chapter: generate content, edit, and approve shows approved badge", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E Chapter Happy Path",
      mainTitle: "Cómo crear velas artesanales",
      topic: "Creación y venta de velas artesanales",
    });

    await confirmProjectIndexWithChapters({
      projectId: createdProjectId,
      chapters: CHAPTER_TITLES.map((title) => ({ title })),
    });

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/content`);

    // ── Wait for chapter editing phase ────────────────────────────────────
    await page.getByTestId("content-chapter-section").waitFor();

    // The generate button is enabled once a chapter with a title is selected.
    await expect(page.getByTestId("content-chapter-generate-btn")).toBeEnabled();

    // Approve is disabled — editor is empty before generation.
    await expect(page.getByTestId("content-chapter-approve-btn")).toBeDisabled();

    // ── Generate chapter content ──────────────────────────────────────────
    const generateDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/ai-generate-content") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("content-chapter-generate-btn").click();
    await generateDone;

    // Editor must be visible and contain the generated HTML (non-empty).
    const editor = page.getByTestId("content-chapter-editor").locator("[contenteditable]");
    await expect(editor).toBeVisible();
    await expect(editor).not.toBeEmpty();

    // Approve button unlocks after generation (body is no longer empty).
    await expect(page.getByTestId("content-chapter-approve-btn")).toBeEnabled();

    // ── Edit the chapter in the rich-text editor ──────────────────────────
    // Click at the end of the editor content and append a word so the draft
    // is marked dirty — this exercises the save-before-approve path.
    await editor.click();
    await editor.pressSequentially(" EDITADO");

    // ── Approve the chapter ───────────────────────────────────────────────
    const approveDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/chapters") &&
        resp.request().method() === "PATCH",
    );
    await page.getByTestId("content-chapter-approve-btn").click();
    await approveDone;

    // ── Assert approved state ─────────────────────────────────────────────
    // The approved badge appears when approved_at is set on the current chapter.
    await page.getByTestId("content-chapter-approved-badge").waitFor();
    await expect(page.getByTestId("content-chapter-approved-badge")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 2. Approve button stays disabled until the editor has content
// ---------------------------------------------------------------------------
test("chapter: approve button is disabled when editor is empty", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectWithStructure({
      userEmail: testUser(1).email,
      name: "E2E Chapter Approve Disabled",
      mainTitle: "Proyecto sin contenido",
      topic: "E2E validation topic",
    });

    await confirmProjectIndexWithChapters({
      projectId: createdProjectId,
      chapters: [{ title: "Capítulo de prueba" }],
    });

    await signIn(page, testUser(1));
    await page.goto(`/app/projects/${createdProjectId}/content`);

    await page.getByTestId("content-chapter-section").waitFor();

    // Approve must be disabled — no content yet.
    await expect(page.getByTestId("content-chapter-approve-btn")).toBeDisabled();

    // Generate content.
    const generateDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/ai-generate-content") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("content-chapter-generate-btn").click();
    await generateDone;

    // After generation the editor has content → approve becomes enabled.
    await expect(page.getByTestId("content-chapter-approve-btn")).toBeEnabled();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});
