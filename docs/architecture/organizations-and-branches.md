# Organizations and Branches Architecture

# Overview

This document defines the organizations and branches architecture for the Kyrae.

Organizations and branches are generic enterprise scoping concepts. They may be used to group users, restrict access, define operational boundaries and support future multi-tenant or multi-branch systems.

Kyrae is IAM-first and security-first. Organizations and branches must remain generic and must not include project-specific business behavior.

---

# Goals

The organizations and branches architecture must help to:

* support enterprise access boundaries,
* support user scoping,
* support branch-level permissions when required,
* support organization-level grouping,
* support future multi-tenant structures,
* keep IAM reusable,
* avoid project-specific assumptions.

---

# Scope

Organizations and branches may be used by:

* users,
* roles,
* permissions,
* audit,
* configuration,
* authentication context,
* authorization context,
* frontend navigation,
* backend guards.

Organizations and branches must not define:

* sales behavior,
* inventory behavior,
* POS behavior,
* billing behavior,
* logistics behavior,
* customer-specific workflows.

Those belong to concrete projects, not the Kyrae platform.

---

# Core Concepts

## Organization

An organization represents a generic enterprise grouping.

It may represent:

* company,
* business unit,
* client organization,
* internal organization,
* tenant-related grouping when multi-tenancy is enabled.

Organization must remain generic.

## Branch

A branch represents an operational or access scope within an organization.

It may represent:

* branch office,
* location,
* site,
* office,
* operational unit.

Branch must remain generic.

---

# Recommended Hierarchy

Default hierarchy:

```txt
Organization
└── Branch
```

Future multi-tenant hierarchy when needed:

```txt
Tenant
└── Organization
    └── Branch
```

Multi-tenancy must only be enabled when required by a project specification.

---

# Organization Model

A generic organization entity may include:

```txt
id
code
name
description
isActive
createdAt
updatedAt
```

Optional fields:

```txt
metadata
createdBy
updatedBy
deletedAt
```

Organization-specific business fields must not be added to the Kyrae platform unless a project specification requires them.

---

# Branch Model

A generic branch entity may include:

```txt
id
organizationId
code
name
description
isActive
createdAt
updatedAt
```

Optional fields:

```txt
metadata
createdBy
updatedBy
deletedAt
```

Branch-specific business fields must not be added to the Kyrae platform unless a project specification requires them.

---

# User Relationships

Users may be related to organizations and branches.

Possible relationships:

```txt
users many-to-many organizations
users many-to-many branches
```

Recommended tables:

```txt
user_organizations
user_branches
```

Relationship tables should prevent duplicates.

Current baseline consistency rule:

```txt
A user must belong to the parent organization before being assigned to one of its branches.
```

The backend enforces this during `POST /branches/:id/users`. Branch assignment does not automatically create organization membership.

Recommended constraints:

```txt
unique(userId, organizationId)
unique(userId, branchId)
```

---

# Role and Permission Scoping

Roles and permissions may be scoped by organization or branch when required.

Possible strategies:

## Global Roles

Roles apply globally across the application.

Useful for simple systems.

## Organization-Scoped Roles

Roles apply only within a specific organization.

Useful for enterprise systems with organization boundaries.

## Branch-Scoped Roles

Roles apply only within a specific branch.

Useful for systems where users operate in specific locations or operational units.

Initial recommendation:

```txt
Start with global roles and user-branch/user-organization relationships.
Add scoped roles only when a project requires them.
```

---

# Authorization Rules

When organizations or branches are used for access control:

* backend must validate user access to the organization or branch,
* frontend may hide unavailable organizations or branches,
* backend remains the final authority,
* permission checks should include scope when required,
* audit events should include organizationId or branchId when applicable.

Frontend checks are only UX support.

Backend checks are mandatory.

---

# Branch Context

Some applications may require an active branch context.

Branch context may come from:

* selected branch in frontend,
* request header,
* route parameter,
* authenticated session,
* backend resolution.

Possible header:

```txt
X-Branch-Id
```

The backend must validate that the authenticated user can access the requested branch.

---

# Organization Context

Some applications may require an active organization context.

Organization context may come from:

* selected organization in frontend,
* request header,
* route parameter,
* tenant context,
* backend resolution.

Possible header:

```txt
X-Organization-Id
```

The backend must validate that the authenticated user can access the requested organization.

---

# Frontend Responsibilities

Frontend may provide:

* organization selector,
* branch selector,
* organization-aware navigation,
* branch-aware navigation,
* permission-based UI,
* context-aware API calls.

Frontend must not:

* be the final authority for organization or branch access,
* hardcode organization or branch logic,
* expose restricted organizations or branches intentionally,
* bypass backend validation.

---

# Backend Responsibilities

Backend must provide:

* organization access validation,
* branch access validation,
* optional guards,
* optional decorators,
* scoped query helpers when required,
* audit context when applicable.

Backend must not:

* trust frontend context blindly,
* return data from unauthorized organizations or branches,
* hardcode organization-specific or branch-specific business rules in the Kyrae platform.

---

# API Standards

Generic endpoints may include:

