# PRD — Obra (obra.app)

**Product:** obra.app  
**Version:** 1.0  
**Date:** March 2026  
**Status:** Aligned with repository documentation (`features/`, `ARQUITECTURA_Obra.md`, `CONVENCIONES.md`, `CLAUDE.md`). Implementation-ready; any material scope change updates this document.

**Authoritative detail:** Feature-level behavior is specified in `features/*` (English). If anything conflicts, **this PRD** plus the relevant **`features/{slug}/{slug}.md`** win over informal notes.

---

## Problem Statement

Infoproduct creators need to ship a **coherent digital package**—a **main ebook**, **bonuses**, and **order bumps**—with professional layout, consistent design, section visuals, and **print-ready PDFs**. Tools such as Gamma, Canva, and Adoptimizer optimize for slides or generic design; they do not match the real infoproducer workflow: **HTML-structured longform**, a **single design system** across all deliverables, and **separate PDFs** per artifact.

Today that workflow is **manual, slow, and technical**. Building the **sales page** for the product (e.g. Shopify) is a separate job. **Obra does not prioritize** that sales channel in **MVP**; subscription payment to Obra (e.g. via Mercado Pago) must not be confused with **where the creator sells** their infoproduct.

**Initial launch markets:** Argentina and Brazil, with expansion to the rest of LATAM after validation.

**Primary persona (“Valentina”):** woman, 28–42, LATAM or US Hispanic market; wants home income from expertise; has content but not design or code skills; frustrated by generic tools; needs an end-to-end system; fears looking amateur, wasting time, or not knowing how to use the product.

**Secondary personas:** freelancers or agencies building infoproducts for clients; experienced creators who want speed.

---

## Solution

**Obra** is a SaaS that uses AI to take a creator from **idea** to an **exportable infoproduct package** (ebook + bonuses + bumps) in **PDF**, with control over **design** (60/30/10 palette and font pairs), **images** (AI or upload), and **content**, **without** design or coding skills.

**Unique value proposition**

> From idea to an exportable infoproduct package (ebook + bonuses + bumps) in PDF, in minutes, with AI—without design or code.

**Domain:** obra.app  

**Languages**

- **App UI (`ui_locale`):** **Spanish (`es`)** and **Brazilian Portuguese (`pt-BR`)** only. The user may switch anytime; preference is stored on the account.
- **Generated product output (`content_locale`):** chosen **when the project is created** and **immutable** afterward. v1.0 catalog: **`es`**, **`pt-BR`**, **`en-US`**, **`en-GB`** (BCP 47; do not use `en-UK`). All generated text, HTML, PDFs, and on-image copy follow `content_locale`.
- **Mixing:** UI may be in one language while the project outputs in another (e.g. Spanish UI, Portuguese output).
- **User prompts:** the user may type in any language; **model output** follows the project’s `content_locale`.

**Key differentiation (summary)**

| Capability | Gamma | Canva | Obra |
|------------|:-----:|:-----:|:----:|
| Professional HTML/PDF output | No | No | Yes |
| Coherent package (ebook + bonuses + bumps, same design) | No | No | Yes |
| Sales material for online store (e.g. Liquid / Shopify) | No | No | Yes (post-MVP) |
| Per-project 60/30/10 design system | No | Partial | Yes |
| AI image generation + swap | Yes | Partial | Yes |
| Built for LATAM infoproducers | No | No | Yes |

---

## User Stories

