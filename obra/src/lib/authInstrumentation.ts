/**
 * Client-side checkpoints for auth / transactional-email related flows.
 * Never logs emails, passwords, tokens, or raw provider error strings (PRD: avoid PII in logs).
 *
 * Enabled when:
 * - `import.meta.env.DEV` is true, or
 * - `VITE_AUTH_EMAIL_INSTRUMENTATION === "true"` (short-lived prod debugging)
 *
 * Disabled in Vitest (`import.meta.env.MODE === "test"`).
 */

export type AuthInstrumentationEvent =
  | {
      flow: "signup";
      outcome: "email_pending" | "session_created" | "error";
      /** i18n key suffix only, e.g. `emailInUse` from `auth.${key}` */
      errorKey?: string;
    }
  | {
      flow: "resend_confirmation";
      outcome: "success" | "rate_limited" | "error";
    }
  | {
      flow: "callback_exchange";
      outcome: "success" | "error" | "recovered_existing_session";
    };

const LOG_PREFIX = "[obra][auth]";

function shouldEmit(): boolean {
  if (typeof process !== "undefined" && process.env.VITEST === "true") return false;
  if (import.meta.env.MODE === "test") return false;
  return (
    Boolean(import.meta.env.DEV) ||
    import.meta.env.VITE_AUTH_EMAIL_INSTRUMENTATION === "true"
  );
}

export function emitAuthInstrumentation(event: AuthInstrumentationEvent): void {
  if (!shouldEmit()) return;
  console.info(
    LOG_PREFIX,
    JSON.stringify({
      t: new Date().toISOString(),
      ...event,
    }),
  );
}
