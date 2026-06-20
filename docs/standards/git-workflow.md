# Git Workflow

# Overview

This document defines the recommended Git workflow for the Kyrae.

The goal is to keep the repository clean, traceable and easy to maintain while supporting AI-assisted development workflows.

This repository uses:

* pnpm workspace,
* Conventional Commits,
* feature-based development,
* documentation-first changes,
* IAM-first and security-first standards.

---

# Goals

The Git workflow must support:

* readable history,
* clear feature tracking,
* safe collaboration,
* clean pull requests,
* predictable releases,
* AI-assisted development,
* easy rollback when needed.

---

# Branch Strategy

Recommended branch types:

```txt
main
develop
feature/*
fix/*
hotfix/*
docs/*
refactor/*
chore/*
```

---

# Main Branches

## main

The `main` branch represents stable production-ready code.

Rules:

* must remain stable,
* must not receive direct commits unless explicitly allowed,
* should receive changes through pull requests,
* should contain reviewed and tested code.

## develop

The `develop` branch represents the active integration branch.

Rules:

* receives completed features,
* may be used for staging or QA,
* should remain buildable,
* should not contain unfinished experimental work.

---

# Working Branches

## feature/*

Used for new features.

Examples:

```txt
feature/auth-login
feature/user-management
feature/role-permission-management
```

## fix/*

Used for bug fixes.

Examples:

```txt
fix/login-validation
fix/permission-guard
fix/token-refresh
```

## hotfix/*

Used for urgent production fixes.

Examples:

```txt
hotfix/refresh-token-expiration
hotfix/security-header
```

## docs/*

Used for documentation changes.

Examples:

```txt
docs/update-authentication-architecture
docs/add-feature-spec-template
```

## refactor/*

Used for refactoring without changing behavior.

Examples:

```txt
refactor/auth-service
refactor/shared-contracts-exports
```

## chore/*

Used for maintenance tasks.

Examples:

```txt
chore/update-pnpm-workspace
chore/configure-eslint
chore/add-husky
```

---

# Branch Naming Rules

Use kebab-case.

Good examples:

```txt
feature/user-management
fix/auth-guard-redirect
docs/update-coding-standards
refactor/permission-service
chore/update-dependencies
```

Avoid:

```txt
FeatureUser
fix_login
changes
test
my-branch
```

---

# Commit Standard

This repository uses Conventional Commits.

**Language:** All commits must be written in **Spanish**.

Recommended format:

```txt
type(scope): message
```

Examples:

```txt
feat(auth): agregar endpoint de login
fix(frontend): corregir redireccion del auth guard
docs(architecture): actualizar estrategia de autenticacion
refactor(backend): simplificar servicio de permisos
chore(workspace): configurar scripts de pnpm
test(auth): agregar pruebas e2e de login
```

---

# Commit Types

## feat

Used for new features.

```txt
feat(auth): agregar flujo de refresh token
```

## fix

Used for bug fixes.

```txt
fix(auth): rechazar usuarios inactivos durante login
```

## docs

Used for documentation only.

```txt
docs(specs): add feature specification workflow
```

## refactor

Used for code restructuring without behavior changes.

```txt
refactor(users): split user service methods
```

## chore

Used for maintenance tasks.

```txt
chore(workspace): update pnpm configuration
```

## test

Used for tests.

```txt
test(permissions): add permission guard tests
```

## style

Used for formatting changes only.

```txt
style(frontend): format shared components
```

## build

Used for build system changes.

```txt
build(docker): add backend Dockerfile
```

## ci

Used for CI/CD changes.

```txt
ci(github): add build workflow
```

---

# Commit Scope

Scopes should be short and meaningful.

Recommended scopes:

```txt
auth
users
roles
permissions
audit
security
frontend
backend
shared-contracts
architecture
standards
workspace
infra
docs
```

Avoid vague scopes:

```txt
misc
stuff
changes
update
```

---

# Pull Request Rules

Every pull request should include:

* clear title,
* summary of changes,
* affected apps/packages,
* testing performed,
* related specs or issues,
* screenshots when UI changes are involved,
* migration notes when database changes are involved.

---

# Pull Request Template

Recommended PR structure:

