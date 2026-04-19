import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { rewriteStorageSignedUrlForPublicAccess } from "../_shared/storageSignedUrl.ts";

/**
 * Generates or regenerates a cover/section image for a project deliverable.
 *
 * - Uses Gemini native image generation via REST `generateContent` (no npm SDK — the JS SDK
 *   pulls `.d.ts` graph edges that break Supabase Edge / Deno boot). See:
 *   https://ai.google.dev/gemini-api/docs/image-generation
 * - API key: GOOGLE_GENERATIVE_AI_API_KEY (never exposed to the client).
 * - Stores optimized image in the `project-images` Storage bucket.
 * - Debits credits via obra_credit_ledger_apply on success only.
 * - Marks the project_images row: generating → done | error.
 *
 * POST body:
 * {
 *   projectId: string,
 *   slotKey: "cover_art" | "hero",
 *   ebookId?: string,       // required for hero slots
 *   chapterId?: string,     // required for hero slots
 *   instruction?: string,   // optional user regenerate instruction
 * }
 */

const json = corsJson;

const IMAGE_GENERATE_CREDIT_COST = (() => {
  const raw = Deno.env.get("IMAGE_GENERATE_CREDIT_COST");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
})();

/** Default: Nano Banana 2 (Gemini 3.1 Flash Image) per image-generation docs. */
const GEMINI_MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-3.1-flash-image-preview";

function getGeminiApiKey(): string | null {
  const k = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  return k && k.trim() ? k.trim() : null;
}

function buildCoverPrompt(opts: {
  title: string;
  author: string | null;
  imageStyle: string;
  primaryColor: string;
  accentColor: string;
  locale: string;
  instruction: string | null;
}): string {
  const style = opts.imageStyle ?? "illustration";
  const lang = opts.locale.startsWith("pt") ? "Brazilian Portuguese" : opts.locale.startsWith("en") ? "English" : "Spanish";
  const base = `Digital ebook cover image. Style: ${style}. Title: "${opts.title}".${opts.author ? ` Author: "${opts.author}".` : ""} Primary color: ${opts.primaryColor}, accent: ${opts.accentColor}. Language context: ${lang}. No text overlaid on the image — title and author are rendered separately in HTML. Professional, clean layout suitable for an infoproduct ebook.`;
  return opts.instruction ? `${base} Additional guidance: ${opts.instruction}` : base;
}

function buildHeroPrompt(opts: {
  chapterTitle: string;
  imageStyle: string;
  primaryColor: string;
  locale: string;
  instruction: string | null;
}): string {
  const style = opts.imageStyle ?? "illustration";
  const base = `Chapter section hero image. Style: ${style}. Chapter topic: "${opts.chapterTitle}". Primary color: ${opts.primaryColor}. Wide aspect ratio (16:9 or wider), suitable as a chapter header image. No text in the image.`;
  return opts.instruction ? `${base} Additional guidance: ${opts.instruction}` : base;
}

