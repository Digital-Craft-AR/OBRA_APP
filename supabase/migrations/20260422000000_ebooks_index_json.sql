-- Persist generated outline / index for AI chapter generation (ai-generate-index, approve-alignment).
-- Required by edge function ai-generate-content when selecting the parent ebook row.

alter table public.ebooks
  add column if not exists index_json jsonb;

comment on column public.ebooks.index_json is
  'Outline JSON written by ai-generate-index or upload handoff; read by ai-generate-content for prompts.';