1. As a **new visitor**, I want to **understand what Obra does and for whom**, so that I can decide whether to subscribe.  
2. As a **creator**, I want to **sign up with email and password or Google**, so that I can access Obra with a method I trust.  
3. As a **user**, I want the **app UI in Spanish or Brazilian Portuguese**, so that I can work in my preferred language.  
4. As a **user**, I want my **UI language choice saved on my account**, so that it persists across sessions and devices.  
5. As a **subscriber**, I want to **create a new project**, so that I can start a new infoproduct package.  
6. As a **creator**, I want to **choose the output language (`content_locale`) at project creation**, so that all generated material matches my buyer’s language.  
7. As a **creator**, I want **`content_locale` locked after creation**, so that I do not accidentally mix languages in one package; I accept creating **another project** for another output language.  
8. As a **creator**, I want to **choose whether content will come from pure AI or from an uploaded manuscript later**, so that the product matches my starting point.  
9. As a **creator**, I want a **guided onboarding wizard** (topic → avatar + problem → package structure → design), so that I am not overwhelmed by empty forms.  
10. As a **creator**, I want **“Improve text” on long fields in the wizard**, so that rough notes become clearer copy using AI (with credits).  
11. As a **creator**, I want to **set bonus and order-bump counts within product limits**, so that the scope of my package is explicit before content work.  
12. As a **creator**, I want **AI-suggested main titles** and to **pick or type my own**, so that I keep control while moving fast.  
13. As a **creator**, I want **optional project-level author/brand** captured with the main title, so that covers and metadata can use it when present.  
14. As a **creator**, I want **separate steps for bonus titles and bump titles** with **per-row regenerate and lock rules**, so that batch actions do not overwrite choices I care about.  
15. As a **creator**, I want **design presets, 60/30/10 palette, font pairs, page size and orientation**, so that preview and PDF match the same geometry.  
16. As a **creator**, I want **image defaults (`image_mode`, `image_style`) in the design step without spending image credits there**, so that Preview/export owns billing for generation.  
17. As a **creator**, I want **main ebook chapter outline defined in the Content phase**, not in Structure, so that the wizard does not pretend chapters are fixed too early.  
18. As a **creator on the AI path**, I want the system to **propose and let me confirm an index/TOC** for the main ebook, so that chapter boundaries are explicit before bodies.  
19. As a **creator on the AI path**, I want **chapter bodies, then bonuses, then bumps** in a clear milestone order, so that I always know what is next.  
20. As a **creator on the upload path**, I want to **upload one `.docx` or text-layer `.pdf` after design**, so that my existing manuscript feeds the main ebook.  
21. As a **creator on the upload path**, I want **parse + LLM split proposal + alignment UI**, so that Obra chapters map to my file with my approval.  
22. As a **creator**, I want **the same milestone sequence after alignment** as the AI path (with prefill from the file), so that both branches feel like one product.  
23. As a **creator**, I want **clear errors for password-protected PDFs, empty extraction, or oversize files**, so that I know how to fix the input.  
24. As a **creator**, I want **synchronous processing with a blocking loading state** for import in MVP, so that I know when I can continue.  
25. As a **creator**, I want **text extraction without LLM to cost no AI credits**, so that only language-model steps consume my balance.  
26. As a **creator**, I want **“Replace file” only via an explicit confirmed flow**, so that my manuscript is never swapped silently.  
27. As a **creator**, I want **weak prefill warnings and a strong modal if all chapters are below threshold**, so that quality issues are visible without blocking trivial cases.  
28. As a **creator**, I want **Preview (global step 3)** to show **layout-accurate HTML**, **image slots**, **cover generation**, and **export**, so that I see what buyers will get.  
29. As a **creator**, I want **long-form text edited in Content**, not primarily in Preview in MVP, so that the product does not split editing across two confusing surfaces.  
30. As a **creator**, I want **regenerate, upload, or remove images per section**, so that I can fix weak visuals quickly.  
31. As a **creator**, I want **one PDF per deliverable** plus an optional **ZIP of all PDFs**, so that I can distribute files the way infoproducers usually do.  
32. As a **creator**, I want **ZIP export to fail entirely if any PDF in the batch fails**, so that I do not ship a partial package by mistake in MVP.  
33. As a **creator**, I want **export to be atomic per user action**: either the whole action succeeds or it fails without advancing `published` status, so that status matches reality.  
34. As a **creator**, I want to see **`draft` / `published` / `modified`** explained in the UI, so that I know whether I need to re-export.  
35. As a **creator**, I want **renaming the project in the dashboard** not to invalidate exported PDFs, so that organization does not trigger false “out of date” states.  
36. As a **creator**, I want to **edit the design system after the wizard** from a dedicated surface, so that I can refine appearance without redoing everything.  
37. As a **creator**, I want to **re-run full structure onboarding** on an existing project without extra fees—only paying credits for **new AI calls**, so that iteration is fair.  
38. As a **creator**, when I **change avatar or problem**, I want a **warning and a two-step “start over” confirmation**, so that I understand content may no longer fit.  
39. As a **creator**, after **start over for avatar/problem**, I want **text milestones and images cleared**, **storage objects removed**, and **upload manuscript handling** to follow upload PRD rules, so that I do not get visual or narrative mix-ups.  
40. As a **creator**, I want **duplicate project** to deep-copy everything exportable into a **new** project that starts as **`draft`**, so that I can fork work safely.  
41. As a **creator**, after duplicate, I want to land in **Content (global step 2)** in the clone regardless of where I was in the source, so that behavior is predictable.  
42. As a **creator**, I want **cloned upload-branch projects to get a physical copy of the manuscript in storage**, so that deleting the original does not break the clone.  
43. As a **creator**, I want **at most 20 active projects**, **unlimited archived**, and **delete → 30-day retention → hard delete**, so that limits and recovery are clear.  
44. As a **paying user without trial**, I want **email verified before subscription checkout** (email/password path), so that I do not pay tied to an unconfirmed inbox.  
45. As a **user**, I want **OAuth (e.g. Google)** to skip manual email verification when the provider marks email verified, so that friction matches trust.  
46. As a **user**, I want **one business `user_id`** with **linked identities** when email matches and is verified, so that I do not accidentally split payments and data.  
47. As a **subscriber**, I want **Mercado Pago** for **recurring subscription** and **one-off credit top-ups** in **local currency** (ARS/BRL) with **USD anchor messaging** where helpful, so that pricing feels local.  
48. As a **subscriber**, I want **included monthly credits to reset each billing cycle without rollover**, and **purchased top-up credits to accumulate**, so that the model matches communication.  
49. As a **subscriber**, I want **credits deducted only after successful backend completion**, so that failed AI or export does not steal my balance.  
50. As a **user with a failed subscription**, I want **access blocked to the tool** but **retained top-up balance messaging**, so that I understand what happens when I resubscribe.  
51. As a **new paying user**, I want a **demo video and dismissible interactive tour**, so that I see value quickly without a free trial.  
52. As a **user**, I want **in-app help/FAQ** in my UI language, so that self-serve answers common questions.  
53. As a **user**, I want **email support** for escalations, so that I can resolve issues the FAQ cannot.  
54. As a **user**, I want **in-app notices** for low credits, renewal, and payment failure driven by webhooks and DB state, so that I am not dependent on marketing email in MVP.  
55. As a **user**, I want **privacy policy and terms** in **es** and **pt-BR** before register/pay, so that trust and compliance baselines are visible.  
56. As a **user**, I want **export my data** and **delete my account** with strong confirmation, so that I can exercise portability and erasure (model C—legal to refine).  
57. As a **user**, I want **WCAG 2.1 Level A** across the app and **AA on critical flows** (auth, wizard, pay, export, account danger zone), so that I can complete core tasks with keyboard and assistive tech where reasonable.  
58. As a **creator**, I want **clear loading and disabled double-submit** on slow AI, PDF, and import operations, so that the app feels predictable.  
59. As a **creator**, I want **rate limits** to protect the service from abuse without replacing the **credit** model, so that outliers cannot burn the platform.  
60. As an **operator**, I want **logs without manuscript text, full prompts, or raw PII**, so that observability does not create new privacy risk.  
61. As a **stakeholder**, I want a **soft launch**: payments on, aggressive marketing only after a **“ready to charge” checklist**, so that we reduce reputational and support risk.  
62. As a **deployer**, I want a **documented manual smoke path** including **keyboard wizard** and **payments/webhooks** checks, so that production promotes are deliberate.  
63. As an **engineer**, I want **a few stable Playwright E2E tests** (e.g. login, create project, one wizard step) with **AI mockable**, so that CI catches regressions without runaway cost.  
64. As a **creator**, I want **Gemini-class image generation** with **minimum width** and **WebP output**, so that section art is usable in PDF.  
65. As a **creator**, I want **clean PDFs** (embedded fonts, no browser chrome margins) from **server-side rendering**, so that downloads look professional.  
66. As a **LATAM user**, I want **data hosted with explicit region choice (target LATAM on Supabase)** and **subprocessors disclosed**, so that privacy story matches reality.  
67. As a **team**, we want **PITR or equivalent backups** when the tier allows, plus **periodic logical exports** off the single production account, so that recovery is possible.  
68. As a **product owner**, we want **credit counts and per-action credit table** finalized before public “X credits/month” marketing, so that unit economics hold.  
69. As a **creator**, I want **post-MVP Shopify landing** (preview + copyable Liquid blocks) **out of MVP**, so that scope stays focused on PDF package excellence.  
70. As a **creator**, I understand **exported customer-facing PDF/HTML is not held to PDF/UA or strict semantic HTML in v1.0**, so that effort goes to visual quality first.

