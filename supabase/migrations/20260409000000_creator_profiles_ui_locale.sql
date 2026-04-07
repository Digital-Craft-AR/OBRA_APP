-- UI language preference for i18next (`es`, `pt-BR`); see PRD_Obra.md and features/profile/profile.md.

alter table public.creator_profiles
  add column if not exists ui_locale text not null default 'es'
    constraint creator_profiles_ui_locale_check
      check (ui_locale in ('es', 'pt-BR'));

comment on column public.creator_profiles.ui_locale is
  'Obra: app UI locale (i18next); es | pt-BR; persisted on account.';
