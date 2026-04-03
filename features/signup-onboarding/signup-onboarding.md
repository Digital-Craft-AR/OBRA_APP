# PRD — Signup, subscription checkout, and post-pay onboarding

**Product:** Obra (obra.app)  
**Feature slug:** `signup-onboarding`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` §11 (acquisition, billing, notifications), §4 (accessibility on critical flows), §16 (launch / smoke).  
**Related:** `features/wizard-shared/wizard-shared.md` (in-product onboarding **after** a **new project** is created — **not** this PRD); `ARQUITECTURA_Obra.md` (Auth, `mercadopago-webhook`, Edge Functions). **Mercado Pago** subscription + top-ups: master PRD §11.

---

## Problem Statement

Obra is **subscription-only** (no trial): creators must **register**, **verify email**, **pay** via **Mercado Pago**, and only then use the product. Without a single, explicit specification, teams risk:

- **Fragmented gates** (email vs payment vs subscription state) and users stuck without clear next steps.
- **Duplicate accounts** when the same person uses **email** and **OAuth** (e.g. Google), breaking the link between **payment metadata** and **one `user_id`**.
- **Checkout** starting before **email is verified**, leading to “paid but cannot access” or receipts tied to unusable inboxes.
- **Race conditions** after returning from Mercado Pago: **webhooks** may lag, so the UI either blocks too long or shows full app before entitlement is confirmed.
- **Post-pay value delivery**: without **dashboard** orientation (**video** + **guided tour** per master PRD), conversion and time-to-first-project suffer in a **no-trial** model.

This PRD covers **account creation**, **verification**, **subscription acquisition**, **entitlement shells**, **first dashboard experience**, and **account identity** (linking providers). It does **not** redefine the **per-project wizard** (`wizard-shared`).

---

## Solution

### Access model (high level)

After authentication, the client resolves **entitlement** in order:

1. **Email verified** (email/password signups). If not verified → **verification shell only** (resend, help). **No** subscription checkout, **no** dashboard, **no** product surfaces.
2. **Subscription active** (authoritative app state derived from DB updated by **webhooks**, with **reconciliation** on demand or schedule — master PRD / architecture). If not active → **pending subscription shell** (complete payment, help) **or** **subscription error shell** (payment/subscription problem, help, link to Mercado Pago as appropriate) **or** **activating shell** (just returned from checkout — see below).

**OAuth** (e.g. Google): if the provider yields a **verified email** in Supabase, skip the verification shell.

### Checkout and return

- **Mercado Pago** checkout is offered **only** after **email verified**.
- Every subscription-related payment carries **stable internal user identity** in **metadata / external reference** (not the payer email string) so **MP account email** may differ from Obra login email without breaking entitlement.
- On return from Mercado Pago, show an **activating** experience: **short polling**, **manual “Refresh status”** triggering **reconciliation**, bounded duration; then success → **dashboard**, or failure → clear messaging + **support** + Mercado Pago guidance.

### Subscription invalid

If subscription is **not valid** (e.g. renewal failed per product policy): user may **log in** but sees **only** the **subscription error shell** — **no** access to the tool. **Top-up credits** remain on the **ledger** but are **not usable** until subscription is active again; copy on the shell **states** that credits are retained.

### First successful dashboard

- **Dashboard** with **demo video**, primary **CTA** (e.g. create first project), and entry to **`wizard-shared`** as defined in the master journey.
- **Interactive tour**: offered **prominently on first visit**, **dismissible**, with **“don’t show again”** stored on the account; **always** reachable again via **Help** or dashboard **“View tour”**.

### Identity linking

- **One business user = one `user_id`**. **Supabase Auth** **links** OAuth and email identities when **email matches** and is **verified**, avoiding duplicate users. **Account settings** allow **connecting an additional** sign-in method. **Duplicate `user_ids`** for the same person are **out of normal flow** → **support**; **no** promised automatic merge of data in v1.0.

### Email change (logged-in, active subscriber)

- Changing email requires **re-verification** of the **new** address. Until confirmed, user is in **verification shell** only (**no** dashboard, **no** **new** checkout or top-up). Subscription remains tied to **`user_id`** via Mercado Pago integration.

---

## User Stories

### Registration and session

1. As a **new visitor**, I want to **sign up with email and password**, so that I can create an Obra account tied to my inbox.
2. As a **new visitor**, I want to **sign up or sign in with Google** (OAuth), so that I can access Obra faster with a trusted provider.
3. As a **returning user**, I want **persistent session** behavior consistent with Supabase Auth, so that I stay signed in across visits within product rules.
4. As a **user**, I want to **sign out** from any **blocking shell** or the full app, so that I can switch accounts safely.

### Email verification (email/password)

5. As a **user who just registered with email**, I want to see **clear instructions** to **confirm my email**, so that I know what blocks me from continuing.
6. As a **user**, I want to **resend the confirmation email**, so that I can recover if the message was lost or filtered.
7. As a **user** on the verification shell, I want **help or support** links, so that I can resolve deliverability or confusion without guessing.
8. As a **user**, I want **subscription checkout hidden** until my email is **verified**, so that I do not pay before I can complete access.
9. As a **user**, after I **click the verification link**, I want the app to **recognize verified state** on return, so that I can proceed to payment without unnecessary friction.

### Subscription checkout

10. As a **verified user without an active subscription**, I want a **single focused screen** to **complete subscription** via Mercado Pago, so that I understand the only remaining step to use Obra.
11. As a **verified user**, I want **pricing and plan context** aligned with master PRD (single plan, local currency, limits, credits), so that I purchase with informed consent.
12. As a **user**, I want **help/support** on the pending-payment shell, so that I can get unstuck before or after attempting checkout.

### Return from Mercado Pago and activation

13. As a **user returning from Mercado Pago**, I want to see **“Activating your subscription”** (or equivalent) **instead of** an error, so that I am not scared by normal webhook delay.
14. As a **user**, I want the app to **automatically recheck** my subscription status **a few times** over a **short window**, so that I become unlocked without manual refresh when the backend catches up.
15. As a **user**, I want a **“Refresh status”** (or similar) action that **triggers reconciliation**, so that I can recover if polling stopped but payment succeeded.
16. As a **user** still not activated after the **bounded wait**, I want **clear next steps** (support + Mercado Pago orientation), so that I know it is not a silent failure.

### Subscription invalid / renewal failure

17. As a **user whose subscription is no longer valid**, I want to **log in** but see **only** a **clear error screen**, so that I understand I cannot use the tool until billing is fixed.
18. As a **user** with **top-up credits** on my account, I want the **error screen to say my purchased credits are not lost**, so that I trust Obra while my subscription is inactive.
19. As a **user** on the subscription error shell, I want **actionable guidance** (update payment, Mercado Pago, support), so that I can resolve the situation.

### First dashboard and demonstration of value

20. As a **newly entitled subscriber**, I want to land on the **dashboard** with a **demo video**, so that I quickly understand what Obra does (master PRD: video + tour).
21. As a **newly entitled subscriber**, I want a **primary CTA** to **start my first project**, so that I reach creation flow without hunting.
22. As a **first-time subscriber**, I want the **interactive tour** offered **prominently**, so that I learn the end-to-end path to export.
23. As a **first-time subscriber**, I want to **skip or dismiss** the tour, so that I am not trapped in mandatory steps after I already paid.
24. As a **user**, I want **“Don’t show again”** (or equivalent) for the first-run tour prompt, so that return visits stay clean.
25. As a **returning user**, I want to **relaunch the tour** from **Help** or dashboard, so that I can revisit guidance anytime (master PRD requires both video and tour).

### Identity linking

26. As a **user with an email account**, I want to **connect Google sign-in** from **account settings**, so that I can log in either way without a second Obra account.
27. As a **user**, if I sign in with Google using the **same verified email** as my existing account, I want **one account**, so that my **subscription and projects** stay unified.
28. As a **user** caught in an **edge-case duplicate**, I want a defined path via **support**, so that I am not abandoned (no self-serve merge promised in v1.0).

### Email change

29. As a **subscriber**, I want to **change my login email**, so that I keep access if my inbox changes.
30. As a **subscriber changing email**, I must **verify the new email** before using the product again, so that Obra does not trust an unowned address.
31. As a **subscriber** with a **pending email change**, I want **no new subscription checkout or top-up** until verification completes, so that receipts and identity stay coherent.

### Accessibility and i18n

32. As a **user**, I want **login, verification shells, checkout entry, and blocking screens** to meet **WCAG 2.1 Level A** with **AA aspiration** on critical controls, consistent with master PRD.
33. As a **user**, I want **UI copy** in my **`ui_locale`** (`es` / `pt-BR`), so that shells and dashboard match the rest of the app.

### Operations and trust

34. As **support**, I need **consistent user states** (verified email, subscription status, activating) exposed in predictable ways, so that tickets are diagnosable.
35. As a **user**, I want **no false “subscription active”** if reconciliation has not confirmed it, so that I do not start work that later breaks entitlements.

---

## Implementation Decisions

### Entitlement and routing

- A **single entitlement resolver** (conceptual module) consumes **Supabase session** + **profile/subscription fields** (exact schema is a backend concern) and returns a **small enum** of **client routes / shells**: `verify_email`, `pending_subscription`, `activating`, `subscription_error`, `full_app`. **Callers** (router, layout guards) depend only on this outcome, not on raw webhook payloads.
- **Ordering** of checks is fixed: **email verified** before any **checkout** or **full app**; **activating** only applies on **post-checkout return path** (query param, session flag, or short-lived server state — choice is implementation detail; behavior is specified in Solution).

### Checkout orchestration

- Module **builds Mercado Pago subscription / preference** payloads with **immutable internal user reference** (`user_id` or stable surrogate) in **metadata / external_reference**. **Hides** MP API details from the rest of the client.
- **Does not** expose checkout entry points until **email_verified** predicate is true.

### Reconciliation

- **Narrow interface**: e.g. `reconcileSubscription(userId) → SubscriptionSnapshot` (read-only struct: active flag, grace messaging keys, timestamps as needed). Invoked from **“Refresh status”**, optionally **on billing/account surfaces**, and from **scheduled jobs** per hybrid model in master PRD.
- **Hides** differences between **webhook-delayed DB** and **Mercado Pago API** responses.

### Activation UX coordinator

- Module owns **polling interval**, **max duration**, **backoff policy**, and **transition** to dashboard or error shell. **Does not** duplicate reconciliation logic — calls the reconciliation interface.

### Blocking shells (UI)

- **Shared layout** for verification, pending payment, activating, subscription error: **consistent** header, **help/support**, **sign out**. **Copy keys** live in i18n; no hardcoded user-visible strings in code paths (per engineering rules).
- **Activating** shell is **visually distinct** from **pending payment** so users understand **payment may have succeeded** but **activation is in progress**.

### First dashboard module

- Composes **video** block, **primary CTA** (new project), optional **secondary** links. **Tour launcher** receives **first-run flag** from **profile** (or equivalent persistent store).

### Tour persistence

- **Profile field** (or equivalent) stores **`tour_first_run_completed`** / **`tour_dismissed_permanently`** (exact naming is implementation detail). **Tour content** references master PRD flow through export; **does not** duplicate `wizard-shared` step rules.

### Identity linking

- Uses **Supabase Auth** capabilities for **linking** providers to the **same user**. **Account settings** surface: **connect Google** (and future providers). **Errors** (e.g. provider already linked elsewhere) map to **user-safe messages** + support when needed.

### Email change

- Uses **Supabase Auth** change-email flows. On **pending verification**, entitlement resolver returns **`verify_email`** (or dedicated shell type behaviorally identical: **no** checkout, **no** top-up, **no** product). **Subscription** remains on **`user_id`**.

### Security and abuse

- **Rate limits** on **resend verification** and **refresh/reconcile** triggers align with master PRD **model B** (technical baseline; exact thresholds not fixed here).

---

## Testing Decisions

- **Principle:** Test **observable behavior** (which shell appears, checkout gating, post-return activation, tour persistence), not **internal polling timers** as unit-test trivia — use **integration/E2E** with **configurable** intervals in test env if needed.
- **Modules to cover with automated tests where feasible:** entitlement resolver (table-driven: inputs → shell), reconciliation contract (mock MP + DB fixtures), activation coordinator (state transitions with fake clock).
- **E2E / smoke (manual or Playwright):** email signup → verify → checkout (sandbox) → **activating** → dashboard; OAuth happy path; **subscription error** shell does not render dashboard; **link identity** path; **email change** locks app until verified.
- **Prior art:** `docs/operations/smoke-test.md` should be extended under **signup / subscription** headings when this feature ships; align with master PRD §16.

---

## Out of Scope

- **Mercado Pago webhook** handler implementation details and **idempotency** keys (specified at architecture level; not duplicated here beyond behavior expectations).
- **Per-project wizard** (`wizard-shared`, content, preview): only **entry** via dashboard CTA.
- **Top-up purchase** UX and **credit ledger** rules beyond **messaging** when subscription is invalid (master PRD §11).
- **Legal text** (terms, refund policy): must be **reviewed with counsel**; this PRD does not fix copy.
- **Automatic merge** of two user accounts / data migration for duplicates: **support process** only in v1.0.

---

## Further Notes

- **Metrics** in master PRD (e.g. checkout → active conversion) depend on **clear** funnel states; instrument **shell transitions** and **activation duration** for product analytics.
- **False negatives** (user paid but sees error) are **operational incidents**: mitigated by **reconciliation**, **copy** on activating shell, and **support** playbooks.
- Any conflict between this document and **`PRD_Obra.md`** or architecture specs: **master PRD and `ARQUITECTURA_Obra.md` win**; update this feature PRD when they change.
