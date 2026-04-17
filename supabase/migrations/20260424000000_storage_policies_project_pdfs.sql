-- Storage object policies for project-pdfs bucket.
-- The bucket was created private (public=false) but had no object-level policies,
-- which can silently block signed-URL redemption in some Supabase versions.
-- These policies grant service_role full access and allow authenticated users
-- to read objects stored under their own user_id prefix.
--
-- Expected storage path format used by the Railway worker:
--   project-pdfs/{user_id}/{job_id}.pdf

-- Service role: full access for the Railway worker uploads
CREATE POLICY "service_role can manage project PDFs"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'project-pdfs')
  WITH CHECK (bucket_id = 'project-pdfs');

-- Authenticated users: can read their own PDFs (belt-and-suspenders alongside signed URLs)
CREATE POLICY "users can read own project PDFs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
