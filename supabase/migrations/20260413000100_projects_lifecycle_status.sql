-- Dashboard project tabs: active, archived, trash (soft-delete bucket).

alter table public.projects
  add column if not exists lifecycle_status text not null default 'active';

alter table public.projects
  drop constraint if exists projects_lifecycle_status_check;

alter table public.projects
  add constraint projects_lifecycle_status_check
  check (lifecycle_status in ('active', 'archived', 'trash'));

create index if not exists projects_user_lifecycle_idx
  on public.projects (user_id, lifecycle_status);

comment on column public.projects.lifecycle_status is
  'active: default list; archived: user-archived; trash: soft-deleted pending retention.';
