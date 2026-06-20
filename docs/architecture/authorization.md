# Authorization Architecture

# Overview

This document defines the authorization architecture for the Kyrae.

Kyrae is IAM-first and security-first. Authorization must be based on reusable roles and permissions, and must remain independent from project-specific business domains.

Authentication identifies the user.

Authorization determines what the user is allowed to do.

---

# Authorization Goals

The authorization architecture must:

* enforce access control,
* protect backend endpoints,
* protect frontend routes,
* support permission-based UI rendering,
* support role and permission assignment,
* keep permission checks centralized,
* avoid duplicated authorization logic,
* remain reusable across projects,
* integrate with audit and security modules.

---

# Authorization Scope

Authorization is responsible for:

* roles,
* permissions,
* user-role relationships,
* role-permission relationships,
* backend guards,
* frontend guards,
* reusable permission decorators,
* permission checks,
* access control decisions,
* authorization audit events.

Authorization is not responsible for:

* validating user credentials,
* creating authentication tokens,
* business-specific approval workflows,
* project-specific operational rules,
* domain-specific access logic unless defined by a project specification.

---

# Core Concepts

## User

A user represents an identity that can access the system.

A user may have:

* one or more roles,
* direct or indirect permissions,
* organization or branch scope when required.

## Role

A role is a reusable access group.

Examples of generic role names:

```txt
ADMIN
USER
AUDITOR
MANAGER
```

Roles must remain generic unless a project specification defines project-specific roles.

## Permission

A permission is a granular access rule.

Examples:

```txt
USERS_READ
USERS_CREATE
USERS_UPDATE
ROLES_READ
ROLES_ASSIGN_PERMISSIONS
PERMISSIONS_READ
AUDIT_READ
ORGANIZATIONS_UPDATE
```

Permissions should be explicit, stable and easy to audit.

---

