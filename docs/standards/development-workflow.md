# Development Workflow

# Overview

This document defines the recommended development workflow for the Kyrae.

Kyrae is IAM-first, security-first and optimized for AI-assisted development using tools such as OpenCode, Codex, Claude Code and Warp Agents.

The workflow must keep the repository:

* modular,
* secure,
* maintainable,
* generic,
* reusable,
* aligned with pnpm workspace,
* free from project-specific business modules unless explicitly specified.

---

# Development Principles

Development must follow these principles:

* read documentation before generating code,
* define feature specifications before complex implementation,
* keep frontend and backend decoupled,
* keep IAM and security concerns explicit,
* avoid unnecessary files,
* avoid duplicated logic,
* use pnpm only,
* document architecture changes,
* keep business-specific logic outside the Kyrae platform.

---

# Recommended Reading Order

Before starting development:

1. `README.md`
2. `AGENTS.md`
3. `docs/architecture/overview.md`
4. `docs/standards/coding-standards.md`
5. `docs/standards/security-standards.md`
6. `specs/product/vision.md`
7. `specs/product/modules.md`
8. Related feature specs
9. Application-specific `AGENTS.md`
10. Application-specific `README.md`

---

# Daily Development Workflow

Recommended daily workflow:

```bash
pnpm install
pnpm frontend:dev
pnpm backend:dev
```

Optional database with Docker:

```bash
pnpm docker:db
```

Full Docker environment:

```bash
pnpm docker:up
```

Shutdown Docker environment:

```bash
pnpm docker:down
```

---

# Feature Development Workflow

Before implementing a feature:

1. Identify whether the feature is generic or project-specific.
2. Create or review the related feature specification.
3. Review architecture documentation.
4. Review coding standards.
5. Review security standards.
6. Define affected applications and packages.
7. Create an implementation plan.
8. Implement changes.
9. Add or update tests.
10. Update documentation when needed.

---

# Feature Specification First

For non-trivial features, create a feature folder:

```txt
specs/features/feature-name/
├── requirements.md
├── acceptance-criteria.md
├── api-contract.md
├── data-model.md
├── tasks.md
└── notes.md
```

A feature specification should define:

* requirements,
* acceptance criteria,
* API contract,
* data model,
* permissions,
* frontend behavior,
* backend behavior,
* testing expectations,
* out-of-scope items.

---

# AI-Assisted Development Workflow

When using AI agents:

1. Ask the agent to read the required documentation.
2. Provide the related feature specification.
3. Ask for a plan before implementation.
4. Review the plan.
5. Generate code in small steps.
6. Review generated changes.
7. Run tests.
8. Update docs if needed.
9. Commit using Conventional Commits.

Recommended prompt:

```txt
Read AGENTS.md, docs/architecture/overview.md, docs/standards/coding-standards.md, docs/standards/security-standards.md and the related feature spec.

Propose an implementation plan before generating code.

Keep the implementation IAM-first, security-first, generic and aligned with the existing architecture.
```

---

# Backend Development Workflow

For backend changes:

1. Review backend `AGENTS.md`.
2. Identify the module.
3. Define DTOs.
4. Define entities if needed.
5. Create migrations if schema changes.
6. Implement service logic.
7. Keep controllers lightweight.
8. Add guards/decorators when authorization is required.
9. Document API with Scalar.
10. Add unit and e2e tests.

Backend rules:

* Do not place business logic in controllers.
* Do not bypass DTO validation.
* Do not access the database directly from controllers.
* Do not create domain-specific modules unless specified.
* Use TypeORM migrations for schema changes.

---

# Frontend Development Workflow

For frontend changes:

1. Review frontend `AGENTS.md`.
2. Identify the feature folder.
3. Define route behavior.
4. Define guards if needed.
5. Define services for API communication.
6. Use Signals when appropriate.
7. Use Tailwind CSS as primary styling.
8. Use Angular Material when appropriate.
9. Keep components lightweight.
10. Add tests for critical flows.

Frontend rules:

* Do not place business logic in components.
* Do not call APIs directly from components.
* Do not duplicate permission checks.
* Do not hardcode permissions across components.
* Keep authentication and authorization centralized.

