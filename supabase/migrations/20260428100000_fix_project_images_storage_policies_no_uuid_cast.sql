-- Replace project-images object policies: avoid (split_part(name,'/',1))::uuid in RLS.
-- Casting a non-UUID first path segment (e.g. legacy or mistaken object names) throws
-- "invalid input syntax for type uuid" and breaks Storage API queries on that bucket.
-- Compare project id as text to the first path segment instead.

drop policy if exists "users can read own project images" on storage.objects;
drop policy if exists "users can insert own project images" on storage.objects;
drop policy if exists "users can update own project images" on storage.objects;

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
