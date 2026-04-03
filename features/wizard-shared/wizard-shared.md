# PRD — Shared onboarding wizard (pre–content)

**Product:** Obra (obra.app)  
**Feature slug:** `wizard-shared`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` (limits, credits model, locales)  
**Related:** `features/wizard-ai-generation/wizard-ai-generation.md` (global stepper step 2–3; handoff includes **image defaults**); `features/wizard-preview/wizard-preview.md` (global step 3 — preview, image pipeline, export). **Image billing:** `PRD_Obra.md` §6 and **`wizard-preview`** (charge on successful generation; pipeline triggers).

---

## Problem Statement

Creators need a guided, AI-assisted path from “new project” to a coherent infoproduct package (main ebook + bonuses + order bumps) without design or code skills. The **onboarding wizard** (through **design**: palette, typography, page format) must:

- Collect **topic, audience, and problem** in a way that supports AI expansion without overwhelming users.
- Let users define **package structure** (bonus and bump counts and titles, plus **main ebook title** and optional **project-level `author`** on the **same screen** as the main title) with strong AI assistance while preserving **control** (manual edits, selective regeneration). **`author`** is optional; when empty it is omitted from downstream prompts (e.g. cover). **Main ebook chapter count and outline are not defined here** — they belong to the **content phase** (`wizard-ai-generation` for the AI path, or upload alignment for the file path; see `PRD_Obra.md` §4).
- Capture **design** (page geometry, palette, typography) once per project, with **preview matching export**.

**File upload for existing content is not part of this wizard:** the user chooses at project creation whether content will later come from **pure AI** or from an **uploaded file** (`.docx`/`.pdf`), but the **upload step runs only after** the design step, as part of the **content** phase (see `PRD_Obra.md` §4).

Without explicit product rules, teams risk inconsistent UX (e.g. regenerating text users considered “done”), ambiguous state when counts change, or preview diverging from PDF output.

---

## Solution

**Shared onboarding** (this PRD) runs **after** the user creates a project, chooses **`content_locale`**, and selects **content source: IA** or **Upload** (upload happens later). It is the **same path** for both until **design** is complete.

The wizard is a **linear sequence of steps** with:

- **Long-text fields** only: a **“Improve text”** action that expands or refines user input via AI (consumes credits per product rules).
- **Topic** → **Avatar + problem** (single step, two fields) → **Package structure** (multi-phase: bonus/bump counts → main title suggestions → bonus titles step → bump titles step) → **Design** (presets, palette, typography, free-form style notes, page size and orientation, **image defaults**: AI-assisted vs placeholders-first, image style catalog).

**After the last step (Design), the product forks:** **Rama IA** continues to AI-generated content from wizard inputs; **Rama Upload** shows **file upload** and synchronous parse + analysis (see master PRD).

**Package structure rules (resolved):**

- **Out of scope here:** number of **chapters** in the main ebook, chapter titles, and table-of-contents shape — those are defined in the **Contenido** phase (`features/wizard-ai-generation/wizard-ai-generation.md` and upload alignment; see master PRD §4).
- User sets **bonus count** and **bump count** within global product limits (see master PRD).
- AI proposes **five** candidate titles for the **main** ebook; user **selects one** or **types a custom title**.
- Regenerating the batch of five **clears chip selection** and shows a short notice; a **custom title typed in the free field is not cleared** when the batch regenerates.
- **Bonus titles** and **bump titles** are handled in **separate steps** (separate state, not a single combined pool).
- For each bonus/bump row: **regenerate one**, **regenerate all** (only unlocked rows), mix **AI + manual**.
- **Locking:** a row is excluded from **regenerate all** if the user has **explicitly selected** a suggestion **or** the field is **dirty** (edited). Locking is **sticky**: matching the text back to the last suggestion does **not** unlock; only **explicit unlock/deselect** returns the row to the batch pool.
- **Lectura 1 (per lane):** if the user ends with **fewer** confirmed titles than the count initially chosen **for that lane**, the **project’s count for that lane is reduced** to match (no “empty slots” left at the old number).

**Design rules (resolved):**

- **Page size** and **orientation** are the **single source of truth** for **in-app HTML preview** and **PDF export**.
- A **design preset** bundles **60/30/10 palette** and **display + body** font pair. Applying a preset sets both.
- First **manual** change to **any** color or font **unlinks** the preset → state **“Custom”**; optional **restore preset** if offered. **Concrete preset catalog** (names and combinations) is **out of scope of this document** until product/design defines the MVP list (see `PRD_Obra.md` §5).

**Image defaults (resolved):**

- The **Design** step includes an **Images** subsection: **project-level defaults** only — **no AI image generation runs inside this wizard** in MVP (no credit spend for images here).
- **`image_mode`:** **AI-assisted** (default intent: section images will use **coherent AI-generated art** when the product generates them) vs **placeholders-first** (default intent: **reserved slots** for images to be filled by **user upload** or by generation later per pipeline rules). This is a **default**, not a lock: per-section **regenerate / replace / remove** in the editor remains as in `PRD_Obra.md` §6.
- **`image_style`:** one of the product’s **style categories** (aligned with `PRD_Obra.md` §6 — e.g. flat illustration, photography, isometric, minimalist; exact MVP enum is product/design-owned). Style notes (free text in Design) **refine** the chosen style for prompts; if they conflict, product rules should prefer **explicit user text** for tone and **enum** for medium unless UX merges them explicitly.
- **Placeholders-first:** sections that have not yet received an image hold a **layout slot** (no final `image_url`); **no image-generation credits** are consumed for merely holding a slot. Visual treatment of empty slots in HTML/PDF is **editor / preview / conventions** — not fully specified here.
- **Billing (explicit):** **Image credit consumption** is **coupled to preview generation** — exact triggers, batching, idempotency, and in-UI estimates are **TBD** until a dedicated **preview / pipeline** spec exists. **`image_mode` and `image_style` (and palette-linked context)** are **inputs** to that pipeline alongside §6 editor behavior.

**Global journey stepper (whole product):** The UI shows **one** persistent **three-step** stepper for the entire Obra creation journey (same component in the wizard shell, the post-design content phase, and the editor). **Product UI labels (Spanish):** **Estructura** → **Contenido** → **Vista previa**. **English reference:** **Structure** → **Content** → **Preview**.

| Step | User-facing (ES) | What it covers | While in *this* wizard |
|------|------------------|----------------|-------------------------|
| 1 | **Estructura** | Full **shared onboarding** (topic → avatar → package structure → **design**): package titles, bonus/bump scope, **and** design tokens — **not** main-ebook chapter outline | **Current** (in progress until design is complete) |
| 2 | **Contenido** | Text content phase — **AI generation** (`wizard-ai-generation`) or **upload** branch (separate PRD) | **Upcoming** |
| 3 | **Vista previa** | Editor / preview with **chosen** design applied (not re-running the Design wizard step) | **Upcoming** |

The **inner** wizard progress (topic, structure sub-steps, design) remains as today; the **global** stepper sits **above** it and only advances past step 1 when the user **completes** the design step.

---

## User Stories

### Entry and context

1. As a subscribed user, I want to start the **shared onboarding wizard** only after I have chosen **`content_locale`** for the project, so that all generated copy follows one output language.
2. As a user, I want to see **clear step progress** in the wizard, so that I know how far I am and can go back without losing understood rules.
3. As a user, I want **keyboard-accessible** navigation (next/back, focus traps in modals), so that I can complete the wizard without a mouse (baseline WCAG alignment with master PRD).

### Global journey (stepper)

4. As a user, I want to see **where I am** in the **overall journey** — **Estructura → Contenido → Vista previa** — so that I know this wizard covers **package definition and design**, not the **main ebook chapter breakdown** (that comes in **Contenido**).
5. As a user, I want the **same global stepper** (labels and component) as in **content** and **preview** phases, so that orientation stays **consistent** across the whole flow.

### Topic

6. As a user, I want to describe the **topic / niche** of my infoproduct in free text, so that the AI can ground the rest of the project.
7. As a user, I want **“Improve text”** on the topic field, so that rough notes become clearer copy without rewriting from scratch.
8. As a user, I want validation that prevents **empty or useless** input (minimum length or similar), so that I do not waste credits on noise.

### Avatar + problem (single step)

9. As a user, I want to describe my **ideal customer** in one field, so that tone and positioning stay consistent.
10. As a user, I want to describe the **problem solved** in a separate field, so that promise and pain are explicit for downstream generation.
11. As a user, I want **“Improve text”** on both fields, so that I can iterate quickly without merging two concerns into one box.

### Package structure — counts and main title

12. As a user, I want to set how many **bonuses** and **order bumps** my package has (within allowed maxima), so that the generator knows scope before titles (**main ebook chapters are not chosen in this step**).
13. As a user, I want the AI to propose **five titles** for the **main** ebook, so that I can pick a direction fast.
14. As a user, I want to **choose one** of the five **or** write my **own main title**, so that I stay in control of branding.
15. As a user, I want to **regenerate the set of five** suggestions, so that I can see alternatives; I accept that **my chip selection clears** and I must pick again, while **my custom title field is preserved** if I used it.
16. As a user, I want a short **explanation message** after regenerating the five, so that I am not surprised that selection reset.
17. As a user, I want an optional **author** field (single field for the whole project) **on the same step** as the **main ebook title**, so that cover and credits can use it when I choose to fill it.

### Package structure — bonus titles (dedicated step)

18. As a user, I want **AI-suggested titles for each bonus** based on the chosen main title, so that the package feels coherent.
19. As a user, I want to **regenerate a single bonus title**, so that I can fix one row without touching others.
20. As a user, I want **“Regenerate all”** for bonus titles, so that I can refresh many at once **except** rows I locked by selecting or editing.
21. As a user, I want **manual typing** to count as **protected** from batch regeneration, so that my edits are not wiped accidentally.
22. As a user, I want to **unlock** a row explicitly if I want it to participate in **regenerate all** again, so that sticky lock is not permanent by mistake.
23. As a user, if I end up with **fewer** bonus deliverables than I first chose, I want the **project bonus count** to **shrink** to match what I actually kept, so that the project does not show phantom slots.

### Package structure — bump titles (dedicated step)

24. As a user, I want the **same behaviors as bonuses** for **order bump** titles (individual regenerate, regenerate all with locks, manual protection, unlock, count reduction), so that mental models stay consistent across lanes.

### Design

25. As a user, I want to choose **page size** (e.g. A4 / Letter) and **orientation** (portrait / landscape), so that my PDF matches my expectations.
26. As a user, I want the **preview** in the app to match **exported PDF** for those choices, so that I do not get layout surprises.
27. As a user, I want to pick a **design preset** that sets **palette and fonts** together, so that I get a cohesive look quickly.
28. As a user, I want **manual control** of colors and fonts after a preset, and I understand the preset link breaks → **Custom**, so that I can fine-tune without hidden coupling.
29. As a user, I want a **free-text field** for visual style notes (plus optional chips/presets where applicable), so that I can steer illustration vs photo, mood, etc., aligned with image generation later.
30. As a user, I want **“Improve text”** only where there is **long text**, not on purely structural controls (counts, toggles, color pickers, image mode), so that buttons always match the field type.

### Design — image defaults

31. As a user, I want to choose a **default image path** — **AI-assisted** (coherent generated images when the pipeline creates them) or **placeholders-first** (slots intended for **my own uploads** unless I change behavior in the editor) — so that the product matches my workflow and expectations.
32. As a user, I want to pick an **image style** from the product catalog that **fits my palette and topic**, so that downstream images stay on-brand; I understand this does **not** generate images in this step.

### Credits and errors

33. As a user, I want **clear loading and error states** when AI runs, so that I know whether to retry or fix input.
34. As a user, I want **credits** to be charged only per product rules (success paths, no charge on failed operations), so that I trust billing (see master PRD). **Image generation credits** apply when images are successfully generated in **Preview** (`features/wizard-preview/wizard-preview.md`); this wizard does not charge for images.

### Post-wizard (handoff)

35. As a user, after finishing the **design** step, I want either **AI content generation** or **file upload** (depending on my earlier choice), with **package titles, counts, design system, and image defaults (`image_mode`, `image_style`)** already applied, so that I can define **main ebook chapters** and body content in the **Contenido** phase toward export.

---

## Implementation Decisions

### Global journey stepper (shared with `wizard-ai-generation`)

- **Single** three-step component and **canonical labels** are defined **here** and reused in **content** and **preview** surfaces (see `features/wizard-ai-generation/wizard-ai-generation.md`).
- **Step 1 — Estructura / Structure:** **active** for the entire `wizard-shared` flow until **design** is completed; includes topic, **package structure** (not main-ebook chapters), and **design** (palette, typography, page format, **image defaults**).
- **Step 2 — Contenido / Content:** not started during this wizard; shown as **upcoming**.
- **Step 3 — Vista previa / Preview:** **upcoming** until the content phase is complete and the user enters editor/preview.
- **Inner** wizard stepper (per-topic, structure, design micro-steps) is **in addition to** the global stepper, not a replacement.

### Wizard orchestration

- A **wizard state machine** (or equivalent) owns **current step**, **partial answers**, and **validation gates** before advancing.
- **Persistence:** draft project and wizard progress saved to the backend so refresh or short disconnect does not lose work (exact strategy: autosave interval and conflict rules — align with existing project API patterns).

### Steps and components (logical modules)

- **Topic module:** single long-text value + improve action + validation.
- **AvatarProblem module:** two fields in one step; independent improve actions.
- **Package structure module** (composite):
  - **Counts** submodule: bonus count, bump count only; enforce caps from master PRD. **Does not** collect main ebook chapter count.
  - **Main titles** submodule: fetch five suggestions, selection model, custom title field, optional **`author`** (project-level, same screen), batch regenerate with **selection reset** behavior and **preserve custom field**.
  - **Bonus titles** submodule: list of rows with per-row state `{ value, source, lockedByUser | dirty | explicitSelect, unlockedForBatch }` (exact shape is an implementation detail; behavior is specified in Solution).
  - **Bump titles** submodule: same as bonuses, separate state.
- **Design module:** preset catalog loaded from configuration; page size + orientation; palette and font controls; “custom” vs “based on preset” state; free-text style notes; **Images** subsection — `image_mode` (AI-assisted vs placeholders-first), `image_style` (enum aligned with `PRD_Obra.md` §6); **no** image-generation API calls in this step for MVP.

### APIs / contracts (conceptual)

- **Improve text:** input `{ fieldId, locale, currentText }` → output `{ improvedText }` with credit accounting on success.
- **Suggest main titles (5):** input `{ topic, avatar, problem, content_locale }` → `{ candidates[5] }`.
- **Regenerate main batch:** same contract; **must not** clear server-side custom title if client sends “user override” flag.
- **Suggest bonus titles:** input includes **confirmed main title**, counts, prior context.
- **Suggest bump titles:** same pattern, **separate** call/step from bonuses.
- **Regenerate one / regenerate all (bonuses or bumps):** inputs must include **row locks** so the server does not overwrite protected rows (or regeneration is fully client-side with server only providing new suggestions for unlocked indices — choose one consistent pattern and test).

### Data model alignment

- Project stores **final** counts for bonuses/bumps after package structure steps complete; optional **`author`** (nullable string) when the user fills it.
- Project stores **design system** fields: colors, fonts, page size, orientation, preset id (if any), custom flag, style notes; **`image_mode`**, **`image_style`** (and optional **style-notes override** semantics for prompts — align with preview pipeline when specified).
- Titles for main, each bonus, each bump stored on the relevant **ebook** entities per master schema.
- **Main ebook chapter list / count** is persisted when the user completes the relevant milestones in **`wizard-ai-generation`** (AI path) or **upload alignment** (file path), not at the end of `wizard-shared`.

### Deep modules

- **`TitleRowList` behavior** (bonus/bump): centralize lock/unlock, dirty tracking, regenerate-all filtering, and accessibility labels in one module to avoid divergent bugs between the two steps.

---

## Testing Decisions

- **Behavior-first tests:** assert **user-visible outcomes** (after regenerate five, no chip selected; custom title preserved; regenerate all skips locked rows), not internal state variable names.
- **Priority modules for automated tests:** structure **lock/dirty/unlock** logic; **count reduction** when fewer titles confirmed than initial count; **preset → custom** transition on first manual color/font change.
- **E2E (Playwright, model B):** optional smoke path: open wizard → fill topic → advance → structure main titles → one design selection — aligned with master PRD testing philosophy.

---

## Frontend Tasks

1. Implement **wizard shell**: **global three-step journey stepper** (**Estructura** = current, **Contenido** & **Vista previa** = upcoming) per Implementation Decisions, plus **inner** progress indicator for wizard micro-steps, next/back, validation summaries, responsive layout per design system.
2. Build **Topic** step with long-text field and **Improve text** (loading, error, disabled while pending).
3. Build **Avatar + problem** step (two fields, each with **Improve text**).
4. Build **Package structure — counts** UI (sliders/inputs within max bonus/bump limits; clear labels; **no** main-ebook chapter count).
5. Build **Package structure — main titles**: display five suggestions (chips/cards), custom input, optional **author** field (project-level), **Regenerate five** with **selection reset** + **copy**; ensure custom field **not** cleared on batch regenerate.
6. Build **Package structure — bonus titles** step: list UI, per-row regenerate, **Regenerate all** respecting locks, **unlock** control, dirty/selected semantics, empty states.
7. Build **Package structure — bump titles** step reusing the same patterns as bonuses with **separate** state.
8. Build **Design** step: page size + orientation; preset picker; palette + font controls; sync **custom** state when user edits; optional **restore preset**; long-text style notes + **Improve text** where applicable; **Images** subsection — `image_mode` + `image_style` with helper copy that **image billing** occurs when images are generated in **Preview** (`features/wizard-preview/wizard-preview.md`), not this screen.
9. Wire **preview** dimensions to **page size and orientation** so preview matches export contract.
10. Integrate **credit-aware** UI (disable or gate actions when no credits — aligns with global degraded mode; wizard-specific copy may reference master rules).
11. **Accessibility:** labels, `aria-live` for AI replacements, focus management on step change and dialogs.

---

## Backend Tasks

1. **Edge functions** (or equivalent) for: improve-text, suggest-five-main-titles, suggest-bonus-titles, suggest-bump-titles, per-row regeneration endpoints if server-driven. **Parse-document** is **not** invoked during this wizard; it runs in the **post-design upload** flow when the user chose the upload path.
2. **Credit ledger:** record consumption per successful AI operation; **no charge** on failure (master PRD).
3. **Persistence APIs** for saving **draft wizard state** (including **`image_mode`**, **`image_style`**) and transitioning to **editor-ready** project when wizard completes.
4. **Validation:** enforce **max bonuses/bumps**, **`content_locale`** on project, and **final counts** after structure completion.
5. **Idempotency / rate limiting** on AI endpoints per authenticated user (master PRD).
6. **Configuration endpoint or static config** for **design presets** once the catalog exists (until then, stub or empty list with feature flag).

---

## Design Tasks

1. **Global journey stepper** spec: placement (e.g. below app header), **Estructura / Contenido / Vista previa** labels for ES UI (and pt-BR equivalents), completed vs current vs upcoming states; must align with the same component used post-wizard (`wizard-ai-generation`).
2. **Visual design** for all wizard steps: spacing, typography, mobile/desktop, alignment with Obra tokens (see `CONVENCIONES.md`).
3. **Preset catalog (MVP):** define **named presets** with **palette + font pairs**; deliver **spec sheet** for engineering (blocked until product signs off — see `PRD_Obra.md` §5).
4. **Microcopy** ES / pt-BR: global stepper labels, step titles, helper text for **main batch regenerate**, **lock/unlock**, **regenerate all** when everything locked, **custom vs preset** state.
5. **Empty, loading, and error** states for AI actions; **skeleton** patterns for slow responses.
6. **Iconography** for lock/unlock, preset vs custom, and step progress.
7. **Design — Images** subsection: ES / pt-BR helper copy for **AI-assisted vs placeholders-first**, **image style** picker, and **no credits on this screen** (credits when images generate in Preview — `features/wizard-preview/wizard-preview.md`; aligned with `PRD_Obra.md` §6).

---

## Out of Scope

- **Post-design content upload** (`.docx`/`.pdf`), parse, alignment to Obra chapter/index format, and merge into the content milestone flow — detailed in **`PRD_Obra.md` §4** and cross-linked specs; this document ends at **design complete**; handoff contract: **package** structure (titles, bonus/bump counts) + design system + **`image_mode` / `image_style`** + `content_locale` + chosen branch (IA vs upload next). **Main ebook chapters** are **not** part of this handoff.
- **Preview / export** after Content (global step 3): **`features/wizard-preview/wizard-preview.md`** — not specified in this document beyond **design tokens**, **image defaults**, and **structure** handed off.
- **Preview image pipeline** (when credits are charged, queue on open, slot contracts): canonical spec **`features/wizard-preview/wizard-preview.md`**; **`image_mode` + `image_style`** are inputs — see also **`PRD_Obra.md` §6**.
- **Concrete preset list** and **exact credit table** per AI action (owned by master PRD / product research).
- **Mercado Pago**, **email verification**, and **subscription gating** — covered at journey level in master PRD, not implemented detail here.
- **Landing page** blocks and Shopify liquid — post-MVP.

---

## Further Notes

- **Feature slug `wizard-shared`** matches the folder name: shared onboarding through **design** for both IA-first and upload-first content paths.
- Architecture docs may list legacy four-step names (`StepTopic`, `StepAvatar`, `StepStructure`, `StepDesign`); this PRD implies **Structure** is **multi-phase** and **Avatar+Problem** share one step — update implementation plans accordingly.
- Align **terminology** in UI: “Improve text” vs internal “optimize” labels for consistency with `AiAssistField` patterns.
- If **batch regenerate** is implemented **client-side** by calling single-row generators in parallel, ensure **locked rows** are never sent for overwrite; document race conditions and loading UX.
