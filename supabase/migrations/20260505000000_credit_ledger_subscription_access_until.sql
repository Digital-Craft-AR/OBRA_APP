-- Fix obra_credit_ledger_apply to respect subscription_access_until grace period.
-- Mirrors the entitlement logic in obra_has_subscription_access():
--   active = subscription_status = 'active'
--         OR (subscription_access_until IS NOT NULL AND subscription_access_until > now())

drop function if exists public.obra_credit_ledger_apply (uuid, integer, text, text, uuid, text);

create or replace function public.obra_credit_ledger_apply (
  p_creator_id      uuid,
  p_delta           integer,
  p_reason          text,
  p_idempotency_key text    default null,
  p_project_id      uuid    default null,
  p_source_function text    default null
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
  v_subscription_access_until timestamptz;
  v_entitled boolean;
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

  select p.credits_balance, p.subscription_status, p.subscription_access_until
  into v_old, v_subscription_status, v_subscription_access_until
  from public.creator_profiles p
  where p.id = p_creator_id
  for update;

  if not found then
    raise exception 'obra_credit_ledger_apply: creator profile not found';
  end if;

  -- Mirrors obra_has_subscription_access(): active status OR within paid access window.
  v_entitled := (
    coalesce(v_subscription_status, 'none') = 'active'
    or (v_subscription_access_until is not null and v_subscription_access_until > now())
  );

  -- Block consumption when not entitled.
  -- Positive deltas (top_up, grant, refund) are always allowed regardless of status.
  if p_delta < 0 and not v_entitled then
    raise exception 'obra_credit_ledger_apply: subscription not active';
  end if;

  v_new := v_old + p_delta;
  if v_new < 0 then
    raise exception 'obra_credit_ledger_apply: insufficient credits';
  end if;

  begin
    insert into public.credit_ledger_entries (
      creator_id, delta, balance_after, reason, idempotency_key, project_id, source_function
    ) values (
      p_creator_id, p_delta, v_new, p_reason, p_idempotency_key, p_project_id, p_source_function
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

comment on function public.obra_credit_ledger_apply (uuid, integer, text, text, uuid, text) is
  'Obra: apply a signed credit delta with optional idempotency; updates creator_profiles.credits_balance. Consumption (negative delta) requires active subscription OR subscription_access_until > now(). Invoke from Edge Functions as service_role only.';

revoke all on function public.obra_credit_ledger_apply (uuid, integer, text, text, uuid, text) from public;
grant execute on function public.obra_credit_ledger_apply (uuid, integer, text, text, uuid, text) to service_role;