---

## Implementation Decisions

### Internationalization

- UI resources must cover **`es`** and **`pt-BR`** only; implementation chooses file naming conventions for i18n libraries.  
- Semantic meaning of modals, `status` badges, and export copy lives in this PRD; final strings live in app resources.

### Project composition (MVP)

- **One** main ebook, **up to 5** bonuses, **up to 2** order bumps per project—same design system across all.  
- **Post-MVP:** Shopify-oriented landing (preview + independent Liquid blocks). Standard block order when built: Hero → pain → benefits → solution → bonuses → price/CTA (optional countdown) → guarantee → testimonials → FAQs → optional author story.

### Account limits (v1.0)

- **20 active** projects per user; **unlimited archived**; **delete** → **30-day** retention then **hard delete**. Archiving frees an active slot but **does not** delete storage until trash expiry.

### Project `status` vs export (v1.0)

- Values only: **`draft`**, **`published`**, **`modified`**.  
- **Wizard global step position** is **not** stored on `projects` in v1.0; client reconstructs from saved domain data and product rules.  
- **`draft`:** no successful export yet. **`published`:** at least **one** user export **action** completed **fully** successfully (any single deliverable PDF, multiple, or full ZIP—one success is enough). **`modified`:** package no longer matches last successful export; user should **re-export** (non-blocking messaging).  
- **Per user action, atomicity:** if any sub-step of that action fails, **whole action fails**—no partial success treated as complete, **no** `published` transition.  
- **Never return to `draft`** from `published` in v1.0; destructive events yield **`modified`** if there was a prior successful export.  
- **Material changes** (design row, deliverable HTML/index, package images including cover and uploads, package structure affecting exports, upload file replace, confirmed avatar/problem reset when previously exported) move **`published` → `modified`**. **Exception:** changing **only** dashboard **`projects.name`** does **not** move to `modified` in v1.0.

