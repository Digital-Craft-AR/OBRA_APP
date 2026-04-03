# PRD — Account profile, subscription management, and account deletion

**Product:** Obra (obra.app)  
**Feature slug:** `profile`  
**Status:** Draft  
**Parent reference:** `PRD_Obra.md` §11 (billing, credits), §15 B (export, delete account), §4 (accessibility on critical flows), §16 (launch / smoke).  
**Related:** `features/signup-onboarding/signup-onboarding.md` (entitlement shells, email change, identity linking, reconciliation); `ARQUITECTURA_Obra.md` (extended profile schema, `export-user-data`, `delete-account`, `mercadopago-webhook`). UI tokens: `CONVENCIONES.md`.

---

## Problem Statement

Authenticated users need a **single, coherent place** to manage **identity and preferences**, **billing-related subscription actions**, and **data rights** (portability and erasure) without conflating unrelated outcomes.

Without an explicit specification, teams risk:

- **Mixing “cancel subscription” with “delete my account”**, leading to support load, legal ambiguity, and accidental data loss or continued charging.
- **Optimistic UI** after opening Mercado Pago that implies cancellation before **webhooks / reconciliation** confirm state, causing false expectations.
- **Account deletion** proceeding while **Mercado Pago still shows an active subscription**, creating **charge-after-delete** incidents.
- **Inconsistent rules** for export/erasure across **entitlement shells**, or offering export/delete before **email verification**, conflicting with **security** and **self‑serve data rights** expectations (`PRD_Obra.md` §15 B) where applicable.
- **Operational blindness**: support cannot diagnose “I cancelled but still see active” or reconciliation delays without **persisted or logged subscription snapshot metadata**.
- **Missing account surfaces**: no clear place for **password / email / OAuth lifecycle**, **credit balance and usage**, or **top-up entry**, causing confusion and support tickets.

This PRD covers **account settings / profile surfaces** (including **read-only account summary** on blocking shells), **security and identity** (password, email change, link/unlink OAuth), **credits visibility and usage history**, **top-up entry** (gated by active subscription), **subscription management entry points** (Mercado Pago), **data export**, and **account deletion**. It does **not** redefine **initial signup, checkout, or post-pay onboarding** (`signup-onboarding`).

---

## Solution

### Entitlement matrix (account surfaces)

Entitlement outcomes follow **`signup-onboarding`** (resolver order: **email verified** before subscription-gated product). This PRD defines **what account / privacy UI** exists in each shell:

| Entitlement (resolver) | Account / privacy surface |
| ---------------------- | ------------------------- |
| **`verify_email`** | **No** **Export my data** and **no** **Delete account** until the email is **verified**. Only the verification experience (resend, help, sign out) per `signup-onboarding` — no extension in this PRD. |
| **`pending_subscription`** | **Same minimal account / privacy path** as **`subscription_error`** (read-only summary, export, delete, help, sign out; **no** full settings, **no** product). User is **email-verified** but not yet entitled to the tool. |
| **`activating`** | **Same minimal path** as **`pending_subscription`** / **`subscription_error`**, so users are not blocked from **export** or **delete** while payment activation is in progress. Optional copy: subscription **may** become active shortly. |
| **`subscription_error`** | **Same minimal path** (canonical description under **Read-only account summary** below). **Top-up** CTA **disabled** with explanation; balance visible when relevant. |
| **`full_app`** | **Full account settings** (profile, security, credits, Mercado Pago actions, export, delete) as specified in the rest of this PRD. |

**Invariant:** **`export-user-data`** and **`delete-account`** entry points exist **only** after **email verified**; they are **absent** on **`verify_email`**.

### Two distinct billing-related actions

1. **Manage or cancel subscription (Mercado Pago):** directs the user to **Mercado Pago** (or an integrated flow) to **stop renewal / manage payment methods** as allowed by the integration. **Obra’s displayed subscription state does not change** until **authoritative backend state** updates via **webhooks** and/or **`reconcileSubscription`** (same source-of-truth model as `signup-onboarding`). Optional copy: if the user completed an action in MP, **status may take a short time to update**; provide **“Refresh status”** (or equivalent) consistent with the activating shell pattern.

