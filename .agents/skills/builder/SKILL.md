---
name: builder
description: "Use this skill to implement a feature brief or a set of review findings as a branch + pull request on zava-storefront. Trigger when given a work item, ticket, Jira-style description, list of code-review comments to act on, or any request phrased as \"implement X\", \"fix the PR feedback\", \"apply the reviewer suggestions\", \"build this feature\", \"make this change\", or \"open a PR for\". Reads the team's security, architecture, and documentation guidelines so code already meets Zava standards. Stays within stated scope — out-of-scope discoveries are noted in the PR description, not built. Does NOT replace genesis (architecture design) or panel-review (pre-push review)."
license: MIT
metadata:
  author: "Zava Engineering"
---

# builder

Implement a work item — feature brief or review findings — as commits on a new
branch, then open or update a PR on `zava-storefront`. The code produced already
follows Zava's security, architecture, and documentation guidelines. Anything
outside the work item's scope is noted in the PR description instead of built.

## When to use this

- You have a work item: a feature brief, a ticket, a list of review findings.
- You want the agent to implement + push + open/update the PR.

## When NOT to use this

- Architecture is still open → use `genesis` first.
- Pre-push review only → use `panel-review`.
- Incident postmortem → use `incident-to-pr`.
- IaC / infra / multi-repo change → out of scope; note in PR and hand off to a human.

## Inputs

- **Required:** the work item (inline text, or file path to read).
- **Optional:** `--branch <name>` to override the generated branch name.
- **Optional:** `--pr-number <N>` to update an existing PR instead of opening a new one.

---

## Process

### Stage 0 — Re-ground (do this first, every time)

1. Read `plan.md` in the working directory if it already exists (resuming a previous
   run). Otherwise you will create it at Stage 1.
2. Read `.github/instructions/secure-coding-base.instructions.md` NOW. These rules
   are non-negotiable and must be active before any code is written.
3. Read the three team guidelines NOW — they constrain every line of code produced:
   - `docs/guidelines/security.md` — input validation, secrets, authZ, crypto, PII.
   - `docs/guidelines/architecture.md` — layer boundaries, ADRs, DB access, IaC.
   - `docs/guidelines/documentation.md` — JSDoc requirements, README, changelog.
4. Classify the work item:
   - `FEATURE BRIEF` — prose describing a new capability.
   - `REVIEW FINDINGS` — a list of changes requested on an existing branch or PR.

### Stage 1 — Plan (B4 PLAN MEMENTO)

Write `plan.md` to the working directory **before** any tool call:

```markdown
# builder plan

## Work item
<paste or paraphrase the work item>

## Classification
FEATURE BRIEF | REVIEW FINDINGS

## Branch
feat/<slug>   (for features)
fix/review-<YYYYMMDD>   (for findings)

## Goal
<one sentence: what done looks like>

## Scope boundary
IN scope:
- <item>

OUT of scope (will note in PR description):
- <none yet>

## Files likely affected
- <path>

## Todo
- [ ] Stage 0: Re-ground
- [ ] Stage 1: Plan (this file)
- [ ] Stage 2: Create branch
- [ ] Stage 3: Implement
- [ ] Stage 4: Lint gate
- [ ] Stage 5: Test gate
- [ ] Stage 6: Commit
- [ ] Stage 7: Human checkpoint
- [ ] Stage 8: Push + open/update PR
```

**Reload `plan.md` at the start of every subsequent stage.**

### Stage 2 — Create branch (S7)

```bash
git fetch origin
git checkout origin/main -b <branch-name>
git status --porcelain
```

If `git status --porcelain` returns any output, halt and report — the
working tree is dirty before you started.

### Stage 3 — Implement

Before writing any file:

1. Read every file you intend to touch first.
2. Apply the rules from `secure-coding-base.instructions.md` (already loaded).
3. If adding or modifying a **public function** in a `.ts`, `.tsx`, `.py`, `.java`,
   or `.go` file, load `.github/instructions/docs-style-guide.instructions.md` now
   and apply its docstring rules to functions you touch.
4. If touching anything under `.github/workflows/`, `infra/`, `**/*.tf`, or
   `Dockerfile*`, load `.github/instructions/ci-cd-golden-paths.instructions.md`
   now and follow its reusable-workflow and deployment-gate rules.

