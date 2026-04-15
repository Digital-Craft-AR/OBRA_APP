-- Project publish status: tracks whether project artifacts have been exported.
-- Separate from lifecycle_status (active/archived/trash) which governs dashboard display.
--
-- Transitions:
--   'draft'     → default; project has not yet been exported
--   'published' → set on first successful PDF or ZIP export
--   'modified'  → set on any chapter content edit after publish (reverts to draft experience)
--
-- Transitions are enforced at application level (Edge Function + client).
-- DB stores the value; no trigger required for MVP.

alter table public.projects
  add column if not exists publish_status text not null default 'draft';

alter table public.projects
  drop constraint if exists projects_publish_status_check;

alter table public.projects
  add constraint projects_publish_status_check
  check (publish_status in ('draft', 'published', 'modified'));

comment on column public.projects.publish_status is
  'draft: not yet exported; published: first export done; modified: content edited after publish.';
