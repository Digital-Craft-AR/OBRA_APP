import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";

/**
 * Generates chapter body (sanitized rich HTML) for package ebooks on the AI path:
 * `main` (uses project chapter count), `order_bump`, and `bonus` (typically one section).
 * Validates JWT, frozen index gates, ownership, debits credits idempotently.
 * Claude integration is pending (#26 / #55); returns deterministic stub HTML.
 */
const json = corsJson;

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
  /** Main ebook title, or bonus/bump product title for package artifacts. */
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
  const jwt = authHeader.slice(7);

  const payload = await req.json().catch(() => null);
  const projectId = typeof payload?.project_id === "string" ? payload.project_id : null;
  const chapterId = typeof payload?.chapter_id === "string" ? payload.chapter_id : null;
  const clientRequestId = typeof payload?.client_request_id === "string" ? payload.client_request_id : null;

  if (!projectId || !chapterId) {
    return json({ error: "invalid_payload", detail: "project_id_and_chapter_id" }, 400);
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
    .select("id, user_id, content_source, content_locale, main_title, topic, structure_completed_at")
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
    .select("id, title, ebook_id")
    .eq("id", chapterId)
    .maybeSingle();

  if (chErr || !chapter?.ebook_id) {
    return json({ error: "chapter_not_found" }, 404);
  }

  const { data: ebook, error: ebErr } = await admin
    .from("ebooks")
    .select("id, type, project_id, title")
    .eq("id", chapter.ebook_id as string)
    .maybeSingle();

  if (ebErr || !ebook) {
    return json({ error: "chapter_not_found" }, 404);
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

  const projectMainTitle = typeof project.main_title === "string" ? project.main_title.trim() : "";
  const ebookProductTitle = typeof ebook.title === "string" ? ebook.title.trim() : "";
  const stubBookTitle = ebookType === "main" ? projectMainTitle : ebookProductTitle;
  const body = stubChapterBodyHtml(
    project.content_locale ?? "es",
    title,
    stubBookTitle || projectMainTitle,
    project.topic as string | null,
  );

  return json({
    ok: true,
    stub: true,
    content: body,
    credits_balance_after: balanceAfter,
  });
});
