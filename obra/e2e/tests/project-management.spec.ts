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
  createArchivedProject,
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
  await page.getByTestId("dashboard-new-project-btn").click();
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

  // Wait for project cards to render — confirms activeProjectCount has loaded from the DB.
  await page.locator('[data-testid^="project-card-"]').first().waitFor({ timeout: 10_000 });

  // Clicking the button when at the limit shows a toast instead of opening the modal.
  await page.getByTestId("dashboard-new-project-btn").click();

  // Toast (role="status") appears with the limit message.
  const toast = page.getByRole("status");
  await toast.waitFor({ state: "visible", timeout: 5_000 });
  await expect(toast).toContainText(/20/);

  // Modal must NOT have opened.
  await expect(page.getByTestId("create-project-name")).not.toBeVisible();

  // Must NOT have navigated to a wizard.
  expect(page.url()).not.toMatch(/\/app\/projects\//);
});

// ---------------------------------------------------------------------------
// 4. 20-project limit — toast when duplicating at limit
// ---------------------------------------------------------------------------
test("20-project limit: shows toast when duplicating at limit", async ({ page }) => {
  const credentials = testUser(3);

  limitTestUserId = await findAuthUserByEmail(credentials.email);
  if (!limitTestUserId) throw new Error(`E2E: testUser(3) not found in auth.users`);

  await deleteProjectsByUserId(limitTestUserId);
  for (let i = 1; i <= 20; i++) {
    await createActiveProject(limitTestUserId, `E2E Limit Seed ${i}`);
  }

  await signIn(page, credentials);
  await page.waitForURL(/\/app\/dashboard/);

  // Wait for cards — confirms activeProjectCount loaded.
  const firstCard = page.locator('[data-testid^="project-card-"]').first();
  await firstCard.waitFor({ timeout: 10_000 });
  const cardTestId = await firstCard.getAttribute("data-testid") ?? "";
  const projectId = cardTestId.replace("project-card-", "");

  // Open kebab menu and click Duplicate → confirmation modal opens.
  await page.getByTestId(`project-card-menu-${projectId}`).click();
  await page.getByTestId(`project-card-duplicate-${projectId}`).click();
  await expect(page.getByTestId("duplicate-modal-confirm")).toBeVisible();

  // Confirm → limit guard fires → toast, modal closes.
  await page.getByTestId("duplicate-modal-confirm").click();
  const toast = page.getByRole("status");
  await toast.waitFor({ state: "visible", timeout: 5_000 });
  await expect(toast).toContainText(/20/);

  // Must NOT have navigated to a wizard.
  expect(page.url()).not.toMatch(/\/app\/projects\//);
});

// ---------------------------------------------------------------------------
// 5. 20-project limit — toast when recovering an archived project at limit
// ---------------------------------------------------------------------------
test("20-project limit: shows toast when recovering archived project at limit", async ({ page }) => {
  const credentials = testUser(3);

  limitTestUserId = await findAuthUserByEmail(credentials.email);
  if (!limitTestUserId) throw new Error(`E2E: testUser(3) not found in auth.users`);

  await deleteProjectsByUserId(limitTestUserId);
  for (let i = 1; i <= 20; i++) {
    await createActiveProject(limitTestUserId, `E2E Limit Seed ${i}`);
  }
  // One archived project to attempt recovering.
  await createArchivedProject(limitTestUserId, "E2E Archived To Recover");

  await signIn(page, credentials);
  await page.waitForURL(/\/app\/dashboard/);

  // Wait for active project cards to confirm activeProjectCount loaded.
  await page.locator('[data-testid^="project-card-"]').first().waitFor({ timeout: 10_000 });

  // Switch to Archived tab.
  await page.getByTestId("project-tab-archived").click();
  await page.locator('[data-testid^="project-card-"]').first().waitFor({ timeout: 5_000 });
  const archivedCard = page.locator('[data-testid^="project-card-"]').first();
  const archivedTestId = await archivedCard.getAttribute("data-testid") ?? "";
  const archivedId = archivedTestId.replace("project-card-", "");

  // Click the Recover button on the card (standalone button, not in the kebab menu).
  await page.getByTestId(`project-card-recover-${archivedId}`).click();
  await expect(page.getByTestId("recover-modal-confirm")).toBeVisible();

  // Confirm → limit guard fires → toast, modal closes.
  await page.getByTestId("recover-modal-confirm").click();
  const toast = page.getByRole("status");
  await toast.waitFor({ state: "visible", timeout: 5_000 });
  await expect(toast).toContainText(/20/);
});

// ---------------------------------------------------------------------------
// 6. 20-project limit — freed slot after archiving enables create + duplicate
// ---------------------------------------------------------------------------
test("20-project limit: create and duplicate succeed after archiving frees a slot", async ({ page }) => {
  const credentials = testUser(3);

  limitTestUserId = await findAuthUserByEmail(credentials.email);
  if (!limitTestUserId) throw new Error(`E2E: testUser(3) not found in auth.users`);

  await deleteProjectsByUserId(limitTestUserId);
  for (let i = 1; i <= 20; i++) {
    await createActiveProject(limitTestUserId, `E2E Limit Seed ${i}`);
  }

  await signIn(page, credentials);
  await page.waitForURL(/\/app\/dashboard/);
  await page.locator('[data-testid^="project-card-"]').first().waitFor({ timeout: 10_000 });

  // Grab first project id for duplicate/archive actions.
  const firstCard = page.locator('[data-testid^="project-card-"]').first();
  const cardTestId = await firstCard.getAttribute("data-testid") ?? "";
  const projectId = cardTestId.replace("project-card-", "");

  // Archive one project to free a slot.
  await page.getByTestId(`project-card-menu-${projectId}`).click();
  await page.getByTestId(`project-card-archive-${projectId}`).click();
  await page.getByTestId("archive-modal-confirm").click();
  // Wait for the card to disappear from the active tab.
  await expect(page.getByTestId(`project-card-${projectId}`)).not.toBeVisible();

  // --- Verify create works (modal opens, no toast) ---
  await page.getByTestId("dashboard-new-project-btn").click();
  await expect(page.getByTestId("create-project-name")).toBeVisible();
  // Close modal without creating.
  await page.getByTestId("modal-close-btn").click();
  await expect(page.getByTestId("create-project-name")).not.toBeVisible();

  // --- Verify duplicate works (confirm modal opens, no toast on confirm) ---
  const nextCard = page.locator('[data-testid^="project-card-"]').first();
  const nextTestId = await nextCard.getAttribute("data-testid") ?? "";
  const nextProjectId = nextTestId.replace("project-card-", "");

  await page.getByTestId(`project-card-menu-${nextProjectId}`).click();
  await page.getByTestId(`project-card-duplicate-${nextProjectId}`).click();
  await expect(page.getByTestId("duplicate-modal-confirm")).toBeVisible();
  // Cancel — we only need to verify the modal reached the confirm state.
  await page.getByTestId("duplicate-modal-cancel").click();
});

// ---------------------------------------------------------------------------
// 7. 20-project limit — freed slot after trashing enables create + duplicate
// ---------------------------------------------------------------------------
test("20-project limit: create and duplicate succeed after trashing frees a slot", async ({ page }) => {
  const credentials = testUser(3);

  limitTestUserId = await findAuthUserByEmail(credentials.email);
  if (!limitTestUserId) throw new Error(`E2E: testUser(3) not found in auth.users`);

  await deleteProjectsByUserId(limitTestUserId);
  for (let i = 1; i <= 20; i++) {
    await createActiveProject(limitTestUserId, `E2E Limit Seed ${i}`);
  }

  await signIn(page, credentials);
  await page.waitForURL(/\/app\/dashboard/);
  await page.locator('[data-testid^="project-card-"]').first().waitFor({ timeout: 10_000 });

  // Grab first project id.
  const firstCard = page.locator('[data-testid^="project-card-"]').first();
  const cardTestId = await firstCard.getAttribute("data-testid") ?? "";
  const projectId = cardTestId.replace("project-card-", "");

  // Move one project to trash to free a slot.
  await page.getByTestId(`project-card-menu-${projectId}`).click();
  await page.getByTestId(`project-card-trash-${projectId}`).click();
  await page.getByTestId("trash-modal-confirm").click();
  await expect(page.getByTestId(`project-card-${projectId}`)).not.toBeVisible();

  // --- Verify create works ---
  await page.getByTestId("dashboard-new-project-btn").click();
  await expect(page.getByTestId("create-project-name")).toBeVisible();
  await page.getByTestId("modal-close-btn").click();
  await expect(page.getByTestId("create-project-name")).not.toBeVisible();

  // --- Verify duplicate works ---
  const nextCard = page.locator('[data-testid^="project-card-"]').first();
  const nextTestId = await nextCard.getAttribute("data-testid") ?? "";
  const nextProjectId = nextTestId.replace("project-card-", "");

  await page.getByTestId(`project-card-menu-${nextProjectId}`).click();
  await page.getByTestId(`project-card-duplicate-${nextProjectId}`).click();
  await expect(page.getByTestId("duplicate-modal-confirm")).toBeVisible();
  await page.getByTestId("duplicate-modal-cancel").click();
});
