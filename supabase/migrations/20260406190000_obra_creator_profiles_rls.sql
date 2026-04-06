-- Obra auth baseline: one profile row per Supabase Auth user, owner-only RLS.
-- Apply on the dedicated Obra Supabase project. If `public.profiles` already exists for a legacy app,
-- this migration uses `creator_profiles` to avoid clashing with unrelated schemas.

create table if not exists public.creator_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.creator_profiles is 'Obra: one row per auth user; RLS restricts access to the owning user.';

grant select, insert, update on table public.creator_profiles to authenticated;
grant all on table public.creator_profiles to service_role;

alter table public.creator_profiles enable row level security;

create policy "creator_profiles_select_own"
  on public.creator_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "creator_profiles_update_own"
  on public.creator_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "creator_profiles_insert_own"
  on public.creator_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Row creation: `obra_handle_new_auth_user` runs as SECURITY DEFINER so each new `auth.users` row gets a matching profile.

create or replace function public.obra_handle_new_auth_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.creator_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_obra on auth.users;

create trigger on_auth_user_created_obra
  after insert on auth.users
  for each row
  execute procedure public.obra_handle_new_auth_user ();
