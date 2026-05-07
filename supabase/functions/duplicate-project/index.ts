import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Idempotency TTL: replays within this window return the cached result.
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

function localizedNameSuffix(contentLocale: string): string {
  if (contentLocale === "pt-BR") return " - Cópia";
  if (contentLocale === "en-US" || contentLocale === "en-GB") return " - Copy";
  return " - Copia"; // es and fallback
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
  const clientRequestId = typeof payload?.client_request_id === "string" ? payload.client_request_id : null;

  if (!projectId) return json({ error: "invalid_payload", detail: "project_id" }, 400);
  if (!clientRequestId) return json({ error: "invalid_payload", detail: "client_request_id" }, 400);

  const pub = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await pub.auth.getUser(jwt);
  if (userError || !user) {
    return json({ error: "unauthorized", detail: "invalid_or_expired_session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // --- Idempotency check ---
  const { data: existingJob, error: jobLookupError } = await admin
    .from("duplicate_jobs")
    .select("id, status, new_project_id, created_at, error_detail")
    .eq("user_id", user.id)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (jobLookupError && !isMissingRelation(jobLookupError)) {
    return json({ error: "duplicate_check_failed", detail: jobLookupError.message }, 500);
  }

  if (existingJob) {
    const age = Date.now() - new Date(existingJob.created_at as string).getTime();
    if (age < IDEMPOTENCY_TTL_MS) {
      if (existingJob.status === "done" && existingJob.new_project_id) {
        return json({ ok: true, new_project_id: existingJob.new_project_id, idempotent: true }, 200);
      }
      if (existingJob.status === "pending") {
        return json({ error: "duplicate_in_progress" }, 409);
      }
      // status === "error": allow retry by falling through (will upsert a new job row)
    }
  }

  // --- Verify ownership of source project ---
  const { data: source, error: sourceError } = await admin
    .from("projects")
    .select("id, user_id, name, content_locale, content_source, topic, main_title, author, target_avatar, problem, structure_completed_at, design_config, bonus_count, bump_count, bonus_items, bump_items, lifecycle_status, publish_status")
    .eq("id", projectId)
    .maybeSingle();

  if (sourceError || !source) return json({ error: "project_not_found" }, 404);
  if ((source.user_id as string) !== user.id) return json({ error: "forbidden" }, 403);

  // --- Register job as pending (idempotency insert) ---
  const { data: job, error: jobInsertError } = await admin
    .from("duplicate_jobs")
    .upsert(
      {
        user_id: user.id,
        source_project_id: projectId,
        client_request_id: clientRequestId,
        status: "pending",
        new_project_id: null,
        error_detail: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      },
      { onConflict: "user_id,client_request_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (jobInsertError || !job) {
    return json({ error: "job_insert_failed", detail: jobInsertError?.message }, 500);
  }
  const jobId = job.id as string;

  async function failJob(detail: string) {
    await admin
      .from("duplicate_jobs")
      .update({ status: "error", error_detail: detail, completed_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  // ============================================================
  // DEEP COPY — DB FIRST, THEN STORAGE
  // Strategy: insert all DB rows, build old→new ID maps, then
  // copy Storage blobs. Partial Storage failure is logged but
  // does not roll back committed DB rows (MVP; see ARQUITECTURA §3).
  // ============================================================

  const now = new Date().toISOString();
  const newName = `${source.name as string}${localizedNameSuffix(source.content_locale as string)}`;

  // 1. New project row
  const { data: newProject, error: newProjectError } = await admin
    .from("projects")
    .insert({
      user_id: user.id,
      name: newName,
      content_locale: source.content_locale,
      content_source: source.content_source,
      topic: source.topic,
      main_title: source.main_title,
      author: source.author,
      target_avatar: source.target_avatar,
      problem: source.problem,
      structure_completed_at: source.structure_completed_at,
      design_config: source.design_config,
      bonus_count: source.bonus_count,
      bump_count: source.bump_count,
      bonus_items: source.bonus_items,
      bump_items: source.bump_items,
      lifecycle_status: "active",
      publish_status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (newProjectError || !newProject) {
    await failJob(`project_insert: ${newProjectError?.message}`);
    return json({ error: "duplicate_failed", detail: "project_insert" }, 500);
  }
  const newProjectId = newProject.id as string;

  // 2. Ebooks
  const { data: sourceEbooks, error: ebooksError } = await admin
    .from("ebooks")
    .select("id, type, title, subtitle, package_ordinal, index_json, html_shell, shell_meta, index_frozen_at, updated_at")
    .eq("project_id", projectId);

  if (ebooksError) {
    await failJob(`ebooks_select: ${ebooksError.message}`);
    return json({ error: "duplicate_failed", detail: "ebooks_select" }, 500);
  }

  // Map old ebook ID → new ebook ID
  const ebookIdMap: Record<string, string> = {};

  if ((sourceEbooks ?? []).length > 0) {
    const ebookInserts = (sourceEbooks ?? []).map((e) => ({
      project_id: newProjectId,
      type: e.type,
      title: e.title,
      subtitle: e.subtitle,
      package_ordinal: e.package_ordinal,
      index_json: e.index_json,
      html_shell: e.html_shell,
      shell_meta: e.shell_meta,
      // Clear index_frozen_at on bumps per reset semantics; keep for main/bonus
      index_frozen_at: (e.type as string) === "order_bump" ? null : e.index_frozen_at,
      created_at: now,
      updated_at: now,
    }));

    const { data: newEbooks, error: ebookInsertError } = await admin
      .from("ebooks")
      .insert(ebookInserts)
      .select("id, type, package_ordinal");

    if (ebookInsertError || !newEbooks) {
      await failJob(`ebook_insert: ${ebookInsertError?.message}`);
      return json({ error: "duplicate_failed", detail: "ebook_insert" }, 500);
    }

    // Build the old→new ebook map by matching type + package_ordinal
    for (const src of sourceEbooks ?? []) {
      const match = newEbooks.find(
        (ne) => ne.type === src.type && ne.package_ordinal === src.package_ordinal,
      );
      if (match) ebookIdMap[src.id as string] = match.id as string;
    }
  }

  // 3. Chapters (with image_id remapping placeholder — images come after)
  const { data: sourceChapters, error: chaptersError } = await admin
    .from("chapters")
    .select("id, ebook_id, sort_order, title, content, approved_at, stale_after_index_title_change, title_at_last_global_confirm")
    .in("ebook_id", Object.keys(ebookIdMap).length > 0 ? Object.keys(ebookIdMap) : ["00000000-0000-0000-0000-000000000000"]);

  if (chaptersError) {
    await failJob(`chapters_select: ${chaptersError.message}`);
    return json({ error: "duplicate_failed", detail: "chapters_select" }, 500);
  }

  // Map old chapter ID → new chapter ID
  const chapterIdMap: Record<string, string> = {};

  if ((sourceChapters ?? []).length > 0) {
    const chapterInserts = (sourceChapters ?? []).map((c) => ({
      ebook_id: ebookIdMap[c.ebook_id as string],
      sort_order: c.sort_order,
      title: c.title,
      content: c.content,
      approved_at: c.approved_at,
      stale_after_index_title_change: c.stale_after_index_title_change,
      title_at_last_global_confirm: c.title_at_last_global_confirm,
      created_at: now,
    }));

    const { data: newChapters, error: chapterInsertError } = await admin
      .from("chapters")
      .insert(chapterInserts)
      .select("id, ebook_id, sort_order");

    if (chapterInsertError || !newChapters) {
      await failJob(`chapter_insert: ${chapterInsertError?.message}`);
      return json({ error: "duplicate_failed", detail: "chapter_insert" }, 500);
    }

    // Build the old→new chapter map by matching ebook + sort_order
    for (const src of sourceChapters ?? []) {
      const newEbookId = ebookIdMap[src.ebook_id as string];
      const match = newChapters.find(
        (nc) => nc.ebook_id === newEbookId && nc.sort_order === src.sort_order,
      );
      if (match) chapterIdMap[src.id as string] = match.id as string;
    }
  }

  // 4. project_content_progress
  const { data: srcProgress, error: progressSelectError } = await admin
    .from("project_content_progress")
    .select("current_phase, main_index_frozen_at, global_index_frozen_at, current_ebook_id, current_chapter_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (progressSelectError) {
    await failJob(`progress_select: ${progressSelectError.message}`);
    return json({ error: "duplicate_failed", detail: "progress_select" }, 500);
  }

  if (srcProgress) {
    const newCurrentEbookId = srcProgress.current_ebook_id
      ? (ebookIdMap[srcProgress.current_ebook_id as string] ?? null)
      : null;
    const newCurrentChapterId = srcProgress.current_chapter_id
      ? (chapterIdMap[srcProgress.current_chapter_id as string] ?? null)
      : null;

    const { error: progressInsertError } = await admin
      .from("project_content_progress")
      .insert({
        project_id: newProjectId,
        current_phase: srcProgress.current_phase,
        main_index_frozen_at: srcProgress.main_index_frozen_at,
        global_index_frozen_at: srcProgress.global_index_frozen_at,
        current_ebook_id: newCurrentEbookId,
        current_chapter_id: newCurrentChapterId,
        updated_at: now,
      });

    if (progressInsertError) {
      await failJob(`progress_insert: ${progressInsertError.message}`);
      return json({ error: "duplicate_failed", detail: "progress_insert" }, 500);
    }
  }

  // 5. project_structure_drafts (copy if present — source still in Structure)
  const { data: srcDraft, error: draftSelectError } = await admin
    .from("project_structure_drafts")
    .select("draft_json, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (draftSelectError && !isMissingRelation(draftSelectError)) {
    await failJob(`draft_select: ${draftSelectError.message}`);
    return json({ error: "duplicate_failed", detail: "draft_select" }, 500);
  }

  if (srcDraft) {
    const { error: draftInsertError } = await admin
      .from("project_structure_drafts")
      .insert({
        project_id: newProjectId,
        draft_json: srcDraft.draft_json,
        updated_at: now,
      });

    if (draftInsertError && !isMissingRelation(draftInsertError)) {
      await failJob(`draft_insert: ${draftInsertError.message}`);
      return json({ error: "duplicate_failed", detail: "draft_insert" }, 500);
    }
  }

  // 6. project_manuscripts — active row only (superseded_at IS NULL); copy Storage blob
  const { data: srcManuscript, error: manuscriptSelectError } = await admin
    .from("project_manuscripts")
    .select("id, storage_path, extracted_text_storage_path, mime, byte_size, checksum_sha256, extracted_char_count")
    .eq("project_id", projectId)
    .is("superseded_at", null)
    .maybeSingle();

  if (manuscriptSelectError && !isMissingRelation(manuscriptSelectError)) {
    await failJob(`manuscript_select: ${manuscriptSelectError.message}`);
    return json({ error: "duplicate_failed", detail: "manuscript_select" }, 500);
  }

  if (srcManuscript) {
    const srcPath = srcManuscript.storage_path as string;
    const srcExtPath = srcManuscript.extracted_text_storage_path as string | null;

    // Derive new paths by replacing source project_id segment with new project_id
    const newPath = srcPath.replace(projectId, newProjectId);
    const newExtPath = srcExtPath ? srcExtPath.replace(projectId, newProjectId) : null;

    // Copy binary blobs first
    const { error: blobCopyError } = await admin.storage
      .from("project-manuscripts")
      .copy(srcPath, newPath);

    if (blobCopyError) {
      await failJob(`manuscript_blob_copy: ${blobCopyError.message}`);
      return json({ error: "duplicate_failed", detail: "manuscript_blob_copy" }, 500);
    }

    if (srcExtPath && newExtPath) {
      // Best-effort copy of extracted text; non-fatal if missing
      await admin.storage.from("project-manuscripts").copy(srcExtPath, newExtPath);
    }

    const { error: manuscriptInsertError } = await admin
      .from("project_manuscripts")
      .insert({
        project_id: newProjectId,
        storage_path: newPath,
        extracted_text_storage_path: newExtPath,
        mime: srcManuscript.mime,
        byte_size: srcManuscript.byte_size,
        checksum_sha256: srcManuscript.checksum_sha256,
        extracted_char_count: srcManuscript.extracted_char_count,
        uploaded_at: now,
        superseded_at: null,
      });

    if (manuscriptInsertError && !isMissingRelation(manuscriptInsertError)) {
      await failJob(`manuscript_insert: ${manuscriptInsertError.message}`);
      return json({ error: "duplicate_failed", detail: "manuscript_insert" }, 500);
    }
  }

  // 7. project_images — copy rows + Storage blobs; best-effort (images are regeneratable)
  const { data: srcImages, error: imagesSelectError } = await admin
    .from("project_images")
    .select("id, ebook_id, chapter_id, slot_key, layout_id, storage_path, status")
    .eq("project_id", projectId);

  if (imagesSelectError && !isMissingRelation(imagesSelectError)) {
    await failJob(`images_select: ${imagesSelectError.message}`);
    return json({ error: "duplicate_failed", detail: "images_select" }, 500);
  }

  if (Array.isArray(srcImages) && srcImages.length > 0) {
    const imageInserts: Record<string, unknown>[] = [];
    const storageCopyPairs: { src: string; dest: string }[] = [];

    for (const img of srcImages) {
      const newEbookId = img.ebook_id ? (ebookIdMap[img.ebook_id as string] ?? null) : null;
      const newChapterId = img.chapter_id ? (chapterIdMap[img.chapter_id as string] ?? null) : null;

      let newStoragePath: string | null = null;
      if (img.storage_path) {
        // Paths follow {user_id}/{project_id}/... pattern
        newStoragePath = (img.storage_path as string).replace(projectId, newProjectId);
        storageCopyPairs.push({ src: img.storage_path as string, dest: newStoragePath });
      }

      imageInserts.push({
        project_id: newProjectId,
        ebook_id: newEbookId,
        chapter_id: newChapterId,
        slot_key: img.slot_key,
        layout_id: img.layout_id,
        storage_path: newStoragePath,
        // Only carry done status if we have a path to copy; otherwise reset to pending
        status: img.storage_path && img.status === "done" ? "done" : "pending",
        created_at: now,
        updated_at: now,
      });
    }

    // Best-effort Storage blob copies (non-fatal)
    for (const { src, dest } of storageCopyPairs) {
      await admin.storage.from("project-images").copy(src, dest);
    }

    if (imageInserts.length > 0) {
      const { error: imageInsertError } = await admin
        .from("project_images")
        .insert(imageInserts);

      if (imageInsertError && !isMissingRelation(imageInsertError)) {
        // Non-fatal: images can be regenerated in Preview
        console.error("[duplicate-project] image_insert partial failure:", imageInsertError.message);
      }
    }
  }

  // --- Mark job done ---
  await admin
    .from("duplicate_jobs")
    .update({ status: "done", new_project_id: newProjectId, completed_at: new Date().toISOString() })
    .eq("id", jobId);

  return json({ ok: true, new_project_id: newProjectId }, 201);
});
