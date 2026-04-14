import { supabase } from "@/lib/supabaseClient";

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
};

export async function loadProjectImages(
  projectId: string,
): Promise<{ ok: true; rows: ProjectImageRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("project_images")
    .select("id, project_id, ebook_id, chapter_id, slot_key, layout_id, storage_path, status")
    .eq("project_id", projectId);

  if (error || !data) return { ok: false };
  return { ok: true, rows: data as ProjectImageRow[] };
}

export type GenerateImageResult =
  | { ok: true; imageId: string; signedUrl: string | null; credits_balance_after: number | null }
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
    signedUrl: (data.signedUrl as string | null) ?? null,
    credits_balance_after: typeof data.credits_balance_after === "number" ? data.credits_balance_after : null,
  };
}

/**
 * Returns a signed URL for a stored project image (1-hour expiry).
 * The image-generate function already returns a signed URL on success;
 * this is used for existing rows when re-loading the preview.
 */
export async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("project-images")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
