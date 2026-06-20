# API Standards

# Overview

This document defines API standards for the Kyrae.

The backend uses NestJS, TypeORM, PostgreSQL and Scalar.

The API must remain generic, reusable, IAM-first and security-first. Project-specific API behavior must be defined by feature specifications.

---

# API Goals

APIs must be:

* consistent,
* secure,
* documented,
* predictable,
* easy to consume from frontend and mobile clients,
* aligned with IAM and authorization rules,
* independent from project-specific business domains unless explicitly specified.

---

# API Documentation

Scalar is the official API documentation tool.

API documentation should include:

* endpoint purpose,
* HTTP method,
* route path,
* request DTO,
* response DTO,
* authentication requirements,
* permission requirements,
* possible error responses,
* examples when helpful.

Do not use Swagger as the primary documentation standard unless a project explicitly requires it.

---

# REST Conventions

Use REST-oriented endpoint naming.

Recommended patterns:

```txt
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

For actions that are not pure CRUD, use clear action routes:

```txt
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /organizations/:id/activate
POST /organizations/:id/deactivate
POST /branches/:id/activate
POST /branches/:id/deactivate
```

Avoid unclear routes:

```txt
POST /doSomething
GET  /getUsers
POST /manage
```

---

# Route Naming

Use lowercase kebab-case for routes.

Good examples:

```txt
/users
/user-roles
/role-permissions
/audit-events
/configuration
```

Avoid:

```txt
/getUsers
/UserRoles
/role_permissions
```

---

# HTTP Methods

Use methods consistently:

## GET

Use for reading data.

```txt
GET /users
GET /users/:id
```

## POST

Use for creating resources or executing commands.

```txt
POST /users
POST /auth/login
```

## PATCH

Use for partial updates.

```txt
PATCH /users/:id
PATCH /roles/:id
```

## PUT

Use only when replacing a full resource.

## DELETE

Use for deletion when allowed.

For enterprise systems, prefer soft delete or deactivate when applicable:

```txt
PATCH /users/:id/deactivate
```

---

# Request DTO Rules

Every endpoint with input must use explicit DTOs.

Rules:

* validate all DTOs,
* use clear action-based names,
* avoid using entities as request DTOs,
* keep DTOs stable and documented,
* keep validation rules close to DTO definitions.

Examples:

```txt
LoginRequestDto
CreateUserDto
UpdateUserDto
AssignRoleDto
AssignPermissionDto
```

---

# Response DTO Rules

Use explicit response DTOs when returning structured data.

Examples:

```txt
LoginResponseDto
UserResponseDto
RoleResponseDto
PermissionResponseDto
PaginatedResponseDto
```

Do not expose database entities directly as API responses when sensitive or internal fields may exist.

Avoid exposing:

* password hashes,
* refresh tokens,
* secrets,
* internal audit metadata unless required,
* internal infrastructure details.

---

# Standard Response Shapes

For single resource responses:

```json
{
  "id": "uuid",
  "name": "Example"
}
```

For list responses:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

For command responses:

```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

Keep response shapes consistent across modules.

---

# Pagination

List endpoints should support pagination when the dataset can grow.

Use page-based pagination for bounded or moderate datasets where total counts are useful.

Recommended query parameters:

```txt
page
pageSize
search
sortBy
sortDirection
```

Example:

```txt
GET /users?page=1&pageSize=10&search=john&sortBy=email&sortDirection=asc
```

Recommended response:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

> The frontend `PaginatedResponse<T>` contract uses `data`, `total`, `page`, and `pageSize`.

For append-only or high-growth datasets such as audit events, prefer cursor/keyset pagination.

Recommended cursor query parameters:

```txt
limit
cursor
```

Recommended cursor response:

```json
{
  "data": [],
  "nextCursor": null,
  "hasMore": false
}
```

Cursor endpoints must use a stable order. Audit events use `createdAt DESC` and `id DESC`.

---

# Filtering

Use query parameters for filters.

Examples:

```txt
GET /users?status=ACTIVE
GET /audit-events?action=LOGIN_FAILED
GET /permissions?module=USERS
```

Filters must be validated.

