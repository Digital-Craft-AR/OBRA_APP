import { supabase } from "@/lib/supabaseClient";
import { rewriteStorageSignedUrlForPublicAccess } from "@/lib/preview/storageSignedUrl";

const publicSupabaseApiUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Strips accidental bucket prefix and leading slashes so createSignedUrl uses the object key only. */
function normalizeProjectImageStoragePath(storagePath: string): string {
  let p = storagePath.trim();
  while (p.startsWith("/")) p = p.slice(1);
  const bucketPrefix = "project-images/";
  if (p.length >= bucketPrefix.length && p.slice(0, bucketPrefix.length).toLowerCase() === bucketPrefix) {
    p = p.slice(bucketPrefix.length);
  }
  while (p.startsWith("/")) p = p.slice(1);
  return p.trim();
}

export type ImageSlotStatus = "pending" | "generating" | "done" | "error";

export type ProjectImageRow = {
  id: string;
  project_id: string;
  ebook_id: string | null;
  chapter_id: string | null;
  slot_key: string;
  layout_id: string;
  storage_path: string | null;
  status: ImageSlotStatus;
  prompt: string | null;
};

export async function loadProjectImages(
  projectId: string,
): Promise<{ ok: true; rows: ProjectImageRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("project_images")
    .select("id, project_id, ebook_id, chapter_id, slot_key, layout_id, storage_path, status, prompt")
    .eq("project_id", projectId);

  if (error || !data) return { ok: false };
  return { ok: true, rows: data as ProjectImageRow[] };
}

export type GenerateImageResult =
  | { ok: true; imageId: string; signedUrl: string | null; credits_balance_after: number | null; aspectRatio: string | null }
  | { ok: false; code: string };

export async function generateImage(args: {
  projectId: string;
  slotKey: string;
  ebookId?: string;
  chapterId?: string;
  instruction?: string;
}): Promise<GenerateImageResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, code: "unauthenticated" };

  const { data, error } = await supabase.functions.invoke("image-generate", {
    body: {
      projectId: args.projectId,
      slotKey: args.slotKey,
      ebookId: args.ebookId ?? null,
      chapterId: args.chapterId ?? null,
      instruction: args.instruction ?? null,
    },
  });

  if (error) return { ok: false, code: "invoke_error" };
  if (!data?.ok) return { ok: false, code: data?.error ?? "unknown" };

  return {
    ok: true,
    imageId: data.imageId as string,
    signedUrl: rewriteStorageSignedUrlForPublicAccess(
      (data.signedUrl as string | null) ?? null,
      publicSupabaseApiUrl,
    ),
    credits_balance_after: typeof data.credits_balance_after === "number" ? data.credits_balance_after : null,
    aspectRatio: typeof data.aspectRatio === "string" ? data.aspectRatio : null,
  };
}

/**
 * Returns a signed URL for a stored project image (1-hour expiry).
 * The image-generate function already returns a signed URL on success;
 * this is used for existing rows when re-loading the preview.
 */
export async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  const path = normalizeProjectImageStoragePath(storagePath);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("project-images")
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return null;
  return rewriteStorageSignedUrlForPublicAccess(data.signedUrl, publicSupabaseApiUrl);
}

export type UploadImageResult =
  | { ok: true; signedUrl: string; storagePath: string }
  | { ok: false; code: string };

/**
 * Uploads a local File to the project-images bucket and records the slot in
 * project_images. Uses the browser Supabase client (RLS enforced).
 *
 * Storage path: `{projectId}/{slotKey}.{ext}` (cover), `{projectId}/{ebookId}/{slotKey}.{ext}`
 * (ebook-only), or `{projectId}/{ebookId}/{chapterId}/{slotKey}.{ext}` when `chapterId` is set
 * (per-chapter hero — avoids collisions between chapters).
 * Table: upserts project_images via select-then-update/insert (partial indexes
 * cannot be targeted by .upsert onConflict in the JS client).
 */
export async function uploadImage(args: {
  projectId: string;
  slotKey: string;
  file: File;
  ebookId?: string;
  chapterId?: string;
}): Promise<UploadImageResult> {
  const { projectId, slotKey, file, ebookId, chapterId } = args;

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) return { ok: false, code: "unauthenticated" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath =
    ebookId && chapterId
      ? `${userId}/${projectId}/${ebookId}/${chapterId}/${slotKey}.${ext}`
      : ebookId
        ? `${userId}/${projectId}/${ebookId}/${slotKey}.${ext}`
        : `${userId}/${projectId}/${slotKey}.${ext}`;

  // Upload (upsert) to Storage
  const { error: uploadErr } = await supabase.storage
    .from("project-images")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadErr) return { ok: false, code: "upload_failed" };

  // Upsert project_images row using select-then-update/insert
  // (partial unique indexes can't be targeted by .upsert onConflict)
  const isCover = slotKey === "cover_art";
  let existingId: string | null = null;

  if (isCover) {
    // Cover slots are scoped per ebook; ebookId must be provided by caller.
    let q = supabase
      .from("project_images")
      .select("id")
      .eq("project_id", projectId)
      .eq("slot_key", slotKey)
      .is("chapter_id", null);
    if (ebookId) q = q.eq("ebook_id", ebookId); else q = q.is("ebook_id", null);
    const { data } = await q.maybeSingle();
    existingId = (data as { id: string } | null)?.id ?? null;
  } else {
    let q = supabase
      .from("project_images")
      .select("id")
      .eq("project_id", projectId)
      .eq("slot_key", slotKey);
    if (ebookId) q = q.eq("ebook_id", ebookId); else q = q.is("ebook_id", null);
    if (chapterId) q = q.eq("chapter_id", chapterId); else q = q.is("chapter_id", null);
    const { data } = await q.maybeSingle();
    existingId = (data as { id: string } | null)?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase
      .from("project_images")
      .update({ storage_path: storagePath, status: "done", error_detail: null, updated_at: new Date().toISOString() })
      .eq("id", existingId);
    if (error) return { ok: false, code: "db_update_failed" };
  } else {
    const { error } = await supabase
      .from("project_images")
      .insert({
        project_id: projectId,
        ebook_id: ebookId ?? null,
        chapter_id: chapterId ?? null,
        slot_key: slotKey,
        layout_id: slotKey === "cover_art" ? "layout_cover_v1" : "layout_body_a",
        storage_path: storagePath,
        status: "done",
      });
    if (error) return { ok: false, code: "db_insert_failed" };
  }

  const signedUrl = await getSignedImageUrl(storagePath);
  if (!signedUrl) return { ok: false, code: "signed_url_failed" };

  return {
    ok: true,
    signedUrl: rewriteStorageSignedUrlForPublicAccess(signedUrl, publicSupabaseApiUrl) ?? signedUrl,
    storagePath,
  };
}
