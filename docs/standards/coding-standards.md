# Coding Standards

# General Standards

* Maintain modular architecture.
* Avoid duplicated logic.
* Prefer reusable implementations.
* Use clean and descriptive naming.
* Keep applications isolated.
* Respect repository structure.
* Keep IAM and security logic explicit.
* Avoid domain-specific examples in Kyrae platform code.
* Business-specific modules must be created only when a project specification explicitly requires them.

---

# Naming Conventions

## Folders

Use kebab-case:

```txt
user-management
auth-module
shared-contracts
permission-management
```

## Components

Use PascalCase:

```txt
UserCardComponent
PermissionListComponent
RoleFormComponent
```

## Services

Use PascalCase:

```txt
AuthService
UserService
PermissionService
RoleService
```

## DTOs

Use PascalCase and action-based names:

```txt
CreateUserDto
UpdateUserDto
CreateRoleDto
UpdatePermissionDto
```

## Guards

Use PascalCase and clear responsibility names:

```txt
JwtAuthGuard
PermissionsGuard
```

Optional project extension:

```txt
RolesGuard
```

## Decorators

Use PascalCase for decorator names and descriptive file names:

```txt
CurrentUser
Permissions
```

Optional project extension:

```txt
Roles
```

Example files:

```txt
current-user.decorator.ts
permissions.decorator.ts
```

Optional project extension:

```txt
roles.decorator.ts
```

---

# Frontend Standards

## Architecture

* Use standalone components only.
* Use feature-based organization.
* Keep components lightweight.
* Business logic must not exist inside components.
* Authentication and authorization UI logic must be centralized.
* Business-specific features must remain isolated inside their own feature folders.

## State Management

* Prefer Signals.
* Avoid unnecessary RxJS complexity.
* Use services for shared state when needed.
* Keep state predictable and easy to test.
* Do not duplicate permission or authentication state across components.

## Styling

* Tailwind CSS is the primary styling system.
* Angular Material may be used when appropriate.
* Maintain responsive layouts.
* Avoid duplicated design patterns.
* Prefer reusable layout and UI components.

## HTTP

* Use services for HTTP communication.
* Avoid direct HTTP usage inside components.
* Keep API calls centralized and reusable.
* Use interceptors for cross-cutting concerns.

## Guards and Interceptors

Use guards for:

* authenticated routes,
* guest-only routes,
* permission-based routes,
* role-based routes when needed.

Use interceptors for:

* auth token injection,
* error handling,
* loading indicators,
* request metadata.

## Frontend Restrictions

* Do not place business logic inside components.
* Do not call APIs directly from components.
* Do not duplicate permission checks across multiple components.
* Do not create project-specific business modules inside the Kyrae platform unless explicitly requested.

---

# Backend Standards

## Architecture

* Use modular NestJS architecture.
* Keep modules isolated.
* Maintain reusable services.
* Keep IAM modules independent from business modules.
* Business-specific modules must depend on IAM contracts, not modify IAM internals.

## Controllers

* Controllers must remain lightweight.
* Controllers should only orchestrate requests and responses.
* Controllers must not contain business logic.
* Controllers must not access the database directly.

## Services

* Business logic belongs in services.
* Services should remain reusable and maintainable.
* Services should not be tightly coupled to controllers.
* Services should expose clear methods with explicit inputs and outputs.

## DTOs

* Validate all DTOs.
* Use explicit DTOs for requests and responses.
* Avoid using entities directly as request DTOs.
* Keep validation rules close to DTO definitions.
* Keep DTO names clear and action-oriented.

## Database

* Use TypeORM.
* Use migrations for schema changes.
* Avoid direct database access from controllers.
* Keep entity relationships explicit.
* Avoid hidden schema changes.
* Do not modify schema without a migration.

## API Documentation

* Use Scalar as the official API documentation tool.
* Keep API contracts clear and consistent.
* Document authentication requirements.
* Document permission requirements when applicable.

---

# Authentication Standards

Authentication must remain modular.

Initial authentication:

* JWT,
* email and password,
* refresh token strategy.

Prepared authentication:

* Microsoft,
* Google,
* external identity providers.

Authentication modules must remain independent from project-specific business modules.

---

# Authorization Standards

Authorization must be based on roles and permissions.

The system must support:

* users,
* roles,
* permissions,
* role-permission relationships,
* user-role relationships,
* guards,
* decorators,
* permission checks.

Authorization logic must be reusable across modules.

Permission checks should be centralized and should not be duplicated across controllers, services or components.

Permission code naming must use `SCREAMING_SNAKE_CASE` with `RESOURCE_ACTION` format.

Examples:

```txt
USERS_READ
ORGANIZATIONS_UPDATE
CONFIGURATION_DELETE
```

Runtime permission values should be written directly as string literals following this convention.

---

# Audit and Security Standards

Kyrae must be security-first.

Security-related flows should consider:

* authentication events,
* authorization failures,
* user status changes,
* role assignment changes,
* permission assignment changes,
* sensitive configuration changes.

Audit logic must be reusable and must not be tightly coupled to project-specific business modules.

---

# Testing Standards

Testing strategy:

* Unit tests.
* e2e tests.

Goals:

* validate business logic,
* validate API flows,
* validate authentication flows,
* validate authorization rules,
* maintain scalable quality assurance.

Testing priority:

1. IAM flows.
2. Authentication flows.
3. Authorization and permission checks.
4. Core services.
5. API endpoints.
6. Critical frontend flows.

---

# Package Manager Standards

This repository uses pnpm workspace.

Rules:

* Do not use npm install.
* Do not generate package-lock.json.
* Use pnpm install from repository root.
* Commit pnpm-lock.yaml.
* Use workspace-aware commands.
* Do not remove internal tooling lock files unless explicitly required.

---

# Git Standards

## Conventional Commits

Examples:

```txt
feat:
fix:
docs:
refactor:
chore:
test:
```

## Commit Goals

* Maintain readable history.
* Improve release organization.
* Improve AI-assisted workflows.
* Make changes easier to review and trace.

---

# Code Quality Tools

The repository standard includes:

* ESLint (backend),
* Prettier (formatting).

These tools exist to enforce consistent formatting, prevent avoidable errors and maintain a clean development workflow.

> **Note:** Husky and Commitlint are included in the Kyrae base to enforce commit conventions. lint-staged is installed but not wired into hooks.

---

# Documentation Standards

Before generating features:

1. Read architecture documentation.
2. Review related specs.
3. Respect repository standards.
4. Document important changes.

Generic architecture documents must not include project-specific business examples.

---

# Out of Scope for Kyrae Platform

The Kyrae platform must not include domain-specific modules such as:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* project-specific business workflows.

Those modules must be created only inside specific projects that use Kyrae as a base.
