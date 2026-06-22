---
name: sdlc-driver
description: "Use this skill to drive a PR branch to a mergeable state through a bounded build-and-review loop. Trigger when asked to 'drive this PR to done', 'run the sdlc loop', 'build and review until passing', 'iterate until clean', 'make this PR ready to merge', 'fix and review until green', or 'keep looping until the panel is happy'. Orchestrates builder (BUILD) and panel-review (REVIEW) in a capped loop: runs deterministic checks first (lint + tests with coverage); routes failures directly to builder; when checks pass, runs panel-review; hands actionable findings back to builder; repeats until checks are green and the review panel finds nothing actionable -- or the pass cap is hit. Out-of-scope findings are deferred, not built. Produces a summary: passes used, what changed, what was deferred. Does NOT implement features from scratch; requires an existing branch. Does NOT replace panel-review or builder as standalone skills."
license: MIT
metadata:
  author: "Zava Engineering"
---

# sdlc-driver

Drive a PR branch to mergeable state through a bounded build-and-review loop.

Each pass: run deterministic checks -> route failures to builder -> when green,
run panel-review -> route actionable findings to builder -> repeat. Stops when
checks pass and the panel finds nothing actionable, or when the cap is reached.

## When to use

- A PR branch exists and you want it driven to "checks green + panel clean"
  without supervising each step manually.
- You have review findings to implement and want to confirm the result with
  a fresh deterministic check + panel review before declaring done.

## When NOT to use

- Feature is not yet designed -> use `genesis` first.
- One-shot review only -> use `panel-review` directly.
- One-shot implementation only -> use `builder` directly.
- IaC / infra / multi-repo changes -> out of scope; hand off to a human.

## Dependencies (probe before looping)

Before running any pass, verify both dependencies are reachable:

- `builder` -- expected at `.agents/skills/builder/SKILL.md`
- `panel-review` -- expected at `.agents/skills/panel-review/SKILL.md`

If either is missing: stop and instruct the user to run `apm install` from
this skill's directory (`.agents/skills/sdlc-driver/`), then retry.

## Inputs

- **Required:** PR branch name, PR number, or a description of the in-progress work.
- **Optional:** `--max-passes <N>` -- loop cap (default: 3). Must be 1-10.
- **Optional:** `--scope <area>` -- forwarded verbatim to `panel-review`.

---

## Process

### Stage 0 -- Re-ground (always first, every pass)

1. If `plan.md` exists in the working directory, **read it now** -- you may be
   resuming a previous run. Do not discard existing loop state.
2. Read `.github/instructions/secure-coding-base.instructions.md`. These rules
   are non-negotiable; ensure they are active before any spawn that touches code.
3. Confirm the target branch exists (`git branch --list <branch>` or
   `git log -1 --oneline`). If not found, stop and surface the error.

---

### Stage 1 -- Plan (write before any loop turn)

Write `plan.md` to the working directory **before** any check or spawn:

```markdown
# sdlc-driver plan

## PR / work item

<target branch, PR number, or description>

## Goal

Checks green (lint + test/coverage) AND panel-review returns no actionable findings.

## Loop cap

<N> passes (default: 3)

## Scope hint (forwarded to panel-review)

<none | value>

## Loop state

pass: 0
checks: pending
panel: pending

## Findings log

(populated each pass -- one entry per pass)

## Deferred items

(scope-crossing findings -- left for human)

## Summary

(populated at end)
```

---

### Stage 2 -- Build-review loop (bounded, max N passes)

**Reload `plan.md` at the start of every pass.** This is the attention anchor;
the goal, cap, and deferred list stay in context on every turn.

#### Step 2a -- Deterministic checks (S7 tool bridge)

Run:

```
node scripts/run-checks.js
```

Read the JSON result from stdout. Update `plan.md` -> `Loop state` -> `checks:`.

