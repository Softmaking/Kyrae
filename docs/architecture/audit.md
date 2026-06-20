# Audit Architecture

# Overview

This document defines the audit architecture for the Kyrae.

Kyrae is IAM-first and security-first. Audit must provide traceability for security-sensitive actions, identity changes and authorization-related events.

Audit must remain generic, reusable and independent from project-specific business domains.

---

# Audit Goals

Audit architecture must help to:

* track security-sensitive events,
* support IAM traceability,
* improve accountability,
* support troubleshooting,
* support compliance requirements,
* detect suspicious behavior,
* preserve important system activity,
* keep business-specific audit rules outside the Kyrae platform unless explicitly specified.

---

# Audit Scope

The generic audit module may track:

* authentication events,
* authorization events,
* user status changes,
* role assignment changes,
* permission assignment changes,
* configuration changes,
* security-sensitive actions,
* failed access attempts.

Audit is not responsible for:

* project-specific operational history,
* business transaction history,
* domain-specific workflow tracking,
* analytics dashboards,
* reporting modules.

Project-specific audit events must be defined by feature specifications.

---

# Core Audit Events

Recommended generic audit events:

```txt
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILED
AUTH_LOGOUT
AUTH_TOKEN_REFRESH
AUTH_INVALID_TOKEN
AUTH_INACTIVE_USER_LOGIN_ATTEMPT
AUTH_LOCKED_USER_LOGIN_ATTEMPT

AUTHORIZATION_PERMISSION_DENIED
AUTHORIZATION_ROLE_ASSIGNED
AUTHORIZATION_ROLE_REMOVED
AUTHORIZATION_PERMISSION_ASSIGNED
AUTHORIZATION_PERMISSION_REMOVED

USER_CREATED
USER_UPDATED
USER_ACTIVATED
USER_DEACTIVATED
USER_LOCKED
USER_UNLOCKED

ROLE_CREATED
ROLE_UPDATED
ROLE_ACTIVATED
ROLE_DEACTIVATED

PERMISSION_CREATED
PERMISSION_UPDATED
PERMISSION_ACTIVATED
PERMISSION_DEACTIVATED

CONFIGURATION_UPDATED
```

---

# Audit Event Structure

Recommended audit event fields:

```txt
id
action
actorUserId
targetUserId
resourceType
resourceId
metadata
ipAddress
userAgent
createdAt
```

Optional fields:

```txt
organizationId
branchId
correlationId
requestId
severity
result
```

---

# Field Definitions

## id

Unique audit event identifier.

## action

The event action code.

Example:

```txt
AUTH_LOGIN_SUCCESS
USER_DEACTIVATED
PERMISSION_ASSIGNED
```

## actorUserId

The user who performed the action.

May be null for anonymous failed login attempts.

## targetUserId

The affected user when applicable.

Example:

* user being deactivated,
* user receiving a role,
* user whose permissions changed.

## resourceType

Generic resource type.

Examples:

```txt
USER
ROLE
PERMISSION
AUTH
CONFIGURATION
```

## resourceId

Identifier of the affected resource when applicable.

## metadata

Additional safe event information.

Metadata must not include secrets, passwords or raw tokens.

## ipAddress

Request IP address when available.

## userAgent

Request user agent when available.

## createdAt

Event creation timestamp.

---

# Audit Metadata Rules

Metadata may include:

* reason,
* previous status,
* new status,
* role code,
* permission code,
* provider name,
* safe error code,
* request context,
* sanitized validation details.

Metadata must not include:

* plain text passwords,
* password hashes,
* access tokens,
* refresh tokens,
* JWT secrets,
* OAuth client secrets,
* private keys,
* database passwords,
* sensitive personal data unless explicitly required and approved.

---

# Audit Severity

Optional severity levels:

```txt
INFO
WARNING
ERROR
CRITICAL
```

Recommended examples:

## INFO

* successful login,
* logout,
* user updated,
* role assigned.

## WARNING

* failed login,
* permission denied,
* inactive user login attempt.

## ERROR

