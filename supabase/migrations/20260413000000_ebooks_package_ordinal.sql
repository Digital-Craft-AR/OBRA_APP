-- Identify package ebooks (bonus / order_bump) per slot so chapters persist per item.

alter table public.ebooks
  add column if not exists package_ordinal smallint not null default 0;

update public.ebooks
set package_ordinal = 0
where type = 'main';

create unique index if not exists ebooks_project_type_ordinal_unique
  on public.ebooks (project_id, type, package_ordinal);

-- Recreate ensure: bootstrap main + bonus + order_bump rows from project counts and title arrays.
create or replace function public.obra_ensure_content_workspace (p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project record;
  v_phase text;
  v_ebook_id uuid;
  v_prog record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select
    p.id,
    p.user_id,
    p.content_source,
    p.structure_completed_at,
    coalesce(p.main_title, '') as main_title_val,
    p.bonus_count,
    p.bump_count,
    p.bonus_items,
    p.bump_items
  into v_project
  from public.projects p
  where p.id = p_project_id;

  if v_project.id is null then
    raise exception 'project_not_found';
  end if;

  if v_project.user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_project.structure_completed_at is null then
    raise exception 'structure_not_complete';
  end if;

  v_phase := case v_project.content_source when 'upload' then 'upload_alignment' else 'main_index' end;

  insert into public.project_content_progress (project_id, current_phase)
  values (p_project_id, v_phase)
  on conflict (project_id) do nothing;

  insert into public.ebooks (project_id, type, package_ordinal, title)
  select p_project_id, 'main', 0, v_project.main_title_val
  where not exists (
    select 1 from public.ebooks e where e.project_id = p_project_id and e.type = 'main'
  );

  if coalesce(v_project.bonus_count, 0) > 0 then
    insert into public.ebooks (project_id, type, package_ordinal, title)
    select
      p_project_id,
      'bonus',
      s.i::smallint,
      coalesce(nullif(trim(v_project.bonus_items->s.i->>'title'), ''), '')
    from generate_series(0, v_project.bonus_count - 1) as s(i)
    on conflict (project_id, type, package_ordinal) do update set
      title = excluded.title,
      updated_at = timezone('utc', now());
  end if;

  if coalesce(v_project.bump_count, 0) > 0 then
    insert into public.ebooks (project_id, type, package_ordinal, title)
    select
      p_project_id,
      'order_bump',
      s.i::smallint,
      coalesce(nullif(trim(v_project.bump_items->s.i->>'title'), ''), '')
    from generate_series(0, v_project.bump_count - 1) as s(i)
    on conflict (project_id, type, package_ordinal) do update set
      title = excluded.title,
      updated_at = timezone('utc', now());
  end if;

  select e.id into v_ebook_id from public.ebooks e where e.project_id = p_project_id and e.type = 'main' limit 1;

  select pcp.* into v_prog from public.project_content_progress pcp where pcp.project_id = p_project_id;

  return jsonb_build_object(
    'main_ebook_id', v_ebook_id,
    'current_phase', v_prog.current_phase,
    'main_index_frozen_at', v_prog.main_index_frozen_at,
    'updated_at', v_prog.updated_at
  );
end;
$$;

create or replace function public.obra_projects_bootstrap_content_on_structure ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase text;
begin
  if tg_op <> 'update' then
    return new;
  end if;
  if new.structure_completed_at is null then
    return new;
  end if;
  if old.structure_completed_at is not null then
    return new;
  end if;

  v_phase := case new.content_source when 'upload' then 'upload_alignment' else 'main_index' end;

  insert into public.project_content_progress (project_id, current_phase)
  values (new.id, v_phase)
  on conflict (project_id) do nothing;

  insert into public.ebooks (project_id, type, package_ordinal, title)
  select new.id, 'main', 0, coalesce(new.main_title, '')
  where not exists (
    select 1 from public.ebooks e where e.project_id = new.id and e.type = 'main'
  );

  if coalesce(new.bonus_count, 0) > 0 then
    insert into public.ebooks (project_id, type, package_ordinal, title)
    select
      new.id,
      'bonus',
      s.i::smallint,
      coalesce(nullif(trim(new.bonus_items->s.i->>'title'), ''), '')
    from generate_series(0, new.bonus_count - 1) as s(i)
    on conflict (project_id, type, package_ordinal) do update set
      title = excluded.title,
      updated_at = timezone('utc', now());
  end if;

  if coalesce(new.bump_count, 0) > 0 then
    insert into public.ebooks (project_id, type, package_ordinal, title)
    select
      new.id,
      'order_bump',
      s.i::smallint,
      coalesce(nullif(trim(new.bump_items->s.i->>'title'), ''), '')
    from generate_series(0, new.bump_count - 1) as s(i)
    on conflict (project_id, type, package_ordinal) do update set
      title = excluded.title,
      updated_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

-- Backfill package ebooks for existing structured projects (idempotent via ON CONFLICT).
insert into public.ebooks (project_id, type, package_ordinal, title)
select
  p.id,
  'bonus',
  s.i::smallint,
  coalesce(nullif(trim(p.bonus_items->s.i->>'title'), ''), '')
from public.projects p
cross join lateral generate_series(0, p.bonus_count - 1) as s(i)
where p.structure_completed_at is not null
  and coalesce(p.bonus_count, 0) > 0
on conflict (project_id, type, package_ordinal) do update set
  title = excluded.title,
  updated_at = timezone('utc', now());

insert into public.ebooks (project_id, type, package_ordinal, title)
select
  p.id,
  'order_bump',
  s.i::smallint,
  coalesce(nullif(trim(p.bump_items->s.i->>'title'), ''), '')
from public.projects p
cross join lateral generate_series(0, p.bump_count - 1) as s(i)
where p.structure_completed_at is not null
  and coalesce(p.bump_count, 0) > 0
on conflict (project_id, type, package_ordinal) do update set
  title = excluded.title,
  updated_at = timezone('utc', now());
