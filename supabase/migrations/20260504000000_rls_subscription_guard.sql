-- Issue #128: Enforce active subscription in Postgres RLS.
-- An authenticated user with a non-active subscription must not be able to
-- read or write paid-product data via PostgREST.
--
-- Business rule (mirrors resolveEntitlement.ts):
--   access = subscription_status = 'active'
--             OR (subscription_access_until IS NOT NULL AND subscription_access_until > now())
--
-- Tables NOT guarded (allowed without subscription):
--   creator_profiles  — needed for auth, profile, checkout, billing
--   credit_ledger_entries — read-only; user should always see their balance
--   rate_limit_buckets    — internal
--
-- Allowed states summary:
--   active                          → full read + write
--   past_due / cancelled + access_until in future → full read + write (grace period)
--   none / expired cancelled/past_due             → no access to paid tables

-- ---------------------------------------------------------------------------
-- Helper: obra_has_subscription_access(uid)
-- Security DEFINER so RLS policies can call it without granting SELECT on
-- creator_profiles to the policy evaluator directly.
-- ---------------------------------------------------------------------------
create or replace function public.obra_has_subscription_access(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.creator_profiles
    where id = p_uid
      and (
        subscription_status = 'active'
        or (subscription_access_until is not null and subscription_access_until > now())
      )
  );
$$;

comment on function public.obra_has_subscription_access(uuid) is
  'Obra: returns true when the user has paid access — active status or within a '
  'paid billing period (subscription_access_until > now()). Mirrors resolveEntitlement.ts.';

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
drop policy if exists "projects_select_own"   on public.projects;
drop policy if exists "projects_insert_own"   on public.projects;
drop policy if exists "projects_update_own"   on public.projects;
drop policy if exists "projects_delete_own"   on public.projects;

create policy "projects_select_own"
  on public.projects for select to authenticated
  using (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));

create policy "projects_insert_own"
  on public.projects for insert to authenticated
  with check (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));

create policy "projects_update_own"
  on public.projects for update to authenticated
  using  (auth.uid() = user_id and obra_has_subscription_access(auth.uid()))
  with check (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));

create policy "projects_delete_own"
  on public.projects for delete to authenticated
  using (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));

-- ---------------------------------------------------------------------------
-- ebooks
-- ---------------------------------------------------------------------------
drop policy if exists "ebooks_select_own"  on public.ebooks;
drop policy if exists "ebooks_insert_own"  on public.ebooks;
drop policy if exists "ebooks_update_own"  on public.ebooks;
drop policy if exists "ebooks_delete_own"  on public.ebooks;

create policy "ebooks_select_own"
  on public.ebooks for select to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid())
  );

create policy "ebooks_insert_own"
  on public.ebooks for insert to authenticated
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid())
  );

create policy "ebooks_update_own"
  on public.ebooks for update to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid())
  )
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid())
  );

create policy "ebooks_delete_own"
  on public.ebooks for delete to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- chapters
-- ---------------------------------------------------------------------------
drop policy if exists "chapters_select_own"  on public.chapters;
drop policy if exists "chapters_insert_own"  on public.chapters;
drop policy if exists "chapters_update_own"  on public.chapters;
drop policy if exists "chapters_delete_own"  on public.chapters;

create policy "chapters_select_own"
  on public.chapters for select to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.ebooks e
      join public.projects p on p.id = e.project_id
      where e.id = chapters.ebook_id and p.user_id = auth.uid()
    )
  );

create policy "chapters_insert_own"
  on public.chapters for insert to authenticated
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.ebooks e
      join public.projects p on p.id = e.project_id
      where e.id = chapters.ebook_id and p.user_id = auth.uid()
    )
  );

create policy "chapters_update_own"
  on public.chapters for update to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.ebooks e
      join public.projects p on p.id = e.project_id
      where e.id = chapters.ebook_id and p.user_id = auth.uid()
    )
  )
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.ebooks e
      join public.projects p on p.id = e.project_id
      where e.id = chapters.ebook_id and p.user_id = auth.uid()
    )
  );

create policy "chapters_delete_own"
  on public.chapters for delete to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.ebooks e
      join public.projects p on p.id = e.project_id
      where e.id = chapters.ebook_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- project_content_progress
-- ---------------------------------------------------------------------------
drop policy if exists "project_content_progress_select_own" on public.project_content_progress;
drop policy if exists "project_content_progress_insert_own" on public.project_content_progress;
drop policy if exists "project_content_progress_update_own" on public.project_content_progress;

create policy "project_content_progress_select_own"
  on public.project_content_progress for select to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid())
  );

create policy "project_content_progress_insert_own"
  on public.project_content_progress for insert to authenticated
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid())
  );

create policy "project_content_progress_update_own"
  on public.project_content_progress for update to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid())
  )
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- project_manuscripts (SELECT only for authenticated; writes are service_role)
-- ---------------------------------------------------------------------------
drop policy if exists "project_manuscripts_select_own" on public.project_manuscripts;

create policy "project_manuscripts_select_own"
  on public.project_manuscripts for select to authenticated
  using (
    obra_has_subscription_access(auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_manuscripts.project_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- project_images
-- ---------------------------------------------------------------------------
drop policy if exists "project_images_owner_select" on public.project_images;
drop policy if exists "project_images_owner_insert" on public.project_images;
drop policy if exists "project_images_owner_update" on public.project_images;

create policy "project_images_owner_select"
  on public.project_images for select
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_images.project_id and p.user_id = auth.uid())
  );

create policy "project_images_owner_insert"
  on public.project_images for insert
  with check (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_images.project_id and p.user_id = auth.uid())
  );

create policy "project_images_owner_update"
  on public.project_images for update
  using (
    obra_has_subscription_access(auth.uid())
    and exists (select 1 from public.projects p where p.id = project_images.project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- pdf_export_jobs (SELECT only for authenticated; INSERT/UPDATE are service_role)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view own PDF export jobs" on public.pdf_export_jobs;

create policy "Users can view own PDF export jobs"
  on public.pdf_export_jobs for select
  using (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));

-- ---------------------------------------------------------------------------
-- duplicate_jobs (SELECT only for authenticated; writes are service_role)
-- ---------------------------------------------------------------------------
drop policy if exists "duplicate_jobs_select_own" on public.duplicate_jobs;

create policy "duplicate_jobs_select_own"
  on public.duplicate_jobs for select to authenticated
  using (auth.uid() = user_id and obra_has_subscription_access(auth.uid()));
