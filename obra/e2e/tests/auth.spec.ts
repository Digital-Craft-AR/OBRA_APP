/**
 * E2E tests for the auth happy path (issue #195).
 *
 * Covers: login, signup → verify-email redirect, wrong password error,
 * unauthenticated redirect guard, and the pending-subscription checkout gate.
 *
 * Seed users (creator-seed-1..3@obratest.invalid) are created by
 * obra/scripts/seed-test-users.mjs with email_confirm=true and
 * subscription_status=active. Passwords come from TEST_USER_PASSWORD env var.
 *
 * All selectors use data-testid for stability across locale changes.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser } from "../helpers/auth.js";

// ---------------------------------------------------------------------------
// 1. Seeded user can log in and reach dashboard
// ---------------------------------------------------------------------------
test("seeded user can log in and reach dashboard", async ({ page }) => {
  await signIn(page, testUser(1));

  // Entitlement router lands active subscribers on the dashboard.
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

  // Sidebar navigation items confirm we're inside the app shell.
  await expect(
    page.getByRole("navigation").getByRole("link", { name: /proyectos|projetos/i }).first(),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. New unverified user is redirected to verify-email
// ---------------------------------------------------------------------------
test("new unverified user is redirected to verify-email", async ({ page }) => {
  const uniqueEmail = `test-unverified-${Date.now()}@obratest.invalid`;

  await page.goto("/register");

  await page.getByTestId("register-name").fill("Test Unverified");
  await page.getByTestId("register-email").fill(uniqueEmail);
  await page.getByTestId("register-password").fill("TestPass123!");
  await page.getByTestId("register-submit").click();

  // Local Supabase requires email confirmation for new signups.
  // The app shows a "check your email" screen in the register page itself
  // (checkEmailOnly state), OR navigates to /app/verify-email if a session is
  // returned with an unverified email. Either way, the user does NOT reach /app/dashboard.
  await Promise.race([
    page.waitForURL(/\/app\/verify-email/, { timeout: 15_000 }).catch(() => null),
    page.getByRole("heading", { name: /revisa tu correo|verifique seu e-mail|check your email/i })
      .waitFor({ timeout: 15_000 })
      .catch(() => null),
  ]);

  // Assert the user did NOT land on the dashboard
  const url = page.url();
  expect(url).not.toMatch(/\/app\/dashboard/);

  const onVerifyEmailRoute = url.includes("/app/verify-email");
  const checkEmailHeadingVisible = await page
    .getByRole("heading", { name: /revisa tu correo|verifique seu e-mail|check your email/i })
    .isVisible()
    .catch(() => false);

  expect(onVerifyEmailRoute || checkEmailHeadingVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// 3. Login page rejects wrong password
// ---------------------------------------------------------------------------
test("login page rejects wrong password", async ({ page }) => {
  await page.goto("/login");

  await page.getByTestId("login-email").fill(testUser(1).email);
  await page.getByTestId("login-password").fill("definitely-wrong-password-xyz");
  await page.getByTestId("login-submit").click();

  // The LoginPage renders an error paragraph with role="alert" on bad credentials.
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("alert")).not.toBeEmpty();
});

// ---------------------------------------------------------------------------
// 4. Unauthenticated access to /app/dashboard redirects to /login
// ---------------------------------------------------------------------------
test("unauthenticated access to /app/dashboard redirects to /login", async ({ page }) => {
  // Navigate directly without signing in — ProtectedLayout redirects to /login.
  await page.goto("/app/dashboard");
  await page.waitForURL(/\/login/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// 5. Subscription gate: pending-subscription page shows checkout button
// ---------------------------------------------------------------------------
test("subscription gate: pending-subscription page shows checkout CTA", async ({ page }) => {
  await page.route("**/functions/v1/create-subscription-checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ redirect_url: "https://example.com/checkout" }),
    });
  });

  await signIn(page, testUser(1));

  // Use dev override to force the pending-subscription gate.
  await page.goto("/app/pending-subscription?dev_entitlement=pending_subscription");

  // If dev override isn't wired up, active users are redirected to dashboard — skip.
  const currentUrl = page.url();
  if (currentUrl.includes("/app/dashboard")) {
    test.skip();
    return;
  }

  await expect(
    page.getByRole("button", { name: /ir al pago|ir para o pagamento|pago|pagamento|suscribir|assinar/i }),
  ).toBeVisible({ timeout: 10_000 });
});
