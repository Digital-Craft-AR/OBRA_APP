import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsJson, corsOptions } from "../_shared/cors.ts";

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
 * Always creates a new pending job for the Railway worker to pick up.
 * The only exception: if a job is already pending/processing for this ebook,
 * returns that job's ID so the frontend can track it without duplication.
 *
 * POST /functions/v1/export-pdf-queue
 * Authorization: Bearer {JWT}
 * Body: { projectId: UUID, ebookId: UUID }
 *
 * Returns:
 * - 200: { jobId, estimatedSeconds: 60 } ← in-progress job returned
 * - 201: { jobId, estimatedSeconds: 60 } ← new job queued
 * - 401: Unauthorized
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

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return corsJson({ error: "server_error" }, 500);
    }

    // User-scoped client (RLS enforced)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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
      .select("id, project_id")
      .eq("id", ebookId)
      .eq("project_id", projectId)
      .single();

    if (ebookError || !ebookData) {
      return corsJson({ error: "not_found", detail: "Ebook not found in this project" }, 404);
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
