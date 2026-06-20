# OpenCode Instructions

# Overview

This repository is an enterprise-ready monorepo architecture designed for scalable enterprise platforms, IAM foundations and AI-assisted development workflows.

OpenCode must always respect:

* repository structure,
* architecture documentation,
* coding standards,
* feature specifications,
* IAM-first principles,
* security-first architecture.

The archetype must remain generic and reusable. Business-specific modules must only be created when a project specification explicitly requires them.

---

# Mandatory Reading Order

Before generating code:

1. `docs/system-context.md`
2. `docs/source-of-truth.md`
3. `README.md`
4. `AGENTS.md`
5. `docs/architecture/overview.md`
6. `docs/standards/coding-standards.md`
7. Related specs
8. Application-specific `AGENTS.md`
9. Application-specific `README.md`

---

# Repository Rules

* Maintain modular architecture.
* Keep frontend and backend decoupled.
* Avoid duplicated logic.
* Respect feature-based organization.
* Do not generate unnecessary files.
* Prefer reusable implementations.
* Respect scalable structure.
* Keep IAM and security concerns explicit.
* Do not introduce project-specific business modules into the archetype unless explicitly requested.
* Do not add domain-specific examples to generic documentation.

---

# Core Enterprise Scope

The core scope of this archetype includes:

* Authentication
* Authorization
* Identity and Access Management
* Users
* Roles
* Permissions
* Audit
* Security
* Organizations
* Branches
* Configuration
* Health

Do not create domain-specific modules such as POS, inventory, sales, billing, logistics or operational workflows unless a specific project specification requires them.

---

# Package Manager Rules

This repository uses pnpm workspace.

Mandatory rules:

* Do not use npm install.
* Do not generate package-lock.json.
* Use pnpm install from repository root.
* Use workspace-aware commands.
* Commit pnpm-lock.yaml.
* Do not modify internal OpenCode tooling files unless explicitly instructed.
* Do not delete internal tooling lock files unless explicitly required.

---

# Frontend Rules

* Use standalone components only.
* Prefer Signals for local state.
* Use services for HTTP communication.
* Avoid business logic inside components.
* Maintain responsive layouts.
* Use Tailwind CSS as primary styling system.
* Use Angular Material when appropriate.
* Centralize authentication and authorization logic.
* Use guards for protected routes.
* Use interceptors for token handling and cross-cutting concerns.
* Do not duplicate permission logic across components.

---

# Backend Rules

* Use modular NestJS architecture.
* Keep controllers lightweight.
* Business logic belongs in services.
* Validate DTOs.
* Use TypeORM migrations.
* Maintain scalable entity relationships.
* Keep IAM modules reusable.
* Avoid coupling IAM modules to project-specific business domains.
* Use Scalar as the official API documentation tool.
* Document authentication and permission requirements when applicable.

---

# Authentication Rules

Initial authentication must be based on:

* email and password,
* JWT access token,
* refresh token strategy.

The architecture must remain prepared for:

* Microsoft Entra ID,
* Google Identity,
* external identity providers,
* future MFA,
* future SSO.

Authentication providers must remain modular and optional.

---

# Authorization Rules

Authorization must be based on roles and permissions.

The system must support:

* user-role relationships,
* role-permission relationships,
* permission-based guards,
* reusable decorators,
* centralized permission checks.

Permission logic must not be duplicated across controllers, services or components.

---

# Docker Strategy

Docker is optional for daily development.

Docker should be used for:

* demos,
* onboarding,
* deployment,
* CI/CD.

The repository must remain Docker-ready but not Docker-dependent.

Daily development may use local pnpm workflows.

---

# Feature Workflow

Recommended workflow:

1. Understand feature requirements.
2. Review architecture constraints.
3. Review related specs.
4. Identify impacted applications and packages.
5. Propose an implementation plan for medium or large changes.
6. Generate implementation.
7. Validate standards.
8. Update documentation when the change affects architecture, commands or workflows.

---

# Bug Fix Workflow

Recommended workflow:

1. Reproduce or understand the reported issue.
2. Identify impacted files.
3. Check related architecture and standards.
4. Apply the smallest safe fix.
5. Avoid unrelated refactors.
6. Validate with tests or clear reasoning.
7. Document important behavior changes.

---

# Review Workflow

Recommended workflow:

1. Check architecture consistency.
2. Check security impact.
3. Check IAM and authorization rules.
4. Check frontend/backend separation.
5. Check DTO validation and API contracts.
6. Check duplicated logic.
7. Check package manager compliance.
8. Suggest minimal and actionable improvements.

---

# Restrictions

* Do not modify architecture without documentation.
* Do not tightly couple applications.
* Do not introduce unnecessary dependencies.
* Do not bypass validations.
* Do not duplicate business logic.
* Do not ignore repository standards.
* Do not add domain-specific examples to generic documentation.
* Do not use npm commands.
* Do not generate package-lock.json.
* Do not place business logic inside frontend components.
* Do not place business logic inside backend controllers.
* Do not access the database directly from controllers.
* Do not create project-specific business modules unless explicitly requested by a feature specification.

---

# Priority Order

Priority order for implementations:

1. Security
2. Architecture consistency
3. Maintainability
4. Scalability
5. Reusability
6. Clean code
7. Performance
8. Development speed
