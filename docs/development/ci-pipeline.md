# CI pipeline — expectations and open choices

**Aligned with:** PRD §16 (QA model B — Playwright, few E2E specs).

---

## Goal

- Run **lint and unit tests** (when present) on every push or PR to the main integration branch.
- Run **Playwright** (`e2e/`) **before merge** to the default branch or on a nightly schedule — exact trigger is **TBD** by the team.

---

## E2E (Playwright)


| Topic        | Recommendation                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| **Scope**    | 1–3 stable flows (e.g. login, create project, one wizard step).                                 |
| **AI**       | Prefer **mocked** AI responses in CI; optional staging job with real APIs and cost cap.         |
| **Secrets**  | Staging Supabase URL, anon key, test user credentials — store as CI secrets, never in the repo. |
| **Blocking** | Do not block MVP on a perfect pipeline; add gates as flakiness drops.                           |


---

## Open decisions (record here when closed)


| Decision                  | Options                                         | Chosen |
| ------------------------- | ----------------------------------------------- | ------ |
| When to run E2E           | On every PR / on merge to `main` / nightly only | *TBD*  |
| Required checks for merge | Lint only / Lint + E2E                          | *TBD*  |
| Staging environment       | Dedicated Supabase project vs preview deploy    | *TBD*  |


---

## Related

- Repository layout: `e2e/` (see [`../architecture/frontend.md`](../architecture/frontend.md)).
- Manual smoke checklist remains mandatory before production deploys (PRD §16).