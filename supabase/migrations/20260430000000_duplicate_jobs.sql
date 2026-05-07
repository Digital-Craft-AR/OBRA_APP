-- Idempotency guard for duplicate-project Edge Function (#67).
-- Stores in-flight and completed duplicate jobs keyed by (user_id, client_request_id).
-- Replay of the same client_request_id within TTL_HOURS returns the cached new_project_id.

create table if not exists public.duplicate_jobs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_project_id uuid not null references public.projects(id) on delete cascade,
  new_project_id    uuid references public.projects(id) on delete set null,
  client_request_id text not null,
  status            text not null default 'pending'
    check (status in ('pending', 'done', 'error')),
  error_detail      text,
  created_at        timestamptz not null default timezone('utc', now()),
  completed_at      timestamptz
);

-- One in-flight or completed job per (user, client_request_id).
create unique index if not exists duplicate_jobs_idempotency_key
  on public.duplicate_jobs (user_id, client_request_id);

create index if not exists duplicate_jobs_user_id_idx
  on public.duplicate_jobs (user_id);

alter table public.duplicate_jobs enable row level security;

-- Users can only read their own jobs; writes are service-role only.
create policy "duplicate_jobs_select_own"
  on public.duplicate_jobs for select to authenticated
  using (auth.uid() = user_id);

comment on table public.duplicate_jobs is
  'Idempotency guard for duplicate-project. Replay of same client_request_id within TTL returns cached new_project_id.';
