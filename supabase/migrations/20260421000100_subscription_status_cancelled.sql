-- Add 'cancelled' as a valid subscription_status to distinguish users who had
-- a subscription and cancelled it from users who never subscribed ('none').
alter table public.creator_profiles
  drop constraint if exists creator_profiles_subscription_status_check;

alter table public.creator_profiles
  add constraint creator_profiles_subscription_status_check
    check (subscription_status in ('none', 'active', 'past_due', 'cancelled'));

comment on column public.creator_profiles.subscription_status is
  'Obra: coarse subscription gate — none (never subscribed) | active | past_due (payment failed) | cancelled (user cancelled); Mercado Pago webhooks keep this authoritative.';
