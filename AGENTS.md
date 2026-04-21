# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Obra is a React + Vite + TypeScript SPA under `obra/`. The backend is a hosted Supabase project (Postgres, Auth, Edge Functions) — there is no local backend server to run. The `.env` file in `obra/` contains only public client-safe Supabase keys (anon key + project URL) and is committed.

### Quick reference

| Task | Command | Working directory |
|---|---|---|
| Install deps | `npm install` | `obra/` |
| Dev server | `npm run dev` | `obra/` |
| TypeScript check | `npx tsc -b` | `obra/` |
| Production build | `npm run build` | `obra/` |

- The dev server runs on **port 5173** by default (Vite). Use `npm run dev -- --host 0.0.0.0` to expose on all interfaces inside the VM.
- There is **no linter or formatter** configured in `package.json` yet — no `eslint` or `prettier` scripts exist. TypeScript type-checking (`tsc -b`) is the primary code quality check.
- There are **no automated tests** configured (no test runner, no `test` script in `package.json`).
- Always test the build before commiting, if it fails, try to solve them before notifying the user, do not commit if the build fails.

### Supabase

- Project ID: `spmnqozkpjhcskxnavbf` (hosted).
- Migrations live in `supabase/migrations/`. Edge Functions (stubs) in `supabase/functions/`.
- The Supabase CLI is **not** installed by default. Install it if you need to run migrations or deploy edge functions.

### Caveats

- The project uses **Tailwind CSS v4** via the `@tailwindcss/vite` plugin — there is no `tailwind.config.js`. Tailwind classes are imported through `obra/src/index.css`.
- `CLAUDE.md` is the authoritative project context file. `CONVENCIONES.md` governs UI/design decisions. Consult both before making changes.
