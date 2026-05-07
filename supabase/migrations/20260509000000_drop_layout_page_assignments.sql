-- Remove layout_page_assignments from projects.
-- The generate-document-template edge function builds HTML directly from
-- design_config; this column was never read by the live preview/PDF path.

alter table public.projects
  drop column if exists layout_page_assignments;