2. **Delete account:** **strong confirmation** (e.g. re-enter email or confirmation phrase per `PRD_Obra.md` §15). **Precondition:** the user’s subscription must be **resolved** from Obra’s perspective—**not active in Mercado Pago** without a defined path to terminate (either the user has already cancelled via MP and backend reflects it, or the **delete-account** capability **cancels via API** as part of the flow, **idempotently**, before purge). If **Mercado Pago operations fail** (timeout, API error), **abort**: **do not** delete Auth, profile, projects, or Storage; return a **clear, actionable error**. **No** “deleted account” state while **billing could still run**.

**There is no read-only product access** outside **`full_app`**: **`pending_subscription`**, **`activating`**, and **`subscription_error`** do **not** expose dashboard, editor, or wizard (`signup-onboarding`). **Top-up credits** stay on the ledger but are **not usable** until subscription is active again; messaging stays consistent across shells and settings.

### Read-only account summary (minimal account path)

On **`pending_subscription`**, **`activating`**, and **`subscription_error`** shells, within the **shared minimal account / privacy path**, show the **same read-only summary** (no project/editor access):

- **Email** displayed **masked** (e.g. `j***@domain`) for shared-device safety.
- **Linked sign-in methods** listed **read-only** (e.g. “Google connected”) — **no unlink** on this shell.
- **Credit balance** and a **one-line policy** that credits are **retained** but **not consumable** until subscription is active again (consistent with `signup-onboarding`).
- **Subscription status** copy derived from **authoritative backend** state, plus **“Refresh status”** (reconciliation), same source-of-truth rules as elsewhere.

### Profile and preferences (full product entitlement)

When the user is in the **full app** entitlement state, **account settings** expose at least:

- **Display name** (or equivalent profile field aligned with architecture).
- **Account identity summary** (email **unmasked** or as appropriate for settings, linked providers).
- **`ui_locale`** switch (`es` / `pt-BR`), persisted on the account; immediate UI language update per product rules.
- **Security:** **change password** (email/password accounts); **set password** flow for **OAuth-only** users who need a password as a backup sign-in method (Supabase-supported patterns).
- **Identity linking** (e.g. connect Google): behavior and errors per `signup-onboarding` (**no** automatic merge of duplicate accounts in v1.0).
- **Unlink OAuth / remove provider:** allowed **only** if at least **one other verified sign-in method** remains (password or another provider). **Never** leave the user with **zero** valid sign-in methods; UI explains **add password or link another provider first**. Align with Supabase Auth capabilities.
- **Email change** (in-app): Supabase Auth flows; pending verification returns user to **verification-class shell** behavior per `signup-onboarding` (**no** new checkout or top-up until resolved). **Email change** remains a **full-app** flow unless legal later requires otherwise.

**Tour and first-run flags** that live on the profile (e.g. tour dismissed) remain owned by the same persistence model as `signup-onboarding`; this PRD does not redefine tour content.

### Credits: balance, usage history, and top-up

- **Balance:** visible in **full app** settings (credits section) and in the **read-only summary** on **`pending_subscription`**, **`activating`**, and **`subscription_error`** (copy may reflect **zero** or **not yet active** where the user has never had an active cycle).
- **Usage history (v1):** **paginated** list of **ledger events** exposed to the user: **timestamp**, **delta** (credit purchase vs consumption), **human-readable reason** mapped from internal operation types, and **project** (or artifact reference) **when already available** on the ledger without expensive joins. Apply a **bounded window or row cap in the UI** (e.g. last **90 days** or **N** rows) with optional copy directing older inquiries to **support** if needed.
- **Top-up purchase:** **only** when subscription is **active** (`signup-onboarding` alignment). In **full app**, a clear **CTA** starts checkout (Mercado Pago — details in master PRD §11). On **`pending_subscription`**, **`activating`**, and **`subscription_error`**, the **top-up CTA is disabled** with short explanation; balance remains visible where applicable (e.g. retained credits on **`subscription_error`**).

### Data export and delete by entitlement

**Export my data** and **Delete account** MUST **not** be offered on **`verify_email`**.

They MUST remain **reachable** on **`pending_subscription`**, **`activating`**, and **`subscription_error`** for an **authenticated**, **email-verified** user, via the **shared minimal account / privacy path** that does **not** expose projects, editor, or wizard. That path **includes** the **read-only account summary** above. **Delete account** remains subject to **Mercado Pago** preconditions elsewhere in this PRD.

