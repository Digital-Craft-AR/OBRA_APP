import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { callClaudeJsonText, parseJsonObject } from "../_shared/claude.ts";
import { parseDesignConfigForAi } from "../_shared/designConfig.ts";
import { generateBonusSectionIndexPrompt, generateIndexPrompt } from "../_shared/prompts.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import type { ChapterCount, ContentLocale, ContentTone } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const json = corsJson;

const CONTENT_LOCALES = ["es", "pt-BR", "en-US", "en-GB"] as const;

function parseContentLocale(raw: string | null | undefined): ContentLocale | null {
  if (!raw || typeof raw !== "string") return null;
  return (CONTENT_LOCALES as readonly string[]).includes(raw) ? (raw as ContentLocale) : null;
}


function extractChapterTitles(parsed: Record<string, unknown>, expectedCount: number): string[] | null {
  const chapters = parsed.chapters;
  if (!Array.isArray(chapters)) return null;
  type Row = { number?: unknown; title?: unknown };
  const rows: Row[] = chapters.filter((c) => typeof c === "object" && c !== null) as Row[];
  const withNum = rows
    .map((c) => ({
      n: typeof c.number === "number" ? c.number : Number(c.number),
      title: typeof c.title === "string" ? c.title.trim() : "",
    }))
    .filter((c) => Number.isFinite(c.n) && c.title);
  withNum.sort((a, b) => a.n - b.n);
  const titles = withNum.map((c) => c.title);
  if (titles.length !== expectedCount) return null;
  return titles;
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
  const jwt = authHeader.slice(7);

  const payload = await req.json().catch(() => null);
  const projectId = typeof payload?.project_id === "string" ? payload.project_id : null;
  const clientRequestId = typeof payload?.client_request_id === "string" ? payload.client_request_id : null;
  const targetEbookId = typeof payload?.target_ebook_id === "string" ? payload.target_ebook_id : null;

  const bodyChapterOverride =
    typeof payload?.chapter_count === "number" && Number.isFinite(payload.chapter_count)
      ? Math.floor(payload.chapter_count)
      : typeof payload?.chapter_count === "string"
        ? Number(payload.chapter_count)
        : null;
  const bodyToneOverride =
    typeof payload?.content_tone === "string"
      ? payload.content_tone
      : typeof payload?.contentTone === "string"
        ? payload.contentTone
        : null;

  if (!projectId) {
    return json({ error: "invalid_payload", detail: "project_id" }, 400);
  }

  const pub = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await pub.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profileRow } = await admin
    .from("creator_profiles")
    .select("subscription_status, subscription_access_until")
    .eq("id", user.id)
    .maybeSingle();

  if (!isSubscriptionEntitled(profileRow as { subscription_status?: string; subscription_access_until?: string | null } | null)) {
    return json({ error: "subscription_not_active" }, 403);
  }

  const rl = await checkRateLimit(admin, user.id, "ai-generate-index");
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

  const projectMainTitle = typeof project.main_title === "string" ? project.main_title.trim() : "";
  let seedTitle = projectMainTitle;
  type PackageTargetKind = "order_bump" | "bonus";
  let packageTargetKind: PackageTargetKind | null = null;
  if (targetEbookId !== null && targetEbookId !== "") {
    const { data: targetEbook, error: ebookErr } = await admin
      .from("ebooks")
      .select("id, type, title, index_frozen_at")
      .eq("id", targetEbookId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (ebookErr || !targetEbook) {
      return json({ error: "invalid_payload", detail: "target_ebook_not_found" }, 400);
    }
    if (targetEbook.type !== "order_bump" && targetEbook.type !== "bonus") {
      return json({ error: "invalid_payload", detail: "target_ebook_invalid_type" }, 400);
    }
    if (targetEbook.index_frozen_at != null) {
      return json({ error: "index_already_frozen", detail: targetEbook.type }, 400);
    }
    packageTargetKind = targetEbook.type as PackageTargetKind;
    seedTitle = typeof targetEbook.title === "string" ? targetEbook.title.trim() : "";
  }

  const { chapterCount: designChapterCount, contentTone: designTone } = parseDesignConfigForAi(project.design_config);

  let chapterCount: ChapterCount = designChapterCount;
  if (
    bodyChapterOverride === 4 ||
    bodyChapterOverride === 6 ||
    bodyChapterOverride === 8 ||
    bodyChapterOverride === 10 ||
    bodyChapterOverride === 12
  ) {
    chapterCount = bodyChapterOverride as ChapterCount;
  }
  if (packageTargetKind === "order_bump") {
    chapterCount = 4;
  }

  const expectedTitleCount = packageTargetKind === "bonus" ? 1 : chapterCount;

  const tone: ContentTone =
    bodyToneOverride &&
    ["professional", "friendly", "inspirational", "direct", "educational"].includes(bodyToneOverride)
      ? (bodyToneOverride as ContentTone)
      : designTone;

  const contentLocale =
    parseContentLocale(project.content_locale ?? undefined) ?? ("es" as ContentLocale);
  const topic = typeof project.topic === "string" ? project.topic : "";
  const avatar = typeof project.target_avatar === "string" ? project.target_avatar : "";
  const problem = typeof project.problem === "string" ? project.problem : "";
  const artifactTitle = seedTitle.trim() || topic || "Ebook";

  const rawCost = Deno.env.get("AI_GENERATE_INDEX_CREDIT_COST");
  const cost = rawCost !== undefined && rawCost !== "" ? Number(rawCost) : 2;
  if (!Number.isFinite(cost) || cost <= 0) {
    return json({ error: "server_misconfigured", detail: "credit_cost" }, 500);
  }

  const targetKey = targetEbookId && targetEbookId !== "" ? targetEbookId : "main";
  const idempotencyKey =
    clientRequestId !== null && clientRequestId !== ""
      ? `ai-gen-index:${user.id}:${projectId}:${targetKey}:${clientRequestId}`
      : `ai-gen-index:${user.id}:${projectId}:${targetKey}:${crypto.randomUUID()}`;

  if (!Deno.env.get("ANTHROPIC_API_KEY")?.trim()) {
    return json({ error: "ai_not_configured", detail: "anthropic" }, 503);
  }

  const promptBundle =
    packageTargetKind === "bonus"
      ? generateBonusSectionIndexPrompt({
          content_locale: contentLocale,
          topic,
          avatar,
          problem,
          main_ebook_title: projectMainTitle || topic || "Ebook",
          bonus_product_title: artifactTitle,
          tone,
        })
      : generateIndexPrompt({
          content_locale: contentLocale,
          topic,
          avatar,
          problem,
          main_ebook_title: artifactTitle,
          chapter_count: chapterCount,
          tone,
        });

  const ai = await callClaudeJsonText({
    system: promptBundle.system,
    user: promptBundle.user,
    maxTokens: packageTargetKind === "bonus" ? 2048 : 8192,
  });
  if (!ai.ok) {
    return json({ ok: false, error: ai.error }, 502);
  }

  const parsed = parseJsonObject(ai.text);
  if (!parsed.ok) {
    return json({ ok: false, error: "model_parse_error" }, 502);
  }

  const o = parsed.value;
  if (typeof o.error === "string" && o.error === "INVALID_INPUT") {
    return json({
      ok: false,
      error: "invalid_input",
      reason: typeof o.reason === "string" ? o.reason : undefined,
    }, 400);
  }

  const titles = extractChapterTitles(o, expectedTitleCount);
  if (!titles) {
    return json({ ok: false, error: "index_shape_mismatch" }, 502);
  }

  // ── Deduct credits after Claude succeeds (deduct on success only) ─────────────
  const delta = -Math.floor(cost);
  const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
    p_creator_id: user.id,
    p_delta: delta,
    p_reason: "consumption",
    p_idempotency_key: idempotencyKey,
    p_project_id: projectId,
    p_source_function: "ai-generate-index",
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

  // Persist the full index JSON to the ebook row so ai-generate-content can use
  // narrative_arc, descriptions, and key_concepts when generating chapter bodies.
  {
    let ebookIdToUpdate: string | null = null;
    if (targetEbookId) {
      ebookIdToUpdate = targetEbookId;
    } else {
      const { data: mainEbook } = await admin
        .from("ebooks")
        .select("id")
        .eq("project_id", projectId)
        .eq("type", "main")
        .maybeSingle();
      ebookIdToUpdate = (mainEbook?.id as string | undefined) ?? null;
    }
    if (ebookIdToUpdate) {
      const { error: saveIndexErr } = await admin
        .from("ebooks")
        .update({ index_json: o })
        .eq("id", ebookIdToUpdate);
      if (saveIndexErr) {
        console.error("index_json_save_failed", saveIndexErr.message);
        return json(
          {
            ok: false,
            error: "index_persist_failed",
            detail: saveIndexErr.message?.slice(0, 240) ?? "save_failed",
            credits_balance_after: balanceAfter,
          },
          500,
        );
      }
    }
  }

  return json({
    ok: true,
    stub: false,
    chapters: titles.map((title) => ({ title })),
    credits_balance_after: balanceAfter,
  });
});
