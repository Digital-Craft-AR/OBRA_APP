# Obra — internal documentation

| Document | Purpose |
| -------- | ------- |
| [operations/incident-runbook.md](operations/incident-runbook.md) | Triage order, provider dashboards, comms rules (PRD §9) |
| [operations/smoke-test.md](operations/smoke-test.md) | Pre-production manual smoke checklist (PRD §16) |
| [development/ci-pipeline.md](development/ci-pipeline.md) | E2E / Playwright expectations and open choices (PRD §16) |
| [infrastructure/supabase.md](infrastructure/supabase.md) | Region and project reference — fill after provisioning |
| [architecture/backend.md](architecture/backend.md) | Backend architecture: data, edge functions, and reliability |
| [architecture/frontend.md](architecture/frontend.md) | Frontend architecture: app modules, state, and UX constraints |
| [architecture/business_logic.md](architecture/business_logic.md) | Domain lifecycle rules and invariants across flows |
| [architecture/project-ebook-data-model.md](architecture/project-ebook-data-model.md) | Shared UML for project/ebook schema |

**Light monorepo:** product specs and engineering docs live at the repository root (`PRD_Obra.md`, `features/`, `ARQUITECTURA_Obra.md`, `CONVENCIONES.md`, `CLAUDE.md`). The web app is intended under `obra/` when present.

For product scope start with `PRD_Obra.md` and `features/`. For implementation layout and infra, start with `ARQUITECTURA_Obra.md` and then use the domain architecture docs under `docs/architecture/`, plus `CONVENCIONES.md` and `CLAUDE.md`.
