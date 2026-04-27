import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";
import { runWithShellGenerationPgAdvisoryLock } from "../_shared/shellGenerationLock.ts";
import { callClaudeJsonText, parseJsonObject } from "../_shared/claude.ts";
import { generateDocumentTemplatePrompt } from "../_shared/prompts.ts";
import type { ArtifactType } from "../_shared/prompts.ts";
import type { ContentLocale } from "../_shared/prompts.ts";

/**
 * Generates the HTML shell for a single ebook artifact using Claude.
 *
 * The shell contains placeholders ({{TOC_ENTRIES}}, {{CHAPTER_N_TITLE}},
 * {{CHAPTER_N_CONTENT}}) and .obra-image-slot divs with data-slot-description.
 * The client calls injectAll() to hydrate it before rendering in the iframe.
 *
 * Saves html_shell + shell_meta to ebooks row so subsequent loads can skip
 * regeneration unless chapter count or page config changed (staleness check).
 *
 * Concurrent invocations for the same ebook are rejected with HTTP 409
 * (`generation_in_progress`) when `SUPABASE_DB_URL` or `DATABASE_URL` is set
 * (direct Postgres session; see `_shared/shellGenerationLock.ts`).
 *
 * POST body: { projectId: string, ebookId: string }
 * Response: { ok: true, htmlShell: string, shellMeta: ShellMeta }
 */

const json = corsJson;

type ShellMeta = {
  chapter_count: number;
  page_size: string;
  page_orientation: string;
  generated_at: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user?.id) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

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

  // Load project — verify ownership
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, author, content_locale, design_config")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr || !project) return json({ error: "not_found" }, 404);
  if (project.user_id !== userId) return json({ error: "forbidden" }, 403);

  // Load ebook
  const { data: ebook, error: ebookErr } = await admin
    .from("ebooks")
    .select("id, title, type, package_ordinal")
    .eq("id", ebookId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (ebookErr || !ebook) return json({ error: "ebook_not_found" }, 404);

  // Load chapters (titles only — content is injected client-side)
  const { data: chaptersData, error: chaptersErr } = await admin
    .from("chapters")
    .select("id, title, sort_order")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (chaptersErr) return json({ error: "db_error" }, 500);
  const chapters = (chaptersData ?? []) as Array<{ id: string; title: string; sort_order: number }>;

  if (chapters.length === 0) {
    return json({ error: "no_chapters", detail: "Ebook has no chapters yet" }, 422);
  }

  return await runWithShellGenerationPgAdvisoryLock(ebookId, async () => {
    // Parse design_config
    const dc = (project.design_config ?? {}) as Record<string, unknown>;
    const palette = (dc.palette as { primary: string; secondary: string; accent: string } | null) ?? {
      primary: "#204970",
      secondary: "#e8f0f7",
      accent: "#c8e62b",
    };
    const fonts = (dc.fonts as { heading: string; body: string } | null) ?? {
      heading: "Fraunces",
      body: "Plus Jakarta Sans",
    };
    const page = (dc.page as { size: string; orientation: string } | null) ?? {
      size: "a4",
      orientation: "portrait",
    };

    // Build chapter titles array
    const chapterTitles = chapters
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ch) => ch.title);

    const artifactTypeMap: Record<string, ArtifactType> = {
      main: "main_ebook",
      bonus: "bonus",
      order_bump: "bump",
    };
    const artifactType: ArtifactType = artifactTypeMap[ebook.type as string] ?? "main_ebook";

    const { system, user } = generateDocumentTemplatePrompt({
      content_locale: (project.content_locale as ContentLocale) ?? "es",
      artifact_type: artifactType,
      title: typeof ebook.title === "string" ? ebook.title : "Ebook",
      author: typeof project.author === "string" && project.author ? project.author : null,
      chapter_titles: JSON.stringify(chapterTitles),
      palette: JSON.stringify(palette),
      fonts: JSON.stringify(fonts),
      page: JSON.stringify(page),
    });

    const claudeResult = await callClaudeJsonText({
      system,
      user,
      maxTokens: 8192,
      temperature: 0.2,
    });

    if (!claudeResult.ok) {
      return json({ error: claudeResult.error }, 502);
    }

    const parsed = parseJsonObject(claudeResult.text);
    if (!parsed.ok) {
      console.error("generate_document_template_parse_failed");
      return json({ error: "parse_failed" }, 502);
    }

    if ("error" in parsed.value) {
      return json({ error: "invalid_input", detail: parsed.value.message }, 422);
    }

    const htmlShell = parsed.value.html;
    if (typeof htmlShell !== "string" || !htmlShell.trim()) {
      return json({ error: "empty_shell" }, 502);
    }

    const shellMeta: ShellMeta = {
      chapter_count: chapters.length,
      page_size: page.size,
      page_orientation: page.orientation,
      generated_at: new Date().toISOString(),
    };

    // Persist to ebooks row — touch updated_at so export-pdf-queue invalidates its cache
    await admin
      .from("ebooks")
      .update({ html_shell: htmlShell, shell_meta: shellMeta, updated_at: new Date().toISOString() })
      .eq("id", ebookId);

    return json({ ok: true, htmlShell, shellMeta });
  });
});
