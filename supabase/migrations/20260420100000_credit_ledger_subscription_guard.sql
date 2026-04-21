-- Guard: block credit consumption for non-active subscriptions (#mp-subscription-status-cancelled).
-- Consumption (negative delta) is rejected if subscription_status != 'active'.
-- Positive deltas (top_up, grant, refund, adjustment) are always allowed.

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
  v_subscription_status text;
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

  select p.credits_balance, p.subscription_status
  into v_old, v_subscription_status
  from public.creator_profiles p
  where p.id = p_creator_id
  for update;

  if not found then
    raise exception 'obra_credit_ledger_apply: creator profile not found';
  end if;

  -- Block consumption for cancelled/inactive subscriptions.
  -- Positive deltas (top_up, grant, refund) are always allowed regardless of status.
  if p_delta < 0 and coalesce(v_subscription_status, 'none') != 'active' then
    raise exception 'obra_credit_ledger_apply: subscription not active';
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
  'Obra: apply a signed credit delta with optional idempotency; updates creator_profiles.credits_balance. Consumption (negative delta) requires subscription_status = active. Invoke from Edge Functions as service_role only.';
