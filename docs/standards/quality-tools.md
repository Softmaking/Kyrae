# Quality Tools

# Overview

This document defines the quality tools strategy for the Kyrae.

Kyrae is IAM-first, security-first and optimized for AI-assisted development. Quality tools must help keep the codebase consistent, safe, maintainable and easy to review.

The repository uses pnpm workspace as the official package manager.

---

# Goals

Quality tools must help to:

- enforce consistent formatting,
- detect common code issues,
- reduce avoidable bugs,
- standardize commits,
- improve pull request quality,
- improve AI-generated code quality,
- protect architecture consistency,
- prevent accidental npm usage,
- keep frontend and backend standards aligned.

---

# Recommended Tooling

The quality toolset included in the Kyrae base:

- ESLint (frontend and backend),
- Prettier (formatting),
- Husky (git hooks),
- Commitlint (commit message validation),
- Conventional Commits format.

Installed but not currently wired into hooks:

- lint-staged (incremental linting).

Optional future tools:

- dependency audit tools,
- code coverage tools,
- static analysis tools,
- security scanning tools,
- SonarQube or SonarCloud,
- CI/CD quality gates.

---

# ESLint

ESLint is used to detect code issues and enforce code quality rules.

ESLint helps detect:

- unused variables,
- unsafe patterns,
- inconsistent imports,
- possible bugs,
- TypeScript issues,
- Angular issues,
- NestJS/Node.js issues.

## Rules

- Keep ESLint enabled for frontend and backend.
- Do not disable ESLint rules globally without justification.
- Prefer targeted exceptions when needed.
- Do not remove lint rules just to make code pass.
- Keep rules aligned with the architecture.

## Recommended Commands

```bash
pnpm backend:lint
```

Commands depend on package scripts.

---

# Prettier

Prettier is used to format code consistently.

Prettier helps avoid style debates and keeps code easier to review.

## Rules

- Use Prettier for formatting.
- Do not manually enforce formatting styles that conflict with Prettier.
- Keep formatting consistent across frontend, backend and packages.
- Format documentation when appropriate.

## Recommended Commands

```bash
pnpm --dir apps/backend format
```

Commands depend on package scripts.

---

# Husky

Husky is included in the Kyrae base and runs repository quality hooks.

Husky may be used to run Git hooks.

Recommended hooks:

- pre-commit,
- commit-msg.

## pre-commit

Current tasks:

- run frontend lint,
- run backend lint.

## commit-msg

Recommended tasks:

- run Commitlint,
- enforce Conventional Commits.

## Rules

- Keep hooks fast.
- Avoid running very heavy tasks on every commit.
- Run full test/build validation in CI or manually before PRs.
- Do not bypass hooks unless absolutely necessary and justified.

---

# lint-staged (Installed - Not Wired)

> **Note:** lint-staged is installed but the current pre-commit hook runs full frontend/backend lint instead.

lint-staged may run checks only on changed files.

This keeps pre-commit checks fast.

Recommended usage:

- format changed files,
- lint changed files,
- avoid full repository checks on every commit.

Example conceptual configuration:

```json
{
  "*.{ts,js,json,md,css,scss,html}": ["prettier --write"],
  "*.{ts,js}": ["eslint --fix"]
}
```

Project configuration may vary.

---

# Commitlint

Commitlint is included and is executed by the `commit-msg` hook.

Commitlint validates commit messages.

The repository should follow Conventional Commits.

Recommended format:

```txt
type(scope): message
```

Examples:

```txt
feat(auth): agregar endpoint de login
fix(frontend): corregir permission guard
docs(standards): agregar guia de herramientas de calidad
refactor(backend): simplificar servicio de usuarios
chore(workspace): actualizar scripts de pnpm
test(auth): agregar pruebas e2e de login
```

---

# Conventional Commits

Conventional Commits help maintain a readable and automated history.

Recommended types:

```txt
feat
fix
docs
refactor
chore
test
style
build
ci
perf
revert
```

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

Avoid vague messages:

```txt
update
changes
fix stuff
wip
final
```

---

# Package Manager Enforcement

The repository uses pnpm only.

Allowed:

```bash
pnpm install
pnpm frontend:dev
pnpm backend:dev
pnpm frontend:build
pnpm backend:build
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
```

Forbidden:

```bash
npm install
npm run
npx
```

Do not generate:

```txt
package-lock.json
```

The official lock file is:

```txt
pnpm-lock.yaml
```

Internal tooling lock files should not be deleted unless explicitly required.

---

# Recommended Root Scripts

