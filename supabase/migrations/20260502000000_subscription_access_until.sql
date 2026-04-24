-- Add subscription_access_until to track the end of the paid billing period.
-- Set on every confirmed payment (authorized subscription or approved payment event).
-- NOT modified on pause/cancel — access persists until this date regardless of status.
-- For active subscriptions this doubles as the approximate next payment date.

alter table public.creator_profiles
  add column if not exists subscription_access_until timestamptz;

comment on column public.creator_profiles.subscription_access_until is
  'Obra: end of the current paid billing period. Set to now()+1 month on every confirmed '
  'payment (authorized subscription or approved MP payment). Not modified on pause/cancel. '
  'For active subs: approximate next payment date. For cancelled/past_due: access expiry.';
