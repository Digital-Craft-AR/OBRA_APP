# PRD — Wizard AI generation (post–design branch)

**Product:** Obra (obra.app)  
**Feature slug:** `wizard-ai-generation`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` (limits, credits model, locales, accessibility)  
**Related:** `features/wizard-shared/wizard-shared.md` (handoff into this flow; **canonical spec** for the **global three-step journey stepper**; **`image_mode` / `image_style`** defaults; optional **`author`**); `features/wizard-upload/wizard-upload.md` (**upload** branch: file intake → parse → alignment **until** handoff here); `features/wizard-preview/wizard-preview.md` (global step 3 — after Content: layouts, images, cover, PDF/ZIP). **Image billing:** `PRD_Obra.md` §6 — coupled to successful generation in **Preview** (`wizard-preview`).

---

## Problem Statement

After the shared onboarding wizard completes **design**, creators need a controlled way to turn **fixed wizard outputs** (package titles, bonus/bump counts, design system, `content_locale`) into full **draft content** for the main ebook, bonuses, and order bumps—without the AI silently changing what they already approved. **Main ebook chapter count and outline are defined in this content phase** (not in `wizard-shared`). The **AI path** proposes and confirms chapters via the **index** milestone; the **upload path** derives chapters from the file and user **alignment**, then **joins the same milestone sequence** with prefill for the main ebook body before bonuses and bumps.

Without explicit milestone-based UX, teams risk: one-shot generation that ignores user intent, unclear approval state, expensive rework, or chapter edits that cascade into unwanted bulk rewrites.

---

## Solution

**Wizard AI generation** is the **canonical milestone flow** for **step 2 — Contenido** after design: **index (main ebook TOC) → main ebook chapters → bonuses → order bumps**. It applies to **both** content sources:

- **AI path:** the user has not uploaded a manuscript; the **first milestone** establishes **main ebook chapter boundaries** (table of contents) using wizard context (topic, avatar, problem, **main title**, design), then chapter bodies are generated **within** those boundaries.
- **Upload path:** the user uploads a **single** main ebook file (`.docx`/`.pdf`); parse + IA processing produce a proposed **index and chapter split** aligned to Obra format; the user **approves** (or edits) that alignment, then continues **in the same flow** with **prefilled** chapter text; **bonuses and bumps** are still generated in this flow after the main ebook, using wizard-defined titles and counts.

**Wizard-defined package and design are fixed** for the pipeline: **bonus/bump counts and titles**, palette, typography, **page format**, and **`image_mode` / `image_style`** (from the Design step — see `wizard-shared`) do not change here without explicit product rules elsewhere. **Chapter structure for the main ebook** is **not** inherited from `wizard-shared` — it is **created or imported** in this phase as above.

**Handoff — image defaults:** `wizard-shared` persists **`image_mode`** (AI-assisted vs placeholders-first) and **`image_style`** as **inputs** to **Content** and to **Preview** (per `PRD_Obra.md` §6 and `features/wizard-preview/wizard-preview.md`). **Image-generation credits** apply on **successful** image generation in Preview, not in this flow. This **content** milestone flow remains **text-first**; it does **not** require generating images.

**Content-only vs preview (next step):** This flow **only** produces and refines **draft text** (index, chapters, bonuses, bumps). It does **not** show the **full layout-accurate preview** (layouts, slots, PDF) — that is **global step 3** (`features/wizard-preview/wizard-preview.md`). After the user completes this flow’s milestones (or per handoff rules), the **next step** is **Vista previa** where they see **JSON rendered through templates** with design applied; **long-form text edits** for MVP remain in **Contenido** (general **Edit content** navigation). Align routing with `PRD_Obra.md` §4. The UI should **say so explicitly** (banner and/or stepper) so users do not expect final PDF layout while writing chapters here.

**Global journey stepper:** The **same** three-step component defined in **`wizard-shared`** appears here. **Product UI labels (Spanish):** **Estructura** → **Contenido** → **Vista previa**. **English reference:** **Structure** → **Content** → **Preview**.

| Step | User-facing (ES) | Status in *this* flow |
|------|------------------|------------------------|
| 1 | **Estructura** | **Completed** (wizard finished: **package** + **design** — not main-ebook chapters) |
| 2 | **Contenido** | **Current** (chapter TOC + main body + bonuses + bumps per milestones below) |
| 3 | **Vista previa** | **Upcoming** until content milestones are done and the user enters editor/preview |

Step 3 **Vista previa** means **seeing** the product with **design tokens already applied** — not repeating the wizard’s **Design** step.

**Dismissible notice (recommended):** A **dismissible** **alert/banner** at the top of this flow (first visit or first time per project) stating that **only content** is being produced here and **preview comes next**. **Dismiss** persists (e.g. local storage or user preference) so returning users are not nagged; optional **“Don’t show again”** or reset per new project — product decision. This is complementary to the stepper (stepper = position; banner = one-line expectation).

**Phases (strict order):**

1. **Table of contents (index) — main ebook chapter definition**  
   - **AI path:** AI proposes a **table of contents** that **defines** chapter count and titles (within product limits — see master PRD); the user edits manually or uses a **dedicated index chat** to request another AI pass. The user **confirms** the index before continuing — this is the **lock-in** for main ebook structure.  
   - **Upload path:** After parse + IA, the user **aligns** the extracted material to Obra’s **index + chapters** (edit titles, merge/split sections as needed) and **approves**; persisted chapter count reflects the **aligned** outline (may differ from the raw section count of the file). **Then** the same **index freeze** rules apply as the AI path.
2. **Main ebook** — **Chapter by chapter**: for each chapter, the user edits manually or uses a **chapter-scoped chat** to request AI changes (**AI path:** generation/refinement; **upload path:** refinement of prefill). The user **approves** the chapter before moving on. The UI allows **returning to earlier chapters** to keep editing.
3. **Bonuses** — Same pattern (**per-bonus chat**, manual edit, approve); **skipped** if the project has **zero** bonuses.
4. **Order bumps** — Same pattern (**per-bump chat**); **skipped** if **zero** bumps.

**Upload branch — preamble (ordering and rules):** upload → parse (no LLM) → IA split proposal → **alignment** → **Approve alignment** → **this** flow’s chapter loop with prefill. **Canonical spec:** **`features/wizard-upload/wizard-upload.md`**. Master **file** rules: **`PRD_Obra.md` §4**.

**Upload — weak prefill (MVP, decision C2)** applies **after** handoff, in the **chapter loop** below: if a **prefilled chapter** body is below a **minimum length threshold**, show a **non-blocking** warning and optional **expand with IA**; if **every** chapter is below the threshold, **blocking** dialog — see Implementation **Upload weak prefill**.

**Index freeze:** After the user leaves the index / alignment milestone for the first chapter (AI path: after **Confirm index**; upload path: after **Approve alignment**), the index is **frozen**. Reopening or editing the index uses an **explicit flow**; if the index changes, the product shows a **confirmation** asking whether **affected chapter(s)** should be updated (MVP: user-driven; no automatic bulk rewrite of all downstream content).

**Coherence:** Editing an **earlier** chapter does **not** auto-invalidate later chapters. A **soft, non-blocking notice** may suggest reviewing coherence when the user edits upstream content.

**Credits:** **LLM-backed** actions consume credits per global product rules. **Parse** (no LLM) on the upload branch is specified in **`wizard-upload`**. The UI exposes **transparency** about credits consumed by recent actions (no MVP requirement for spend **forecasting** or anxiety-reduction copy beyond factual usage).

**Persistence:** **Autosave** per artifact (chapter, bonus, bump, index while in that phase) with **retry** on failure; detailed **idempotency / no double-charge on failed calls** follows backend billing rules (see master PRD).

---

## User Stories

### Preconditions and handoff

1. As a creator, I want the **content phase** to start only after **shared wizard + design** is complete, so that **package titles**, **bonus/bump scope**, **design**, and **image defaults** are already set.
2. As a creator, I want **bonus/bump counts, package titles, design, and image defaults (`image_mode`, `image_style`)** from the wizard to remain **unchanged by default** during this flow, so that my approved package is not silently renegotiated (**main ebook chapter outline is defined here**, not in the wizard).
3. As a creator, I want the system to use **content_locale** and all wizard context consistently, so that output language and positioning match.
4. As a creator, I want to **see where I am** in the overall journey (**Estructura → Contenido → Vista previa**), so that I know this phase is **writing content**, not **layout preview**.
5. As a creator, I want a **short, dismissible notice** that **Vista previa** comes **after** this flow, so that I do not expect a styled ebook preview while editing chapters here.

### Upload path (handoff into the same milestones)

Upload-specific stories **before** alignment (file, parse, alignment, replace file) live in **`features/wizard-upload/wizard-upload.md`**. Stories here cover **after** handoff:

6. As a creator, after **alignment** I want **chapter text prefilled** from my file and the **same approve-per-chapter** pattern as the AI path, so that behavior stays consistent.
7. As a creator, I want **bonuses and order bumps** generated **after** the main ebook in this flow (not in the wizard), using the **titles and counts** I already chose.
8. As a creator on the **upload** branch, when **prefilled** chapter text is **very short or empty**, I want a **non-blocking** warning and optional **AI expand** (credits), but I still want to **approve** if I choose; if **all** chapters are effectively empty, I want a **strong** prompt to fix **alignment** or **file** before moving on.

### Index milestone

9. As a creator, I want the AI to generate a **table of contents / index** for the **main ebook** that fits my topic and wizard package (**main title**, avatar, problem), so that I **confirm** chapter boundaries before writing bodies (**chapter count is not fixed in the shared wizard**).
10. As a creator, I want to **edit the index manually** in the editor, so that I can fix wording without calling the AI.
11. As a creator, I want a **chat thread scoped to the index** (AI path), so that I can describe changes and ask the AI for **another pass** on the index only.
12. As a creator, I want the **“Confirm index”** (or equivalent) action to be **explicit**, so that I do not drift into chapter generation by accident.
13. As a creator, after I confirm the index, I want the index to be **frozen** until I use a clear **“Edit index”** (or reopen) action, so that I do not accidentally change the outline while writing chapters.
14. As a creator, when I **reopen and change** the index, I want a **confirmation** that asks whether **specific chapter(s)** need updating to match, so that I control what gets regenerated.
15. As a creator, I want **loading and error states** during index generation, so that I know when to retry or adjust input.

### Main ebook — chapter loop

16. As a creator, I want the main ebook to be produced **one chapter at a time** in order, so that I can focus and approve incrementally.
17. As a creator, I want to **edit chapter text manually** before approval, so that I can fix details without AI.
18. As a creator, I want a **chat thread per chapter**, so that feedback applies only to that chapter’s AI passes.
19. As a creator, I want to **approve** a chapter before advancing to the next, so that I explicitly accept each unit of work.
20. As a creator, I want to **navigate back** to a **previous chapter** and continue editing or chatting, so that I can improve earlier content without losing later work.
21. As a creator, I want **editing an earlier chapter not to auto-rewrite** later chapters, so that I keep predictable scope.
22. As a creator, I want a **soft notice** when upstream edits might affect narrative coherence, so that I am nudged to review downstream content without forced regeneration.
23. As a creator, I want **autosave** of chapter drafts, so that refresh or brief disconnect does not lose work.
24. As a creator, I want **retry** after a failed AI call, so that I can complete the chapter without starting from scratch.

### Bonuses

25. As a creator, I want **bonus** content to follow **after** the main ebook is complete, so that order matches my mental model (book → bonuses → bumps).
26. As a creator, I want **one chat thread per bonus**, so that instructions do not leak into other bonuses.
27. As a creator, I want the same **manual edit + approve** pattern as chapters where applicable, so that interaction stays consistent.
28. As a creator, if my project has **zero bonuses**, I want the flow to **skip** bonus generation entirely, so that I do not see empty steps.

### Order bumps

29. As a creator, I want **order bump** content to run **after** bonuses (or after the ebook if there are no bonuses), so that the sequence stays **main → bonuses → bumps**.
30. As a creator, I want **one chat thread per bump**, so that messaging stays isolated per bump.
31. As a creator, if my project has **zero bumps**, I want the flow to **skip** bump generation entirely.

### Credits and transparency

32. As a creator, I want **credits charged per API call** according to product rules, so that billing matches actual backend usage.
33. As a creator, I want to **see what credits were consumed** by recent actions, so that I can reconcile usage with my balance.

### Accessibility and quality

34. As a creator, I want the **index and chapter flows** to meet the same **baseline accessibility** expectations as the wizard (labels, keyboard, focus, non-color-only errors), **aligned with** `PRD_Obra.md` §4.

---

## Implementation Decisions

### Orchestration and state

- A **milestone orchestration state machine** (or equivalent) owns **current milestone** (index → chapter *n* → bonus *m* → bump *k*), **per-artifact draft content**, and **approval flags** required to advance.
- **Wizard inputs** are **read-only** for **package** structure (bonus/bump counts and titles, main title), **design**, and **`image_mode` / `image_style`** in this phase. **Main ebook chapter definitions** (TOC) are **created in this flow**: persisted when the user **confirms index** (AI path) or **approves alignment** (upload path). Persistence layers must store **references** to frozen wizard data for package/design/image defaults rather than re-deriving mutable copies that drift.

### Index freeze and reopen

- **Freeze** transitions to **true** when the user **confirms** the index (AI path) or **approves alignment** (upload path) and enters the first chapter milestone.
- **Reopen index** is a **distinct user action** that transitions freeze → false for index editing, then re-freezes on confirm or cancel according to product rules.
- On **index change after chapters exist**, show a **confirmation** asking which **chapter(s)** need an AI update (or manual follow-up); no automatic cascade of regeneration.

### Upload branch (before chapter loop)

- **Replace file**, parse, LLM split, alignment UI, credits (parse vs LLM), storage, logging, retries: **`features/wizard-upload/wizard-upload.md`**.

### Upload weak prefill (MVP — C2)

- Per chapter below **min body length** (config): **inline/banner warning**, optional **expand with IA**; **Approve** stays enabled.
- **All chapters** below threshold after load: **modal** blocks progression until user resolves via **reopen alignment**, **regenerate split**, or **new file** (subject to file-replacement rules).

### Chat model

- **Separate chat threads:** one for **index** (AI path), one for **each chapter**, one for **each bonus**, one for **each bump**. **Upload alignment** (before handoff) is specified in **`wizard-upload`** — no global project chat for this MVP scope.
- Each chat invokes backend **generation** with **scoped context** (artifact id + frozen wizard + relevant prior art as needed by prompts).

### Persistence and failure

- **Autosave** drafts for each artifact on a defined cadence or on-change debounce; align with existing project persistence patterns.
- **Failed API calls:** retry UX; **billing idempotency** for failed calls is defined at the **backend credit ledger** layer (not duplicated in this document).

### Credits and observability

- **Expose** credit consumption per completed action or per API call in the UI, **without** implementing spend forecasting or “estimated cost before send” in MVP.

### Journey UI (stepper + notice)

- **Global stepper:** reuse the **same** component and labels as **`wizard-shared`** (**Estructura** → **Contenido** → **Vista previa**). In this flow: step 1 **complete**, step 2 **current**, step 3 **upcoming**.
- **Dismissible banner:** clarifies **text-only** work here; **Vista previa** is **next**. Persist dismiss flag (implementation choice: `localStorage`, profile flag, or per-project).

### Deep modules (preferred)

- **Content orchestration service** — hides state transitions, milestone order, skip logic for zero bonuses/bumps, and “freeze index” rules; exposes a narrow API to the UI (e.g. current step, allowed actions).
- **Artifact-scoped chat + generation adapter** — hides provider/model details; callers pass **artifact id** and **intent** (e.g. regenerate with user message).
- **Credit usage presenter** — maps ledger events to **human-readable** lines in the UI.

### Integration with later phases

- **HTML generation**, **images** (per §6 master PRD), and **PDF export** may follow this PRD’s content milestones; exact boundaries for “when HTML first appears” are **aligned with** editor and export PRDs (see §4 master PRD after content draft exists).
- **Image credits:** **Billing** for image generation follows **`features/wizard-preview/wizard-preview.md`** and **`PRD_Obra.md` §6** (charge on successful persist). **`image_mode` and `image_style` from `wizard-shared`** are **pipeline inputs** alongside slot actions in Preview (regenerate / replace / remove).

---

## Testing Decisions

- **Behavior-first tests:** assert **state transitions** (confirm index → freeze; approve chapter → next; skip zero bonuses/bumps) and **visibility** of credit usage, not internal prompt strings.
- **Modules to test:** orchestration **pure logic** (state machine) where possible; **integration** tests for “confirm index → generate chapter 1 → back to chapter 1 edit → no auto-change to chapter 2” if the stack supports it.
- **Prior art:** follow existing E2E philosophy in `PRD_Obra.md` §16 (few stable Playwright specs; mock AI where needed).

---

## Frontend Tasks

1. **Flow shell** for the post-design **content** phase (**AI and upload** paths): **global stepper** (step 1 complete, 2 current, 3 upcoming) matching `wizard-shared`, plus optional **dismissible banner**; **inner** milestone header (index/alignment → main ebook → bonuses → bumps), **skip** empty bonus/bump lanes, clear **current artifact** (chapter index, bonus index, bump index).
2. **Index milestone (AI path):** editor surface for table of contents; **artifact-scoped chat** for index; **Confirm index** primary action; **Edit index** / reopen when frozen; **confirmation dialog** when index changes after chapters exist (which chapters to refresh). **Upload path** alignment UI **before** handoff: **`features/wizard-upload/wizard-upload.md`** (Frontend Tasks there).
3. **Chapter loop:** one **main ebook chapter** at a time; rich text or long-text editor per product choice; **per-chapter chat**; **Approve chapter** to advance; **navigate back** to prior chapters without losing later drafts; **soft coherence notice** when editing upstream. **Upload path:** **weak-prefill** warnings (C2) and **all-empty** blocking modal per Implementation Decisions.
4. **Bonus and bump milestones:** same pattern as chapters (editor + per-artifact chat + approve); **skip** UI when count is zero.
5. **Autosave** UX: debounced save indicators, **dirty** state, **retry** on failed save; disable **double-submit** on AI actions while pending.
6. **Credit transparency:** surface **recent API credit usage** (per call or per action) aligned with backend events; no spend forecasting in MVP.
7. **Loading / error / empty** states for every generation and chat action; **aria-live** for AI results; keyboard **focus** order across editor, chat, and primary actions.
8. **Integration** with routing after shared wizard: for **both** **AI** and **upload** content sources; **upload** enters after file processing + alignment; handoff to **editor** when this flow’s milestones are complete (or per product cut line).

---

## Backend Tasks

1. **Persistence** for milestone state: current milestone, index draft, frozen flag, per-chapter draft **and** approval status, per-bonus and per-bump drafts; **read-only** references to frozen **wizard package + design**; **main ebook chapter list** stored as part of index/alignment completion.
2. **APIs** for: generate index; regenerate index from chat; **confirm** index (transition); **reopen** index; on index change, optional **queue** chapter refresh jobs per user selection. **Upload path** (parse, split, persist alignment, storage): **`features/wizard-upload/wizard-upload.md`** (Backend Tasks there).
3. **APIs** for: generate chapter *n*; chat-driven **regenerate** chapter *n*; **approve** chapter; list/navigate artifacts without losing ordering.
4. **APIs** for bonuses and bumps mirroring chapter semantics (scoped context, **skip** when count zero).
5. **Chat threads** stored **per artifact** (index, chapter, bonus, bump) with message history; each **invoke** calls the AI with **scoped context** + `content_locale` + frozen wizard payload.
6. **Credit ledger:** record consumption **per successful API call**; **no charge** on failure; **idempotency** keys for retries (align with master PRD).
7. **Authorization:** all operations scoped to **project owner** + **RLS**; validate **bonus/bump** artifact indices against **wizard** counts; validate **main ebook chapters** against the **confirmed index** / chapter list from this flow (not from `wizard-shared`).
8. **Rate limiting** on generation endpoints per user/project.
9. **Optional:** persist **“banner dismissed”** per user or per project if stored server-side; otherwise client-only storage is enough for MVP.
10. **Upload** ingestion and parse (pre-handoff): see **`wizard-upload`** Backend Tasks.

---

## Design Tasks

1. **Global stepper** (same as `wizard-shared`): step 3 labeled **Vista previa** in ES UI; **do not** imply the user **chooses design again** — design was set in **Estructura**. Pair with **dismissible alert** styling (info, not error).
2. **Layout** for split or stacked **editor + chat** (desktop and mobile); **sticky** inner milestone progress and primary actions (Confirm, Approve).
3. **Visual hierarchy** for index vs chapter vs bonus vs bump: step labels, **Obra tokens** (`CONVENCIONES.md`), no gradient.
4. **Chat panel** patterns: message list, **user vs assistant**, loading state, **error** inline; **empty** state before first message.
5. **Dialogs** for **edit index** when frozen, **confirm chapter updates** after index change, and **destructive** or **irreversible** actions if any.
6. **Microcopy** ES / pt-BR: stepper + banner (content vs preview), confirm index, approve chapter, edit index, coherence notice, credit usage labels, **retry** / **save failed**.
7. **States** for frozen index (read-only affordance), **approved** chapter (still editable when navigated back), and **generating** (skeleton or spinner without blocking entire page if possible).

---

## Out of Scope

- **Upload branch** product behavior from file pick through **approve alignment** — **`features/wizard-upload/wizard-upload.md`** (this document picks up **after** handoff for milestones shared with the AI path).
- **Automatic invalidation** of downstream chapters when upstream edits change.
- **Spend forecasting**, “soft caps” messaging, or proactive cost anxiety reduction beyond **factual** credit usage display.
- **Global** project chat merging index + all chapters.
- **OCR** or non-selectable PDF handling — upload branch only, per master PRD.
- **Changing** `content_locale` or **wizard package** fields (bonus/bump counts, package titles) **inside** this flow (forbidden per master PRD).

---

## Further Notes

- **Order** is always **main ebook → bonuses → order bumps**, skipping empty lanes.
- **Images:** **per-slot** behavior in **Preview** is canonical in **`features/wizard-preview/wizard-preview.md`** and `PRD_Obra.md` §6. **Wizard-level defaults** (`image_mode`, `image_style`) are specified in **`wizard-shared`**. This PRD focuses on **text milestones**; do **not** duplicate §6 or **`wizard-preview`** here.
- **Global journey stepper** labels and behavior are **owned** by `wizard-shared`; update this document when that spec changes.
- This document should stay **synchronized** with `PRD_Obra.md` §4 when the high-level flow diagram changes.
