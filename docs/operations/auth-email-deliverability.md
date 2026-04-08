# Auth email deliverability — Obra (Supabase)

**Purpose:** Operational checklist for **Supabase Auth** transactional email (confirm signup, reset password, email change, etc.).  
**Product alignment:** acquisition gates and support expectations (`PRD_Obra.md` §11; `features/signup-onboarding`).  
**Tracking:** GitHub issue **#101** (production release gate lives in that issue body).

---

## What “production-ready” means here

Do **not** treat Auth email as cleared for a **public launch** until:

- DNS authentication for the **sending domain** is correct (**SPF**, **DKIM**, **DMARC** policy appropriate for the stage).
- Real test messages for the critical flows land in **Inbox** (not spam) on major providers.
- There is a short **support runbook** for “I never got the email.”

Templates and HTML styling are versioned under `supabase/email-templates/`; pushing to the hosted project can be done via Dashboard or `scripts/push-supabase-auth-email-templates.mjs`.

### Client instrumentation (browser)

The SPA emits **structured `console.info` lines** (prefix `[obra][auth]`, JSON payload, **no PII**) for:

- signup → confirm-email path vs immediate session
- resend confirmation
- `/auth/callback` PKCE `code` exchange (covers email confirmation return and OAuth code flow)

**Enable in production temporarily:** set `VITE_AUTH_EMAIL_INSTRUMENTATION=true` in Vercel (see `obra/.env.example`). Disabled under Vitest (`VITEST` / `MODE=test`).

---

## Checklist (mirror of #101)

Use the **checkbox list in GitHub #101** as the authoritative “done” definition. This doc adds **where to click** in Supabase and **what to verify** in received mail.

### 1. Sender identity

- In Supabase Dashboard → **Authentication** → **Settings** → **SMTP** (or default mailer): confirm **from name**, **from address**, and whether you use **Supabase default** vs **custom SMTP**.
- Prefer a **dedicated sending subdomain** (e.g. `mail.example.com`) once you own DNS.

### 2. SPF

- Publish/update the **SPF TXT** record for the domain that appears in the **From** header.
- Include only authorized senders (Supabase default pool and/or your SMTP provider’s instructions).
- Validate with a DNS lookup tool and with a **real sent message** (not only “record exists”).

### 3. DKIM

- Enable DKIM per your mail path (provider docs).
- Add the required **CNAME/TXT** records; wait for propagation.
- In a received message, confirm **DKIM = pass** (e.g. Gmail “Show original”).

### 4. DMARC

- Publish `_dmarc.<domain>` with a policy suited to your stage:
  - **`p=none`** + `rua=` while monitoring is acceptable early.
  - Move toward **`quarantine` / `reject`** only after SPF+DKIM are stable and you have reporting.
- Review aggregate reports at least once before calling launch email “ready,” or use a monitoring tool.

### 5. Functional proof (flows)

Trigger in **staging** and **production** as appropriate:

| Flow | What to verify |
| ---- | ---------------- |
| Confirm signup | Email arrives; link confirms user; redirect matches `Site URL` / app routes |
| Password reset | Email arrives; link allows setting a new password |
| Email change | Email to **new** address; product gating matches `signup-onboarding` / `profile` PRDs |

### 6. Support runbook (short)

When a user says they did not receive mail:

1. Check **spam/promotions** and correct inbox.
2. Confirm **same Supabase project** and **correct `Site URL`** (wrong project = wrong templates/links).
3. **Resend** after a few minutes; note Auth **rate limits**.
4. If custom SMTP: check provider **suppression/bounce** list and logs.
5. Escalate with **timestamp**, **email address** (hashed or partial in tickets), and **flow** (signup vs reset).

---

## Related docs

- [smoke-test.md](./smoke-test.md) — section **5. Auth transactional emails**
- [supabase.md](../infrastructure/supabase.md) — project ref and Auth dashboard links
