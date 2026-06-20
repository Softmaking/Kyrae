# Product Modules

# Overview

This document defines the platform modules supported by Kyrae.

Kyrae is IAM-first and security-first. Its purpose is to provide a reusable assistant platform foundation, not to define unrelated business domains.

Business-specific modules such as POS, inventory, sales, billing, logistics or operational workflows must be created only when approved specifications require them.

---

# Module Classification

Modules are classified as:

## Core Modules

Core modules are part of the generic enterprise foundation and may be included in every project.

## Optional Enterprise Modules

Optional modules are reusable enterprise capabilities that may be enabled depending on project needs.

## Project-Specific Modules

Project-specific modules belong only to a concrete system and must not be part of the Kyrae platform foundation.

---

# Core Modules

## 1. Auth

### Responsibility

Handles authentication flows and identity verification.

### Includes

* email and password authentication,
* JWT access token,
* refresh token strategy,
* login,
* logout,
* token refresh,
* password validation,
* authentication guards,
* provider-ready architecture.

### Prepared For

* Microsoft Entra ID,
* Google Identity,
* external identity providers,
* future MFA,
* future SSO.

### Does Not Include

* business-specific login rules,
* project-specific user approval workflows,
* domain-specific access logic.

### Related Modules

* users,
* roles,
* permissions,
* audit,
* security.

---

## 2. Users

### Responsibility

Manages system users and their identity information.

### Includes

* user creation,
* user update,
* user activation,
* user deactivation,
* user status,
* user profile data,
* user lookup,
* user-role assignment relationship.

### Does Not Include

* business-specific employee logic,
* customer management,
* supplier management,
* project-specific user attributes unless defined by a project specification.

### Related Modules

* auth,
* roles,
* permissions,
* audit,
* organizations,
* branches.

---

## 3. Roles

### Responsibility

Defines reusable access groups for authorization.

### Includes

* role creation,
* role update,
* role activation,
* role deactivation,
* role lookup,
* role-permission relationship,
* user-role relationship.

### Does Not Include

* hardcoded business roles,
* project-specific approval chains,
* domain-specific role behavior.

### Related Modules

* users,
* permissions,
* audit,
* security.

---

## 4. Permissions

### Responsibility

Defines granular access rules used by backend guards and frontend route/UI authorization.

### Includes

* permission creation,
* permission update,
* permission grouping,
* permission lookup,
* permission assignment to roles,
* permission validation,
* permission-based guards,
* reusable decorators.

### Does Not Include

* hardcoded permissions inside components,
* duplicated permission checks,
* business-specific permission logic outside specifications.

### Related Modules

* roles,
* users,
* auth,
* audit,
* security.

---

## 5. Audit

### Responsibility

Tracks relevant security and system events.

### Includes

* login attempts,
* failed authentication,
* logout events when applicable,
* authorization failures,
* user status changes,
* role assignment changes,
* permission assignment changes,
* configuration changes.

### Does Not Include

* project-specific operational event logs,
* business transaction history,
* domain-specific workflow tracking unless defined by a project specification.

### Related Modules

* auth,
* users,
* roles,
* permissions,
* security,
* configuration.

---

## 6. Security

### Responsibility

Centralizes reusable security rules and cross-cutting security behavior.

### Includes

* password policy,
* account lockout strategy,
* failed login handling,
* token security,
* authorization rules,
* secure headers when applicable,
* security-related validation helpers.

### Does Not Include

* project-specific risk rules,
* domain-specific fraud detection,
* business workflow security exceptions unless defined by a project specification.

### Related Modules

* auth,
* users,
* permissions,
* audit,
* configuration.

---

## 7. Organizations

### Responsibility

Provides an optional enterprise grouping layer for users, branches and access boundaries.

### Includes

* organization entity,
* organization lookup,
* organization activation status,
* user-organization relationship when required,
* organization-based scoping when required.

### Does Not Include

* project-specific company workflows,
* accounting structures,
* business-specific organization rules.

### Related Modules

* users,
* branches,
* permissions,
* audit.

---

## 8. Branches

### Responsibility

Provides an optional operational scope for users and permissions.

### Includes

* branch entity,
* branch lookup,
* branch activation status,
* user-branch relationship when required,
* branch-based access scoping when required.

### Does Not Include

* business-specific branch operations,
* inventory logic,
* sales logic,
* logistics logic.

### Related Modules

* users,
* organizations,
* roles,
* permissions,
* audit.

---

## 9. Configuration

### Responsibility

Manages reusable system configuration values.

### Includes

* application configuration,
* feature flags when required,
* security configuration references,
* environment-aware configuration,
* reusable configuration service.

### Does Not Include

* secrets committed to the repository,
* business-specific configuration unless defined by a project specification,
* deployment secrets.

### Related Modules

* auth,
* security,
* audit,
* backend,
* frontend.

---

## 10. Health

### Responsibility

Provides basic application health and readiness checks.

### Includes

* API health check,
* database connectivity check,
* service readiness check,
* deployment validation endpoint.

### Does Not Include

* full observability stack,
* business monitoring,
* analytics dashboards.

### Related Modules

* backend,
* database,
* infrastructure,
* CI/CD.

---

# Optional Enterprise Modules

These modules may be added later as reusable enterprise capabilities.

## Notifications

May support:

* email notifications,
* system notifications,
* security alerts,
* workflow notifications.

Must not include project-specific notification rules unless defined by a project specification.

## Files

May support:

* file upload,
* file metadata,
* file validation,
* storage provider abstraction.

Must not include project-specific document workflows unless defined by a project specification.

## Reports

May support:

* generic report structure,
* export patterns,
* reusable report service contracts.

Must not include domain-specific reports in the Kyrae platform.

## Multi-Tenant

May support:

* tenant entity,
* tenant scoping,
* tenant-aware authentication,
* tenant-aware permissions.

Must be added only when the project requires it.

---

# Project-Specific Modules

The following modules are explicitly out of scope for the Kyrae platform:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* production workflows,
* customer-specific business workflows,
* operational domain modules.

These modules must be created only when approved specifications require them.

---

# Module Rules for AI Agents

AI agents must follow these rules:

1. Do not create project-specific business modules unless a feature specification explicitly requests them.
2. Keep IAM modules reusable and independent.
3. Keep frontend and backend responsibilities separated.
4. Use shared contracts only for DTOs, enums, types and interfaces.
5. Do not place business logic inside shared contracts.
6. Do not hardcode permissions inside UI components.
7. Do not place business logic inside backend controllers.
8. Keep security and audit concerns explicit.
9. Update this document if a new reusable enterprise module is added.
10. Create project-specific module specs before generating domain-specific code.

---

# Recommended Module Creation Workflow

Before creating a new module:

1. Confirm whether the module is core, optional enterprise, or project-specific.
2. Review `AGENTS.md`.
3. Review `docs/architecture/overview.md`.
4. Review `docs/standards/coding-standards.md`.
5. Create or update the related feature specification.
6. Define API contracts if needed.
7. Define data model if needed.
8. Generate implementation.
9. Add or update tests.
10. Update documentation if architecture changes.
