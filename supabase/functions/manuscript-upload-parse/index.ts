import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import mammoth from "npm:mammoth@1.8.0";
import { Buffer } from "node:buffer";
import { extractText } from "npm:unpdf@0.12.1";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

/**
 * Upload-path intake: validate ownership, parse DOCX/PDF without LLM (no credits),
 * store binary + extracted UTF-8 text in Storage, upsert project_manuscripts.
 * Logs metadata only (no manuscript body).
 */

const MAX_BYTES = 10 * 1024 * 1024;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function normalizeMime(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  if (m === DOCX_MIME.toLowerCase()) return DOCX_MIME;
  if (m === PDF_MIME.toLowerCase()) return PDF_MIME;
  return null;
}

/** Browsers often send an empty `type` on file inputs; infer from extension. */
function normalizeMimeFromFileName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return PDF_MIME;
  if (lower.endsWith(".docx")) return DOCX_MIME;
  return null;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(arrayBuffer);
  const { value } = await mammoth.extractRawText({ buffer });
  return typeof value === "string" ? value : "";
}

async function parsePdf(bytes: Uint8Array): Promise<{ text: string; passwordProtected?: boolean }> {
  try {
    const { text } = await extractText(bytes);
    const t = Array.isArray(text)
      ? text.join("\n")
      : typeof text === "string"
        ? text
        : "";
    return { text: t };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    if (lower.includes("password") || lower.includes("encrypted")) {
      return { text: "", passwordProtected: true };
    }
    throw e;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const started = performance.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "server_misconfigured",
          has_url: Boolean(supabaseUrl),
          has_anon: Boolean(anonKey),
          has_service: Boolean(serviceKey),
        }),
      );
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
    }
    const jwt = authHeader.slice(7);

    const pub = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError,
    } = await pub.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
    }

    const adminEarly = createClient(supabaseUrl, serviceKey);
    const rlManuscript = await checkRateLimit(adminEarly, user.id, "manuscript-upload-parse");
    if (!rlManuscript.allowed) return rateLimitResponse(rlManuscript, CORS_HEADERS);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "invalid_payload", detail: "expected_multipart" }, 400);
    }

    const projectIdField = form.get("project_id");
    const projectId = typeof projectIdField === "string" ? projectIdField.trim() : "";
    const fileField = form.get("file");

    if (!projectId) {
      return json({ error: "invalid_payload", detail: "project_id" }, 400);
    }
    if (!(fileField instanceof Blob)) {
      return json({ error: "invalid_payload", detail: "file" }, 400);
    }

    const fileName = fileField instanceof File ? fileField.name : "upload";
    const mime =
      normalizeMime(fileField.type) ?? normalizeMimeFromFileName(fileName);
    if (!mime) {
      console.log(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "unsupported_mime",
          project_id: projectId,
          reported_type: fileField.type,
          file_name: fileName,
          duration_ms: Math.round(performance.now() - started),
        }),
      );
      return json({ error: "unsupported_mime" }, 415);
    }

    if (fileField.size > MAX_BYTES) {
      console.log(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "too_large",
          project_id: projectId,
          byte_size: fileField.size,
          duration_ms: Math.round(performance.now() - started),
        }),
      );
      return json({ error: "too_large" }, 413);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, user_id, content_source, structure_completed_at")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return json({ error: "project_not_found" }, 404);
    }
    if (project.user_id !== user.id) {
      return json({ error: "forbidden" }, 403);
    }
    if (!project.structure_completed_at) {
      return json({ error: "structure_not_complete" }, 400);
    }
    if (project.content_source !== "upload") {
      return json({ error: "wrong_content_source", detail: "upload_path_only" }, 400);
    }

    const { data: progress, error: progError } = await admin
      .from("project_content_progress")
      .select("current_phase")
      .eq("project_id", projectId)
      .maybeSingle();

    if (progError || !progress?.current_phase) {
      return json({ error: "progress_not_found" }, 400);
    }
    if (progress.current_phase !== "upload_alignment") {
      return json({ error: "wrong_phase", detail: "upload_alignment_only" }, 400);
    }

    const arrayBuffer = await fileField.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let plainText: string;
    try {
      if (mime === DOCX_MIME) {
        plainText = await parseDocx(arrayBuffer);
      } else {
        const r = await parsePdf(bytes);
        if (r.passwordProtected) {
          console.log(
            JSON.stringify({
              event: "manuscript_upload_parse",
              outcome: "password_pdf",
              project_id: projectId,
              duration_ms: Math.round(performance.now() - started),
            }),
          );
          return json({ error: "password_pdf" }, 422);
        }
        plainText = r.text;
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "parse_failed",
          project_id: projectId,
          mime,
          error_message: e instanceof Error ? e.message : String(e),
          error_stack: e instanceof Error ? e.stack : undefined,
          duration_ms: Math.round(performance.now() - started),
        }),
      );
      return json({ error: "parse_failed" }, 422);
    }

    const trimmed = plainText.replace(/\u00a0/g, " ").trim();
    if (!trimmed.length) {
      console.log(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "empty_extract",
          project_id: projectId,
          mime,
          duration_ms: Math.round(performance.now() - started),
        }),
      );
      return json({ error: "empty_extract" }, 422);
    }

    const checksum = await sha256Hex(bytes);
    const manuscriptId = crypto.randomUUID();
    const ext = mime === PDF_MIME ? ".pdf" : ".docx";
    const basePath = `${user.id}/${projectId}/${manuscriptId}`;
    const storagePath = `${basePath}${ext}`;
    const extractedTextPath = `${basePath}.extracted.txt`;

    const { data: prevRow, error: prevErr } = await admin
      .from("project_manuscripts")
      .select("storage_path, extracted_text_storage_path")
      .eq("project_id", projectId)
      .is("superseded_at", null)
      .maybeSingle();

    if (prevErr) {
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "db_manuscript_select",
          project_id: projectId,
          message: prevErr.message,
          code: prevErr.code,
        }),
      );
      return json(
        { error: "db_error", detail: "manuscript_select", hint: prevErr.code ?? prevErr.message },
        500,
      );
    }

    const { error: upBinErr } = await admin.storage.from("project-manuscripts").upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upBinErr) {
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "storage_upload_failed",
          project_id: projectId,
          message: upBinErr.message,
          duration_ms: Math.round(performance.now() - started),
        }),
      );
      return json({ error: "storage_failed", detail: upBinErr.message }, 500);
    }

    const textEncoder = new TextEncoder();
    const textBytes = textEncoder.encode(trimmed);
    const { error: upTxtErr } = await admin.storage.from("project-manuscripts").upload(extractedTextPath, textBytes, {
      contentType: "text/plain; charset=utf-8",
      upsert: false,
    });
    if (upTxtErr) {
      await admin.storage.from("project-manuscripts").remove([storagePath]);
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "storage_text_upload_failed",
          project_id: projectId,
          message: upTxtErr.message,
        }),
      );
      return json({ error: "storage_failed", detail: "text_upload" }, 500);
    }

    const byteSize = fileField.size;

    const { error: rpcErr } = await admin.rpc("obra_service_commit_manuscript", {
      p_user_id: user.id,
      p_project_id: projectId,
      p_id: manuscriptId,
      p_storage_path: storagePath,
      p_extracted_text_storage_path: extractedTextPath,
      p_mime: mime,
      p_byte_size: byteSize,
      p_checksum_sha256: checksum,
      p_extracted_char_count: trimmed.length,
    });

    if (rpcErr) {
      await admin.storage.from("project-manuscripts").remove([storagePath, extractedTextPath]);
      const msg = rpcErr.message ?? "";
      console.error(
        JSON.stringify({
          event: "manuscript_upload_parse",
          outcome: "rpc_commit_failed",
          project_id: projectId,
          message: msg,
          code: rpcErr.code,
        }),
      );
      if (msg.includes("forbidden")) {
        return json({ error: "forbidden" }, 403);
      }
      return json({ error: "db_error", detail: "manuscript_commit", hint: rpcErr.code ?? msg }, 500);
    }

    const oldPaths = prevRow
      ? [prevRow.storage_path, prevRow.extracted_text_storage_path].filter(
          (p): p is string => typeof p === "string" && p.length > 0,
        )
      : [];
    if (oldPaths.length > 0) {
      await admin.storage.from("project-manuscripts").remove(oldPaths);
    }

    const durationMs = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        event: "manuscript_upload_parse",
        outcome: "ok",
        project_id: projectId,
        manuscript_id: manuscriptId,
        mime,
        byte_size: byteSize,
        extracted_char_count: trimmed.length,
        duration_ms: durationMs,
      }),
    );

    return json({
      ok: true,
      manuscript_id: manuscriptId,
      extracted_char_count: trimmed.length,
      mime,
      byte_size: byteSize,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: "manuscript_upload_parse",
        outcome: "unhandled_exception",
        message,
        stack: e instanceof Error ? e.stack : undefined,
        duration_ms: Math.round(performance.now() - started),
      }),
    );
    return json({ error: "internal_error" }, 500);
  }
});
