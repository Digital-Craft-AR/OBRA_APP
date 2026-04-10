-- Chapter index snapshot columns + helpers (moved out of 20260410120054_remote_schema.sql, which ran before `chapters` existed).
-- Timestamp is after project_manuscripts so remotes that already applied later migrations do not get an out-of-order version.

alter table public.chapters
  add column if not exists stale_after_index_title_change boolean not null default false;

alter table public.chapters
  add column if not exists title_at_last_global_confirm text;

set check_function_bodies = off;

create or replace function public._obra_norm_chapter_title(t text)
 returns text
 language sql
 immutable
as $function$
  select case
    when trim(coalesce(t, '')) = '' then ' '
    else trim(coalesce(t, ''))
  end
$function$;

create or replace function public.obra_apply_chapter_index_snapshots_for_ebook(p_ebook_id uuid)
 returns void
 language sql
 set search_path to 'public'
as $function$
  update public.chapters c
  set
    stale_after_index_title_change = (
      c.title_at_last_global_confirm is not null
      and public._obra_norm_chapter_title(c.title) is distinct from public._obra_norm_chapter_title(c.title_at_last_global_confirm)
    ),
    title_at_last_global_confirm = public._obra_norm_chapter_title(c.title)
  where c.ebook_id = p_ebook_id;
$function$;