---

# Shared Contracts Workflow

When modifying `packages/shared-contracts`:

1. Confirm the contract is generic or explicitly required.
2. Check frontend impact.
3. Check backend impact.
4. Add DTOs, enums, types or interfaces only.
5. Export public contracts through `index.ts`.
6. Do not add business logic.
7. Do not add framework-specific implementation.
8. Update docs when contracts are changed.

Allowed:

* DTOs,
* enums,
* types,
* interfaces,
* permission codes.

Not allowed:

* services,
* repositories,
* entities,
* guards,
* components,
* secrets,
* environment values.

---

# Database Change Workflow

When changing the database:

1. Define the data model in the feature spec.
2. Update TypeORM entities.
3. Create a migration.
4. Add indexes and constraints intentionally.
5. Update DTOs if needed.
6. Update shared contracts if needed.
7. Add or update tests.
8. Document relevant changes.

Rules:

* Do not enable `synchronize` in production.
* Do not modify schema without migrations.
* Do not store plain text passwords.
* Do not store raw refresh tokens.
* Do not expose sensitive fields.

---

# Security Review Workflow

Security-sensitive changes require extra review.

Security-sensitive areas:

* authentication,
* authorization,
* users,
* roles,
* permissions,
* refresh tokens,
* audit,
* environment variables,
* external identity providers.

Review checklist:

* Are secrets protected?
* Are DTOs validated?
* Are backend guards applied?
* Are permissions enforced server-side?
* Are audit events considered?
* Are sensitive fields excluded from responses?
* Are environment variables documented?
* Are frontend checks treated only as UX support?

---

# Testing Workflow

Before finishing a feature:

```bash
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
pnpm frontend:build
pnpm backend:build
```

When lint scripts exist:

```bash
pnpm backend:lint
```

Testing priority:

1. Authentication flows.
2. Authorization rules.
3. Permission checks.
4. User/role/permission services.
5. API endpoints.
6. Route guards.
7. Critical UI flows.

Do not remove tests to make code pass.

---

# Documentation Workflow

Update documentation when changes affect:

* architecture,
* commands,
* package manager behavior,
* environment variables,
* authentication,
* authorization,
* database,
* Docker,
* deployment,
* shared contracts,
* testing strategy.

Documentation commits should use:

```txt
docs(scope): message
```

Example:

```txt
docs(architecture): update authorization strategy
```

---

# Commit Workflow

Use Conventional Commits.

Examples:

```txt
feat(auth): agregar flujo de refresh token
fix(frontend): corregir redireccion del auth guard
docs(standards): agregar estandares de testing
refactor(backend): simplificar servicio de permisos
chore(workspace): actualizar scripts de pnpm
test(auth): agregar pruebas e2e de login
```

---

# Pull Request Workflow

Pull requests should include:

* summary,
* affected areas,
* related specs,
* changes,
* testing,
* security impact,
* notes.

For AI-generated changes, mention:

* which agent/tool was used,
* what was reviewed manually,
* what tests were executed.

---

# Local Validation Checklist

Before committing:

```bash
pnpm install
pnpm backend:lint
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
pnpm frontend:build
pnpm backend:build
```

Check manually:

* no `package-lock.json`,
* no secrets,
* no project-specific modules unless specified,
* no business logic in components,
* no business logic in controllers,
* docs updated when needed.

---

# Out of Scope

The generic development workflow must not include:

* project-specific business processes,
* customer-specific approval flows,
* project-specific deployment environments,
* hardcoded domains,
* hardcoded credentials,
* domain-specific module workflows.

Those must be defined by each project that uses Kyrae.

---

# AI Agent Rules

AI agents must follow these rules:

1. Read the required documentation before generating code.
2. Ask for clarification when requirements are ambiguous.
3. Propose a plan before medium or large changes.
4. Keep implementation generic unless a project spec says otherwise.
5. Do not create business-specific modules without explicit specification.
6. Do not use npm commands.
7. Do not generate `package-lock.json`.
8. Do not bypass security rules.
9. Do not introduce unnecessary dependencies.
10. Update docs when behavior, architecture or commands change.