### Editing and advanced flows

- **Design after wizard:** editable via dedicated project appearance surface; optional re-entry to design inside structure flow if shell allows. Single DB source of truth for design system per project.  
- **Re-open full structure onboarding** on existing project: allowed; no extra product fee—only AI credit consumption as usual.  
- **Avatar/problem change:** warn; offer **two-step** “start over with these parameters”; on confirm, clear text + content milestones; **delete DB references and storage objects** for section images, covers, and project assets used in preview/export; **do not** auto-replace upload manuscript binary (user uses replace flow if needed). After confirm: global step **Content**; AI branch starts at main index; upload branch returns to **alignment** with same file unless user replaces.  
- **Replace manuscript:** only explicit **Replace file** flow anytime; strong confirmation; extraction without LLM consumes **no** AI credits; follow weak-prefill and all-chapters-below-threshold modal rules in feature PRDs.  
- **Duplicate:** new `project_id`; **`draft`**; name suffix localized (` - Copia` / ` - Cópia`); open clone in **Content** step 2; deep copy per checklist in prior Spanish spec (locales, author, branch type, structure, content state, design, images and storage **duplicated** for clone, not shared pointers for binaries). No copy of subscription/ledger; no “export history” carrying over as published.

### Backend consistency (reset, duplicate, export)

