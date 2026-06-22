# Model catalog (common substrate)

Role-class taxonomy the architect reasons in. Concrete model
mappings and pricing footnotes live in per-harness adapters;
this file defines the abstract roles.

Load this file when:

- Step 3.2 (cost check) decides which role class each module needs.
- A pattern entry in `design-patterns.md` references a role class
  (B11 MODEL ROUTER, B15 EFFORT GOVERNOR).
- A pattern entry in `architectural-patterns.md` composes roles
  across stages (A10 GRADIENT WORKFLOW).

The architect designs in role classes. The coder thread, at step
7b, loads the per-harness adapter to resolve role class to concrete
model + billing unit for the declared target harness.

---

## Why role classes

Concrete model names age out (Sonnet 4.5 -> 4.6 -> 4.7 within
months) and harnesses repackage them under their own SKUs (a
"premium request" today, a "credit" tomorrow). The catalogue must
survive that churn.

Role classes name what the architect is BUYING when they place a
model in a slot: capability profile + cost profile + typical
context size. The per-harness adapter maps role class -> concrete
model name + billing surface AT THE TIME THE OPERATOR READS IT.

---

## The five role classes

### planner

CAPABILITY PROFILE: high-quality reasoning, plans that survive
contact with execution, accurate tool-use plans, robust on long
context windows.

COST PROFILE: highest per-token rate in the harness's catalogue;
often billed with a thinking/reasoning multiplier; total spend
dominated by output (plans are output-heavy).

TYPICAL CONTEXT SIZE: large (the planner often loads the full
codebase summary, the issue body, the constraints).

USED IN: A2 STAFFED PLAN (the plan-producing thread), A10 GRADIENT
WORKFLOW (the heavy front), C2 PERSONA PRELOAD with senior-architect
persona, any synthesizer in A1 PANEL where cross-lens reasoning is
hard.

EXAMPLES (durability disclaimer: refresh from per-harness adapter):
Claude Opus tier, GPT-5 high-effort tier, o3 / o3-pro.

### implementer

CAPABILITY PROFILE: solid coding, good tool use, follows a given
plan reliably, terse output, low hallucination on routine edits.

COST PROFILE: middle of the harness's catalogue; the sweet spot
for $/quality on bulk implementation work; output volume bounded
by what is being edited.

TYPICAL CONTEXT SIZE: medium (the file being edited + immediate
neighbors + the relevant section of the plan).

USED IN: per-todo executor in A2 STAFFED PLAN, per-stage worker in
A3 PIPELINE, fan-out workers in A1 PANEL when the lenses are
domain-narrow, the middle layer of A10 GRADIENT WORKFLOW.

EXAMPLES: Claude Sonnet tier, GPT-5 standard tier, GPT-4o tier.

### reviewer

CAPABILITY PROFILE: pattern-matches against a checklist or rubric,
emits structured verdicts, low fabrication when given a concrete
artifact to grade.

COST PROFILE: low to middle; bounded output (verdict + short
rationale, not generation); high cache hit ratio (the rubric is
the cacheable prefix, the artifact under review is the variable
suffix).

TYPICAL CONTEXT SIZE: medium (rubric + artifact + recent context).

USED IN: A7 ADVERSARIAL REVIEW, S4 VALIDATION DECORATOR, the
back layer of A10 GRADIENT WORKFLOW, COLD READER SIMULATION.

EXAMPLES: Claude Sonnet tier (often the same model as implementer
but with a reviewer persona), GPT-5 standard tier, Haiku tier for
checklist-grade reviews.

### trivial

CAPABILITY PROFILE: classification, extraction, short
summarization, format normalization, simple Q&A; tasks where any
modern frontier model gets it right one-shot.

COST PROFILE: cheapest in the harness's catalogue; output is
always short; cache hit ratio irrelevant because the body is tiny.

TYPICAL CONTEXT SIZE: small.

USED IN: C3 CONDITIONAL DISPATCH classifiers, lazy-asset
selection prompts, file-name normalizers, branch-name suggestions,
"is this a bug or feature" pre-filters, B11 MODEL ROUTER's own
routing call.

EXAMPLES: Claude Haiku tier, GPT-5 mini, GPT-4.1 mini, Gemini
Flash tier.

### long-context-retriever

CAPABILITY PROFILE: ingests very large context windows (200K+
tokens), retrieves precise spans, summarizes faithfully, low
hallucination when the answer is grounded in the supplied corpus.
The capability profile is "needle in haystack", not "reason hard".

COST PROFILE: per-token rate often equal to a mid-tier model, but
TOTAL cost dominated by input volume; cache discipline is
existential (one cache miss = full corpus re-billed at fresh
input rate).

TYPICAL CONTEXT SIZE: very large (full repos, full docs sets,
full incident histories).

USED IN: C6 EXTERNAL CORPUS GROUNDING when the corpus exceeds
implementer-tier context, large-codebase summarization workflows,
incident-history retrieval, long-document Q&A.

EXAMPLES: Claude Sonnet tier (1M context variant where offered),
GPT-5 with extended context, Gemini Pro 2M-context tier.

---

## Routing axes (when a workflow uses more than one class)

The architect picks role classes per module along three axes:

1. **Quality ceiling**: does this step need the planner's
   reasoning to not fail? (If yes -> planner. If no -> consider
   cheaper.)
2. **Output volume**: will the step emit many output tokens?
   (If yes, cheaper class amortizes harder. If no, the rate gap
   between classes shrinks.)
3. **Repeat count**: will this step run many times in a fan-out
   or wave? (If yes, cheaper class compounds. If once, optimize
   for quality.)

A workflow with one planner-class step (front), N parallel
implementer-class steps (middle), and one reviewer-class step
(back) is the canonical A10 GRADIENT WORKFLOW.

---

## What this file does NOT do

- It does NOT name concrete models. Models live in per-harness
  adapters under `runtime-affordances/per-harness/<x>.md` in a
  `model-catalog` section, with date stamps.
- It does NOT name prices. Same reason.
- It does NOT enumerate every routing rule. The catalogue patterns
  (B11, B15, A10) own the rules; this file just defines the slots
  the rules talk about.

---

## How per-harness adapters extend this file

Each adapter in `runtime-affordances/per-harness/<x>.md` SHOULD
include a `model-catalog` section that:

- Maps each role class to one or more concrete model SKUs the
  harness offers.
- Names the billing unit for that harness (token pass-through /
  request count / credit multiplier / hybrid).
- Records a "verified on YYYY-MM-DD" date stamp.
- Footnotes the published price page so the operator can
  re-verify when the date stamp is stale (more than 90 days).

Adapters MAY omit a role class if the harness genuinely does not
offer one (e.g. a harness with no trivial tier). The architect
checks for that gap at step 3.2 and either picks an alternative
role class or warns the operator.
