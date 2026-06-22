# pr-review output template

Load this file at Stage 4 of the pr-review process (synthesis step).
Copy the template below, fill every section. Do not omit sections — write "No findings." if a
dimension is clean.

---

```markdown
## Verdict: <!-- MERGE | REQUEST CHANGES -->

**Confidence:** <!-- HIGH | MEDIUM | LOW -->

> **MERGE** — No blockers across any dimension. Minor warnings noted below; address before next iteration.
> **REQUEST CHANGES** — One or more blockers must be resolved before this PR can merge.

### Rationale

<!-- 1–3 sentences explaining the verdict. Name the dominant signal.
     If REQUEST CHANGES: lead with the blocker(s) that triggered it.
     If MERGE: note the overall health and any significant warnings.
     Do not list every finding here — that's what the dimensions are for. -->

---

## Security

<!-- Ordered: BLOCKER → WARNING → INFO. If none: "No security findings." -->

| Severity | Location | Finding | Action required |
|----------|----------|---------|-----------------|
| <!-- BLOCKER / WARNING / INFO --> | <!-- File:Line --> | <!-- What + why it matters --> | <!-- What to do --> |

---

## Architecture

<!-- Ordered: [design-flaw] → [scaling-risk] → [coupling] → [inconsistent] → [opportunity].
     If none: "No architecture findings." -->

| Tag | Location | Finding | Suggested fix |
|-----|----------|---------|---------------|
| <!-- [design-flaw] etc. --> | <!-- File:Line --> | <!-- Observation --> | <!-- Fix or open question --> |

---

## Documentation

<!-- Ordered: BLOCKER → WARNING → INFO. If none: "No documentation findings." -->

| Severity | Location | Finding | Action required |
|----------|----------|---------|-----------------|
| <!-- BLOCKER / WARNING / INFO --> | <!-- File:Line or symbol --> | <!-- Gap --> | <!-- Fix + guideline section --> |

---

_Reviewed by pr-review skill · Zava Engineering · guidelines: docs/guidelines/_
```
