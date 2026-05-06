/**
 * Server-side DB helpers for E2E tests.
 *
 * These run in the Playwright Node process (not the browser), so they can use
 * SUPABASE_SERVICE_ROLE_KEY. That key is loaded from .env.e2e.local by
 * playwright.config.ts and must NEVER appear in source.
 *
 * Usage pattern — register cleanup before the action, execute after:
 *
 *   test("...", async ({ page }) => {
 *     let createdEmail: string | undefined;
 *     test.afterEach(async () => { if (createdEmail) await deleteAuthUserByEmail(createdEmail); });
 *
 *     createdEmail = `test-${Date.now()}@obratest.invalid`;
 *     // ... do work that creates the user ...
 *   });
 */

const DEFAULT_DESIGN_CONFIG = {
  chapterCount: 8,
  contentTone: "friendly",
  paletteMode: "preset",
  palettePresetId: "oceanic",
  palette: { primary: "#F4F8FC", secondary: "#2D6499", accent: "#5A7A94" },
  typographyMode: "preset",
  typographyPresetId: "oceanic",
  fonts: { heading: "Playfair Display", body: "Inter" },
  page: { size: "a4", orientation: "portrait" },
  image: { mode: "ai", style: "illustration" },
};

function adminHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("E2E: SUPABASE_SERVICE_ROLE_KEY not set. Add it to .env.e2e.local.");
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim();
  if (!url) throw new Error("E2E: SUPABASE_URL not set. Add it to .env.e2e.local.");
  return url;
}

/**
 * Find a Supabase auth user by email using the admin API.
 * Returns the user id or undefined if not found.
 */
export async function findAuthUserByEmail(email: string): Promise<string | undefined> {
  const resp = await fetch(`${supabaseUrl()}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: adminHeaders(),
  });
  if (!resp.ok) return undefined;
  const data = (await resp.json()) as { users?: Array<{ id: string; email: string }> };
  return data.users?.find((u) => u.email === email)?.id;
}

/**
 * Delete a Supabase auth user by id.
 * Cascades to creator_profiles via the on_delete trigger.
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const resp = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!resp.ok && resp.status !== 404) {
    const body = await resp.text().catch(() => "(no body)");
    throw new Error(`E2E: failed to delete user ${userId}: ${resp.status} ${body}`);
  }
}

/**
 * Convenience: find and delete a user by email.
 * Silently skips if the user doesn't exist.
 */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  const id = await findAuthUserByEmail(email);
  if (id) await deleteAuthUser(id);
}

/**
 * Insert an active project directly via the admin REST API (bypasses RLS).
 * Returns the new project id.
 */
export async function createActiveProject(userId: string, name: string): Promise<string> {
  const resp = await fetch(`${supabaseUrl()}/rest/v1/projects`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      name,
      content_locale: "es",
      content_source: "ai",
      design_config: DEFAULT_DESIGN_CONFIG,
      lifecycle_status: "active",
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "(no body)");
    throw new Error(`E2E: failed to create project "${name}": ${resp.status} ${body}`);
  }
  const rows = (await resp.json()) as Array<{ id: string }>;
  if (!rows[0]?.id) throw new Error(`E2E: createActiveProject returned no id`);
  return rows[0].id;
}

/**
 * Set tour_dismissed_at on the creator_profiles row for a given user email.
 * Useful in E2E tests to prevent the guided tour from covering UI elements.
 */
export async function dismissWizardTourForEmail(email: string): Promise<void> {
  const userId = await findAuthUserByEmail(email);
  if (!userId) return;
  await fetch(
    `${supabaseUrl()}/rest/v1/creator_profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        ...adminHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ tour_dismissed_at: new Date().toISOString() }),
    },
  );
}

/**
 * Create a project row with structure already completed, bypassing the wizard UI.
 * Useful for E2E tests that need to start from the Content (step 2) or Preview (step 3) page.
 *
 * The `ensureContentWorkspace` call made by the browser when loading the Content page will
 * automatically create the `ebooks` and `project_content_progress` rows.
 *
 * Returns the new project id.
 */
export async function createProjectWithStructure(options: {
  userEmail: string;
  name?: string;
  mainTitle?: string;
  topic?: string;
  bonusCount?: number;
  bonusItems?: Array<{ title: string }>;
}): Promise<string> {
  const {
    userEmail,
    name = "E2E Content Test",
    mainTitle = "E2E Main Ebook",
    topic = "E2E test topic",
    bonusCount = 0,
    bonusItems = [],
  } = options;

  const userId = await findAuthUserByEmail(userEmail);
  if (!userId) throw new Error(`E2E: user not found: ${userEmail}`);

  const resp = await fetch(`${supabaseUrl()}/rest/v1/projects`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      name,
      content_locale: "es",
      content_source: "ai",
      structure_completed_at: new Date().toISOString(),
      main_title: mainTitle,
      topic,
      target_avatar: "E2E test avatar",
      problem: "E2E test problem",
      author: "E2E Author",
      bonus_count: bonusCount,
      bonus_items: bonusItems,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "(no body)");
    throw new Error(`E2E: failed to create project: ${resp.status} ${body}`);
  }

  const data = (await resp.json()) as Array<{ id: string }>;
  const project = data[0];
  if (!project?.id) throw new Error("E2E: project insert returned no id");
  return project.id;
}

/**
 * Delete a project by ID via the REST API (cascades to ebooks, chapters, etc.).
 * Silently skips on 404.
 */
export async function deleteProjectById(projectId: string): Promise<void> {
  const resp = await fetch(
    `${supabaseUrl()}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  if (!resp.ok && resp.status !== 404) {
    const body = await resp.text().catch(() => "(no body)");
    throw new Error(`E2E: failed to delete project ${projectId}: ${resp.status} ${body}`);
  }
}

/**
 * Delete all projects belonging to a user (bypasses RLS via service role).
 * Used for bulk cleanup after tests that create many projects.
 */
export async function deleteProjectsByUserId(userId: string): Promise<void> {
  const resp = await fetch(
    `${supabaseUrl()}/rest/v1/projects?user_id=eq.${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  if (!resp.ok && resp.status !== 404) {
    const body = await resp.text().catch(() => "(no body)");
    throw new Error(`E2E: failed to delete projects for user ${userId}: ${resp.status} ${body}`);
  }
}
