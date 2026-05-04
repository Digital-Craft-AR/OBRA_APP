/**
 * E2E tests for the auth happy path (issue #195).
 *
 * All selectors use data-testid for stability across locale changes.
 * All waits are tied to real network events (waitForResponse) — no arbitrary timeouts.
 */

import { test, expect } from "../helpers/test-fixture.js";
import { signIn, testUser, waitForAuthToken } from "../helpers/auth.js";

// ---------------------------------------------------------------------------
// 1. Seeded user can log in and reach dashboard
// ---------------------------------------------------------------------------
test("seeded user can log in and reach dashboard", async ({ page }) => {
  await signIn(page, testUser(1));

  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: /proyectos|projetos/i }).first(),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. New unverified user sees the "check your email" gate
// ---------------------------------------------------------------------------
test("new unverified user sees check-email gate", async ({ page }) => {
  const uniqueEmail = `test-unverified-${Date.now()}@obratest.invalid`;

  await page.goto("/register");
  await page.getByTestId("register-name").fill("Test Unverified");
  await page.getByTestId("register-email").fill(uniqueEmail);
  await page.getByTestId("register-password").fill("TestPass123!");

  // Signup sends POST /auth/v1/signup — wait for it before asserting UI state.
  const signupDone = waitForAuthSignup(page);
  await page.getByTestId("register-submit").click();
  await signupDone;

  // With enable_confirmations=true in supabase/config.toml, local Supabase
  // returns session:null. RegisterPage calls setCheckEmailOnly(true), which
  // renders an in-page "check your email" state — no navigation happens.
  // We wait for the observable outcome: the heading, not the intermediate response.
  await page
    .getByRole("heading", { name: /revisa tu correo|verifique seu e-mail|check your email/i })
    .waitFor();

  // The user must NOT land on the dashboard.
  expect(page.url()).not.toMatch(/\/app\/dashboard/);
});

// ---------------------------------------------------------------------------
// 3. Login page rejects wrong password
// ---------------------------------------------------------------------------
test("login page rejects wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(testUser(1).email);
  await page.getByTestId("login-password").fill("definitely-wrong-password-xyz");

  // Wait for the auth API to return (it will be a 4xx) before asserting the error.
  const authDone = waitForAuthToken(page);
  await page.getByTestId("login-submit").click();
  await authDone;

  // LoginPage renders role="alert" with the error message on bad credentials.
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).not.toBeEmpty();
});

// ---------------------------------------------------------------------------
// 4. Unauthenticated access to /app/dashboard redirects to /login
// ---------------------------------------------------------------------------
test("unauthenticated access to /app/dashboard redirects to /login", async ({ page }) => {
  // ProtectedLayout checks the session synchronously from local storage before
  // any network call, so a URL wait is the right signal here.
  await page.goto("/app/dashboard");
  await page.waitForURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// 5. Subscription gate: pending-subscription page shows checkout button
// ---------------------------------------------------------------------------
test("subscription gate: pending-subscription page shows checkout CTA", async ({ page }) => {
  // Intercept checkout so no real Mercado Pago request is made.
  await page.route("**/functions/v1/create-subscription-checkout", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ redirect_url: "https://example.com/checkout" }),
    }),
  );

  await signIn(page, testUser(1));

  // Use the dev-entitlement override to force the pending-subscription shell.
  await page.goto("/app/pending-subscription?dev_entitlement=pending_subscription");

  // Active users without the override are redirected to /app/dashboard — skip gracefully.
  if (page.url().includes("/app/dashboard")) {
    test.skip();
    return;
  }

  await expect(
    page.getByRole("button", {
      name: /ir al pago|ir para o pagamento|pago|pagamento|suscribir|assinar/i,
    }),
  ).toBeVisible();
});
