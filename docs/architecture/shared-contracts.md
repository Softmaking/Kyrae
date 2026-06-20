# Shared Contracts Architecture

# Overview

This document defines the shared contracts architecture for the Kyrae.

Shared contracts exist to keep frontend, backend and future clients aligned without coupling them to implementation details.

Kyrae is IAM-first and security-first. Shared contracts must remain generic, reusable and independent from project-specific business domains unless a project specification explicitly requires otherwise.

---

# Goals

Shared contracts must help to:

- align frontend and backend types,
- reduce duplicated DTO definitions,
- improve API consistency,
- improve AI-assisted development quality,
- support the official mobile beta client,
- support future additional APIs,
- keep IAM contracts reusable,
- avoid framework coupling.

---

# Scope

Shared contracts may include:

- DTOs,
- enums,
- interfaces,
- types,
- API contracts,
- permission codes,
- shared response shapes.

Shared contracts must not include:

- business logic,
- database access,
- TypeORM entities,
- Angular components,
- NestJS services,
- controllers,
- repositories,
- guards,
- interceptors,
- environment values,
- secrets.

---

# Package Location

Shared contracts belong in:

```txt
packages/shared-contracts
```

Current structure:

```txt
packages/shared-contracts/
├── src/
│   ├── auth/
│   ├── audit/
│   ├── branches/
│   ├── common/
│   ├── configuration/
│   ├── organizations/
│   ├── permissions/
│   ├── roles/
│   ├── users/
│   └── index.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

Additional folders such as `health` may be added when shared HTTP contracts exist for them.

---

# Core Contract Areas

The Kyrae platform may define shared contracts for:

- auth,
- users,
- roles,
- permissions,
- audit,
- organizations,
- branches,
- configuration,
- health,
- pagination,
- common API responses,
- common error shapes.

Project-specific contracts must only be added when a feature specification explicitly requires them.

---

# DTO Standards

DTOs should describe request and response shapes.

Examples:

```txt
LoginRequestDto
LoginResponseDto
CreateUserCommand
UserDto
CreateRoleCommand
RoleDto
CreatePermissionCommand
PermissionDto
CreateOrganizationCommand
OrganizationDto
CreateBranchCommand
BranchDto
CreateAppConfigCommand
AppConfigDto
CreateAuditEventCommand
AuditEventDto
```

DTO rules:

- use PascalCase,
- use action-based names,
- keep fields explicit,
- avoid sensitive fields,
- avoid database-only fields unless needed,
- avoid framework decorators unless the package intentionally supports them.

---

# Enum Standards

Enums should represent stable values shared across apps.

Current enums in shared contracts:

| Enum | File | Values |
|------|------|--------|
| `UserStatus` | `users/user.contracts.ts` | `ACTIVE`, `INACTIVE`, `LOCKED`, `PENDING_VERIFICATION` |
| `AuthProvider` | `auth/auth.contracts.ts` | `LOCAL`, `MICROSOFT`, `GOOGLE` |
| `PermissionScope` | `permissions/permission.contracts.ts` | `GLOBAL`, `ORGANIZATION`, `BRANCH` |
| `AuditSeverity` | `audit/audit.contracts.ts` | `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `AuditAction` | `audit/audit.contracts.ts` | 30+ auth/IAM action constants |

Enum rules:

- use PascalCase for enum names,
- use stable values,
- avoid project-specific values in the Kyrae platform,
- document when enum values affect API behavior.

---

# Interface and Type Standards

Interfaces and types should describe reusable shapes.

Current interfaces and types in shared contracts:

```txt
JwtPayloadDto (auth)
AuthenticatedUserDto (auth)
LoginRequestDto / LoginResponseDto (auth)
ApiErrorResponse (common)
CommandResponse (common)
HealthResponseDto / ReadinessResponseDto (common)
PaginatedResponse<T> (common)
CursorPaginatedResponse<T> (common)
UserDto / UserStatus (users)
RoleDto / PermissionDto (roles/permissions)
AuditEventDto (audit)
OrganizationDto / BranchDto (organizations/branches)
AppConfigDto (configuration)
```

Rules:

- use PascalCase,
- keep interfaces generic,
- avoid framework-specific implementation,
- avoid including secrets or internal-only fields.

---

# Permission Code Contracts

Permission codes may be shared when frontend needs to render UI conditionally and backend needs to enforce access.

Current baseline: permission values are stable strings in `MODULE_ACTION` format. Shared contracts do not own a hardcoded global permission catalog. The backend permission catalog from database/seed is the source of truth.

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
ROLES_CREATE
PERMISSIONS_UPDATE
AUDIT_READ
ORGANIZATIONS_UPDATE
```

Rules:

- backend remains the final authority,
- frontend permission checks are only UX support,
- permission codes must remain stable,
- avoid domain-specific permission codes in the Kyrae platform.

---

# Common API Contracts

Common API contracts may include:

```txt
PaginatedResponse
CursorPaginatedResponse
ApiErrorResponse
CommandResponse
HealthResponseDto
ReadinessResponseDto
ReadinessErrorResponseDto
```

Example:

```ts
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