**Full preference editing**, **password/email/OAuth unlink**, **usage history**, and **top-up checkout** are **`full_app` only** (minimal shells use **disabled top-up** messaging as above). **Export and erasure** must **not** be gated behind an **active subscription** (they are allowed on minimal shells once email is verified).

### Export before delete

**Recommend** downloading data **before** deletion (prominent CTA and short explanation). **Do not** require export as a **hard prerequisite** for deletion (portability and erasure are parallel rights; blocking deletion increases friction and support). If export is **asynchronous** and the account is **deleted** before the job completes, the job MUST **fail safely** (no partial leak of data to a deleted identity); document the edge case for **support**.

### Observability for support

Persist or otherwise record **subscription reconciliation metadata** (e.g. **last reconciliation timestamp**, **outcome**, and **Mercado Pago subscription identifier** when applicable) so support and incident response can answer “cancelled in MP but UI still active” without guessing. Align **smoke tests** and **operations docs** with these states.

---

## User Stories

### Profile and preferences (full app)

1. As a **subscriber**, I want to **see and edit my display name**, so that the product feels personal and exports reflect my identity where applicable.
2. As a **user**, I want to **switch app language** (`es` / `pt-BR`) from settings, so that the UI matches my preference persistently.
3. As a **user**, I want **account settings** grouped logically (profile, security/identity, billing/credits, data & privacy), so that I find actions without hunting.
4. As a **user on a small screen**, I want **settings** to be **usable and readable**, so that I can complete critical actions on mobile.
5. As a **user**, I want to **see my email and linked providers** in settings, so that I understand how I sign in.

### Verify email shell (`verify_email`)

6. As a **user who has not verified my email**, I want **no entry points to export or delete my account**, so that unverified inboxes cannot trigger portability or erasure flows.
7. As a **user who has not verified my email**, I want to stay in the **verification flow** (resend, help, sign out) per `signup-onboarding`, so that I complete identity proof before account-level data actions.

### Read-only summary (minimal path: `pending_subscription`, `activating`, `subscription_error`)

8. As a **user** on **`pending_subscription`**, **`activating`**, or **`subscription_error`**, I want to **see my masked email and linked providers (read-only)** on the account path, so that I know which account I am in without unlocking the product.
9. As a **user** on those shells, I want to **see my credit balance and policy copy** appropriate to state (e.g. not yet active, activating shortly, or retained but locked until billing is fixed), so that expectations stay clear.
10. As a **user** on those shells, I want **subscription status and “Refresh status”** on that path, so that I can recover after Mercado Pago or webhook delay.
11. As a **user** on **`activating`**, I want **optional copy** that my subscription **may** complete soon, so that I understand the transient state.

### Security and identity (full app)

12. As a **user with email/password**, I want to **change my password** from settings, so that I can keep my account secure.
13. As a **user who signed up with OAuth only**, I want to **set a password** as a backup sign-in method, so that I can still access Obra if the provider has an issue.
14. As a **user**, I want **unlinking a provider blocked** unless another sign-in method exists, so that I never lock myself out without support.
15. As a **user**, I want **clear guidance** to add a password or another provider **before** unlinking, so that I understand why the action is disabled.

### Credits (full app and minimal path shells)

16. As a **subscriber**, I want to **see my available credits** in settings, so that I can plan AI usage.
17. As a **subscriber**, I want a **paginated usage history** (time, amount, reason, project when available), so that I understand what consumed credits.
18. As a **subscriber**, I want to **buy a top-up** from the credits section when my subscription is active, so that I can extend usage without friction.
19. As a **user** on **`pending_subscription`**, **`activating`**, or **`subscription_error`**, I want the **top-up action disabled with explanation** while still seeing balance when relevant, so that expectations match billing rules.

### Subscription management (Mercado Pago)

20. As a **subscriber**, I want a **clear action to manage or cancel my subscription** via **Mercado Pago**, so that I control renewal without confusing it with deleting my Obra account.
21. As a **user**, I want the app to **not claim “cancelled”** until **Obra’s backend** reflects it, so that I trust the status I see.
22. As a **user**, after acting in **Mercado Pago**, I want **short guidance** that **status can take a moment to update**, and a **“Refresh status”** action, so that I am not stuck if webhooks lag.
23. As a **user whose subscription is invalid**, I want **the same honest rules** (no tool access; credits retained but locked) **reflected in help copy** if I visit billing-related help from settings, so that expectations stay consistent.

