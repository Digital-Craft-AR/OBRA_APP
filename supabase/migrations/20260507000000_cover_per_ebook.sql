-- Each ebook (main, bonus, order bump) gets its own cover image slot.
-- Previously, project_images_cover_unique enforced a single cover per project
-- (ebook_id IS NULL), causing all deliverables to share the same row.
-- This migration drops that constraint and replaces it with a per-ebook cover
-- unique index scoped by (project_id, ebook_id, slot_key).

drop index if exists public.project_images_cover_unique;

-- One cover slot per ebook: (project, ebook, slot_key) where chapter_id is null.
create unique index if not exists project_images_cover_ebook_unique
  on public.project_images (project_id, ebook_id, slot_key)
  where ebook_id is not null and chapter_id is null;
