import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";

const FN_NAME = "manuscript-upload-parse";

export type ProjectManuscriptRow = {
  id: string;
  project_id: string;
  storage_path: string;
  extracted_text_storage_path: string | null;
  mime: string;
  byte_size: number;
  checksum_sha256: string | null;
  extracted_char_count: number | null;
  uploaded_at: string;
  superseded_at: string | null;
};

export async function fetchActiveManuscript(
  projectId: string,
): Promise<{ ok: true; row: ProjectManuscriptRow | null } | { ok: false; code: string }> {
  const { data, error } = await supabase
    .from("project_manuscripts")
    .select(
      "id, project_id, storage_path, extracted_text_storage_path, mime, byte_size, checksum_sha256, extracted_char_count, uploaded_at, superseded_at",
    )
    .eq("project_id", projectId)
    .is("superseded_at", null)
    .maybeSingle();

  if (error) {
    const code = error.code ?? "";
    const msg = (error.message ?? "").toLowerCase();
    if (code === "PGRST205" || code === "42P01" || msg.includes("does not exist")) {
      return { ok: true, row: null };
    }
    return { ok: false, code: "db_error" };
  }

  return { ok: true, row: data as ProjectManuscriptRow | null };
}

export type ManuscriptUploadParseOk = {
  ok: true;
  manuscript_id: string;
  extracted_char_count: number;
  mime: string;
  byte_size: number;
};

export type ManuscriptUploadParseErr = {
  ok: false;
  code: string;
};

type InvokeBody = {
  ok?: boolean;
  manuscript_id?: string;
  extracted_char_count?: number;
  mime?: string;
  byte_size?: number;
  error?: string;
};

function parseInvokeResult(data: InvokeBody | null): ManuscriptUploadParseOk | ManuscriptUploadParseErr | null {
  if (!data) return null;
  if (data.ok === true && typeof data.manuscript_id === "string") {
    return {
      ok: true,
      manuscript_id: data.manuscript_id,
      extracted_char_count: Number(data.extracted_char_count) || 0,
      mime: typeof data.mime === "string" ? data.mime : "",
      byte_size: Number(data.byte_size) || 0,
    };
  }
  if (typeof data.error === "string") {
    return { ok: false, code: data.error };
  }
  return null;
}

/**
 * Upload + parse (no AI credits). Uses the same transport as other Edge calls (`functions.invoke`).
 * Refreshes the session on 401 once; retries fetch errors once.
 */
export async function invokeManuscriptUploadParse(
  projectId: string,
  file: File,
): Promise<ManuscriptUploadParseOk | ManuscriptUploadParseErr> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, code: "unauthorized" };
  }

  const maxAttempts = 2;

  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 800));
    }

    const form = new FormData();
    form.append("project_id", projectId);
    form.append("file", file);

    const { data, error } = await supabase.functions.invoke<InvokeBody>(FN_NAME, {
      body: form,
    });

    if (!error) {
      const parsed = parseInvokeResult(data);
      if (parsed) return parsed;
      return { ok: false, code: "unknown_error" };
    }

    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      if (status === 401 && i < maxAttempts - 1) {
        await supabase.auth.refreshSession();
        continue;
      }
      if (status === 401) {
        return { ok: false, code: "unauthorized" };
      }
      const code = await getFunctionsInvokeErrorCode(error);
      return { ok: false, code: code ?? "unknown_error" };
    }

    if (error instanceof FunctionsFetchError && i < maxAttempts - 1) {
      continue;
    }

    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }

  return { ok: false, code: "network_error" };
}
