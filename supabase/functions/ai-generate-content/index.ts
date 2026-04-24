import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { callClaudeJsonText, parseJsonObject } from "../_shared/claude.ts";
import { parseDesignConfigForAi } from "../_shared/designConfig.ts";
import { generateChapterPrompt, generateBonusChapterPrompt, generateBumpChapterPrompt } from "../_shared/prompts.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import type { ContentLocale } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

/**
 * Generates chapter body (sanitized rich HTML) for the main ebook on the AI path.
 * Validates JWT, frozen index gates, ownership, debits credits idempotently.
 * Prefers `ebooks.index_json` from ai-generate-index; if missing, synthesizes a minimal
 * outline from persisted chapter titles (then backfills `index_json` best-effort).
 */
const json = corsJson;

type AdminClient = ReturnType<typeof createClient>;

function indexJsonStringFromRow(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "null") return null;
    try {
      const p = JSON.parse(t) as { chapters?: unknown };
      if (!Array.isArray(p.chapters) || p.chapters.length === 0) return null;
    } catch {
      return null;
    }
    return t;
  }
  if (typeof raw === "object") {
    const o = raw as { chapters?: unknown };
    if (Array.isArray(o.chapters) && o.chapters.length > 0) {
      return JSON.stringify(raw);
    }
    return null;
  }
  return null;
}

/**
 * When `index_json` was never saved (or only `{}`), build a minimal structure from chapter
 * rows so prompts can run, and persist it for subsequent calls.
 */
