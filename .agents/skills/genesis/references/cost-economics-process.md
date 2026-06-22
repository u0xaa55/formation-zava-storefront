# Cost-economics process detail (load on demand)

Load this file when the active design needs to apply the cost-stance
knob, the cap mechanism, or step 3.2 (cost check) at full detail.
The SKILL.md body names the shape; this file holds the procedure.

Trigger for loading:
- Operator declared a cost stance in step 1.
- Step 3.2 cost check is in scope (default for any non-trivial work).
- Step 6 cost projection or step 8 cost checklist is being run.

---

## Cost stance (read at step 1)

Stance shapes the SHAPE of the design (which patterns are picked).
It does NOT cap the size of the design. Four values; default
`balanced`:

### frugal

Posture: minimize spend; accept up to ~15-20% quality risk on
non-blast-radius decisions.

Pattern mandates:
- B12 MODEL ROUTER on any module with heterogeneous sub-tasks.
- B15 TOOL SUBSET on any module against a tool surface >10 tools.
- B16 EFFORT GOVERNOR declared on every module (default minimum
  unless capability profile demands otherwise).
- A12 GRADIENT WORKFLOW preferred over flat panels when fan-out
  width >= 3.
- Default to the cheapest role class that meets capability profile.
- Forbid mid-session model switch (B13 invalidator).

### balanced (default)

Posture: best $/quality per primitive. The posture genesis ships
as default; equivalent to running the catalogue without explicit
stance.

Pattern mandates:
- B13 CACHE-AWARE PREFIX enforced (always; this is the largest
  lever and has no quality tradeoff).
- Role class chosen per slot (no class-uniform graphs unless the
  graph is genuinely uniform-need).
- B14 PROMPT THRIFT at validation time on any module within 80%
  of its size budget.

### quality

Posture: optimize for capability ceiling; pay for it.

Pattern mandates:
- Planner-class for planner/critic slots even when implementer-
  class would meet capability profile.
- B14 PROMPT THRIFT still on (prose bloat is not a quality lever).
- B15 TOOL SUBSET considered when MCP catalog > 20 tools (full
  catalog every turn distracts even the planner class).
- A12 GRADIENT WORKFLOW considered when the bulk-execution stage
  runs >10x per workflow (the savings still meaningful).

### unbounded

Posture: research / capability-ceiling work where the architect
explicitly wants the model not to self-limit.

Pattern mandates: none. The persona warns once per design that
unbounded stance is in effect, then proceeds. Cost projection is
STILL recorded (operator sees the prediction; predictability
without prescription).

### How operator declares stance

- In the first prompt: "design this in frugal mode" / "let's go
  unbounded on this one".
- Per harness convention: see `runtime-affordances/per-harness/<x>.md`
  section on stance binding.
- Session-scoped config file (genesis reads `stance:` from the
  plan store if the operator wrote it there).

If none declared, default `balanced`.

---

## Cost budget cap (optional, read at step 1, enforced at step 6)

Cap shapes the SIZE of the design (whether to redo it smaller)
and is orthogonal to stance. Stance can be `quality` and cap can
be tight; they are independent.

Cap is a hard ceiling expressed as one of:

