-- Book template + resolved layout ids for Preview/PDF (epic #23 / issue #123).

alter table public.projects
  add column if not exists book_template_id text;

alter table public.projects
  add column if not exists layout_page_assignments jsonb not null default '{}'::jsonb;

comment on column public.projects.book_template_id is
  'Pre-assembled book template id from the layout catalog (wizard-shared design + preview/PDF).';

comment on column public.projects.layout_page_assignments is
  'JSON map of stable logical page keys to resolved layout variant ids; stable across refresh.';
