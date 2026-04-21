-- Case-insensitive match of the first path segment to projects.id::text.
-- Uppercase UUID segments in object names would fail plain text equality against
-- p.id::text (canonical lowercase), blocking createSignedUrl / fetch.

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
      where p.id::text = lower(split_part(name, '/', 1))
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
      where p.id::text = lower(split_part(name, '/', 1))
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
      where p.id::text = lower(split_part(name, '/', 1))
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-images'
    and exists (
      select 1
      from public.projects p
      where p.id::text = lower(split_part(name, '/', 1))
        and p.user_id = auth.uid()
    )
  );