For each in-scope item:

- Write the change.
- After writing a file, re-read it to confirm the edit is correct.
- If you discover a necessary change that is OUTSIDE the declared scope:
  add it to `plan.md` OUT-OF-SCOPE list and continue with in-scope work.
  Do NOT implement it. If a second out-of-scope item appears, note it
  and continue — do not expand the branch further.

Update `plan.md` todo checkboxes as you complete each item.

### Stage 4 — Lint gate (S4 + S7)

```bash
npm run lint 2>&1
```

- **Green** → proceed to Stage 5.
- **Red** → fix each error; re-run. Up to **3 attempts**.
  If still red after 3 attempts: halt, report the remaining errors in a
  fenced code block, and ask the operator for guidance.
  **Do NOT proceed to Stage 5 with a red lint.**

### Stage 5 — Test gate (S4 + S7)

```bash
npm test 2>&1
```

- **Green** → proceed to Stage 6.
- **Red** → diagnose: is the failure in code YOU changed?

  To check if a failure is pre-existing:
  ```bash
  git stash && npm test 2>&1; git stash pop
  ```

  - Failure **in your code**: fix it; re-run; up to **3 attempts**.
    Halt and report if still red.
  - Failure **pre-existing on main**: document it in the PR description
    under "Pre-existing test failures" and proceed. Do NOT fix
    pre-existing failures unless they are explicitly in scope.

### Stage 6 — Commit (S7)

Stage only the files you changed:

```bash
git add <files...>
git diff --staged --stat
```

Confirm the staged diff matches `plan.md`'s scope. If unintended files
appear, unstage them (`git restore --staged <file>`).

Commit message format (Conventional Commits):

```
<type>(<optional-scope>): <imperative summary, ≤72 chars>

<body: 3–5 sentences — what changed and why>

Closes: <work-item reference if known>
```

Types: `feat` (new capability), `fix` (bug fix / review finding),
`refactor` (restructure only, no behavior change).

```bash
git commit -m "<message>"
```

### Stage 7 — Human checkpoint (B10)

Present this summary to the operator and **wait for explicit confirmation**:

```
READY TO PUSH AND OPEN PR
─────────────────────────
Branch:   <branch-name>
Commits:  <git log --oneline origin/main..<branch-name>>
Checks:   lint ✓  tests ✓
Out of scope (noted in PR):  <list or "none">
Pre-existing test failures:  <list or "none">

Proceed? [y / n]
```

If the operator confirms → Stage 8.
If the operator declines → stop; report what was committed locally.

### Stage 8 — Push + open / update PR (S7)

```bash
git push -u origin <branch-name>
```

Write the PR body to a temp file, then open or update:

```bash
# New PR:
gh pr create \
  --title "<type>: <summary>" \
  --body-file /tmp/pr-body.md \
  --base main

# Update existing PR (--pr-number was supplied):
gh pr edit <N> --body-file /tmp/pr-body.md
```

#### PR description template

Use this template exactly for `/tmp/pr-body.md`:

```markdown
## Summary

<2–4 sentences: what this PR does and why, in plain English>

## Work item

<paste or link the original work item / ticket>

## Changes

| File | What changed |
|------|--------------|
| <path> | <1-line description> |

## Checks

- [x] `npm run lint` — green
- [x] `npm test` — green
- [x] No secrets committed
- [x] Follows `secure-coding-base.instructions.md`
- [x] Follows `docs/guidelines/security.md`
- [x] Follows `docs/guidelines/architecture.md`
- [x] Follows `docs/guidelines/documentation.md`

## Out of scope / follow-up

The following were identified during implementation but fall outside
this work item's scope. A human should decide whether to file a
follow-up ticket.

- <item> — <why it was not included>

_(none if nothing was deferred)_

## Pre-existing test failures

- <test name> — failing on `main` before this branch; not introduced here

_(none if all tests were green before this branch)_
```

---

## Scope cap rule

This skill implements **exactly what the work item states**. If you find a bug,
a missing test, or a refactor opportunity while implementing:

1. Add it to `plan.md` OUT-OF-SCOPE.
2. Note it in the PR description under "Out of scope / follow-up".
3. **Continue with the in-scope work. Do not implement the extra item.**

The PR reviewer decides whether to open a follow-up ticket.
