import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("relation");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized", detail: "missing_bearer" }, 401);
  }
  const jwt = authHeader.slice(7);

  const payload = await req.json().catch(() => null);
  const projectId = typeof payload?.project_id === "string" ? payload.project_id : null;
  const targetAvatar = typeof payload?.target_avatar === "string" ? payload.target_avatar.trim() : "";
  const problem = typeof payload?.problem === "string" ? payload.problem.trim() : "";

  if (!projectId) return json({ error: "invalid_payload", detail: "project_id" }, 400);
  if (!targetAvatar || !problem) {
    return json({ error: "invalid_payload", detail: "avatar_and_problem_required" }, 400);
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
    .select("id, user_id, content_source")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) return json({ error: "project_not_found" }, 404);
  if (project.user_id !== user.id) return json({ error: "forbidden" }, 403);

  const resetPhase = project.content_source === "upload" ? "upload_alignment" : "main_index";

  // Optional table in current migration track; ignore when not present.
  const { error: chatDeleteError } = await admin
    .from("content_chat_threads")
    .delete()
    .eq("project_id", projectId);
  if (chatDeleteError && !isMissingRelation(chatDeleteError)) {
    return json({ error: "reset_failed", detail: "chat_delete" }, 500);
  }

  // Optional table in current migration track; ignore when not present.
  const { data: imageRows, error: imageLoadError } = await admin
    .from("images")
    .select("id, storage_path")
    .eq("project_id", projectId);
  if (imageLoadError && !isMissingRelation(imageLoadError)) {
    return json({ error: "reset_failed", detail: "images_select" }, 500);
  }
  if (Array.isArray(imageRows) && imageRows.length > 0) {
    const paths = imageRows
      .map((row) => (typeof row.storage_path === "string" ? row.storage_path : ""))
      .filter((path) => path.length > 0);
    if (paths.length > 0) {
      await admin.storage.from("project-images").remove(paths);
    }
    const { error: imageDeleteError } = await admin.from("images").delete().eq("project_id", projectId);
    if (imageDeleteError) return json({ error: "reset_failed", detail: "images_delete" }, 500);
  }

  const { data: ebooks, error: ebookError } = await admin
    .from("ebooks")
    .select("id")
    .eq("project_id", projectId);
  if (ebookError) return json({ error: "reset_failed", detail: "ebooks_select" }, 500);
  const ebookIds = (ebooks ?? []).map((row) => row.id as string).filter(Boolean);

  if (ebookIds.length > 0) {
    const { error: chapterDeleteError } = await admin.from("chapters").delete().in("ebook_id", ebookIds);
    if (chapterDeleteError) return json({ error: "reset_failed", detail: "chapters_delete" }, 500);
  }

  const now = new Date().toISOString();
  const { error: bumpUnfreezeError } = await admin
    .from("ebooks")
    .update({ index_frozen_at: null, updated_at: now })
    .eq("project_id", projectId)
    .eq("type", "order_bump");
  if (bumpUnfreezeError) return json({ error: "reset_failed", detail: "bump_unfreeze" }, 500);

  const { error: progressResetError } = await admin
    .from("project_content_progress")
    .update({
      current_phase: resetPhase,
      main_index_frozen_at: null,
      global_index_frozen_at: null,
      current_ebook_id: null,
      current_chapter_id: null,
      updated_at: now,
    })
    .eq("project_id", projectId);
  if (progressResetError) return json({ error: "reset_failed", detail: "progress_reset" }, 500);

  const { error: projectUpdateError } = await admin
    .from("projects")
    .update({
      target_avatar: targetAvatar,
      problem,
      updated_at: now,
    })
    .eq("id", projectId);
  if (projectUpdateError) return json({ error: "reset_failed", detail: "project_update" }, 500);

  return json({
    ok: true,
    reset: true,
    current_phase: resetPhase,
  });
});
