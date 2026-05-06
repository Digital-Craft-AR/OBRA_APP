/**
 * E2E tests for AI wizard happy path — segment 2: Wizard Step 1 Structure & Design (issue #238).
 *
 * Covers: topic → avatar/problem → package → main title → bonus titles → bump titles → design config.
 * Uses default bonus/bump counts (0) to keep the test focused.
 *
 * Waits use DOM visibility (closest observable outcome to the user) rather than network responses.
 * Cleanup in finally block.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import { deleteProjectById, dismissWizardTourForEmail } from "../helpers/db.js";

function projectIdFromUrl(url: string): string | undefined {
  return /\/app\/projects\/([^/]+)\//.exec(url)?.[1];
}

/** Click the wizard structure Next button and wait for the step to change. */
async function nextStep(page: ReturnType<typeof test['use']> extends never ? never : any, expectedStepIndex: number) {
  await page.getByTestId("wizard-structure-next").click();
  await page.getByTestId(`wizard-structure-step-${expectedStepIndex}`).waitFor();
}

// ---------------------------------------------------------------------------
// Helper: create a project and navigate to wizard step 1
// ---------------------------------------------------------------------------
async function createProjectAndEnterWizard(page: any) {
  // Dismiss the guided tour at DB level to prevent the tour dialog
  // (which has pointer-events-auto on its section) from covering the Next button.
  // A UI-level dismissal also runs after the wizard loads as a second layer of defence.
  await dismissWizardTourForEmail(testUser(1).email);

  await signIn(page, testUser(1));
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.getByTestId("dashboard-new-project-btn").click();
  await page.getByTestId("new-project-name").fill("E2E Wizard Step 1 Test");
  await page.getByTestId("new-project-next").click();
  await page.getByTestId("new-project-locale-es").click();
  await page.getByTestId("new-project-next").click();
  await page.getByTestId("new-project-source-ai").click();

  const createDone = page.waitForResponse(
    (resp: any) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "POST",
  );
  await page.getByTestId("new-project-create").click();
  await createDone;

  await page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);
  // Wait for the wizard content to load (step 0 container visible)
  await page.getByTestId("wizard-structure-step-0").waitFor();

  // Dismiss the guided tour via UI if it appears. The tour section has pointer-events-auto
  // and can cover the Next button, causing Playwright clicks to land on the tour instead.
  // We do this in addition to the DB-level dismissal for resilience.
  const tourSkip = page.getByTestId("wizard-tour-skip");
  if (await tourSkip.isVisible({ timeout: 1000 }).catch(() => false)) {
    await tourSkip.click();
  }

  return projectIdFromUrl(page.url())!;
}

// ---------------------------------------------------------------------------
// 1. Full happy path: all 7 inner steps → navigate to step 2 (/content)
// ---------------------------------------------------------------------------
test("wizard step 1 full happy path navigates to content phase", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectAndEnterWizard(page);

    // --- Inner step 0: Topic ---
    await page.getByTestId("wizard-topic").fill("Cómo crear velas aromáticas artesanales y venderlas online");
    await nextStep(page, 1);

    // --- Inner step 1: Avatar + Problem ---
    await page.getByTestId("wizard-avatar").fill(
      "Mujeres emprendedoras que quieren generar ingresos desde casa con manualidades",
    );
    await page.getByTestId("wizard-problem").fill(
      "No saben cómo empezar, ni cómo escalar ni vender sus productos artesanales online",
    );
    // Assert values are committed to React state before clicking Next.
    await expect(page.getByTestId("wizard-avatar")).toHaveValue(
      "Mujeres emprendedoras que quieren generar ingresos desde casa con manualidades",
    );
    await expect(page.getByTestId("wizard-problem")).toHaveValue(
      "No saben cómo empezar, ni cómo escalar ni vender sus productos artesanales online",
    );
    await nextStep(page, 2);

    // --- Inner step 2: Package (keep defaults: 0 bonuses, 0 bumps) ---
    await expect(page.getByTestId("wizard-package-step")).toBeVisible();
    await nextStep(page, 3);

    // --- Inner step 3: Main title ---
    // Wait for the custom title input to be enabled — signals that title suggestions
    // finished loading (or gracefully failed). The fixture intercepts ai-optimize.
    await expect(page.getByTestId("wizard-main-title-custom")).toBeEnabled();
    await page.getByTestId("wizard-main-title-custom").fill("Velas artesanales: guía completa para emprendedoras");
    await page.getByTestId("wizard-author").fill("Test Author");
    await nextStep(page, 4);

    // --- Inner step 4: Bonus titles (0 items — just proceed) ---
    await nextStep(page, 5);

    // --- Inner step 5: Bump titles (0 items — just proceed) ---
    await nextStep(page, 6);

    // --- Inner step 6: Design config (accept defaults → finish structure) ---
    // This is the last step — Next navigates to /content after saving + markStructureCompleted.
    await page.getByTestId("wizard-structure-next").click();
    await page.waitForURL(/\/app\/projects\/[^/]+\/content/, { timeout: 30_000 });

    expect(page.url()).toMatch(/\/app\/projects\/[^/]+\/content/);
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 2. Topic step validation: Next is blocked when topic is empty
// ---------------------------------------------------------------------------
test("topic step requires non-empty text before saving", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectAndEnterWizard(page);

    // Step 0 — topic textarea visible and empty
    await expect(page.getByTestId("wizard-topic")).toBeVisible();

    // Click Next with empty topic — should NOT navigate to step 1
    await page.getByTestId("wizard-structure-next").click();

    // Still on step 0
    await expect(page.getByTestId("wizard-structure-step-0")).toBeVisible();
    await expect(page.getByTestId("wizard-topic")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 3. Previous button navigates back to prior inner step
// ---------------------------------------------------------------------------
test("previous button returns to prior inner step", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    createdProjectId = await createProjectAndEnterWizard(page);

    // Step 0: fill topic and advance to step 1
    await page.getByTestId("wizard-topic").fill("Test topic for back-nav");
    await nextStep(page, 1);

    // On step 1 — avatar textarea visible
    await expect(page.getByTestId("wizard-avatar")).toBeVisible();

    // Go back
    await page.getByTestId("wizard-structure-prev").click();

    // Back on step 0
    await expect(page.getByTestId("wizard-structure-step-0")).toBeVisible();
    await expect(page.getByTestId("wizard-topic")).toBeVisible();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});