- Reset: ordered steps so DB and storage stay consistent; **no user-visible success** on partial critical failure; retries idempotent where possible; RLS scoped to owner.  
- Duplicate: idempotent or guarded against double-submit; strategy for partial failure documented at architecture level.  
- Export success and `published` transition only when **all** parts of **that** invocation succeed; credits align with **no charge on failure**.

### Primary creation order (v1.0)

1. Create project including **`content_locale`**.  
2. Choose **AI** vs **upload-later** branch.  
3. Shared wizard to **design**: topic → avatar + problem → package (counts, main title + optional author, bonus/bump titles) → design (presets, palette, fonts, page, image defaults).  
4. **Content** phase: AI index path or upload parse/align path → shared milestones → bonuses/bumps.  
5. **Preview** (global step 3): layouts, images, cover, PDF per artifact + ZIP.  

Detail: `features/wizard-shared`, `wizard-ai-generation`, `wizard-upload`, `wizard-preview`.

### File import (upload branch, MVP)

- **`.docx`** and **text-selectable PDF** only; **no** scanned PDF/OCR in MVP.  
- **Max 10 MB** per file; **one file per import attempt**.  
- Reject **encrypted/password PDF** with clear guidance.  
- **Synchronous** UX in MVP; prevent double submission while in flight.  
- **Telemetry:** metadata only—no manuscript body or full prompts in logs.

### Accessibility and performance (model B)

- **WCAG 2.1 Level A** app-wide; **AA** on critical flows (auth, wizard, checkout path, export, account export/delete). Keyboard, labels, non-color-only errors, reasonable modal focus behavior; `aria-live` polite when AI fills fields.  
- **Exported infoproduct** PDF/HTML: **no** PDF/UA or strict buyer-facing accessibility requirement in v1.0.  
- **Perceived performance:** skeletons, disable duplicate actions during long ops, optional streaming for AI where cost/complexity allow; periodic vitals review on key routes (tooling optional, thresholds team-defined).

### Design system

- **60/30/10** rule; AI suggestion + manual pickers; preview before apply; **one** design system per project applied to all deliverables (and post-MVP landing).  
- **Preset** bundles palette + font pair; first manual edit unlinks preset to **Custom**; optional restore. **Concrete preset list** for MVP is a **product/design deliverable** still to be finalized.

### Images

- Per-section images for main, bonuses, bumps; styles (flat illustration, photo, isometric, minimalist, etc.); **regenerate / upload / delete**; persist in project.  
- **Provider:** Google **Gemini** image family (**Nano Banana** class); min width **1200px**; **WebP** output.  
- **Credit triggers** for images tied to **successful preview pipeline generation**—detail in `features/wizard-preview` and credit model here; do not duplicate trigger tables in this master PRD.

### Export

- **One PDF per artifact**; optional **ZIP** of all project PDFs; clear filenames **without** dates in name (detail in `wizard-preview`).  
- **HTML → PDF** via **server-side** rendering (e.g. Puppeteer-class tool) with embedded fonts and optimized images; **A4 or Letter** user choice.  
- **Post-MVP:** downloadable HTML export; Shopify Liquid blocks.

### MVP capabilities (checklist)

Mirror of shipped intent: auth (email + Google), `content_locale`, shared wizard through design, content phase both branches, design system, images, preview step, PDF+ZIP, credits + top-ups, dashboard limits/trash, help center + email support, legal links, account export/delete, in-app billing notices, Mercado Pago subscription + webhooks.

### Technology stack (products, not commands)

- **Frontend:** React, Vite, TypeScript.  
- **UI:** Tailwind CSS, **shadcn/ui** (Radix-class primitives).  
- **Backend/BaaS:** Supabase (Auth, Postgres, Storage, Edge Functions).  
- **Payments:** Mercado Pago (subscriptions + one-off top-ups, webhooks → app state).  
- **Text AI:** Anthropic Claude API.  
- **Image AI:** Google Gemini API (Nano Banana–class models).  
- **Document text extraction:** libraries for DOCX and text-layer PDF (no OCR MVP).  
- **PDF generation:** server-side headless browser class tool (e.g. Puppeteer) behind Edge Functions.  
- **i18n:** i18next (or equivalent) for UI locales.  
- **Frontend hosting:** Vercel.  
- **AI-assisted development:** Cursor and Claude Code as complementary tools.  
- **E2E:** small Playwright suite—model B.

