# Vercel — Obra frontend (obra)

**Aligned with:** `ARQUITECTURA_Obra.md` (§1.1 hosting, §9 env vars), `CLAUDE.md`, GitHub issue #30.

This document describes how to connect **Vercel** to this repository, configure the **Obra** SPA build, map **Preview** vs **Production** environment variables, and enable **preview deployments** for pull requests. **Do not commit secrets** — store values only in the Vercel dashboard (or other approved secret stores), never in git.

---

## Vercel project status

**Provisioned (MCP-verified):** Obra is linked on Vercel as project `**obra-app`**.


| Field                   | Value                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Vercel project name** | `obra-app`                                                                                                                |
| **Project ID**          | `prj_IjtXjDUoRb2EdfsT2Lp4dq2f6r84` (use with Vercel MCP / API)                                                            |
| **Team**                | Digital Craft — slug `digitalcraftprojects`, id `team_4yfwtYp0kPLHXJ2QeZoQs551`                                           |
| **Default hostnames**   | `obra-app-nu.vercel.app`, `obra-app-digitalcraftprojects.vercel.app`, `obra-app-git-main-digitalcraftprojects.vercel.app` |


**Latest snapshot from `get_project`:** most recent **production** deployment **READY** (Vercel-assigned URL pattern `*.vercel.app`). `**live`** flag in API may still be `false` until a custom domain or go-live step is completed—check the dashboard for the canonical public URL.

**Still validate in dashboard:** **Root Directory** = `**obra`**, framework / build commands, and **Environment Variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) on **Preview** and **Production**. Re-check anytime with Vercel MCP (`list_projects`, `get_project`, `list_deployments`).

---

## Monorepo layout

This repository is a **light monorepo**: product specs and engineering docs live at the **repository root** (`PRD_Obra.md`, `features/`, `ARQUITECTURA_Obra.md`, `docs/`, etc.). The **web application** lives under `**obra/`** (React + Vite + TypeScript per architecture).

**Recommended Vercel project setting:** set **Root Directory** to `**obra`**. That makes the install/build run from the app folder and avoids guessing paths in a single root-level `package.json`.

---

## Build settings (Vite)

Configure these in the Vercel project (**Settings → General → Build & Development Settings**), or rely on auto-detection once Root Directory is `obra` and the app exists.


| Setting              | Value                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework Preset** | Vite (or “Other” with the commands below if detection fails)                                                                                                                            |
| **Install Command**  | If `obra/pnpm-lock.yaml` exists: `pnpm install` (frozen: `pnpm install --frozen-lockfile`). If `obra/package-lock.json` exists: `npm ci`. If only `package.json` exists: `npm install`. |
| **Build Command**    | `pnpm run build` or `npm run build` (match the package manager used for install)                                                                                                        |
| **Output Directory** | `dist` (Vite default)                                                                                                                                                                   |


**Note:** The `obra/` app ships a Vite + React build (`npm run build` → `dist/`). Keep **Root Directory** set to `**obra`** so Git-triggered builds run the app toolchain.

**Optional `vercel.json`:** If you need to pin settings in-repo, place a minimal `vercel.json` **inside `obra/`** (same folder as the Vercel root). Do **not** duplicate conflicting settings at the repository root when Root Directory is `obra` — Vercel reads config from the configured root. A root-level `vercel.json` is only useful if the Vercel **Root Directory** is the repository root (not recommended for this repo).

---

## Environment variables — Preview vs Production

Use the **same variable names** in **Preview** and **Production**; only the **values** differ (e.g. staging vs production Supabase projects, or one shared dev project for previews — team choice).

### Browser / Vite client (required on Vercel for obra)

The Supabase JS client in the Vite app reads `**import.meta.env`**. Per `ARQUITECTURA_Obra.md` §9, configure:


| Variable name            | Environment scopes on Vercel                | Notes                                                                     |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Production, Preview, Development (optional) | Public Supabase project URL                                               |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development (optional) | **Anon** key only — safe to expose to the browser; never commit the value |


**Coordination with issue #27 / `docs/infrastructure/supabase.md`:** Issue #27 documents generic names `SUPABASE_URL` and `SUPABASE_ANON_KEY` for project reference and non-Vite contexts. Those refer to the **same logical** URL and anon key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the `**VITE_` prefix** is **required** for Vite so variables are included in the client bundle. Set the Vercel entries to the same values you use for the Supabase project described in `supabase.md`.

**Secrets:** Enter values only in **Vercel → Project → Settings → Environment Variables**. Do not put real keys in `.env` files committed to the repo. The **service role** key and other server-only secrets **must not** be prefixed with `VITE_` and must not be shipped to the browser — they belong in Supabase Edge Function secrets or server-side config, not in the Vercel env for the static/SPA build unless you add a server runtime later.

---

## Preview deployments for pull requests

1. In Vercel, connect the GitHub repository (**Add New… → Project → Import**).
2. Enable **Git Integration** so every push and pull request triggers builds.
3. Set **Root Directory** to `obra` and confirm Preview deployments are enabled (default for Git-connected projects).
4. **Do not** store secrets in the repository (no `.env.production` with real keys in git). Use Vercel’s environment UI per environment.

**Verification:** Open a test PR and confirm a **Preview** deployment appears in the Vercel dashboard and the deployment URL loads. Confirm **Production** after merging to the production branch (typically `main`). With Vercel MCP enabled, use `**list_deployments`** / `**get_deployment**` on the Obra project once it is linked.

---

## Acceptance checklist (issue #30) — verification


| Criterion                                               | How to verify                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production deploy succeeds                              | Vercel dashboard: latest Production deployment **Ready**; spot-check the live URL. **MCP:** `get_project` on `obra-app` reported a **READY** production deployment (re-run after changes). |
| Preview deploy succeeds                                 | Create or use a PR; confirm **Preview** deployment **Ready** and URL works. **MCP:** `list_deployments` filtered by preview.                                                               |
| Env vars documented (names only); secrets not committed | This file + `supabase.md`; repo has no real `.env` values.                                                                                                                                 |


---

## Related docs

- `docs/infrastructure/supabase.md` — Supabase project reference and env naming (#27)
- `ARQUITECTURA_Obra.md` §1.1, §9 — hosting and env examples
- `docs/README.md` — documentation index

