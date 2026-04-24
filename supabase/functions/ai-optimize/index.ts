import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { callClaudeJsonText, parseJsonArray, parseJsonObject } from "../_shared/claude.ts";
import type { ContentLocale } from "../_shared/prompts.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import {
  avatarProfileToUnifiedText,
  problemFramingToUnifiedText,
  topicFramingToUnifiedText,
} from "../_shared/wizardOptimizeUnifiedText.ts";
import {
  generateBonusTitlesPrompt,
  generateBumpTitlesPrompt,
  generateEbookTitlePrompt,
  optimizeAvatarPrompt,
  optimizeProblemPrompt,
  optimizeTopicPrompt,
} from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const json = corsJson;

const CONTENT_LOCALES = ["es", "pt-BR", "en-US", "en-GB"] as const;

function parseContentLocale(raw: string | null | undefined): ContentLocale | null {
  if (!raw || typeof raw !== "string") return null;
  return (CONTENT_LOCALES as readonly string[]).includes(raw) ? (raw as ContentLocale) : null;
}

/** Fallback when project/body locale missing: map UI `language` from i18n. */
function localeFromLanguage(language: string | undefined): ContentLocale {
  const l = (language ?? "").toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("en-gb") || l === "en-gb") return "en-GB";
  if (l.startsWith("en")) return "en-US";
  return "es";
}

function readStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
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

  const field = typeof payload?.field === "string" ? payload.field : "unknown";
  const contentPart = typeof payload?.content_part === "string" ? payload.content_part : null;
  const intent =
    typeof payload?.intent === "string"
      ? payload.intent
      : contentPart?.includes("suggestions")
        ? "suggest"
        : "improve";

  const projectId = typeof payload?.project_id === "string" ? payload.project_id : null;
  const clientRequestId = typeof payload?.client_request_id === "string" ? payload.client_request_id : null;
  const rawText = typeof payload?.raw_text === "string" ? payload.raw_text : "";
  const language = typeof payload?.language === "string" ? payload.language : "";
  const bodyContentLocale = parseContentLocale(
    typeof payload?.content_locale === "string" ? payload.content_locale : null,
  );

  const pub = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await pub.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  if (!Deno.env.get("ANTHROPIC_API_KEY")?.trim()) {
    return json({ error: "ai_not_configured", detail: "anthropic" }, 503);
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

  const rl = await checkRateLimit(admin, user.id, "ai-optimize");
  if (!rl.allowed) return rateLimitResponse(rl);

  let projectRow: {
    content_locale: string | null;
    topic: string | null;
    target_avatar: string | null;
    problem: string | null;
    main_title: string | null;
    user_id: string;
  } | null = null;

  if (projectId) {
    const { data: row, error: pErr } = await admin
      .from("projects")
      .select("user_id, content_locale, topic, target_avatar, problem, main_title")
      .eq("id", projectId)
      .maybeSingle();
    if (pErr || !row) {
      return json({ error: "project_not_found" }, 404);
    }
    if (row.user_id !== user.id) {
      return json({ error: "forbidden" }, 403);
    }
    projectRow = row as typeof projectRow;
  }

  const contentLocale: ContentLocale =
    parseContentLocale(projectRow?.content_locale ?? undefined) ??
    bodyContentLocale ??
    localeFromLanguage(language);

  const rawCost = Deno.env.get("AI_OPTIMIZE_CREDIT_COST");
  const cost = rawCost !== undefined && rawCost !== "" ? Number(rawCost) : 1;
  if (!Number.isFinite(cost) || cost <= 0) {
    return json({ error: "server_misconfigured", detail: "credit_cost" }, 500);
  }

  const idempotencyKey =
    clientRequestId !== null && clientRequestId !== ""
      ? `ai-optimize:${user.id}:${field}:${intent}:${clientRequestId}`
      : null;

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

  const topic =
    typeof payload?.topic === "string" && payload.topic.trim()
      ? payload.topic.trim()
      : (projectRow?.topic ?? "").trim();
  const avatarText =
    typeof payload?.avatar === "string" && payload.avatar.trim()
      ? payload.avatar.trim()
      : (projectRow?.target_avatar ?? "").trim();
  const problemText =
    typeof payload?.problem === "string" && payload.problem.trim()
      ? payload.problem.trim()
      : (projectRow?.problem ?? "").trim();
  const ebookTitle =
    typeof payload?.ebook_title === "string" && payload.ebook_title.trim()
      ? payload.ebook_title.trim()
      : (projectRow?.main_title ?? "").trim();
  const count = typeof payload?.count === "number" && Number.isFinite(payload.count)
    ? Math.max(1, Math.min(5, Math.floor(payload.count)))
    : 1;
  const lockedTitles = readStringArray(payload?.locked_titles);
  const previousTitles = readStringArray(payload?.previous_titles);

  try {
    if (intent === "improve" && field === "topic") {
      const { system, user: userMsg } = optimizeTopicPrompt({
        content_locale: contentLocale,
        raw_input: rawText,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 4096 });
      if (!ai.ok) {
        return json(
          { ok: false, error: ai.error, credits_balance_after: balanceAfter },
          ai.error === "anthropic_not_configured" ? 503 : 502,
        );
      }
      const parsed = parseJsonObject(ai.text);
      if (!parsed.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const o = parsed.value;
      if (typeof o.error === "string" && o.error === "INVALID_INPUT") {
        return json({
          ok: false,
          error: "invalid_input",
          reason: typeof o.reason === "string" ? o.reason : undefined,
          credits_balance_after: balanceAfter,
        }, 400);
      }
      const topicObj = o as Record<string, unknown>;
      const title = typeof topicObj.optimized_title === "string" ? topicObj.optimized_title.trim() : "";
      const description = typeof topicObj.description === "string" ? topicObj.description.trim() : "";
      const unifiedTopic = topicFramingToUnifiedText(topicObj);
      const optimized =
        unifiedTopic.trim().length > 0
          ? unifiedTopic
          : title && description
            ? `${title}\n\n${description}`
            : title || description || "";
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        optimized: optimized || undefined,
        topic_framing: {
          optimized_title: title || undefined,
          description: description || undefined,
          niche: typeof topicObj.niche === "string" ? topicObj.niche : undefined,
          angle: typeof topicObj.angle === "string" ? topicObj.angle : undefined,
        },
        credits_balance_after: balanceAfter,
      });
    }

    if (intent === "improve" && field === "target_avatar") {
      if (!topic) {
        return json({ ok: false, error: "missing_topic", credits_balance_after: balanceAfter }, 400);
      }
      const { system, user: userMsg } = optimizeAvatarPrompt({
        content_locale: contentLocale,
        topic,
        raw_input: rawText,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 4096 });
      if (!ai.ok) {
        return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
      }
      const parsed = parseJsonObject(ai.text);
      if (!parsed.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const o = parsed.value;
      if (typeof o.error === "string" && o.error === "INVALID_INPUT") {
        return json({
          ok: false,
          error: "invalid_input",
          reason: typeof o.reason === "string" ? o.reason : undefined,
          credits_balance_after: balanceAfter,
        }, 400);
      }
      const avatarObj = o as Record<string, unknown>;
      const unifiedAvatar = avatarProfileToUnifiedText(avatarObj);
      const optimized =
        unifiedAvatar.trim().length > 0 ? unifiedAvatar : JSON.stringify(avatarObj, null, 2);
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        optimized,
        avatar_profile: avatarObj,
        credits_balance_after: balanceAfter,
      });
    }

    if (intent === "improve" && field === "problem") {
      if (!topic) {
        return json({ ok: false, error: "missing_topic", credits_balance_after: balanceAfter }, 400);
      }
      if (!avatarText) {
        return json({ ok: false, error: "missing_avatar", credits_balance_after: balanceAfter }, 400);
      }
      const { system, user: userMsg } = optimizeProblemPrompt({
        content_locale: contentLocale,
        topic,
        avatar: avatarText,
        raw_input: rawText,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 4096 });
      if (!ai.ok) {
        return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
      }
      const parsed = parseJsonObject(ai.text);
      if (!parsed.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const o = parsed.value;
      if (typeof o.error === "string" && o.error === "INVALID_INPUT") {
        return json({
          ok: false,
          error: "invalid_input",
          reason: typeof o.reason === "string" ? o.reason : undefined,
          credits_balance_after: balanceAfter,
        }, 400);
      }
      const framingObj = o as Record<string, unknown>;
      const unified = problemFramingToUnifiedText(framingObj);
      const optimized =
        unified.trim().length > 0 ? unified : JSON.stringify(framingObj, null, 2);
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        optimized,
        problem_framing: framingObj,
        credits_balance_after: balanceAfter,
      });
    }

    if (intent === "suggest" && field === "main_title") {
      const { system, user: userMsg } = generateEbookTitlePrompt({
        content_locale: contentLocale,
        topic: topic || rawText,
        problem: problemText,
        avatar_summary: avatarText,
        locked_titles: lockedTitles,
        previous_titles: previousTitles,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 2048 });
      if (!ai.ok) {
        return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
      }
      const objTry = parseJsonObject(ai.text);
      if (objTry.ok && typeof objTry.value.error === "string") {
        const err = objTry.value.error;
        if (err === "ALL_LOCKED" || err === "INVALID_INPUT") {
          return json({
            ok: false,
            error: err === "ALL_LOCKED" ? "all_locked" : "invalid_input",
            reason: typeof objTry.value.reason === "string" ? objTry.value.reason : undefined,
            credits_balance_after: balanceAfter,
          }, 400);
        }
      }
      const arr = parseJsonArray(ai.text);
      if (!arr.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const suggestions = arr.value
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, count);
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        suggestions,
        credits_balance_after: balanceAfter,
      });
    }

    if (intent === "suggest" && field === "bonus_title") {
      if (!ebookTitle || !topic) {
        return json(
          { ok: false, error: "missing_ebook_or_topic", credits_balance_after: balanceAfter },
          400,
        );
      }
      const { system, user: userMsg } = generateBonusTitlesPrompt({
        content_locale: contentLocale,
        ebook_title: ebookTitle,
        topic,
        avatar_summary: avatarText || problemText || topic,
        count_to_generate: count,
        locked_titles: lockedTitles,
        previous_titles: previousTitles,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 2048 });
      if (!ai.ok) {
        return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
      }
      const objTry = parseJsonObject(ai.text);
      if (objTry.ok && typeof objTry.value.error === "string") {
        const err = objTry.value.error;
        if (err === "ALL_LOCKED" || err === "INVALID_INPUT") {
          return json({
            ok: false,
            error: err === "ALL_LOCKED" ? "all_locked" : "invalid_input",
            reason: typeof objTry.value.reason === "string" ? objTry.value.reason : undefined,
            credits_balance_after: balanceAfter,
          }, 400);
        }
      }
      const arr = parseJsonArray(ai.text);
      if (!arr.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const suggestions = arr.value
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, count);
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        suggestions,
        credits_balance_after: balanceAfter,
      });
    }

    if (intent === "suggest" && field === "bump_title") {
      if (!ebookTitle || !topic) {
        return json(
          { ok: false, error: "missing_ebook_or_topic", credits_balance_after: balanceAfter },
          400,
        );
      }
      const { system, user: userMsg } = generateBumpTitlesPrompt({
        content_locale: contentLocale,
        ebook_title: ebookTitle,
        topic,
        avatar_summary: avatarText || problemText || topic,
        count_to_generate: count,
        locked_titles: lockedTitles,
        previous_titles: previousTitles,
      });
      const ai = await callClaudeJsonText({ system, user: userMsg, maxTokens: 2048 });
      if (!ai.ok) {
        return json({ ok: false, error: ai.error, credits_balance_after: balanceAfter }, 502);
      }
      const objTry = parseJsonObject(ai.text);
      if (objTry.ok && typeof objTry.value.error === "string") {
        const err = objTry.value.error;
        if (err === "ALL_LOCKED" || err === "INVALID_INPUT") {
          return json({
            ok: false,
            error: err === "ALL_LOCKED" ? "all_locked" : "invalid_input",
            reason: typeof objTry.value.reason === "string" ? objTry.value.reason : undefined,
            credits_balance_after: balanceAfter,
          }, 400);
        }
      }
      const arr = parseJsonArray(ai.text);
      if (!arr.ok) {
        return json({ ok: false, error: "model_parse_error", credits_balance_after: balanceAfter }, 502);
      }
      const suggestions = arr.value
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, count);
      return json({
        ok: true,
        stub: false,
        field,
        intent,
        suggestions,
        credits_balance_after: balanceAfter,
      });
    }

    return json({ ok: false, error: "unsupported_operation", field, intent, credits_balance_after: balanceAfter }, 400);
  } catch (e) {
    console.error("ai_optimize_unhandled", (e as Error)?.message ?? e);
    return json({ ok: false, error: "internal_error", credits_balance_after: balanceAfter }, 500);
  }
});
