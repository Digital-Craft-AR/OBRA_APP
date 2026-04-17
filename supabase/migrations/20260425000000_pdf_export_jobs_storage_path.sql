-- Add storage_path column to pdf_export_jobs.
--
-- The worker must persist the raw Storage object path (e.g. "{user_id}/{ebook_id}.pdf")
-- alongside the signed URL so the Edge Function can regenerate a fresh signed URL
-- on demand without creating a new Puppeteer job.
--
-- Expected path format: {user_id}/{ebook_id}.pdf
-- This matches the storage RLS policy in 20260424000000.

ALTER TABLE pdf_export_jobs ADD COLUMN storage_path TEXT;
