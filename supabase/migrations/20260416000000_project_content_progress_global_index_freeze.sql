-- Global index confirmation marker for content phase progression.

alter table public.project_content_progress
  add column if not exists global_index_frozen_at timestamptz;

update public.project_content_progress
set global_index_frozen_at = coalesce(global_index_frozen_at, main_index_frozen_at)
where global_index_frozen_at is null
  and main_index_frozen_at is not null;

comment on column public.project_content_progress.global_index_frozen_at is
  'Set when all package indices (main, bonuses, order bumps) are globally confirmed and the flow can enter chapter editing.';
