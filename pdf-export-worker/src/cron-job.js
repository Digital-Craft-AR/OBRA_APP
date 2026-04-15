import { supabase, getSignedStorageUrl, uploadPdfToStorage } from "./supabase-client.js";
import { buildPdfFromEbook } from "./pdf-builder.js";
import { createLogger } from "./logger.js";

const logger = createLogger("cron-job");

const MAX_BATCH_SIZE = 5; // Process max 5 jobs per cron tick
const MAX_RETRIES = 3;
const PUPPETEER_TIMEOUT = parseInt(process.env.PUPPETEER_TIMEOUT_MS || "55000");

/**
 * Main cron job: Poll and process pending PDF export jobs
 *
 * Flow:
 * 1. Query pdf_export_jobs with status='pending' (up to 5 jobs)
 * 2. For each job:
 *    a. Update status to 'processing'
 *    b. Fetch project, ebook, chapters, images
 *    c. Build PDF via Puppeteer
 *    d. Upload to Storage bucket
 *    e. Create signed URL (1-hour expiry)
 *    f. Update job status to 'completed'
 * 3. On error:
 *    - Increment retries
 *    - If retries < max: keep status 'pending' for next run
 *    - If retries >= max: set status to 'failed' with error message
 *
 * @returns {Promise<{processed: number, failed: number, errors: Array}>}
 */
export async function processPdfExportJobs() {
  const startTime = Date.now();

  try {
    // Step 1: Fetch pending jobs
    const { data: pendingJobs, error: fetchError } = await supabase
      .from("pdf_export_jobs")
      .select("*")
      .eq("status", "pending")
      .lt("retries", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(MAX_BATCH_SIZE);

    if (fetchError) {
      logger.error("Error fetching pending jobs:", fetchError);
      return { processed: 0, failed: 0, errors: [{ code: "fetch_error", detail: fetchError.message }] };
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      logger.debug("No pending PDF export jobs");
      return { processed: 0, failed: 0, errors: [] };
    }

    logger.info(`Found ${pendingJobs.length} pending jobs`);

    const results = [];
    let processed = 0;
    let failed = 0;
    const errors = [];

    // Step 2: Process each job
    for (const job of pendingJobs) {
      try {
        await processJob(job);
        processed++;
      } catch (err) {
        logger.error(`Job ${job.id} processing error:`, err);
        errors.push({
          jobId: job.id,
          code: "processing_error",
          detail: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`Cron job complete: ${processed} processed, ${failed} failed (${duration}ms)`);

    return { processed, failed, errors };
  } catch (err) {
    logger.error("Fatal error in processPdfExportJobs:", err);
    return {
      processed: 0,
      failed: 0,
      errors: [{ code: "fatal_error", detail: err instanceof Error ? err.message : String(err) }],
    };
  }
}

/**
 * Process a single PDF export job
 *
 * @param {Object} job - PDF export job row
 */
async function processJob(job) {
  const jobLogger = createLogger(`job:${job.id.substring(0, 8)}`);

  try {
    // Mark as processing
    const updateProcessing = await supabase
      .from("pdf_export_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    if (updateProcessing.error) {
      throw new Error(`Failed to update status to processing: ${updateProcessing.error.message}`);
    }

    jobLogger.info("Processing PDF export");

    const startRender = Date.now();

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, main_title, author, design_config, layout_page_assignments")
      .eq("id", job.project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${job.project_id}`);
    }

    // Fetch ebook data
    const { data: ebook, error: ebookError } = await supabase
      .from("ebooks")
      .select("id, title, type")
      .eq("id", job.ebook_id)
      .single();

    if (ebookError || !ebook) {
      throw new Error(`Ebook not found: ${job.ebook_id}`);
    }

    // Fetch chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, sort_order, content")
      .eq("ebook_id", job.ebook_id)
      .order("sort_order", { ascending: true });

    if (chaptersError) {
      throw new Error(`Error fetching chapters: ${chaptersError.message}`);
    }

    jobLogger.info(`Loaded ${chapters?.length || 0} chapters`);

    // Fetch cover image if exists
    let coverImageUrl = null;
    if (ebook.type === "main") {
      const { data: coverImage } = await supabase
        .from("project_images")
        .select("storage_path")
        .eq("project_id", job.project_id)
        .eq("slot_key", "cover_art")
        .maybeSingle();

      if (coverImage?.storage_path) {
        coverImageUrl = await getSignedStorageUrl(coverImage.storage_path, 300);
      }
    }

    // Build PDF via Puppeteer
    jobLogger.info("Building PDF via Puppeteer");
    const pdfBuffer = await buildPdfFromEbook({
      project,
      ebook,
      chapters: chapters || [],
      coverImageUrl,
      timeout: PUPPETEER_TIMEOUT,
    });

    jobLogger.info(`PDF built: ${pdfBuffer.length} bytes`);

    // Upload to Storage
    const filename = `${job.project_id}/${job.ebook_id}.pdf`;
    jobLogger.info(`Uploading to storage: ${filename}`);

    const uploadResult = await uploadPdfToStorage(pdfBuffer, filename);
    if (!uploadResult.ok) {
      throw new Error(`Upload failed: ${uploadResult.error?.message}`);
    }

    // Create signed URL (1 hour expiry)
    const signedUrl = await getSignedStorageUrl(filename, 3600);
    if (!signedUrl) {
      throw new Error("Failed to create signed URL");
    }

    // Update job to completed
    const renderDuration = Date.now() - startRender;
    const updateComplete = await supabase
      .from("pdf_export_jobs")
      .update({
        status: "completed",
        pdf_url: signedUrl,
        render_duration_ms: renderDuration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateComplete.error) {
      throw new Error(`Failed to mark job complete: ${updateComplete.error.message}`);
    }

    jobLogger.info(`Completed successfully (${renderDuration}ms)`);
  } catch (err) {
    jobLogger.error("Job processing failed:", err);

    // Update job with error and increment retries
    const newRetries = job.retries + 1;
    const isFinal = newRetries >= MAX_RETRIES;

    const updateError = await supabase
      .from("pdf_export_jobs")
      .update({
        status: isFinal ? "failed" : "pending",
        retries: newRetries,
        error_message: isFinal ? (err instanceof Error ? err.message : String(err)) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError.error) {
      jobLogger.error("Failed to update job error state:", updateError.error);
    }

    if (isFinal) {
      jobLogger.warn(`Job marked as failed after ${newRetries} retries`);
    } else {
      jobLogger.info(`Job will retry (${newRetries}/${MAX_RETRIES})`);
    }

    throw err; // Re-throw for cron-job logging
  }
}
