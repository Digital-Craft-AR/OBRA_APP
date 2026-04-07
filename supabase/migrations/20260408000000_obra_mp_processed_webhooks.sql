-- Idempotency for Mercado Pago webhook resources (payment/subscription).
-- Written only by Edge (service_role).

create table if not exists public.obra_mp_processed_webhooks (
  event_key text primary key,
  profile_id uuid references public.creator_profiles (id) on delete set null,
  processed_at timestamptz not null default now()
);

comment on table public.obra_mp_processed_webhooks is
  'Mercado Pago notifications applied at most once (event_key = <topic>:<data.id>). Populated by mercadopago-webhook Edge Function only.';

alter table public.obra_mp_processed_webhooks enable row level security;

-- No policies: block PostgREST access for anon/authenticated; service_role bypasses RLS.

revoke all on table public.obra_mp_processed_webhooks from public;
revoke all on table public.obra_mp_processed_webhooks from anon, authenticated;
grant select, insert on table public.obra_mp_processed_webhooks to service_role;