Avoid accepting arbitrary unsafe query expressions.

---

# Sorting

Use explicit sort fields.

Example:

```txt
GET /users?sortBy=email&sortDirection=asc
```

Rules:

* validate allowed sort fields,
* validate sort direction,
* avoid directly injecting query values into database expressions.

---

# Error Handling

Use consistent HTTP status codes.

## 400 Bad Request

Invalid input or validation error.

## 401 Unauthorized

Authentication is missing or invalid.

## 403 Forbidden

Authenticated user does not have permission.

## 404 Not Found

Resource does not exist.

## 409 Conflict

Business or uniqueness conflict.

## 500 Internal Server Error

Unexpected server error.

---

# Error Response Shape

Recommended error response:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": []
}
```

Validation details may include field-specific errors when safe.

Do not expose sensitive internal implementation details.

---

# Authentication Requirements

Protected endpoints must require authentication.

Authentication must use backend guards.

Examples:

```txt
GET /auth/me
GET /users
POST /roles
```

Public endpoints should be explicitly identified.

Examples:

```txt
POST /auth/login
POST /auth/refresh
```

---

# Authorization Requirements

Permission-based endpoints must define required permissions.

Example:

```txt
GET /users          USERS_READ
POST /users         USERS_CREATE
PATCH /users/:id    USERS_UPDATE
DELETE /users/:id   USERS_DELETE
```

Authorization must be enforced by backend guards.

Frontend authorization is for user experience, not final security.

---

# Permission Naming for APIs

Use uppercase snake case.

Recommended pattern:

```txt
MODULE_ACTION
```

Examples:

```txt
USERS_READ
USERS_CREATE
USERS_UPDATE
ROLES_READ
PERMISSIONS_UPDATE
AUDIT_READ
ORGANIZATIONS_UPDATE
```

---

# Audit Requirements

Security-sensitive endpoints should emit audit events.

Examples:

* login,
* logout,
* failed login,
* user activation,
* user deactivation,
* role assignment,
* permission assignment,
* configuration update,
* forbidden access attempt.

Audit logs must not include secrets or raw tokens.

---

# Idempotency

Use idempotent behavior where possible.

Examples:

* assigning an already assigned role should not duplicate records,
* removing a missing role should return a controlled response,
* repeated activation should not create inconsistent state.

---

# Security Rules

APIs must not:

* expose password hashes,
* expose refresh token values,
* expose secrets,
* trust frontend permissions,
* bypass backend guards,
* expose internal stack traces,
* accept unvalidated query parameters,
* use entities directly as request DTOs.

---

# Versioning Strategy

Initial APIs do not require URL versioning unless project complexity requires it.

Future versioning options:

```txt
/api/v1/users
/api/v2/users
```

Versioning should be added only when needed.

---

# Shared Contracts

Shared API contracts may live in:

```txt
packages/shared-contracts
```

Allowed:

* DTOs,
* enums,
* interfaces,
* response types,
* permission codes.

Not allowed:

* business logic,
* database access,
* NestJS services,
* Angular components,
* TypeORM entities,
* secrets.

---

# API Testing

API tests should validate:

* successful requests,
* validation errors,
* authentication required,
* permission required,
* not found behavior,
* conflict behavior,
* audit events when applicable.

Testing priority:

1. Auth endpoints.
2. User endpoints.
3. Role endpoints.
4. Permission endpoints.
5. Audit endpoints.
6. Configuration endpoints.

---

# AI Agent Rules

AI agents must follow these rules:

1. Use explicit DTOs for API inputs.
2. Do not expose entities directly when sensitive fields may exist.
3. Document endpoints with Scalar.
4. Add authentication guards to protected endpoints.
5. Add permission guards where required.
6. Do not create domain-specific API endpoints unless a feature specification explicitly requires them.
7. Do not bypass validation.
8. Do not use npm commands.
9. Update shared contracts when API contracts change.
10. Update specs when API behavior changes.

---

# Out of Scope

The generic API standards must not define domain-specific API behavior for:

* POS,
* inventory,
* sales,
* billing,
* logistics,
* warehouse operations,
* project-specific workflows.

Those APIs must be defined by project-specific feature specifications.
