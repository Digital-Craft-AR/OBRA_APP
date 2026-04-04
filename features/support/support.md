# PRD — In-app help, FAQ, and email support

**Product:** Obra (obra.app)  
**Feature slug:** `support`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` (help center, support model, i18n), `CONVENCIONES.md` (tokens, `t()`, layout), `ARQUITECTURA_Obra.md` (authenticated app structure).  
**Related:** `features/profile/profile.md` (settings entry, minimal account shells, help references); `features/signup-onboarding/signup-onboarding.md` (entitlement shells, verification UX).

---

## Problem Statement

Creators using Obra are often **not technically confident**. They get stuck on **billing**, **credits**, **exports**, **project limits**, and **import rules**, and they need **clear, self-serve answers** without opening a ticket for every question.

Without a dedicated in-product experience, teams risk:

- **Higher support volume** for questions that could be answered once in a curated FAQ.
- **Inconsistent guidance** across shells (e.g. subscription-pending vs full app) if contact/help is only mentioned in passing.
- **Friction** for users who do not discover how to reach support (email hidden, only `mailto` with no visible address, or no navigation entry).
- **Tone mismatch**: copy that reads like internal specs (MVP, locales, file formats as jargon) **alienates** the primary persona and increases confusion.
- **Legal risk** if the UI **promises response times** that are not yet approved for Terms or operational reality.

This PRD defines a **read-only help surface**: **curated FAQ**, **visible support email**, and `**mailto` contact**, with **no** server-side contact forms, **no** live chat or WhatsApp, and **no** response-time promises on this screen.

---

## Solution

### What the user gets

1. **A single Help / Support destination** in the authenticated product that explains Obra in **plain language** and answers the **most common questions** in a **scannable** layout (e.g. expandable sections).
2. **Support email** shown as **readable, copyable text** plus a control that opens the user’s **default mail client** (`mailto:`) with a sensible **subject line** (optional) so mobile and desktop users can choose what works for them.
3. **Short guidance** on writing to support (what to include, avoid unnecessary sensitive data) **without** stating **SLAs** or “we respond within X hours” on this page.
4. **Full parity for UI languages:** all user-visible strings exist for `**es`** and `**pt-BR`**, driven by the account `**ui_locale**` (same i18n approach as the rest of the app).
5. **Two discovery paths** so users who think in terms of “navigation” or “settings” both find help:
  - **Primary:** entry in the **main app navigation** (e.g. sidebar).
  - **Secondary:** **link from account/settings** (e.g. “Help & support”) that lands on the **same** help destination.

### FAQ content principles

- **User-friendly, non-condescending** tone; assume **low technical literacy** but **respect** the user.
- Avoid **implementation jargon** and **release-phase language** in customer-facing copy (no “MVP”, no internal codenames).
- **Curated, bounded set** of questions (initially **ten** topics — see **Approved FAQ set** below). Changes to questions or answers are **product/copy** changes, not engineering refactors of structure unless layout requirements shift.

### Approved FAQ set (English source for localization)

Implementers should add `**es`** and `**pt-BR`** strings that **preserve meaning and warmth**; the English below is the **semantic source of truth** for tickets and reviews.

1. **What is Obra and what can I do with it?**
  Obra helps you build a **digital product package**: one **main ebook**, up to **five bonuses**, and up to **two short order bumps**, all sharing the same **look and feel** (colors and fonts). When you are done, you can **download PDFs** to use however you like.
2. **The app is in one language and my ebook in another — is that OK?**
  Yes. You can use the app in **Spanish** or **Brazilian Portuguese** and change it anytime in your account. Each project has a **content language** you pick **when you create it**, and **you cannot change it later**. If you need the same work in another language, create **a new project** with the right content language. You can write your ideas in any way you like; generated text follows the **project’s** content language.
3. **How do I pay for Obra?**
  Obra is a **subscription** service. Payments run through **Mercado Pago**. There you see pricing in your currency, subscription status, and receipts.
4. **What are credits?**
  **Credits** power **AI** features — for example generating or polishing text and creating or changing images. You can see **how many you have left** in the app. If you run out, depending on your plan you may **buy more** or wait until your **billing cycle** renews.
5. **How many projects can I have?**
  You can have up to **20 active** projects at once. **Archived** projects do not count toward that limit — you can archive **as many as you need**. Each project includes **one** main ebook, up to **five** bonuses, and up to **two** order bumps.
6. **How do I download my PDFs?**
  In **Preview**, you can create and download **one PDF per piece** (the ebook, each bonus, each order bump). You can also download **everything together in one bundle** when the app offers it and the download completes successfully.
7. **Can I start from a Word or PDF I already have?**
  Yes. If you choose to start from a file, you can upload **one** **Word (.docx)** or **PDF** file, up to **10 MB**. It must be real **text** (like a Word file saved as PDF), not a **scanned photo** of pages. If your PDF is **password-protected**, remove the password and upload a copy **without** a lock.
8. **What happens if I delete a project?**
  Deletion is not always instant: the project may sit in a **recovery window** (trash / similar) so you can undo a mistake. After that period it is **fully removed**. Exact timing and rules appear **in the app** and in **Terms** when published.
9. **Does Obra build the page where I sell my course?**
  Obra focuses on **creating and downloading** your materials (PDFs). **Where you sell** is up to you and the platforms you already use. Additional selling-focused features may arrive later; the core value today is **delivery-ready content**.
10. **Who do I email if I still need help?**
  The Help screen shows the **support email** and a button to **open your email app**. Explain what you were doing and what you saw on screen so we can help faster. Do not send sensitive information unless we ask for it.

### Support email configuration

- The **support address** is a **single configurable value** (environment or app config), not hardcoded in scattered components, so operations can swap **placeholders → production** without a release-wide string hunt.
- The same address powers **visible text** and `**mailto:`**.

---

## User Stories

### Discovery and navigation

1. As an **authenticated user**, I want a **Help** (or **Help & support**) entry in the **main app navigation**, so that I can find answers without hunting through unrelated screens.
2. As an **authenticated user**, I want a **Help & support** link **inside account/settings**, so that I can jump to support from where I already look for account issues.
3. As an **authenticated user**, I want **both** entries to open the **same** help experience, so that I do not see conflicting information depending on where I clicked.
4. As a **user on a small screen**, I want the **help entry** to be **easy to tap** and the **FAQ** to **scroll comfortably**, so that mobile support is practical.

### FAQ reading experience

1. As a **user**, I want the **most important questions** answered **on one page**, so that I do not need to search the whole internet.
2. As a **user**, I want each answer to use **short paragraphs** and **everyday words**, so that I understand without a technical background.
3. As a **user**, I want **expandable sections** (or equivalent) for each question, so that I can scan titles first and open only what I need.
4. As a **user**, I want a **logical order** of topics (e.g. what Obra is → languages → billing/credits → limits → export → import → deletion → selling scope → contact), so that reading top-to-bottom feels natural.
5. As a **user**, I want **no promises about how fast** support will reply **on this page**, so that I am not misled if load spikes or legal text differs.

### Contact and email

1. As a **user**, I want to **see the support email address in plain text**, so that I can **copy it** into any email app I prefer.
2. As a **user**, I want a **button or link** that opens my **default mail client** with the **correct address**, so that starting an email is one tap.
3. As a **user**, I want **optional prefilled subject** (e.g. “Obra support”), so that my message is easy to find in my Sent folder and for the team’s inbox.
4. As a **user**, I want **brief tips** on what to include in my message (steps, what I saw on screen), so that my ticket is easier to resolve.
5. As a **user**, I want to be **reminded not to share unnecessary sensitive data**, so that I stay safe while asking for help.

### Internationalization

1. As a **user** with `**ui_locale` = `es`**, I want **every** FAQ question, answer, heading, and contact string in **natural Spanish**, so that the experience matches the rest of the app.
2. As a **user** with `**ui_locale` = `pt-BR`**, I want the **same** in **Brazilian Portuguese**, so that Brazilian users are not second-class.
3. As a **user** who **switches UI language** in settings, I want the **help page** to **re-render in the new language** immediately (or on next navigation), consistent with global i18n rules.

### Accessibility and trust

1. As a **user** who uses a **keyboard**, I want **expandable FAQ** controls to be **focusable and operable** without a mouse, consistent with product accessibility goals.
2. As a **user** who uses a **screen reader**, I want **headings and labels** that describe each section, so that I can navigate the help page efficiently.
3. As a **user**, I want the help page to **match the product’s visual system** (sidebar vs main content contrast, tokens), so that it feels like part of Obra, not a generic embed.

### Entitlement shells (alignment with account flows)

1. As a **user** who is **email-verified** but **not yet in full product access** (e.g. subscription pending, activating, or billing error shell, per `signup-onboarding` / `profile`), I want to **reach help and the support email** from allowed navigation, so that I can get unstuck on **payment or access** issues.
2. As a **user** on `**verify_email`**, I want any **existing “help” affordance** defined in `signup-onboarding` to remain coherent with this PRD (either **link to this help route** if routing allows, or **consistent copy** for contact); implementers must **not** strand users with **contradictory** support instructions across shells.
3. As a **subscriber in full app**, I want help to remain available **alongside** settings, so that billing and product questions share one **canonical** FAQ.

### Content operations

1. As a **product owner**, I want the FAQ set to stay **small and curated** (initially **ten** items), so that maintenance stays feasible and quality stays high.
2. As a **copywriter**, I want to **update FAQ text** primarily through **i18n resources** (or a single content module), so that changes do not require restructuring the page every time.
3. As **support**, I want the FAQ to **reflect real top tickets** over time, so that we can **swap or add** questions within product process (post-launch iteration).

### Engineering and configuration

1. As a **developer**, I want **one place** to set the **support email**, so that staging and production do not drift accidentally.
2. As a **developer**, I want **no backend endpoint** required for “contact us” on this feature, so that scope stays **static front end + mailto**.

### Consistency with other specs

1. As a **user** reading help about **credits or subscription**, I want the **wording** to stay **consistent** with `profile` and master PRD **behavior** (even if this PRD does not redefine billing logic).
2. As a **QA engineer**, I want **clear expected strings** (or keys) for **smoke tests** on the help route, so that regressions in navigation or i18n are caught early.

### Future-friendly (explicitly not required for v1 of this PRD)

1. As a **product owner**, I may later want **analytics** on **which FAQ sections expand most often**, so that we prioritize copy updates — optional instrumentation, not blocking launch.

---

## Implementation Decisions

- **Help surface module:** A **single route/screen** composes **page chrome** (title, intro), **FAQ list** (presentational component fed by **structured data**: id, question key, answer key), and **contact block** (email text + `mailto` CTA + short tips). Callers (router, settings link) only depend on **route identity**, not FAQ internals.
- **Content module:** FAQ items are defined as **ordered records** mapping to **i18n keys** (or equivalent), so adding/reordering is **data-driven** without new layout code for each item.
- **Support email provider:** A **small configuration boundary** (e.g. env-backed constant injected at build or runtime) exposes `**getSupportEmail()`** (or equivalent) to the contact block and mailto builder. **No** scattering raw addresses in JSX.
- **Mailto builder:** Encapsulate `**mailto:`** URL construction (address, optional subject, optional body template) in one helper so **encoding** and **client quirks** are handled once.
- **Navigation integration:** **Dashboard / full-app layout** registers a **Help** nav item; **settings composer** registers a **secondary link** to the **same route**. Shell-specific layouts (`signup-onboarding`, `profile` minimal path) **reuse** the same destination where routing policy allows; if a shell cannot mount full dashboard routes, **mirror** at minimum the **support email + mailto** per that shell’s UX spec **without** duplicating FAQ bodies in multiple codepaths (prefer **shared component** imported into allowed layouts).
- **Design system:** Follow **design tokens**, **typography**, and **sidebar/main contrast** rules; **no** ad-hoc colors or raw hex. Buttons use **approved variants** only.
- **i18n:** **All** user-visible strings on this feature go through the app’s `**t()`** (or equivalent); **no** hardcoded Spanish/Portuguese/English in components. English **copy in this PRD** guides translators; runtime strings follow `**ui_locale`**.
- **Deep modules:**  
  - **Help page:** thin composition.  
  - **FAQ panel:** hides accordion/list behavior and **a11y** roles.  
  - **Contact block:** hides mailto + display email.  
  - **Support config:** hides environment source.

---

## Testing Decisions

- **Principle:** Assert **observable behavior** — route renders, correct number of FAQ entries, expanding/collapsing works, **mailto** link contains configured address, **visible email** matches config, strings switch with `**ui_locale`**.
- **Modules to test (priority):**  
  - **Mailto builder** (unit): encoding, subject optional.  
  - **FAQ list** (component): expand/collapse, keyboard if implemented.  
  - **Support email config** (unit): single source used by text + link.
- **E2E / smoke:** From **full app**, open **Help** from **nav** and from **settings** → same content; toggle language (if smoke covers i18n) → FAQ strings change; snapshot or assertion on **first FAQ title** per locale.
- **Prior art:** Align with `**docs/operations/smoke-test.md`** when this route ships; coordinate with `**signup-onboarding`** E2E if help is reachable from verification or minimal shells.

---

## Out of Scope

- **WhatsApp**, **live chat**, **widgets**, or **any synchronous** support channel.
- **Contact forms** that **POST** to the server, **ticket systems**, or **CRM** integration.
- **User-editable** FAQ from the app (CMS); **all** content is **developer- or copy-owned** via i18n/resources.
- **Search** across help articles (future enhancement unless product requests).
- **SLA / response-time** statements on this screen; **legal-approved** timelines belong in **Terms** or ops docs, not implied here.
- **SEO** for public marketing site (this PRD is **in-app authenticated** help unless product later adds a **public** mirror).

---

## Further Notes

- **Legal / Terms:** If counsel requires **specific disclaimers** near contact (e.g. data processing), add them in **i18n** without changing the **architecture** above.
- **Analytics:** Optional event: `help_faq_expand` with **question id** (no PII). Not required for first ship.
- **Conflict resolution:** If `**signup-onboarding`** or `**profile`** defines **different** help entry rules for `**verify_email`**, follow those documents for **that shell**; update this PRD if a **single unified help route** becomes reachable from all shells.

---

## Further Notes (copy hygiene)

- When product limits or billing rules **change**, update **FAQ answers** and **master PRD** together to avoid contradictions.
- Prefer **“download”** / **“export”** wording consistent with the **Preview** step naming in the live UI.