### Security and abuse (model B)

- **Rate limiting** per authenticated user on expensive operations: text/image generation, PDF export, document parsing, user-data export, and analogous endpoints. Optional IP limits for public endpoints. Implementation mechanism and thresholds documented in architecture/ops—not only credits.

### Observability and incidents (model B)

- Platform logs (hosting + Supabase); **point alerts** for webhook failures, error spikes, daily AI spend threshold—channels TBD.  
- **Incident playbook:** check provider status; prolonged impact → in-app banner; **email users** only for payment, subscription, or data-integrity risk.  
- **Runbook** lives in internal ops documentation (English).

### Data model (principal entities)

Sketch (names may vary in migrations): users/profiles with `ui_locale`; projects with `content_locale`, optional `author`, `status`, archive/delete timestamps; design system per project; ebooks (main/bonus/bump) with index; chapters with HTML and image reference; images metadata; credit ledger and purchases; subscriptions. **`landing_pages` post-MVP.** RLS on all user-owned data.

### Business model (v1.0)

- **Single launch plan**; **USD ~29/mo** anchor; local ARS/BRL at checkout.  
- **No** free tier, **no** trial, **no** freemium—active subscription required to use the tool.  
- **Monthly included credits** refresh each cycle—**no rollover**. **Top-up packs** (fixed sizes/prices TBD) **accumulate** until used.  
- **Credit economics** (included count, per-action table) are a **product research** task before public numeric promises.

### Acquisition gates

- Email/password: **verified email before subscription checkout**; unverified users see **verification shell only**—no dashboard, no checkout. Paid-but-unverified is an **implementation bug**, not a supported path.  
- OAuth: treat as verified when provider + Supabase say so.

### Identity linking

- **One** business user ↔ **one** `user_id`; Supabase **links** OAuth and email when verified email matches; settings may allow connecting another provider. Duplicate accounts → support path; **no** promised automatic merge of two `user_id`s in v1.0.

### Support and notifications (model B)

- Help center / FAQ in app; **email** support; **no** live chat in MVP.  
- **Transactional email:** Supabase Auth defaults for verify/reset; Mercado Pago handles its receipts; **product** relies on **in-app notices** for credits, renewal, failures.

### Compliance and hosting (draft—legal review required)

- Privacy policy + terms in **es** and **pt-BR** before register/pay.  
- **Self-serve:** downloadable **export my data** package; **delete account** with strong confirmation and coordinated subscription cancellation per integration capabilities.  
- **Hosting:** Supabase region chosen explicitly (target **LATAM**); frontend on Vercel; subprocessors listed in privacy policy (Vercel, Supabase, Mercado Pago, AI providers as applicable).  
- **Backups:** PITR or equivalent when tier allows; periodic logical DB export + storage strategy to encrypted off-account storage; restore drills internal.

### Launch (v1.0)

- **Soft launch:** public URL + real payments allowed; **no aggressive marketing** until **“ready to charge”** checklist passes (MP sandbox+prod smoke, webhooks, credits integrity, legal pages live, account flows tested, at least one operational alert, backup posture documented).  
- **Manual smoke** mandatory before production promotes mature; **few** E2E tests in CI—see internal CI doc.

---

## Testing Decisions

- **Principle:** test **observable behavior** and user-visible outcomes—**not** implementation trivia that churns on refactors.  
- **Manual:** operations smoke checklist covers Mercado Pago (sandbox + real when touching payments), webhooks, credits, happy path **create project → wizard → export** (or agreed subset), **keyboard-only** wizard traversal, and spot checks for account export/delete.  
- **Automated:** **1–3** stable E2E flows (e.g. login, create project, advance wizard one step); AI may be **mocked** or run in **staging** with bounded cost.  
- **Accessibility testing:** smoke includes at least one keyboard pass through wizard critical controls.  
- **Performance:** periodic manual vitals check on agreed authenticated route before major releases—**no** hard CI gate unless team adds one later.  
- **Modules to prioritize for automated coverage:** authentication boundary, project creation shell, first wizard transitions (exact scope agreed with engineering).

