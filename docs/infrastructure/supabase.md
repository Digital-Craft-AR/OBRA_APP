# Supabase — project reference

**Aligned with:** PRD §15 (compliance and hosting, user story 66 — explicit region choice), ARQUITECTURA §1.1 (datos/hosting) and §9 (environment variables).

Do not commit secrets (service role keys, connection strings with passwords, or any key values). **Publishable** project URL and **reference ID** below are safe to version (they appear in client config patterns); **anon** and **service_role** keys stay in secret stores only.

---

## Region choice and rationale

**Product target:** Initial launch in **Argentina and Brazil**, with broader **LATAM** expansion (PRD). **Architecture (§1.1)** requires choosing a Supabase region aligned with that story—**LATAM**, e.g. **South America**, when available in the Supabase dashboard.

**Rationale:**

- **Latency:** Primary users in AR/BR benefit from compute and database proximity in a South American region versus US-East or EU defaults.
- **Privacy narrative:** PRD and architecture call for an **explicit** region choice and subprocessors disclosure; documenting the chosen region here keeps engineering, legal, and the privacy policy aligned (user story 66).

**At provisioning (or if the region is ever changed):**

1. In [Supabase Dashboard](https://supabase.com/dashboard) → project **Settings → General**, confirm **Region** matches the LATAM intent above (or document any approved exception).
2. If no LATAM region was available when the project was created, record the exception in the [Project identity](#project-identity) table and update the privacy/subprocessor narrative with **legal review** (per note at end of file).

**MCP note:** Cursor’s **Supabase MCP** must be linked to this same project ref (`spmnqozkpjhcskxnavbf`) in **Cursor Settings → MCP** (re-auth or select project) so tools like `get_project_url` match this doc. The MCP does **not** return the dashboard **region** label; copy the region string from **Settings → General** into this doc when you need a single written source of truth for legal/PRD alignment.

---

## Project identity


| Field                          | Value                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Supabase project name**      | **obra** (per team; confirm display name in dashboard if it differs)                             |
| **Project ref** (Reference ID) | `spmnqozkpjhcskxnavbf`                                                                           |
| **Project API URL**            | `https://spmnqozkpjhcskxnavbf.supabase.co` (same value as `VITE_SUPABASE_URL` / `SUPABASE_URL`)  |
| **Region**                     | **Confirm in dashboard** — Settings → General → Region (target: LATAM / South America per above) |
| **Organization**               | *Set to your Supabase org display name when documenting for ops*                                 |


**Dashboard links:**

- **Project home:** `https://supabase.com/dashboard/project/spmnqozkpjhcskxnavbf`
- **API settings (URL, anon key reference — copy values only into secret stores):** Project → **Settings** → **API**
- **Database:** Project → **Database**
- **Edge Functions:** Project → **Edge Functions**
- **Auth:** Project → **Authentication** (Google OAuth setup: [auth-google-oauth.md](../development/auth-google-oauth.md))
- **Storage:** Project → **Storage**
- **Status / incidents:** [Supabase status](https://status.supabase.com/)

---

## Environment variables (names only)

**Convention (Obra frontend):** The stack is **React + Vite** (`CLAUDE.md`, `ARQUITECTURA_Obra.md` §9). Public client config uses the `**VITE`_ prefix** so Vite exposes them to the browser build. Do **not** add a `VITE_` prefix to secrets that must never ship to the client.


| Variable                 | Client (browser) | Purpose                                                              |
| ------------------------ | ---------------- | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes              | Supabase project URL (HTTPS).                                        |
| `VITE_SUPABASE_ANON_KEY` | Yes              | Supabase **anon** public key; safe for client with **RLS** enforced. |


**Service role (server / Edge only):**


| Variable                    | Client (browser) | Purpose                                                                                                                                                                                                                                                                             |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | **Never**        | Bypasses RLS; **only** Supabase Edge Functions, trusted server jobs, or CI secrets—**never** Vite, never Vercel env vars consumed by the SPA bundle. Configure via **Supabase Dashboard** (Edge Function secrets) or your server secret store—not in `.env` files committed to git. |


If the codebase later introduces **server-side** calls on **Vercel** (e.g. Route Handlers) that need admin access, mirror the same rule: store the service role only in Vercel **server** secrets, never as `VITE_`*.

### Matrix: where to set each name (values = secret stores only)


| Name                        | Local dev                                                                                                     | Vercel Preview                                                                                              | Vercel Production     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `VITE_SUPABASE_URL`         | `.env.local` (or team-standard local file; gitignored)                                                        | Project → Settings → Environment Variables → **Preview**                                                    | Same → **Production** |
| `VITE_SUPABASE_ANON_KEY`    | `.env.local` (gitignored)                                                                                     | Preview                                                                                                     | Production            |
| `SUPABASE_SERVICE_ROLE_KEY` | Not in frontend `.env`; only where Edge/local Deno tooling expects it (e.g. Supabase CLI secrets / Dashboard) | Only if a **server** workload on Vercel needs it (unusual for default Obra shape); never for static SPA env | Same as Preview       |


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

The **Vite** app under `obra/` must use the `**VITE_` prefix** so the client bundle receives them: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as above). See `[vercel.md](vercel.md)` for Preview vs Production on Vercel (issue **#30**).

---

## Notes

- If region choice changes before launch, update this file and the privacy / subprocessors list with legal review.

