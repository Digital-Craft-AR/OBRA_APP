import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions, CORS_HEADERS } from "../_shared/cors.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";
import { callClaudeJsonText, getClaudeChapterModel } from "../_shared/claude.ts";
import {
  generateDocumentHeaderPrompt,
  generateChapterHtmlPrompt,
} from "../_shared/prompts.ts";
import type { ArtifactType, ContentLocale } from "../_shared/prompts.ts";

/**
 * Generates a complete editorial HTML document for a single ebook artifact.
 *
 * Uses a two-phase approach to avoid output token limits:
 *   Phase 1: CSS toolkit + cover + title page + TOC  (1 Claude call)
 *   Phase 2: Chapter opener + body per chapter        (N sequential Claude calls)
 * Assembly: header + chapters + </body></html>
 *
 * Returns a streaming NDJSON response to avoid Supabase's 150s idle timeout.
 * Each line is a JSON object:
 *   { type: "ping", ... }  — keepalive (sent after each phase/chapter)
 *   { type: "done", htmlShell: string, shellMeta: ShellMeta }
 *   { type: "error", error: string, status?: number }
 *
 * Staleness is tracked via content_hash (djb2 over chapter titles + content).
 *
 * POST body: { projectId: string, ebookId: string }
 */

const json = corsJson;

type ShellMeta = {
  chapter_count: number;
  page_size: string;
  page_orientation: string;
  content_hash: string;
  generated_at: string;
};

function hashChapters(chapters: Array<{ title: string; content: string | null }>): string {
  const str = chapters.map((c) => `${c.title}|||${c.content ?? ""}`).join("^^^");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash | 0;
  }
  return (hash >>> 0).toString(16);
}

