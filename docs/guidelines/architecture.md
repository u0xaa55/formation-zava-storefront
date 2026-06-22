# Architecture Guidelines

Structural rules for the Zava Storefront codebase. Keeps the system coherent as it grows and surfaces design decisions before they harden into technical debt.

---

## 1. Layer Boundaries — No Cross-Layer Imports

The codebase is structured in three logical layers:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Presentation** | `app/` | Rendering, routing, user interaction |
| **Application** | `lib/` | Business logic, orchestration |
| **Infrastructure** | `lib/db.ts`, external clients | DB access, third-party APIs |

Rules:
- Presentation imports Application. Application imports Infrastructure. **Never the reverse.**
- No `app/` file imports directly from `lib/db.ts` — go through a `lib/` module.
- No circular imports. Use ESLint `import/no-cycle` to enforce.

```
app/page.tsx   →  lib/cart.ts   →  lib/db.ts   ✅
lib/db.ts      →  app/page.tsx                  ❌
app/page.tsx   →  lib/db.ts                     ❌
```

---

## 2. New External Dependencies — ADR Required

Before adding a new external dependency (npm package, external service, Azure resource):

1. Write a short **Architecture Decision Record (ADR)** in `docs/decisions/NNNN-title.md`.
2. Include: context, options considered, decision, consequences.
3. Link the ADR in the PR description.

ADR template:

```markdown
# NNNN — Title

**Status:** Accepted | Superseded by NNNN | Deprecated

## Context
Why does this decision need to be made?

## Options Considered
- Option A — pros/cons
- Option B — pros/cons

## Decision
We chose Option A because…

## Consequences
- Positive: …
- Negative / trade-offs: …
```

> ADR not required for dev-only tooling (linters, test runners) or patch-level upgrades to existing deps.

---

## 3. API Route Contracts

- All Route Handlers in `app/api/` must validate request shape at the boundary (Zod schema or equivalent) before touching business logic.
- Response shape must be stable across minor versions. Breaking changes require a version prefix (`/api/v2/…`) or a deprecation notice in the PR.
- Do not embed business logic directly in route files — delegate to `lib/`.

---

## 4. Database Access

- All DB access goes through `lib/db.ts` — no raw `pg` client instantiated elsewhere.
- Schema migrations live in `migrations/` and run in CI before tests. Never mutate the schema at runtime.
- Every query that touches user data must be scoped to the authenticated user's ID — no ambient queries returning data across tenants.

---

## 5. Infrastructure as Code

- All Azure resources are declared in `infra/main.bicep` (or child modules). No resources created via portal clicks or ad-hoc CLI commands in production.
- IaC changes follow the [CI/CD golden paths](../../.github/instructions/ci-cd-golden-paths.instructions.md).
- Environment-specific values (SKUs, replica counts) live in parameter files, not in Bicep templates.

---

## 6. Service Boundaries and Future Extraction

- Keep modules cohesive around a domain (cart, orders, search). A module that imports from three other `lib/` modules is a signal to review ownership.
- If a module grows beyond ~300 LOC or is deployed independently, treat it as a service boundary candidate and document the decision in an ADR.

---

## 7. Testing Strategy

- Unit tests for all business-logic functions in `lib/` — no real DB, no HTTP calls. Mock at the infrastructure boundary.
- Integration tests may use a real DB (docker-compose or GitHub Actions service containers). Never call external third-party APIs in CI.
- Test files live alongside their subject or under `tests/`. Never deploy test code to production (no `*.test.ts` in the container image).

---

## Review Checklist

Before merging any PR with structural changes:

- [ ] No cross-layer imports introduced
- [ ] New external dep has an ADR linked in the PR
- [ ] New API routes validate input and delegate logic to `lib/`
- [ ] IaC changes go through `infra/` — no manual portal changes
