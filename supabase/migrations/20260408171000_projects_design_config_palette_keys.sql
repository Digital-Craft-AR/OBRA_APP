do $$
declare
  v_default jsonb := '{
    "paletteMode":"preset",
    "palettePresetId":"oceanic",
    "palette":{"primary":"#F4F8FC","secondary":"#2D6499","accent":"#5A7A94"},
    "fonts":{"heading":"Playfair Display","body":"Inter"},
    "page":{"size":"a4","orientation":"portrait"},
    "image":{"mode":"ai","style":"illustration"}
  }'::jsonb;
begin
  update public.projects
  set design_config =
    (design_config - 'mode' - 'presetId')
    || jsonb_build_object(
      'paletteMode',
      coalesce(nullif(design_config->>'paletteMode', ''), nullif(design_config->>'mode', ''), 'preset')
    )
    || case
      when coalesce(nullif(design_config->>'paletteMode', ''), nullif(design_config->>'mode', ''), 'preset') = 'custom'
        then '{"palettePresetId": null}'::jsonb
      else jsonb_build_object(
        'palettePresetId',
        coalesce(
          nullif(design_config->>'palettePresetId', ''),
          nullif(design_config->>'presetId', ''),
          'oceanic'
        )
      )
    end;

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
    and design_config ? 'paletteMode'
    and design_config ? 'palette'
    and design_config ? 'fonts'
    and design_config ? 'page'
    and design_config ? 'image'
    and (design_config->>'paletteMode' in ('preset', 'custom'))
    and (
      (
        design_config->>'paletteMode' = 'preset'
        and coalesce(design_config->>'palettePresetId', '') <> ''
      )
      or (
        design_config->>'paletteMode' = 'custom'
        and (
          not design_config ? 'palettePresetId'
          or design_config->>'palettePresetId' is null
          or design_config->>'palettePresetId' = ''
        )
      )
    )
  );
end $$;
