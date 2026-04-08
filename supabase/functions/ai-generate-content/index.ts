import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/**
 * Generates chapter body (markdown) for the main ebook on the AI path.
 * Validates JWT, checks ownership and frozen main index, debits credits idempotently.
 * Claude integration is pending (#26 / #55); returns deterministic stub text.
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubChapterBody(
  contentLocale: string,
  chapterTitle: string,
  mainTitle: string,
  topic: string | null,
): string {
  const ch = chapterTitle.trim() || "Chapter";
  const book = mainTitle.trim() || topic?.trim() || "Your ebook";
  const loc = contentLocale.toLowerCase();
  if (loc.startsWith("pt")) {
    return [
      `# ${ch}`,
      "",
      `Este é um rascunho gerado automaticamente para **${book}**.`,
      "",
      "## Visão geral",
      "",
      "O conteúdo completo será gerado pela IA em uma versão futura. Por enquanto, use este texto como estrutura e edite à vontade.",
      "",
      "## Pontos principais",
      "",
      "- Ideia central alinhada ao título do capítulo",
      "- Exemplos e detalhes virão na versão final",
      "",
      "## Próximos passos",
      "",
      "Revise, salve e aprove quando estiver satisfeito.",
    ].join("\n");
  }
  if (loc.startsWith("en")) {
    return [
      `# ${ch}`,
      "",
      `This is an auto-generated draft for **${book}**.`,
      "",
      "## Overview",
      "",
      "Full AI-generated copy will arrive in a future release. Use this as a scaffold and edit freely.",
      "",
      "## Key points",
      "",
      "- Core idea aligned with the chapter title",
      "- Examples and depth will follow in the final version",
      "",
      "## Next steps",
      "",
      "Review, save, and approve when ready.",
    ].join("\n");
  }
  return [
    `# ${ch}`,
    "",
    `Este es un borrador generado automáticamente para **${book}**.`,
    "",
    "## Resumen",
    "",
    "El contenido completo lo generará la IA en una versión futura. Usá este texto como esquema y editá con libertad.",
    "",
    "## Ideas clave",
    "",
    "- Idea central alineada al título del capítulo",
    "- Ejemplos y profundidad llegarán en la versión final",
    "",
    "## Próximos pasos",
    "",
    "Revisá, guardá y aprobá cuando esté listo.",
  ].join("\n");
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

  const { data: progress, error: progErr } = await admin
    .from("project_content_progress")
    .select("main_index_frozen_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (progErr || !progress?.main_index_frozen_at) {
    return json({ error: "index_not_frozen", detail: "confirm_main_index_first" }, 400);
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
    .select("id, type, project_id")
    .eq("id", chapter.ebook_id as string)
    .maybeSingle();

  if (ebErr || !ebook) {
    return json({ error: "chapter_not_found" }, 404);
  }
  if (ebook.project_id !== projectId || ebook.type !== "main") {
    return json({ error: "forbidden", detail: "chapter_not_main_ebook" }, 403);
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

  const mainTitle = typeof project.main_title === "string" ? project.main_title : "";
  const body = stubChapterBody(
    project.content_locale ?? "es",
    title,
    mainTitle,
    project.topic as string | null,
  );

  return json({
    ok: true,
    stub: true,
    content: body,
    credits_balance_after: balanceAfter,
  });
});
