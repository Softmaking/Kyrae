# Shared Contracts Standard

# Overview

Shared contracts define the TypeScript boundary between frontend, backend and reusable packages.

The goal is to reduce duplicated DTOs, avoid frontend/backend drift and give AI agents a small source of truth before they inspect implementation details.

---

# Source Of Truth

Shared contracts live in:

```txt
packages/shared-contracts/src
```

Public exports must go through:

```txt
packages/shared-contracts/src/index.ts
```

Agents should inspect shared contracts before reading feature-specific frontend/backend models when a change crosses application boundaries.

---

# When To Add A Shared Contract

Add or update shared contracts when a change affects:

- API request DTOs used by frontend and backend,
- API response DTOs used by frontend and backend,
- shared query/filter parameters,
- generic IAM concepts,
- authentication or authorization payloads,
- users, roles, permissions, organizations or branches,
- audit events, audit filters or audit responses,
- auth session payloads,
- organization and branch API payloads,
- permission code constants,
- reusable enums or string unions exchanged over HTTP.

Do not add shared contracts for backend-only internals or frontend-only view state.

---

# What Shared Contracts May Contain

Allowed:

- `interface`,
- `type`,
- string unions,
- serializable constants,
- framework-agnostic DTO shapes,
- API query and response contracts.

Not allowed:

- Angular code,
- NestJS decorators,
- TypeORM entities,
- database access,
- business logic,
- environment config,
- secrets,
- validation decorators,
- project-specific business domains unless explicitly specified.

---

# Naming

Use clear suffixes:

```txt
Dto
Command
Query
Response
Result
```

Examples:

```ts
AuditEventDto;
CreateAuditEventCommand;
ListAuditEventsQuery;
ListAuditEventsResponse;
CursorPaginatedResponse;
```

Use `Dto` for HTTP-safe serialized objects, not database entities.

Use `Command` for mutation request shapes.

Use `Query` for list/filter request shapes.

Use `Response` for HTTP responses.

---

# Implementation Flow

When changing a cross-app contract:

1. Update `packages/shared-contracts` first.
2. Export the contract from `packages/shared-contracts/src/index.ts`.
3. Update backend DTO validation classes to implement or match the shared contract.
4. Map backend entities to response DTOs explicitly.
5. Update frontend models/services to import the shared contract.
6. Update architecture documentation.
7. Run focused verification.

Recommended verification:

```bash
pnpm exec tsc -p packages/shared-contracts/tsconfig.json --pretty false
pnpm frontend:build
pnpm backend:build
pnpm backend:lint
```

Add tests when behavior changes.

---

# Agent Reading Order

For cross-app work, agents should read in this order:

1. `AGENTS.md`
2. `packages/shared-contracts/src/index.ts`
3. relevant contract file under `packages/shared-contracts/src`
4. relevant architecture doc under `docs/architecture`
5. backend DTO/controller/service
6. frontend model/service/page

This keeps context small and avoids reconstructing contracts from scattered implementation files.

---

# Audit Contracts

Audit contracts are currently defined in:

```txt
packages/shared-contracts/src/audit/audit.contracts.ts
```

Before changing audit frontend/backend behavior, inspect:

```txt
docs/architecture/audit.md
packages/shared-contracts/src/audit/audit.contracts.ts
```

Do not add a new audit field only in frontend or only in backend if it crosses the HTTP boundary.

Audit list responses use cursor pagination with `data`, `nextCursor`, and `hasMore`. Audit list queries use `limit`, optional `cursor`, and the existing audit filters.

---

# Branches Contracts

Branches contracts are currently defined in:

```txt
packages/shared-contracts/src/branches/branch.contracts.ts
```

Current branch contracts include:

- `BranchDto`,
- `CreateBranchCommand`,
- `UpdateBranchCommand`,
- `ListBranchesQuery`,
- `AssignUserToBranchCommand`,
- `BranchUserDto`,
- `BranchUserRoleSummaryDto`.

When changing branches frontend/backend behavior:

* keep backend responses mapped to shared DTO contracts,
* keep query parameters aligned with `ListBranchesQuery`,
* avoid returning ORM entities as public API contracts.

---

# Current Contract Areas

Current shared contract folders:

```txt
auth
audit
branches
common
configuration
organizations
permissions
roles
users
```

---

# Versioning And Compatibility

Prefer additive changes when possible.

Compatible examples:

- optional field added to a response,
- optional filter added to a query,
- new action added to an action constant.

Breaking examples:

- removing a field,
- renaming a field,
- changing a field type,
- making an optional field required,
- changing a response wrapper shape.

Breaking contract changes must include frontend and backend updates in the same change unless explicitly staged by a migration plan.
