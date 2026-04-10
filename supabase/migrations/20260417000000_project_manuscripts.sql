-- Upload branch: manuscript binary + extracted text pointers (#22 / #58).

create table if not exists public.project_manuscripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  extracted_text_storage_path text,
  mime text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  checksum_sha256 text,
  extracted_char_count integer,
  uploaded_at timestamptz not null default timezone('utc', now()),
  superseded_at timestamptz
);

create unique index if not exists project_manuscripts_one_current_per_project
  on public.project_manuscripts (project_id)
  where (superseded_at is null);

create index if not exists project_manuscripts_project_id_idx
  on public.project_manuscripts (project_id);

alter table public.project_manuscripts enable row level security;

create policy "project_manuscripts_select_own"
  on public.project_manuscripts for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_manuscripts.project_id and p.user_id = auth.uid()
    )
  );

grant select on public.project_manuscripts to authenticated;

-- Private bucket; Edge Functions use service role for writes.
insert into storage.buckets (id, name, public)
values ('project-manuscripts', 'project-manuscripts', false)
on conflict (id) do nothing;

comment on table public.project_manuscripts is
  'Upload path: one active row per project (superseded_at null). Binary + extracted plain text in Storage.';

-- Atomic supersede + insert (Edge Function uploads to Storage first, then calls this with service role).
create or replace function public.obra_service_commit_manuscript (
  p_user_id uuid,
  p_project_id uuid,
  p_id uuid,
  p_storage_path text,
  p_extracted_text_storage_path text,
  p_mime text,
  p_byte_size bigint,
  p_checksum_sha256 text,
  p_extracted_char_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'invalid_arguments';
  end if;

  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = p_user_id
  ) then
    raise exception 'forbidden';
  end if;

  update public.project_manuscripts m
  set superseded_at = timezone('utc', now())
  where m.project_id = p_project_id and m.superseded_at is null;

  insert into public.project_manuscripts (
    id,
    project_id,
    storage_path,
    extracted_text_storage_path,
    mime,
    byte_size,
    checksum_sha256,
    extracted_char_count
  ) values (
    p_id,
    p_project_id,
    p_storage_path,
    p_extracted_text_storage_path,
    p_mime,
    p_byte_size,
    p_checksum_sha256,
    p_extracted_char_count
  );
end;
$$;

revoke all on function public.obra_service_commit_manuscript (
  uuid, uuid, uuid, text, text, text, bigint, text, integer
) from PUBLIC;
grant execute on function public.obra_service_commit_manuscript (
  uuid, uuid, uuid, text, text, text, bigint, text, integer
) to service_role;
