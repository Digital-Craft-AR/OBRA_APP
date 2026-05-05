/**
 * E2E tests for project lifecycle management (issue #198).
 *
 * Covers:
 *   1. Archive a project → appears in Archived tab, read-only
 *   2. Move a project to trash → appears in Trash tab with 30-day notice
 *   3. 20-active-project limit → UI blocks creation
 *
 * Uses testUser(2) for archive/trash and testUser(3) for the limit test
 * so the three tests can run in the same Playwright worker without
 * sharing state.
 *
 * Cleanup: IDs are tracked at module scope and reset in test.afterEach,
 * so cleanup runs even when the test fails.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";
import {
  findAuthUserByEmail,
  createActiveProject,
  deleteProjectsByUserId,
  deleteProjectById,
} from "../helpers/db.js";

// ---------------------------------------------------------------------------
// Helper: create a project via the 3-step modal and return the project id.
// Assumes the page is already on /app/dashboard.
// ---------------------------------------------------------------------------
async function createProjectViaModal(
  page: Parameters<typeof signIn>[0],
  name: string,
): Promise<string> {
  await page.getByTestId("new-project-btn").click();
  await page.getByTestId("create-project-name").fill(name);
  // Step 1 → 2
  await page.getByTestId("create-modal-next").click();
  // Step 2 → 3 (accept default locale)
  await page.getByTestId("create-modal-next").click();
  // Step 3 → create (accept default source: ai)
  const navPromise = page.waitForURL(/\/app\/projects\/[^/]+\/wizard/);
  await page.getByTestId("create-modal-create").click();
  await navPromise;

  // Extract project id from /app/projects/{id}/wizard
  const match = page.url().match(/\/app\/projects\/([^/]+)\/wizard/);
  if (!match?.[1]) throw new Error(`E2E: could not parse project id from URL: ${page.url()}`);
  return match[1];
}

// ---------------------------------------------------------------------------
// 1. Archive a project — verify it appears in Archived tab, read-only
// ---------------------------------------------------------------------------
let archiveTestProjectId: string | undefined;

test.afterEach(async () => {
  if (archiveTestProjectId) {
    await deleteProjectById(archiveTestProjectId);
    archiveTestProjectId = undefined;
  }
});

test("archive a project: moves to Archived tab and shows read-only banner", async ({ page }) => {
  await signIn(page, testUser(2));
  await page.waitForURL(/\/app\/dashboard/);

  archiveTestProjectId = await createProjectViaModal(page, `E2E Archive ${Date.now()}`);

  // Return to dashboard
  await page.goto("/app/dashboard");
  await page.waitForURL(/\/app\/dashboard/);

  // Open the 3-dot card menu and click archive
  await page.getByTestId(`project-card-menu-${archiveTestProjectId}`).click();
  await page.getByTestId(`project-card-archive-${archiveTestProjectId}`).click();

  // Wait for the Supabase PATCH before asserting
  const archiveDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "PATCH",
  );
  await page.getByTestId("archive-modal-confirm").click();
  await archiveDone;

  // Card should be gone from the active tab
  await expect(page.getByTestId(`project-card-${archiveTestProjectId}`)).not.toBeVisible();

  // Switch to Archived tab
  await page.getByTestId("project-tab-archived").click();

  // Card appears in the archived tab
  await expect(page.getByTestId(`project-card-${archiveTestProjectId}`)).toBeVisible();

  // The archived banner must be visible on the card
  const card = page.getByTestId(`project-card-${archiveTestProjectId}`);
  await expect(card.getByText(/archivado|arquivado/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Move to trash — appears in Trash tab with 30-day notice
// ---------------------------------------------------------------------------
let trashTestProjectId: string | undefined;

test.afterEach(async () => {
  if (trashTestProjectId) {
    await deleteProjectById(trashTestProjectId);
    trashTestProjectId = undefined;
  }
});

test("move project to trash: appears in Trash tab with retention notice", async ({ page }) => {
  await signIn(page, testUser(2));
  await page.waitForURL(/\/app\/dashboard/);

  trashTestProjectId = await createProjectViaModal(page, `E2E Trash ${Date.now()}`);

  await page.goto("/app/dashboard");
  await page.waitForURL(/\/app\/dashboard/);

  // Open menu → move to trash
  await page.getByTestId(`project-card-menu-${trashTestProjectId}`).click();
  await page.getByTestId(`project-card-trash-${trashTestProjectId}`).click();

  const trashDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "PATCH",
  );
  await page.getByTestId("trash-modal-confirm").click();
  await trashDone;

  // Gone from active tab
  await expect(page.getByTestId(`project-card-${trashTestProjectId}`)).not.toBeVisible();

  // Switch to Trash tab
  await page.getByTestId("project-tab-trash").click();

  // Card appears in trash tab
  await expect(page.getByTestId(`project-card-${trashTestProjectId}`)).toBeVisible();

  // Page-level 30-day retention notice
  await expect(page.getByTestId("trash-retention-notice")).toBeVisible();

  // Per-card trash banner
  const card = page.getByTestId(`project-card-${trashTestProjectId}`);
  await expect(card.getByText(/papelera|lixeira/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. 20-project limit — UI blocks creation of a 21st active project
// ---------------------------------------------------------------------------
let limitTestUserId: string | undefined;

test.afterEach(async () => {
  if (limitTestUserId) {
    await deleteProjectsByUserId(limitTestUserId);
    limitTestUserId = undefined;
  }
});

test("20-project limit: UI shows error when creating a 21st active project", async ({ page }) => {
  const credentials = testUser(3);

  limitTestUserId = await findAuthUserByEmail(credentials.email);
  if (!limitTestUserId) throw new Error(`E2E: testUser(3) not found in auth.users`);

  // Start clean, then seed exactly 20 active projects via admin API (no UI)
  await deleteProjectsByUserId(limitTestUserId);
  for (let i = 1; i <= 20; i++) {
    await createActiveProject(limitTestUserId, `E2E Limit Seed ${i}`);
  }

  await signIn(page, credentials);
  await page.waitForURL(/\/app\/dashboard/);

  // Open the new project modal and navigate to step 3
  await page.getByTestId("new-project-btn").click();
  await page.getByTestId("create-project-name").fill("Project Over Limit");
  await page.getByTestId("create-modal-next").click(); // step 1 → 2
  await page.getByTestId("create-modal-next").click(); // step 2 → 3

  // Click create — the count query fires; register the waiter first
  const countDone = page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/projects") && resp.request().method() === "GET",
  );
  await page.getByTestId("create-modal-create").click();
  await countDone;

  // Modal stays open, limit error appears
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/20/);

  // Must NOT have navigated to a wizard
  expect(page.url()).not.toMatch(/\/app\/projects\//);
});
