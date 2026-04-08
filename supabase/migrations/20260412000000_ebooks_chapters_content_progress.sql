-- Ebooks, chapters, and content-phase progress (#54 / wizard-ai-generation).
-- Bootstrap rows when structure_completed_at is first set (trigger + backfill).

create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('main', 'bonus', 'order_bump')),
  title text,
  subtitle text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists ebooks_one_main_per_project
  on public.ebooks (project_id)
  where (type = 'main');

create index if not exists ebooks_project_id_idx on public.ebooks (project_id);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references public.ebooks (id) on delete cascade,
  sort_order integer not null,
  title text not null,
  content text,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chapters_sort_order_positive check (sort_order > 0),
  constraint chapters_unique_sort_per_ebook unique (ebook_id, sort_order)
);

create index if not exists chapters_ebook_id_idx on public.chapters (ebook_id);

create table if not exists public.project_content_progress (
  project_id uuid primary key references public.projects (id) on delete cascade,
  current_phase text not null check (
    current_phase in (
      'upload_alignment',
      'main_index',
      'main_chapter',
      'bonus',
      'order_bump',
      'complete'
    )
  ),
  main_index_frozen_at timestamptz,
  current_ebook_id uuid references public.ebooks (id) on delete set null,
  current_chapter_id uuid references public.chapters (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- RLS
alter table public.ebooks enable row level security;
alter table public.chapters enable row level security;
alter table public.project_content_progress enable row level security;

create policy "ebooks_select_own"
  on public.ebooks for select to authenticated
  using (exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid()));

create policy "ebooks_insert_own"
  on public.ebooks for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid()));

create policy "ebooks_update_own"
  on public.ebooks for update to authenticated
  using (exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid()));

create policy "ebooks_delete_own"
  on public.ebooks for delete to authenticated
  using (exists (select 1 from public.projects p where p.id = ebooks.project_id and p.user_id = auth.uid()));

create policy "chapters_select_own"
  on public.chapters for select to authenticated
  using (exists (
    select 1 from public.ebooks e
    join public.projects p on p.id = e.project_id
    where e.id = chapters.ebook_id and p.user_id = auth.uid()
  ));

create policy "chapters_insert_own"
  on public.chapters for insert to authenticated
  with check (exists (
    select 1 from public.ebooks e
    join public.projects p on p.id = e.project_id
    where e.id = chapters.ebook_id and p.user_id = auth.uid()
  ));

create policy "chapters_update_own"
  on public.chapters for update to authenticated
  using (exists (
    select 1 from public.ebooks e
    join public.projects p on p.id = e.project_id
    where e.id = chapters.ebook_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ebooks e
    join public.projects p on p.id = e.project_id
    where e.id = chapters.ebook_id and p.user_id = auth.uid()
  ));

create policy "chapters_delete_own"
  on public.chapters for delete to authenticated
  using (exists (
    select 1 from public.ebooks e
    join public.projects p on p.id = e.project_id
    where e.id = chapters.ebook_id and p.user_id = auth.uid()
  ));

create policy "project_content_progress_select_own"
  on public.project_content_progress for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid()));

create policy "project_content_progress_insert_own"
  on public.project_content_progress for insert to authenticated
  with check (exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid()));

create policy "project_content_progress_update_own"
  on public.project_content_progress for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_content_progress.project_id and p.user_id = auth.uid()));

grant select, insert, update, delete on public.ebooks to authenticated;
grant select, insert, update, delete on public.chapters to authenticated;
grant select, insert, update on public.project_content_progress to authenticated;

-- Idempotent bootstrap for a project that already completed structure (repair + client calls).
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
    coalesce(p.main_title, '') as main_title_val
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

  insert into public.ebooks (project_id, type, title)
  select p_project_id, 'main', v_project.main_title_val
  where not exists (
    select 1 from public.ebooks e where e.project_id = p_project_id and e.type = 'main'
  );

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

revoke all on function public.obra_ensure_content_workspace (uuid) from public;
grant execute on function public.obra_ensure_content_workspace (uuid) to authenticated;

-- Trigger: when structure_completed_at is first set, create progress + main ebook (same as ensure, without auth).
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

  insert into public.ebooks (project_id, type, title)
  select new.id, 'main', coalesce(new.main_title, '')
  where not exists (
    select 1 from public.ebooks e where e.project_id = new.id and e.type = 'main'
  );

  return new;
end;
$$;

drop trigger if exists projects_bootstrap_content_after_structure on public.projects;
create trigger projects_bootstrap_content_after_structure
  after update of structure_completed_at on public.projects
  for each row
  execute function public.obra_projects_bootstrap_content_on_structure ();

-- Backfill existing projects
insert into public.project_content_progress (project_id, current_phase)
select
  p.id,
  case p.content_source when 'upload' then 'upload_alignment' else 'main_index' end
from public.projects p
where p.structure_completed_at is not null
on conflict (project_id) do nothing;

insert into public.ebooks (project_id, type, title)
select p.id, 'main', coalesce(p.main_title, '')
from public.projects p
where p.structure_completed_at is not null
  and not exists (select 1 from public.ebooks e where e.project_id = p.id and e.type = 'main');
