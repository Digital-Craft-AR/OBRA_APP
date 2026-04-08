import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadDotEnvFile(path, env = process.env) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = val;
  }
}

export function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const localeArg = argv.find((a) => a.startsWith("--locale="));
  const hookUriArg = argv.find((a) => a.startsWith("--hook-uri="));
  const hookEnabled = argv.includes("--enable-hook");

  const only = onlyArg
    ? new Set(
        onlyArg
          .slice("--only=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;

  const locale = localeArg ? localeArg.slice("--locale=".length).trim() : null;
  const hookUri = hookUriArg ? hookUriArg.slice("--hook-uri=".length).trim() : null;

  return { dryRun, only, locale, hookEnabled, hookUri };
}

export function readTrimmed(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").trimEnd();
}

function subjectFileForTemplate(emailRoot, def, locale) {
  if (!locale) return join(emailRoot, def.subjectFile);
  const localized = join(emailRoot, "locales", locale, `${def.id}.subject.txt`);
  return existsSync(localized) ? localized : join(emailRoot, def.subjectFile);
}

function bodyFileForTemplate(emailRoot, def, locale) {
  if (!locale) return join(emailRoot, def.contentFile);
  const localized = join(emailRoot, "locales", locale, `${def.id}.body.html`);
  return existsSync(localized) ? localized : join(emailRoot, def.contentFile);
}

export function buildPayload({ manifest, only, locale, emailRoot, hookEnabled = false, hookUri = null }) {
  const payload = {};

  for (const [id, defRaw] of Object.entries(manifest.templates)) {
    if (only && !only.has(id)) continue;
    const def = { id, ...defRaw };
    const subjectPath = subjectFileForTemplate(emailRoot, def, locale);
    const contentPath = bodyFileForTemplate(emailRoot, def, locale);
    if (!existsSync(subjectPath) || !existsSync(contentPath)) {
      throw new Error(
        `Missing files for template "${id}": check ${subjectPath} / ${contentPath}`,
      );
    }
    const subject = readTrimmed(subjectPath).replace(/\s+/g, " ").trim();
    const content = readTrimmed(contentPath);
    payload[def.subjectField] = subject;
    payload[def.contentField] = content;
  }

  if (hookEnabled) {
    payload.hook_send_email_enabled = true;
  }
  if (hookUri) {
    payload.hook_send_email_uri = hookUri;
  }

  return payload;
}