### Subscription vs account deletion

24. As a **user**, I want **“Delete account”** clearly **separate** from **“Cancel subscription”**, so that I do not lose data when I only meant to stop paying.
25. As a **user**, I want **deletion to be impossible** while Obra considers my **Mercado Pago subscription still active** without a proper close path, so that I am not charged after I thought I left.
26. As a **user**, if **Mercado Pago** fails during deletion, I want my **account to remain** with a **clear error**, so that I can retry or contact support without silent failure.

### Data rights (export and delete)

27. As a **user**, I want **“Export my data”** from settings when entitled to the minimal path or **full app**, so that I can exercise **portability** (`PRD_Obra.md` §15 B).
28. As a **user** who is **email-verified** but **not** in **full app** (`pending_subscription`, `activating`, `subscription_error`), I want **export and delete account** on the **minimal path**, so that **data rights** are not blocked by billing or activation delay.
29. As a **user**, I want to be **nudged to export before delete** without being **forced**, so that I can leave quickly if I choose.
30. As a **user deleting my account**, I want **strong confirmation** (e.g. type email or phrase), so that I do not delete by mistake.
31. As a **user**, after **successful deletion**, I want to know **that the session is ended** and **what to expect** (e.g. cannot log in), so that I am not confused by stale UI.

### Identity and email (alignment with signup-onboarding)

32. As a **user with email login**, I want to **link Google** (or another provider) from settings when in full app, so that I can sign in multiple ways.
33. As a **subscriber changing email**, I want **re-verification** behavior as defined in `signup-onboarding`, so that security and billing identity stay coherent.

### Accessibility, i18n, and trust

34. As a **user**, I want **settings, export, and delete flows** to meet **WCAG 2.1 Level A** with **AA aspiration** on critical controls, consistent with `PRD_Obra.md` §4.
35. As a **user**, I want **all copy** in my **`ui_locale`**, so that legal and billing-adjacent screens are understandable.

### Operations

36. As **support**, I need **predictable states** (subscription snapshot, last reconcile) to diagnose tickets, so that resolution time drops.
37. As a **product owner**, I want **smoke tests** to cover **settings → MP manage**, **refresh status**, **export**, **delete preconditions**, **OAuth unlink guard**, **top-up gating**, **verify_email without export/delete**, and **minimal path parity** across **`pending_subscription`**, **`activating`**, and **`subscription_error`**, so that regressions are caught before launch (`PRD_Obra.md` §16).

---

## Implementation Decisions

- **Settings architecture:** Split **surfaces** conceptually into (a) **full account settings** (**`full_app` only**), and (b) **shared minimal privacy/account path** (read-only **account summary** + export + delete + sign out + help + **disabled top-up** messaging), reachable from **`pending_subscription`**, **`activating`**, and **`subscription_error`**, without loading product routes. **`verify_email`:** **neither** full settings **nor** export/delete — verification shell only per `signup-onboarding`.

- **Subscription status display:** The client reads **only** backend-derived fields (or a small DTO from **`reconcileSubscription`** / read model). **No** optimistic transition to “cancelled” based on opening Mercado Pago.

- **Delete-account orchestration:** A **single server-side capability** (Edge Function or equivalent) performs **ordered steps**: verify **preconditions** (subscription not active in MP without successful cancel path), **cancel subscription in Mercado Pago** if that is the chosen integration pattern, then **purge** profile, user-owned rows, Storage objects, and **Auth user**, per legal/architecture ordering. **Idempotency** and **partial failure** behavior MUST be defined (failure before purge → **no** data removal; no duplicate charges).

- **Export-user-data:** **Asynchronous** generation with **signed download** when volume is large; **job cancellation or failure** if the requesting user no longer exists after delete. **Auth:** only the authenticated subject’s data.

- **Re-authentication:** **Delete account** (and optionally **export** for high sensitivity) may require **recent session** or **step-up** per security policy; align with architecture note that **delete-account** must not be trivially callable without strong confirmation (and re-auth if required).

