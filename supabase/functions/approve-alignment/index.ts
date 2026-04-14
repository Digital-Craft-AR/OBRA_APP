import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";

/**
 * Upload path: approve the aligned chapter structure.
 * 1. Read extracted manuscript text from Storage.
 * 2. Slice text between start_heading markers → per-chapter body.
 * 3. Convert plain text → sanitized HTML (Tiptap-compatible).
 * 4. Replace existing chapters with prefill content.
 * 5. Save minimal index_json on the ebook.
 * 6. Advance project_content_progress to main_chapter phase.
 *
 * POST {
 *   project_id: string,
 *   chapters: [{ order: number, title: string, start_heading: string }]
 * }
 * → { ok: true, chapter_count: number, first_chapter_id: string }
 */

const json = corsJson;

interface AlignedChapter {
  order: number;
  title: string;
  start_heading: string;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert a plain-text chapter body to Tiptap-compatible HTML.
 * Rules:
 *  - Blocks separated by double newlines → distinct elements
 *  - Single short line (≤80 chars, no internal newlines) → <h2>
 *  - Everything else → <p> (internal single newlines → <br>)
 */
function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return "<p></p>";

  const blocks = normalized.split(/\n{2,}/).map((b) => b.trim()).filter((b) => b.length > 0);
  if (blocks.length === 0) return "<p></p>";

  const parts: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length === 1 && block.length <= 80) {
      // Short standalone line → subheading
      parts.push(`<h2>${escHtml(block)}</h2>`);
    } else if (lines.length > 1) {
      // Multi-line block → paragraph with line breaks
      const content = lines
        .map((l) => escHtml(l.trim()))
        .filter((l) => l.length > 0)
        .join("<br>");
      parts.push(`<p>${content}</p>`);
    } else {
      parts.push(`<p>${escHtml(block)}</p>`);
    }
  }

  return parts.join("") || "<p></p>";
}

// ── Text slicing ──────────────────────────────────────────────────────────────

/**
 * Slice the full manuscript text into per-chapter bodies using start_heading
 * markers. Each chapter body = text from after its heading to just before the
 * next chapter's heading (or end of text for the last chapter).
 * The heading line itself is stripped from the body.
 */
function sliceChapterBodies(fullText: string, chapters: AlignedChapter[]): string[] {
  // Build sorted list of (index-in-text, chapter-index) pairs
  const positions: Array<{ textIdx: number; chapterIdx: number }> = [];
  const lowerFull = fullText.toLowerCase();

  for (let i = 0; i < chapters.length; i++) {
    const heading = chapters[i].start_heading.toLowerCase();
    const found = lowerFull.indexOf(heading);
    if (found !== -1) {
      positions.push({ textIdx: found, chapterIdx: i });
    } else {
      console.warn(`approve_alignment: start_heading not found for chapter order=${chapters[i].order}`);
      // Mark as -1; handled below
      positions.push({ textIdx: -1, chapterIdx: i });
    }
  }

  const bodies: string[] = new Array(chapters.length).fill("");

  for (let i = 0; i < positions.length; i++) {
    const { textIdx, chapterIdx } = positions[i];
    if (textIdx === -1) continue; // heading not found → empty body

    // Skip past the heading line itself
    const headingLength = chapters[chapterIdx].start_heading.length;
    let bodyStart = textIdx + headingLength;
    // Skip newlines immediately after heading
    while (bodyStart < fullText.length && (fullText[bodyStart] === "\n" || fullText[bodyStart] === "\r")) {
      bodyStart++;
    }

    // Find end: start of next chapter's heading (or EOF)
    let bodyEnd = fullText.length;
    for (let j = i + 1; j < positions.length; j++) {
      if (positions[j].textIdx !== -1) {
        bodyEnd = positions[j].textIdx;
        break;
      }
    }

    bodies[chapterIdx] = fullText.slice(bodyStart, bodyEnd).trim();
  }

  return bodies;
}

// ── Minimal index_json ────────────────────────────────────────────────────────

/**
 * Build a minimal index_json for the ebook.
 * The content phase reads this for AI generation context.
 * In the upload path there's no narrative_arc or key_concepts — just titles.
 * word_count_target is estimated from actual body length (≈1.3 chars/word).
 */
function buildMinimalIndexJson(chapters: AlignedChapter[], bodies: string[]): string {
  const chapterEntries = chapters.map((ch, i) => {
    const body = bodies[i] ?? "";
    const wordCountEstimate = Math.max(300, Math.round(body.length / 5.5 / 100) * 100);
    return {
      number: ch.order,
      title: ch.title,
      description: null,
      key_concepts: [] as string[],
      word_count_target: wordCountEstimate,
    };
  });

  return JSON.stringify({ narrative_arc: null, chapters: chapterEntries });
}

