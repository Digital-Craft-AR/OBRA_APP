import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

function fixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), "utf8");
}

function jsonFixture(name: string): unknown {
  return JSON.parse(fixture(name));
}

/**
 * Register Playwright route interceptors for every Supabase Edge Function that
 * calls Claude or Gemini. Call this in beforeEach (or within a test) so that no
 * real AI credits are consumed during E2E runs.
 *
 * The local Supabase Edge Functions are served at:
 *   http://localhost:54321/functions/v1/<name>
 *
 * We also handle the Supabase JS client path, which may go through the API gateway:
 *   http://localhost:54321/functions/v1/<name>
 */
export async function interceptAiCalls(page: Page): Promise<void> {
  const fnBase = "**/functions/v1";

  await page.route(`${fnBase}/ai-optimize`, routeJson("ai-optimize.json"));
  await page.route(`${fnBase}/ai-generate-index`, routeJson("ai-generate-index.json"));
  await page.route(`${fnBase}/ai-generate-all-bonus-index`, handleBonusIndex);
  await page.route(`${fnBase}/ai-generate-content`, routeJson("ai-generate-content.json"));
  await page.route(`${fnBase}/ai-split-proposal`, routeJson("ai-split-proposal.json"));
  await page.route(`${fnBase}/image-generate`, routeJson("image-generate.json"));
  await page.route(`${fnBase}/generate-document-template`, handleDocumentTemplate);

  // Intercept the subscription reconcile call so it never triggers refetchProfile()
  // (which briefly sets profileLoading=true, causing EntitlementGate to unmount
  // WizardStructurePage via the fullscreen loading screen and reset innerStepIndex to 0).
  await page.route(`${fnBase}/reconcile-subscription-status`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

function routeJson(fixtureName: string) {
  return async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: fixture(fixtureName),
    });
  };
}

/**
 * Bonus index fixture: the response includes ebook_ids that must match the
 * actual ebook_ids created in the project. We patch the placeholder with
 * real ids from the request body so the frontend can merge correctly.
 */
async function handleBonusIndex(route: Route): Promise<void> {
  let body: { bonus_ebook_ids?: string[] } = {};
  try {
    const raw = route.request().postDataJSON() as typeof body;
    body = raw ?? {};
  } catch {
    // no-op — use empty body
  }

  const data = jsonFixture("ai-generate-all-bonus-index.json") as {
    ok: boolean;
    bonuses: Array<{ ebook_id: string; chapters: unknown[] }>;
    credits_balance_after: number;
  };

  const bonusIds = body.bonus_ebook_ids ?? [];
  const patched = {
    ...data,
    bonuses: data.bonuses.map((b, i) => ({
      ...b,
      ebook_id: bonusIds[i] ?? b.ebook_id,
    })),
  };

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(patched),
  });
}

/**
 * generate-document-template returns a streaming NDJSON response.
 * Playwright's route.fulfill supports a body string; we return the full
 * fixture as a single response body (the client reads the stream to EOF).
 */
async function handleDocumentTemplate(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: fixture("generate-document-template.ndjson"),
  });
}
