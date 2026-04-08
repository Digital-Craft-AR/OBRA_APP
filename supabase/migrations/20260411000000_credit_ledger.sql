-- Credit ledger (#68): append-only entries; `creator_profiles.credits_balance` stays in sync via SECURITY DEFINER RPC.
-- Clients read history with RLS; writes are service_role-only through `obra_credit_ledger_apply`.

create table if not exists public.credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  idempotency_key text,
  project_id uuid,
  created_at timestamptz not null default now(),
  constraint credit_ledger_delta_nonzero check (delta <> 0),
  constraint credit_ledger_balance_nonnegative check (balance_after >= 0),
  constraint credit_ledger_reason_check check (
    reason in ('top_up', 'consumption', 'adjustment', 'grant', 'refund', 'other')
  )
);

comment on table public.credit_ledger_entries is
  'Obra: append-only credit movements; no user content. balance_after is an audit snapshot after delta.';

create unique index if not exists credit_ledger_idempotency_uidx
  on public.credit_ledger_entries (creator_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists credit_ledger_creator_created_idx
  on public.credit_ledger_entries (creator_id, created_at desc);

alter table public.credit_ledger_entries enable row level security;

create policy "credit_ledger_select_own"
  on public.credit_ledger_entries
  for select
  to authenticated
  using ((select auth.uid()) = creator_id);

grant select on table public.credit_ledger_entries to authenticated;
grant all on table public.credit_ledger_entries to service_role;

-- Idempotent apply: same (creator_id, idempotency_key) returns the original balance_after without double-charging.
create or replace function public.obra_credit_ledger_apply (
  p_creator_id uuid,
  p_delta integer,
  p_reason text,
  p_idempotency_key text default null,
  p_project_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
  v_new int;
  v_existing int;
begin
  if p_delta = 0 then
    raise exception 'obra_credit_ledger_apply: delta cannot be zero';
  end if;

  if p_reason not in ('top_up', 'consumption', 'adjustment', 'grant', 'refund', 'other') then
    raise exception 'obra_credit_ledger_apply: invalid reason';
  end if;

  if p_idempotency_key is not null then
    select e.balance_after into v_existing
    from public.credit_ledger_entries e
    where e.creator_id = p_creator_id and e.idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  select p.credits_balance into v_old
  from public.creator_profiles p
  where p.id = p_creator_id
  for update;

  if not found then
    raise exception 'obra_credit_ledger_apply: creator profile not found';
  end if;

  v_new := v_old + p_delta;
  if v_new < 0 then
    raise exception 'obra_credit_ledger_apply: insufficient credits';
  end if;

  begin
    insert into public.credit_ledger_entries (
      creator_id, delta, balance_after, reason, idempotency_key, project_id
    ) values (
      p_creator_id, p_delta, v_new, p_reason, p_idempotency_key, p_project_id
    );
  exception
    when unique_violation then
      select e.balance_after into v_existing
      from public.credit_ledger_entries e
      where e.creator_id = p_creator_id and e.idempotency_key = p_idempotency_key;
      if found then
        return v_existing;
      end if;
      raise;
  end;

  update public.creator_profiles
  set credits_balance = v_new, updated_at = now()
  where id = p_creator_id;

  return v_new;
end;
$$;

comment on function public.obra_credit_ledger_apply is
  'Obra: apply a signed credit delta with optional idempotency; updates creator_profiles.credits_balance. Invoke from Edge Functions as service_role only.';

revoke all on function public.obra_credit_ledger_apply (uuid, integer, text, text, uuid) from public;
grant execute on function public.obra_credit_ledger_apply (uuid, integer, text, text, uuid) to service_role;
