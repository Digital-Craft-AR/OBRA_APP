import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { callClaudeJsonText, parseJsonObject } from "../_shared/claude.ts";
import { parseDesignConfigForAi } from "../_shared/designConfig.ts";
import { generateAllBonusSectionIndexPrompt } from "../_shared/prompts.ts";
import { isSubscriptionEntitled } from "../_shared/auth.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import type { ContentLocale, ContentTone } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const json = corsJson;

const CONTENT_LOCALES = ["es", "pt-BR", "en-US", "en-GB"] as const;

function parseContentLocale(raw: string | null | undefined): ContentLocale | null {
  if (!raw || typeof raw !== "string") return null;
  return (CONTENT_LOCALES as readonly string[]).includes(raw) ? (raw as ContentLocale) : null;
}

type BonusSectionChapter = {
  number: number;
  title: string;
  description: string;
  key_concepts: string[];
  word_count_target: number;
};

type BonusSection = {
  narrative_arc: string;
  chapters: BonusSectionChapter[];
};

const BONUS_CHAPTER_COUNT = 3;

function parseBonusSections(
  parsed: Record<string, unknown>,
  expectedCount: number,
): BonusSection[] | null {
  const bonuses = parsed.bonuses;
  if (!Array.isArray(bonuses) || bonuses.length !== expectedCount) return null;

  const result: BonusSection[] = [];
  for (const bonus of bonuses) {
    if (typeof bonus !== "object" || bonus === null) return null;
    const b = bonus as Record<string, unknown>;
    const chapters = b.chapters;
    if (!Array.isArray(chapters) || chapters.length !== BONUS_CHAPTER_COUNT) return null;

    const narrative_arc =
      typeof b.narrative_arc === "string" ? b.narrative_arc.trim() : "";

    const parsedChapters: BonusSectionChapter[] = [];
    for (let idx = 0; idx < chapters.length; idx++) {
      const ch = chapters[idx] as Record<string, unknown> | undefined;
      if (!ch) return null;
      const title = typeof ch.title === "string" ? ch.title.trim() : "";
      const description = typeof ch.description === "string" ? ch.description.trim() : "";
      const key_concepts = Array.isArray(ch.key_concepts)
        ? (ch.key_concepts as unknown[]).filter((k) => typeof k === "string") as string[]
        : [];
      const word_count_target =
        typeof ch.word_count_target === "number" && ch.word_count_target > 0
          ? ch.word_count_target
          : 500;
      if (!title) return null;
      parsedChapters.push({ number: idx + 1, title, description, key_concepts, word_count_target });
    }
    result.push({ narrative_arc, chapters: parsedChapters });
  }
  return result;
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
  const clientRequestId =
    typeof payload?.client_request_id === "string" ? payload.client_request_id : null;
  // Optional: caller passes bonus ebook IDs in package_ordinal order.
  // If omitted, the function derives them from DB ordered by package_ordinal.
  const callerBonusIds: string[] | null =
    Array.isArray(payload?.bonus_ebook_ids) &&
    (payload.bonus_ebook_ids as unknown[]).every((id) => typeof id === "string")
      ? (payload.bonus_ebook_ids as string[])
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

  if (
    !isSubscriptionEntitled(
      profileRow as { subscription_status?: string; subscription_access_until?: string | null } | null,
    )
  ) {
    return json({ error: "subscription_not_active" }, 403);
  }

  // Reuse the ai-generate-index rate-limit bucket — same operation, same cost per request.
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

  // Resolve bonus ebook rows — from caller-supplied IDs or from DB.
  type EbookRow = { id: string; title: string | null; package_ordinal: number };
  let bonusRows: EbookRow[];

  if (callerBonusIds !== null && callerBonusIds.length > 0) {
    const { data: rows, error: rowsErr } = await admin
      .from("ebooks")
      .select("id, title, package_ordinal")
      .eq("project_id", projectId)
      .eq("type", "bonus")
      .in("id", callerBonusIds);
    if (rowsErr || !rows) {
      return json({ error: "db_error", detail: "bonus_ebooks_fetch" }, 500);
    }
    // Preserve caller-supplied ordinal order.
    const byId = new Map<string, EbookRow>(
      (rows as EbookRow[]).map((r) => [r.id, r]),
    );
    bonusRows = callerBonusIds
      .map((id) => byId.get(id))
      .filter(Boolean) as EbookRow[];
    if (bonusRows.length !== callerBonusIds.length) {
      return json({ error: "invalid_payload", detail: "some_bonus_ebook_ids_not_found" }, 400);
    }
  } else {
    const { data: rows, error: rowsErr } = await admin
      .from("ebooks")
      .select("id, title, package_ordinal")
      .eq("project_id", projectId)
      .eq("type", "bonus")
      .order("package_ordinal", { ascending: true });
    if (rowsErr || !rows) {
      return json({ error: "db_error", detail: "bonus_ebooks_fetch" }, 500);
    }
    bonusRows = rows as EbookRow[];
  }

  if (bonusRows.length === 0) {
    return json({ error: "invalid_payload", detail: "no_bonus_ebooks_found" }, 400);
  }

  const { contentTone: designTone } = parseDesignConfigForAi(project.design_config);

  const bodyToneOverride =
    typeof payload?.content_tone === "string"
      ? payload.content_tone
      : typeof payload?.contentTone === "string"
        ? payload.contentTone
        : null;

  const tone: ContentTone =
    bodyToneOverride &&
    ["professional", "friendly", "inspirational", "direct", "educational"].includes(
      bodyToneOverride,
    )
      ? (bodyToneOverride as ContentTone)
      : designTone;

  const contentLocale =
    parseContentLocale(project.content_locale ?? undefined) ?? ("es" as ContentLocale);
  const topic = typeof project.topic === "string" ? project.topic : "";
  const avatar = typeof project.target_avatar === "string" ? project.target_avatar : "";
  const problem = typeof project.problem === "string" ? project.problem : "";
  const mainEbookTitle =
    typeof project.main_title === "string" ? project.main_title.trim() : topic || "Ebook";

  const bonusTitles = bonusRows.map(
    (r) => (typeof r.title === "string" ? r.title.trim() : "") || topic || "Bonus",
  );

  const rawCost = Deno.env.get("AI_GENERATE_INDEX_CREDIT_COST");
  const costPerBonus = rawCost !== undefined && rawCost !== "" ? Number(rawCost) : 2;
  if (!Number.isFinite(costPerBonus) || costPerBonus <= 0) {
    return json({ error: "server_misconfigured", detail: "credit_cost" }, 500);
  }
  const totalCost = Math.floor(costPerBonus) * bonusRows.length;

  const idempotencyKey =
    clientRequestId !== null && clientRequestId !== ""
      ? `ai-gen-all-bonus-index:${user.id}:${projectId}:${clientRequestId}`
      : `ai-gen-all-bonus-index:${user.id}:${projectId}:${crypto.randomUUID()}`;

  if (!Deno.env.get("ANTHROPIC_API_KEY")?.trim()) {
    return json({ error: "ai_not_configured", detail: "anthropic" }, 503);
  }

  const promptBundle = generateAllBonusSectionIndexPrompt({
    content_locale: contentLocale,
    topic,
    avatar,
    problem,
    main_ebook_title: mainEbookTitle,
    bonus_titles: bonusTitles,
    tone,
  });

  // ~700 tokens per chapter × 3 chapters per bonus + overhead buffer.
  const maxTokens = BONUS_CHAPTER_COUNT * 700 * bonusRows.length + 1024;

  const ai = await callClaudeJsonText({
    system: promptBundle.system,
    user: promptBundle.user,
    maxTokens,
    clientId: "ai-generate-all-bonus-index",
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
    return json(
      {
        ok: false,
        error: "invalid_input",
        reason: typeof o.reason === "string" ? o.reason : undefined,
      },
      400,
    );
  }

  const sections = parseBonusSections(o, bonusRows.length);
  if (!sections) {
    return json({ ok: false, error: "index_shape_mismatch" }, 502);
  }

  // Deduct credits after Claude succeeds (same cost as N individual calls).
  const delta = -totalCost;
  const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
    p_creator_id: user.id,
    p_delta: delta,
    p_reason: "consumption",
    p_idempotency_key: idempotencyKey,
    p_project_id: projectId,
    p_source_function: "ai-generate-all-bonus-index",
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

  // Persist index_json per bonus ebook and build the response.
  const bonusResults: Array<{ ebook_id: string; chapters: { title: string }[] }> = [];
  for (let i = 0; i < bonusRows.length; i++) {
    const row = bonusRows[i]!;
    const section = sections[i]!;
    const indexJson = { narrative_arc: section.narrative_arc, chapters: section.chapters };

    const { error: saveErr } = await admin
      .from("ebooks")
      .update({ index_json: indexJson })
      .eq("id", row.id);

    if (saveErr) {
      console.error("index_json_save_failed", row.id, saveErr.message);
      return json(
        {
          ok: false,
          error: "index_persist_failed",
          detail: saveErr.message?.slice(0, 240) ?? "save_failed",
          credits_balance_after: balanceAfter,
        },
        500,
      );
    }

    bonusResults.push({
      ebook_id: row.id,
      chapters: section.chapters.map((ch) => ({ title: ch.title })),
    });
  }

  return json({
    ok: true,
    bonuses: bonusResults,
    credits_balance_after: balanceAfter,
  });
});
