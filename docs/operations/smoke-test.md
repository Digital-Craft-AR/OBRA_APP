# Pre-production smoke test — Obra

**Aligned with:** PRD §4 (accessibility, perceived performance), §11 (credits), §15 (account flows), §16 (QA model B).  
**When to run:** before promoting a build to **production**, and after **infra or payment** changes.  
**Who:** deployer or designated reviewer — do not skip until soft launch is mature (PRD §16).

---

## Run metadata

| Field | Value |
| ----- | ----- |
| **Date** | |
| **Environment** | production / staging (circle one) |
| **App version or Git SHA** | |
| **Tester** | |
| **Result** | pass / fail |

---

## 1. Mercado Pago and webhooks

| Step | Pass |
| ---- | ---- |
| Subscription flow works in **sandbox** (or documented test account) | ☐ |
| At least one **credit top-up** path exercised in sandbox (if applicable in this release) | ☐ |
| **Webhooks** received and processed (check Supabase Edge Function logs / DB state for the test user) | ☐ |
| If this release touches payments: **one real** small transaction in production already validated per PRD §16 checklist | ☐ |

---

## 2. Auth transactional emails (verification/recovery/change-email)

| Step | Pass |
| ---- | ---- |
| Verification email sent successfully from signup flow (email/password) | ☐ |
| Recovery email sent successfully from forgot-password flow | ☐ |
| Change-email confirmation email sent successfully from account settings | ☐ |
| Localized content validated for `es` and `pt-BR` test users (`ui_locale`) | ☐ |
| Callback links resolve to correct app route/environment (Preview vs Production) | ☐ |
| If `hook_send_email` is enabled: hook function logs show success (no provider errors) | ☐ |

---

## 3. Credits

| Step | Pass |
| ---- | ---- |
| Balance matches expectations after a known AI operation | ☐ |
| Credits **deduct only** after **successful** completion on the backend (no charge on failure) | ☐ |

---

## 4. Core happy path

Use the **minimum subset** agreed for the release if the full path is not yet available.

| Step | Pass |
| ---- | ---- |
| **Create project** (with `content_locale` as designed) | ☐ |
| **Wizard:** complete or cover agreed steps | ☐ |
| **Editor:** open project content / preview | ☐ |
| **Export:** trigger PDF (or agreed export) — success or clear error | ☐ |

---

## 5. Accessibility — keyboard (PRD §4)

| Step | Pass |
| ---- | ---- |
| **Wizard** usable **without mouse**: advance, back, focus in inputs, trigger AI assist if in scope | ☐ |

---

## 5. Auth transactional emails (Supabase Auth)

**When:** any release that touches **Auth**, **email templates**, **SMTP/custom mailer**, or **send-email hooks**.  
**Source of truth in repo:** `supabase/email-templates/` and `scripts/push-supabase-auth-email-templates.mjs`.  
**Deliverability gate:** see [auth-email-deliverability.md](./auth-email-deliverability.md) (aligns with GitHub **#101**).

| Step | Pass |
| ---- | ---- |
| **Confirm signup:** new email/password user receives confirmation; link opens correct environment (`Site URL` / redirect) | ☐ |
| **Resend confirmation** (if exposed): second send uses updated template | ☐ |
| **Password reset:** request reset; email arrives; link completes reset in app | ☐ |
| **Change email** (when in scope): confirmation email to new address; old account state matches product rules | ☐ |
| **OAuth control:** Google (or enabled provider) path still works; no duplicate broken templates | ☐ |
| **Locales:** if still on single global template, confirm copy is acceptable; if **send-email hook** is enabled (#103), smoke both `es` and `pt-BR` paths | ☐ |
| **Inbox vs spam:** at least one send lands in **Inbox** on Gmail (and note if promotional tab) | ☐ |
| **Optional debug:** with `VITE_AUTH_EMAIL_INSTRUMENTATION=true`, confirm browser console shows `[obra][auth]` JSON for signup / resend / callback (no PII) | ☐ |

---

## 6. Legal and account (when in scope)

| Step | Pass |
| ---- | ---- |
| Privacy + Terms **reachable** from app (footer or registration flow) | ☐ |
| **Export my data** and **delete account** flows reachable and sane (PRD §15) | ☐ |

---

## 7. Performance spot check (model B — PRD §4 / §16)

| Step | Pass |
| ---- | ---- |
| Quick pass: Lighthouse or Vercel Speed Insights on **one** agreed authenticated route — no blocking regression vs last release | ☐ |

---

## 8. Notes / failures

Document failures, screenshots or log references, and whether the release was **blocked** or **rolled back**.

```
(Free text)


```

---

## Sign-off

- [ ] Smoke completed — **approved for production** this run  
- **Name / date:** _________________________
