-- Per-ebook TOC freeze for order bumps (parity with main index freeze via project_content_progress).

alter table public.ebooks
  add column if not exists index_frozen_at timestamptz;

comment on column public.ebooks.index_frozen_at is
  'Order bump: set when the user confirms the TOC in the content wizard; draft chapter titles are read-only until reopened.';
