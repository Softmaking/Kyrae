# Backend AGENTS.md

# Context

This application is the NestJS backend of Kyrae.

It must support the Kyrae assistant platform with a robust IAM and security foundation.

The backend must keep IAM/security modules reusable and avoid unrelated business domains unless a feature specification explicitly requires them.

Before working on backend code, read `docs/system-context.md` and `docs/source-of-truth.md` for full project context.

---

# Official Backend Stack

* NestJS
* TypeScript
* PostgreSQL
* TypeORM
* Scalar
* JWT Authentication
* pnpm Workspace

---

# Backend Rules

## Architecture

* Use modular NestJS architecture.
* Keep modules isolated.
* Keep IAM modules reusable.
* Avoid coupling IAM with business-specific domains.
* Business-specific modules must be created only when a project specification explicitly requires them.

## Controllers

* Controllers must remain lightweight.
* Controllers must not contain business logic.
* Controllers must not access the database directly.
* Controllers should only orchestrate requests, responses and service calls.

## Services

* Business logic belongs in services.
* Services must remain reusable and maintainable.
* Services should expose clear methods with explicit inputs and outputs.
* Services should not be tightly coupled to controllers.

## DTOs

* Validate all DTOs.
* Use explicit request and response DTOs.
* Do not use entities as request DTOs.
* Keep validation rules close to DTO definitions.
* Use clear action-based names such as `CreateUserDto`, `UpdateRoleDto` or `AssignPermissionDto`.

## Database

* Use TypeORM.
* Use migrations for schema changes.
* Keep entity relationships explicit.
* Do not modify schema without a migration.
* Avoid direct database access from controllers.

## API Documentation

* Use Scalar as the official API documentation tool.
* Document authentication requirements.
* Document authorization and permission requirements when applicable.
* Keep API contracts clear and consistent.

---

# Core Backend Modules

The backend core scope includes:

* auth,
* users,
* roles,
* permissions,
* audit,
* security,
* organizations,
* branches,
* configuration,
* database,
* common,
* health.

These modules are part of the Kyrae assistant platform foundation.

Do not create project-specific business modules unless explicitly requested by a feature specification.

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

The backend must support:

* user-role relationships,
* role-permission relationships,
* permission-based guards,
* reusable decorators,
* centralized permission checks.

Permission logic must not be duplicated across controllers or services.

---

# Audit and Security Rules

Security-sensitive actions should be auditable.

Examples of auditable actions:

* login attempts,
* failed authentication,
* permission denied events,
* user status changes,
* role assignment changes,
* permission assignment changes,
* configuration changes.

Audit logic must remain reusable and must not be coupled to business-specific modules.

---

# Package Manager Rules

* Use pnpm only.
* Do not use npm install.
* Do not generate package-lock.json.
* Use pnpm commands from the repository root.
* Commit pnpm-lock.yaml.
* Do not delete internal tooling lock files unless explicitly required.

---

# Testing Rules

Backend testing strategy:

* unit tests,
* e2e tests.

Testing priority:

1. Authentication flows.
2. Authorization and permission checks.
3. User management logic.
4. Role and permission assignment logic.
5. Core services.
6. API endpoints.

---

# Restrictions

* Do not place business logic in controllers.
* Do not bypass DTO validation.
* Do not access the database directly from controllers.
* Do not create domain-specific modules such as POS, inventory, sales, billing or logistics unless explicitly requested.
* Do not tightly couple IAM modules to project-specific business logic.
* Do not introduce unnecessary dependencies.
* Do not use npm commands.
* Do not generate package-lock.json.

---

# Priority

Priority order for backend implementations:

1. Security
2. Architecture consistency
3. Maintainability
4. Reusability
5. Scalability
6. Clean code
7. Performance
8. Development speed
