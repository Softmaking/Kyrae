# Database Standards

# Overview

This document defines database standards for the Kyrae.

The backend uses PostgreSQL with TypeORM.

The database layer must support an IAM-first and security-first enterprise foundation while remaining generic and independent from project-specific business domains.

---

# Database Goals

The database strategy must support:

- reliable schema evolution,
- clear entity relationships,
- secure data handling,
- auditability,
- maintainability,
- TypeORM migrations,
- future scalability,
- generic enterprise IAM modules.

---

# Official Database Stack

- PostgreSQL
- TypeORM
- TypeORM migrations

Optional future database-related tools may be added per project when required, but the Kyrae platform standard is PostgreSQL + TypeORM.

---

# Core Database Modules

The Kyrae platform database may include tables/entities for:

- users,
- roles,
- permissions,
- user_roles,
- role_permissions,
- refresh_tokens,
- audit_events,
- organizations,
- branches,
- user_organizations,
- user_branches,
- app_config,
- health/readiness metadata when required.

Project-specific tables must only be added when a feature specification explicitly requires them.

---

# Naming Conventions

## Tables

Use snake_case.

Examples:

```txt
users
roles
permissions
user_roles
role_permissions
refresh_tokens
audit_events
organizations
branches
user_branches
```

## Columns

Use camelCase in TypeORM entities when mapping naturally to TypeScript, or snake_case in raw SQL when required.

Recommended TypeScript entity property style:

```ts
createdAt;
updatedAt;
deletedAt;
isActive;
emailVerified;
```

Recommended database column style may be configured consistently by project.

The important rule is consistency.

## Primary Keys

Use UUID primary keys when possible.

Recommended:

```txt
id uuid primary key
```

## Foreign Keys

Use clear relationship names.

Examples:

```txt
userId
roleId
permissionId
organizationId
branchId
```

## Indexes

Use descriptive names when manually defining indexes.

Examples:

```txt
idx_users_email
idx_users_is_active
idx_user_roles_user_id
idx_role_permissions_role_id
```

## Unique Constraints

Use descriptive names.

Examples:

```txt
uq_users_email
uq_roles_name
uq_permissions_name
uq_user_roles_user_role
uq_role_permissions_role_permission
uq_branches_organization_code
```

---

# Entity Standards

TypeORM entities should:

- be explicit,
- avoid unnecessary nullable fields,
- define relationships clearly,
- define indexes where needed,
- avoid business-specific fields in generic IAM entities,
- avoid exposing sensitive fields through API responses.

Example entity concerns:

- user identity,
- user status,
- role name,
- permission name,
- audit event metadata.

Entities must not be used directly as request DTOs.

---

# Migration Standards

All schema changes must use migrations.

Rules:

- Do not modify schema manually without migration tracking.
- Do not rely on `synchronize: true` in production.
- Keep migrations small and focused.
- Name migrations clearly.
- Review migrations before running in production.
- Do not include project-specific tables in the Kyrae platform unless required by a specification.

Recommended migration naming:

```txt
CreateUsersTable
CreateRolesTable
CreatePermissionsTable
CreateUserRolesTable
CreateAuditEventsTable
```

---

# TypeORM Synchronization

TypeORM `synchronize` must not be enabled in production.

Recommended:

```txt
synchronize=false
```

Migrations should be the source of schema changes.

---

# Timestamps

Most enterprise tables should include:

```txt
createdAt
updatedAt
```

Optional fields when required:

```txt
deletedAt
createdBy
updatedBy
deletedBy
```

Use soft delete only when the module requires historical preservation.

For IAM and audit-related data, prefer preserving history when possible.

---

# Soft Delete Strategy

Soft delete may be used for entities where historical traceability matters.

Examples:

- users,
- roles,
- permissions,
- organizations,
- branches.

Alternatives:

- `isActive`,
- `deletedAt`,
- status enum.

The selected approach must be consistent per module.

Recommended for IAM entities:

```txt
isActive
```

and optionally:

```txt
deletedAt
```

when historical deletion tracking is required.

---

# User Entity Standards

The user entity may include:

- id,
- email,
- passwordHash,
- display name fields,
- isActive,
- emailVerified,
- lastLoginAt,
- failedLoginAttempts,
- lockedUntil,
- createdAt,
- updatedAt.

The user entity must not expose:

- passwordHash,
- refresh tokens,
- security secrets.

---

# Role Entity Standards

The role entity may include:

- id,
- name,
- description,
- isActive,
- createdAt,
- updatedAt.

Role name must be unique.

Examples:

```txt
ADMIN
USER
AUDITOR
MANAGER
```

Avoid project-specific roles in the Kyrae platform unless defined by a project specification.

