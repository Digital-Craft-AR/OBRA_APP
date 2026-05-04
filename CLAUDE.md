# Obra.app — Project context

**Monorepo:** specs and ops at repo root; **web app** under `obra/` (see `ARQUITECTURA_Obra.md`).

Authoritative product scope: `PRD_Obra.md`. Feature-level specs: `features/wizard-shared/wizard-shared.md`, `features/wizard-ai-generation/wizard-ai-generation.md`, `features/wizard-upload/wizard-upload.md`, `features/wizard-preview/wizard-preview.md` (plus other `features/*` as listed there). Technical detail: `ARQUITECTURA_Obra.md`. UI tokens and patterns: `CONVENCIONES.md`.

---

## What is Obra

**Obra** (obra.app) is a SaaS for infoproduct creators. It uses AI to produce a coherent digital package—**main ebook**, **bonuses**, and **order bumps**—with a per-project design system (60/30/10 palette + font pairs), section images (AI or upload), and **PDF export**. Initial launch: **Argentina and Brazil**; broader LATAM later.

**MVP focus:** creation, editing, and PDF export of the infoproduct package. **Where the creator sells** the product (e.g. Shopify) is **out of MVP scope**; subscription billing uses **Mercado Pago** (not the same as the customer’s store).

**Unique value (product):** from idea to an exportable infoproduct package (ebook + bonuses + bumps) in PDF, fast, with AI—without design or code skills.

---

## Locales

- **UI (`ui_locale`):** Spanish and Portuguese (Brazil) only—`es`, `pt-BR`. Persisted on the account; user can switch anytime.
- **Generated content (`content_locale`):** set **at project creation**, **immutable** afterward. Catalog in v1.0: `es`, `pt-BR`, `en-US`, `en-GB` (BCP 47; do not use `en-UK`). All generated text/HTML/PDF follows `content_locale`.
- User may type prompts in any language; **model output** follows `content_locale`.

---

## Business model (v1.0)

- **Subscription only:** no free tier, no trial, **no freemium** in v1.0. App use requires an active subscription to the **single launch plan** (see `PRD_Obra.md` §11).
- **Mercado Pago:** recurring subscription + one-off **top-up** credit packs.
- **Credits:** one internal currency for AI use (text/HTML/images); rules and tables in `PRD_Obra.md` §11.

---

## Project structure (MVP)

Per **project** (see `PRD_Obra.md` §3, §11):

| Artifact | Limit (v1.0) |
|----------|----------------|
| Main ebook | Exactly **1** |
| Bonuses | Up to **5** |
| Order bumps | Up to **2** |

**Account:** up to **20 active** projects; **unlimited archived**; delete → **30-day** retention then hard delete.

**Post-MVP (not MVP):** Shopify-oriented **landing page** (preview + copyable Liquid blocks). Standard block order when built: Hero → pain points → benefits → solution → bonuses → price/CTA (optional countdown) → guarantee → testimonials → FAQs → optional author story (`PRD_Obra.md` §3).

---

## Global journey (UI)

One **three-step** stepper for the whole creation flow (`features/wizard-shared/wizard-shared.md`):

1. **Estructura** (Structure) — shared onboarding through **design** (topic → avatar/problem → package structure → design). Does **not** define main-ebook **chapter outline** (that is **Contenido**).
2. **Contenido** (Content) — AI milestones and/or upload → alignment → same milestones (`wizard-ai-generation`, `wizard-upload` for the upload slice).
3. **Vista previa** (Preview) — layout-accurate preview, **image** refinement (slots, cover), and **PDF/ZIP export** with design already applied (`features/wizard-preview/wizard-preview.md`). **Long-form text** is edited in **Contenido** (MVP); Preview is not the primary text surface.

Inner wizard progress (topic, avatar/problem, package sub-steps, design) sits **under** step 1 until design is complete.

---

## Creation flow (summary)

1. **New project:** choose `content_locale` → choose content source: **AI** or **Upload** (file is **after** shared wizard, not at the start).
2. **Shared wizard** (`wizard-shared`): topic → avatar + problem → package (counts, main title, bonus titles, bump titles) → design (presets, 60/30/10, fonts, page size/orientation, **image defaults** `image_mode` / `image_style`—no image generation inside the wizard in MVP).
3. **Content phase** (`wizard-ai-generation`; upload preamble in `wizard-upload`):
   - **AI path:** edit TOCs across package artifacts, then run a **single global index confirmation** (main + bonuses + bumps) → unified chapter editing.
   - **Upload path:** single `.docx`/`.pdf` → parse (no LLM) + LLM split proposal → user **aligns** → approve → **same** milestone sequence with **prefilled** chapter text → bonuses → bumps.
4. **Preview & export** — global step 3 (`features/wizard-preview/wizard-preview.md`): JSON → HTML layouts, image pipeline, cover (Gemini), individual PDFs + project ZIP. **Images / credits:** `PRD_Obra.md` §6. **Book templates (`book_template_id`), layout registry, pools:** `docs/architecture/layout-registry-and-pools.md`.

Upload rules (formats, 10 MB, sync flow, credits, weak prefill): `PRD_Obra.md` §4 and `features/wizard-upload/wizard-upload.md`.

---

## Tech stack (`PRD_Obra.md` §9)

