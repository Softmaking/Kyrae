# Authentication Architecture

# Overview

This document defines the authentication architecture for the Kyrae.

Kyrae is IAM-first and security-first. Authentication must remain modular, reusable and independent from project-specific business domains.

Initial authentication is based on:

- email and password,
- JWT access token,
- refresh token strategy.

The architecture must remain prepared for:

- Microsoft Entra ID,
- Google Identity,
- external identity providers,
- future MFA,
- future SSO.

---

# Authentication Goals

The authentication architecture must:

- verify user identity,
- protect private routes and API endpoints,
- support JWT-based sessions,
- support refresh token rotation,
- remain provider-ready,
- support future external identity providers,
- remain independent from business-specific modules,
- integrate with authorization and audit modules.

---

# Authentication Scope

Authentication is responsible for:

- login,
- logout,
- token refresh,
- password validation,
- access token creation,
- refresh token creation,
- refresh token validation,
- authentication guards,
- authentication audit events,
- provider mapping when external providers are enabled.

Authentication is not responsible for:

- business-specific access rules,
- project-specific approval workflows,
- billing rules,
- inventory rules,
- sales rules,
- operational domain logic.

---

# Initial Authentication Flow

Initial authentication must use email and password.

Recommended flow:

1. User submits email and password.
2. Backend validates credentials.
3. Backend verifies user status.
4. Backend creates JWT access token.
5. Backend creates refresh token.
6. Backend stores refresh token securely.
7. Backend returns session response.
8. Frontend stores session data according to the selected strategy.
9. Frontend uses access token for API requests.
10. Frontend refreshes session when required.

Current baseline in this repository:

- frontend stores `accessToken` and `refreshToken`,
- frontend restores session on app bootstrap with `/auth/me`,
- frontend interceptor attempts `/auth/refresh` on `401` once, retries the original request, and logs out if refresh fails,
- frontend user-initiated logout calls `/auth/logout` and clears local state even if the remote request fails,
- `/auth/login` is protected by a guest-only route guard to redirect authenticated users to the dashboard,
- backend keeps refresh token hashing and revocation logic.

---

# JWT Strategy

JWT access tokens should be short-lived.

JWT payload may include:

```ts
export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}
```

Recommended JWT payload fields:

- user id,
- email,
- roles,
- permissions,
- issued at,
- expiration,
- token type when needed.

JWT payload must not include:

- password hashes,
- refresh tokens,
- secrets,
- sensitive personal information,
- unnecessary user profile data.

---

# Refresh Token Strategy

Refresh tokens should be long-lived compared to access tokens.

Recommended rules:

- Store refresh tokens securely.
- Prefer storing hashed refresh tokens.
- Support token revocation.
- Support logout by invalidating refresh tokens.
- Support refresh token rotation when required.
- Do not expose refresh token internals to the frontend.

Refresh token storage must be implemented in the backend.

---

# User Status Validation

Authentication must verify user status before allowing access.

Recommended user status checks:

- user exists,
- user is active,
- user is not locked,
- user is allowed to authenticate,
- user has valid authentication provider mapping when external providers are used.

Authentication must reject inactive or locked users.

---

# Password Strategy

Password authentication should follow secure practices.

Recommended rules:

- Store password hashes only.
- Never store plain text passwords.
- Use a strong hashing algorithm.
- Validate password policy when creating or updating passwords.
- Do not expose password validation details unnecessarily.
- Support password reset only when the project specification requires it.

---

# External Provider Strategy

The architecture must remain prepared for external identity providers.

Prepared providers:

- Microsoft Entra ID,
- Google Identity,
- external OAuth/OIDC providers.

External providers must remain optional.

Provider integration should support:

- provider user identifier,
- provider email,
- provider display name,
- local user mapping,
- user status validation,
- role and permission resolution,
- audit events.

External provider login must still respect local IAM rules.

A user authenticated by an external provider must not automatically bypass local user validation.

---

# Microsoft Entra ID Strategy

When enabled, Microsoft Entra ID authentication should:

- validate identity provider token,
- map provider identity to local user,
- verify local user status,
- resolve roles and permissions locally,
- issue local application tokens when required,
- audit successful and failed login attempts.

Microsoft Entra ID must not replace local authorization rules unless explicitly defined by a project specification.

---

# Google Identity Strategy

When enabled, Google Identity authentication should:

- validate provider token,
- map provider identity to local user,
- verify local user status,
- resolve roles and permissions locally,
- issue local application tokens when required,
- audit successful and failed login attempts.

Google Identity must not bypass local user, role or permission rules.

---

# Frontend Authentication Responsibilities

The frontend is responsible for:

- login UI,
- logout UI,
- session state,
- route protection,
- token attachment through interceptors,
- handling authentication errors,
- redirecting unauthenticated users,
- hiding or showing UI based on authentication state.

The frontend must not:

- validate passwords directly,
- decide final authorization alone,
- store secrets,
- hardcode permission logic across components,
- bypass backend authorization.