The exit code and the `allPass` field in the JSON are the source of truth.
Do NOT ask the LLM to guess whether checks passed -- read the tool output.

#### Step 2b -- Route on check result

**IF `allPass` is `false` (any lint error or test failure):**

1. Extract the failure text from `lint.output` and/or `test.output`.
2. Write to `plan.md` -> `Findings log` -> `pass N` -> `check failures: [...]`.
3. Invoke `builder` (load `.agents/skills/builder/SKILL.md`, follow its process)
   with the following as the work item:
   - Classification: **REVIEW FINDINGS**
   - Content: the raw failure text from run-checks.js output
   - Reference: point to `plan.md` for PR context
4. After builder returns: **go back to Step 2a immediately.** Do not proceed to
   panel-review until a fresh check run confirms green.

**IF `allPass` is `true` (all checks pass):**

Proceed to Step 2c.

#### Step 2c -- Panel review

Invoke `panel-review` (load `.agents/skills/panel-review/SKILL.md`, follow its
process) with:

- Staged diff: `git diff HEAD~1` (or `git diff <base-branch>` if base is known).
- `--scope <hint>` if provided by the user.

Read the full panel report. For each finding, classify it:

| Class                         | Criteria                                                                                         | Action                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **ACTIONABLE**                | Within this PR's stated scope; builder can implement it this pass                                | Add to findings for builder                                  |
| **DEFERRED**                  | Scope-crossing, needs architecture decision, or requires human judgment                          | Write to `plan.md` -> `Deferred items` -- do NOT spawn builder |
| **BLOCKER** (`[BLOCKER]` tag) | Urgent and in-scope -> ACTIONABLE. Requires arch change -> DEFERRED + surface immediately to user. | Per above                                                    |

Write the classification to `plan.md` -> `Findings log` -> `pass N`.

**IF no ACTIONABLE findings remain AND no unresolved BLOCKERs:** exit the loop
and proceed to Stage 3.

**IF ACTIONABLE findings exist:**

1. Invoke `builder` with the ACTIONABLE findings as the work item
   (classification: REVIEW FINDINGS).
2. After builder returns: reload `plan.md`, increment pass counter, return to
   Step 2a.

#### Step 2d -- Loop cap check (before each new pass)

Check: `current pass >= max-passes`?

- **YES** -> exit the loop with status `cap-reached`. Proceed to Stage 3.
- **NO** -> increment pass counter and continue.

---

### Stage 3 -- Summary

Write to `plan.md` -> `Summary`, then surface to the user:

```markdown
## sdlc-driver summary

**Passes completed:** <N> of <max>
**Outcome:** DONE (checks green + panel clean) | CAP REACHED (human review needed)

### What changed (per pass)

- Pass 1: <brief description of what builder fixed>
- Pass 2: ...

### Deferred items (left for human)

- <finding> -- <why deferred>

### Final check status

- lint: PASS | FAIL
- test: PASS | FAIL
- coverage: <pct>% (if reported)

### Next steps (if cap reached)

- Review the deferred items above.
- Address any remaining findings, then re-run `sdlc-driver`, or merge
  if the remaining findings are acceptable risk.
```

---

## Hard rules

- **Check before review.** Never invoke `panel-review` when checks are red.
- **Tool result is truth.** Check pass/fail comes from `run-checks.js` exit
  code and `allPass` field -- not from LLM interpretation of the output.
- **Cap is enforced.** Never loop beyond `max-passes`. At cap, surface the
  state and stop. Do not ask the user if you should continue beyond the cap.
- **Deferred is not ignored.** Every deferred finding is written to `plan.md`
  and appears in the final summary. Silent discard is not permitted.
- **Reload every pass.** Read `plan.md` at the start of every pass. Goal drift
  is the dominant failure mode on multi-pass work.
- **No scope creep in builder spawns.** Reinforce the scope boundary when
  handing findings to builder: include the `Scope boundary` from `plan.md`
  in the builder work item description.
