# Testing Strategy — Obra

## Overview

This document is the single source of truth for **what belongs in each test layer**, how to name and locate test files, where mocks live, and how to run tests locally and in CI.

See `.cursor/rules/testing-definition-of-done.mdc` for the agent/AI definition of done used by Cursor and Claude.

---

## Test Layers

### Unit tests

- **What:** pure functions, utility modules, isolated components with all dependencies mocked.
- **Tools:** Vitest + React Testing Library (RTL).
- **Mock strategy:** `vi.mock` / `vi.hoisted` for module-level fakes (e.g. Supabase client). No real network.
- **File naming:** `*.test.ts` / `*.test.tsx` colocated next to the source file.

### Integration tests

- **What:** user-visible flows rendered in a realistic component tree (router + i18n + auth context) with HTTP mocked at the network boundary via **MSW**.
- **Tools:** Vitest + RTL + MSW (`msw/node` server).
- **Mock strategy:** MSW handlers intercept Supabase REST / Edge Function calls; no real Supabase project is used.
- **File naming:** colocated `*.test.tsx` (same convention — the distinction is in what is mocked, not the file name).
- **Setup:** `obra/src/test/server.ts` exports the shared MSW server; `obra/src/test/setup.ts` starts/resets/closes it globally.

See `docs/testing/integration.md` for a minimal code snippet and references to live examples.

### E2E tests

- **Tool:** Playwright (Chromium). Config: `obra/playwright.config.ts`.
- **Scope:** auth, full AI wizard, upload wizard, project management (Epic #200).
- **AI calls:** intercepted via `obra/e2e/helpers/ai-intercept.ts` — no real Claude/Gemini credits consumed.
- **Backend:** `supabase start` (local Docker) with seeded test users (`npm run seed`).
- **Patterns:** see `docs/testing/e2e-patterns.md` for selector and wait conventions.

---

## File conventions

| Convention | Rule |
|---|---|
| Location | Colocated with the source file (`lib/foo.ts` → `lib/foo.test.ts`) |
| Naming | `*.test.ts` for pure TS, `*.test.tsx` for React components |
| Globals | Vitest `globals: false` — always import `describe`, `it`, `expect`, `vi` from `vitest` |
| Utilities | Shared helpers and factories live in `obra/src/test/` |

---

## Running tests

```bash
# From obra/
npm run test          # single run (used in CI)
npm run test:watch    # watch mode for development
npm run test:coverage # single run with V8 coverage report
```

---

## Coverage thresholds

Conservative initial thresholds are enforced in `vitest.config.ts`. To intentionally lower a threshold (e.g. when deferring coverage of a complex module):

1. Update the relevant threshold in `vitest.config.ts`.
2. Add a comment referencing the GitHub issue tracking the coverage debt.
3. Get the change reviewed — thresholds should only ever go up over time.

---

## Anti-patterns

| Anti-pattern | Why to avoid |
|---|---|
| Testing implementation details (spy on internal state) | Tests break on refactors without catching real bugs |
| `|| true` or `--passWithNoTests` in CI | Silently hides failures; forbidden in this repo |
| Skipping the network boundary (real Supabase calls in CI) | Flaky, slow, leaks credentials |
| Snapshot tests for large components | Noisy diffs; prefer explicit assertions |
| Placing all mocks in `__mocks__/` | Prefer `vi.mock` colocated with the test for readability |
