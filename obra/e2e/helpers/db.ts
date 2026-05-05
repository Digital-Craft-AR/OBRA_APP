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