---

## Out of scope (MVP)

- Shopify landing (preview + Liquid blocks)—post-MVP.  
- Native mobile apps (responsive web only).  
- Visual drag-and-drop WYSIWYG editor for longform.  
- Direct Shopify API integration.  
- OCR for scanned PDF import.  
- Changing `content_locale` after project creation (create a new project instead).  
- Video or audio generation.  
- Paid template marketplace.  
- Multi-user teams per account.  
- Live chat, WhatsApp, or phone support in MVP.  
- White label.  
- Proprietary email marketing campaigns (beyond Auth + MP + in-app).  
- CAPTCHA at registration unless abuse forces it—rate limiting remains baseline.  
- Public status page—use in-app messaging + internal runbook in MVP.

**Post-MVP feature examples (version hints):** Liquid landing v1.1; OCR v1.x; live support v1.x; downloadable HTML v1.1; niche templates v1.2; version history v1.2; collaboration v2.0; Shopify API v2.0; launch email sequences v2.0; newsletters v1.x; public status page v1.x.

---

## Further Notes

### Success metrics (first ~3 months)

- Validate plan economics (price vs included credits vs API cost) before or during launch.  
- **100** paying active subscriptions in month one (directional).  
- **~30%** checkout-to-active subscription conversion in month one (directional).  
- Time to **first complete ebook package** under **~20 minutes** (directional).  
- **NPS > 40**; **monthly churn < 8%** (directional).

### Risk register (summary)

Key risks: conversion without trial; Mercado Pago/webhook complexity; plan margin vs real usage; API cost drift; users expecting OCR; inconsistent AI images; learning curve; competitor copying; LGPD/AR compliance expectations; storage cost of archives; abuse of Edge Functions; silent webhook failures; data loss; long provider outages. Mitigations align with sections above (video+tour, sandbox testing, credit model, messaging, regeneration, guided wizard, legal review, monitoring, backups, banners).

### Document hierarchy

- **`features/*`** PRDs refine wizard, content, upload, preview, signup, profile, support, etc.  
- **`ARQUITECTURA_Obra.md`** is the technical structure companion.  
- **`CONVENCIONES.md`** and **`CLAUDE.md`** capture UI/engineering norms for the repo.

### Appendix — Legacy section cross-reference

Older docs may cite **Spanish PRD section numbers**. Approximate mapping to this document:

| Legacy § | Topic |
|:--------:|-------|
| §1 | Vision, problem, differentiation → **Problem Statement**, **Solution** |
| §2 | Users and locales → **Solution** (languages), **Implementation Decisions** (internationalization) |
| §3 | Project structure, status, editing, duplicate, reset → **Implementation Decisions** (project composition, status, editing) |
| §4 | Flows, accessibility, performance → **User Stories**, **Implementation Decisions**, **Testing Decisions** |
| §5 | Design system → **Implementation Decisions** (design system) |
| §6 | Images → **Implementation Decisions** (images) |
| §7 | Export → **Implementation Decisions** (export) |
| §8 | MVP table → **Implementation Decisions** (MVP capabilities) |
| §9 | Stack, rate limits, observability, incidents → **Implementation Decisions** (technology, security, observability) |
| §10 | Data entities → **Implementation Decisions** (data model) |
| §11 | Business, credits, acquisition, support, email → **Implementation Decisions** (business model through notifications) |
| §12 | Out of MVP list → **Out of scope** |
| §13 | Metrics → **Further Notes** (success metrics) |
| §14 | Risks → **Further Notes** (risk register) |
| §15 | Compliance, hosting, backups → **Implementation Decisions** (compliance and hosting) |
| §16 | Launch, QA, CI → **Implementation Decisions** (launch), **Testing Decisions** |

---

*Master product requirements for Obra. Technical architecture and feature PRDs extend this document.*
