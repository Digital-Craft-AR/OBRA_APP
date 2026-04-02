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

## 2. Credits

| Step | Pass |
| ---- | ---- |
| Balance matches expectations after a known AI operation | ☐ |
| Credits **deduct only** after **successful** completion on the backend (no charge on failure) | ☐ |

---

## 3. Core happy path

Use the **minimum subset** agreed for the release if the full path is not yet available.

| Step | Pass |
| ---- | ---- |
| **Create project** (with `content_locale` as designed) | ☐ |
| **Wizard:** complete or cover agreed steps | ☐ |
| **Editor:** open project content / preview | ☐ |
| **Export:** trigger PDF (or agreed export) — success or clear error | ☐ |

---

## 4. Accessibility — keyboard (PRD §4)

| Step | Pass |
| ---- | ---- |
| **Wizard** usable **without mouse**: advance, back, focus in inputs, trigger AI assist if in scope | ☐ |

---

## 5. Legal and account (when in scope)

| Step | Pass |
| ---- | ---- |
| Privacy + Terms **reachable** from app (footer or registration flow) | ☐ |
| **Export my data** and **delete account** flows reachable and sane (PRD §15) | ☐ |

---

## 6. Performance spot check (model B — PRD §4 / §16)

| Step | Pass |
| ---- | ---- |
| Quick pass: Lighthouse or Vercel Speed Insights on **one** agreed authenticated route — no blocking regression vs last release | ☐ |

---

## 7. Notes / failures

Document failures, screenshots or log references, and whether the release was **blocked** or **rolled back**.

```
(Free text)


```

---

## Sign-off

- [ ] Smoke completed — **approved for production** this run  
- **Name / date:** _________________________
