# Backend architecture (Obra)

**Version:** 1.2  
**Last update:** April 2026  
**Scope:** Supabase/Postgres/Storage, Edge Functions, backend operations, logging, and idempotency.

## 0) Implementation work order

- For any task that exposes or changes behavior consumed by the **frontend** (Edge Function payloads, RPC shapes, table contracts surfaced to the client, Storage flows), **define or update the API contract first**, then implement the function, migrations, or policies against that contract.
- The contract must cover at minimum: **request/response (or event) shapes**, **error codes and HTTP semantics**, **auth/RLS expectations**, and **idempotency/retry** rules where applicable (see §6).
- The artifact can be OpenAPI, shared typed schemas, a short spec in `docs/`, or a reviewed ticket/PR description — what matters is an **explicit, agreed contract** before production feature code is written.
- Internal-only changes (purely DB internals, cron jobs with no client surface) still benefit from a short note of behavior, but do not require a client-facing API contract unless they later surface to the app.
- For full-stack slices, align the same contract with [`frontend.md`](frontend.md) §0 before merging either side.

## 1) Backend system boundaries

- Backend platform: **Supabase** (`Auth`, `PostgreSQL`, `Storage`, `Edge Functions`).
- Frontend calls backend only through Supabase clients and Edge Functions.
- External providers are reached from Edge Functions only:
  - Anthropic Claude API (text generation)
  - Google Gemini API (image generation / Nano Banana family)
  - Puppeteer runtime for PDF export
  - Mercado Pago webhooks and subscription events
- API keys are never exposed to the browser.

## 2) Data platform and infra baseline

- Choose a LATAM region in Supabase for initial AR/BR launch.
- Enable backup and recovery capability (PITR or equivalent by plan).
- Keep an external encrypted backup path and restoration runbook.
- Observability is split between Supabase and Vercel logs (no mandatory unified aggregator in MVP).
- Logging policy: **metadata and error codes only.** Expand explicitly as **never log** unless redacted or hashed:
  - Chapter or ebook **body text**, user **prompts**, **assistant** outputs, **chat** messages
  - **Parsed manuscript** or upload text payloads
  - **Authorization** headers, cookies, session tokens, API keys
- When debugging payloads is necessary, log **sizes**, **checksums** (e.g. SHA-256), and **opaque ids** only.
- Align client-side error tracking constraints with [`frontend.md`](frontend.md) §9.

## 3) Database model ownership

Canonical relational model is described in:

- [`project-ebook-data-model.md`](project-ebook-data-model.md)

Core tables and responsibilities:

- Identity/profile: `auth.users`, `creator_profiles` (Obra-owned row; see [`../development/auth-rls-baseline.md`](../development/auth-rls-baseline.md))
- Project root: `projects`, `project_structure_drafts`
- Design/content artifacts: `design_systems`, `ebooks`, `chapters`, `images`
- Content progression: `project_content_progress`, `project_manuscripts`
- Content chat scope: `content_chat_threads`, `content_chat_messages`
- Optional post-MVP area: `landing_pages`

Hard backend invariants:

- Package limits enforced in app/API and DB guardrails:
  - exactly one `main` ebook
  - up to 5 `bonus`
  - up to 2 `order_bump`
- `project_content_progress.current_phase` restricted by DB `CHECK`.
- Upload manuscript active-row rule: one row with `superseded_at IS NULL` per project.
- `content_chat_messages` idempotency for user turns with `client_message_id` unique per thread.

## 4) RLS and Storage

- RLS enabled on all user data tables.
- Ownership model resolves to authenticated user via `project_id -> projects.user_id`.
- Storage bucket policy:
  - bucket: `project-images` (private)
  - access: signed URLs when needed
  - path convention: `{user_id}/{project_id}/{asset_id}.{ext}`

## 5) Edge Functions catalog

All functions live under `supabase/functions/` (repo root) and return:

```json
{ "data": "...", "error": null }
```

Primary functions:

- `ai-optimize`: optimize short wizard inputs
- `ai-generate-index`: TOC proposal for **main**, **`bonus`** (single section title), or **`order_bump`** ebook (`target_ebook_id` optional in body; **stub titles** + credit debit; **post-MVP:** optional chat-turn wrapper)
- `ai-generate-content`: chapter body generation (rich HTML fragment; client sanitizes before `chapters.content` persist)
- `ai-generate-html`: design-aware HTML composition/generation
- `image-generate`: Gemini image generation, then Storage persist + `images` row
- `parse-document`: upload branch text extraction (`.docx`, text-layer PDF, no OCR in MVP)
- `export-pdf`: ebook HTML to PDF pipeline via Puppeteer
- `mercadopago-webhook`: payment/subscription events, credits/subscription updates
- `export-user-data`: portability package generation
- `delete-account`: account deletion orchestration
- `purge-deleted-projects`: scheduled hard-delete after retention window

## 6) Reliability and idempotency rules

- Rate-limit expensive functions by authenticated user and optionally by IP.
- Credit consumption must be committed only after successful operation persistence.
- Duplicate-sensitive operations require idempotency keys or unique request constraints:
  - project duplication
  - webhook processing
  - expensive generation retries
  - long-running flows initiated from the client (**exports**, **upload finalize**, **billable generation**) using a per-intent **`client_operation_id`** or **`Idempotency-Key`**; **network retries must reuse the same key**
- **Replay semantics:** same key within an agreed TTL/window → same persisted outcome (idempotent replay). Distinct colliding operations → **explicit conflict** response (e.g. HTTP 409) with a stable error code.
- **Exports:** idempotency scopes a **single export attempt** (new key per user click), not “any export for this project.”
- **Multipart uploads:** treat idempotency at **session create / complete** boundaries; individual chunks are not separate idempotency units for business dedupe.
- For Storage+DB multi-step flows, document operation order and retry/compensation strategy.
- Client UX expectations for in-flight/duplicate operations: [`frontend.md`](frontend.md) §10.

## 7) Backend ops references

- CI and E2E expectations: [`../development/ci-pipeline.md`](../development/ci-pipeline.md)
- Supabase provisioning notes: [`../infrastructure/supabase.md`](../infrastructure/supabase.md)
- Incident process: [`../operations/incident-runbook.md`](../operations/incident-runbook.md)
- Pre-release smoke: [`../operations/smoke-test.md`](../operations/smoke-test.md)

## 8) Source of truth links

- Product/business constraints: [`../../PRD_Obra.md`](../../PRD_Obra.md)
- Wizard shared and content flows:
  - [`../../features/wizard-shared/wizard-shared.md`](../../features/wizard-shared/wizard-shared.md)
  - [`../../features/wizard-ai-generation/wizard-ai-generation.md`](../../features/wizard-ai-generation/wizard-ai-generation.md)
  - [`../../features/wizard-upload/wizard-upload.md`](../../features/wizard-upload/wizard-upload.md)
  - [`../../features/wizard-preview/wizard-preview.md`](../../features/wizard-preview/wizard-preview.md)
