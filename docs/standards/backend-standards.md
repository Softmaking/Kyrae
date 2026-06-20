# Backend Standards

# Overview

This document defines backend development standards for the Kyrae.

The backend uses NestJS, TypeScript, TypeORM, PostgreSQL and Scalar.

Kyrae is IAM-first and security-first. Backend code must remain generic, reusable and independent from project-specific business domains unless a feature specification explicitly requires otherwise.

---

# Backend Goals

Backend standards must help to:

- keep business logic maintainable,
- enforce authentication and authorization,
- protect sensitive data,
- keep IAM modules reusable,
- keep controllers lightweight,
- keep DTO validation explicit,
- keep database changes controlled through migrations,
- improve AI-assisted development quality,
- avoid project-specific business assumptions in the Kyrae platform.

---

# Official Stack

The official backend stack is:

- NestJS,
- TypeScript,
- PostgreSQL,
- TypeORM,
- Scalar,
- JWT Authentication,
- pnpm Workspace.

---

# Architecture Principles

Backend architecture must follow these principles:

- use modular NestJS architecture,
- keep modules isolated,
- keep controllers lightweight,
- place business logic in services,
- validate all DTOs,
- use TypeORM migrations for schema changes,
- protect endpoints with authentication and authorization,
- keep IAM modules independent from business-specific modules,
- document APIs with Scalar.

---

# Suggested Structure

Recommended structure:

```txt
src/
├── <module-name>/
├── common/
├── config/
├── database/
├── auth/
├── guards/
├── interceptors/
├── decorators/
└── main.ts
```

Alternative structure is allowed when documented, but the separation of responsibilities must remain clear.

---

# Modules Standards

Modules should be organized by feature or responsibility.

Generic core modules may include:

```txt
auth
users
roles
permissions
audit
security
organizations
branches
configuration
health
```

Project-specific modules must only be added when a feature specification explicitly requires them.

Module rules:

- keep modules focused,
- avoid circular dependencies,
- export only what other modules need,
- avoid large generic modules with unrelated responsibilities,
- keep IAM modules reusable.

---

# Controller Standards

Controllers are responsible for request and response orchestration.

Controllers may:

- define routes,
- receive DTOs,
- call services,
- return responses,
- declare guards and permissions,
- define API documentation metadata.

Controllers must not:

- contain business logic,
- access the database directly,
- build complex queries,
- bypass DTO validation,
- bypass authentication or authorization,
- expose sensitive data.

---

# Service Standards

Services contain business logic.

Services should:

- expose clear methods,
- receive explicit inputs,
- return explicit outputs,
- coordinate repositories or TypeORM managers,
- perform business validations,
- handle reusable logic,
- integrate with audit when required.

Services should not:

- depend on controllers,
- return raw sensitive entities directly when unsafe,
- duplicate logic across modules,
- contain project-specific behavior unless the service belongs to a project-specific feature.

---

# DTO Standards

Every endpoint with input must use explicit DTOs.

DTO rules:

- validate all input,
- use clear action-based names,
- keep validation rules close to DTO definitions,
- avoid using entities as request DTOs,
- avoid exposing internal-only fields,
- keep response DTOs safe.

Examples:

```txt
LoginRequestDto
LoginResponseDto
CreateUserDto
UpdateUserDto
AssignRoleDto
AssignPermissionDto
UserResponseDto
```

---

# Entity Standards

Entities represent database tables.

Entity rules:

- keep relationships explicit,
- add indexes intentionally,
- avoid unnecessary nullable fields,
- protect sensitive fields,
- do not use entities directly as request DTOs,
- avoid project-specific fields in generic IAM entities.

Generic entities may include:

```txt
User
Role
Permission
RefreshToken
AuditEvent
Organization
Branch
AppConfig
```

---

# Repository and Data Access Standards

Data access should remain outside controllers.

Allowed data access locations:

- services,
- repositories,
- dedicated data access classes,
- TypeORM managers inside controlled service methods.

Rules:

- do not access repositories from controllers,
- keep query logic reusable when complex,
- validate inputs before database operations,
- use transactions for multi-step data changes,
- keep database concerns separate from API concerns.

---

# Migration Standards

All schema changes must use TypeORM migrations.

Rules:

- do not rely on `synchronize: true` in production,
- do not modify schema manually without migration tracking,
- keep migrations focused,
- name migrations clearly,
- review production migrations carefully,
- document migration commands when needed.

Recommended migration names:

