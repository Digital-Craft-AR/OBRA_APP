/**
 * E2E happy-path test for the full AI creation wizard (issue #196).
 *
 * Covers: new project → structure wizard (7 steps) → content phase
 * (generate TOC, confirm global index, generate + approve chapters) →
 * preview page (verify export buttons are present).
 *
 * All AI calls are intercepted by the base test fixture (no credits consumed).
 * The test creates a real project in the local Supabase and cleans it up in afterEach.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import { deleteProjectsByUserEmail } from "../helpers/db.js";

// ---------------------------------------------------------------------------
// Helper: wait for a Supabase REST write to complete (projects PATCH/POST)
// ---------------------------------------------------------------------------
function waitForProjectsWrite(page: import("@playwright/test").Page) {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/projects") &&
      (resp.request().method() === "POST" || resp.request().method() === "PATCH"),
  );
}

// ---------------------------------------------------------------------------
// Helper: wait for the content workspace to be ready (ensureContentWorkspace
// ends with a GET on ebooks that sets up state)
// ---------------------------------------------------------------------------
function waitForContentWorkspace(page: import("@playwright/test").Page) {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/ebooks") && resp.request().method() === "GET",
  );
}

// ---------------------------------------------------------------------------
// Cleanup — must be registered at file scope, not inside a test body.
// Deletes all projects belonging to the primary test user after each test.
// ---------------------------------------------------------------------------
test.afterEach(async () => {
  await deleteProjectsByUserEmail(testUser(1).email);
});

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------
test(
  "happy path: full wizard — AI path (structure → content → preview → export)",
  async ({ page }) => {
    const user = testUser(1);

    // ── 1. Sign in ──────────────────────────────────────────────────────────
    await signIn(page, user);
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // ── 2. Create new project ───────────────────────────────────────────────
    await page.goto("/app/projects/new");
    await expect(page.getByTestId("new-project-locale-es")).toBeVisible();

    // Select Spanish locale (already default, but be explicit)
    await page.getByTestId("new-project-locale-es").click();

    // Select AI source (already default)
    await page.getByTestId("new-project-source-ai").click();

    // Wait for project creation then navigate to wizard
    const projectCreated = waitForProjectsWrite(page);
    await page.getByTestId("new-project-submit").click();
    await projectCreated;

    // Should navigate to /app/projects/:id/wizard
    await page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);

    // ── 3. Dismiss guided tour if it appears ────────────────────────────────
    // The tour visibility is determined by an async Supabase query on
    // creator_profiles.tour_dismissed_at. We must wait for that GET to land
    // before checking — otherwise isVisible() races with the network.
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/creator_profiles") &&
        resp.request().method() === "GET",
    );
    const tourSkip = page.getByTestId("wizard-tour-skip");
    if (await tourSkip.isVisible()) {
      await tourSkip.click();
    }

    // ── 4. Structure wizard — Step 0: Topic ─────────────────────────────────
    await expect(page.getByTestId("wizard-structure-next")).toBeVisible();

    // Fill in the topic textarea (has id="wizard-topic" from ObraTextarea)
    await page.locator("#wizard-topic").fill(
      "Cómo crear un negocio digital exitoso con inteligencia artificial",
    );

    // Persist topic and move to step 1
    const topicSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await topicSaved;

    // ── 5. Structure wizard — Step 1: Avatar & Problem ──────────────────────
    await page.locator("#wizard-avatar").fill(
      "Emprendedores hispanohablantes de 25-40 años que quieren crear un negocio online",
    );
    await page.locator("#wizard-problem").fill(
      "No saben cómo crear y vender productos digitales sin conocimientos técnicos",
    );

    const avatarSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await avatarSaved;

    // ── 6. Structure wizard — Step 2: Package counts ────────────────────────
    // Default counts are fine; just proceed
    const packageSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await packageSaved;

    // ── 7. Structure wizard — Step 3: Main title (AI suggestions) ───────────
    // ai-optimize is intercepted and returns suggestions[]; wait for the first
    // card to appear before clicking it.
    await expect(page.getByTestId("structure-title-suggestion-0")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId("structure-title-suggestion-0").click();

    const titleSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await titleSaved;

    // ── 8. Structure wizard — Step 4: Bonus titles ──────────────────────────
    // ai-optimize auto-generates bonus titles; wait for them to settle then
    // proceed (the items will already be populated from the fixture).
    await page.waitForTimeout(300); // brief settle after AI auto-call
    const bonusSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await bonusSaved;

    // ── 9. Structure wizard — Step 5: Bump titles ───────────────────────────
    await page.waitForTimeout(300);
    const bumpSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await bumpSaved;

    // ── 10. Structure wizard — Step 6: Design config ────────────────────────
    // Wait for the design-config step to be rendered before clicking Next.
    // Without this wait the click can land while innerStepIndex is still 5
    // (React hasn't applied setInnerStepIndex(6) yet), causing persistBonusBumpItems
    // to run a second time instead of persistDesignConfig → finishedStructure never
    // fires and navigation to /content never happens.
    await page.getByTestId("wizard-design-config").waitFor({ state: "visible" });

    // Default design config is fine; clicking Next also marks structure complete
    // and navigates to content.
    const designSaved = waitForProjectsWrite(page);
    await page.getByTestId("wizard-structure-next").click();
    await designSaved;

    // Should navigate to /app/projects/:id/content
    await page.waitForURL(/\/app\/projects\/[^/]+\/content/, { timeout: 10_000 });

    // ── 11. Content phase — intro screen ────────────────────────────────────
    // Wait for workspace to be ready (ebooks GET) before interacting.
    await waitForContentWorkspace(page);

    // Intro screen: AI is pre-selected; click Continue
    const introContinue = page.getByTestId("content-intro-continue");
    await expect(introContinue).toBeVisible({ timeout: 8_000 });
    await introContinue.click();

    // ── 12. Content phase — generate main TOC ───────────────────────────────
    // The empty-TOC state shows a "Generate" button (content-toc-generate).
    // After clicking it, the ai-generate-index call is intercepted and the TOC
    // is populated from the fixture.
    const generateBtn = page.getByTestId("content-toc-generate");
    await expect(generateBtn).toBeVisible({ timeout: 8_000 });

    const indexDone = page.waitForResponse((resp) =>
      resp.url().includes("/functions/v1/ai-generate-index"),
    );
    await generateBtn.click();
    await indexDone;

    // TOC rows should now be visible (fixture returns 8 chapters)
    // The confirm button appears once all artifact TOCs are valid.
    const confirmBtn = page.getByTestId("content-confirm-index");
    await expect(confirmBtn).toBeEnabled({ timeout: 10_000 });

    // ── 13. Content phase — confirm global index ─────────────────────────────
    // This saves all TOCs and advances to main_chapter phase.
    await confirmBtn.click();

    // Phase transitions to "generating"; the approve-artifact button appears.
    await expect(page.getByTestId("content-approve-artifact")).toBeVisible({
      timeout: 10_000,
    });

    // ── 14. Content phase — generate a chapter ──────────────────────────────
    const chapterGenBtn = page.getByTestId("content-generate-chapter");
    await expect(chapterGenBtn).toBeVisible({ timeout: 8_000 });

    const chapterDone = page.waitForResponse((resp) =>
      resp.url().includes("/functions/v1/ai-generate-content"),
    );
    await chapterGenBtn.click();
    await chapterDone;

    // Chapter content from the fixture should appear in the editor (not empty).
    // We wait for the approve button to become enabled (content is non-empty).
    const approveChapterBtn = page.getByTestId("content-approve-chapter");
    await expect(approveChapterBtn).toBeEnabled({ timeout: 8_000 });

    // ── 15. Content phase — approve all chapters (approve artifact) ──────────
    // Approve the first chapter, then approve the entire artifact.
    await approveChapterBtn.click();

    // Use the "approve artifact" button to bulk-approve remaining chapters and
    // advance to the next artifact. Repeat until all artifacts are approved.
    const approveArtifactBtn = page.getByTestId("content-approve-artifact");
    // Approve main ebook artifact
    await expect(approveArtifactBtn).toBeEnabled({ timeout: 8_000 });
    await approveArtifactBtn.click();

    // For bonus ebooks: generate all chapters then approve artifact
    // (fixture returns content for any chapter generate call).
    // We loop through all artifacts until the "Go to Preview" button appears.
    const goToPreviewBtn = page.getByTestId("content-go-to-preview");

    let iterations = 0;
    while (!(await goToPreviewBtn.isVisible()) && iterations < 10) {
      iterations++;
      // If generate-chapter button is visible, generate and approve chapter first
      if (await chapterGenBtn.isVisible()) {
        const bonusChapterDone = page.waitForResponse((resp) =>
          resp.url().includes("/functions/v1/ai-generate-content"),
        );
        await chapterGenBtn.click();
        await bonusChapterDone;
        await expect(approveChapterBtn).toBeEnabled({ timeout: 8_000 });
        await approveChapterBtn.click();
      }
      // Approve the current artifact if possible
      if (await approveArtifactBtn.isEnabled()) {
        await approveArtifactBtn.click();
        // Brief wait for state update
        await page.waitForTimeout(300);
      }
    }

    // ── 16. Navigate to Preview ──────────────────────────────────────────────
    await expect(goToPreviewBtn).toBeVisible({ timeout: 10_000 });
    await goToPreviewBtn.click();

    await page.waitForURL(/\/app\/projects\/[^/]+\/preview/, { timeout: 10_000 });
    await expect(page.getByTestId("preview-page")).toBeVisible();

    // ── 17. Preview — verify export buttons are present ─────────────────────
    // generate-document-template is intercepted; wait for shell to load.
    await expect(page.getByTestId("preview-export-pdf")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("preview-export-zip")).toBeVisible();

    // Intercept export-pdf-queue so no real PDF job is created.
    await page.route("**/functions/v1/export-pdf-queue", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, jobId: "e2e-test-job-id" }),
      }),
    );

    // Click Export PDF — the modal should open.
    await page.getByTestId("preview-export-pdf").click();

    // ExportPdfModal renders with a progress indicator or status; it mounts as
    // soon as isOpen becomes true. We verify the modal is present in the DOM.
    await expect(
      page.locator("[role='dialog']").first(),
    ).toBeVisible({ timeout: 5_000 });
  },
);
