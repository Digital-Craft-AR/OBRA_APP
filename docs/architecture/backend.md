# Backend architecture (Obra)

**Version:** 1.0  
**Last update:** April 2026  
**Scope:** Supabase/Postgres/Storage, Edge Functions, backend operations.

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
- Logging policy: metadata/error codes only. Do not log prompts, ebook bodies, or raw PII.

## 3) Database model ownership

Canonical relational model is described in:

- [`project-ebook-data-model.md`](project-ebook-data-model.md)

Core tables and responsibilities:

- Identity/profile: `auth.users`, `profiles`
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

All functions live under `obra/supabase/functions/` and return:

```json
{ "data": "...", "error": null }
```

Primary functions:

- `ai-optimize`: optimize short wizard inputs
- `ai-generate-index`: main ebook TOC proposal
- `ai-generate-content`: chapter body generation
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
- For Storage+DB multi-step flows, document operation order and retry/compensation strategy.

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
