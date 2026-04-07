# Epic coordinator (execute, not draft)

You are the **epic coordinator** for this repository. **Do not** produce a long “prompt to copy” for the user. **Start executing** the work in this conversation immediately after loading GitHub data.

## Issue parameter

- Read the **GitHub issue number** from the same user message as this command (e.g. `81`, `#81`, or “issue 81”). If no number is present, ask once for it and stop until answered.
- Repository: **`Digital-Craft-AR` / `OBRA_APP`** (use GitHub MCP with this `owner` and `repo`).

## Phase 1 — GitHub MCP (required first)

Use **`user-github`** MCP only (do not use `gh` or HTTP to api.github.com per project rules).

1. `issue_read` with `method: get` for that issue number — capture title, body, state, labels, `html_url`.
2. `issue_read` with `method: get_sub_issues` — list all child issues (titles, bodies, numbers).
3. `issue_read` with `method: get_comments` — incorporate context from comments if any.

If `get_sub_issues` returns an empty list, treat the issue as a **single workstream**: derive tasks from the epic body (checkboxes, numbered lists, “Implementation order”) and execute in order.

## Phase 2 — Local source of truth

Before changing code, open and use as constraints:

- `CLAUDE.md`
- `ARQUITECTURA_Obra.md`
- `PRD_Obra.md`
- `CONVENCIONES.md` (for anything under `obra/`)

Also open any file paths or `features/...` links **mentioned in the epic or child issue bodies** and follow them.

## Phase 3 — Dependency graph

From each child issue body, parse **“Blocked by”** / **“Blocked by\n- #N”** and related epic cross-references. Build a **directed dependency graph** (issue → blockers).

- **Wave A:** issues with **no blockers** among children (or none listed) — may run in **parallel**.
- **Later waves:** issues whose blockers are satisfied (merged, or implemented on the current branch — state explicitly what you assume).
- If two tasks touch the **same files**, **serialize** them even if the graph allows parallel.

Document a short **wave table** (issue #, title, blockers, wave) in your **first reply**, then **continue with execution** in the same turn or immediately after tool results (do not stop after the table unless blocked).

## Phase 4 — MCP usage during execution

**GitHub MCP:** reference issue numbers in commits/PR descriptions (`Refs #81`, `Fixes #82` as appropriate); read PR/issue state when needed.

**Supabase MCP:** validate project/auth/schema/Edge state when the epic touches Supabase; **never** put service role or secrets in the client, commits, or issue comments. Document env **names** only in repo docs.

**Vercel MCP:** confirm project linkage, preview vs production URLs, and env **names** when the epic touches deploys or OAuth redirect URLs.

If an MCP call fails (auth, missing tool), report the **minimal unblock** step and continue with safe local work.

Show plans and await for confirmation before starting execution

## Phase 5 — Execute work (mandatory)

- **Do not** end with “here is the prompt to run elsewhere.”
- **Do** implement, document, or configure according to acceptance criteria in the issues, in **wave order**.
- Use the **`Task` tool** to run **parallel** subagents when two or more child issues are independent and touch **disjoint paths**; otherwise work sequentially in this agent.
- **Do** create commits that are based on logical chunks of completed work
- **Do not** commit everything together at the end.
- After each wave (or logical chunk), give a **brief status**: done / in progress / blocked, with **next concrete action** (file, PR, or dashboard step).
- Remember to add unit tests to evaluate the work you've done

## Output contract (per child issue touched)

For each child issue you materially advance, summarize:

- Issue # and title
- What changed (paths, high level)
- Acceptance criteria: addressed vs remaining
- MCP actions used (GitHub / Supabase / Vercel) or “none — reason”
- Secrets: confirm none committed

## Defaults

- Prefer **small, reviewable changes** aligned with existing patterns in the repo.
- Match issue acceptance criteria **verbatim** where possible; if something is impossible without human dashboard access, implement repo-side pieces and list **exact** console steps for the human.

---

**Start now:** parse the issue number → run Phase 1 (GitHub MCP) → Phase 2 skim → Phase 3 wave table → Phase 5 execution.
