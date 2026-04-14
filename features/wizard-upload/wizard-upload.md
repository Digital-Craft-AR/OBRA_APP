# PRD — Wizard upload (pre–alignment handoff)

**Product:** Obra (obra.app)  
**Feature slug:** `wizard-upload`  
**Status:** Frontend implementado — Backend completo  
**Parent reference:** `PRD_Obra.md` (limits, credits, locales, import rules §4)  
**Related:** `features/wizard-ai-generation/wizard-ai-generation.md` (shared **Contenido** milestones **after** alignment: chapter loop with prefill → bonuses → bumps); `features/wizard-shared/wizard-shared.md` (handoff **into** this flow after design); `features/wizard-preview/wizard-preview.md` (same **Preview** step as the AI branch after Content)

---

## Problem Statement

Creators who chose **content from file** need a reliable, understandable path from **finished shared wizard + design** to a **structured main ebook** inside Obra—**before** they rejoin the same **content-generation** journey as the AI path (per-chapter work, bonuses, bumps).

Without a dedicated spec, teams mix concerns: file ingestion, extraction, LLM-assisted splitting, alignment UX, storage, and logging get duplicated or drift from the **milestone orchestration** that `wizard-ai-generation` owns for **all** post-alignment work. Users also need clear rules for **replacing a file**, **retries**, **credits** (parse vs LLM), and **weak prefill** signals without blocking progress inappropriately.

---

## Solution

**Wizard upload** is the **upload branch slice** of step **Contenido** that runs **only** for projects with **content source = upload**. It covers everything from **first file submission** through **approved alignment** (index + chapter boundaries + mapped body text per chapter). When alignment is approved, control passes to `**wizard-ai-generation`** at the **main ebook chapter loop** with **prefilled** chapter bodies and a **frozen** TOC equivalent to **Confirm index** on the AI path.

**Strict ordering:**  
`upload file` → `parse (no LLM)` → `LLM: propose split / TOC` → `user aligns` → optional `LLM: regenerate split proposal` → `**Approve alignment`** → **handoff** to `wizard-ai-generation` (chapter 1…n → bonuses → bumps).

**Single main ebook file** per project ingestion (formats, size, sync parse, no OCR in MVP) per `**PRD_Obra.md` §4**.

**Ownership split:**


| Concern                                                                     | `wizard-upload` (this PRD)                               | `wizard-ai-generation`                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| File picker, validation, upload UX                                          | Yes                                                      | No                                        |
| Parse / extract text (libraries)                                            | Yes                                                      | No                                        |
| Store manuscript binary, logging, retries (parse)                           | Yes                                                      | No                                        |
| LLM: initial split + regenerate split                                       | Yes (contracts)                                          | Uses same ledger / transparency patterns  |
| Alignment UI (edit titles, merge/split sections, approve)                   | Yes                                                      | No                                        |
| Replace file **before** alignment approved                                  | Yes                                                      | No                                        |
| Global stepper, dismissible “content vs preview” banner                     | Shared component; copy may name **upload** where helpful | Owns shell for **entire** Contenido phase |
| Per-chapter editor, chat, approve, weak-prefill C2 **after** prefill exists | Surfaces warnings only                                   | Yes                                       |
| Bonuses / order bumps                                                       | No                                                       | Yes                                       |
| Index chatbot (AI path)                                                     | No                                                       | **Post-MVP** (MVP: explicit regenerate outline only) |


---

## User Stories

1. As a creator, after **design** completes, I want to land in an **upload** experience that respects `**content_locale`** and my **package + design** from the wizard, so that I do not re-enter structure or design steps.
2. As a creator, I want to upload **one** **main ebook** file (`.docx` or selectable-text `.pdf`) within the **size and format** rules in the master PRD, so that my manuscript is the single source for the main book body.
3. As a creator, I want **clear errors** for unsupported cases (password PDF, empty extract, oversize file), so that I know how to fix the file without contacting support.
4. As a creator, I want **parse + first LLM split** to run in a **synchronous**, **single-screen** flow with loading state and **no double submit**, so that I understand progress and do not corrupt state.
5. As a creator, I want the system to propose a **table of contents and chapter boundaries** from my extracted text, so that I can align my manuscript to Obra’s chapter model.
6. As a creator, I want to **edit titles** and **merge or split** proposed sections in an **alignment** UI, so that the outline matches my intent before the rest of the content flow.
7. As a creator, I want a **“Regenerate split proposal”** action that calls the LLM again on the **same** parsed text, so that I can get an alternative outline without uploading a new file (credits apply per product rules).
8. As a creator, I want **not** to spend **AI credits** on **text extraction alone**, so that billing matches “pay for intelligence, not for mammoth/pdf-parse.”
9. As a creator, I want to **replace my file** only **until** I **approve alignment**, so that I do not accidentally mix two manuscripts.
10. As a creator, after **approve alignment**, I want replacing the manuscript to require a **destructive** confirmation or **new project**, so that chapter data is never silently retargeted.
11. As a creator, I want **one automatic retry** and a **Retry** button on transient parse failures, so that I can recover without losing credits on parse.
12. As a creator, I want my uploaded file **retained in private storage** while the project exists, so that support and future re-processing remain possible (optional delete post-MVP).
13. As a creator, I trust that **logs do not contain** my manuscript text in clear text, so that privacy expectations are met.
14. As a creator, after I **approve alignment**, I want to **continue** into the **same** chapter-by-chapter flow as the AI path with **prefilled** bodies, so that the product feels like one journey.
15. As a creator using a **keyboard**, I want the upload and alignment screens to meet the **same baseline accessibility** expectations as the rest of the app (labels, focus, non-color-only errors).

