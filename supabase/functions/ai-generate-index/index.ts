import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/**
 * Proposes chapter titles (TOC) for the AI path: main ebook or an order-bump ebook.
 * Validates JWT. Deducts credits via `obra_credit_ledger_apply`; Claude integration is still pending (#26 / #29).
 *
 * Content generation inputs (Structure → Design, `projects.design_config` JSON):
 * - `chapterCount` (6 | 8 | 10 | 12): main-ebook chapter count for index generation; default 8 if missing.
 * - `contentTone` (professional | friendly | inspirational | direct | educational): AI voice preset; default "friendly".
 * Legacy keys `chapter_count` / `content_tone` are accepted when parsing.
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_CONTENT_TONES = new Set([
  "professional",
  "friendly",
  "inspirational",
  "direct",
  "educational",
]);

/** Mirrors `normalizeDesignConfig` defaults in `obra/src/lib/wizard/structureTypes.ts`. */
function parseIndexOptionsFromDesignConfig(designConfig: unknown): { chapterCount: number; contentTone: string } {
  const defaultCount = 8;
  const defaultTone = "friendly";
  if (designConfig === null || typeof designConfig !== "object" || Array.isArray(designConfig)) {
    return { chapterCount: defaultCount, contentTone: defaultTone };
  }
  const dc = designConfig as Record<string, unknown>;
  const rawCount = dc.chapterCount !== undefined ? dc.chapterCount : dc.chapter_count;
  const n = typeof rawCount === "number" ? rawCount : Number(rawCount);
  const chapterCount = n === 6 || n === 8 || n === 10 || n === 12 ? n : defaultCount;

  const rawTone = typeof dc.contentTone === "string" ? dc.contentTone : dc.content_tone;
  const contentTone =
    typeof rawTone === "string" && VALID_CONTENT_TONES.has(rawTone) ? rawTone : defaultTone;

  return { chapterCount, contentTone };
}

function stubChapterTitles(
  contentLocale: string,
  mainTitle: string,
  topic: string | null,
  chapterCount: number,
): string[] {
  const base = mainTitle.trim() || topic?.trim() || "Your ebook";
  const loc = contentLocale.toLowerCase();
  const n = Math.max(1, Math.min(12, Math.floor(chapterCount)));

  const intro = loc.startsWith("pt")
    ? `Introdução — ${base}`
    : loc.startsWith("en")
      ? `Introduction — ${base}`
      : `Introducción — ${base}`;
  const outro = loc.startsWith("pt")
    ? "Conclusão e próximos passos"
    : loc.startsWith("en")
      ? "Conclusion and next steps"
      : "Conclusión y próximos pasos";
  const mid = (i: number) =>
    loc.startsWith("pt")
      ? `Capítulo ${i}: desenvolvimento do conteúdo`
      : loc.startsWith("en")
        ? `Chapter ${i}: core content`
        : `Capítulo ${i}: desarrollo del contenido`;

  if (n === 1) return [intro];
  if (n === 2) return [intro, outro];
  const titles: string[] = [intro];
  for (let i = 2; i < n; i++) titles.push(mid(i));
  titles.push(outro);
  return titles;
}

Deno.serve(async (req: Request) => {
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

  let seedTitle = project.main_title ?? "";
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
    if (targetEbook.type !== "order_bump") {
      return json({ error: "invalid_payload", detail: "target_ebook_not_order_bump" }, 400);
    }
    if (targetEbook.index_frozen_at != null) {
      return json({ error: "index_already_frozen", detail: "order_bump" }, 400);
    }
    seedTitle = typeof targetEbook.title === "string" ? targetEbook.title : "";
  }

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
    if (msg.includes("creator profile not found")) {
      return json({ error: "profile_not_found" }, 400);
    }
    console.error("obra_credit_ledger_apply", rpcErr);
    return json({ error: "ledger_failed" }, 500);
  }

  const { chapterCount } = parseIndexOptionsFromDesignConfig(
    (project as { design_config?: unknown }).design_config,
  );

  const titles = stubChapterTitles(
    project.content_locale ?? "es",
    seedTitle,
    project.topic,
    chapterCount,
  );

  return json({
    ok: true,
    stub: true,
    chapters: titles.map((title) => ({ title })),
    credits_balance_after: balanceAfter,
  });
});
