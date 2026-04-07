-- Corrective migration for environments that already applied
-- 20260408000000_obra_mp_processed_webhooks.sql with `mp_payment_id`.
-- Safe to run multiple times.

do $$
begin
  -- Ensure table exists even if migration order drifted.
  create table if not exists public.obra_mp_processed_webhooks (
    event_key text primary key,
    profile_id uuid references public.creator_profiles (id) on delete set null,
    processed_at timestamptz not null default now()
  );

  -- If legacy column exists, migrate it to event_key.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'obra_mp_processed_webhooks'
      and column_name = 'mp_payment_id'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'obra_mp_processed_webhooks'
        and column_name = 'event_key'
    ) then
      alter table public.obra_mp_processed_webhooks
        rename column mp_payment_id to event_key;
    else
      -- If both columns exist, backfill event_key and drop old column.
      execute $sql$
        update public.obra_mp_processed_webhooks
        set event_key = concat('payment:', mp_payment_id)
        where event_key is null and mp_payment_id is not null
      $sql$;
      alter table public.obra_mp_processed_webhooks
        drop column mp_payment_id;
    end if;
  end if;

  -- Backfill legacy rows that may still store raw payment ids.
  execute $sql$
    update public.obra_mp_processed_webhooks
    set event_key = concat('payment:', event_key)
    where event_key is not null
      and position(':' in event_key) = 0
  $sql$;
end
$$;

comment on table public.obra_mp_processed_webhooks is
  'Mercado Pago notifications applied at most once (event_key = <topic>:<data.id>). Populated by mercadopago-webhook Edge Function only.';