---

## Implementation Decisions

### Modules (deep modules preferred)

- **Upload intake module** — Owns client-side file validation (size, MIME, single file), progress UI, disable-while-pending, and delegation to the parse API. **Hides** storage keys and transport details from alignment UI.
- **Parse pipeline module** — Runs in a trusted runtime (Edge Function or equivalent). Accepts uploaded bytes or storage reference; outputs **normalized plain text** plus minimal structure hints if the library provides them. **No LLM** inside this module. **Hides** library-specific quirks (Word vs PDF).
- **Split proposal module (LLM)** — Consumes parsed text + project context (topic, avatar, problem, main title, `content_locale`). Produces a **proposed list of chapters** (order, title, character or paragraph ranges into parsed text). **Hides** prompt versioning and model selection.
- **Alignment editor module (UI)** — Presents proposed chapters, allows reorder, rename, merge, split, and triggers **regenerate split**. Emits an **approved alignment** payload: ordered chapter records with **stable ids** and **body text slices** (or equivalent references) for persistence. **Hides** orchestration of “approve” vs “back to upload.”
- **Manuscript storage module** — Persists binary in private object storage scoped to account and project; stores reference on project or ebook record. **Hides** bucket layout and signed URL policy.
- **Handoff contract to content orchestration** — On **Approve alignment**, persists: finalized chapter list, per-chapter draft body text (prefill), `alignmentApprovedAt`, manuscript artifact reference, and transitions the project’s **content milestone state** so `**wizard-ai-generation`** starts at **first main ebook chapter** with prefill. **Hides** whether the user came from AI or upload upstream of this boundary.

### Contracts (conceptual)

- **Parse:** input `{ storageRef | bytes, mime, projectId }` → output `{ plainText, parseMetadata }` or typed error (`empty_extract`, `password_pdf`, `too_large`, …).
- **Propose split:** input `{ plainText, projectContext, locale }` → output `{ chapters: [{ order, title, sourceRange }] }` (exact shape implementation-defined).
- **Regenerate split:** same as propose split; idempotency and credit ledger on success only.
- **Approve alignment:** input `{ chapters: [{ id, title, bodyText }] }` → persists and emits event / state transition for `**wizard-ai-generation`**.

### Credits and ops

- **Parse:** no debit from AI credit balance; rate limiting still applies.
- **LLM split / regenerate split:** debit on successful completion per ledger rules; UI shows transparency.
- **Logging:** structured metadata only (ids, codes, duration, size, mime, outcome); never log full manuscript or prompts.
- **Retries:** one client auto-retry with short backoff; manual Retry; no server queue in MVP.

### Authorization

- All operations scoped to **project owner**; RLS on project, storage paths, and parse/split endpoints.

---

## Testing Decisions

- **Behavior-first:** assert visible outcomes—replace file allowed before approve, blocked after; approve alignment transitions state; parse errors surface correct copy; regenerate split debits only on success (mock ledger).
- **Unit-test** pure logic: alignment merge/split transforms if implemented client-side; validation gates.
- **Integration:** happy path upload → parse → propose → approve → handoff payload shape consumed by orchestration (mock downstream).
- **E2E:** optional smoke with mocked AI; align with `PRD_Obra.md` §16 philosophy.

**Modules to prioritize for automated tests:** validation rules, handoff payload schema, alignment state machine transitions.

---

## Out of Scope

- **Chapter-by-chapter loop**, per-chapter chat, bonuses, bumps, index milestone (no index chatbot in MVP), global banner/stepper shell ownership beyond upload-specific copy — see `**wizard-ai-generation`**.
- **OCR** and non-selectable PDF as primary path — post-MVP unless master PRD changes.
- **Exact** credit table per action — master PRD §11 / product research.
- **Implementation paths** for Edge Functions, bucket names, and library versions — architecture docs; behavior stays defined here.

---

## Further Notes

