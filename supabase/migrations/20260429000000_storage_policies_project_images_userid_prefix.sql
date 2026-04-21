-- Fix project-images storage policies.
-- Root cause: the previous SELECT policy used an EXISTS subquery joining public.projects,
-- which can silently return false in certain Supabase Storage RLS evaluation contexts
-- (especially when objects were uploaded by service_role, leaving owner = NULL).
--
-- Fix: change storage path convention to {userId}/{projectId}/… so the first path
-- segment is always the owner's user_id — identical to project-manuscripts and
-- project-pdfs. Policy becomes a direct text comparison with no JOIN.
--
-- Backward compat: the OR branch retains the old EXISTS check for objects that were
-- already uploaded in the old {projectId}/… format so they continue to be accessible
-- while users regenerate them with the new path format.

drop policy if exists "users can read own project images" on storage.objects;
drop policy if exists "users can insert own project images" on storage.objects;
drop policy if exists "users can update own project images" on storage.objects;

create policy "users can read own project images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-images'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.projects p
        where p.id::text = lower(split_part(name, '/', 1))
          and p.user_id = auth.uid()
      )
    )
  );

create policy "users can insert own project images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "users can update own project images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-images'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.projects p
        where p.id::text = lower(split_part(name, '/', 1))
          and p.user_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'project-images'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.projects p
        where p.id::text = lower(split_part(name, '/', 1))
          and p.user_id = auth.uid()
      )
    )
  );