---

# Backend Authentication Responsibilities

The backend is responsible for:

- credential validation,
- token generation,
- token validation,
- refresh token handling,
- user status validation,
- authentication guards,
- provider token validation when external providers are enabled,
- authentication audit events.

The backend must not:

- expose password hashes,
- expose secrets,
- place authentication logic inside controllers,
- bypass local user status validation.

---

# Authentication Guards

Recommended backend guards:

- JWT auth guard,
- optional refresh token guard,
- provider-specific guards when required.

Recommended frontend guards:

- auth guard,
- guest guard,
- permission guard when applicable.

---

# Authentication and Authorization Relationship

Authentication answers:

```txt
Who is the user?
```

Authorization answers:

```txt
What is the user allowed to do?
```

Authentication must integrate with authorization, but both concerns must remain separated.

Authentication must provide identity.

Authorization must enforce roles and permissions.

---

# Audit Requirements

Authentication should emit audit events for security-relevant actions.

Recommended audit events:

- login success,
- login failure,
- logout,
- token refresh,
- invalid token usage,
- locked account attempt,
- inactive user login attempt,
- external provider login success,
- external provider login failure.

Audit events must not expose secrets or sensitive token values.

Severity can be dynamic based on risk patterns.

Current behavior:

- login failures start as `WARNING` and can escalate to `CRITICAL` on burst or spray patterns,
- locked account attempts start as `WARNING` and can escalate to `CRITICAL` on repeated attempts,
- invalid token usage starts as `ERROR` and can escalate to `CRITICAL` on repeated invalid token patterns.

Authentication audit metadata can include risk context counters and window values.

For refresh flows, the backend should capture `ipAddress` and `userAgent` when available.

---

# Environment Variables

Authentication configuration should use environment variables.

Recommended variables:

```txt
JWT_SECRET=
JWT_EXPIRES_IN=
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
SECURITY_PASSWORD_MIN_LENGTH=
SECURITY_PASSWORD_REQUIRE_UPPERCASE=
SECURITY_PASSWORD_REQUIRE_LOWERCASE=
SECURITY_PASSWORD_REQUIRE_NUMBERS=
SECURITY_PASSWORD_REQUIRE_SPECIAL=
SECURITY_MAX_LOGIN_ATTEMPTS=
SECURITY_LOCKOUT_DURATION_MINUTES=
SECURITY_CRITICAL_LOGIN_FAILURES_THRESHOLD=
SECURITY_CRITICAL_LOGIN_FAILURES_WINDOW_MINUTES=
SECURITY_CRITICAL_LOGIN_SPRAY_DISTINCT_USERS_THRESHOLD=
SECURITY_CRITICAL_LOGIN_SPRAY_WINDOW_MINUTES=
SECURITY_CRITICAL_LOCKED_ATTEMPTS_THRESHOLD=
SECURITY_CRITICAL_LOCKED_ATTEMPTS_WINDOW_MINUTES=
SECURITY_CRITICAL_INVALID_TOKEN_THRESHOLD=
SECURITY_CRITICAL_INVALID_TOKEN_WINDOW_MINUTES=
```

Rules:

- Document variables in `.env.example`.
- Do not commit real secrets.
- Use different values per environment.
- Keep production secrets outside the repository.

---

# API Endpoints

Initial recommended endpoints:

```txt
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

Optional future endpoints:

```txt
POST /auth/microsoft
POST /auth/google
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password
```

Optional endpoints must only be implemented when required by a feature specification.

---

# Testing Strategy

Authentication tests should include:

- successful login,
- invalid credentials,
- inactive user login,
- locked user login,
- token refresh,
- invalid token,
- expired token,
- logout behavior,
- permission loading after login,
- external provider mapping when enabled.

Testing levels:

- unit tests,
- e2e tests.

---

# Security Restrictions

Authentication implementation must not:

- store plain text passwords,
- expose password hashes,
- expose JWT secrets,
- expose refresh token values,
- bypass local user validation,
- hardcode secrets,
- place business logic inside controllers,
- allow external providers to bypass local IAM rules.

---

# AI Agent Rules

AI agents must follow these rules:

1. Keep authentication generic and reusable.
2. Do not add business-specific authentication rules unless explicitly specified.
3. Do not bypass local user status validation.
4. Do not expose secrets or token internals.
5. Do not place authentication logic inside controllers.
6. Keep external providers modular and optional.
7. Integrate authentication with audit when required.
8. Integrate authentication with authorization without mixing responsibilities.
9. Update `.env.example` when new authentication variables are required.
10. Update API documentation when authentication endpoints change.

---

# Out of Scope

The generic authentication architecture must not include:

- project-specific approval workflows,
- domain-specific login restrictions,
- customer-specific business validations,
- POS login logic,
- inventory access logic,
- billing access logic,
- logistics access logic.

Those rules must be defined by project-specific feature specifications.
