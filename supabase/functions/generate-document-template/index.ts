import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";
import { callClaudeJsonText } from "../_shared/claude.ts";
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
 *   Phase 2: Chapter opener + body per chapter        (N parallel Claude calls)
 * Assembly: header + chapters + </body></html>
 *
 * Staleness is tracked via content_hash (djb2 over chapter titles + content).
 *
 * Concurrent invocations for the same ebook are rejected with HTTP 409
 * (`generation_in_progress`) when `SUPABASE_DB_URL` or `DATABASE_URL` is set
 * (direct Postgres session; see `_shared/shellGenerationLock.ts`).
 *
 * POST body: { projectId: string, ebookId: string }
 * Response:  { ok: true, htmlShell: string, shellMeta: ShellMeta }
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
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

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

  // ── Phase 1: Generate document header (CSS + cover + title page + TOC) ──────
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
  if (!headerResult.ok) return json({ error: headerResult.error }, 502);

  const headerHtml = extractTag(headerResult.text, "obra-header");
  if (!headerHtml) {
    console.error("generate_document_template: header extraction failed");
    return json({ error: "header_parse_failed" }, 502);
  }

  // ── Phase 2: Generate each chapter sequentially (avoids rate-limit bursts) ──
  const chapterResults: (string | null)[] = [];
  for (let idx = 0; idx < sorted.length; idx++) {
    const ch = sorted[idx]!;
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
    });
    chapterResults.push(r.ok ? extractTag(r.text, "obra-chapter") : null);
  }

  // Fail if any chapter failed to generate
  if (chapterResults.some((c) => c === null)) {
    console.error("generate_document_template: one or more chapter generations failed");
    return json({ error: "chapter_generation_failed" }, 502);
  }

  // ── Assembly ──────────────────────────────────────────────────────────────
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

  return json({ ok: true, htmlShell, shellMeta });
});