function extractTag(text: string, tag: string): string | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const contentStart = start + open.length;
  const end = text.indexOf(close, contentStart);
  // If closing tag is missing (truncated), use everything after opening tag
  const raw = end === -1 ? text.slice(contentStart) : text.slice(contentStart, end);
  return raw.trim() || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!jwt) {
    console.error("generate-document-template: missing_bearer", { authHeader: authHeader ? "[present but not Bearer]" : "[empty]" });
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }

  const pub = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await pub.auth.getUser(jwt);
  if (authError || !user) {
    console.error("generate-document-template: getUser failed", { errorMessage: authError?.message, hasUser: !!user });
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }
  const userId = user.id;

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return json({ error: "invalid_json" }, 400); }

  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const ebookId = typeof body.ebookId === "string" ? body.ebookId : null;
  if (!projectId || !ebookId) {
    return json({ error: "missing_params", detail: "projectId + ebookId required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profileRow } = await admin
    .from("creator_profiles")
    .select("subscription_status, subscription_access_until")
    .eq("id", userId)
    .maybeSingle();
  if (!isSubscriptionEntitled(profileRow as { subscription_status?: string; subscription_access_until?: string | null } | null)) {
    return json({ error: "subscription_not_active" }, 403);
  }


  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, author, content_locale, design_config")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr || !project) return json({ error: "not_found" }, 404);
  if (project.user_id !== userId) return json({ error: "forbidden" }, 403);

  const { data: ebook, error: ebookErr } = await admin
    .from("ebooks")
    .select("id, title, type")
    .eq("id", ebookId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (ebookErr || !ebook) return json({ error: "ebook_not_found" }, 404);

  const { data: chaptersData, error: chaptersErr } = await admin
    .from("chapters")
    .select("id, title, sort_order, content")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });
  if (chaptersErr) return json({ error: "db_error" }, 500);

  const chapters = (chaptersData ?? []).map((ch) => ({
    title: typeof ch.title === "string" ? ch.title : "",
    sort_order: typeof ch.sort_order === "number" ? ch.sort_order : 0,
    content: typeof ch.content === "string" ? ch.content : null,
  }));

  if (chapters.length === 0) {
    return json({ error: "no_chapters", detail: "Ebook has no chapters yet" }, 422);
  }

  const sorted = [...chapters].sort((a, b) => a.sort_order - b.sort_order);

  const dc = (project.design_config ?? {}) as Record<string, unknown>;
  const palette = (dc.palette as { primary: string; secondary: string; accent: string } | null) ?? {
    primary: "#204970", secondary: "#e8f0f7", accent: "#c8e62b",
  };
  const fonts = (dc.fonts as { heading: string; body: string } | null) ?? {
    heading: "Fraunces", body: "Plus Jakarta Sans",
  };
  const page = (dc.page as { size: string; orientation: string } | null) ?? {
    size: "a4", orientation: "portrait",
  };

  const artifactTypeMap: Record<string, ArtifactType> = {
    main: "main_ebook", bonus: "bonus", order_bump: "bump",
  };
  const artifactType: ArtifactType = artifactTypeMap[ebook.type as string] ?? "main_ebook";
  const locale = (project.content_locale as ContentLocale) ?? "es";
  const title = typeof ebook.title === "string" ? ebook.title : "Ebook";
  const author = typeof project.author === "string" && project.author ? project.author : null;

  // ── Streaming NDJSON response ─────────────────────────────────────────────
  // Each line is a JSON object. Sending bytes after each phase/chapter prevents
  // Supabase's 150s idle timeout from firing on long documents.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const send = (data: Record<string, unknown>): Promise<void> =>
    writer.write(enc.encode(JSON.stringify(data) + "\n"));

  (async () => {
    try {
      // ── Phase 1: Generate document header (CSS + cover + title page + TOC) ──
      const headerPrompt = generateDocumentHeaderPrompt({
        content_locale: locale,
        artifact_type: artifactType,
        title,
        author,
        chapter_titles: sorted.map((ch) => ch.title),
        palette,
        fonts,
        page,
      });

      const headerResult = await callClaudeJsonText({
        system: headerPrompt.system,
        user: headerPrompt.user,
        maxTokens: 8192,
        temperature: 0.3,
      });
      if (!headerResult.ok) {
        await send({ type: "error", error: headerResult.error, status: 502 });
        return;
      }

      const headerHtml = extractTag(headerResult.text, "obra-header");
      if (!headerHtml) {
        console.error("generate_document_template: header extraction failed");
        await send({ type: "error", error: "header_parse_failed", status: 502 });
        return;
      }

      await send({ type: "ping", phase: 1 });

      // ── Phase 2: Generate chapters in parallel (reduces total wall-clock time) ──
      // A periodic ping keeps the idle timer alive during parallel HTTP waits.
      let chaptersDone = 0;
      const pingTimer = setInterval(() => {
        send({ type: "ping", chapters_done: chaptersDone, total: sorted.length }).catch(() => {});
      }, 20_000);

      let chapterResults: (string | null)[] = [];
      try {
        chapterResults = await Promise.all(
          sorted.map(async (ch, idx) => {
            const prompt = generateChapterHtmlPrompt({
              content_locale: locale,
              chapter_number: idx + 1,
              chapter_total: sorted.length,
              chapter_title: ch.title,
              chapter_content: ch.content ?? "<p>—</p>",
              palette,
              fonts,
            });
            const r = await callClaudeJsonText({
              system: prompt.system,
              user: prompt.user,
              maxTokens: 8192,
              temperature: 0.4,
              model: getClaudeChapterModel(),
            });
            chaptersDone++;
            return r.ok ? extractTag(r.text, "obra-chapter") : null;
          }),
        );
      } finally {
        clearInterval(pingTimer);
      }

      await send({ type: "ping", chapters_done: sorted.length, total: sorted.length });

      if (chapterResults.some((c) => c === null)) {
        console.error("generate_document_template: one or more chapter generations failed");
        await send({ type: "error", error: "chapter_generation_failed", status: 502 });
        return;
      }

      // ── Assembly ───────────────────────────────────────────────────────────
      const htmlShell = [
        headerHtml,
        ...chapterResults,
        "</body>",
        "</html>",
      ].join("\n");

      const contentHash = hashChapters(sorted);
      const shellMeta: ShellMeta = {
        chapter_count: sorted.length,
        page_size: page.size,
        page_orientation: page.orientation,
        content_hash: contentHash,
        generated_at: new Date().toISOString(),
      };

      await admin
        .from("ebooks")
        .update({ html_shell: htmlShell, shell_meta: shellMeta, updated_at: new Date().toISOString() })
        .eq("id", ebookId);

      await send({ type: "done", htmlShell, shellMeta });
    } catch (e) {
      try {
        await send({ type: "error", error: String(e), status: 500 });
      } catch { /* writer may already be closed */ }
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      ...CORS_HEADERS,
    },
  });
});