```txt
CreateUsersTable
CreateRolesTable
CreatePermissionsTable
CreateAuditEventsTable
```

---

# Authentication Standards

Authentication must remain modular.

Initial authentication:

- email and password,
- JWT access token,
- refresh token strategy.

Prepared authentication:

- Microsoft Entra ID,
- Google Identity,
- external identity providers,
- future MFA,
- future SSO.

Authentication rules:

- validate user credentials,
- validate user status,
- reject inactive users,
- reject locked users,
- never expose password hashes,
- never expose token secrets,
- keep provider integrations optional.

---

# Authorization Standards

Authorization must be role and permission based.

Backend must enforce authorization using:

- guards,
- decorators,
- permission services,
- centralized permission checks.

Recommended components:

```txt
JwtAuthGuard
PermissionsGuard
@Permissions()
CurrentUser
```

Backend authorization is mandatory for protected resources.

Frontend authorization is only UX support.

---

# Audit Standards

Security-sensitive actions should emit audit events.

Recommended audit events:

- login success,
- login failure,
- permission denied,
- user created,
- user updated,
- user activated,
- user deactivated,
- role assigned,
- permission assigned,
- configuration updated.

Audit must not store:

- passwords,
- password hashes,
- raw tokens,
- secrets,
- private keys.

---

# API Documentation Standards

Scalar is the official API documentation tool.
Available at `/scalar` endpoint.

API documentation should include:

- endpoint purpose,
- request DTOs,
- response DTOs,
- authentication requirements,
- permission requirements,
- possible error responses.

Documentation must be updated when API behavior changes.

---

# Error Handling Standards

Errors should be consistent and safe.

Use proper status codes:

- 400 for validation errors,
- 401 for missing or invalid authentication,
- 403 for insufficient permissions,
- 404 for missing resources,
- 409 for conflicts,
- 500 for unexpected errors.

Do not expose:

- stack traces in production,
- database internals,
- token internals,
- secrets,
- sensitive data.

---

# Validation Standards

Use validation for all incoming request data.

Validation should happen through:

- DTO decorators,
- validation pipes,
- explicit service-level validation when needed.

Database constraints are not a replacement for DTO validation.

Use both DTO validation and database constraints where appropriate.

---

# Transaction Standards

Use transactions when multiple related writes must succeed or fail together.

Examples:

- create user and assign roles,
- assign multiple permissions to a role,
- update user status and create audit event,
- create organization and default branch.

Transactions should be handled in services or data access layers, not controllers.

---

# Security Standards

Backend must protect sensitive operations.

Rules:

- do not store plain text passwords,
- do not store raw refresh tokens,
- do not expose sensitive fields,
- do not trust client-provided permissions,
- do not bypass guards,
- do not hardcode secrets,
- use environment variables,
- sanitize logs.

---

# Environment Standards

Backend configuration must use environment variables.

Recommended variables:

```txt
NODE_ENV
PORT
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
DB_SSL
JWT_SECRET
JWT_REFRESH_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_TENANT_ID
GOOGLE_CLIENT_ID
```

Rules:

- document variables in `.env.example`,
- do not commit real secrets,
- validate required variables at startup,
- use different values per environment.

---

# Testing Standards

Backend testing strategy:

- unit tests,
- e2e tests.

Testing priority:

1. Authentication flows.
2. Authorization rules.
3. Permission guards.
4. User management logic.
5. Role and permission assignment logic.
6. Audit events.
7. API endpoints.
8. Database-related behavior.

Recommended commands:

```bash
pnpm backend:test
pnpm backend:test:e2e
```

---

# Package Manager Rules

Use pnpm only.

Allowed:

```bash
pnpm backend:dev
pnpm backend:build
pnpm backend:test
pnpm backend:test:e2e
```

Forbidden:

```bash
npm install
npm run
npx
```

Do not generate `package-lock.json`.

---

# AI Agent Rules

AI agents must follow these rules:

1. Keep controllers lightweight.
2. Put business logic in services.
3. Validate DTOs.
4. Use TypeORM migrations for schema changes.
5. Protect endpoints with guards.
6. Keep IAM modules reusable.
7. Do not create project-specific modules unless a feature specification explicitly requires them.
8. Do not expose sensitive fields.
9. Use pnpm commands only.
10. Update documentation when backend architecture changes.

---

# Out of Scope

The generic backend standards must not include domain-specific backend rules for:

- POS,
- inventory,
- sales,
- billing,
- warehouse operations,
- logistics,
- customer-specific workflows.

Those rules must be defined by project-specific documentation.
