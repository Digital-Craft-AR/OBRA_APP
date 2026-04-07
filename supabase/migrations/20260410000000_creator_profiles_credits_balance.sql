-- Credit balance snapshot for UI (#42); ledger writes land in follow-up work.

alter table public.creator_profiles
  add column if not exists credits_balance integer not null default 0
    constraint creator_profiles_credits_balance_nonnegative check (credits_balance >= 0);

comment on column public.creator_profiles.credits_balance is
  'Obra: non-negative credit balance shown in app shell and settings; authoritative updates via ledger / billing (#68).';
