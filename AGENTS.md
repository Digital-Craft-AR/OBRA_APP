# AGENTS.md

## Cursor Cloud specific instructions

### Repository structure

This is a monorepo with documentation/specs at the root and the web application under `obra/`. The key references are:

- **Product scope:** `PRD_Obra.md`
- **Architecture:** `ARQUITECTURA_Obra.md`
- **UI conventions/tokens:** `CONVENCIONES.md`
- **Engineering context:** `CLAUDE.md`
- **Feature specs:** `features/` directory

### Tech stack (obra/)

React + Vite + TypeScript, shadcn/ui (base-nova style), Tailwind CSS v4, Zustand, i18next, Supabase client, React Router v7.

### Running the app

```bash
cd obra && pnpm run dev
```

Dev server starts on `http://localhost:5173` by default. Use `--host 0.0.0.0` to expose to the network.

### Lint / Build / Test

```bash
cd obra
pnpm run lint    # ESLint (flat config)
pnpm run build   # tsc -b && vite build
```

No E2E tests exist yet (Playwright is planned per `docs/development/ci-pipeline.md`).

### Tailwind v4 gotcha

Do NOT add styles to bare HTML selectors (`h1`, `p`, `a`, etc.) in global CSS outside `@layer base`. In Tailwind v4, un-layered CSS has higher specificity than utilities and silently breaks styling. See `CONVENCIONES.md` for full rules.

### shadcn/ui components

Add components via `pnpm dlx shadcn@latest add <component>` from the `obra/` directory. The `components.json` is already configured with path aliases (`@/components/ui`, etc.).

### Design tokens

All Obra colors/fonts/radii are defined in `obra/src/index.css` (`@theme` block) and mirrored in `obra/src/lib/tokens.ts`. Always use Tailwind classes (`bg-obra-blue-900`, etc.), never raw hex values.

### i18n

UI supports `es` (Spanish) and `pt-BR` (Portuguese-Brazil). Resources are in `obra/src/i18n/`. All visible text must go through `t('key')`.

### Supabase

The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `obra/.env.local` to connect to Supabase. Without these, the app still builds and renders but backend features (auth, data, storage) will not work. Edge Functions (AI, PDF, webhooks) live under `obra/supabase/functions/` (not yet created).
