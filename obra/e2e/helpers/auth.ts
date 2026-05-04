import type { Page, Response } from "@playwright/test";

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Credentials for the primary E2E test user (seeded by scripts/seed-test-users.mjs).
 * Password is read from the environment so it never appears in source.
 */
export function testUser(index: 1 | 2 | 3 | "unsubscribed" = 1): TestCredentials {
  const email =
    index === "unsubscribed"
      ? "creator-seed-unsubscribed@obratest.invalid"
      : `creator-seed-${index}@obratest.invalid`;
  const envKey = index === "unsubscribed" ? "TEST_USER_PASSWORD_UNSUBSCRIBED" : `TEST_USER_PASSWORD_${index}`;
  const password = process.env[envKey] ?? process.env.TEST_USER_PASSWORD ?? "";
  if (!password) {
    throw new Error(
      `E2E: missing ${envKey} or TEST_USER_PASSWORD env var. Set it in .env.e2e.local (gitignored).`,
    );
  }
  return { email, password };
}

/**
 * Like signIn() but waits for /app/pending-subscription instead of /app/dashboard.
 * Use with testUser('unsubscribed').
 */
export async function signInUnsubscribed(page: Page, credentials?: TestCredentials): Promise<void> {
  const { email, password } = credentials ?? testUser("unsubscribed");
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  const authDone = waitForAuthToken(page);
  await page.getByTestId("login-submit").click();
  await authDone;
  await page.waitForURL(/\/app\/pending-subscription/);
}

/**
 * Wait for the Supabase auth token exchange to resolve (success or failure).
 * Returns the Response so callers can inspect status if needed.
 *
 * Usage: set up the promise BEFORE the click that triggers the request.
 *   const authDone = waitForAuthToken(page);
 *   await page.getByTestId("login-submit").click();
 *   await authDone;
 */
export function waitForAuthToken(page: Page): Promise<Response> {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/auth/v1/token") &&
      resp.request().method() === "POST",
  );
}

/**
 * Wait for the Supabase signup call to resolve.
 */
export function waitForAuthSignup(page: Page): Promise<Response> {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/auth/v1/signup") &&
      resp.request().method() === "POST",
  );
}

/**
 * Sign in via the Obra login page.
 * Waits for the Supabase auth API response (not a timer) before asserting.
 */
export async function signIn(page: Page, credentials?: TestCredentials): Promise<void> {
  const { email, password } = credentials ?? testUser(1);
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  // Set up the response waiter BEFORE clicking — prevents a race where the
  // response arrives before waitForResponse() has registered.
  const authDone = waitForAuthToken(page);
  await page.getByTestId("login-submit").click();
  await authDone;

  // After a successful token exchange the entitlement router navigates to /app/dashboard.
  await page.waitForURL(/\/app\/dashboard/);
}

/**
 * Sign out via the app.
 */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/app/dashboard");
  await page.getByRole("button", { name: /salir|sair|sign out|logout/i }).click();
  await page.waitForURL(/\/(login|$)/);
}
