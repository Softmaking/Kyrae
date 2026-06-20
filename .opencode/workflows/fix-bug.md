# OpenCode Workflow: Fix Bug

# Overview

This workflow defines how OpenCode should analyze and fix bugs in Kyrae.

The archetype is IAM-first, security-first and designed as a generic enterprise foundation. Bug fixes must be minimal, safe and aligned with the existing architecture.

---

# Goal

The goal of this workflow is to ensure bug fixes are:

* focused,
* safe,
* testable,
* documented when needed,
* aligned with architecture,
* aligned with security standards,
* free from unrelated refactors,
* compatible with pnpm workspace.

---

# Mandatory Reading

Before fixing a bug, OpenCode must read:

1. `docs/system-context.md`
2. `docs/source-of-truth.md`
3. `README.md`
4. `AGENTS.md`
5. `.opencode/instructions.md`
6. `docs/architecture/overview.md`
7. `docs/standards/coding-standards.md`
8. `docs/standards/security-standards.md`
9. Related feature specification when available
10. Application-specific `AGENTS.md`
11. Application-specific `README.md`

If the bug affects APIs, also read:

```txt
docs/standards/api-standards.md
```

If the bug affects database behavior, also read:

```txt
docs/standards/database-standards.md
```

If the bug affects authentication or authorization, also read:

```txt
docs/architecture/authentication.md
docs/architecture/authorization.md
```

---

# Bug Fix Principles

Bug fixes must follow these principles:

* reproduce or understand the issue before changing code,
* identify the smallest safe fix,
* avoid unrelated refactors,
* preserve architecture boundaries,
* preserve security rules,
* update tests when behavior changes,
* update documentation when commands, architecture or behavior changes.

---

# Bug Classification

Before fixing, classify the bug.

## Frontend Bug

Examples:

* route guard issue,
* auth state issue,
* permission-based UI issue,
* API integration issue,
* form validation issue,
* layout issue.

## Backend Bug

Examples:

* DTO validation issue,
* auth guard issue,
* permission guard issue,
* service logic issue,
* database query issue,
* migration issue,
* API response issue.

## Shared Contract Bug

Examples:

* incorrect DTO type,
* missing enum,
* incompatible contract between frontend and backend.

## Infrastructure Bug

Examples:

* Docker Compose issue,
* environment variable issue,
* script issue,
* database connection issue.

## Documentation Bug

Examples:

* incorrect command,
* outdated architecture rule,
* missing environment variable,
* inconsistent naming.

---

# Investigation Workflow

Before modifying code:

1. Read the error message or bug report.
2. Identify the affected app or package.
3. Locate related files.
4. Check related documentation.
5. Check recent changes if available.
6. Identify expected behavior.
7. Identify actual behavior.
8. Determine the smallest safe fix.

---

# Planning Step

For small bugs, OpenCode may apply a direct fix.

For medium or security-sensitive bugs, OpenCode should propose a short plan first.

The plan should include:

* suspected cause,
* affected files,
* fix approach,
* security impact,
* tests to run,
* documentation impact.

---

# Frontend Bug Fix Rules

When fixing frontend bugs:

* keep components lightweight,
* do not move business logic into components,
* keep API calls inside services,
* keep auth state centralized,
* keep permission checks reusable,
* avoid duplicating logic,
* avoid unnecessary UI rewrites,
* preserve responsive behavior.

Common checks:

* route guards,
* interceptors,
* Signals state,
* service calls,
* permission checks,
* error handling,
* form validation.

---

# Backend Bug Fix Rules

When fixing backend bugs:

* keep controllers lightweight,
* keep business logic inside services,
* validate DTOs,
* preserve guards,
* do not bypass authorization,
* do not access database directly from controllers,
* use migrations for schema changes,
* avoid exposing sensitive fields.

Common checks:

* DTO validation,
* service logic,
* auth guards,
* permission guards,
* TypeORM queries,
* entity relationships,
* error handling,
* Scalar API documentation.

---

# Authentication Bug Fix Rules

Authentication bugs are security-sensitive.

Check:

* credential validation,
* user status validation,
* inactive user blocking,
* locked user blocking,
* JWT payload,
* token expiration,
* refresh token validation,
* refresh token revocation,
* external provider mapping,
* audit events.

Do not:

* bypass local user validation,
* expose token internals,
* log secrets,
* weaken password handling,
* remove security checks to make tests pass.

---

# Authorization Bug Fix Rules

Authorization bugs are security-sensitive.

Check:

* required permissions,
* backend guards,
* frontend guards,
* permission decorators,
* permission service,
* user-role relationships,
* role-permission relationships,
* frontend permission state,
* backend source of truth.

Do not:

* rely only on frontend checks,
* hardcode permissions across components,
* duplicate permission logic,
* bypass backend guards.

---

# Database Bug Fix Rules

When a bug requires database changes:

* use TypeORM migrations,
* keep schema changes focused,
* add or update constraints when needed,
* add or update indexes intentionally,
* avoid manual schema changes,
* do not use production data,
* do not enable `synchronize` in production.

If a migration is required, document how to run it.

---

# Shared Contracts Bug Fix Rules

When fixing shared contracts:

* check frontend impact,
* check backend impact,
* update exports through `index.ts`,
* avoid breaking changes when possible,
* do not add framework-specific implementation,
* do not add business logic,
* do not add TypeORM entities.

---

# Infrastructure Bug Fix Rules

When fixing infrastructure bugs:

* do not hardcode secrets,
* do not hardcode local machine paths,
* do not hardcode production domains,
* keep Docker optional for daily development,
* update `.env.example` if variables change,
* update documentation when commands change.

---

# Testing Rules

Bug fixes should include tests when behavior changes.

Testing priority:

1. Security-sensitive behavior.
2. Authentication.
3. Authorization.
4. Backend service logic.
5. API endpoints.
6. Frontend guards.
7. Critical UI flows.

Use pnpm only.

Examples:

```bash
pnpm -r test
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter frontend test
pnpm -r build
```

---

# Regression Prevention

When fixing a bug, consider whether a regression test is needed.

Add regression tests when:

* the bug affects authentication,
* the bug affects authorization,
* the bug affects data integrity,
* the bug affects core IAM flows,
* the bug could reappear easily,
* the bug is caused by missing validation.

---

# Documentation Rules

Update documentation when the bug fix changes:

* commands,
* environment variables,
* architecture behavior,
* authentication behavior,
* authorization behavior,
* API contracts,
* database schema,
* Docker behavior,
* testing workflow.

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

# Completion Checklist

Before finishing a bug fix, verify:

* root cause was identified or reasonably explained,
* fix is minimal and focused,
* no unrelated refactor was introduced,
* architecture boundaries are preserved,
* security rules are preserved,
* tests were added or updated when appropriate,
* documentation was updated when needed,
* pnpm was used,
* no `package-lock.json` was generated,
* no secrets were committed.

---

# Recommended Final Response

When OpenCode finishes a bug fix, it should summarize:

* bug cause,
* fix applied,
* affected files,
* tests run,
* documentation updated,
* remaining risks,
* follow-up recommendations.

---

# Out of Scope

This workflow must not introduce:

* project-specific business modules,
* domain-specific logic unrelated to the bug,
* broad rewrites,
* unnecessary dependencies,
* architecture changes without documentation.

Domain-specific examples such as POS, inventory, sales, billing, logistics or warehouse workflows must only be handled when a project-specific specification explicitly requires them.
