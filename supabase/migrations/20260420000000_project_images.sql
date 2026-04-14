-- Image slots for Preview: cover art and section hero images.
-- Each row tracks one resolved slot (project+ebook+chapter+slot_key).
-- status: pending → generating → done | error
-- Credits are debited by the image-generate Edge Function on success only.

create table if not exists public.project_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  ebook_id      uuid references public.ebooks(id) on delete cascade,
  chapter_id    uuid references public.chapters(id) on delete cascade,
  -- Stable slot key from LayoutSlotSchema (e.g. "cover_art", "hero").
  slot_key      text not null,
  -- Layout id this slot belongs to (canonical, after replacedBy resolution).
  layout_id     text not null,
  -- Storage object path inside the project-images bucket.
  storage_path  text,
  -- status of the image for this slot.
  status        text not null default 'pending'
    check (status in ('pending', 'generating', 'done', 'error')),
  -- Free-text error detail (never logged to client, used for ops debugging).
  error_detail  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One slot per (project, ebook, chapter, slot_key) combination.
create unique index if not exists project_images_slot_unique
  on public.project_images (project_id, ebook_id, chapter_id, slot_key)
  where ebook_id is not null and chapter_id is not null;

create unique index if not exists project_images_cover_unique
  on public.project_images (project_id, slot_key)
  where ebook_id is null and chapter_id is null;

create index if not exists project_images_project_idx
  on public.project_images (project_id);

-- RLS: owners of the project can read and write their images.
alter table public.project_images enable row level security;

create policy "project_images_owner_select"
  on public.project_images for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_images_owner_insert"
  on public.project_images for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_images_owner_update"
  on public.project_images for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.user_id = auth.uid()
    )
  );

comment on table public.project_images is
  'Resolved image slots for ebook preview and PDF export. One row per slot per deliverable page.';
