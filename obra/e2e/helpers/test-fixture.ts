import { test as base } from "@playwright/test";
import { interceptAiCalls } from "./ai-intercept.js";
import { signIn, testUser } from "./auth.js";
import type { TestCredentials } from "./auth.js";

export type ObraTestFixtures = {
  /** Sign in as the primary test user before the test body runs. */
  authenticatedPage: void;
  /** Resolve the current test user credentials (index 1 by default). */
  credentials: TestCredentials;
};

/**
 * Extended Playwright test with Obra-specific fixtures:
 * - AI calls are intercepted automatically on every test.
 * - `authenticatedPage` fixture signs in before the test body.
 */
export const test = base.extend<ObraTestFixtures>({
  // Auto-intercept AI calls for every test in every file that imports this fixture.
  page: async ({ page }, use) => {
    await interceptAiCalls(page);
    await use(page);
  },

  credentials: async ({}, use) => {
    await use(testUser(1));
  },

  authenticatedPage: async ({ page, credentials }, use) => {
    await signIn(page, credentials);
    await use();
  },
});

export { expect } from "@playwright/test";
