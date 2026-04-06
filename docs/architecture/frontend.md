# Frontend architecture (Obra)

**Version:** 1.0  
**Last update:** April 2026  
**Scope:** React app structure, state, UI flow, UX quality constraints.

## 1) Frontend stack and boundaries

- Stack: React + Vite + TypeScript.
- UI system: shadcn/ui + Tailwind CSS.
- UI i18n: i18next with `es` and `pt-BR`.
- Global state: Zustand.
- Frontend does not call external AI/payment/PDF providers directly.
- Backend integration only through Supabase client and Edge Functions.

## 2) App structure (logical)

- Auth area: login/register/session handling.
- Dashboard area: project list and account settings entry points.
- Project workspace: wizard (Structure + Content + Preview), editor, export.
- Marketing area: public landing pages and acquisition surfaces.

The exact folder shape can differ (for example `src/pages` vs `src/app`), but responsibilities remain the same.

## 3) Core frontend modules

- `components/wizard/*`: wizard shell and step UIs.
- `components/editor/*`: chapter and preview editing surfaces.
- `components/shared/*`: reusable project and design controls.
- `hooks/*`: API orchestration hooks (`useProject`, `useAi`, `useImages`, `useExport`).
- `store/projectStore.ts`: active project state and wizard UI state.
- `lib/supabase.ts`: Supabase client setup.
- `lib/prompts.ts`: text model prompt templates used by backend-facing flows.
- `i18n/*`: translation resources and locale setup.

## 4) Wizard and content UX architecture

- Global three-step UX:
  1. Structure
  2. Content
  3. Preview
- `AiAssistField` is the reusable UX primitive for local text optimization in Structure.
- Main ebook chapter outline is not finalized in Structure; it is handled during Content.
- Upload path starts after shared Structure/design completion.
- Preview is the export-oriented and visual refinement surface; long-form text editing is centered in Content.

Detailed flow contracts belong to:

- [`business_logic.md`](business_logic.md)
- [`../../features/wizard-shared/wizard-shared.md`](../../features/wizard-shared/wizard-shared.md)
- [`../../features/wizard-ai-generation/wizard-ai-generation.md`](../../features/wizard-ai-generation/wizard-ai-generation.md)
- [`../../features/wizard-upload/wizard-upload.md`](../../features/wizard-upload/wizard-upload.md)
- [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)

## 5) State management responsibilities

Project-level client state includes:

- active project metadata
- design system snapshot
- ebook/chapter working set
- wizard progress UI state
- generation/loading UI states

Persistence and source-of-truth live in backend tables; frontend state is a synchronized working view.

## 6) UI quality constraints

- Follow design tokens and conventions from:
  - [`../../CONVENCIONES.md`](../../CONVENCIONES.md)
  - `obra/src/lib/tokens.ts` (once app code is present)
- No hardcoded user-facing strings; use i18next keys.
- Accessibility baseline: WCAG 2.1 A-oriented behavior in forms, focus order, and feedback.
- Performance baseline:
  - route-level code splitting for heavy project/editor routes
  - avoid avoidable fetch cascades in wizard transitions
  - prevent double-submit in long operations (upload/export)

## 7) Testing and delivery hooks

- E2E scope and CI behavior: [`../development/ci-pipeline.md`](../development/ci-pipeline.md)
- Manual release checks: [`../operations/smoke-test.md`](../operations/smoke-test.md)

## 8) Source of truth links

- Technical backend counterpart: [`backend.md`](backend.md)
- Domain and invariants: [`business_logic.md`](business_logic.md)
- Product scope: [`../../PRD_Obra.md`](../../PRD_Obra.md)