* invalid token usage,
* failed security-sensitive operation.

## CRITICAL

* suspicious access pattern,
* security configuration changed,
* high-risk permission assigned.

Current backend risk escalation rules:

* `AUTH_LOGIN_FAILED` escalates from `WARNING` to `CRITICAL` on burst or spray patterns.
* `AUTH_LOCKED_USER_LOGIN_ATTEMPT` escalates from `WARNING` to `CRITICAL` only on repeated attempts.
* `AUTH_INVALID_TOKEN` uses `ERROR` by default and escalates to `CRITICAL` on repeated invalid token patterns.

Default thresholds are configured through backend environment variables:

* `SECURITY_CRITICAL_LOGIN_FAILURES_THRESHOLD=10`
* `SECURITY_CRITICAL_LOGIN_FAILURES_WINDOW_MINUTES=5`
* `SECURITY_CRITICAL_LOGIN_SPRAY_DISTINCT_USERS_THRESHOLD=5`
* `SECURITY_CRITICAL_LOGIN_SPRAY_WINDOW_MINUTES=10`
* `SECURITY_CRITICAL_LOCKED_ATTEMPTS_THRESHOLD=5`
* `SECURITY_CRITICAL_LOCKED_ATTEMPTS_WINDOW_MINUTES=10`
* `SECURITY_CRITICAL_INVALID_TOKEN_THRESHOLD=8`
* `SECURITY_CRITICAL_INVALID_TOKEN_WINDOW_MINUTES=5`

When escalation is evaluated, audit metadata may include risk context such as:

* `riskRule`,
* `escalatedToCritical`,
* recent attempt counters,
* configured time windows,
* `ipAddress` and `userAgent` when available.

Severity is optional initially and may be added when needed.

---

# Backend Audit Responsibilities

The backend is responsible for:

* creating audit events,
* sanitizing metadata,
* storing audit events,
* protecting audit endpoints,
* enforcing audit read permissions,
* preventing audit tampering,
* ensuring audit does not expose secrets.

Audit logic should live in reusable services.

Controllers should not manually construct complex audit behavior when a reusable audit service exists.

---

# Frontend Audit Responsibilities

The frontend may trigger normal API actions that generate backend audit events.

Frontend may also support:

* audit event views,
* audit filters,
* audit search,
* audit detail screens,
* permission-based audit access.

Frontend must not:

* be the source of truth for audit events,
* create security audit events without backend validation,
* expose audit screens to unauthorized users.

---

# Audit API

Implemented endpoints:

```txt
GET /audit-events
GET /audit-events/:id
```

Recommended permissions:

```txt
AUDIT_READ
```

Optional future permissions:

```txt
AUDIT_EXPORT
AUDIT_MANAGE_RETENTION
```

Audit endpoints must be protected by authentication and authorization.

Current response contract for `GET /audit-events`:

