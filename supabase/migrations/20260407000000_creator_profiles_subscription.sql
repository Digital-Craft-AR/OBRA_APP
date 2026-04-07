-- Subscription snapshot for entitlement resolver (webhooks update `subscription_status` in follow-up work).

alter table public.creator_profiles
  add column if not exists subscription_status text not null default 'none'
    constraint creator_profiles_subscription_status_check
      check (subscription_status in ('none', 'active', 'past_due'));

comment on column public.creator_profiles.subscription_status is
  'Obra: coarse subscription gate for the client resolver — none | active | past_due; Mercado Pago webhooks keep this authoritative.';

alter table public.creator_profiles
  add column if not exists tour_dismissed_at timestamptz;

comment on column public.creator_profiles.tour_dismissed_at is
  'Obra: first-dashboard tour dismissed/skipped; null means not yet dismissed.';
