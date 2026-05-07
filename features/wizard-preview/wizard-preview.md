# PRD — Wizard Preview (global step 3)

**Product:** Obra (obra.app)  
**Feature slug:** `wizard-preview`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` (limits, credits, locales, PDF export)  
**Related:** `features/wizard-shared/wizard-shared.md` (design handoff, global stepper, `image_mode` / `image_style`, optional `**author`** with main title), `features/wizard-ai-generation/wizard-ai-generation.md` and `features/wizard-upload/wizard-upload.md` (entry from Content for both branches). `**PRD_Obra.md` §6–§7** — product-level image and export rules.

---

## Problem Statement

After **Structure** (design) and **Content** (index, chapters, bonuses, bumps), creators need a **single place** to see their infoproduct **as it will look** with the chosen design system applied, **refine images**, **generate or replace** cover art, and **export** PDFs—without redoing the Design wizard and without maintaining two sources of truth (raw text vs rendered layout).

Without a clear spec, teams risk: preview diverging from PDF, ambiguous image billing, broken exports, or users expecting to edit long-form text in Preview when the product intends text edits to live in the Content phase.

---

## Solution

**Wizard Preview** is **global step 3 — Vista previa / Preview** in the same three-step journey as `wizard-shared` and the Content flows. It applies **persisted project design** (palette, typography, page size/orientation, CSS contract) to **canonical structured content (JSON)** rendered through **versioned HTML layout templates**. **Image slots** are defined only by **layout contracts** (no ad-hoc images). Users may **replace** slot images via **AI regeneration** (with short instructions, preview, and confirm) or **upload**, subject to **layout-defined** size limits and **KB** caps, with **one optimized** stored variant per slot.

**Cover** is generated with **Gemini (Nano Banana)** using a prompt that places **visible text inside the image**; the cover surface does not duplicate that text for sighted users, while **in-app accessibility** uses `alt` and screen-reader-only text. **Regeneration** of cover is **explicit**; initial generation may run when entering Preview if no cover exists.

**Layout variation:** Each project uses a **pre-assembled book template** identified by **`book_template_id`** (chosen with design / structure; align placement with `wizard-shared`). The template **binds page roles** (cover, TOC/index, chapter opener, continuation, body, …) to **fixed layout ids** and/or **internal tagged pools** (e.g. optional variety for body pages). **Cover** and **TOC / index** are **never** “free random” outside the template—they follow the template’s rules. **Chapter openers** use the **layout id defined by the template** for the opener role (**one style per project** via the chosen template, not a separate per-chapter random pick). **PDF output** uses **multi-page reflow** with correct **page breaks** (not single-page-per-chapter unless content fits).

**Layout catalog (product rules):** **Book templates**, **layouts**, and **pools** are **owned by the product/engineering team** and ship as **versioned catalog data in the monorepo** (not as end-user-editable rows in the database in MVP). **Preview and exported PDF** must use the **same** catalog version for a given render; the API may expose **`layout_catalog_version`** (and template version if split) so clients and workers detect mismatch after deploys. **Persistence:** the project stores **`book_template_id`**; each eligible **logical page** stores its resolved **`layout_variant_id`** once assigned—**no per-page RNG seed** in MVP—so layouts stay stable across refresh. **Deprecation:** if a layout id is retired, **runtime resolution** maps old ids to a **replacement** (`replacedBy`) so existing projects keep rendering without a batch data migration (see [`docs/architecture/layout-registry-and-pools.md`](../../docs/architecture/layout-registry-and-pools.md)).

**Text editing in Preview is out of MVP:** users use a **general “Edit content”** control to return to **Content**; returning to Preview **starts from the top**. **Re-approval** of chapters after edits is **not** required; **export rules are relaxed** for MVP (warnings for empty parts, non-blocking).

**Export:** **per-deliverable PDF** (main, each bonus, each bump) and a **project ZIP** containing those PDFs; **no per-chapter-only** export. ZIP generation **aborts entirely** if **any** included PDF fails. Filenames follow a **stable slug pattern** **without dates**.

---

## User Stories

### Entry, journey, and parity

1. As a subscribed creator, I want **global step 3** to show **Preview** as **current** after I complete Content milestones, so that I know I am in **review and export**, not rewriting structure or design.
2. As a creator on the **AI** or **Upload** branch, I want the **same Preview experience**, so that I do not learn two products.
3. As a creator, I want **Preview and exported PDF** to share the **same design tokens and layout contracts**, so that I am not surprised at export.
4. As a creator, I want **multi-page PDFs** with sensible **page breaks** for long chapters, so that content is readable and not clipped by mistake.

### Canonical content and navigation

1. As a creator, I want **all long-form text** to remain stored in the **canonical JSON** model, so that there is a single source of truth.
2. As a creator, I want a **general control** to **go back to Content** to edit text, so that I do not look for paragraph editing in Preview in MVP.
3. As a creator, when I return to Preview after editing in Content, I want the view to **open from the beginning**, so that behavior is predictable (MVP).
4. As a creator, I want **not** to be forced to **re-approve** chapters after I edit text again, so that iteration is fast (MVP).
5. As a creator, I want **export** to remain **available** under relaxed MVP rules, with **warnings** when parts are empty, so that I can still download deliverables.

### Layouts and templates

1. As a creator, I want to **choose a book template** (`book_template_id`) that defines the **overall page composition** of my deliverable, so that I get a **coherent pre-assembled layout** instead of piecing pages together ad hoc.
2. As a creator, I want **body pages** (and any other roles the template defines) to use layouts **determined by my book template**—**fixed** and/or from **internal pools**—with **stable persistence** per logical page entity, so that layouts do not reshuffle on every refresh.
3. As a creator, I want **Cover** and **table of contents / index** pages to follow the **book template’s rules**, so that those pages stay predictable and match the template I picked.
4. As a creator, I want **chapter boundaries** to show a **clear chapter opener** layout with a **structural page break** before each chapter’s first page, so that chapters feel separated in PDF.
5. As a creator, I want **one chapter-opener treatment per project** (as defined by my **book template**) applied to **all** chapters, so that the book feels consistent.
6. As a creator, I want chapter openers to show **chapter number** (from **TOC order**) and **chapter title** from content, so that numbering matches the index.

### Design system application

1. As a creator, I want **step 1 design** (palette, fonts, page format) to drive **preview and PDF** through a **shared CSS contract**, so that brand stays coherent.

### Images

1. As a creator, I want **only contract-defined image slots** (from layouts) to appear, with **one or more slots per page** when the layout defines them, so that the template stays intact.
2. As a creator with **AI-assisted** image defaults, I want missing slot images to be **queued automatically** when I open Preview, and **executed** without a separate “generate all” click, so that I see progress quickly.
3. As a creator, I want **refreshing** the page to **only enqueue slots still without a URL**, so that I do not pay or wait for duplicate work.
4. As a creator, I want to **upload** my own image into a slot within **KB** and **layout-defined dimension** rules, so that I stay within technical limits.
5. As a creator, I want **one optimized** image variant stored per slot, so that PDFs do not become unnecessarily heavy.
6. As a creator, I want **regenerate** to accept a **short instruction**, show a **preview**, and require **confirmation** before replacing the stored image, so that I stay in control.
7. As a creator, I want **image generation** to **charge credits only on success**, with **idempotent** retries, so that billing feels fair.

### Cover (Nano Banana)

1. As a creator, I want an **AI-generated cover** whose **visible typography lives in the image**, with **no duplicate marketing text** in the HTML for sighted users.
2. As a creator, I want **optional project author** (single field, project-level) to feed the cover prompt **when provided**, so that branding can appear when I care to fill it.
3. As a creator, I want **cover regeneration** to be **explicit**, not triggered by every title tweak, so that credits are predictable.
4. As a creator, I want **accessible** cover handling **in the app** (`alt` + screen-reader-only text), even if **PDF tagging** is not required in MVP.
5. As a creator, when cover generation **fails**, I want a **degraded placeholder**, **retry**, and **upload** path, and I still want to **export the rest**, with a **clear warning**.

### Pagination and print

1. As a creator, I want **page numbers** on **non-cover** pages **bottom-right**, so that PDFs look like professional documents.

### Export

1. As a creator, I want to **download one PDF** for the **main** ebook and **each** bonus and bump, so that I can ship files separately.
2. As a creator, I want a **ZIP** that contains **all deliverable PDFs** for the project, so that I can archive or share the full package.
3. As a creator, I want the ZIP job to **fail entirely** if **any** PDF in the bundle fails, so that I do not get silent partial packages.
4. As a creator, I want **empty** sections still **exportable** with **warnings**, so that I am not blocked in MVP.
5. As a creator, I want **export** not to consume **AI credits** (compute-only), so that pricing stays understandable.

---

## Implementation Decisions

### Data and rendering model (MVP — HTML shell approach)

> **Note:** The book template / layout registry / pools architecture described in earlier drafts is **post-MVP**. The MVP uses a Claude-generated HTML shell approach described below.

- **HTML shell** (`ebooks.html_shell`): Claude generates a full HTML document for each ebook via the `generate-document-template` Edge Function. The shell encodes the project’s design system (palette, fonts, page size/orientation) and contains structural placeholders:
  - `{{TOC_ENTRIES}}` — table of contents list items
  - `{{CHAPTER_N_TITLE}}` / `{{CHAPTER_N_CONTENT}}` — per-chapter slots (N = 1-based sort order)
  - `<div data-slot-key="…" data-slot-type="…" data-slot-description="…">` — image slots
- **`injectAll(htmlShell, { chapters, images })`** — pure function (no Claude call) run client-side on every render. Replaces all placeholders with current chapter data and signed image URLs. A corresponding implementation runs in the Railway PDF worker (`obra-pdf-export/src/pdf-builder.js`). **Note:** the two implementations diverge for the cover slot — see "Cover image rendering" below.
- **Staleness check** (`shell_meta: { chapter_count, page_size, page_orientation, generated_at }`): shell is regenerated only when structure changes (chapter count or page config). Text edits in Content never trigger regeneration.
- **Same HTML for preview and PDF:** `ebooks.html_shell` is the single source of truth for both `<iframe srcdoc>` preview and the Railway Puppeteer worker — no divergence between what the user sees and what gets exported.
- **Image slots** are defined by the Claude-generated shell. Slot key conventions:
  - **Cover:** HTML `data-slot-key="cover"` ↔ DB `slot_key="cover_art"` — this mapping is normalized inside `injectAll()`.
  - **Chapter images:** HTML `data-slot-key="chapter-N-image-1"` (1-based chapter order) ↔ DB `slot_key="chapter-N-image-1"`. Legacy shells generated before the prompt fix used `chapter-N-img`; all three `injectAll()` implementations (client, Edge Function `export-pdf`, Railway worker `obra-pdf-export`) add a backward-compat alias so old shells still resolve images correctly.
  - The DB stores images in `project_images` with `slot_key` set to the **DB key** (`cover_art`, `chapter-N-image-1`).
- **`removeImage()` (`obra/src/lib/preview/imageSlotApi.ts`):** deletes the `project_images` row and the corresponding Storage object. Requires an RLS `DELETE` policy on `project_images` (see migration `20260501120000_project_images_delete_policy.sql`); without it, Supabase silently ignores the delete.
- **Cover image rendering:** In the browser preview, the cover image is injected as an `<img>` element inside the `.obra-image-slot--cover` div. In the Railway PDF worker, the cover is instead injected as a CSS `background-image` on `.obra-page.obra-cover` (the slot div is hidden via `display:none`). This is required because pagedjs 0.4.x does not reliably support `position:absolute; inset:0` inside page areas; `background-image` on the page element is the correct approach for full-bleed cover images.
- **Fixed page dimensions (PDF worker):** The worker injects explicit `width`/`height` overrides (from `design_config.page`) on `.obra-page.obra-cover` and `.obra-page.obra-chapter-opener` to prevent pagedjs from miscomputing their dimensions.
- **Post-MVP:** book template / layout registry / pools architecture for structured multi-layout documents (see [`docs/architecture/layout-registry-and-pools.md`](../../docs/architecture/layout-registry-and-pools.md)).

### Styling and PDF

- **Design system → CSS:** project tokens are inlined into the HTML shell as CSS custom properties (`--color-primary`, `--color-secondary`, `--color-accent`, `--font-display`, `--font-body`). Google Fonts are loaded via `<link>` in the shell (browser preview only — the PDF worker strips these tags before loading the HTML; see below).
- **PDF engine:** Puppeteer (Railway worker, `Digital-Craft-AR/obra-pdf-export`) renders the same `html_shell` after `injectAll()`. `@page` rules and `page-break-after` / `break-after` in the shell CSS control pagination. `@media screen` adds card simulation for in-app preview; Puppeteer uses the print path.
- **Named CSS pages:** `obra-full-bleed` (zero margin, for cover/chapter-opener full-bleed images) and `obra-content` (20mm margin, for body/TOC pages).

### Images pipeline

- **Image slot interactions (MVP):** slots inside the `<iframe>` have a hover overlay (injected CSS + JS) with three actions: upload from disk, generate with AI (opens modal with instruction field), remove. Actions are communicated to the React parent via `postMessage` (`obra:slot:file`, `obra:slot:generate`, `obra:slot:remove`). The parent handles Storage upload, Gemini generation, DB write, and DB delete; `injectAll()` re-runs with the new signed URL (or without the removed slot's URL on removal).
- **Slot key resolution in parent (`resolveSlotArgs`):** the iframe emits the HTML slot key (e.g. `chapter-2-image-1`); `resolveSlotArgs` normalizes legacy `chapter-N-img` → `chapter-N-image-1`, then maps to the DB key, `ebookId`, and `chapterId` for API calls. The composite key `{ebookId}:{dbSlotKey}` is used in `imageSlots` React state.
- On **entering Preview**, enqueue **missing** slot URLs according to `image_mode`; **auto-run** jobs; on **reload**, only **still-empty** slots enqueue again.
- **Uploads:** validate **KB max** and **layout max dimensions/aspect**; persist **single optimized** derivative; reject or downscale per product rules.
- **AI regenerate:** optional **short user instruction**; **preview** result; **confirm** to commit; credits on **successful** persist; **idempotency** keys for retries.

### Cover generation

- **Gemini Nano Banana** via **server-side** proxy only; prompt includes **title**, optional **subtitle**, optional **author** if non-empty, `**image_style`** and palette/style notes, `**content_locale`**.
- **First-time** cover generation may run when entering Preview if absent; **subsequent** generations are **user-initiated** only.
- **Failure:** placeholder aligned to design system; retry/upload; export still allowed with warning.

### Content editing scope (MVP)

- **No in-place rich text** in Preview; **one general** navigation action to **Content** (existing pattern). No extra mandatory marketing copy in Preview solely for this decision.

### Export

- **Individual PDFs:** full **main**, full **each bonus**, full **each bump**; **no chapter-only** export.
- **ZIP:** contains **only PDFs** for MVP unless product later adds assets; naming **slug-based**, **no date** segment.
- **Failure policy:** **all-or-nothing** ZIP if any member PDF fails; surface **actionable error** (which deliverable failed, retry).
- **Empty content:** still produce files where technically possible; **non-blocking warnings**.

### Credits and limits

- **Image AI:** charge on **success**; idempotent retries.
- **Export:** **no AI credit** charge; **no** hard user-facing time/size cap in MVP (operational monitoring still recommended).

### Deep modules (stable surfaces)

- **HTML shell pipeline:** `generate-document-template` (Edge Function) → `ebooks.html_shell` + `shell_meta` → `fetchOrGenerateShell()` (client) → `injectAll()` (client + Railway worker) → `<iframe srcdoc>` / Puppeteer.
- **Image slot service:** `project_images` table (slot_key → storage_path); signed URLs fetched at render time; slot interactions via postMessage in preview.
- **Export service:** `export-pdf-queue` Edge Function always creates a new `pdf_export_jobs` row on every call (no timestamp-based reuse — image changes don't bump `ebooks.updated_at`). It guards against concurrent exports for the same ebook: if a `pending`/`processing` job already exists, it returns that job's ID so the UI can track progress without duplicating work. The Railway worker (`Digital-Craft-AR/obra-pdf-export`) picks up the job, renders with Puppeteer + pagedjs, uploads the PDF to Storage, and marks the job `completed` with a `storage_path`.
- **Per-ebook download:** Once an export completes, `WizardPreviewPage` stores the signed URL per `ebookId` in `ebookPdfUrls` state (loaded on mount from the latest completed job per ebook). A "Descargar PDF" button appears alongside the export button when a URL is available. Any image change or design regeneration calls `markModified(ebookId)`, which clears that ebook's entry from `ebookPdfUrls` and resets `exportJobId` so the next export starts fresh.
- **`publishStatus` on export:** On `export-pdf-queue` success, `publishStatus` is set to `"published"` unconditionally (overriding both `"draft"` and `"modified"`). Any subsequent image change or design regeneration resets it to `"modified"` via `markModified()`.
- **Post-MVP — Layout registry:** book templates, layout catalog, and pools ([`docs/architecture/layout-registry-and-pools.md`](../../docs/architecture/layout-registry-and-pools.md)) for structured multi-layout documents.

---

## Workstreams

### Design

- **Layout catalog:** define **book templates** (`book_template_id` targets) that bind **Cover**, **TOC/Index**, **chapter opener**, **continuation**, and **body** (and any other roles) to **fixed layouts** and/or **internal pools**; specify **slot positions**, safe areas, and **per-role** behavior inside each template.
- **Visual specs** for **degraded** states: missing image, generating, failed AI, empty text warning badges.
- **Export UX:** primary/secondary actions (single PDF vs full ZIP), progress, error when ZIP aborts, non-blocking **warnings** list for empty sections.
- **Cover:** art direction for **text-in-image** covers; confirm **no visible duplicate** title in layout; **accessibility** pattern (`alt` + visually hidden text).
- **Typography:** ensure **page numbers** (bottom-right) match product typography and do not collide with layout footers.
- **Tokens:** align preview/PDF with **60/30/10** and font pairs from Structure; no ad-hoc colors in deliverables.

### Frontend

- **Global stepper:** step 3 **active**; reuse same component as other phases.
- **Preview shell:** render paginated or scroll preview using **same render pipeline** as PDF; loading states for layout resolution and assets.
- **Image slots UI:** per-slot **generate**, **regenerate** (instruction field), **upload**, **preview modal** and **confirm/cancel**; queue/progress indicators; **refresh** behavior re-enqueue only empty slots.
- **Cover:** generate/retry/upload flows; explicit **regenerate**; failure placeholders.
- **Navigation:** **Edit content** returns to Content; when returning to Preview, **scroll/top reset** to start (MVP).
- **Export:** triggers for **each deliverable PDF** and **project ZIP**; handle **all-or-nothing** ZIP errors; show **warnings** for empty content.
- **i18n:** all new strings via **es** / **pt-BR** keys; no hardcoded user-visible strings.
- **Accessibility:** keyboard paths for modals, focus traps, live regions for generation status.

### Backend

- **APIs** to fetch **render model** (JSON + layout ids + asset URLs) and to **mutate** slot records (upload finalize, AI job attach).
- **Edge functions** (or workers) for: **image generation** (Gemini), **image optimize** pipeline, **cover generation**, **PDF render** per deliverable, **ZIP** assembly.
- **Job queue:** idempotent jobs for slot generation; **partial failure** handling per slot; ZIP **aborts** on any member failure.
- **Storage:** optimized binaries per slot; **signed URLs** or server-side fetch for PDF renderer.
- **Credits ledger:** record **image** successes only; **no** export debits.
- **Observability:** structured logs for PDF/ZIP duration and failure reasons (without PII in logs beyond ids).

---

## Testing Decisions

- **Behavior-first tests:** assert **user-visible outcomes**—layout stability across refresh, empty-slot re-enqueue rules, ZIP failure when one PDF fails, warnings when content empty.
- **Unit tests:** layout registry validation (slots present), filename sanitization, idempotency key handling for image jobs.
- **Integration tests:** render pipeline produces **consistent** HTML for preview vs PDF given same inputs; **print** CSS does not clip a **long chapter** in a minimal fixture.
- **E2E (optional smoke):** open Preview → wait for slot resolution → export **one** PDF → trigger ZIP with **forced failure** path in staging hook (if available).

**Modules to prioritize for automated tests:** render pipeline, image slot service (enqueue + refresh semantics), export/ZIP orchestration.

---

## Out of Scope (MVP)

- **In-place rich text editing** in Preview (post-MVP).
- **Per-chapter-only** PDF export.
- **ZIP** including raw **image assets** or HTML exports (unless explicitly added later).
- **PDF/UA** or full **tagged PDF** accessibility for cover/body (app-level accessibility only for cover).
- **Automatic cover regeneration** on title change.
- **Scroll/page position restoration** when returning from Content to Preview.
- **Hard user-facing** export size/time quotas (MVP); may be added operationally later.

---

## Further Notes

- **Author field:** single optional `**author`** string at **project** level, captured **on the same screen as main title** in shared package structure (`wizard-shared` alignment required).
- **Chapter opener vs body layouts:** both are defined by the project’s **`book_template_id`** (opener role vs body/continuation roles). **Pools** are only used where the template says so—ensure PRD **§Implementation** and engineering **`roleBindings`** stay consistent.
- **Billing:** align image credit triggers with `**PRD_Obra.md` §11** and global ledger rules; export remains **compute-only**.
- **Related docs to update when implementing:** master PRD cross-links, `wizard-shared` (**book template** picker + author + main title screen), `ARQUITECTURA_Obra.md`, `CLAUDE.md`, **`docs/architecture/layout-registry-and-pools.md`** (book templates, layout manifest, pools, CI), and `docs/` as needed for **render pipeline** and **export**—as per repo documentation norms.

