# Multi-Tenancy Architecture

# Overview

This document defines the optional multi-tenancy architecture for the Kyrae.

Kyrae is IAM-first and security-first. Multi-tenancy is not mandatory for every project, but the architecture must remain prepared to support tenant-aware systems when a project requires it.

Multi-tenancy must remain generic and reusable. Project-specific tenant rules must be defined per project specification.

---

# Multi-Tenancy Goals

Multi-tenancy should help to:

* separate access between organizations or clients,
* support SaaS-style systems,
* support enterprise client isolation,
* keep IAM tenant-aware when required,
* protect data boundaries,
* support scalable authorization models,
* avoid hardcoded client-specific logic.

---

# When To Use Multi-Tenancy

Use multi-tenancy when a system needs to support:

* multiple clients in the same application,
* multiple organizations with isolated data,
* tenant-specific configuration,
* tenant-scoped users,
* tenant-scoped roles or permissions,
* tenant-specific branding or settings,
* SaaS-style deployments.

Do not add multi-tenancy when the project only requires a single organization or simple branch-level scoping.

---

# Multi-Tenancy Scope

Multi-tenancy may affect:

* authentication,
* authorization,
* users,
* roles,
* permissions,
* organizations,
* branches,
* configuration,
* database queries,
* API contracts,
* frontend routing and state,
* deployment strategy.

Multi-tenancy must not be added to the Kyrae platform as active behavior unless a project specification requires it.

---

# Core Concepts

## Tenant

A tenant represents an isolated client, company, organization or logical customer boundary.

A tenant may own:

* users,
* roles,
* permissions,
* organizations,
* branches,
* configuration,
* project-specific data.

## Tenant Context

Tenant context identifies the active tenant for a request or session.

Tenant context may come from:

* authenticated user claims,
* selected tenant in UI,
* request header,
* subdomain,
* route parameter,
* backend session resolution.

## Tenant Scope

Tenant scope defines which data a user can access.

Tenant scope may apply to:

* API queries,
* permissions,
* roles,
* frontend navigation,
* configuration,
* reports,
* project-specific modules.

---

# Recommended Tenant Model

A future tenant entity may include:

```txt
id
code
name
isActive
createdAt
updatedAt
```

Optional fields:

```txt
description
metadata
domain
subdomain
```

Tenant-specific fields must be added only when required by a project.

---

# Tenant and IAM

When multi-tenancy is enabled, IAM must be tenant-aware.

Possible relationships:

```txt
tenant users
tenant roles
tenant permissions
tenant organizations
tenant branches
```

Recommended patterns:

* users may belong to one or more tenants,
* roles may be global or tenant-scoped,
* permissions may be global but assigned within tenant context,
* branches may belong to organizations within a tenant,
* tenant status must be checked when resolving access.

---

# Tenant Resolution Strategies

A project may choose one tenant resolution strategy.

## Header-Based

Example:

```txt
X-Tenant-Id
```

Useful for:

* APIs,
* admin platforms,
* internal systems.

## Subdomain-Based

Example:

```txt
tenant-a.example.com
tenant-b.example.com
```

Useful for:

* SaaS platforms,
* client-facing applications.

## Route-Based

Example:

```txt
/tenants/:tenantId/dashboard
```

Useful for:

* admin portals,
* internal management tools.

## User Selection-Based

The user selects active tenant after login.

Useful when:

* one user belongs to multiple tenants,
* tenant context changes during session.

---

# Tenant Context Rules

Tenant context must be:

* validated,
* authorized,
* available to backend services,
* available to frontend state when needed,
* protected from tampering.

The backend must never blindly trust tenant context sent by the frontend.

The backend must verify that the authenticated user belongs to the requested tenant.

---

# Backend Multi-Tenancy Rules

When multi-tenancy is enabled:

* backend must resolve tenant context per request,
* backend must validate tenant access,
* services must filter tenant-scoped data,
* database queries must include tenant scope when required,
* guards may validate tenant access,
* audit events should include tenant id when available.

Do not:

* trust tenant id without validation,
* expose data across tenants,
* hardcode tenant-specific logic,
* place tenant filtering only in frontend.

---

# Frontend Multi-Tenancy Rules

When multi-tenancy is enabled:

* frontend must store active tenant context centrally,
* frontend must show tenant selection when needed,
* frontend must include tenant context in API requests when required,
* frontend must refresh permissions when tenant changes,
* frontend must hide tenant-restricted UI when needed.

