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
 * Creates a pending job in pdf_export_jobs table.
 * Railway cron service polls this table and processes jobs.
 *
 * POST /functions/v1/export-pdf-queue
 * Authorization: Bearer {JWT}
 * Body: { projectId: UUID, ebookId: UUID }
 *
 * Returns:
 * - 201: { jobId, estimatedSeconds }
 * - 401: Unauthorized
 * - 422: Invalid input
 * - 500: Server error
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptions();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return corsJson({ error: "method_not_allowed" }, 405);
  }

  try {
    // Parse request body
    let body: ExportPdfQueueRequest;
    try {
      body = await req.json();
    } catch {
      return corsJson({ error: "invalid_json", detail: "Request body must be valid JSON" }, 400);
    }

    // Validate input
    const { projectId, ebookId } = body;
    if (!projectId || !ebookId) {
      return corsJson({ error: "missing_fields", detail: "projectId and ebookId required" }, 422);
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return corsJson({ error: "unauthorized", detail: "Missing Authorization header" }, 401);
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return corsJson({ error: "server_error" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return corsJson({ error: "unauthorized", detail: "Invalid token" }, 401);
    }

    const userId = authData.user.id;

    // Verify project ownership (check if user owns this project)
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

    // Verify ebook belongs to project
    const { data: ebookData, error: ebookError } = await supabase
      .from("ebooks")
      .select("id, project_id")
      .eq("id", ebookId)
      .eq("project_id", projectId)
      .single();

    if (ebookError || !ebookData) {
      return corsJson({ error: "not_found", detail: "Ebook not found in this project" }, 404);
    }

    // Check if there's already a pending job for this ebook (prevent spam)
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
      return corsJson(
        {
          error: "duplicate_job",
          detail: "A PDF export is already in progress for this ebook",
          jobId: existingJobs[0].id,
        },
        409,
      );
    }

    // Create new job
    const { data: newJob, error: createError } = await supabase
      .from("pdf_export_jobs")
      .insert([
        {
          project_id: projectId,
          ebook_id: ebookId,
          user_id: userId,
          status: "pending",
        },
      ])
      .select("id")
      .single();

    if (createError || !newJob) {
      console.error("Error creating PDF job:", createError);
      return corsJson({ error: "server_error" }, 500);
    }

    // Estimate render time based on content (rough heuristic)
    // Small docs: 30s, medium: 45s, large: 60s
    const estimatedSeconds = 60;

    // Return success response
    const response: ExportPdfQueueResponse = {
      jobId: newJob.id,
      estimatedSeconds,
    };

    return corsJson(response, 201);
  } catch (error) {
    console.error("Unexpected error in export-pdf-queue:", error);
    return corsJson({ error: "server_error", detail: String(error) }, 500);
  }
});
