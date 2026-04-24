import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { callClaudeJsonText, parseJsonObject } from "../_shared/claude.ts";
import { generateSplitProposalPrompt } from "../_shared/prompts.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import type { ContentLocale } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

/**
 * Upload path: read extracted manuscript text from Storage, call Claude to
 * propose chapter split (titles + start_heading markers). No credit debit —
 * credit logic is handled by approve-alignment on success.
 *
 * POST { project_id: string }
 * → { chapters: [{ order, title, start_heading }], warnings: string[] }
 */

const json = corsJson;

const CONTENT_LOCALES = ["es", "pt-BR", "en-US", "en-GB"] as const;

function parseContentLocale(raw: string | null | undefined): ContentLocale | null {
  if (!raw || typeof raw !== "string") return null;
  return (CONTENT_LOCALES as readonly string[]).includes(raw) ? (raw as ContentLocale) : null;
}

interface ProposedChapter {
  order: number;
  title: string;
  start_heading: string;
}

function parseProposedChapters(parsed: Record<string, unknown>): ProposedChapter[] | null {
  const chapters = parsed.chapters;
  if (!Array.isArray(chapters) || chapters.length === 0) return null;

  const result: ProposedChapter[] = [];
  for (const c of chapters) {
    if (typeof c !== "object" || c === null) return null;
    const row = c as Record<string, unknown>;
    const order = typeof row.order === "number" ? row.order : Number(row.order);
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const startHeading = typeof row.start_heading === "string" ? row.start_heading.trim() : "";
    if (!Number.isFinite(order) || !title || !startHeading) return null;
    result.push({ order, title, start_heading: startHeading });
  }

  result.sort((a, b) => a.order - b.order);
  return result;
}

function parseWarnings(parsed: Record<string, unknown>): string[] {
  const w = parsed.warnings;
  if (!Array.isArray(w)) return [];
  return w.filter((s): s is string => typeof s === "string");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const started = performance.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
    }
    const jwt = authHeader.slice(7);
    const pub = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await pub.auth.getUser(jwt);
    if (userError || !user) {
      return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
    }

    // ── Payload ───────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_payload", detail: "expected_json" }, 400);
    }
    const projectId = typeof body.project_id === "string" ? body.project_id.trim() : "";
    if (!projectId) return json({ error: "invalid_payload", detail: "project_id" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profileRow } = await admin
      .from("creator_profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if ((profileRow as { subscription_status?: string } | null)?.subscription_status !== "active") {
      return json({ error: "subscription_not_active" }, 403);
    }

    const rl = await checkRateLimit(admin, user.id, "ai-split-proposal");
    if (!rl.allowed) return rateLimitResponse(rl);

    // ── Project + ownership ───────────────────────────────────────────────
    const { data: project, error: projErr } = await admin
      .from("projects")
      .select("id, user_id, content_locale, content_source, topic, main_title, structure_completed_at")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !project) return json({ error: "project_not_found" }, 404);
    if (project.user_id !== user.id) return json({ error: "forbidden" }, 403);
    if (!project.structure_completed_at) return json({ error: "structure_not_complete" }, 400);
    if (project.content_source !== "upload") return json({ error: "upload_path_only" }, 400);

    const contentLocale = parseContentLocale(project.content_locale);
    if (!contentLocale) return json({ error: "invalid_locale" }, 400);

    // ── Phase check ───────────────────────────────────────────────────────
    const { data: progress, error: progErr } = await admin
      .from("project_content_progress")
      .select("current_phase")
      .eq("project_id", projectId)
      .maybeSingle();

    if (progErr || !progress) return json({ error: "progress_not_found" }, 400);
    if (progress.current_phase !== "upload_alignment") {
      return json({ error: "wrong_phase", detail: "upload_alignment_only" }, 400);
    }

    // ── Manuscript ────────────────────────────────────────────────────────
    const { data: manuscript, error: manErr } = await admin
      .from("project_manuscripts")
      .select("id, extracted_text_storage_path")
      .eq("project_id", projectId)
      .is("superseded_at", null)
      .maybeSingle();

    if (manErr || !manuscript?.extracted_text_storage_path) {
      return json({ error: "manuscript_not_found", detail: "upload_file_first" }, 400);
    }

    // ── Download extracted text ───────────────────────────────────────────
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("project-manuscripts")
      .download(manuscript.extracted_text_storage_path);

    if (dlErr || !fileBlob) {
      console.error(JSON.stringify({
        event: "ai_split_proposal",
        outcome: "storage_download_failed",
        project_id: projectId,
        message: dlErr?.message,
      }));
      return json({ error: "storage_failed", detail: "text_download" }, 500);
    }

    const manuscriptText = await fileBlob.text();
    if (!manuscriptText.trim()) {
      return json({ error: "empty_manuscript" }, 422);
    }

    const wordCount = manuscriptText.trim().split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 100) {
      return json({ error: "manuscript_too_short", word_count: wordCount }, 422);
    }

    // ── Main ebook title ──────────────────────────────────────────────────
    const { data: mainEbook } = await admin
      .from("ebooks")
      .select("title")
      .eq("project_id", projectId)
      .eq("type", "main")
      .maybeSingle();

    const mainEbookTitle = mainEbook?.title ?? project.main_title ?? "";

    // ── Build prompt + call Claude ────────────────────────────────────────
    const prompt = generateSplitProposalPrompt({
      manuscript_text: manuscriptText,
      main_ebook_title: mainEbookTitle,
      topic: project.topic ?? "",
      content_locale: contentLocale,
    });

    const claudeResult = await callClaudeJsonText({
      system: prompt.system,
      user: prompt.user,
      maxTokens: 1500,
      temperature: 0.3,
    });

    if (!claudeResult.ok) {
      console.error(JSON.stringify({
        event: "ai_split_proposal",
        outcome: claudeResult.error,
        project_id: projectId,
        duration_ms: Math.round(performance.now() - started),
      }));
      return json({ error: claudeResult.error }, 502);
    }

    // ── Parse response ────────────────────────────────────────────────────
    const parsed = parseJsonObject(claudeResult.text);
    if (!parsed.ok) {
      console.error(JSON.stringify({
        event: "ai_split_proposal",
        outcome: "parse_failed",
        project_id: projectId,
      }));
      return json({ error: "invalid_response", detail: "json_parse" }, 502);
    }

    if (parsed.value.error) {
      return json({ error: "model_invalid_input", reason: parsed.value.reason ?? null }, 422);
    }

    const chapters = parseProposedChapters(parsed.value);
    if (!chapters) {
      return json({ error: "invalid_response", detail: "chapters_schema" }, 502);
    }

    const warnings = parseWarnings(parsed.value);

    console.log(JSON.stringify({
      event: "ai_split_proposal",
      outcome: "ok",
      project_id: projectId,
      chapter_count: chapters.length,
      warning_count: warnings.length,
      duration_ms: Math.round(performance.now() - started),
    }));

    return json({ chapters, warnings });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({
      event: "ai_split_proposal",
      outcome: "unhandled_exception",
      message,
      duration_ms: Math.round(performance.now() - started),
    }));
    return json({ error: "internal_error" }, 500);
  }
});
