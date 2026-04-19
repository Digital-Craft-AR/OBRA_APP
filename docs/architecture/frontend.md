# Frontend architecture (Obra)

**Version:** 1.4  
**Last update:** April 2026  
**Scope:** React app structure, routing, state, UI flow, preview system, observability, idempotency, and UX quality constraints.

## 0) Implementation work order

- For any task that crosses the **browser ↔ Supabase / Edge Functions** boundary, **define or update the API contract first**, then implement client (and coordinate with backend) against that contract.
- The contract must cover at minimum: **inputs and outputs** (including error shapes), **auth/session expectations**, and **idempotency** where applicable (see §10).
- The artifact can be OpenAPI, shared typed schemas, a short spec in `docs/`, or a reviewed ticket/PR description — what matters is an **explicit, agreed contract** before feature code is written.
- Purely presentational or client-only work does not require a new API contract.
- For full-stack slices, align the same contract with [`backend.md`](backend.md) §0 before merging either side.

## 1) Frontend stack and boundaries

- Stack: React + Vite + TypeScript.
- UI system: shadcn/ui + Tailwind CSS.
- UI i18n: i18next with `es` and `pt-BR`.
- Global client state: Zustand for **ephemeral UI only** (see §5).
- Server-backed domain state: fetch/mutate via a **server-state cache** (e.g. TanStack Query or equivalent), not duplicated as a second source of truth in Zustand.
- Frontend does not call external AI/payment/PDF providers directly.
- Backend integration only through Supabase client and Edge Functions.
- **Codebase language:** route segments, modules, and identifiers are **English**; all user-visible copy goes through i18n.

## 2) App structure (logical)

- Auth area: login/register/session handling.
- Dashboard area: project list and account settings entry points.
- Project workspace: Structure + Content + Preview (global journey), editor surfaces, export.
- Marketing area: public landing pages and acquisition surfaces.

The exact folder shape can differ (for example `src/pages` vs `src/app`), but responsibilities remain the same.

## 3) URL routing (product-facing)

- **No `locale` segment in URLs.** `ui_locale` comes from the account/profile preference, not routing.
- **Marketing** lives at the site root (e.g. `/`, `/pricing`, legal pages). No `/app` prefix for the authenticated shell.
- **Authenticated shell:** `/dashboard` for the project list and account entry points.
- **Auth routes:** `/login` and `/register` as separate pages.
- **Post-login default:** navigate to `/dashboard`. **Resume** only when a protected URL was attempted and `returnTo` (or equivalent) is present.
- **Project workspace** (deep-linkable segments, no `feature/` prefix in the path):

  `/projects/:projectId/structure`  
  `/projects/:projectId/content`  
  `/projects/:projectId/preview`

- **Route guards:** users may open any of the three URLs directly. If the project is not in that global step, **redirect** to the allowed segment and show a **short non-blocking message** (toast/banner) explaining why.
- **Canonical mapping** from persistence to global step and allowed route: [`business_logic.md`](business_logic.md) §9.

## 4) Code organization vs URLs

- **Feature-first modules** under `src/features/*` (or equivalent): e.g. `project-workspace`, `dashboard`, `auth`, `marketing`.
- **Thin route files** import from features and declare the React Router tree only.
- URLs stay clean; **do not** mirror internal feature folder names in the path.

## 5) Core frontend modules

- `components/wizard/*`: wizard shell and step UIs.
- `components/editor/*`: chapter and preview editing surfaces.
- `components/shared/*`: reusable project and design controls.
- `components/obra/*`: design-system primitives — `ObraAlert` (error/warning/info/success variants), `ObraSpinner` + `ObraLoadingOverlay`, `ObraInput`, `ObraTextarea`, etc.
- `hooks/*`: API orchestration hooks (`useProject`, `useAi`, `useImages`, `useExport`).
- `store/*`: **UI-only** store (modals, step transition focus flags, transient loading UX).
- `lib/supabase.ts`: Supabase client setup.
- `lib/preview/injectAll.ts`: client-side `injectAll(htmlShell, { chapters, images })` — replaces `{{TOC_ENTRIES}}`, `{{CHAPTER_N_TITLE}}`, `{{CHAPTER_N_CONTENT}}` placeholders and injects signed image URLs into `data-slot-key` divs. Also injects slot overlay UI (CSS + JS) for hover interactions. Exports `SlotMessage` type and `isSlotMessage()` guard.
- `lib/preview/documentShellApi.ts`: `fetchOrGenerateShell({ projectId, ebookId, currentChapterCount, currentPageSize, currentPageOrientation })` — reads `ebooks.html_shell` + `shell_meta` when a non-empty `html_shell` exists and returns it with `stale: boolean` (`isShellMetaStale()` compares `shell_meta` to the current chapter count and page settings). **Does not** invoke `generate-document-template` only because the shell is stale; it invokes that Edge Function **only when `html_shell` is missing** (first generation). `regenerateShell()` forces a new shell (user-triggered, e.g. Preview CTA after edits).
- Text model prompt templates live in [`supabase/functions/_shared/prompts.ts`](../../supabase/functions/_shared/prompts.ts) (Edge Functions only; not bundled in the SPA).
- `i18n/*`: translation resources and locale setup.

## 6) Wizard and content UX architecture

- Global three-step UX:
  1. Structure
  2. Content
  3. Preview
