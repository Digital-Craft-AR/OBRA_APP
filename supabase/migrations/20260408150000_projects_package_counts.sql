alter table public.projects
add column if not exists bonus_count integer not null default 0
  constraint projects_bonus_count_check check (bonus_count >= 0 and bonus_count <= 5);

alter table public.projects
add column if not exists bump_count integer not null default 0
  constraint projects_bump_count_check check (bump_count >= 0 and bump_count <= 2);
