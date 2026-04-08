do $$
declare
  v_default jsonb := '{
    "mode":"preset",
    "presetId":"oceanic",
    "palette":{"primary":"#2D6499","secondary":"#8AA8C0","accent":"#E8F0F7"},
    "fonts":{"heading":"Playfair Display","body":"Inter"},
    "page":{"size":"a4","orientation":"portrait"},
    "image":{"mode":"ai","style":"illustration"}
  }'::jsonb;
begin
  update public.projects
  set design_config = v_default
  where design_config is null or jsonb_typeof(design_config) <> 'object';

  -- PL/pgSQL variables are not allowed in plain ALTER SET DEFAULT (parsed as column refs).
  execute format(
    'alter table public.projects alter column design_config set default %L::jsonb',
    v_default::text
  );

  alter table public.projects
  drop constraint if exists projects_design_config_contract_check;

  alter table public.projects
  add constraint projects_design_config_contract_check
  check (
    jsonb_typeof(design_config) = 'object'
    and design_config ? 'mode'
    and design_config ? 'palette'
    and design_config ? 'fonts'
    and design_config ? 'page'
    and design_config ? 'image'
    and (design_config->>'mode' in ('preset','custom'))
    and (
      (design_config->>'mode' = 'preset' and coalesce(design_config->>'presetId', '') <> '')
      or (design_config->>'mode' = 'custom' and (design_config->>'presetId' is null or design_config->>'presetId' = ''))
    )
  );
end $$;
