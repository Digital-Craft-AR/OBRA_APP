-- Issue #65: PDF Export Jobs Table
-- Stores async PDF export job metadata and status
-- Used by Railway cron service to poll and process PDF exports

CREATE TABLE pdf_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job status lifecycle: pending → processing → completed/failed
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Output: signed URL to generated PDF (1-hour expiry)
  pdf_url TEXT,

  -- Error message if job failed (null if successful)
  error_message TEXT,

  -- Retry tracking
  retries INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,

  -- Performance monitoring: render time in milliseconds
  render_duration_ms INT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (now() + INTERVAL '7 days'),

  -- Constraint: job can only be marked failed if max retries exceeded
  CONSTRAINT valid_retry_state CHECK (
    (status = 'failed' AND retries >= max_retries) OR
    (status != 'failed' AND retries < max_retries)
  )
);

-- Indexes for efficient polling
CREATE INDEX idx_pdf_jobs_pending
  ON pdf_export_jobs(status, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_pdf_jobs_processing
  ON pdf_export_jobs(status, created_at)
  WHERE status = 'processing';

CREATE INDEX idx_pdf_jobs_user
  ON pdf_export_jobs(user_id, created_at DESC);

CREATE INDEX idx_pdf_jobs_expires_at
  ON pdf_export_jobs(expires_at)
  WHERE status IN ('completed', 'failed');

-- Row-level security: users can only see their own PDF export jobs
ALTER TABLE pdf_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own PDF export jobs"
  ON pdf_export_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert PDF export jobs"
  ON pdf_export_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update PDF export jobs"
  ON pdf_export_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant access to authenticated users (restricted by RLS)
GRANT SELECT, INSERT, UPDATE ON pdf_export_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pdf_export_jobs TO service_role;
