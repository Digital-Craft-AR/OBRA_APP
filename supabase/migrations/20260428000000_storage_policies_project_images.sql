-- Storage object policies for the private project-images bucket.
-- Object paths always start with the owning project UUID (see image-generate + uploadImage):
--   {project_id}/{image_id}.{ext}              — AI-generated
--   {project_id}/{slot_key}.{ext}              — upload (cover / slot without ebook)
--   {project_id}/{ebook_id}/{slot_key}.{ext}   — upload (chapter slot)
--
-- The bucket row exists (20260427000000) but without policies on storage.objects,
-- signed URL creation or redemption can fail (404/403) for authenticated clients.

create policy "service_role can manage project images"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'project-images')
  with check (bucket_id = 'project-images');

create policy "users can read own project images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-images'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 1)
        and p.user_id = auth.uid()
    )
  );

create policy "users can insert own project images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-images'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 1)
        and p.user_id = auth.uid()
    )
  );

create policy "users can update own project images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-images'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 1)
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-images'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 1)
        and p.user_id = auth.uid()
    )
  );