```md
# Summary

Briefly describe the change.

# Affected Areas

* frontend
* backend
* shared-contracts
* docs
* infra

# Related Specs

* specs/features/feature-name

# Changes

* Change 1
* Change 2
* Change 3

# Testing

* Unit tests
* e2e tests
* Manual validation

# Security Impact

Describe authentication, authorization or data exposure impact.

# Notes

Add assumptions, risks or pending work.
```

---

# AI-Assisted Development Rules

When using AI agents such as OpenCode, Codex or Claude Code:

1. Start from a feature specification when possible.
2. Ask the agent to read `AGENTS.md`.
3. Ask the agent to read related architecture and standards docs.
4. Ask for a plan before medium or large changes.
5. Review generated files before committing.
6. Do not commit generated code blindly.
7. Avoid unrelated refactors in the same branch.
8. Keep commits small and meaningful.

---

# Documentation Change Rules

Documentation changes should use:

```txt
docs(scope): message
```

Examples:

```txt
docs(architecture): add authorization strategy
docs(specs): add module specification guide
docs(infra): document docker strategy
```

Documentation must be updated when changes affect:

* architecture,
* development commands,
* package manager behavior,
* authentication,
* authorization,
* environment variables,
* Docker,
* deployment,
* shared contracts,
* testing strategy.

---

# Database Change Rules

Database changes must include:

* TypeORM migration,
* entity update when applicable,
* DTO update when applicable,
* tests when applicable,
* documentation if architecture or commands change.

Commit example:

```txt
feat(users): add user status migration
```

Never modify database schema manually without migration tracking.

---

# Shared Contracts Change Rules

Changes to `packages/shared-contracts` must be reviewed carefully.

Before committing:

1. Check frontend impact.
2. Check backend impact.
3. Check exports.
4. Check breaking changes.
5. Update documentation when needed.

Commit example:

```txt
feat(shared-contracts): add permission code enum
```

---

# Security Change Rules

Security-related changes should be explicit.

Security-sensitive areas:

* authentication,
* authorization,
* tokens,
* refresh tokens,
* password handling,
* user status,
* role assignment,
* permission assignment,
* audit events,
* environment variables.

Commit examples:

```txt
fix(auth): reject inactive users during login
feat(security): add account lockout policy
feat(audit): record failed login attempts
```

---

# Release Strategy

Initial recommended release style:

```txt
v0.1.0
v0.2.0
v1.0.0
```

Semantic versioning guidance:

* major: breaking changes,
* minor: new compatible features,
* patch: bug fixes.

Example:

```txt
v1.2.3
```

---

# Tagging Rules

Tags should follow semantic versioning.

Examples:

```txt
v0.1.0
v0.2.0
v1.0.0
```

Avoid:

```txt
release1
final
latest
test
```

---

# Merge Strategy

Recommended merge strategy:

* squash merge for feature branches,
* regular merge for release branches if needed,
* avoid merge commits for small changes unless required.

Squash merge helps keep history clean.

---

# What Not To Commit

Do not commit:

* real secrets,
* `.env` with real credentials,
* production credentials,
* generated `package-lock.json`,
* unnecessary build outputs,
* temporary files,
* local IDE files when not standardized,
* logs,
* database dumps with sensitive data.

---

# Files That Should Be Committed

Commit:

* source code,
* documentation,
* migrations,
* tests,
* configuration templates,
* `.env.example`,
* `pnpm-lock.yaml`,
* workspace configuration,
* Docker configuration when generic.

---

# Recommended Pre-Commit Checks

Before committing:

```bash
pnpm install
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

When formatting scripts exist:

```bash
pnpm --dir apps/backend format
```

---

# AI Agent Review Checklist

Before accepting AI-generated code, check:

* Does it follow the architecture?
* Does it preserve frontend/backend separation?
* Does it avoid business-specific modules unless specified?
* Does it use pnpm?
* Does it avoid `package-lock.json`?
* Does it keep IAM/security explicit?
* Does it avoid business logic in components?
* Does it avoid business logic in controllers?
* Does it update tests or docs when needed?

---

# Out of Scope

The Git workflow must not introduce:

* project-specific branching rules into the Kyrae platform,
* customer-specific release rules,
* hardcoded deployment environments,
* business-domain branch naming conventions.

Those rules must be defined by each project when needed.
