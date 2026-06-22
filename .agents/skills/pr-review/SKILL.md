---
name: pr-review
description: "Use this skill to review a pull request against Zava's security, architecture, and documentation guidelines. Trigger when asked to 'review this PR', 'check PR #N', 'audit these changes', 'assess the diff against our guidelines', 'does this PR meet standards', or 'is this ready to merge'. Loads docs/guidelines/ lazily per dimension. Emits a fixed verdict: MERGE or REQUEST CHANGES, then rationale, then findings ordered by criticality per dimension (security → architecture → documentation). Handles large PRs by triaging files per lens. Does NOT fix code, open PRs, or replace panel-review (pre-push staged review)."
license: MIT
metadata:
  author: "Zava Engineering"
  pattern: "A1 PANEL"
  cost-stance: "balanced"
---

# pr-review

Review a PR against Zava's team-captured guidelines and emit a single, structured verdict.
Topology: **A1 PANEL** — three independent lens threads (security / architecture / documentation)
synthesized into one decision.

## When to use this

- A PR is open and you want a guidelines-driven review before (or instead of) a human reviewer.
- You have a diff or branch name and want a structured merge/block recommendation.
- You need findings ranked by criticality, per dimension, in one consistent format.

## When NOT to use this

- **Pre-push staged changes** → use `panel-review` instead.
- **Implementing fixes** → use `builder`.
- **Postmortem remediation** → use `incident-to-pr`.
- Trivial changes (typo, version bump, comment). Panel will surface noise.

## Inputs

| Input | Required | Notes |
|-------|----------|-------|
| diff or branch | ✅ | `git diff main..HEAD`, a raw diff paste, or a PR URL/number |
| `--scope <dim>` | ☐ | Restrict to one dimension: `security`, `arch`, or `docs` |
| `--threshold <N>` | ☐ | Max files per lens slice (default: 80). Larger → `--threshold 200`. |

---

## Process

### Stage 0 — Anchor (B8 ATTENTION ANCHOR)

Read this line before anything else: **your only job is to review the diff. Not to fix it.
Not to explore the repo. Not to suggest refactors outside the diff.**

Then:
1. Confirm the diff source. If given a PR number/URL, fetch with `gh pr diff <N>`.
   If given a branch, run `git diff main..<branch>`.
   If pasted directly, use as-is.
2. Count changed files. If > `--threshold` (default 80), note it — lens triage will apply.

### Stage 1 — Triage (B11 FOLD-BY-DEFAULT per lens)

Split the diff into three lens slices. Each lens only sees files it can usefully judge.

| Lens | Include | Exclude |
|------|---------|---------|
| **Security** | All files | None — any file can introduce a security issue |
| **Architecture** | `app/`, `lib/`, `infra/`, `*.bicep`, `*.tf`, `migrations/` | Test-only files, `*.md`, `*.json` config |
| **Docs** | Files with exported symbols (`export function`, `export class`, `export type`), `README.md`, `CHANGELOG.md`, `docs/` | Internal/private files, `*.test.ts` |

If a slice exceeds `--threshold` files, keep boundary files (files that import from or are imported
by the most other files in the diff) and note the trim in the report.

### Stage 2 — Lens reviews (C3 THREAD SPAWN × 3, C2 PERSONA PRELOAD, C1 LAZY ASSET)

Run each lens as an isolated review. Load the persona and the guideline **inside** the lens — do not
carry context from one lens into the next. This is a fan-out, not a pipeline.

#### 2a. Security lens

```
ATTENTION ANCHOR: You are reviewing for security only. Do not comment on architecture or docs.

PERSONA: Load `.github/agents/security.agent.md`
GUIDELINE: Load `docs/guidelines/security.md`

INPUT: security lens slice from Stage 1

TASK: Apply the security persona's review checklist against the guideline.
Emit findings in this format only:

| Severity | File:Line | Finding | Required fix |
|----------|-----------|---------|--------------|
| BLOCKER  | ...       | ...     | ...          |
| WARNING  | ...       | ...     | ...          |
| INFO     | ...       | ...     | ...          |

If no findings: emit "No security findings."
```

