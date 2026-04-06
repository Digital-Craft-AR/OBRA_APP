# Supabase — project reference

**Aligned with:** PRD §15 (compliance and hosting, user story 66 — explicit region choice), ARQUITECTURA §1.1 (datos/hosting) and §9 (environment variables).

Fill **project identity** fields **after** the Supabase project is created. Do not commit secrets (service role keys, connection strings with passwords, or any key values).

---

## Region choice and rationale

**Product target:** Initial launch in **Argentina and Brazil**, with broader **LATAM** expansion (PRD). **Architecture (§1.1)** requires choosing a Supabase region aligned with that story—**LATAM**, e.g. **South America**, when available in the Supabase dashboard.

**Rationale:**

- **Latency:** Primary users in AR/BR benefit from compute and database proximity in a South American region versus US-East or EU defaults.
- **Privacy narrative:** PRD and architecture call for an **explicit** region choice and subprocessors disclosure; documenting the chosen region here keeps engineering, legal, and the privacy policy aligned (user story 66).

**Decision framework (before the project exists):**

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **New project**, list **available regions** for the team’s org/plan.
2. Prefer **South America** (or the closest named equivalent Supabase offers, e.g. São Paulo–style region slug—**confirm the exact slug in the UI** at provisioning time).
3. If no LATAM region is available, pick the **closest acceptable** region, record the exception here, and update the privacy/subprocessor narrative with **legal review** (per existing note at the end of this file).

**After provisioning:** Replace placeholders in [Project identity](#project-identity) with the real **project ref** and **region display name / slug** from Supabase Settings → General.

---

## Project identity


| Field                           | Value                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| **Supabase project name**       | *e.g. `obra-production` — set at creation*                            |
| **Project ref** (dashboard URL) | **TBD — set after provisioning** (Settings → General → Reference ID) |
| **Region**                      | **TBD — set after provisioning** (target: LATAM / South America per above) |
| **Organization**                | *Supabase org name — set after provisioning*                          |

**Dashboard links (after ref is known):**

- **Project home:** `https://supabase.com/dashboard/project/<project-ref>`
- **API settings (URL, anon key reference — copy values only into secret stores):** Project → **Settings** → **API**
- **Database:** Project → **Database**
- **Edge Functions:** Project → **Edge Functions**
- **Auth:** Project → **Authentication**
- **Storage:** Project → **Storage**
- **Status / incidents:** [Supabase status](https://status.supabase.com/)

---

## Environment variables (names only)

**Convention (Obra frontend):** The stack is **React + Vite** (`CLAUDE.md`, `ARQUITECTURA_Obra.md` §9). Public client config uses the **`VITE_` prefix** so Vite exposes them to the browser build. Do **not** add a `VITE_` prefix to secrets that must never ship to the client.

| Variable                 | Client (browser) | Purpose |
| ------------------------ | ---------------- | ------- |
| `VITE_SUPABASE_URL`      | Yes              | Supabase project URL (HTTPS). |
| `VITE_SUPABASE_ANON_KEY` | Yes              | Supabase **anon** public key; safe for client with **RLS** enforced. |

**Service role (server / Edge only):**

| Variable                     | Client (browser) | Purpose |
| ---------------------------- | ---------------- | ------- |
| `SUPABASE_SERVICE_ROLE_KEY`  | **Never**        | Bypasses RLS; **only** Supabase Edge Functions, trusted server jobs, or CI secrets—**never** Vite, never Vercel env vars consumed by the SPA bundle. Configure via **Supabase Dashboard** (Edge Function secrets) or your server secret store—not in `.env` files committed to git. |

If the codebase later introduces **server-side** calls on **Vercel** (e.g. Route Handlers) that need admin access, mirror the same rule: store the service role only in Vercel **server** secrets, never as `VITE_*`.

### Matrix: where to set each name (values = secret stores only)

| Name                         | Local dev              | Vercel Preview | Vercel Production |
| ---------------------------- | ---------------------- | -------------- | ----------------- |
| `VITE_SUPABASE_URL`          | `.env.local` (or team-standard local file; gitignored) | Project → Settings → Environment Variables → **Preview** | Same → **Production** |
| `VITE_SUPABASE_ANON_KEY`     | `.env.local` (gitignored) | Preview        | Production        |
| `SUPABASE_SERVICE_ROLE_KEY`  | Not in frontend `.env`; only where Edge/local Deno tooling expects it (e.g. Supabase CLI secrets / Dashboard) | Only if a **server** workload on Vercel needs it (unusual for default Obra shape); never for static SPA env | Same as Preview |

**Preview vs Production:** Use **separate** Supabase projects if you want data isolation between staging and production; otherwise use one project and accept shared data (not recommended for production-like QA). Document the team choice next to the table when decided.

Issue **#30** (Vercel) should use the **same variable names** above for the Vite app so Preview and Production stay consistent with this doc.

---

## Policy (MVP)

- **PITR / continuous backups:** enable if included in the paid tier (PRD §15 D).
- **Edge Functions:** deployed from `supabase/functions/` (see architecture doc).
- **Storage:** buckets and RLS policies as per application design — document bucket names here if useful for ops.

```
Buckets (fill when defined):
- 
```

---

## External logical backups

- Scheduled `pg_dump` or native export to encrypted storage outside the single production account (PRD §15 D).
- **Storage objects:** sync or export strategy — *TBD automation details*.

---

## Environment variable names (coordination with Vercel / obra)

Issue **#27** calls out these **logical** names for documentation and non-Vite tooling (values only in secret stores):

- `SUPABASE_URL` — project API URL  
- `SUPABASE_ANON_KEY` — anon (public) key  

The **Vite** app under `obra/` must use the **`VITE_` prefix** so the client bundle receives them: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as above). See [`vercel.md`](vercel.md) for Preview vs Production on Vercel (issue **#30**).

---

## Notes

- If region choice changes before launch, update this file and the privacy / subprocessors list with legal review.
