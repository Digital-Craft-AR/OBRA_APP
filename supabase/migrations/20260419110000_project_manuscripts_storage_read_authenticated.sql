-- Allow project owners to read their own manuscript objects from Storage (client prefill after parse).

create policy "project_manuscripts_read_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-manuscripts'
    and split_part(name, '/', 1) = auth.uid()::text
  );