- `**wizard-ai-generation`** remains the **single orchestration spec** for milestones **after** alignment; this PRD must stay aligned on **handoff fields** and **freeze semantics** (approve alignment ≡ confirm index for freeze).
- Update `**PRD_Obra.md` §4** only when platform-wide import rules change; this feature PRD may add detail but not contradict the master PRD.

---

## Frontend Tasks

1. ✅ **Upload screen:** `ManuscriptUploadPanel` — drag-and-drop, validación de formato/tamaño, estado disabled durante procesamiento, errores por código de servidor. El panel se oculta automáticamente tras el upload exitoso (ya no muestra card de "N caracteres extraídos" — esa info llega como toast).
2. ✅ **Auto-start del split proposal:** al completar el upload, `WizardContentPage` muestra un toast de éxito y setea `manuscriptCommitted = true`; `ContentUploadAlignmentPanel` monta con `autoStart={true}` y dispara `invokeAiSplitProposal` automáticamente sin que el usuario tenga que presionar ningún botón. La card idle ("Propuesta de capítulos con IA") está comentada — se puede reactivar en el futuro.
3. ✅ **Persistencia de estado tras refresh:** `WizardContentPage` tiene un `useEffect` que sincroniza `manuscriptCommitted` desde `manuscriptRow` cargado de DB. Si el manuscrito ya existe (extracted_char_count > 0) al cargar la página, el panel de upload se oculta y el de alignment monta con `autoStart` — Claude vuelve a analizar el texto (sin costo de créditos hasta approve).
4. ✅ **Loading / progress:** spinner en `ContentUploadAlignmentPanel` (stage: `generating`) durante la llamada a Claude; botón Retry en el estado de error; no double-submit por guard `uploadHandoffBusy`.
5. ✅ **Alignment UI:** `ContentUploadAlignmentPanel` (stage: `review`) — lista de capítulos con título editable, marcador de texto truncado, warnings de Claude, **Aprobar y continuar** (primario) y **Generar nueva propuesta** (secundario).
6. ✅ **Replace file:** `ManuscriptUploadPanel` muestra el drop zone solo antes de la aprobación (`!manuscriptCommitted`); una vez en `main_chapter` el panel no aparece.
7. ✅ **Post-approval:** `handleAlignmentApproved` en `WizardContentPage` — llama a `approve-alignment`, setea `global_index_frozen_at`, persiste TOC de bonus/bumps, carga chapter drafts y transiciona a `ContentChapterMilestone`.
8. ⚠️ **Accessibility:** `aria-live` en estado generating; labels en inputs de título; falta auditoría completa de focus order en alignment.
9. ✅ **i18n:** todas las strings bajo `wizard.content.splitProposal.*` en ES y pt-BR; `wizard.content.manuscript.*` completo incluyendo `uploadedToast`.

### Archivos implementados

| Archivo | Rol |
|---|---|
| `obra/src/lib/wizard/splitProposalApi.ts` | `invokeAiSplitProposal` + `invokeApproveAlignment` |
| `obra/src/components/wizard/content/ContentUploadAlignmentPanel.tsx` | UI completa: (idle comentado) → generating → review → error; prop `autoStart` |
| `obra/src/pages/WizardContentPage.tsx` | `handleAlignmentApproved`; `manuscriptCommitted` state + useEffect de sincronización desde DB; toast de éxito post-upload |
| `supabase/functions/manuscript-upload-parse/index.ts` | Fix: catch loguea `error_message` + `error_stack`; mammoth recibe `Buffer.from(arrayBuffer)` en vez de `{ arrayBuffer }` |
| `supabase/config.toml` | `verify_jwt = false` para `ai-split-proposal` y `approve-alignment` |

---

## Backend Tasks

1. **Authenticated endpoint(s)** for upload intake: validate MIME and size, store binary in **private** storage, return reference for parse.
2. **Parse service** (no LLM): extract plain text; return structured errors; **no AI credit** debit; structured logging **without** document body.
3. **LLM endpoints** for **initial split** and **regenerate split**; consume ledger on success; rate limits.
4. **Persistence:** alignment record (chapter titles, body text or references, ordering), manuscript storage pointer, timestamps; **RLS** enforced.
5. **State transition** on approve: mark alignment complete and expose handoff to content orchestration consumed by `**wizard-ai-generation`**.
6. **Idempotency** keys for LLM calls where retries occur.

---

## Design Tasks

1. **Visual hierarchy** for upload → loading → alignment: clear steps without implying design changes; Obra tokens per `**CONVENCIONES.md`**.
2. **Empty, loading, error, success** states for file intake and alignment; skeletons for long parse.
3. **Microcopy** ES / pt-BR: errors (password PDF, empty extract, size), replace file, approve alignment, regenerate split, credit hints.
4. **Destructive dialog** copy for post-approval manuscript change (if surfaced from shell) — may align with `**wizard-ai-generation`** dialogs.
5. **Responsive** layout for alignment (stacked vs split) consistent with content phase patterns.

