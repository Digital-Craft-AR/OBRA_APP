import type { Page } from "@playwright/test";

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Credentials for the primary E2E test user (seeded by scripts/seed-test-users.mjs).
 * Password is read from the environment so it never appears in source.
 */
export function testUser(index: 1 | 2 | 3 = 1): TestCredentials {
  const email = `creator-seed-${index}@obratest.invalid`;
  const password =
    process.env[`TEST_USER_PASSWORD_${index}`] ??
    process.env.TEST_USER_PASSWORD ??
    "";
  if (!password) {
    throw new Error(
      `E2E: missing TEST_USER_PASSWORD or TEST_USER_PASSWORD_${index} env var. ` +
        "Set it in .env.e2e.local (gitignored).",
    );
  }
  return { email, password };
}

/**
 * Sign in via the Obra login page. Assumes the local dev server is running.
 * Navigates to /login, fills credentials, and waits for the dashboard redirect.
 */
export async function signIn(page: Page, credentials?: TestCredentials): Promise<void> {
  const { email, password } = credentials ?? testUser(1);
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 });
}

/**
 * Sign out via the app. Navigates to the dashboard first if needed.
 */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/app/dashboard");
  // Open user menu and click sign out. Selector may need adjustment per actual UI.
  await page.getByRole("button", { name: /salir|sair|sign out|logout/i }).click();
  await page.waitForURL(/\/(login|$)/, { timeout: 10_000 });
}
