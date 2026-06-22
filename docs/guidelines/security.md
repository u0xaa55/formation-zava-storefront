# Security Guidelines

Baseline security rules for every contributor. Non-negotiable. All PRs must pass the [review checklist](#review-checklist) before merge.

---

## 1. Input Validation

- **Validate all untrusted input at the boundary** — HTTP handlers, message consumers, CLI args, environment variables read at runtime.
- Reject early, log the violation at `WARN` with a correlation ID. Never silently swallow bad input.
- Strip or encode untrusted data before passing deeper into the stack. Do not rely on downstream layers to re-validate.

```ts
// ✅ validate at boundary
const { id } = paramsSchema.parse(req.params);

// ❌ never pass raw request data directly to business logic
doSomething(req.params.id);
```

---

## 2. No Secrets in Code

- **Never commit secrets**, tokens, API keys, passwords, or connection strings.
- Use Azure Key Vault references for runtime config; GitHub OIDC for CI/CD; `az login` / `gh auth` for local dev. No long-lived tokens.
- Reference secrets by name only: `${{ secrets.AZURE_CLIENT_ID }}`. Never inline.
- If a secret is found in history: rotate it first, then scrub with `git filter-repo` or BFG.

```ts
// ✅ read from env — secret injected at deploy time
const apiKey = process.env.PAYMENT_API_KEY;

// ❌ never
const apiKey = "sk-live-abc123...";
```

---

## 3. Database Queries

- **Parameterize every query.** No string concatenation into SQL, ever.
- Use the framework idiom: `pg` tagged template / `$1` placeholders, Prisma ORM, etc.

```ts
// ✅ parameterized
const rows = await db.query("SELECT * FROM orders WHERE user_id = $1", [userId]);

// ❌ string concat = SQL injection
const rows = await db.query(`SELECT * FROM orders WHERE user_id = '${userId}'`);
```

---

## 4. AuthN / AuthZ

- Authenticate at the edge; propagate identity via signed claims (JWT / OIDC). Never trust a client-supplied identity header downstream.
- Authorize at the **operation**, not just the route. Every protected operation must call the policy check explicitly.
- **Default-deny**: new routes and operations are inaccessible until explicitly permitted in policy.

---

## 5. Cryptography

- Use the language's vetted crypto library. **Never invent a scheme.** No custom XOR, no hand-rolled KDF.
- Password hashing: Argon2id (preferred) or bcrypt cost ≥ 12. Never MD5, SHA-1, or unsalted SHA-256.
- TLS 1.2 minimum, 1.3 preferred. Disable RC4, 3DES, NULL ciphers.

---

## 6. Output Encoding

- Encode output for the destination context: HTML-escape for HTML, JSON-encode for JSON, shell-escape for shell.
- Use established libraries (e.g., `DOMPurify`, `he`, `shell-escape`). Never hand-roll escaping.

---

## 7. Logging and PII

- **Never log** secrets, tokens, full request bodies, full PAN, full DOB, or full email.
- Mask PII in logs: `email=a***@d***.com`, `pan=****1234`.
- Structured JSON logs only. Include `correlation_id`, `user_id` (hashed), `operation`, `latency_ms`, `outcome`.
- Detailed error causes go to logs only — never in API responses to clients.

---

## 8. Error Handling

- **Fail closed.** On any error path through a security control (auth, policy, signature check), the answer is deny.
- Surface user-facing errors as generic messages + a correlation ID. Never expose stack traces to clients.

---

## 9. Dependencies

- Pin all production dependencies to exact versions or reviewed ranges. No `latest`, no unbounded `^` in production.
- Renovate / Dependabot enabled with security alerts auto-PR'd.
- New dependencies require a one-line justification in the PR description: *why this lib, why now, what alternatives were ruled out.*

---

## Review Checklist

Before merging any PR, verify:

- [ ] No new secrets in the diff (`gitleaks` clean)
- [ ] All new HTTP handlers have authN + authZ
- [ ] All new DB queries are parameterized
- [ ] New dependencies justified in PR description
- [ ] Logs masked for PII

Unchecked box = PR not ready for merge.
