import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPayload, parseArgs } from "./lib/supabase-auth-email-templates.mjs";

function makeManifest() {
  return {
    templates: {
      confirmation: {
        subjectField: "mailer_subjects_confirmation",
        contentField: "mailer_templates_confirmation_content",
        subjectFile: "templates/confirmation.subject.txt",
        contentFile: "templates/confirmation.body.html",
      },
      recovery: {
        subjectField: "mailer_subjects_recovery",
        contentField: "mailer_templates_recovery_content",
        subjectFile: "templates/recovery.subject.txt",
        contentFile: "templates/recovery.body.html",
      },
    },
  };
}

function setupEmailRoot() {
  const root = mkdtempSync(join(tmpdir(), "obra-email-"));
  mkdirSync(join(root, "templates"), { recursive: true });
  mkdirSync(join(root, "locales", "es"), { recursive: true });

  writeFileSync(join(root, "templates", "confirmation.subject.txt"), "Confirm your email\n");
  writeFileSync(join(root, "templates", "confirmation.body.html"), "<p>EN confirmation</p>\n");
  writeFileSync(join(root, "templates", "recovery.subject.txt"), "Reset your password\n");
  writeFileSync(join(root, "templates", "recovery.body.html"), "<p>EN recovery</p>\n");

  writeFileSync(join(root, "locales", "es", "confirmation.subject.txt"), "Confirma tu correo\n");
  writeFileSync(join(root, "locales", "es", "confirmation.body.html"), "<p>ES confirmation</p>\n");
  return root;
}

test("parseArgs handles locale and hook flags", () => {
  const args = parseArgs([
    "--dry-run",
    "--locale=es",
    "--only=confirmation,recovery",
    "--enable-hook",
    "--hook-uri=https://example.com/send-auth-email",
  ]);

  assert.equal(args.dryRun, true);
  assert.equal(args.locale, "es");
  assert.equal(args.hookEnabled, true);
  assert.equal(args.hookUri, "https://example.com/send-auth-email");
  assert.deepEqual([...args.only], ["confirmation", "recovery"]);
});

test("buildPayload applies locale override and fallback", () => {
  const emailRoot = setupEmailRoot();
  const payload = buildPayload({
    manifest: makeManifest(),
    only: null,
    locale: "es",
    emailRoot,
  });

  assert.equal(payload.mailer_subjects_confirmation, "Confirma tu correo");
  assert.equal(payload.mailer_templates_confirmation_content, "<p>ES confirmation</p>");
  assert.equal(payload.mailer_subjects_recovery, "Reset your password");
  assert.equal(payload.mailer_templates_recovery_content, "<p>EN recovery</p>");
});

test("buildPayload sets hook fields when requested", () => {
  const emailRoot = setupEmailRoot();
  const payload = buildPayload({
    manifest: makeManifest(),
    only: new Set(["confirmation"]),
    locale: null,
    emailRoot,
    hookEnabled: true,
    hookUri: "https://project-ref.supabase.co/functions/v1/send-auth-email",
  });

  assert.equal(payload.hook_send_email_enabled, true);
  assert.equal(
    payload.hook_send_email_uri,
    "https://project-ref.supabase.co/functions/v1/send-auth-email",
  );
  assert.equal(payload.mailer_subjects_confirmation, "Confirm your email");
  assert.equal(payload.mailer_subjects_recovery, undefined);
});
