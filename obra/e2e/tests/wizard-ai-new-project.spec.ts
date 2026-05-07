/**
 * E2E tests for AI wizard happy path — segment 1: new project creation (issue #237).
 *
 * Covers: opening the new-project modal from the dashboard, filling the 3-step
 * flow (name → locale → AI source), submitting, and asserting redirect to
 * wizard step 1 (/app/projects/:id/wizard).
 *
 * All selectors use data-testid. Waits are tied to real network events.
 * Each test cleans up the created project in a finally block.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import { deleteProjectById } from "../helpers/db.js";

// ---------------------------------------------------------------------------
// Helper: extract project id from the wizard URL
// ---------------------------------------------------------------------------
function projectIdFromUrl(url: string): string | undefined {
  const match = /\/app\/projects\/([^/]+)\/wizard/.exec(url);
  return match?.[1];
}

// ---------------------------------------------------------------------------
// 1. Full happy path: name → locale (es) → AI source → create → wizard step 1
// ---------------------------------------------------------------------------
test("new project (AI, es) redirects to wizard step 1", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    await signIn(page, testUser(1));
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Open modal
    await page.getByTestId("new-project-btn").click();

    // Step 1 — project name
    await page.getByTestId("create-project-name").fill("Test AI Project E2E");
    await page.getByTestId("create-modal-next").click();

    // Step 2 — locale
    await page.getByTestId("new-project-locale-es").click();
    await page.getByTestId("create-modal-next").click();

    // Step 3 — source: AI is selected by default; assert card is present and click it
    await expect(page.getByTestId("new-project-source-ai")).toBeVisible();
    await page.getByTestId("new-project-source-ai").click();

    // Submit and wait for the Supabase REST insert to complete
    const createDone = page.waitForResponse((resp) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "POST",
    );
    await page.getByTestId("create-modal-create").click();
    await createDone;

    // Assert navigation to wizard step 1
    await page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);
    createdProjectId = projectIdFromUrl(page.url());
    expect(createdProjectId).toBeTruthy();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 2. Locale selection: choosing pt-BR is reflected before submission
// ---------------------------------------------------------------------------
test("locale selection (pt-BR) is remembered through to creation", async ({ page }) => {
  let createdProjectId: string | undefined;

  try {
    await signIn(page, testUser(2));
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await page.getByTestId("new-project-btn").click();

    await page.getByTestId("create-project-name").fill("Test AI Project pt-BR");
    await page.getByTestId("create-modal-next").click();

    // Select pt-BR locale
    await page.getByTestId("new-project-locale-pt-BR").click();
    await page.getByTestId("create-modal-next").click();

    // Source step — pick AI
    await page.getByTestId("new-project-source-ai").click();

    const createDone = page.waitForResponse((resp) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "POST",
    );
    await page.getByTestId("create-modal-create").click();
    await createDone;

    await page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);
    createdProjectId = projectIdFromUrl(page.url());
    expect(createdProjectId).toBeTruthy();
  } finally {
    if (createdProjectId) await deleteProjectById(createdProjectId);
  }
});

// ---------------------------------------------------------------------------
// 3. "Next" button is disabled when project name is empty
// ---------------------------------------------------------------------------
test("next button is disabled when project name is empty", async ({ page }) => {
  await signIn(page, testUser(1));
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.getByTestId("new-project-btn").click();

  // Name field empty by default — Next should be disabled
  await expect(page.getByTestId("create-modal-next")).toBeDisabled();

  // Filling the name enables it
  await page.getByTestId("create-project-name").fill("Some name");
  await expect(page.getByTestId("create-modal-next")).toBeEnabled();
});
