# OpenCode Workflow: Review Code

# Overview

This workflow defines how OpenCode should review code in Kyrae.

The archetype is IAM-first, security-first and designed as a generic enterprise foundation. Reviews must focus on architecture consistency, security, maintainability and avoiding project-specific business assumptions.

---

# Goal

The goal of this workflow is to ensure code reviews are:

* structured,
* security-focused,
* architecture-aware,
* actionable,
* minimal,
* aligned with pnpm workspace,
* aligned with IAM-first principles,
* useful for both human and AI-assisted development.

---

# Mandatory Reading

Before reviewing code, OpenCode must read:

1. `docs/system-context.md`
2. `docs/source-of-truth.md`
3. `README.md`
4. `AGENTS.md`
5. `.opencode/instructions.md`
6. `docs/architecture/overview.md`
7. `docs/standards/coding-standards.md`
8. `docs/standards/security-standards.md`
9. `docs/standards/code-review-checklist.md`
10. Related feature specification when available
11. Application-specific `AGENTS.md`
12. Application-specific `README.md`

If the review affects APIs, also read:

```txt
docs/standards/api-standards.md
```

If the review affects database behavior, also read:

```txt
docs/standards/database-standards.md
```

If the review affects authentication or authorization, also read:

```txt
docs/architecture/authentication.md
docs/architecture/authorization.md
```

---

# Review Principles

Reviews must follow these principles:

* security first,
* architecture consistency,
* minimal and actionable feedback,
* no unnecessary rewrites,
* no broad refactors unless explicitly requested,
* preserve frontend/backend separation,
* preserve IAM module reusability,
* avoid project-specific logic in the generic archetype.

---

# Review Scope

A code review should check:

* architecture,
* security,
* authentication,
* authorization,
* frontend structure,
* backend structure,
* shared contracts,
* database changes,
* API design,
* testing,
* documentation,
* package manager compliance,
* unnecessary dependencies.

---

# Review Output Format

Recommended review output:

```txt
Summary
Critical issues
Recommended changes
Optional improvements
Testing recommendations
Documentation impact
Final verdict
```

Use severity levels:

```txt
Critical
High
Medium
Low
Suggestion
```

---

# Critical Issues

Mark as critical when the code:

* exposes secrets,
* bypasses authentication,
* bypasses authorization,
* stores plain text passwords,
* stores raw refresh tokens,
* exposes password hashes,
* allows unauthorized access,
* modifies database schema without migration,
* introduces project-specific modules into the generic archetype without specification,
* uses npm or generates package-lock.json.

Critical issues should block approval.

---

# Architecture Review

Check:

* Does the code follow modular architecture?
* Are frontend and backend decoupled?
* Are shared contracts used correctly?
* Is business logic outside shared contracts?
* Are IAM modules generic and reusable?
* Are business-specific modules avoided unless specified?
* Are architecture changes documented?

Reject if:

* business logic is placed in shared contracts,
* frontend imports backend implementation,
* backend depends on frontend implementation,
* generic archetype receives project-specific domain logic without specification.

---

# Security Review

Check:

* Are secrets protected?
* Are DTOs validated?
* Are private endpoints protected?
* Are restricted endpoints permission-protected?
* Are sensitive fields excluded from responses?
* Are audit events considered?
* Are error messages safe?
* Are environment variables documented?
* Are dependencies necessary?

Reject if:

* secrets are committed,
* token values are logged,
* backend guards are bypassed,
* sensitive fields are exposed,
* frontend is treated as final security authority.

---

# Authentication Review

Check:

* Does login validate credentials correctly?
* Does login validate user status?
* Are inactive users blocked?
* Are locked users blocked?
* Is JWT payload safe?
* Are refresh tokens handled securely?
* Are refresh tokens stored hashed when persisted?
* Are external providers still mapped to local IAM rules?
* Are audit events considered?

Reject if:

* external provider login bypasses local user validation,
* password hashes are exposed,
* raw refresh tokens are persisted,
* authentication logic is placed in controllers.

---

# Authorization Review

Check:

* Are roles and permissions used consistently?
* Are backend guards applied?
* Are permission decorators used when needed?
* Is permission logic centralized?
* Are frontend guards used for UX protection?
* Does backend remain the final authority?
* Are permissions not hardcoded across many components?

Reject if:

* API access relies only on frontend checks,
* permission logic is duplicated,
* guards are bypassed,
* permission checks are missing on restricted endpoints.

---

# Backend Review

Check:

* Controllers are lightweight.
* Services contain business logic.
* DTOs are explicit and validated.
* Entities are not used as request DTOs.
* Database access is not performed inside controllers.
* TypeORM migrations exist for schema changes.
* Scalar docs are updated for API changes.
* Tests exist for important behavior.

