---
name: prd-to-issues
description: Breaks a PRD into independently grabbable GitHub issues using tracer-bullet vertical slices (HITL vs AFK). Use when the user wants to convert a PRD to issues, create implementation tickets, break down a PRD into work items, or plan vertical-slice delivery.
---

# PRD to Issues

Break a PRD into independently grabbable GitHub issues using **vertical slices** (tracer bullets): each issue is a thin end-to-end path, not a horizontal layer.

## Process

### 1. Locate the PRD

Ask the user for the PRD **GitHub issue number** (or URL).

If the PRD is not already in context, fetch it:

```bash
gh issue view <number> --comments
```

If the canonical PRD lives in the repo (e.g. `PRD_Obra.md` or `features/<feature>/<feature>.md`), read that file when it matches the issue the user named, and still treat the GitHub issue as the **parent** for linking child issues unless the user says otherwise.

### 2. Explore the codebase (optional)

If the codebase has not been explored yet, explore enough to align slices with current architecture and avoid duplicate or impossible work.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice through **all** integration layers end-to-end—not a horizontal slice of one layer only.

Slices may be **HITL** or **AFK**:

| Type | Meaning |
|------|--------|
| **HITL** | Needs human interaction (e.g. architecture decision, design sign-off) before or during implementation |
| **AFK** | Can be implemented and merged without blocking on a human gate |

Prefer **AFK** over **HITL** where possible.

**Vertical slice rules**

- Each slice delivers a narrow but **complete** path through every relevant layer (e.g. schema, API, UI, tests—whatever the stack requires).
- A completed slice is **demoable or verifiable** on its own.
- Prefer **many thin slices** over few thick ones.

### 4. Quiz the user

Present the proposed breakdown as a **numbered list**. For each slice include:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses (use the PRD’s numbering/labels)

Ask the user:

- Does the granularity feel right (too coarse / too fine)?
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are HITL vs AFK labels correct?

Iterate until the user **approves** the breakdown.

### 5. Create the GitHub issues

For each approved slice, create an issue with `gh issue create` (set title and body via flags or stdin per CLI preference).

**Order:** create issues in **dependency order** (blockers first) so real issue numbers can be filled into **Blocked by** on dependent issues.

**Do not** close or edit the parent PRD issue except to add links if the user explicitly asks.

## Issue body template

Use this structure for each slice issue (replace placeholders):

```markdown
## Parent PRD

#<prd-issue-number>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating long content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or: **None — can start immediately** if no blockers.

## User stories addressed

Reference by number/label from the parent PRD:

- User story 3
- User story 7
```

## Quick checklist

- [ ] PRD loaded (issue and/or repo file)
- [ ] Slices are vertical, demoable, and dependency-ordered
- [ ] User approved granularity, dependencies, and HITL/AFK
- [ ] Issues created with template; blockers reference real `#` numbers
- [ ] Parent PRD issue left unchanged (unless user requested otherwise)