# Recommended Permission Naming

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
USERS_DELETE
ROLES_READ
ROLES_CREATE
ROLES_UPDATE
ROLES_DELETE
PERMISSIONS_READ
PERMISSIONS_CREATE
PERMISSIONS_UPDATE
PERMISSIONS_DELETE
AUDIT_READ
ORGANIZATIONS_READ
ORGANIZATIONS_CREATE
ORGANIZATIONS_UPDATE
ORGANIZATIONS_DELETE
BRANCHES_READ
BRANCHES_CREATE
BRANCHES_UPDATE
BRANCHES_DELETE
CONFIGURATION_READ
CONFIGURATION_CREATE
CONFIGURATION_UPDATE
CONFIGURATION_DELETE
```

For scoped permissions, use:

```txt
MODULE_RESOURCE_ACTION
```

Example:

```txt
USERS_BRANCH_ASSIGN
ROLES_PERMISSION_ASSIGN
```

Avoid vague names such as:

```txt
ACCESS
MANAGE
DO_ALL
SUPER_PERMISSION
```

---

# Role and Permission Model

The authorization model should support:

* users,
* roles,
* permissions,
* user-role relationships,
* role-permission relationships.

Recommended relationships:

```txt
users        many-to-many roles
roles        many-to-many permissions
users        effective permissions through roles
```

Optional future support:

```txt
users        direct permissions
roles        scoped permissions
permissions organization/branch scope
```

Direct user permissions should only be added when required.

---

# Backend Authorization

Backend authorization must be enforced using guards, decorators and centralized permission services.

Recommended backend components:

* `PermissionsGuard`,
* `@Permissions()` decorator,
* permission service,
* authorization helper methods.

Optional project extension components:

* `RolesGuard` when a project explicitly requires direct role-based route protection,
* `@Roles()` decorator when role-based route metadata is introduced.

Backend authorization rules:

* Controllers may declare required permissions.
* Guards must enforce permissions.
* Services may perform additional business-safe authorization checks when needed.
* Permission logic must not be duplicated across controllers.
* Controllers must not manually implement permission checks if a reusable guard can handle them.

---

# Frontend Authorization

Frontend authorization improves user experience but must not be the only security layer.

Frontend authorization may control:

* route visibility,
* navigation items,
* buttons,
* forms,
* UI actions,
* page access.

Frontend authorization must use:

* route guards,
* centralized permission service,
* reusable permission directives or helpers when needed,
* session/user state from auth module.

Frontend must not:

* be the only authorization enforcement layer,
* hardcode permission logic across components,
* assume hidden UI means secure API access,
* bypass backend authorization.

---

# Route Protection

Frontend routes should support:

* public routes,
* authenticated routes,
* guest-only routes,
* permission-protected routes.

Example route metadata:

```ts
{
  path: 'users',
  canActivate: [authGuard, permissionGuard],
  data: {
    permissions: ['USERS_READ']
  }
}
```

Route permission rules must remain centralized and reusable.

---

# API Protection

Backend endpoints should declare permissions explicitly.

Example pattern:

```ts
@Permissions('USERS_READ')
@Get()
findAll() {
  return this.usersService.findAll();
}
```

Permission decorators should remain generic and reusable.

---

# Authorization and Scope

Some projects may require scoped authorization.

Optional scopes:

* organization scope,
* branch scope,
* tenant scope,
* project-specific scope.

Scope support must be added only when required by a specification.

Core Kyrae scope support may include:

* organizations,
* branches.

Business-specific scopes must not be added to the Kyrae platform.

---

# Organizations and Branches

Organizations and branches may be used to restrict access.

Examples:

* user can access only specific organizations,
* user can access only specific branches,
* permission applies only within a branch,
* role assignment is scoped to an organization.

Organizations and branches should remain generic.

They must not include domain-specific business behavior.

---

# Permission Loading Strategy

Permissions may be loaded:

* during login,
* through `/auth/me`,
* through a dedicated permissions endpoint,
* from backend guard resolution.

Recommended frontend strategy:

* load authenticated user,
* load roles and permissions,
* store auth state centrally,
* expose reusable permission checks.

Recommended backend strategy:

* validate permissions from database or cache,
* avoid trusting client-provided permissions,
* keep permission checks server-side authoritative.

---

# Caching Strategy

Permission checks may use caching for performance.

Rules:

* cache must not bypass security,
* cache invalidation must be considered when roles or permissions change,
* user permissions should be refreshed after permission assignment changes,
* backend must remain the source of truth.

Caching is optional and should be added only when needed.

---

# Audit Requirements

Authorization should emit audit events for security-relevant actions.

Recommended audit events:

* permission denied,
* role assigned,
* role removed,
* permission assigned to role,
* permission removed from role,
* unauthorized API access attempt,
* scoped access violation.

Audit events must not expose secrets or sensitive token values.

---

# Error Handling

Authorization errors should be clear but safe.

Recommended API responses:

* `401 Unauthorized` when authentication is missing or invalid.
* `403 Forbidden` when authentication exists but permission is insufficient.

Do not expose sensitive internal authorization details in error responses.

---

# Testing Strategy

Authorization tests should include:

* user with required permission can access resource,
* user without required permission cannot access resource,
* inactive user cannot access protected resources,
* role-permission assignment works,
* permission guard blocks unauthorized access,
* frontend route guard blocks unauthorized navigation,
* permission-based UI hides restricted actions,
* backend still blocks restricted API calls even if UI is bypassed.

Testing levels:

* unit tests,
* e2e tests.

---

# Shared Contracts

Shared contracts may define:

* permission codes,
* role codes,
* user session types,
* current user interfaces,
* permission check interfaces.

Shared contracts must not contain:

* authorization business logic,
* database access,
* guards,
* framework-specific implementation.

---

# Security Rules

Authorization implementation must not:

* rely only on frontend checks,
* hardcode permissions inside UI components,
* duplicate permission logic across modules,
* bypass backend guards,
* expose internal permission resolution details unnecessarily,
* allow project-specific access rules inside generic IAM modules unless specified.

---

# AI Agent Rules

AI agents must follow these rules:

1. Keep authorization generic and reusable.
2. Use roles and permissions as the default access model.
3. Do not hardcode permission checks inside components.
4. Do not duplicate permission checks across controllers or services.
5. Use backend guards for API protection.
6. Use frontend guards for route protection.
7. Keep frontend authorization as UX support, not the only security layer.
8. Do not create project-specific authorization rules unless a feature specification explicitly requires them.
9. Update shared contracts if new reusable permission codes are required.
10. Update audit requirements when authorization behavior changes.

---

# Out of Scope

The generic authorization architecture must not include:

* POS-specific permissions,
* inventory-specific permissions,
* sales-specific permissions,
* billing-specific permissions,
* logistics-specific permissions,
* customer-specific approval workflows,
* domain-specific access rules.

Those rules must be defined by project-specific feature specifications.