- **Profile schema:** **Extended profile** fields (`full_name`, `ui_locale`, tour flags, etc.) remain the **persistence layer** for preferences; subscription fields live in **subscription / billing tables** updated by **webhooks** and **reconciliation**, not duplicated as informal “plan” strings without sync rules.

- **Security module (client + Auth):** wraps Supabase **update password**, **set password** (OAuth-only), **change email**, **link/unlink identity**; enforces **“at least one sign-in method”** before **unlink** in UI and validates server responses. Hides provider-specific edge cases behind **stable error codes** for copy.

- **Credits presentation module:** reads **balance** and **paginated ledger slice** from a **narrow API** (or RPC) that returns **user-safe labels** for consumption reasons; applies **UI window/row cap**; does **not** embed raw internal job IDs in user-visible strings unless needed for support flows.

- **Top-up orchestration:** reuses the same **Mercado Pago checkout builder** pattern as initial subscription where applicable; **guarded** so the client **never** shows an enabled top-up path unless **subscription active** predicate is true (server must enforce on checkout creation too).

- **Deep modules:**  
  - **Account settings composer:** routes and layout only; depends on narrow hooks/services.  
  - **Billing actions adapter:** builds Mercado Pago links or API calls; hides MP SDK details from UI.  
  - **Privacy actions service:** triggers export job and delete-account flow; surfaces **typed errors** to UI.  
  - **Entitlement resolver** remains the **single gate** for **full app**; **`pending_subscription`**, **`activating`**, and **`subscription_error`** use **minimal routes** for account/privacy only; **`verify_email`** exposes **no** export/delete routes.

- **Conflict resolution:** If master PRD or `signup-onboarding` contradicts this document on **shell behavior** or **reconciliation**, **master PRD** and **`ARQUITECTURA_Obra.md`** take precedence; update this PRD after upstream changes.

---

## Testing Decisions

- **Principle:** Test **observable behavior**—which screens appear, which actions are enabled, API error handling—not internal timers or Mercado Pago SDK internals.

- **Table-driven / contract tests:** Preconditions for **delete-account** (subscription states × MP API outcomes) → **expected** HTTP result and **side effects** (no Auth delete on MP failure).

- **Modules to prioritize:** Privacy actions service (export + delete), billing adapter (link generation), **security/identity** flows (unlink guard), **credits API + pagination**, and routing guards that **expose** export/delete + **read-only summary** on **`pending_subscription`**, **`activating`**, and **`subscription_error`** while **hiding** those entry points on **`verify_email`**, without exposing **projects**.

- **E2E / smoke (manual or Playwright):** Full app → open **manage subscription** → return → **refresh status**; **`verify_email`** → **no** export/delete entry points; **`pending_subscription`** / **`activating`** / **`subscription_error`** → **same** minimal path (export reachable, masked email, read-only providers); **delete** blocked when subscription still active per MP rules; subscription inactive → **delete** succeeds; **MP failure** simulated in staging → account still works; **unlink** disabled when only one method; **top-up** disabled on minimal shells and enabled only with active sub in **full app**; **usage history** pagination smoke.

- **Prior art:** Extend `docs/operations/smoke-test.md` under **account / privacy** headings when this feature ships; align with `signup-onboarding` testing decisions for reconciliation.

---

## Out of Scope

- **Mercado Pago webhook** implementation details, **idempotency keys**, **pack prices**, and **preference/checkout payload** internals (master PRD §11 and architecture).
- **Legal copy** (terms, refund policy): **counsel review** required; this PRD does not fix final strings.
- **Automatic merge** of duplicate user accounts.
- **Team / multi-seat** accounts.
- **In-app invoice history** beyond what Mercado Pago exposes or a future billing PRD defines.

---

## Further Notes

- **Legal grace period** after delete request: if counsel requires a **delayed purge**, **adjust** delete flow and **Terms**; default assumption here is **immediate purge** after successful server-side completion unless policy overrides.

- **Metrics:** Track **settings visits**, **MP manage clicks**, **refresh status** usage, **export starts/completions**, **delete attempts/success/failures** (without PII in event names) to improve copy and support load.

- Any **new** account-level preference should declare whether it is **full-app only** or also needed in **minimal privacy** routes to avoid accidental entitlement leaks.

- **Ledger display hygiene:** user-visible **reason** strings should avoid leaking **internal-only** or sensitive metadata; align **support** tooling if operators need richer fields than the end user sees.