- DOLLAR cap per representative run (e.g. "$5 per PR review").
- TOTAL TOKEN cap per representative run (e.g. "100K tokens").
- PREMIUM REQUEST cap (per the harness's billing unit).

Cap is enforced at step 6. If the cost projection's L scenario
exceeds the cap, the design halts and surfaces three options to
the operator:

1. Widen the cap.
2. Change stance (typically toward `frugal`).
3. Accept a coarser pattern (collapse a panel into a single
   reviewer, drop a verification stage, narrow scope).

Cap is the ONLY place genesis refuses to proceed on cost grounds.
Without a cap, projection is informational; with one, projection
is a gate.

---

## Step 3.2 - cost check in full

Load `assets/token-economics.md` and
`assets/runtime-affordances/model-catalog.md`. For each module in
the component diagram:

### Role class

Pick the cheapest class that meets the capability profile. Promote
a class only when the failure mode of getting it wrong is "wrong
plan", not "minor edit miss". The five classes
(planner / implementer / reviewer / trivial /
long-context-retriever) are defined in
`runtime-affordances/model-catalog.md` with capability and cost
profiles.

### Prefix shape

Identify:
- STABLE bytes: persona body, skill body, project rule files,
  tool catalogue (if held stable).
- VARIABLE suffix: per-turn user input, tool results, scratchpad.

Audit for cache invalidators:
- Timestamp in any stable byte.
- Tool catalogue that mutates mid-session (MCP server addition,
  per-step tool subsetting that changes the catalogue).
- Mid-session model switch (B12 should route AT WORKFLOW ENTRY,
  not mid-thread).
- Mid-session effort change (B16 should declare per-thread, not
  per-turn).
- Edits to project rule files mid-session.

If any invalidator named, apply B13 CACHE-AWARE PREFIX (move
the invalidator to the variable suffix, or hold the prefix
stable through the session even at small redundancy cost).

### Output volume

Estimate qualitative band per module per
`assets/token-economics.md`:
- S: under 500 tokens (verdicts, classifications, short summaries).
- M: 500-3K tokens (typical implementer outputs, structured
  plans).
- L: over 3K tokens (full file generation, long synthesis).

Steps emitting L output in a loop or fan-out are R5 COST PRUNE
triggers. Consider splitting (R1) so the bulk generation moves to
an implementer-class slot, OR delegating generation to a
deterministic tool (S7).

### Tool surface

If the primitive runs against more than 20 available tools and
uses fewer than 5 per invocation, apply B15 TOOL SUBSET. If the
tool sequence is deterministic (always same N tools in same
order), prefer S7 DETERMINISTIC TOOL BRIDGE (one tool that does
the work).

### Workflow shape

If the design contains heterogeneous-cost stages (one planner-
class step, N implementer-class steps, one reviewer-class step),
name A12 GRADIENT WORKFLOW.

### Apply stance

- `frugal`: mandates B12, B15, B16, A12 wherever applicable.
- `balanced`: mandates B13 plus per-stage role-class choice.
- `quality`: promotes planner/critic slots but keeps B14 and B13.
- `unbounded`: skips the gate but still records the projection.

### Tradeoffs

If two cost patterns fit the same slot, load the cost-shape matrix
in `assets/pattern-tradeoffs.md` (section "10. Cost-shape") and
cite the row chosen in the step 6 handoff packet.

### Output of step 3.2

A short table the architect carries forward to step 6:

| Module | Role class | Prefix size | Output volume | Cost patterns applied | Cost-shape matrix row |
|--------|------------|-------------|---------------|------------------------|------------------------|
| ...    | ...        | ...         | ...           | ...                    | ...                    |

---

## Step 6 - cost projection in full

The projection lives in the handoff packet alongside the diagrams
and module composition table. It has six parts:

### 1. Per-module qualitative bands

Vocabulary per `assets/token-economics.md`:
- Role class.
- Prefix size: S (<5K) / M (5-20K) / L (20-100K) / XL (>100K).
- Output volume: S (<500) / M (500-3K) / L (>3K).
- Expected turn count: low (1-3) / medium (4-10) / high (10+).

These bands are the CONTRACT. Step 8 validates them.

NOTE: cache hit ratio is intentionally NOT in the contract. Cache
hit ratio is a runtime telemetry number; most harnesses do not
surface it per-request to the agent, and step 8 cannot statically
verify it. Cache hit ratio is observed at runtime and feeds R5
COST PRUNE evidence, not the design-time contract.

### 2. Workflow-level quantitative range

For ONE representative run, a range estimate:
- Expected input tokens (low-high).
- Expected output tokens (low-high).
- Expected total turns (low-high).
- Expected dollar / credit / request range (low-high).

Source the multipliers from the per-harness adapter's pricing
footnote. Record the footnote's "verified on YYYY-MM-DD" date
stamp.

A range, not a point estimate. Operators want to know the
worst case, not the average.

### 3. Workload scenarios

Operators projecting against unknown corpora need anchors. At
minimum three:

- S = trivial / single-file change.
- M = feature in a known module.
- L = repo-wide change (refactor across N files; full audit).

Each scenario gets the quantitative range from part 2 projected
to its size. The L scenario is the cap check input.

### 4. Cited cost patterns

The B12 / B13 / B14 / B15 / B16 / A12 / R5 patterns the design
applies, each with the cost-shape matrix row that motivated it.

### 5. Declared stance

The stance read at step 1, recorded verbatim.

### 6. Cap check

If a cap was declared, verify each scenario fits under it. If
the L scenario exceeds the cap, halt the design and surface the
three options (widen cap / change stance / coarser pattern).

---

## Step 8 - cost checklist (not a gate)

This step is a CHECKLIST the architect runs against emitted modules,
not a programmatic gate. There is no lint script today; honest naming.
A future `scripts/cost-lint.sh` can grep for the named invalidators
(timestamps in stable prefix, hardcoded model names) but until that
exists, the checklist is human-applied.

After the emitted modules pass structural lint, verify:

1. Each emitted module's role-class binding matches the
   projection's per-module bands. (Reviewer should be reviewer-
   class in the emitted code, not silently promoted to
   planner-class.)
2. No emitted module introduces a cache invalidator the
   projection assumed absent (audit each body for
   timestamps, mid-session tool catalogue mutations,
   mid-session model switches, mid-session effort changes).
3. Every pattern cited in the projection's COST PATTERNS list
   is materialized in at least one emitted module's body.
4. Stance-mandated patterns are visible:
   - `frugal` -> B12 / B15 / B16 each appear somewhere.
   - `quality` -> planner-class promotions show up in role
     bindings.
5. The cap, if declared, still holds after any last-mile edits.

Failures are HIGH severity. They do not block ship outright (the
operator may accept a regression knowingly), but they MUST be
surfaced in the validation report so the operator decides.

---

## When this file is NOT loaded

- Stance is `unbounded` AND operator declined cost recording.
- The design is purely structural (no role-class decisions, e.g.
  a pure documentation refactor).
- The design is small enough that the SKILL.md body's summary
  suffices and step 3.2 is trivially satisfied.

In any other case, load this file at step 3.2.