type GeminiInlinePart = {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function readInlineFromPart(part: GeminiInlinePart): { base64: string; mimeType: string } | null {
  const camel = part.inlineData;
  if (camel && typeof camel.data === "string" && camel.data.length > 0) {
    return { base64: camel.data, mimeType: typeof camel.mimeType === "string" ? camel.mimeType : "image/png" };
  }
  const snake = part.inline_data;
  if (snake && typeof snake.data === "string" && snake.data.length > 0) {
    return { base64: snake.data, mimeType: typeof snake.mime_type === "string" ? snake.mime_type : "image/png" };
  }
  return null;
}

async function callGeminiNativeImageRest(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<{ ok: true; base64: string; mimeType: string } | { ok: false; error: string }> {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });
  } catch (err) {
    console.error("gemini_image_fetch_error", err);
    return { ok: false, error: "gemini_network_error" };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("gemini_image_http_error", res.status, body.slice(0, 400));
    return { ok: false, error: `gemini_http_${res.status}` };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return { ok: false, error: "gemini_invalid_json" };
  }

  const root = parsed as Record<string, unknown>;
  const candidates = root.candidates as unknown[] | undefined;
  const c0 = candidates?.[0] as Record<string, unknown> | undefined;
  const content = c0?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as GeminiInlinePart[] | undefined;
  if (!parts?.length) {
    console.error("gemini_no_candidates", JSON.stringify(parsed).slice(0, 500));
    return { ok: false, error: "gemini_empty_response" };
  }

  for (const part of parts) {
    const img = readInlineFromPart(part);
    if (img) return { ok: true, base64: img.base64, mimeType: img.mimeType };
  }
  return { ok: false, error: "gemini_no_image_part" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user?.id) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return json({ error: "server_misconfigured", detail: "gemini_key_missing" }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const slotKey = typeof body.slotKey === "string" ? body.slotKey : null;
  const ebookId = typeof body.ebookId === "string" ? body.ebookId : null;
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const instruction = typeof body.instruction === "string" ? body.instruction.slice(0, 400) : null;

  if (!projectId || !slotKey) {
    return json({ error: "missing_params", detail: "projectId + slotKey required" }, 400);
  }
  if (slotKey === "hero" && (!ebookId || !chapterId)) {
    return json({ error: "missing_params", detail: "ebookId + chapterId required for hero slot" }, 400);
  }

  const admin = createClient(url, serviceKey);

  // Load project (verify ownership)
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, main_title, author, content_locale, design_config")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr || !project) return json({ error: "not_found" }, 404);
  if (project.user_id !== userId) return json({ error: "forbidden" }, 403);

  const designConfig = project.design_config as Record<string, unknown> | null ?? {};
  const palette = (designConfig.palette as Record<string, string> | null) ?? {};
  const imageStyle = typeof (designConfig as Record<string, unknown>).image === "object"
    ? ((designConfig as Record<string, unknown>).image as Record<string, string> | null)?.style ?? "illustration"
    : "illustration";
  const primaryColor = palette.primary ?? "#204970";
  const accentColor = palette.accent ?? "#c8e62b";
  const locale = typeof project.content_locale === "string" ? project.content_locale : "es";

  // Upsert project_images row as "generating".
  // The unique indexes are partial (WHERE ebook_id IS NULL …) so Supabase JS
  // .upsert({ onConflict }) cannot target them directly.
  // Instead: try SELECT first, then UPDATE or INSERT.
  let imageId: string;
  {
    const isCover = slotKey === "cover_art" && !ebookId && !chapterId;
    let existingId: string | null = null;

    if (isCover) {
      const { data } = await admin
        .from("project_images")
        .select("id")
        .eq("project_id", projectId)
        .eq("slot_key", slotKey)
        .is("ebook_id", null)
        .is("chapter_id", null)
        .maybeSingle();
      existingId = (data as { id: string } | null)?.id ?? null;
    } else {
      const q = admin
        .from("project_images")
        .select("id")
        .eq("project_id", projectId)
        .eq("slot_key", slotKey);
      if (ebookId) q.eq("ebook_id", ebookId); else q.is("ebook_id", null);
      if (chapterId) q.eq("chapter_id", chapterId); else q.is("chapter_id", null);
      const { data } = await q.maybeSingle();
      existingId = (data as { id: string } | null)?.id ?? null;
    }

    if (existingId) {
      const { error: updErr } = await admin
        .from("project_images")
        .update({ status: "generating", storage_path: null, error_detail: null, updated_at: new Date().toISOString() })
        .eq("id", existingId);
      if (updErr) {
        console.error("project_images_update", updErr);
        return json({ error: "db_error" }, 500);
      }
      imageId = existingId;
    } else {
      const { data: newRow, error: insErr } = await admin
        .from("project_images")
        .insert({
          project_id: projectId,
          ebook_id: ebookId ?? null,
          chapter_id: chapterId ?? null,
          slot_key: slotKey,
          layout_id: slotKey === "cover_art" ? "layout_cover_v1" : "layout_body_a",
          status: "generating",
        })
        .select("id")
        .single();
      if (insErr || !newRow?.id) {
        console.error("project_images_insert", insErr);
        return json({ error: "db_error" }, 500);
      }
      imageId = (newRow as { id: string }).id;
    }
  }

  // Build prompt
  let prompt: string;
  if (slotKey === "cover_art") {
    prompt = buildCoverPrompt({
      title: typeof project.main_title === "string" ? project.main_title : "Ebook",
      author: typeof project.author === "string" ? project.author : null,
      imageStyle,
      primaryColor,
      accentColor,
      locale,
      instruction,
    });
  } else {
    // hero: load chapter title
    const { data: chapter } = await admin
      .from("chapters")
      .select("title")
      .eq("id", chapterId)
      .maybeSingle();
    prompt = buildHeroPrompt({
      chapterTitle: typeof chapter?.title === "string" ? chapter.title : "Chapter",
      imageStyle,
      primaryColor,
      locale,
      instruction,
    });
  }

  const geminiResult = await callGeminiNativeImageRest(apiKey, GEMINI_MODEL, prompt);

  if (!geminiResult.ok) {
    await admin
      .from("project_images")
      .update({ status: "error", error_detail: geminiResult.error, updated_at: new Date().toISOString() })
      .eq("id", imageId);
    return json({ error: "image_generation_failed", detail: geminiResult.error }, 502);
  }

  // Upload to Storage
  const ext = geminiResult.mimeType === "image/jpeg" ? "jpg" : "png";
  const storagePath = `${projectId}/${imageId}.${ext}`;
  const imageBytes = Uint8Array.from(atob(geminiResult.base64), (c) => c.charCodeAt(0));

  const { error: storageErr } = await admin.storage
    .from("project-images")
    .upload(storagePath, imageBytes, { contentType: geminiResult.mimeType, upsert: true });

  if (storageErr) {
    console.error("storage_upload", storageErr);
    await admin
      .from("project_images")
      .update({ status: "error", error_detail: "storage_upload_failed", updated_at: new Date().toISOString() })
      .eq("id", imageId);
    return json({ error: "storage_upload_failed" }, 500);
  }

  // Mark done
  await admin
    .from("project_images")
    .update({ status: "done", storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", imageId);

  // Deduct credits on success
  const { data: balanceAfter, error: rpcErr } = await admin.rpc("obra_credit_ledger_apply", {
    p_creator_id: userId,
    p_delta: -IMAGE_GENERATE_CREDIT_COST,
    p_reason: "consumption",
    p_idempotency_key: `image_generate:v1:${imageId}`,
    p_project_id: projectId,
  });

  if (rpcErr) {
    // Non-fatal: image is already uploaded. Log and continue.
    console.error("obra_credit_ledger_apply", rpcErr);
  }

  // Return signed URL (1 hour expiry)
  const { data: signedData } = await admin.storage
    .from("project-images")
    .createSignedUrl(storagePath, 3600);

  return json({
    ok: true,
    imageId,
    storagePath,
    signedUrl: rewriteStorageSignedUrlForPublicAccess(signedData?.signedUrl ?? null, url),
    credits_balance_after: balanceAfter ?? null,
  });
});
