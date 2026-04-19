import postgres from "npm:postgres@3.4.5";
import { corsJson } from "./cors.ts";

/** Namespace key for `pg_try_advisory_lock(key1, key2)` (Obra shell generation). */
const SHELL_ADVISORY_CLASS_KEY = 88114202;

function lockTag(ebookId: string): string {
  return `obra:shell:${ebookId}`;
}

/**
 * Runs `run()` while holding a session-level Postgres advisory lock for this ebook.
 * Uses a direct DB connection (`SUPABASE_DB_URL` or `DATABASE_URL`) so lock + unlock
 * share the same backend session (required for advisory locks; PostgREST pooling does not).
 *
 * Use a **direct** Postgres URI (port 5432) or session pooler — not transaction pooler (port 6543).
 */
export async function runWithShellGenerationPgAdvisoryLock(
  ebookId: string,
  run: () => Promise<Response>,
): Promise<Response> {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL");
  if (!dbUrl) {
    console.warn(
      "generate_document_template: SUPABASE_DB_URL or DATABASE_URL not set; PG advisory lock disabled. Set a direct Postgres connection string (see PRODUCCION.md).",
    );
    return await run();
  }

  const sql = postgres(dbUrl, { max: 1, prepare: false });
  const tag = lockTag(ebookId);
  let acquired = false;
  try {
    const rows = await sql<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(hashtext(${tag}), ${SHELL_ADVISORY_CLASS_KEY}) AS acquired
    `;
    acquired = rows[0]?.acquired === true;
    if (!acquired) {
      return corsJson({ error: "generation_in_progress" }, 409);
    }
    return await run();
  } finally {
    if (acquired) {
      try {
        await sql`
          SELECT pg_advisory_unlock(hashtext(${tag}), ${SHELL_ADVISORY_CLASS_KEY})
        `;
      } catch (e) {
        console.error("shell_generation_advisory_unlock_failed", e);
      }
    }
    await sql.end({ timeout: 10 }).catch((e) => console.error("shell_generation_pg_client_end_failed", e));
  }
}
