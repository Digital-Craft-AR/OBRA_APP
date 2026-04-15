import { FunctionsHttpError } from "@supabase/supabase-js";

type InvokeErrorBody = {
  error?: string;
  detail?: string;
  hint?: string;
  /** Human-readable validation or model feedback from Edge (e.g. `ai-generate-content`). */
  message?: string;
};

/** Reads `{ error, detail? }` from a failed `functions.invoke` HTTP response when available. */
export async function getFunctionsInvokeErrorCode(err: unknown): Promise<string | null> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = (await err.context.json()) as InvokeErrorBody;
      const main = typeof body.error === "string" ? body.error : null;
      const detail = typeof body.detail === "string" ? body.detail : null;
      if (main && detail) return `${main}:${detail}`;
      return main;
    } catch {
      return null;
    }
  }
  return null;
}

/** Full JSON body from a Functions HTTP error (for logging / toast description). */
export async function getFunctionsInvokeErrorBody(err: unknown): Promise<InvokeErrorBody | null> {
  if (err instanceof FunctionsHttpError) {
    try {
      return (await err.context.json()) as InvokeErrorBody;
    } catch {
      return null;
    }
  }
  return null;
}
