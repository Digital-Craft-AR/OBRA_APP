# Business logic architecture (Obra)

**Version:** 1.0  
**Last update:** April 2026  
**Scope:** Domain flows, invariants, lifecycle rules, and cross-layer contracts.

## 1) Domain model intent

Obra turns one project idea into a complete infoproduct package with:

- exactly 1 main ebook
- up to 5 bonuses
- up to 2 order bumps

Domain behavior must remain consistent across UI, Edge Functions, and DB constraints.

## 2) Creation journey and phase model

Global user journey:

1. **Structure**: topic, avatar/problem, package metadata, design system defaults.
2. **Content**: AI generation path or upload-alignment path, then chapter/bonus/bump progression.
3. **Preview**: layout-accurate preview, image refinement, and export.

Key rules:

- `content_locale` is chosen at project creation and then immutable.
- Main ebook chapter outline is not final in Structure.
- Content phase starts after Structure completion and is persisted through `project_content_progress`.

## 3) Content progression invariants

`project_content_progress.current_phase` allowed values:

- `upload_alignment`
- `main_index`
- `main_chapter`
- `bonus`
- `order_bump`
- `complete`

Initialization:

- `content_source = upload` -> start at `upload_alignment`
- `content_source = ai` -> start at `main_index`

Index behavior:

- Main ebook TOC is stored in `chapters` rows.
- `main_index_frozen_at` marks index freeze.
- `chapters.approved_at` tracks body approval per chapter (not TOC confirmation).

Canonical schema details:

- [`project-ebook-data-model.md`](project-ebook-data-model.md)

## 4) Upload vs AI paths

### AI path

- Generate/confirm index first (`main_index`).
- Generate chapter bodies in order (`main_chapter`).
- Continue through bonus and order bump phases.

### Upload path

- Parse one `.docx` or text-layer PDF after Structure/design.
- User aligns proposed split and approves.
- Continue with the same downstream milestones as AI path, including chapter approvals.

## 5) Chat, idempotency, and reset behavior

Content chat scope:

- one project-level index thread (`chapter_id` null)
- one thread per chapter (`chapter_id` set)

MVP persistence behavior:

- persist user messages server-side with `client_message_id` idempotency
- persist assistant message only after stream completion

Avatar/problem reset behavior:

- clear dependent generated content and image associations
- remove content chat threads/messages for the project
- reset progression cursor to initial content phase for the current `content_source`
- keep operation ordering atomic/idempotent to avoid partial visible states

## 6) Duplicate project behavior (MVP)

When duplicating a project:

- create a new project ID with status `draft`
- copy design, ebooks, chapters, and progress with remapped foreign keys
- copy binary assets to new storage paths (no shared storage pointers)
- do not copy subscription/credits ledger history
- start without copied content chat history
- protect against duplicate submits with idempotency key strategy

## 7) Credits and success semantics

- Credits are consumed only on successful, persisted operations.
- Plan-included monthly credits do not roll over.
- Top-up credits accumulate according to PRD policy.
- Ledger must distinguish source of credits (plan vs top-up).

## 8) Cross-layer contract summary

- **Frontend**: drives user intent and phase transitions with validated UX actions.
- **Backend**: enforces final invariants (DB checks, RLS, idempotency, operation ordering).
- **Business logic**: defines what is allowed and when transitions can happen.

Related docs:

- Frontend architecture: [`frontend.md`](frontend.md)
- Backend architecture: [`backend.md`](backend.md)
- Product source of truth: [`../../PRD_Obra.md`](../../PRD_Obra.md)
- Feature-level flow specs:
  - [`../../features/wizard-shared/wizard-shared.md`](../../features/wizard-shared/wizard-shared.md)
  - [`../../features/wizard-ai-generation/wizard-ai-generation.md`](../../features/wizard-ai-generation/wizard-ai-generation.md)
  - [`../../features/wizard-upload/wizard-upload.md`](../../features/wizard-upload/wizard-upload.md)
  - [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)