- `AiAssistField` is the reusable UX primitive for local text optimization in Structure.
- Main ebook chapter outline is not finalized in Structure; it is handled during Content.
- Upload path starts after shared Structure/design completion.
- Preview is the export-oriented and visual refinement surface; long-form text editing is centered in Content. **Preview as global step 3** is active only after Content milestones reach `project_content_progress.current_phase = 'complete'` (see [`business_logic.md`](business_logic.md) §9 and [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)).
- **Preview rendering model:** Preview uses a Claude-generated HTML shell (`ebooks.html_shell`) in a `<iframe srcdoc>`. **Fresh shell** (`shell_meta` matches current chapter count and page size/orientation): the client runs `injectAll(html_shell, { chapters, images })` on every render — placeholders, signed image URLs, and in-iframe slot overlay UI — without calling Claude for text edits. **Stale shell** (metadata out of date vs Content or Structure page settings): the iframe shows the **stored `html_shell` as-is** (no `injectAll`) as a snapshot of the last generated layout; an `ObraAlert` (warning) plus a CTA calls `regenerateShell()` directly (no confirmation modal). PDF export (`export-pdf` / worker) still hydrates `html_shell` with `injectAll()` and current chapter rows until product rules change.
- **Image slot interactions:** image slots inside the iframe communicate with the React parent via `postMessage` (`obra:slot:file`, `obra:slot:generate`, `obra:slot:remove`). The parent handles upload, Gemini generation modal, and slot removal; the iframe re-renders with the new signed URL via `injectAll()`.

Detailed flow contracts belong to:

- [`business_logic.md`](business_logic.md)
- [`../../features/wizard-shared/wizard-shared.md`](../../features/wizard-shared/wizard-shared.md)
- [`../../features/wizard-ai-generation/wizard-ai-generation.md`](../../features/wizard-ai-generation/wizard-ai-generation.md)
- [`../../features/wizard-upload/wizard-upload.md`](../../features/wizard-upload/wizard-upload.md)
- [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)

## 7) State management responsibilities

Three layers:

1. **Domain (server):** projects, design system, ebooks/chapters, `project_content_progress`, credits, etc.
2. **Server-state cache:** queries, mutations, invalidation; single place for “what the server last said.”
3. **UI store (Zustand):** ephemeral UI — active modal, inline validation affordances, **debounced draft buffers** only where they are not the authority over persisted rows.

Persistence and source-of-truth live in backend tables; the client is a synchronized working view.

### Structure draft autosave and conflicts

- While Structure is in progress, **autosave** with debounce plus save on blur / next / back, aligned with optimistic locking on `project_structure_drafts.updated_at` (see [`../../ARQUITECTURA_Obra.md`](../../ARQUITECTURA_Obra.md)).
- On version conflict: **no silent merge** in MVP — explicit user choice: **reload remote** or **overwrite** with full awareness.

## 8) Phase resolution for guards (implementation)

- Implement **one central resolver** (e.g. `resolveAllowedGlobalStep(project)` + `getRedirectPath(project, requestedSegment)`) used by all workspace routes and tests.
- Load guard inputs in **one bootstrap query** (e.g. `getProjectWorkspaceState`) returning `project` + `project_content_progress` (+ draft presence as needed) to avoid split-brain between `structure_completed_at` and progress rows.

## 9) Client observability and PII

- Error tracking (e.g. Sentry) must **not** attach: chapter bodies, user prompts, assistant outputs, chat transcripts, parsed manuscript text, or raw AI payloads.
- Allowed context: operation name, global phase/segment, opaque IDs (`project_id`, `user_id` UUID), HTTP status, correlation/request id.
- Do **not** include email, display name, or phone in the primary event payload; review vendor “user context” so it does not duplicate PII.
- Strip or denylist **query strings** before reporting; prefer path-only or a strict allowlist of non-sensitive params.

## 10) Idempotency and long-running mutations (client contract)

- Each long-running or billable mutation sends a single **`client_operation_id`** (UUID) or **`Idempotency-Key`** for that user intent; **network retries reuse the same key**.
- Expect the server to be **replay-safe** for the same key within an agreed TTL/window; **explicit conflict** responses when a different operation collides.
- **Exports:** new key per export action; dedupe only for **identical key** (same attempt), not “same project.”
- **UI:** on duplicate or in-flight, show a clear message and surface **progress** (poll/subscribe); do not swallow errors.
- **Multipart uploads:** idempotency at **session / create / complete** boundaries; chunks are not individually keyed for dedupe semantics. Align with Edge Function contracts.

## 11) UI quality constraints

- Follow design tokens and conventions from:
  - [`../../CONVENCIONES.md`](../../CONVENCIONES.md)
  - `obra/src/lib/tokens.ts` (once app code is present)
- No hardcoded user-facing strings; use i18next keys.
- Accessibility baseline: WCAG 2.1 A-oriented behavior in forms, focus order, and feedback.
- **Wizard focus:** on step change (global inner steps and major transitions), move focus to the **step heading** (or an accessible `h2`) before natural tab order.
- Performance baseline:
  - route-level code splitting for heavy project/editor routes
  - avoid avoidable fetch cascades in wizard transitions
  - prevent double-submit in long operations (upload/export), complemented by idempotency keys (§10)

## 12) Testing and delivery hooks

- E2E scope and CI behavior: [`../development/ci-pipeline.md`](../development/ci-pipeline.md)
- Prefer **mocked Edge Function responses** in CI for stability and cost; optional staging runs with bounded cost.
- Manual release checks: [`../operations/smoke-test.md`](../operations/smoke-test.md)

## 13) Source of truth links

- Technical backend counterpart: [`backend.md`](backend.md)
- Domain and invariants: [`business_logic.md`](business_logic.md)
- Product scope: [`../../PRD_Obra.md`](../../PRD_Obra.md)
