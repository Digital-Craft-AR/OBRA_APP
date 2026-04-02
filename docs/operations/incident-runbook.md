# Incident response runbook — Obra (internal)

**Audience:** engineering / on-call.  
**Aligned with:** PRD §9 (incidents, observability), ARQUITECTURA §1.3–1.5.  
**Public status page:** not required in MVP; use in-app messaging when impact is prolonged.

---

## 1. First response (first 15 minutes)

1. **Confirm scope** — Is the issue global, regional, or isolated to one user? Reproduce from a clean session if possible.
2. **Check recent changes** — Last Vercel deployment, Supabase config change, secret rotation, Mercado Pago or webhook change.
3. **Classify severity**
   - **S1 — Payments / subscription / data integrity:** wrong charges, webhook backlog, DB corruption risk, auth outage.
   - **S2 — Core product down:** app unreachable, Edge Functions failing broadly, Storage unavailable.
   - **S3 — Degraded:** slow AI, single provider flaky, non-critical UI bugs.

---

## 2. Provider health (open dashboards in this order)

Fill in concrete URLs when accounts are finalized. Placeholders:

| Provider | What to check |
| -------- | ------------- |
| **Vercel** | Project deployments, runtime errors, recent failed builds. |
| **Supabase** | Project status, Edge Function logs, DB connections, Storage. |
| **Mercado Pago** | Webhook delivery / API status (per MP docs and dashboard). |
| **Anthropic (Claude)** | Status page / API errors in Edge Function logs. |
| **Google (Gemini / images)** | Quotas, billing alerts, API errors in logs. |

Do **not** paste user content, full prompts, or PII into tickets or shared docs (PRD §9).

---

## 3. User-facing actions

| Situation | Action |
| --------- | ------ |
| Short AI slowness or single-provider glitch | Rely on client retries and clear error copy; **no** mass email. |
| **Prolonged** failure of core flows (login, pay, export) | Prepare **banner or global notice** in the app (PRD §9). |
| **S1** — payments, subscription state wrong, or data loss risk | **User communication** (email or in-app as appropriate) after internal alignment. |

**Credits:** never charge credits for operations that did not **complete successfully** on the backend (PRD §9). Document exceptions in the incident notes.

---

## 4. Technical checks (MVP stack)

- **Webhooks (Mercado Pago):** verify Edge Function `mercadopago-webhook` logs; look for repeated 4xx/5xx or unprocessed events.
- **Edge Functions:** spike in 5xx; cold start vs code error; missing env vars after deploy.
- **Database:** connection limits, long queries, failed migrations (Supabase logs).
- **Frontend:** CDN / deployment rollback via Vercel if a bad deploy is confirmed.

---

## 5. After the incident

- **Short note** (internal): date, severity, root cause (if known), user impact, follow-ups (alert threshold, runbook tweak).
- **Restore drill:** for data-related incidents, align with backup / restore procedure (PRD §15 D) — separate from this runbook if needed.

---

## 6. Open items (fill as ops mature)

- On-call rotation and escalation contact.
- Alert channels (email vs Slack) and thresholds for webhooks, 5xx, and daily AI cost.
- Direct links to each provider dashboard for this project.
