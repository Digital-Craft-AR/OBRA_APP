-- 20260408193428_remote_schema reset `design_config` default to a legacy shape (`preset: "starter"`)
-- without `paletteMode` / `palettePresetId`. Hosted DBs that still enforce
-- `projects_design_config_contract_check` then reject INSERTs that rely on the column default.
-- Align the server default with the palette contract used in 20260408171000.

alter table public.projects
alter column design_config
set default $dc$
{
  "paletteMode": "preset",
  "palettePresetId": "oceanic",
  "palette": {"primary": "#F4F8FC", "secondary": "#2D6499", "accent": "#5A7A94"},
  "fonts": {"heading": "Playfair Display", "body": "Inter"},
  "page": {"size": "a4", "orientation": "portrait"},
  "image": {"mode": "ai", "style": "illustration"}
}
$dc$::jsonb;