// ── Main handler ──────────────────────────────────────────────────────────────

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

    // ── Auth ────────────────────────────────────────────────────────────
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

    // ── Payload ─────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return json({ error: "invalid_payload", detail: "expected_json" }, 400);
    }

    const projectId = typeof body.project_id === "string" ? body.project_id.trim() : "";
    if (!projectId) return json({ error: "invalid_payload", detail: "project_id" }, 400);

    const rawChapters = body.chapters;
    if (!Array.isArray(rawChapters) || rawChapters.length === 0) {
      return json({ error: "invalid_payload", detail: "chapters_required" }, 400);
    }

    const chapters: AlignedChapter[] = [];
    for (const c of rawChapters) {
      if (typeof c !== "object" || c === null) {
        return json({ error: "invalid_payload", detail: "chapter_schema" }, 400);
      }
      const row = c as Record<string, unknown>;
      const order = typeof row.order === "number" ? row.order : Number(row.order);
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const startHeading = typeof row.start_heading === "string" ? row.start_heading.trim() : "";
      if (!Number.isFinite(order) || order < 1 || !title || !startHeading) {
        return json({ error: "invalid_payload", detail: "chapter_schema" }, 400);
      }
      chapters.push({ order, title, start_heading: startHeading });
    }
    chapters.sort((a, b) => a.order - b.order);

    const admin = createClient(supabaseUrl, serviceKey);

    // ── Project + ownership ──────────────────────────────────────────────
    const { data: project, error: projErr } = await admin
      .from("projects")
      .select("id, user_id, content_source, structure_completed_at")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !project) return json({ error: "project_not_found" }, 404);
    if (project.user_id !== user.id) return json({ error: "forbidden" }, 403);
    if (project.content_source !== "upload") return json({ error: "upload_path_only" }, 400);

    // ── Phase check ──────────────────────────────────────────────────────
    const { data: progress, error: progErr } = await admin
      .from("project_content_progress")
      .select("current_phase")
      .eq("project_id", projectId)
      .maybeSingle();

    if (progErr || !progress) return json({ error: "progress_not_found" }, 400);
    if (progress.current_phase !== "upload_alignment") {
      return json({ error: "wrong_phase", detail: "upload_alignment_only" }, 400);
    }

    // ── Manuscript text ──────────────────────────────────────────────────
    const { data: manuscript, error: manErr } = await admin
      .from("project_manuscripts")
      .select("extracted_text_storage_path")
      .eq("project_id", projectId)
      .is("superseded_at", null)
      .maybeSingle();

    if (manErr || !manuscript?.extracted_text_storage_path) {
      return json({ error: "manuscript_not_found" }, 400);
    }

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("project-manuscripts")
      .download(manuscript.extracted_text_storage_path);

    if (dlErr || !fileBlob) {
      return json({ error: "storage_failed", detail: "text_download" }, 500);
    }
    const manuscriptText = await fileBlob.text();

    // ── Main ebook ───────────────────────────────────────────────────────
    const { data: mainEbook, error: ebookErr } = await admin
      .from("ebooks")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "main")
      .maybeSingle();

    if (ebookErr || !mainEbook) return json({ error: "ebook_not_found" }, 400);
    const ebookId = mainEbook.id as string;

    // ── Slice + convert ──────────────────────────────────────────────────
    const bodies = sliceChapterBodies(manuscriptText, chapters);
    const htmlBodies = bodies.map((b) => plainTextToHtml(b));

    // ── Replace chapters ─────────────────────────────────────────────────
    // Delete all existing chapters for this ebook first
    const { error: delErr } = await admin
      .from("chapters")
      .delete()
      .eq("ebook_id", ebookId);

    if (delErr) {
      console.error(JSON.stringify({
        event: "approve_alignment",
        outcome: "chapters_delete_failed",
        project_id: projectId,
        message: delErr.message,
      }));
      return json({ error: "db_error", detail: "chapters_delete" }, 500);
    }

    // Insert new chapters with prefill
    const chapterRows = chapters.map((ch, i) => ({
      ebook_id: ebookId,
      sort_order: ch.order,
      title: ch.title,
      content: htmlBodies[i],
    }));

    const { data: insertedChapters, error: insErr } = await admin
      .from("chapters")
      .insert(chapterRows)
      .select("id, sort_order");

    if (insErr || !insertedChapters?.length) {
      console.error(JSON.stringify({
        event: "approve_alignment",
        outcome: "chapters_insert_failed",
        project_id: projectId,
        message: insErr?.message,
      }));
      return json({ error: "db_error", detail: "chapters_insert" }, 500);
    }

    insertedChapters.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
    const firstChapterId = insertedChapters[0].id as string;

    // ── Save minimal index_json on ebook ─────────────────────────────────
    const indexJson = buildMinimalIndexJson(chapters, bodies);
    await admin
      .from("ebooks")
      .update({ index_json: indexJson })
      .eq("id", ebookId);
    // Best-effort: don't fail if this update errors

    // ── Advance content phase ────────────────────────────────────────────
    const { error: phaseErr } = await admin
      .from("project_content_progress")
      .update({
        current_phase: "main_chapter",
        main_index_frozen_at: new Date().toISOString(),
        current_ebook_id: ebookId,
        current_chapter_id: firstChapterId,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId);

    if (phaseErr) {
      console.error(JSON.stringify({
        event: "approve_alignment",
        outcome: "phase_update_failed",
        project_id: projectId,
        message: phaseErr.message,
      }));
      return json({ error: "db_error", detail: "phase_update" }, 500);
    }

    const durationMs = Math.round(performance.now() - started);
    console.log(JSON.stringify({
      event: "approve_alignment",
      outcome: "ok",
      project_id: projectId,
      ebook_id: ebookId,
      chapter_count: chapters.length,
      duration_ms: durationMs,
    }));

    return json({ ok: true, chapter_count: chapters.length, first_chapter_id: firstChapterId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({
      event: "approve_alignment",
      outcome: "unhandled_exception",
      message,
      duration_ms: Math.round(performance.now() - started),
    }));
    return json({ error: "internal_error" }, 500);
  }
});
