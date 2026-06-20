# OpenCode Workflow: Refactor

# Overview

This workflow defines how OpenCode should perform refactors in Kyrae.

The archetype is IAM-first, security-first and designed as a generic enterprise foundation. Refactors must preserve behavior, improve maintainability and avoid introducing project-specific business logic.

---

# Goal

The goal of this workflow is to ensure refactors are:

* safe,
* focused,
* behavior-preserving,
* architecture-aligned,
* security-aware,
* testable,
* documented when needed,
* free from unnecessary rewrites.

---

# Mandatory Reading

Before refactoring, OpenCode must read:

1. `docs/system-context.md`
2. `docs/source-of-truth.md`
3. `README.md`
4. `AGENTS.md`
5. `.opencode/instructions.md`
6. `docs/architecture/overview.md`
7. `docs/standards/coding-standards.md`
8. `docs/standards/security-standards.md`
9. `docs/standards/code-review-checklist.md`
10. Application-specific `AGENTS.md`
11. Application-specific `README.md`

If the refactor affects APIs, also read:

```txt
docs/standards/api-standards.md
```

If the refactor affects database structure, also read:

```txt
docs/standards/database-standards.md
```

If the refactor affects authentication or authorization, also read:

```txt
docs/architecture/authentication.md
docs/architecture/authorization.md
```

---

# Refactor Principles

Refactors must follow these principles:

* preserve existing behavior,
* avoid unrelated changes,
* keep changes focused,
* improve readability or maintainability,
* preserve security rules,
* preserve architecture boundaries,
* avoid introducing new dependencies unless justified,
* update tests when needed,
* update documentation when architecture changes.

---

# What Counts as Refactoring

Refactoring may include:

* simplifying services,
* extracting reusable helpers,
* improving naming,
* reducing duplication,
* moving logic to the correct layer,
* improving module boundaries,
* improving shared contracts exports,
* improving folder structure,
* improving test structure.

Refactoring must not change business behavior unless explicitly requested.

---

# What Is Not Refactoring

The following are not refactors:

* adding new features,
* changing authentication behavior,
* changing permission rules,
* changing API contracts,
* changing database schema behavior,
* adding project-specific business modules,
* replacing major architecture without specification.

Those require feature specifications or architecture decisions.

---

# Planning Step

Before medium or large refactors, OpenCode must propose a plan.

The plan should include:

* reason for refactor,
* affected files,
* behavior that must remain unchanged,
* security impact,
* testing strategy,
* documentation impact,
* rollback considerations.

Small refactors may be applied directly when safe.

---

# Frontend Refactor Rules

When refactoring frontend code:

* keep standalone components,
* keep components lightweight,
* move reusable logic into services,
* keep API calls inside services,
* centralize auth and permission logic,
* avoid duplicating Signals state,
* preserve route guards,
* preserve interceptors,
* preserve responsive behavior.

Do not:

* move business logic into components,
* call APIs directly from components,
* hardcode permissions in multiple components,
* replace working UI patterns without reason,
* introduce unnecessary RxJS complexity.

---

# Backend Refactor Rules

When refactoring backend code:

* keep controllers lightweight,
* keep business logic inside services,
* keep DTO validation,
* preserve guards,
* preserve permission checks,
* preserve audit behavior,
* keep database access outside controllers,
* keep TypeORM migrations intact.

Do not:

* bypass authorization,
* remove validation,
* expose sensitive fields,
* move service logic into controllers,
* change schema without migration,
* tightly couple IAM to business-specific domains.

---

# Shared Contracts Refactor Rules

When refactoring shared contracts:

* preserve public exports when possible,
* check frontend impact,
* check backend impact,
* keep only DTOs, enums, types and interfaces,
* avoid breaking API contracts unnecessarily,
* update index exports,
* document breaking changes.

Do not:

* add business logic,
* add framework-specific implementation,
* add TypeORM entities,
* add Angular components,
* add NestJS services,
* add secrets or environment values.

---

# Database Refactor Rules

Database refactors are sensitive.

If the database structure changes:

* create TypeORM migrations,
* preserve existing data when required,
* document migration behavior,
* add constraints intentionally,
* add indexes intentionally,
* test migration impact.

Do not:

* enable `synchronize` in production,
* manually change schema without migrations,
* remove constraints without reason,
* expose sensitive data,
* use production data in tests.

---

# Authentication Refactor Rules

Authentication refactors must preserve security behavior.

Verify:

* inactive users remain blocked,
* locked users remain blocked,
* JWT payload remains safe,
* refresh token handling remains secure,
* external providers still validate local IAM rules,
* audit events remain intact.

Do not:

* weaken password handling,
* expose token internals,
* bypass user status validation,
* remove audit events without explicit reason.

---

# Authorization Refactor Rules

Authorization refactors must preserve access control.

Verify:

* backend remains final authority,
* guards remain applied,
* permissions remain enforced,
* frontend checks remain UX-only,
* permission logic remains centralized,
* user-role and role-permission behavior remains unchanged.

Do not:

* duplicate permission logic,
* hardcode permission checks across components,
* bypass backend guards,
* remove permission validation.

---

# Testing Rules

Refactors should include tests when behavior could be affected.

Recommended commands:

```bash
pnpm -r test
pnpm -r build
```

When applicable:

```bash
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter frontend test
```

Testing priority:

1. Authentication behavior.
2. Authorization behavior.
3. Permission checks.
4. Core services.
5. API endpoints.
6. Frontend guards.
7. Shared contracts compatibility.

---

# Documentation Rules

Update documentation when the refactor changes:

* architecture,
* folder structure,
* commands,
* package manager behavior,
* environment variables,
* authentication behavior,
* authorization behavior,
* shared contracts,
* API behavior,
* database behavior,
* testing workflow.

Pure internal refactors that do not affect usage may not require documentation changes.

---

# Package Manager Rules

Use pnpm only.

Allowed:

```bash
pnpm install
pnpm -r test
pnpm -r build
pnpm frontend:dev
pnpm backend:dev
```

Forbidden:

```bash
npm install
npm run
npx
```

Do not generate `package-lock.json`.

---

# Refactor Safety Checklist

Before finishing a refactor, verify:

* existing behavior is preserved,
* security behavior is preserved,
* tests pass or test impact is explained,
* no unrelated changes were introduced,
* no project-specific modules were added,
* no unnecessary dependencies were added,
* no `package-lock.json` was generated,
* documentation was updated when needed,
* changes are easy to review.

---

# Recommended Final Response

When OpenCode finishes a refactor, it should summarize:

* what was refactored,
* why it was refactored,
* affected files,
* behavior preserved,
* tests run,
* documentation updated,
* risks or follow-up suggestions.

---

# Out of Scope

This workflow must not introduce:

* new features,
* project-specific business modules,
* broad architecture rewrites,
* domain-specific logic,
* security bypasses,
* unnecessary dependencies.

Domain-specific examples such as POS, inventory, sales, billing, logistics or warehouse workflows must only be handled when a project-specific specification explicitly requires them.

---

# AI Agent Rules

AI agents performing refactors must:

1. Preserve behavior.
2. Preserve security rules.
3. Keep changes focused.
4. Avoid unrelated rewrites.
5. Respect frontend/backend separation.
6. Keep IAM modules reusable.
7. Use pnpm only.
8. Avoid generating `package-lock.json`.
9. Update tests when needed.
10. Update documentation when architecture or workflows change.