Common contracts should remain generic.

---

# Branches Contract Example

Branches currently expose shared contracts such as:

- `BranchDto`,
- `ListBranchesQuery`,
- `AssignUserToBranchCommand`,
- `BranchUserDto`.

These contracts are defined in:

```txt
packages/shared-contracts/src/branches/branch.contracts.ts
```

Recommended usage:

* backend controllers/services accept query objects typed with `ListBranchesQuery`,
* backend maps entities into `BranchDto` and `BranchUserDto` before returning responses,
* frontend services import and use the same contracts from `@kyrae/shared-contracts`.

This keeps API boundaries explicit and avoids entity leakage.

---

# Export Strategy

Every public contract must be exported through `index.ts`.

Recommended root export:

```ts
export * from './auth/auth.contracts';
export * from './users/user.contracts';
export * from './permissions/permission.contracts';
export * from './audit/audit.contracts';
export * from './organizations/organization.contracts';
export * from './branches/branch.contracts';
export * from './common/common.contracts';
export * from './configuration/configuration.contracts';
```

Recommended folder export:

```ts
export * from './login-request.dto';
export * from './login-response.dto';
export * from './jwt-payload.interface';
```

Avoid deep imports when possible.

Preferred:

```ts
import { LoginRequestDto } from '@kyrae/shared-contracts';
```

Avoid:

```ts
import { LoginRequestDto } from '@kyrae/shared-contracts/src/auth/login-request.dto';
```

---

# Dependency Rules

Shared contracts should have minimal dependencies.

Allowed:

- TypeScript types,
- lightweight validation-independent definitions when required.

Avoid:

- Angular dependencies,
- NestJS dependencies,
- TypeORM dependencies,
- runtime-heavy libraries,
- infrastructure-specific dependencies.

Shared contracts should remain easy to consume by multiple clients.

---

# Frontend Usage

Frontend may use shared contracts for:

- API request typing,
- API response typing,
- permission code references,
- auth session typing,
- user model typing,
- route permission metadata,
- reusable UI type safety.

Frontend must not import backend implementation.

---

# Backend Usage

Backend may use shared contracts for:

- request DTO consistency,
- response DTO consistency,
- permission codes,
- shared enums,
- shared interfaces,
- API response shapes.

Backend must not place database logic, entities or services inside shared contracts.

---

# Mobile and Future Client Usage

Official mobile beta client and future additional clients may use shared contracts for:

- API typing,
- auth response models,
- permission codes,
- common response shapes.

Contracts must remain generic enough for non-Angular clients.

Current mobile beta scope is intentionally limited to auth, home (dashboard), and profile.

---

# Versioning and Breaking Changes

Shared contracts can affect multiple applications.

Before changing shared contracts:

1. Check frontend impact.
2. Check backend impact.
3. Check future client impact if applicable.
4. Check tests.
5. Check API documentation.
6. Avoid breaking changes when possible.
7. Document breaking changes when unavoidable.

Breaking examples:

- removing a field,
- renaming a field,
- changing enum values,
- changing response structure,
- changing permission codes.

---

# Security Rules

Shared contracts must not contain:

- secrets,
- private keys,
- passwords,
- password hashes,
- access token values,
- refresh token values,
- JWT secrets,
- OAuth client secrets,
- database credentials.

Allowed security-related shapes:

```ts
export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}
```

Not allowed:

```ts
export const JWT_SECRET = 'secret-value';
```

---

# Testing Strategy

Shared contracts may be tested when they include behavior-free utilities or schema-like structures.

Typical validation:

- TypeScript build passes.
- Frontend compiles.
- Backend compiles.
- Contract exports are valid.
- Breaking changes are detected during app builds.

---

# AI Agent Rules

AI agents must follow these rules:

1. Add only DTOs, enums, types and interfaces to shared contracts.
2. Do not add business logic.
3. Do not add Angular components.
4. Do not add NestJS services.
5. Do not add TypeORM entities.
6. Do not add secrets or environment values.
7. Export public contracts through `index.ts`.
8. Check frontend and backend impact before modifying contracts.
9. Do not add project-specific contracts unless a feature specification explicitly requires them.
10. Keep shared contracts generic and reusable.

---

# Out of Scope

The generic shared contracts architecture must not include contracts for:

- POS,
- inventory,
- sales,
- billing,
- warehouse operations,
- logistics,
- production workflows,
- customer-specific operational processes.

Those contracts must be defined by project-specific feature specifications.