async function resolveIndexJsonForGeneration(
  admin: AdminClient,
  ebookId: string,
  ebookType: string,
  rawIndexJson: unknown,
): Promise<{ jsonString: string; backfilled: boolean } | null> {
  const direct = indexJsonStringFromRow(rawIndexJson);
  if (direct) return { jsonString: direct, backfilled: false };

  const { data: rows, error } = await admin
    .from("chapters")
    .select("sort_order, title")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (error || !rows?.length) return null;

  const wordDefault = ebookType === "bonus" ? 900 : 1200;
  const chapters = rows
    .map((r) => {
      const sortOrder = Number(r.sort_order);
      const title = String(r.title ?? "").trim() || " ";
      if (!Number.isFinite(sortOrder) || sortOrder < 1) return null;
      return {
        number: sortOrder,
        title,
        description:
          `Develop "${title}" with concrete examples tied to the reader avatar and ebook topic.`,
        key_concepts: [`Core ideas for: ${title}`, "Practical application for the reader"],
        word_count_target: wordDefault,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (chapters.length === 0) return null;

  const payload = {
    narrative_arc:
      "Synthesized from confirmed chapter titles (full AI outline was missing). Regenerate the outline in Content to replace this placeholder.",
    chapters,
  };
  const jsonString = JSON.stringify(payload);
  const { error: saveErr } = await admin.from("ebooks").update({ index_json: payload }).eq("id", ebookId);
  if (saveErr) {
    console.error("index_json_backfill_save_failed", saveErr.message);
  } else {
    console.warn("index_json_backfilled_from_chapters", { ebookId, chapterCount: chapters.length });
  }
  return { jsonString, backfilled: true };
}

/** Returned with `chapter_not_found` so local devs know why rows are missing. */
const CHAPTER_LOOKUP_HINT =
  "Edge functions use SUPABASE_URL from their environment. If `supabase functions serve` points at the local API (127.0.0.1) while the app uses your hosted project, the function queries an empty local DB — copy the same SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY as in obra/.env into supabase/functions/.env (or link the project) so both hit one database.";

const CONTENT_LOCALES = ["es", "pt-BR", "en-US", "en-GB"] as const;

function parseContentLocale(raw: string | null | undefined): ContentLocale | null {
  if (!raw || typeof raw !== "string") return null;
  return (CONTENT_LOCALES as readonly string[]).includes(raw) ? (raw as ContentLocale) : null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stubChapterBodyHtml(
  contentLocale: string,
  chapterTitle: string,
  artifactTitle: string,
  topic: string | null,
): string {
  const ch = esc(chapterTitle.trim() || "Chapter");
  const book = esc(artifactTitle.trim() || topic?.trim() || "Your ebook");
  const loc = contentLocale.toLowerCase();
  if (loc.startsWith("pt")) {
    return [
      `<h2>${ch}</h2>`,
      `<p>Este é um rascunho gerado automaticamente para <strong>${book}</strong>.</p>`,
      `<h3>Visão geral</h3>`,
      `<p>O conteúdo completo será gerado pela IA em uma versão futura. Por enquanto, use este texto como estrutura e edite à vontade.</p>`,
      `<h3>Pontos principais</h3>`,
      `<ul>`,
      `<li>Ideia central alinhada ao título do capítulo</li>`,
      `<li>Exemplos e detalhes virão na versão final</li>`,
      `</ul>`,
      `<h3>Próximos passos</h3>`,
      `<p>Revise, salve e aprove quando estiver satisfeito.</p>`,
    ].join("");
  }
  if (loc.startsWith("en")) {
    return [
      `<h2>${ch}</h2>`,
      `<p>This is an auto-generated draft for <strong>${book}</strong>.</p>`,
      `<h3>Overview</h3>`,
      `<p>Full AI-generated copy will arrive in a future release. Use this as a scaffold and edit freely.</p>`,
      `<h3>Key points</h3>`,
      `<ul>`,
      `<li>Core idea aligned with the chapter title</li>`,
      `<li>Examples and depth will follow in the final version</li>`,
      `</ul>`,
      `<h3>Next steps</h3>`,
      `<p>Review, save, and approve when ready.</p>`,
    ].join("");
  }
  return [
    `<h2>${ch}</h2>`,
    `<p>Este es un borrador generado automáticamente para <strong>${book}</strong>.</p>`,
    `<h3>Resumen</h3>`,
    `<p>El contenido completo lo generará la IA en una versión futura. Usá este texto como esquema y editá con libertad.</p>`,
    `<h3>Ideas clave</h3>`,
    `<ul>`,
    `<li>Idea central alineada al título del capítulo</li>`,
    `<li>Ejemplos y profundidad llegarán en la versión final</li>`,
    `</ul>`,
    `<h3>Próximos pasos</h3>`,
    `<p>Revisá, guardá y aprobá cuando esté listo.</p>`,
  ].join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptions();
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey) {
    return json({ error: "server_misconfigured", detail: "supabase_auth" }, 500);
  }
  if (!serviceKey) {
    return json({ error: "server_misconfigured", detail: "service_role" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  const payload = await req.json().catch(() => null);
  const projectId = typeof payload?.project_id === "string" ? payload.project_id : null;
  const chapterId = typeof payload?.chapter_id === "string" ? payload.chapter_id : null;
  const clientRequestId = typeof payload?.client_request_id === "string" ? payload.client_request_id : null;

  if (!projectId || !chapterId) {
    return json({ error: "invalid_payload", detail: "project_id_and_chapter_id" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profileRow } = await admin
    .from("creator_profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if ((profileRow as { subscription_status?: string } | null)?.subscription_status !== "active") {
    return json({ error: "subscription_not_active" }, 403);
  }

  const rl = await checkRateLimit(admin, user.id, "ai-generate-content");
  if (!rl.allowed) return rateLimitResponse(rl);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select(
      "id, user_id, content_source, content_locale, main_title, topic, problem, target_avatar, structure_completed_at, design_config",
    )
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
  if (project.content_source !== "ai") {
    return json({ error: "wrong_content_source", detail: "ai_path_only" }, 400);
  }

  const { data: chapter, error: chErr } = await admin
    .from("chapters")
    .select("id, title, sort_order, ebook_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (chErr) {
    console.error("chapter_lookup_failed", chErr.message, { projectId, chapterId });
    return json(
      { error: "chapter_not_found", detail: "lookup_failed", hint: CHAPTER_LOOKUP_HINT },
      404,
    );
  }
  if (!chapter) {
    console.error("chapter_not_found_no_row", {
      projectId,
      chapterId,
      supabaseHost: (() => {
        try {
          return new URL(supabaseUrl).host;
        } catch {
          return "invalid_url";
        }
      })(),
    });
    return json(
      { error: "chapter_not_found", detail: "no_row", hint: CHAPTER_LOOKUP_HINT },
      404,
    );
  }
  if (!chapter.ebook_id) {
    return json(
      { error: "chapter_not_found", detail: "missing_ebook_id", hint: CHAPTER_LOOKUP_HINT },
      404,
    );
  }

  const { data: ebook, error: ebErr } = await admin
    .from("ebooks")
    .select("id, type, project_id, title, index_json")
    .eq("id", chapter.ebook_id as string)
    .maybeSingle();

  if (ebErr) {
    const msg = ebErr.message ?? String(ebErr);
    console.error("ebook_lookup_failed", msg, { ebookId: chapter.ebook_id });
    const schemaHint =
      /index_json|column.*does not exist|42703/i.test(msg)
        ? "The hosted database is missing column public.ebooks.index_json. Apply migration 20260422000000_ebooks_index_json.sql (or run pending Supabase migrations), then retry."
        : CHAPTER_LOOKUP_HINT;
    return json(
      {
        error: "ebook_lookup_failed",
        detail: msg.slice(0, 400),
        hint: schemaHint,
      },
      500,
    );
  }
  if (!ebook) {
    console.error("ebook_row_missing", { ebookId: chapter.ebook_id, chapterId });
    return json(
      {
        error: "chapter_not_found",
        detail: "ebook_missing",
        hint: "Chapter references an ebook_id that does not exist (orphan row or wrong environment).",
      },
      404,
    );
  }
  if (ebook.project_id !== projectId) {
    return json({ error: "forbidden", detail: "chapter_ebook_mismatch" }, 403);
  }

  const ebookType = ebook.type;
  if (ebookType !== "main" && ebookType !== "bonus" && ebookType !== "order_bump") {
    return json({ error: "forbidden", detail: "unsupported_ebook_type" }, 403);
  }

  const { data: progress, error: progErr } = await admin
    .from("project_content_progress")
    .select("main_index_frozen_at, global_index_frozen_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (progErr || !progress) {
    return json({ error: "index_not_frozen", detail: "content_progress_missing" }, 400);
  }

  if (ebookType === "main") {
    if (!progress.main_index_frozen_at) {
      return json({ error: "index_not_frozen", detail: "confirm_main_index_first" }, 400);
    }
  } else {
    if (!progress.global_index_frozen_at) {
      return json({ error: "index_not_frozen", detail: "confirm_global_index_first" }, 400);
    }
  }

  const title = typeof chapter.title === "string" ? chapter.title.trim() : "";
  if (!title) {
    return json({ error: "invalid_chapter", detail: "empty_title" }, 400);
  }

  const rawCost = Deno.env.get("AI_GENERATE_CONTENT_CREDIT_COST");
  const cost = rawCost !== undefined && rawCost !== "" ? Number(rawCost) : 2;
  if (!Number.isFinite(cost) || cost <= 0) {
    return json({ error: "server_misconfigured", detail: "credit_cost" }, 500);
  }

  const idempotencyKey =
    clientRequestId !== null && clientRequestId !== ""
      ? `ai-gen-content:${user.id}:${projectId}:${chapterId}:${clientRequestId}`
      : `ai-gen-content:${user.id}:${projectId}:${chapterId}:${crypto.randomUUID()}`;

  const useAnthropic = Boolean(Deno.env.get("ANTHROPIC_API_KEY")?.trim());

  // ── Stub path (no index_json required) — debit credits then return ─────────
  if (!useAnthropic) {
    const delta = -Math.floor(cost);
    const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
      p_creator_id: user.id,
      p_delta: delta,
      p_reason: "consumption",
      p_idempotency_key: idempotencyKey,
      p_project_id: projectId,
    });

    if (rpcErr) {
      const msg = rpcErr.message ?? "";
      if (msg.includes("insufficient credits")) {
        return json({ error: "insufficient_credits" }, 402);
      }
      if (msg.includes("subscription not active")) {
        return json({ error: "subscription_not_active" }, 403);
      }
      if (msg.includes("creator profile not found")) {
        return json({ error: "profile_not_found" }, 400);
      }
      console.error("obra_credit_ledger_apply", rpcErr);
      return json({ error: "ledger_failed" }, 500);
    }

    const projectMainTitle = typeof project.main_title === "string" ? project.main_title.trim() : "";
    const ebookProductTitle = typeof ebook.title === "string" ? ebook.title.trim() : "";
    const stubBookTitle = ebookType === "main" ? projectMainTitle : ebookProductTitle;
    const body = stubChapterBodyHtml(
      project.content_locale ?? "es",
      title,
      stubBookTitle || projectMainTitle,
      project.topic as string | null,
    );
    return json({ ok: true, stub: true, content: body, credits_balance_after: balanceAfter });
  }

  // ── Anthropic path: resolve index BEFORE debiting credits ───────────────────
  const indexResolved = await resolveIndexJsonForGeneration(
    admin,
    chapter.ebook_id as string,
    ebookType,
    ebook.index_json,
  );
  if (!indexResolved) {
    return json(
      {
        ok: false,
        error: "index_not_available",
        detail: "generate_index_first",
        hint:
          "No usable outline in ebooks.index_json and no chapter titles to synthesize from. Regenerate the outline for this ebook in the Content step, or confirm the table of contents so chapters exist.",
      },
      400,
    );
  }
  const indexJsonString = indexResolved.jsonString;

  const delta = -Math.floor(cost);
  const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
    p_creator_id: user.id,
    p_delta: delta,
    p_reason: "consumption",
    p_idempotency_key: idempotencyKey,
    p_project_id: projectId,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("insufficient credits")) {
      return json({ error: "insufficient_credits" }, 402);
    }
    if (msg.includes("subscription not active")) {
      return json({ error: "subscription_not_active" }, 403);
    }
    if (msg.includes("creator profile not found")) {
      return json({ error: "profile_not_found" }, 400);
    }
    console.error("obra_credit_ledger_apply", rpcErr);
    return json({ error: "ledger_failed" }, 500);
  }

  // ── Build prompt context ─────────────────────────────────────────────────────
  const contentLocale = parseContentLocale(project.content_locale ?? undefined) ?? ("es" as ContentLocale);
  const { chapterCount, contentTone } = parseDesignConfigForAi(project.design_config);
  const chapterNumber = Number(chapter.sort_order);

  // Fetch all previous chapters for this ebook (sort_order < current).
  const { data: prevRows, error: prevErr } = await admin
    .from("chapters")
    .select("sort_order, title, content")
    .eq("ebook_id", chapter.ebook_id as string)
    .lt("sort_order", chapterNumber)
    .order("sort_order", { ascending: true });

  if (prevErr) {
    console.error("previous_chapters_fetch_failed", prevErr.message);
  }

  const previousChapters = (prevRows ?? [])
    .filter((r) => typeof r.content === "string" && (r.content as string).trim().length > 0)
    .map((r) => ({
      number: Number(r.sort_order),
      title: String(r.title ?? ""),
      content: String(r.content),
    }));

  let promptBundle;
  if (ebookType === "bonus") {
    promptBundle = generateBonusChapterPrompt({
      content_locale: contentLocale,
      topic: typeof project.topic === "string" ? project.topic : "",
      avatar: typeof project.target_avatar === "string" ? project.target_avatar : "",
      problem: typeof project.problem === "string" ? project.problem : "",
      main_ebook_title: typeof project.main_title === "string" ? project.main_title.trim() : "",
      bonus_product_title: typeof ebook.title === "string" ? ebook.title.trim() : "",
      tone: contentTone,
      bonus_index: indexJsonString,
    });
  } else if (ebookType === "order_bump") {
    promptBundle = generateBumpChapterPrompt({
      content_locale: contentLocale,
      avatar: typeof project.target_avatar === "string" ? project.target_avatar : "",
      problem: typeof project.problem === "string" ? project.problem : "",
      bump_product_title: typeof ebook.title === "string" ? ebook.title.trim() : "",
      tone: contentTone,
      index: indexJsonString,
      chapter_number: chapterNumber,
      previous_chapters: previousChapters,
    });
  } else {
    // main ebook
    promptBundle = generateChapterPrompt({
      content_locale: contentLocale,
      topic: typeof project.topic === "string" ? project.topic : "",
      avatar: typeof project.target_avatar === "string" ? project.target_avatar : "",
      problem: typeof project.problem === "string" ? project.problem : "",
      main_ebook_title: typeof project.main_title === "string" ? project.main_title.trim() : "",
      tone: contentTone,
      index: indexJsonString,
      chapter_number: chapterNumber,
      chapter_count: chapterCount,
      previous_chapters: previousChapters,
    });
  }

  if (!promptBundle) {
    return json(
      { ok: false, error: "prompt_build_failed", detail: "chapter_not_found_in_index", credits_balance_after: balanceAfter },
      502,
    );
  }

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const ai = await callClaudeJsonText({
    system: promptBundle.system,
    user: promptBundle.user,
    maxTokens: 8192,
  });

  if (!ai.ok) {
    return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
  }

  const parsed = parseJsonObject(ai.text);
  if (!parsed.ok) {
    console.error(JSON.stringify({ event: "model_parse_error", response_length: ai.text.length }));
    return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
  }

  const o = parsed.value;

  // Model returned an error object
  if (typeof o.error === "string") {
    return json(
      {
        ok: false,
        error: "model_invalid_input",
        message: typeof o.message === "string" ? o.message : undefined,
        credits_balance_after: balanceAfter,
      },
      400,
    );
  }

  // Primary key is "content"; fall back to other common names Claude may use when
  // the prompt schema was ambiguous (html, body, chapter_html, text).
  const FALLBACK_KEYS = ["html", "body", "chapter_html", "chapter", "text"] as const;
  const rawContent: unknown =
    o.content ??
    FALLBACK_KEYS.reduce<unknown>(
      (found, k) => (found !== undefined ? found : o[k]),
      undefined,
    );
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) {
    console.error("model_empty_content", { keys: Object.keys(o) });
    return json({ ok: false, error: "model_empty_content", credits_balance_after: balanceAfter }, 502);
  }

  // ── Persist to DB ────────────────────────────────────────────────────────────
  const { error: saveErr } = await admin
    .from("chapters")
    .update({ content, approved_at: null })
    .eq("id", chapterId);

  if (saveErr) {
    console.error("chapter_content_save_failed", saveErr.message);
    // Return content anyway — client can retry the save via updateChapterDraftContent.
    return json({
      ok: true,
      stub: false,
      content,
      credits_balance_after: balanceAfter,
      save_warning: "db_save_failed",
    });
  }

  return json({ ok: true, stub: false, content, credits_balance_after: balanceAfter });
});
