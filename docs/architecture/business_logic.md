# Business logic architecture (Obra)

**Version:** 1.2  
**Last update:** April 2026  
**Scope:** Domain flows, invariants, lifecycle rules, cross-layer contracts, and UI route guard derivation.

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

- **Main ebook** and **each order bump** use a **multi-chapter table of contents** stored as `chapters` rows on their respective `ebooks` row (`type = main` or `type = order_bump`). **Bonus** ebooks typically use a **single** chapter row for the deliverable.
- **Global index freeze gate:** `project_content_progress.global_index_frozen_at` is set only when all required package TOCs are valid and confirmed in one global action; then phase transitions to `main_chapter`.
- **Compatibility marker:** `project_content_progress.main_index_frozen_at` is written alongside the global marker to preserve existing consumers.
- **Order bump freeze metadata:** `ebooks.index_frozen_at` is still written for each `order_bump` row at global confirmation time for row-level compatibility and auditability.
- `chapters.approved_at` tracks **body** approval per chapter (not TOC confirmation), for all ebook types that use chapter rows.

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
- clear **`ebooks.index_frozen_at`** on **`order_bump`** rows when wiping bump TOC/chapters (align with `ARQUITECTURA_Obra.md` reset ordering)
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

## 9) Global journey step vs persistence (route guards)

The **three-step UI** (Structure → Content → Preview) is **not** stored as an index on `projects`. Derive the active global step from:

- `projects.structure_completed_at`
- `project_content_progress.current_phase`

### 9.1 Canonical mapping (MVP)

| Condition | Global UI step | Allowed workspace path segment | Notes |
|-----------|----------------|--------------------------------|--------|
| `structure_completed_at IS NULL` | Structure (1) | `.../structure` only | User completes Structure + design promotion in this step. |
| `structure_completed_at IS NOT NULL` AND `current_phase <> 'complete'` | Content (2) | `.../content` | Sub-routes under Content are owned by feature modules (`wizard-ai-generation`, `wizard-upload`). |
| `structure_completed_at IS NOT NULL` AND `current_phase = 'complete'` | Preview (3) | `.../preview` | Aligns with preview as post–Content milestones ([`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)). |

If the user opens a **deeper URL** than allowed (e.g. `/preview` while still in Structure), the frontend **redirects** to the allowed segment and explains briefly (non-blocking). Implementation: single resolver shared across routes — see [`frontend.md`](frontend.md) §8.

### 9.2 Inconsistent rows (error surface)

**Invariant** (see [`../../ARQUITECTURA_Obra.md`](../../ARQUITECTURA_Obra.md)): when `structure_completed_at` is set, a `project_content_progress` row **must** exist for that `project_id`.

If the client observes `structure_completed_at` set **without** a progress row:

- **Do not** silently pick a global step or mutate data to “fix” it from the browser.
- Show an **explicit error/recovery** state (support message, reload, or trigger server-side repair if one exists).

### 9.3 `current_phase` detail

Allowed values and initialization (`upload` vs `ai`) remain as in §3. The table above only addresses **global** workspace routing; internal Content milestones still follow `current_phase`, cursors, and feature PRDs.

Related docs:

- Frontend architecture: [`frontend.md`](frontend.md)
- Backend architecture: [`backend.md`](backend.md)
- Product source of truth: [`../../PRD_Obra.md`](../../PRD_Obra.md)
- Feature-level flow specs:
  - [`../../features/wizard-shared/wizard-shared.md`](../../features/wizard-shared/wizard-shared.md)
  - [`../../features/wizard-ai-generation/wizard-ai-generation.md`](../../features/wizard-ai-generation/wizard-ai-generation.md)
  - [`../../features/wizard-upload/wizard-upload.md`](../../features/wizard-upload/wizard-upload.md)
  - [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)
