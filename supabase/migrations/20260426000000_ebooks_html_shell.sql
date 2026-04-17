-- Add html_shell and shell_meta to ebooks for Claude-generated document templates.
--
-- html_shell: the raw HTML string returned by generate-document-template Edge Function.
--   Contains {{TOC_ENTRIES}}, {{CHAPTER_N_TITLE}}, {{CHAPTER_N_CONTENT}} placeholders
--   and .obra-image-slot divs for image injection client-side.
--
-- shell_meta: JSON snapshot of the inputs that produced this shell.
--   Used to detect staleness (chapter count or page config changed → regenerate).
--   Schema: { chapter_count: number, page_size: string, page_orientation: string, generated_at: string }

ALTER TABLE ebooks
  ADD COLUMN IF NOT EXISTS html_shell TEXT,
  ADD COLUMN IF NOT EXISTS shell_meta JSONB;
