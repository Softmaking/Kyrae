# Testing Standards

# Overview

This document defines the testing strategy for the Kyrae.

Kyrae is IAM-first and security-first, so testing must prioritize authentication, authorization, users, roles, permissions, audit and security-sensitive flows.

The initial testing strategy is:

* unit tests,
* e2e tests.

Integration and performance testing may be added later when a project requires them.

---

# Testing Goals

Testing must help to:

* validate business logic,
* validate IAM behavior,
* validate authentication flows,
* validate authorization rules,
* prevent regressions,
* improve confidence during refactors,
* support AI-assisted development,
* keep frontend and backend behavior predictable.

---

# Testing Scope

The Kyrae platform should include tests for:

* authentication,
* authorization,
* user management,
* role management,
* permission management,
* guards,
* interceptors,
* services,
* API endpoints,
* critical frontend flows.

Project-specific business tests must be added inside each concrete project.

---

# Testing Levels

## Unit Tests

Unit tests validate isolated logic.

Use unit tests for:

* services,
* guards,
* helpers,
* validators,
* permission checks,
* state services,
* utility functions.

## e2e Tests

e2e tests validate complete flows.

Use e2e tests for:

* login,
* token refresh,
* protected routes,
* permission-based access,
* user creation,
* role assignment,
* permission assignment,
* API authorization.

---

# Backend Testing

Backend testing should prioritize security and IAM behavior.

## Backend Unit Tests

Recommended targets:

* auth service,
* users service,
* roles service,
* permissions service,
* audit service,
* security helpers,
* guards,
* decorators when applicable.

Unit tests should validate:

* successful behavior,
* invalid inputs,
* edge cases,
* authorization failures,
* inactive user handling,
* locked user handling,
* missing permissions.

## Backend e2e Tests

Recommended flows:

* login success,
* login failure,
* inactive user login blocked,
* token refresh,
* protected endpoint without token blocked,
* protected endpoint with invalid token blocked,
* protected endpoint without permission blocked,
* protected endpoint with permission allowed,
* role assignment,
* permission assignment.

---

# Frontend Testing

Frontend testing should prioritize authentication, authorization and critical UI behavior.

## Frontend Unit Tests

Recommended targets:

* auth state service,
* permission service,
* guards,
* interceptors,
* shared components,
* reusable UI patterns,
* form validation.

Unit tests should validate:

* route protection,
* permission checks,
* token handling behavior,
* error handling,
* conditional UI rendering.

## Frontend e2e Tests

Recommended flows:

* login page loads,
* user can login with valid credentials,
* invalid login displays an error,
* authenticated user can access protected routes,
* unauthenticated user is redirected,
* user without permission cannot access restricted route,
* permission-based UI hides restricted actions,
* logout clears session.

---

# Mobile Testing

Mobile testing should prioritize the official beta scope: authentication, token refresh, session state, routing, home (dashboard), and profile.

## Mobile Unit And Widget Tests

Recommended targets:

* auth interceptor,
* auth state provider,
* auth repository,
* login form,
* protected routing,
* home and profile screens.

Mobile tests live under `apps/mobile/test/**/*.dart`.

## Mobile Validation Commands

Run from `apps/mobile`:

```bash
flutter analyze
flutter test
```

---

# IAM Testing Priority

IAM-related tests have the highest priority.

Testing priority order:

1. Authentication.
2. Authorization.
3. Permission checks.
4. Role assignment.
5. User status validation.
6. Audit events.
7. Route guards.
8. API guards.
9. Shared contracts.
10. Generic UI behavior.

---

# Authentication Test Cases

Authentication tests should include:

* valid login,
* invalid password,
* unknown email,
* inactive user,
* locked user,
* token expiration,
* token refresh,
* invalid refresh token,
* logout,
* external provider mapping when enabled.

---

# Authorization Test Cases

Authorization tests should include:

* user with permission can access resource,
* user without permission cannot access resource,
* user with role inherits permissions,
* role without permission cannot access resource,
* permission changes affect access,
* frontend hides restricted actions,
* backend blocks restricted API access.

Frontend authorization must never be the only security layer.

Backend authorization must always be authoritative.

---

# Audit Test Cases

Audit tests should include:

* login success event,
* login failure event,
* permission denied event,
* user status change event,
* role assignment event,
* permission assignment event,
* configuration change event when applicable.

Audit tests must not assert or expose secrets.

---

# Test Naming Conventions

Use clear test names.

Recommended pattern:

```txt
should <expected behavior> when <condition>
```

Examples:

```txt
should allow login when credentials are valid
should reject login when user is inactive
should block endpoint when permission is missing
should hide action button when user lacks permission
```

---

# Test File Naming

Recommended backend patterns:

```txt
auth.service.spec.ts
permissions.guard.spec.ts
users.e2e-spec.ts
auth.e2e-spec.ts
```

Recommended frontend patterns:

```txt
auth.service.spec.ts
permission.guard.spec.ts
login.component.spec.ts
auth-flow.e2e-spec.ts
```

---

# Test Data Rules

Test data must be:

* deterministic,
* safe,
* reusable,
* free of real personal data,
* free of production credentials.

Do not use:

* real emails from production,
* real passwords,
* real tokens,
* real customer data,
* production database dumps.

---

# Mocking Rules

Mock external services when possible.

Mock candidates:

* external identity providers,
* email services,
* file storage,
* third-party APIs,
* payment providers when used by a specific project.

Do not mock core logic unnecessarily when the goal is to validate behavior.

---

# Database Testing Rules

For backend e2e tests:

* use a test database,
* isolate test data,
* clean test data between runs when needed,
* do not run tests against production databases,
* do not rely on existing local data.

Recommended future environment:

```txt
.env.test
```

This is optional initially and may be added when the test workflow requires it.

---

# Package Manager Rules

Testing commands must use pnpm.

Examples:

```bash
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
```

Do not use npm commands.

Do not generate `package-lock.json`.

---

# CI/CD Testing Strategy

Future CI/CD should run:

1. Install dependencies.
2. Lint.
3. Unit tests.
4. e2e tests when environment is available.
5. Build frontend.
6. Build backend.

Example sequence:

```bash
pnpm install
pnpm backend:lint
pnpm frontend:test
pnpm frontend:e2e
pnpm backend:test
pnpm backend:test:e2e
pnpm frontend:build
pnpm backend:build
```

---

# AI Agent Testing Rules

AI agents must follow these rules:

1. Add or update tests when behavior changes.
2. Prioritize IAM and security tests.
3. Do not remove tests to make code pass.
4. Do not skip tests without explanation.
5. Do not create project-specific tests unless the feature specification requires them.
6. Use pnpm commands.
7. Keep test data generic and safe.
8. Do not use production data.
9. Document untested behavior when tests are not added.
10. Suggest test improvements during code review.

---

# Out of Scope

The Kyrae platform testing standards must not include domain-specific test cases such as:

* POS transactions,
* inventory movements,
* sales flows,
* billing workflows,
* warehouse operations,
* logistics tracking.

Those tests must be defined by project-specific feature specifications.
