import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Supabase client with service role key
 *
 * Service role bypasses RLS, allowing the worker to:
 * - Query pdf_export_jobs table
 * - Fetch project, ebook, and chapter data
 * - Upload PDFs to storage bucket
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      "X-Client-Info": "pdf-export-worker",
    },
  },
});

/**
 * Helper to get signed URL for storage
 *
 * @param {string} path - Storage path (e.g., "project-pdfs/abc123.pdf")
 * @param {number} expiresIn - Expiry in seconds (default 3600 = 1 hour)
 * @returns {Promise<string|null>} Signed URL or null if error
 */
export async function getSignedStorageUrl(path, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from("project-pdfs")
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error("Error in getSignedStorageUrl:", err);
    return null;
  }
}

/**
 * Upload buffer to storage
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - File name (e.g., "project-12345/ebook-67890.pdf")
 * @returns {Promise<{ok: boolean, path: string|null, error: Error|null}>}
 */
export async function uploadPdfToStorage(pdfBuffer, filename) {
  try {
    const { data, error } = await supabase.storage.from("project-pdfs").upload(filename, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (error) {
      return { ok: false, path: null, error };
    }

    return { ok: true, path: data?.path || null, error: null };
  } catch (err) {
    return { ok: false, path: null, error: err };
  }
}
