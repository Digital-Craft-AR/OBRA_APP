import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { rewriteStorageSignedUrlForPublicAccess } from "../_shared/storageSignedUrl.ts";

interface ExportPdfQueueRequest {
  projectId: string;
  ebookId: string;
}

interface ExportPdfQueueResponse {
  jobId: string;
  estimatedSeconds: number;
}

/**
 * Edge Function: Queue a PDF export job
 *
 * Before creating a new job, checks whether an up-to-date PDF already exists:
 *   1. Fetches the most recent completed job for this ebook that has a storage_path.
 *   2. Compares pdf_export_jobs.completed_at against the latest content modification
 *      timestamp (MAX of ebooks.updated_at and chapters.updated_at).
 *   3. If the PDF is newer than the content → refreshes the signed URL and returns
 *      the existing job immediately (estimatedSeconds: 0).
 *   4. Otherwise → creates a new pending job for the Railway worker to pick up.
 *
 * POST /functions/v1/export-pdf-queue
 * Authorization: Bearer {JWT}
 * Body: { projectId: UUID, ebookId: UUID }
 *
 * Returns:
 * - 200: { jobId, estimatedSeconds: 0 }  ← existing up-to-date PDF reused
 * - 201: { jobId, estimatedSeconds: 60 } ← new job queued
 * - 401: Unauthorized
 * - 409: Job already in progress
 * - 422: Invalid input
 * - 500: Server error
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptions();
  }

  if (req.method !== "POST") {
    return corsJson({ error: "method_not_allowed" }, 405);
  }

  try {
    // ── Parse body ────────────────────────────────────────────────────────────
    let body: ExportPdfQueueRequest;
    try {
      body = await req.json();
    } catch {
      return corsJson({ error: "invalid_json", detail: "Request body must be valid JSON" }, 400);
    }

    const { projectId, ebookId } = body;
    if (!projectId || !ebookId) {
      return corsJson({ error: "missing_fields", detail: "projectId and ebookId required" }, 422);
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsJson({ error: "unauthorized", detail: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return corsJson({ error: "server_error" }, 500);
    }

    // User-scoped client (RLS enforced)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service-role client — only used for Storage signed URL generation
    const supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        })
      : null;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return corsJson({ error: "unauthorized", detail: "Invalid token" }, 401);
    }

    const userId = authData.user.id;

    // ── Ownership checks ──────────────────────────────────────────────────────
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return corsJson({ error: "not_found", detail: "Project not found" }, 404);
    }

    if (projectData.user_id !== userId) {
      return corsJson({ error: "forbidden", detail: "You don't own this project" }, 403);
    }

    const { data: ebookData, error: ebookError } = await supabase
      .from("ebooks")
      .select("id, project_id, updated_at")
      .eq("id", ebookId)
      .eq("project_id", projectId)
      .single();

    if (ebookError || !ebookData) {
      return corsJson({ error: "not_found", detail: "Ebook not found in this project" }, 404);
    }

    // ── Reuse existing PDF if content hasn't changed ──────────────────────────
    //
    // Two independent concerns kept separate:
    //  1. SHOULD we reuse?  → timestamp comparison (no service role needed)
    //  2. CAN we refresh the URL? → only if storage_path + supabaseAdmin are available
    //
    // If (1) is true we always return the existing job, even when (2) fails.
    // Exception: if the job has neither pdf_url nor storage_path we can't serve
    // anything, so we fall through and create a new job instead.
    {
      const { data: latestJob } = await supabase
        .from("pdf_export_jobs")
        .select("id, storage_path, pdf_url, completed_at")
        .eq("ebook_id", ebookId)
        .eq("user_id", userId)
        .eq("status", "completed")
        // No storage_path filter — we check all completed jobs
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestJob?.completed_at) {
        // Get the latest modification across ebook metadata + chapter content
        const { data: latestChapter } = await supabase
          .from("chapters")
          .select("updated_at")
          .eq("ebook_id", ebookId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const contentLastModifiedMs = Math.max(
          new Date(ebookData.updated_at ?? 0).getTime(),
          new Date(latestChapter?.updated_at ?? 0).getTime(),
        );

        const pdfGeneratedAtMs = new Date(latestJob.completed_at).getTime();

        if (pdfGeneratedAtMs >= contentLastModifiedMs) {
          // ── Content hasn't changed: try to refresh the signed URL ──────────
          if (supabaseAdmin && latestJob.storage_path) {
            const { data: signed, error: signError } = await supabaseAdmin.storage
              .from("project-pdfs")
              .createSignedUrl(latestJob.storage_path, 3600);

            if (!signError && signed?.signedUrl) {
              const publicUrl =
                rewriteStorageSignedUrlForPublicAccess(signed.signedUrl, supabaseUrl) ?? signed.signedUrl;
              await supabaseAdmin
                .from("pdf_export_jobs")
                .update({ pdf_url: publicUrl })
                .eq("id", latestJob.id);

              console.log(`[export-pdf-queue] reusing job ${latestJob.id} with fresh URL`);
            } else {
              console.warn(`[export-pdf-queue] could not refresh URL for job ${latestJob.id}`, signError);
            }
          }

          // Return the existing job even if URL refresh wasn't possible.
          // The only exception: if there's nothing to serve (no URL and no path
          // to regenerate from) we fall through and create a new job.
          const hasServableUrl = latestJob.storage_path != null || latestJob.pdf_url != null;
          if (hasServableUrl) {
            console.log(`[export-pdf-queue] reusing job ${latestJob.id} — content unchanged`);
            return corsJson(
              { jobId: latestJob.id, estimatedSeconds: 0 } satisfies ExportPdfQueueResponse,
              200,
            );
          }

          console.log(`[export-pdf-queue] job ${latestJob.id} has no URL or path — creating new job`);
        } else {
          console.log(
            `[export-pdf-queue] content changed since last export ` +
              `(pdf: ${latestJob.completed_at}, content: ${new Date(contentLastModifiedMs).toISOString()}) — regenerating`,
          );
        }
      }
    }

    // ── Guard: don't start a second concurrent job ────────────────────────────
    const { data: existingJobs, error: existingError } = await supabase
      .from("pdf_export_jobs")
      .select("id, status")
      .eq("ebook_id", ebookId)
      .eq("user_id", userId)
      .in("status", ["pending", "processing"])
      .limit(1);

    if (existingError) {
      console.error("Error checking existing jobs:", existingError);
      return corsJson({ error: "server_error" }, 500);
    }

    if (existingJobs && existingJobs.length > 0) {
      // An export is already running — return its ID so the frontend can open
      // the modal and track progress, instead of showing an error.
      return corsJson(
        { jobId: existingJobs[0].id, estimatedSeconds: 60 } satisfies ExportPdfQueueResponse,
        200,
      );
    }

    // ── Create new job ────────────────────────────────────────────────────────
    const { data: newJob, error: createError } = await supabase
      .from("pdf_export_jobs")
      .insert([{ project_id: projectId, ebook_id: ebookId, user_id: userId, status: "pending" }])
      .select("id")
      .single();

    if (createError || !newJob) {
      console.error("Error creating PDF job:", createError);
      return corsJson({ error: "server_error" }, 500);
    }

    return corsJson(
      { jobId: newJob.id, estimatedSeconds: 60 } satisfies ExportPdfQueueResponse,
      201,
    );
  } catch (error) {
    console.error("Unexpected error in export-pdf-queue:", error);
    return corsJson({ error: "server_error", detail: String(error) }, 500);
  }
});
