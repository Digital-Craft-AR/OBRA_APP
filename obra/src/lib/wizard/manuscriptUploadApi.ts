import { supabase } from "@/lib/supabaseClient";

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

function supabaseFunctionsBaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

/**
 * Upload + parse (no AI credits). One automatic retry on network failure.
 */
export async function invokeManuscriptUploadParse(
  projectId: string,
  file: File,
): Promise<ManuscriptUploadParseOk | ManuscriptUploadParseErr> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, code: "unauthorized" };
  }

  const base = supabaseFunctionsBaseUrl();
  const attempts = 2;

  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 800));
    }
    const form = new FormData();
    form.append("project_id", projectId);
    form.append("file", file);

    try {
      const res = await fetch(`${base}/${FN_NAME}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: form,
      });

      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.ok && body && body.ok === true && typeof body.manuscript_id === "string") {
        return {
          ok: true,
          manuscript_id: body.manuscript_id,
          extracted_char_count: Number(body.extracted_char_count) || 0,
          mime: typeof body.mime === "string" ? body.mime : "",
          byte_size: Number(body.byte_size) || 0,
        };
      }
      const code = typeof body?.error === "string" ? body.error : "unknown_error";
      return { ok: false, code };
    } catch {
      if (i === attempts - 1) return { ok: false, code: "network_error" };
    }
  }

  return { ok: false, code: "network_error" };
}
