-- Align server default with Structure → Design (issue #112): chapter count + AI content tone.

alter table public.projects
alter column design_config
set default $dc$
{
  "chapterCount": 8,
  "contentTone": "friendly",
  "paletteMode": "preset",
  "palettePresetId": "oceanic",
  "palette": {"primary": "#F4F8FC", "secondary": "#2D6499", "accent": "#5A7A94"},
  "fonts": {"heading": "Playfair Display", "body": "Inter"},
  "page": {"size": "a4", "orientation": "portrait"},
  "image": {"mode": "ai", "style": "illustration"}
}
$dc$::jsonb;