```ts
interface ListAuditEventsResponse {
  data: AuditEventDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

Current response contract for `GET /audit-events/:id`:

```ts
AuditEventDto | null
```

The source of truth for these contracts is `packages/shared-contracts/src/audit/audit.contracts.ts`.

Do not redefine audit response shapes separately in frontend and backend.

---

# Audit Querying

Audit list endpoints support:

```txt
limit
cursor
action
actorUserId
targetUserId
resourceType
resourceId
dateFrom
dateTo
severity
```

Filters must be validated.

Avoid exposing arbitrary unsafe query expressions.

Current query contract:

```ts
interface ListAuditEventsQuery {
  action?: AuditAction | string;
  actorUserId?: string;
  targetUserId?: string;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: AuditSeverity;
  limit?: number;
  cursor?: string;
}
```

Frontend audit filters must stay aligned with this contract.

Backend DTO validation may use Nest/class-validator classes, but those DTOs must implement or match the shared contract.

Audit pagination uses cursor/keyset pagination for scalability. The backend always returns the most recent events first using `createdAt DESC` and `id DESC`. The cursor is opaque to clients and represents the last event received.

---

# Audit Contracts

Audit contracts live in:

```txt
packages/shared-contracts/src/audit/audit.contracts.ts
```

Current shared contracts:

```txt
AuditSeverities
AuditSeverity
AuditActions
AuditAction
AuditResourceType
AuditEventDto
CreateAuditEventCommand
ListAuditEventsQuery
ListAuditEventsResponse
```

Contract usage rules:

* frontend audit services and models should import shared contracts,
* backend audit DTOs should implement shared command/query contracts when practical,
* backend audit responses should serialize entities into DTO response contracts,
* HTTP date fields must be serialized as strings,
* entities are not API contracts,
* framework decorators must stay outside `packages/shared-contracts`.

When adding a new generic audit field, update in this order:

1. `packages/shared-contracts/src/audit/audit.contracts.ts`
2. backend DTO/entity/service mapping when needed
3. frontend model/service/page when needed
4. this document
5. related tests

---

# Audit Retention

Initial Kyrae baseline may not enforce retention automatically.

Future retention strategy may include:

* retention period,
* archive policy,
* export policy,
* deletion restrictions,
* compliance-specific rules.

Retention requirements should be defined per project.

---

# Audit Immutability

Audit events should be treated as append-only.

Recommended rules:

* avoid updating audit events,
* avoid deleting audit events,
* restrict audit management permissions,
* preserve historical traceability.

If deletion or retention cleanup is required, it must be explicitly documented.

---

# Audit and Authentication

Authentication should emit audit events for:

* successful login,
* failed login,
* logout,
* token refresh,
* invalid token,
* inactive user login attempt,
* locked user login attempt,
* external provider login success,
* external provider login failure.

---

# Audit and Authorization

Authorization should emit audit events for:

* permission denied,
* role assignment,
* role removal,
* permission assignment,
* permission removal,
* scoped access violation.

---

# Audit and Users

User management should emit audit events for:

* user created,
* user updated,
* user activated,
* user deactivated,
* user locked,
* user unlocked,
* user role assignment changed,
* user branch assignment changed,
* user organization assignment changed.

---

# Audit and Configuration

Configuration changes should emit audit events when they affect:

* security configuration,
* authentication configuration,
* authorization configuration,
* feature flags,
* environment-aware application behavior.

Do not store secret values in audit metadata.

---

# Database Standards

Audit events should be stored in a dedicated table.

Recommended table:

```txt
audit_events
```

Recommended indexes:

```txt
idx_audit_events_action
idx_audit_events_actor_user_id
idx_audit_events_target_user_id
idx_audit_events_resource_type
idx_audit_events_created_at
idx_audit_events_created_at_id
```

Audit data can grow quickly, so list queries must use keyset pagination and the compound `created_at, id` index. Retention strategy should be considered as the project evolves.

---

# Testing Strategy

Audit tests should validate:

* login success audit event,
* login failure audit event,
* permission denied audit event,
* user status change audit event,
* role assignment audit event,
* permission assignment audit event,
* audit metadata sanitization,
* audit endpoint permission protection.

Testing levels:

* unit tests,
* e2e tests.

---

# Security Rules

Audit implementation must not:

* store passwords,
* store password hashes,
* store raw tokens,
* store secrets,
* expose audit endpoints without permissions,
* allow unauthorized audit deletion,
* expose sensitive metadata in frontend screens.

---

# AI Agent Rules

AI agents must follow these rules:

1. Add audit events for security-sensitive actions when applicable.
2. Do not store secrets in audit metadata.
3. Do not create project-specific audit events unless a feature specification requires them.
4. Keep audit logic reusable.
5. Protect audit endpoints with permissions.
6. Use `AUDIT_READ` for audit viewing.
7. Avoid updating or deleting audit events unless explicitly specified.
8. Add tests for audit behavior when implementing security-sensitive features.
9. Update audit documentation when new generic audit events are introduced.
10. Keep audit independent from project-specific business domains.

---

# Out of Scope

The generic audit architecture must not define domain-specific audit events for:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* production workflows,
* customer-specific operational processes.

Those events must be defined by project-specific feature specifications.