Reject if:

* business logic is placed in controllers,
* schema changes have no migration,
* DTO validation is bypassed,
* sensitive fields are returned.

---

# Frontend Review

Check:

* Components are standalone.
* Components are lightweight.
* API calls go through services.
* Signals are used when appropriate.
* RxJS complexity is not unnecessary.
* Authentication state is centralized.
* Permission logic is centralized.
* UI remains responsive.
* Backend implementation details are hidden from components.

Reject if:

* components contain business logic,
* components call APIs directly,
* permission checks are duplicated,
* frontend-only authorization is used as security.

---

# Shared Contracts Review

Check:

* Only DTOs, enums, types and interfaces are included.
* Public contracts are exported through `index.ts`.
* No business logic is present.
* No framework-specific implementation is present.
* No TypeORM entities are present.
* No secrets or environment values are present.
* Frontend and backend impact is considered.

Reject if:

* services, repositories, guards or components are added to shared contracts,
* contracts expose sensitive data,
* breaking changes are made without documentation.

---

# Database Review

Check:

* TypeORM migrations are present for schema changes.
* `synchronize` is not required for production.
* Relationships are explicit.
* Indexes and constraints are intentional.
* Sensitive fields are protected.
* Refresh tokens are not stored raw.
* Passwords are not stored plain text.
* No production data is committed.

Reject if:

* schema changes are manual only,
* production data appears in files,
* secrets appear in seeds,
* database credentials are hardcoded.

---

# API Review

Check:

* Routes follow REST conventions.
* Routes use kebab-case.
* DTOs are explicit.
* Responses avoid sensitive fields.
* Pagination is considered for list endpoints.
* Filters are validated.
* Error handling is consistent.
* Authentication and permission requirements are documented.
* Scalar documentation is updated.

Reject if:

* endpoints expose entities with sensitive fields,
* restricted endpoints lack guards,
* unvalidated query input reaches database logic,
* APIs are domain-specific without a feature spec.

---

# Testing Review

Check:

* Unit tests are updated when logic changes.
* e2e tests are updated for critical flows.
* IAM and security-sensitive tests are prioritized.
* Tests do not use production data.
* Tests do not contain real secrets.
* Tests are not removed to make code pass.

Recommend tests for:

* auth,
* authorization,
* permissions,
* route guards,
* API guards,
* role assignment,
* permission assignment,
* audit events.

---

# Documentation Review

Check whether documentation should be updated.

Documentation must be updated when changes affect:

* architecture,
* commands,
* package manager behavior,
* environment variables,
* authentication,
* authorization,
* database schema,
* Docker,
* deployment,
* shared contracts,
* testing strategy.

---

# Package Manager Review

Check:

* pnpm is used.
* No npm commands were introduced.
* No `package-lock.json` was generated.
* Workspace-aware commands are used.
* `pnpm-lock.yaml` is committed when dependencies change.
* Internal tooling lock files are not deleted unless explicitly required.

Reject if:

* npm is used,
* package-lock.json appears,
* dependency changes are undocumented.

---

# Dependency Review

Before accepting new dependencies, check:

* Is the dependency necessary?
* Is it maintained?
* Does the project already have an equivalent tool?
* Does it increase complexity?
* Does it affect security?
* Does it work with pnpm workspace?

Recommend avoiding dependencies for simple logic.

---

# AI-Generated Code Review

When reviewing AI-generated code, check:

* Did the agent follow the reading order?
* Did the agent follow specs?
* Did it create unnecessary files?
* Did it invent domain-specific modules?
* Did it bypass security?
* Did it use npm?
* Did it duplicate logic?
* Did it update tests and docs when needed?

---

# Review Verdict

Use one of these final verdicts:

```txt
Approved
Approved with minor suggestions
Changes requested
Blocked due to security issue
Blocked due to architecture issue
Blocked due to missing specification
```

---

# Recommended Final Response

A review should include:

```txt
Summary:
- Short explanation.

Critical issues:
- Issue 1

Recommended changes:
- Change 1

Optional improvements:
- Suggestion 1

Testing:
- Tests to run or add

Documentation:
- Docs to update

Verdict:
- Final verdict
```

---

# Out of Scope

This review workflow must not introduce review rules specific to:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* customer-specific workflows.

Those rules must be defined by project-specific documentation.

---

# AI Agent Rules

AI agents performing review must:

1. Check security first.
2. Check architecture consistency.
3. Check IAM and authorization.
4. Check frontend/backend separation.
5. Check DTO validation and API contracts.
6. Check database migrations.
7. Check shared contracts.
8. Check package manager compliance.
9. Suggest minimal actionable improvements.
10. Avoid broad rewrites unless explicitly requested.