Frontend tenant checks are UX support.

Backend tenant checks are mandatory.

---

# Authorization and Tenants

Tenant-aware authorization may include:

* tenant-scoped roles,
* tenant-scoped permissions,
* tenant-aware guards,
* tenant-aware user-role relationships,
* tenant-aware branch access.

Examples:

```txt
User A has USERS_READ in Tenant 1.
User A does not have USERS_READ in Tenant 2.
```

Permission resolution must consider tenant context when enabled.

---

# Organizations, Branches and Tenants

Recommended hierarchy when multi-tenancy is required:

```txt
Tenant
└── Organization
    └── Branch
```

Alternative hierarchies may be defined per project.

Organizations and branches must remain generic and must not include project-specific business behavior.

---

# Database Strategy

Multi-tenancy may use different database strategies.

## Shared Database, Shared Schema

All tenants share the same database and schema.

Tenant separation is handled using a `tenantId` column.

Pros:

* simpler operations,
* lower cost,
* easier migrations.

Cons:

* strict query discipline required,
* data leakage risk if filtering is wrong.

## Shared Database, Separate Schemas

Each tenant uses a separate schema.

Pros:

* stronger logical isolation,
* easier tenant-specific backups.

Cons:

* more complex migrations,
* more operational overhead.

## Separate Databases

Each tenant has its own database.

Pros:

* strongest isolation,
* easier per-tenant restore.

Cons:

* highest operational complexity,
* more expensive,
* harder to scale operations.

Initial recommendation:

```txt
Shared database, shared schema with tenantId
```

Only change this when a project requires stronger isolation.

---

# Tenant Data Rules

When using shared schema:

* tenant-scoped tables should include `tenantId`,
* queries must filter by tenant context,
* indexes should include tenantId where needed,
* unique constraints may need tenant scope.

Examples:

```txt
unique(tenantId, code)
index(tenantId, createdAt)
index(tenantId, status)
```

---

# Audit and Tenants

Audit events should include tenant context when available.

Recommended audit field:

```txt
tenantId
```

Tenant-aware audit helps trace:

* cross-tenant access attempts,
* tenant-specific user changes,
* tenant-specific role assignments,
* tenant-specific configuration changes.

Audit metadata must not include secrets.

---

# Configuration and Tenants

Configuration may be tenant-aware.

Examples:

* tenant display name,
* tenant feature flags,
* tenant security settings,
* tenant branding when required.

Tenant configuration must not store secrets unless a secure storage strategy is defined.

---

# API Standards for Multi-Tenancy

Tenant-aware APIs must define how tenant context is passed.

Examples:

```txt
X-Tenant-Id
/tenants/:tenantId/users
```

Rules:

* validate tenant access,
* document tenant requirements,
* protect tenant-scoped endpoints,
* avoid leaking tenant data,
* return 403 when user lacks tenant access.

---

# Testing Strategy

Multi-tenancy tests should validate:

* user can access allowed tenant,
* user cannot access forbidden tenant,
* tenant-scoped data does not leak,
* permissions change by tenant,
* tenant context is required when needed,
* invalid tenant context is rejected,
* audit includes tenant context when available.

Testing levels:

* unit tests,
* e2e tests.

---

# Security Rules

Multi-tenancy security rules:

* never trust tenant id without validation,
* always enforce tenant access server-side,
* avoid cross-tenant data leakage,
* include tenant scope in queries where required,
* avoid hardcoded tenant logic,
* protect tenant configuration,
* audit suspicious tenant access attempts.

---

# AI Agent Rules

AI agents must follow these rules:

1. Do not enable multi-tenancy unless a feature specification requires it.
2. Keep multi-tenancy generic and reusable.
3. Do not hardcode tenant names, domains or customer data.
4. Validate tenant access in the backend.
5. Do not rely only on frontend tenant checks.
6. Include tenant context in audit when enabled.
7. Update database standards when tenant schema changes are required.
8. Update API specs when tenant context affects endpoints.
9. Do not add project-specific tenant behavior to the Kyrae platform.
10. Ask for clarification when tenant requirements are ambiguous.

---

# Out of Scope

The generic multi-tenancy architecture must not include:

* real client names,
* project-specific tenant rules,
* customer-specific domains,
* tenant-specific billing,
* tenant-specific operational workflows,
* hardcoded tenant configuration,
* production credentials.

Those must be defined by project-specific specifications.
