import { FunctionsHttpError } from "@supabase/supabase-js";

/** Reads `{ error: string }` from a failed `functions.invoke` HTTP response when available. */
export async function getFunctionsInvokeErrorCode(err: unknown): Promise<string | null> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = (await err.context.json()) as { error?: string };
      return typeof body.error === "string" ? body.error : null;
    } catch {
      return null;
    }
  }
  return null;
}
