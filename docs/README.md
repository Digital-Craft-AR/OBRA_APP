# Obra — internal documentation

| Document | Purpose |
| -------- | ------- |
| [operations/incident-runbook.md](operations/incident-runbook.md) | Triage order, provider dashboards, comms rules (PRD §9) |
| [operations/smoke-test.md](operations/smoke-test.md) | Pre-production manual smoke checklist (PRD §16) |
| [development/ci-pipeline.md](development/ci-pipeline.md) | E2E / Playwright expectations and open choices (PRD §16) |
| [infrastructure/supabase.md](infrastructure/supabase.md) | Region and project reference — fill after provisioning |

**Light monorepo:** product specs and engineering docs live at the repository root (`PRD_Obra.md`, `features/`, `ARQUITECTURA_Obra.md`, `CONVENCIONES.md`, `CLAUDE.md`). The web app is intended under `obra/` when present.

For product scope start with `PRD_Obra.md` and `features/`. For implementation layout and infra, use `ARQUITECTURA_Obra.md`, `CONVENCIONES.md`, and `CLAUDE.md`.
