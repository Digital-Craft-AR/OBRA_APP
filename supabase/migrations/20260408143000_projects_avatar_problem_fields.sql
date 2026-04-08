alter table public.projects
add column if not exists problem text;

alter table public.projects
add column if not exists target_avatar text;