```txt
GET /organizations
GET /organizations/:id
GET /branches
GET /branches/:id
GET /organizations/:id/branches
```

Implementation status note:

* `GET /organizations/:id/branches` is an optional endpoint pattern and is not implemented in the current Kyrae baseline.

Management endpoints:

```txt
POST /organizations
PATCH /organizations/:id
DELETE /organizations/:id
PATCH /organizations/:id/activate
PATCH /organizations/:id/deactivate

POST /branches
PATCH /branches/:id
DELETE /branches/:id
PATCH /branches/:id/activate
PATCH /branches/:id/deactivate
```

Current organization-user management endpoints:

```txt
GET /organizations/:id/users
POST /organizations/:id/users
DELETE /organizations/:id/users/:userId
```

Current branch-user management endpoints:

```txt
GET /branches/:id/users
POST /branches/:id/users
DELETE /branches/:id/users/:userId
```

`POST /branches/:id/users` requires the user to already be assigned to the branch parent organization through `user_organizations`.

Current contracts for organizations are defined in:

```txt
packages/shared-contracts/src/organizations/organization.contracts.ts
```

Current contracts for branches are defined in:

```txt
packages/shared-contracts/src/branches/branch.contracts.ts
```

Current response/query contracts:

```txt
OrganizationDto
OrganizationUserDto
OrganizationUserRoleSummaryDto
AssignUserToOrganizationCommand
UserOrganizationDto

BranchDto
BranchOrganizationSummaryDto
ListBranchesQuery
AssignUserToBranchCommand
BranchUserDto
BranchUserRoleSummaryDto
UserBranchDto
```

Implementation note:

* backend branches responses should be mapped explicitly to shared DTOs,
* backend should not expose TypeORM entities directly as HTTP contracts,
* frontend branches services should consume `@kyrae/shared-contracts` types.

Required permissions may include:

```txt
ORGANIZATIONS_READ
ORGANIZATIONS_CREATE
ORGANIZATIONS_UPDATE
BRANCHES_READ
BRANCHES_CREATE
BRANCHES_UPDATE
```

---

# Database Standards

Recommended tables:

```txt
organizations
branches
user_organizations
user_branches
```

Recommended indexes:

```txt
idx_organizations_code
idx_organizations_is_active
idx_branches_organization_id
idx_branches_code
idx_user_organizations_user_id
idx_user_branches_user_id
```

Recommended unique constraints:

```txt
uq_organizations_code
uq_branches_organization_code
uq_user_organizations_user_organization
uq_user_branches_user_branch
```

---

# Audit Requirements

Audit events should be emitted for:

* organization created,
* organization updated,
* organization activated,
* organization deactivated,
* branch created,
* branch updated,
* branch activated,
* branch deactivated,
* user assigned to organization,
* user removed from organization,
* user assigned to branch,
* user removed from branch,
* unauthorized organization access attempt,
* unauthorized branch access attempt.

Audit events may include:

```txt
organizationId
branchId
actorUserId
targetUserId
action
metadata
createdAt
```

Audit metadata must not contain secrets.

---

# Configuration

Organizations and branches may have configuration only when required.

Generic configuration examples:

* default branch selection,
* allowed branch switching,
* organization status,
* branch status.

Do not add project-specific configuration to the Kyrae platform.

---

# Testing Strategy

Tests should validate:

* user can access assigned organization,
* user cannot access unassigned organization,
* user can access assigned branch,
* user cannot access unassigned branch,
* inactive organization blocks access when required,
* inactive branch blocks access when required,
* branch context is validated in backend,
* organization context is validated in backend,
* audit events are emitted for security-sensitive changes.

Testing levels:

* unit tests,
* e2e tests.

---

# Security Rules

Organizations and branches affect access control.

Security rules:

* never trust organization or branch context without validation,
* backend must enforce access,
* frontend is only UX support,
* scoped data must be filtered server-side,
* unauthorized scope access should return 403,
* audit suspicious scope access attempts.

---

# Multi-Tenancy Relationship

Organizations and branches can support future multi-tenancy.

Possible hierarchy:

```txt
Tenant
└── Organization
    └── Branch
```

Multi-tenancy must not be enabled by default unless a project specification requires it.

---

# AI Agent Rules

AI agents must follow these rules:

1. Keep organizations and branches generic.
2. Do not add business-specific branch behavior unless a feature specification requires it.
3. Do not add inventory, sales, POS, billing or logistics logic to branches.
4. Validate organization and branch access in the backend.
5. Do not rely only on frontend context checks.
6. Use permissions for management endpoints.
7. Add audit events for assignment and status changes.
8. Use TypeORM migrations for schema changes.
9. Update shared contracts when organization or branch DTOs change.
10. Ask for clarification when scope requirements are ambiguous.

---

# Out of Scope

The generic organizations and branches architecture must not include:

* POS branch behavior,
* inventory per branch,
* sales per branch,
* billing by branch,
* logistics by branch,
* warehouse operations,
* customer-specific branch workflows,
* real company or branch names.

Those rules and data must be defined by project-specific feature specifications.
