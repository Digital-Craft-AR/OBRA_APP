/**
 * PDF Export API Client
 *
 * Handles communication with Supabase Edge Functions and database
 * for asynchronous PDF export workflow.
 */

import { supabase } from "@/lib/supabaseClient";

export interface PdfExportJob {
  id: string;
  projectId: string;
  ebookId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  pdfUrl: string | null;
  errorMessage: string | null;
  retries: number;
  renderDurationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface QueuePdfExportResponse {
  jobId: string;
  /**
   * Estimated seconds until the PDF is ready.
   * 0 means an existing up-to-date PDF was found and the job is already completed.
   */
  estimatedSeconds: number;
}

export interface PdfExportError {
  code: string;
  detail: string;
  jobId?: string;
}

/**
 * Queue a PDF export job for an ebook
 *
 * @param projectId - UUID of the project
 * @param ebookId - UUID of the ebook to export
 * @returns Job ID and estimated time until completion
 * @throws PdfExportError if project/ebook not found or validation fails
 */
export async function queuePdfExport(
  projectId: string,
  ebookId: string
): Promise<QueuePdfExportResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("export-pdf-queue", {
      body: {
        projectId,
        ebookId,
      },
    });

    if (error) {
      const errorData = error.context?.response?.json?.() || {};
      throw {
        code: errorData.error || "unknown_error",
        detail: errorData.detail || error.message,
        jobId: errorData.jobId,
      } as PdfExportError;
    }

    return data as QueuePdfExportResponse;
  } catch (err) {
    if (err instanceof Error) {
      throw {
        code: "edge_function_error",
        detail: err.message,
      } as PdfExportError;
    }
    throw err;
  }
}

/**
 * Check the status of a PDF export job
 *
 * @param jobId - UUID of the job
 * @returns Job status and metadata
 */
export async function checkPdfStatus(jobId: string): Promise<PdfExportJob> {
  try {
    const { data, error } = await supabase
      .from("pdf_export_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      throw {
        code: "database_error",
        detail: error.message,
      } as PdfExportError;
    }

    if (!data) {
      throw {
        code: "not_found",
        detail: "Job not found",
      } as PdfExportError;
    }

    // Map snake_case from DB to camelCase for frontend
    return {
      id: data.id,
      projectId: data.project_id,
      ebookId: data.ebook_id,
      userId: data.user_id,
      status: data.status,
      pdfUrl: data.pdf_url,
      errorMessage: data.error_message,
      retries: data.retries,
      renderDurationMs: data.render_duration_ms,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw {
        code: "database_error",
        detail: err.message,
      } as PdfExportError;
    }
    throw err;
  }
}

/**
 * Download PDF by triggering browser download from signed URL
 *
 * @param pdfUrl - Signed URL from Supabase Storage
 * @param filename - Filename for the downloaded file
 */
export function downloadPdf(pdfUrl: string, filename: string): void {
  try {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Error downloading PDF:", err);
    throw {
      code: "download_error",
      detail: "Failed to download PDF",
    } as PdfExportError;
  }
}

/**
 * Estimate PDF generation time based on content size
 *
 * Very rough heuristic: 30s base + 1s per chapter
 *
 * @param chapterCount - Number of chapters in ebook
 * @returns Estimated seconds until completion
 */
export function estimatePdfRenderTime(chapterCount: number): number {
  return Math.min(30 + chapterCount, 60); // Cap at 60s
}

/**
 * Get user-friendly error message from error code
 *
 * @param error - Error from PDF export operation
 * @returns User-facing error message
 */
export function getErrorMessage(error: PdfExportError | unknown): string {
  if (!(error instanceof Object) || !("code" in error)) {
    return "An error occurred. Please try again.";
  }

  const err = error as PdfExportError;

  switch (err.code) {
    case "not_found":
      return "Project or ebook not found.";
    case "unauthorized":
      return "You don't have permission to export this PDF.";
    case "forbidden":
      return "You don't own this project.";
    case "invalid_json":
    case "missing_fields":
      return "Invalid request. Please try again.";
    case "edge_function_error":
      return "PDF export service is temporarily unavailable. Please try again later.";
    case "database_error":
      return "Database error. Please try again later.";
    case "download_error":
      return "Failed to download PDF. Please try again.";
    default:
      return err.detail || "PDF export failed. Please try again.";
  }
}
