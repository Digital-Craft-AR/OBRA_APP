-- Remove book_template_id from projects (issue #214).
-- Layout assignments are still computed using the default template at design-save time.

alter table public.projects
  drop column if exists book_template_id;
