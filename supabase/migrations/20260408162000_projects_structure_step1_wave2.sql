alter table public.projects
add column if not exists bonus_items jsonb not null default '[]'::jsonb,
add column if not exists bump_items jsonb not null default '[]'::jsonb,
add column if not exists design_config jsonb not null default '{
  "preset":"starter",
  "palette":{"primary":"#1D4ED8","secondary":"#0F172A","accent":"#E2E8F0"},
  "fonts":{"heading":"Poppins","body":"Inter"},
  "page":{"size":"a4","orientation":"portrait"},
  "image":{"mode":"ai","style":"editorial"}
}'::jsonb;
