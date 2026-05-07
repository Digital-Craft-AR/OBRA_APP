/**
 * Dev/staging only: create fixed test users via Supabase Admin API.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (never use VITE_ or expose service role to the client).
 *
 * Run from `obra/`: npm run seed:test-users
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OBRA_ROOT = resolve(__dirname, "..");

/** @param {string} filename */
function loadEnvFile(filename) {
  const path = resolve(OBRA_ROOT, filename);
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

loadEnvFile(".env.seed.local");
loadEnvFile(".env.e2e.local");
loadEnvFile(".env.local");
loadEnvFile(".env");

const TEST_USERS = [
  { email: "creator-seed-1@obratest.invalid" },
  { email: "creator-seed-2@obratest.invalid" },
  { email: "creator-seed-3@obratest.invalid" },
  { email: "creator-seed-unsubscribed@obratest.invalid" },
];

function passwordForUser(index) {
  const { email } = TEST_USERS[index];
  if (email === "creator-seed-unsubscribed@obratest.invalid") {
    return process.env.TEST_USER_PASSWORD_UNSUBSCRIBED ?? process.env.TEST_USER_PASSWORD ?? "";
  }
  const perUser = process.env[`TEST_USER_PASSWORD_${index + 1}`];
  if (perUser) return perUser;
  return process.env.TEST_USER_PASSWORD ?? "";
}

function isAlreadyRegisteredError(error) {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("user already registered")
  );
}

async function main() {
  console.warn(
    "[seed-test-users] DEV/STAGING ONLY — do not run against production with real user data expectations.",
  );

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRole) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in the environment or in .env.seed.local / .env.local (not committed).",
    );
    process.exitCode = 1;
    return;
  }

  const defaultPwd = process.env.TEST_USER_PASSWORD?.trim() ?? "";
  const missingPassword = TEST_USERS.some((_, i) => !passwordForUser(i));
  if (!defaultPwd && missingPassword) {
    console.error(
      "Set TEST_USER_PASSWORD (all users) and/or TEST_USER_PASSWORD_1, _2, _3 for per-user passwords. Do not commit real secrets.",
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  /** One year from now — far enough that tests never hit an expiry. */
  const accessUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  for (let i = 0; i < TEST_USERS.length; i++) {
    const { email } = TEST_USERS[i];
    const password = passwordForUser(i);
    if (!password) {
      console.error(`Missing password for ${email} (set TEST_USER_PASSWORD or TEST_USER_PASSWORD_${i + 1}).`);
      process.exitCode = 1;
      return;
    }

    let userId;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!error) {
      userId = data.user?.id;
      console.log(`Created ${email} (id ${userId})`);
    } else if (isAlreadyRegisteredError(error)) {
      // Look up the existing user id so we can still patch the subscription.
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error(`Failed to list users while resolving ${email}:`, listErr.message);
        process.exitCode = 1;
        return;
      }
      const existing = list.users.find((u) => u.email === email);
      userId = existing?.id;
      console.log(`Skipped (already exists): ${email} (id ${userId})`);
    } else {
      console.error(`Failed ${email}:`, error.message ?? error);
      process.exitCode = 1;
      return;
    }

    if (!userId) {
      console.error(`Could not resolve user id for ${email} — skipping subscription patch.`);
      continue;
    }

    if (email !== "creator-seed-unsubscribed@obratest.invalid") {
      // Grant active subscription so RLS policies allow full app access in E2E tests.
      const { error: profileErr } = await supabase
        .from("creator_profiles")
        .update({
          subscription_status: "active",
          subscription_access_until: accessUntil,
          credits_balance: 1000,
        })
        .eq("id", userId);

        if (profileErr) {
          console.error(`Failed to patch subscription for ${email}:`, profileErr.message);
          process.exitCode = 1;
          return;
        }
    
        console.log(`  → subscription_status=active, credits_balance=1000 set for ${email}`);
    }
  }

  console.log("Done. Verify: sign in on LoginPage; check public.creator_profiles for subscription_status=active.");
}

await main();
