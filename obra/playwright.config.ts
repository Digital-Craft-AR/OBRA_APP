import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ESM-compatible __dirname (the project uses "type": "module")
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load env files — Playwright does not auto-load .env like Vite does.
// Precedence (first match wins): .env.e2e.local → .env.local → .env
// All three are gitignored via `.env.*.local` / `.env` patterns.
// ---------------------------------------------------------------------------
function loadEnvFile(filename: string): void {
  const path = resolve(__dirname, filename);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Load in increasing-priority order (later calls do not overwrite earlier ones
// because of the `=== undefined` guard above, so load highest-priority first).
loadEnvFile(".env.e2e.local");
loadEnvFile(".env.local");
loadEnvFile(".env");

// ---------------------------------------------------------------------------

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        // dev:e2e starts Vite with --mode e2e, which loads .env.e2e.local
        // (VITE_SUPABASE_URL=http://localhost:54321, etc.) instead of .env.local.
        // reuseExistingServer is false so we never accidentally run against a
        // dev server that is pointed at the remote Supabase instance.
        command: "npm run dev:e2e",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