- **Frontend:** React + Vite + TypeScript  
- **UI:** shadcn/ui + Tailwind CSS  
- **Chapter body (Content wizard):** `chapters.content` is **sanitized rich HTML**; editor is **Tiptap** (`@tiptap/react` + StarterKit, Link, Underline, Placeholder). Do not store Markdown in `chapters.content`.  
- **Backend / data:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)  
- **AI — text:** Anthropic Claude API  
- **AI — images:** Google **Gemini API** (Nano Banana / image models per PRD)  
- **Document parsing:** text-layer **DOCX** and **PDF** libraries (no OCR in MVP for scans)  
- **PDF:** Puppeteer (server-side, e.g. Edge Function)  
- **i18n (UI):** i18next — `es`, `pt-BR`  
- **Deploy:** Vercel  
- **Repo:** GitHub  

API keys for AI and PDF **never** in the client; use Edge Functions as secure proxies (`ARQUITECTURA_Obra.md`).

---

## Data model (reference)

Entity sketch in `PRD_Obra.md` §10. Implementation naming may differ (e.g. `design_system` vs `design_systems` in migrations—follow `ARQUITECTURA_Obra.md` and migrations).

Typical tables: users/profiles, projects (`content_locale`, **`content_source`**, optional **`author`**, **`topic`**, **`problem`**, **`target_avatar`**, **`structure_completed_at`**, lifecycle fields), **`project_structure_drafts`** (pre–design JSON; **optimistic locking** via `updated_at`), design system row(s), ebooks (main/bonus/bump; **join** `projects` for locale/author/persona/problem), **`project_content_progress`** (`current_phase` **CHECK** in DB: `upload_alignment` … `complete`; optimistic `updated_at`; global TOC gate via **`global_index_frozen_at`**), **`project_manuscripts`** (upload branch: Storage path + metadata; one current row per project), chapters (**`approved_at`** per chapter in Contenido), **`content_chat_threads`** / **`content_chat_messages`** (scoped IA chat; **user** turns idempotent via `client_message_id` per thread; **assistant** messages persisted **after** stream completes — MVP; **deleted** on confirmed avatar/problem reset), images, credits ledger, subscriptions/payments as needed. **Package limits** (1 main, <=5 bonuses, <=2 bumps) are enforced in both **app/API** and **DB triggers**. **`landing_pages`** is **post-MVP**. Storage bucket for project assets (e.g. `project-images`). **RLS** on all user data. Schema detail: `ARQUITECTURA_Obra.md` §3 (duplicate checklist; **avatar/problem reset** operation order; **no** chat copy on duplicate; chat **wiped** on reset).

---

## Brand & design system (app shell)

**CRITICAL:** Import design tokens from `obra/src/lib/tokens.ts` once the app exists. Do not use ad-hoc colors for UI.

- Navy base **#204970** — sidebar/nav **obra-blue-900**, flat, no gradient  
- Page background: **obra-blue-50**; cards/panels: white with **obra-blue-100** border  
- CTA accent: **obra-green-400** `#C8E62B`  
- Text: **obra-blue-950** primary, **obra-neutral-600** secondary  
- **Display:** Fraunces · **Body:** Plus Jakarta Sans · **Minimum 14px** body  
- Buttons: pill (`border-radius: 9999px`) — **primary CTA:** green fill + dark text; **secondary** (e.g. OAuth): blue fill + white text; on dark sidebar: `ghostDark`  
- **No gradients** in the app shell  

Full token rules: `CONVENCIONES.md` and `obra/src/lib/tokens.ts`.

---

## Engineering rules

- **Zero hardcoding:** no stray colors, sizes, user-visible strings, or styles inline. Use `obra/src/lib/tokens.ts`, `obra/src/components/ui/`, and i18n resources under `obra/src/`. Add abstractions when missing.
- **Styling:** follow `CONVENCIONES.md` and project Cursor rules. Do not style bare HTML element selectors (`h1`, `p`, etc.) in global CSS outside `@layer base`—see existing comment in this file re: Tailwind v4 specificity.
- **Prompts / UX copy:** AI and product prompts should assume the project design system where relevant.
- **Documentation updates (after meaningful work):** `CLAUDE.md`, `ARQUITECTURA_Obra.md`, `PRD_Obra.md`, `CONVENCIONES.md`, `docs/` as relevant, and `ONBOARDING.md` if setup instructions change.

## E2E testing rules

Canonical patterns for Playwright tests live in **`docs/testing/e2e-patterns.md`** — read it before writing or modifying any file under `obra/e2e/`.

Key rules (details and examples in the doc):
- **Selectors:** always `data-testid`. Never `getByLabel` with locale-dependent text. Add `data-testid` to the source component when missing.
- **Waits:** always `page.waitForResponse()` tied to the real API call. Register the promise **before** the click that triggers it. Never use arbitrary `timeout: N` as the primary synchronization mechanism.
- **AI calls:** auto-intercepted via `obra/e2e/helpers/test-fixture.ts`. Additional Edge Functions are intercepted per-test with `page.route()`; pair with `waitForResponse` to know when they complete.
- **Test isolation:** each test sets up and tears down its own data.

---

## Backlog — issues de referencia rápida

| # | Título | Labels | Descripción corta |
|---|--------|--------|-------------------|
| [#185](https://github.com/Digital-Craft-AR/OBRA_APP/issues/185) | Epic: Ideas futuras — UX/AI enhancements | `epic` `enhancement` | Repositorio de ideas no comprometidas. Incluye: botón **Remix** en campos con IA (refinar con contexto del output anterior, distinto a regenerar), y otras ideas futuras de UX/AI. Agregar sub-ítems acá antes de crear issues separadas. |

---

*This file is a condensed engineering mirror of the PRDs; if anything conflicts, **`PRD_Obra.md`** and the `features/` PRDs win.*
