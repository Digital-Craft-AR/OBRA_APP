#!/usr/bin/env node
/**
 * Push local Auth email templates to Supabase via Management API:
 *   PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
 *
 * Requires a Supabase personal access token (sbp_...) with permissions that include
 * auth_config_write / project admin (see API docs).
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN="sbp_..."
 *   export SUPABASE_PROJECT_REF="your-project-ref"
 *   node scripts/push-supabase-auth-email-templates.mjs
 *
 * Optional:
 *   node scripts/push-supabase-auth-email-templates.mjs --dry-run
 *   node scripts/push-supabase-auth-email-templates.mjs --only=confirmation,recovery
 *   node scripts/push-supabase-auth-email-templates.mjs --locale=es
 *   node scripts/push-supabase-auth-email-templates.mjs --enable-hook --hook-uri=https://<ref>.supabase.co/functions/v1/send-auth-email
 *
 * Optional env file (not committed): supabase/email-templates/.env.local
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPayload, loadDotEnvFile, parseArgs } from "./lib/supabase-auth-email-templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const EMAIL_ROOT = join(REPO_ROOT, "supabase", "email-templates");
const MANIFEST_PATH = join(EMAIL_ROOT, "manifest.json");
const OPTIONAL_ENV = join(EMAIL_ROOT, ".env.local");

const API_BASE = "https://api.supabase.com";

async function main() {
  loadDotEnvFile(OPTIONAL_ENV);

  const { dryRun, only, locale, hookEnabled, hookUri } = parseArgs(process.argv.slice(2));

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.error(
      "Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.\n" +
        "Set them in the environment or in supabase/email-templates/.env.local",
    );
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const body = buildPayload({
    manifest,
    only,
    locale,
    emailRoot: EMAIL_ROOT,
    hookEnabled,
    hookUri,
  });

  if (Object.keys(body).length === 0) {
    console.error("Nothing to push (empty selection). Check --only=… or manifest.");
    process.exit(1);
  }

  const url = `${API_BASE}/v1/projects/${encodeURIComponent(ref)}/config/auth`;

  if (dryRun) {
    console.log(`[dry-run] PATCH ${url}`);
    if (locale) console.log(`[dry-run] locale: ${locale}`);
    console.log(`[dry-run] fields: ${Object.keys(body).join(", ")}`);
    console.log(`[dry-run] body bytes: ${Buffer.byteLength(JSON.stringify(body), "utf8")}`);
    return;
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    console.error(text);
    process.exit(1);
  }

  console.log(`Updated Auth email templates for project ${ref}.`);
  try {
    const parsed = JSON.parse(text);
    console.log(JSON.stringify(parsed, null, 2).slice(0, 2000) + (text.length > 2000 ? "\n…" : ""));
  } catch {
    console.log(text.slice(0, 2000) + (text.length > 2000 ? "\n…" : ""));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
