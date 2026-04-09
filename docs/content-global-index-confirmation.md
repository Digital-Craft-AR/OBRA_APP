# Content Flow Update: Global Index Confirmation

## What changed

- Index confirmation in the Content step is now **global**.
- The user confirms once for the whole package after TOCs are valid for:
  - Main ebook
  - All bonuses
  - All order bumps
- After global confirmation, Content moves to a **unified 3-column chapter step**:
  1. Artifact selector (Ebook / Bonus / Bump)
  2. Chapter list for the selected artifact
  3. Shared WYSIWYG chapter editor

## Persistence and phase semantics

- `project_content_progress.global_index_frozen_at` is now the canonical gate for entering chapter editing.
- `project_content_progress.main_index_frozen_at` is still written for compatibility with existing consumers.
- `ebooks.index_frozen_at` on order bumps is still persisted for compatibility and per-row audit.
- Global phase transition remains `main_index -> main_chapter` after successful global confirm.

## UX implications

- The confirm action is no longer per artifact during index editing.
- Users can switch artifacts in chapter editing without losing draft content.
- Chapter actions (generate/save/approve) are shared across ebook, bonuses, and bumps.