#### 2b. Architecture lens

```
ATTENTION ANCHOR: You are reviewing for architecture only. Do not comment on security or docs.

PERSONA: Load `.github/agents/architect.agent.md`
GUIDELINE: Load `docs/guidelines/architecture.md`

INPUT: arch lens slice from Stage 1

TASK: Apply the architect persona's review checklist against the guideline.
Pay special attention to: layer boundary violations (guideline §1), new deps without ADR (§2),
route handler contracts (§3), DB access patterns (§4), IaC changes (§5).
Emit findings in this format only:

| Tag | File:Line | Finding | Suggested fix |
|-----|-----------|---------|---------------|
| [design-flaw]    | ... | ... | ... |
| [scaling-risk]   | ... | ... | ... |
| [coupling]       | ... | ... | ... |
| [inconsistent]   | ... | ... | ... |
| [opportunity]    | ... | ... | ... |

If no findings: emit "No architecture findings."
```

#### 2c. Documentation lens

```
ATTENTION ANCHOR: You are reviewing for documentation only. Do not comment on security or architecture.

PERSONA: Load `agents/docs-reviewer.agent.md` (local to this skill)
GUIDELINE: Load `docs/guidelines/documentation.md`

INPUT: docs lens slice from Stage 1

TASK: Apply the docs persona's checklist against the guideline.
Pay special attention to: missing JSDoc on exports (guideline §1), README not updated for
user-facing changes (§2), missing ADR for new deps (§3), missing CHANGELOG entry (§4),
commented-out code or bare TODOs (§5).
Emit findings in this format only:

| Severity | File:Line | Finding | Required fix |
|----------|-----------|---------|--------------|
| BLOCKER  | ...       | ...     | ...          |
| WARNING  | ...       | ...     | ...          |
| INFO     | ...       | ...     | ...          |

If no findings: emit "No documentation findings."
```

### Stage 3 — Collect outputs (B4 PLAN MEMENTO)

Before synthesizing, record the three lens outputs verbatim in a working table:

```
[security-output]   <paste Stage 2a result>
[arch-output]       <paste Stage 2b result>
[docs-output]       <paste Stage 2c result>
```

Do not proceed to Stage 4 until all three are populated.

### Stage 4 — Synthesize and emit (S4 VALIDATION GATE + A1 PANEL synthesis)

**Gate rule (non-negotiable):** if any lens produced a `BLOCKER`, the verdict MUST be
`REQUEST CHANGES`, regardless of how the other lenses scored.

Then emit the report using the template at `assets/output-template.md`.

Ordering rule for findings within each dimension: BLOCKER → [design-flaw] → WARNING →
[scaling-risk] → [coupling] → [inconsistent] → INFO → [opportunity].

---

## Hard rules

- **Diff-only.** Do not read files outside the diff unless the diff references them and the
  reference is ambiguous. The job is the change, not the codebase tour.
- **Severity is honest.** A `BLOCKER` means "do not merge." Inflating severity destroys trust.
- **No silent lens.** If a lens has nothing to report, write "No X findings." explicitly.
  An empty section looks like the skill broke.
- **PANEL-IN-ONE-CONTEXT is forbidden.** Each lens must be isolated. Do not run the security,
  architecture, and documentation reviews in the same context window. Lens 2 must not see lens 1's
  output. Lens 3 must not see lenses 1 or 2. Only the synthesizer sees all three.
- **Lone BLOCKER wins.** A single BLOCKER from any one lens blocks the PR even if the other two
  lenses are clean. The dissenting lens is the highest-information signal.

---

## See also

- `agents/docs-reviewer.agent.md` — documentation lens persona (bundled with this skill)
- `.github/agents/architect.agent.md` — architecture lens persona (shared)
- `.github/agents/security.agent.md` — security lens persona (shared)
- `assets/output-template.md` — the report template (LAZY ASSET, load at Stage 4)
- `panel-review` — pre-push staged review (2 personas, no docs dimension, no verdict)
- `docs/guidelines/` — the three guideline files this skill applies