---

# Permission Entity Standards

The permission entity may include:

- id,
- name,
- module,
- description,
- isActive,
- createdAt,
- updatedAt.

Permission name must be unique.

Recommended pattern:

```txt
MODULE_ACTION
```

Examples:

```txt
USERS_READ
USERS_CREATE
ROLES_UPDATE
PERMISSIONS_UPDATE
AUDIT_READ
ORGANIZATIONS_UPDATE
```

---

# Relationship Tables

Relationship tables should avoid duplicates.

Recommended unique constraints:

```txt
user_roles: unique(userId, roleId)
role_permissions: unique(roleId, permissionId)
user_branches: unique(userId, branchId)
user_organizations: unique(userId, organizationId)
```

---

# Refresh Token Storage

Refresh tokens must be stored securely.

Recommended rules:

- store token hash, not raw token,
- store expiration date,
- support revocation,
- support logout invalidation,
- associate tokens with user,
- track createdAt and revokedAt when needed.

Refresh token tables must not expose token values through API responses.

---

# Audit Event Standards

Audit events should capture security-relevant actions.

Recommended fields:

- id,
- action,
- actorUserId,
- targetUserId,
- resourceType,
- resourceId,
- metadata,
- ipAddress when available,
- userAgent when available,
- createdAt.

Audit metadata must not store secrets, raw tokens or passwords.

---

# Configuration Table Standards

Configuration may be stored in database only when required.

Recommended fields:

- key,
- value,
- description,
- isSensitive,
- createdAt,
- updatedAt.

Sensitive configuration values should preferably be stored outside the database using environment variables or secret managers.

---

# Indexing Strategy

Indexes should be added for:

- frequently searched fields,
- foreign keys,
- unique codes,
- status filters,
- audit event queries,
- email lookup.

Common indexes:

```txt
users.email
users.isActive
roles.name
permissions.name
audit_events.action
audit_events.createdAt
audit_events.createdAt + audit_events.id
```

Avoid unnecessary indexes because they increase write cost.

Append-only audit listings should use a compound index matching keyset pagination order, such as `created_at DESC, id DESC`.

---

# Constraints

Use constraints to protect data integrity.

Recommended constraints:

- unique email,
- unique role name,
- unique permission name,
- unique relationship pairs,
- non-null required fields,
- foreign keys for relationships.

---

# Transactions

Use transactions when a workflow modifies multiple related records.

Examples:

- creating a role and assigning permissions,
- assigning multiple roles to a user,
- creating a user and user relationships,
- updating permissions and audit records.

Transactions should be handled in services or repository/data layers, not controllers.

---

# Data Validation

Database constraints are not a replacement for DTO validation.

Use both:

- DTO validation for API input,
- database constraints for data integrity.

---

# Environment Configuration

Database connection must be environment-based.

Recommended variables:

```txt
DB_HOST=
DB_PORT=
DB_USER=
DB_PASS=
DB_NAME=
DB_SSL=
DB_LOGGING=
```

Rules:

- document variables in `.env.example`,
- do not commit real secrets,
- use different values per environment,
- avoid hardcoded database credentials.

---

# Seeding Strategy

Seeds may be used for generic IAM bootstrap data.

Allowed generic seeds:

- default admin role,
- default user role,
- base permissions,
- role-permission assignments.

Seeds must not include:

- real users,
- real passwords,
- customer data,
- project-specific business data,
- production secrets.

Use safe demo data only when necessary.

---

# Security Rules

Database implementation must not:

- store plain text passwords,
- store raw refresh tokens,
- expose password hashes,
- expose secrets,
- rely only on frontend validation,
- bypass migrations,
- include production data in the repository.

---

# Testing Database Rules

Database tests should:

- use test data,
- avoid production data,
- avoid real credentials,
- isolate test cases,
- clean up when needed.

Future projects may introduce:

```txt
.env.test
```

when test database workflows require it.

---

# AI Agent Rules

AI agents must follow these rules:

1. Use TypeORM migrations for schema changes.
2. Do not enable synchronize in production.
3. Do not add project-specific tables unless a feature specification explicitly requires them.
4. Do not store plain text passwords.
5. Do not store raw refresh tokens.
6. Do not expose sensitive fields in DTOs.
7. Use clear relationships and constraints.
8. Add indexes intentionally.
9. Do not hardcode database credentials.
10. Update documentation when database architecture changes.

---

# Out of Scope

The generic database standard must not define project-specific tables for:

- POS,
- inventory,
- sales,
- billing,
- warehouse operations,
- logistics,
- production workflows,
- customer-specific business domains.

Those tables must be defined by project-specific feature specifications.
