# Documentation Guidelines

Rules for keeping docs accurate, discoverable, and maintainable. Good docs ship alongside code — they are not a follow-up task.

---

## 1. Public Functions Must Have a Doc Comment

Every exported function, class, and type requires a doc comment that covers:

- **What** it does (one line)
- **Parameters** — name, type, constraints
- **Return value** — what it contains, possible nulls/errors
- **Side effects** — mutations, external calls, thrown exceptions

```ts
/**
 * Adds an item to the user's cart, creating the cart if it does not exist.
 *
 * @param userId - Authenticated user ID (UUID).
 * @param productId - Product to add (must exist in the products table).
 * @param quantity - Number of units; must be ≥ 1.
 * @returns The updated cart with all line items.
 * @throws {NotFoundError} if the product does not exist.
 */
export async function addToCart(
  userId: string,
  productId: string,
  quantity: number
): Promise<Cart> { … }
```

> Internal/private helpers do not require JSDoc, but a one-line `//` comment explaining *why* is encouraged when the logic is non-obvious.

---

## 2. User-Facing Changes Update the README

Any change that affects how a developer installs, runs, configures, or deploys the project must update `README.md` in the same PR:

| Change type | README section to update |
|-------------|--------------------------|
| New env variable required | Local dev / environment variables |
| New npm script | Local dev commands |
| New Azure resource deployed | Stack or infrastructure section |
| Breaking API change | API reference / see also |
| New prerequisite tool | Prerequisites |

Do not merge a user-facing change with an outdated README. Reviewers should flag this.

---

## 3. Architecture Decisions Live in `docs/decisions/`

Every significant architectural choice (new dependency, service boundary, technology swap) must be recorded as an ADR in `docs/decisions/NNNN-title.md`. See the [architecture guideline](./architecture.md#2-new-external-dependencies--adr-required) for the ADR template.

- ADRs are append-only. Superseded decisions update their `Status` field and link to the new ADR — they are never deleted.
- The `docs/decisions/` directory acts as the project's decision log; it should be linkable from onboarding docs and PR descriptions.

---

## 4. Changelog

Maintain a `CHANGELOG.md` at the repo root following [Keep a Changelog](https://keepachangelog.com/) conventions:

- Sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Every PR that ships user-visible behaviour adds an entry under `[Unreleased]`.
- On release, the `[Unreleased]` section is retitled with the version and date.

```markdown
## [Unreleased]

### Added
- Cart quantity validation on the API boundary (#42)

### Fixed
- Order total rounding error for multi-currency carts (#38)
```

---

## 5. Inline Comments — Why, Not What

Comments explain *why* code does something, not *what* it does. The code itself expresses the what.

```ts
// ✅ why
// Retry once on 429 — payment gateway rate-limits burst traffic from checkout
await retry(chargeCard, { attempts: 2, when: isRateLimited });

// ❌ what (redundant)
// Retry the chargeCard function 2 times
await retry(chargeCard, { attempts: 2, when: isRateLimited });
```

- Remove commented-out code before merging. Use `git revert` or branches to recover deleted code.
- Do not leave `TODO:` or `FIXME:` comments without a linked issue number: `// TODO(#99): replace stub with real search`.

---

## 6. API Route Documentation

Each route in `app/api/` must have a comment block at the top of the handler file documenting:

```ts
/**
 * GET /api/products
 *
 * Returns a paginated list of products matching an optional search query.
 *
 * Query params:
 *   q        (string, optional) — full-text search term
 *   page     (number, default 1)
 *   pageSize (number, default 20, max 100)
 *
 * Responses:
 *   200 { products: Product[], total: number }
 *   400 { error: string } — invalid query params
 *   500 { error: string, correlationId: string }
 */
```

---

## 7. Docs Live Close to Code

- Module-level docs go in the `lib/<module>.ts` file header or a `lib/<module>/README.md` for larger modules.
- Infrastructure docs go in `infra/README.md`.
- Do not create a docs page for something that is more accurately expressed as a comment in the source file.

---

## Review Checklist

Before merging any PR:

- [ ] All new/changed exported functions have doc comments
- [ ] User-facing changes reflected in `README.md`
- [ ] New architectural decisions have an ADR in `docs/decisions/`
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No commented-out code or unlinked `TODO`s