The root `package.json` should expose common quality commands.

Current root scripts:

```json
{
  "scripts": {
    "frontend:lint": "pnpm --dir apps/frontend lint",
    "backend:lint": "pnpm --dir apps/backend lint",
    "frontend:test": "pnpm --dir apps/frontend test",
    "frontend:e2e": "pnpm --dir apps/frontend e2e",
    "backend:test": "pnpm --dir apps/backend test",
    "backend:test:e2e": "pnpm --dir apps/backend test:e2e",
    "frontend:build": "pnpm --dir apps/frontend build",
    "backend:build": "pnpm --dir apps/backend build"
  }
}
```

Project scripts may vary depending on frontend and backend setup.

---

# Recommended Validation Workflow

Before committing:

```bash
pnpm backend:lint
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
pnpm frontend:build
pnpm backend:build
```

Before opening a pull request:

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

When Docker is involved:

```bash
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

---

# Frontend Quality Rules

Frontend quality tools should validate:

- Angular code style,
- TypeScript quality,
- standalone component consistency,
- unused imports,
- template issues,
- formatting,
- test execution.

Frontend must continue to follow:

- standalone components,
- Signals when appropriate,
- API calls through services,
- centralized auth and permission logic,
- Tailwind CSS as primary styling.

---

# Backend Quality Rules

Backend quality tools should validate:

- TypeScript quality,
- NestJS structure,
- unused imports,
- DTO validation patterns,
- formatting,
- test execution.

Backend must continue to follow:

- modular architecture,
- lightweight controllers,
- business logic in services,
- TypeORM migrations,
- Scalar API documentation,
- authentication and authorization guards.

---

# Shared Contracts Quality Rules

Shared contracts should remain:

- small,
- stable,
- framework-independent,
- easy to consume,
- free from business logic.

Quality checks should verify:

- exports are valid,
- frontend compiles,
- backend compiles,
- no framework-specific implementation is added,
- no secrets are added.

---

# Security Quality Checks

Quality workflows should help prevent:

- committed secrets,
- exposed tokens,
- raw refresh token storage,
- password hash exposure,
- missing DTO validation,
- missing guards,
- npm lock files,
- production data in the repository.

Recommended future additions:

- secret scanning,
- dependency scanning,
- static security analysis,
- CI/CD quality gates.

---

# CI/CD Quality Gates

Future CI/CD may include:

1. Install dependencies.
2. Validate formatting.
3. Run lint.
4. Run unit tests.
5. Run e2e tests when environment is available.
6. Build frontend.
7. Build backend.
8. Run security checks.
9. Build Docker images when needed.

Recommended command sequence:

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

---

# Code Coverage

Code coverage is optional initially.

Recommended future coverage targets should prioritize:

- authentication,
- authorization,
- permission guards,
- user management,
- role management,
- permission management,
- audit events,
- critical frontend flows.

Avoid focusing only on percentage. Focus on meaningful coverage for security-sensitive behavior.

---

# SonarQube / SonarCloud

SonarQube or SonarCloud may be added in enterprise projects.

Possible use cases:

- code smells,
- duplicated code,
- security hotspots,
- maintainability rating,
- technical debt tracking,
- pull request quality gates.

This should be configured per project.

---

# AI-Assisted Development Quality

When using AI agents:

- ask for a plan before large changes,
- ask agents to follow documentation,
- review generated code manually,
- run quality commands after generation,
- reject unnecessary files,
- reject architecture violations,
- reject security bypasses.

AI-generated code must be reviewed like human-written code.

---

# Quality Checklist

Before approving changes, verify:

- formatting is consistent,
- lint passes,
- tests pass or missing tests are justified,
- build passes,
- no npm commands were used,
- no package-lock.json was generated,
- no secrets were committed,
- architecture rules are followed,
- security rules are followed,
- documentation is updated when needed.

---

# Out of Scope

The generic quality tools document must not include:

- customer-specific quality gates,
- project-specific branch protection rules,
- domain-specific test coverage rules,
- customer-specific CI/CD secrets,
- production deployment credentials.

Those must be defined per project.

---

# AI Agent Rules

AI agents must follow these rules:

1. Use pnpm commands only.
2. Do not generate `package-lock.json`.
3. Do not remove quality tools to fix errors.
4. Do not disable lint rules globally without justification.
5. Do not remove tests to make code pass.
6. Do not add unnecessary dependencies.
7. Keep quality configuration generic.
8. Update documentation when quality workflows change.
9. Suggest tests for security-sensitive changes.
10. Treat AI-generated code as requiring review.
