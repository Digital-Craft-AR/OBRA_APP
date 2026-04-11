/**
 * Shared MSW (Mock Service Worker) Node server for Vitest integration tests.
 *
 * Usage — import in individual test files:
 *
 *   import { server } from "@/test/server";
 *   import { http, HttpResponse } from "msw";
 *
 *   // Add test-specific handlers before rendering:
 *   server.use(
 *     http.get("https://your-project.supabase.co/rest/v1/projects", () =>
 *       HttpResponse.json([makeProject()]),
 *     ),
 *   );
 *
 * The global beforeAll/afterEach/afterAll lifecycle is wired in setup.ts so
 * individual tests only need to call `server.use(...)` for overrides.
 *
 * Example handler — Supabase auth token endpoint:
 *
 *   http.post("https://*.supabase.co/auth/v1/token", () =>
 *     HttpResponse.json({ access_token: "tok", token_type: "bearer" }),
 *   ),
 */

import { setupServer } from "msw/node";

export const server = setupServer(
  // Add default handlers here that should apply to every test suite.
  // Keep this list minimal — prefer per-test overrides via server.use().
);
