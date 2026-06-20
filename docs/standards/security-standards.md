# Security Standards

# Overview

This document defines security standards for the Kyrae.

Kyrae is IAM-first and security-first. Security must be treated as a core architectural concern, not as an optional add-on.

These standards apply to:

- frontend,
- backend,
- shared contracts,
- infrastructure,
- environment configuration,
- AI-assisted development workflows.

---

# Security Goals

Security standards must help to:

- protect user identities,
- enforce authentication and authorization,
- protect sensitive data,
- avoid leaked secrets,
- prevent insecure defaults,
- keep IAM modules reusable,
- reduce attack surface,
- support enterprise-grade systems.

---

# Core Security Principles

The architecture must follow these principles:

- least privilege,
- defense in depth,
- secure by default,
- explicit authorization,
- centralized authentication,
- no secrets in code,
- no business logic in controllers,
- no business logic in frontend components,
- backend is the final security authority.

---

# Authentication Security

Authentication must be implemented securely.

Rules:

- Store password hashes only.
- Never store plain text passwords.
- Use JWT access tokens with expiration.
- Use refresh tokens securely.
- Prefer hashed refresh token storage.
- Reject inactive users.
- Reject locked users.
- Validate user status on login.
- Validate external provider users against local IAM rules.

Authentication must not:

- expose password hashes,
- expose refresh tokens,
- expose JWT secrets,
- allow external providers to bypass local user validation.

---

# Authorization Security

Authorization must be based on roles and permissions.

Rules:

- Protect backend endpoints with guards.
- Use permission decorators when applicable.
- Keep permission checks centralized.
- Do not rely only on frontend permission checks.
- Do not hardcode permissions across multiple components.
- Do not duplicate authorization logic.

Frontend authorization is for user experience.

Backend authorization is the final security enforcement layer.

---

# Token Security

JWT access tokens should be short-lived.

Refresh tokens should be handled carefully.

Rules:

- Do not expose token internals.
- Do not store raw refresh tokens in the database.
- Support refresh token revocation.
- Support logout invalidation.
- Avoid storing secrets in frontend code.
- Do not log access tokens or refresh tokens.

---

# Password Security

Password rules should be configurable.

Recommended standards:

- minimum length,
- complexity requirements when needed,
- hashing with a secure algorithm,
- failed login tracking,
- account lockout strategy when required.

Password reset flows should only be implemented when required by a feature specification.

---

# User Status Security

Authentication and authorization must consider user status.

Recommended user status checks:

- user exists,
- user is active,
- user is not locked,
- user is allowed to authenticate,
- user has valid role/permission relationships.

Inactive or locked users must not access protected resources.

---

# External Provider Security

The architecture may support:

- Microsoft Entra ID,
- Google Identity,
- external identity providers.

External authentication must still enforce local IAM rules.

Provider login must:

- validate provider token,
- map provider user to local user,
- check local user status,
- resolve local roles and permissions,
- emit audit events when applicable.

External providers must not bypass local authorization.

---

# API Security

API endpoints must be secure by default.

Rules:

- Validate all DTOs.
- Protect private endpoints with authentication guards.
- Protect restricted endpoints with permission guards.
- Avoid exposing internal errors.
- Avoid exposing sensitive fields.
- Avoid accepting unvalidated query parameters.
- Use consistent error responses.
- Use rate limiting when required by a project.

Sensitive fields must not be returned:

- password hashes,
- refresh tokens,
- secrets,
- private keys,
- internal infrastructure details.

---

# Frontend Security

Frontend must not contain secrets.

Frontend must not store:

- JWT secrets,
- refresh token secrets,
- OAuth client secrets,
- database credentials,
- private keys,
- production credentials.

Frontend should:

- use guards for protected routes,
- use interceptors for token handling,
- centralize auth state,
- centralize permission checks,
- avoid duplicated security logic.

Frontend must not be treated as the final security authority.

---

# Backend Security

Backend must enforce security.

Backend should:

- validate authentication,
- enforce permissions,
- validate DTOs,
- sanitize unsafe inputs when applicable,
- avoid direct database access from controllers,
- avoid leaking implementation details,
- log security-relevant events safely.

Backend must not:

- expose secrets,
- expose password hashes,
- bypass guards,
- place security logic only in frontend,
- trust client-provided permissions.

---

# Database Security

Database security rules:

- Do not store plain text passwords.
- Do not store raw refresh tokens.
- Do not commit database dumps with sensitive data.
- Use migrations for schema changes.
- Use constraints to protect integrity.
- Avoid exposing sensitive columns through API responses.
- Use environment variables for connection settings.

---

# Environment Security

Environment configuration must be safe.

Rules:

- Do not commit real secrets.
- Use `.env.example` for documentation.
- Keep production secrets outside the repository.
- Do not hardcode credentials.
- Do not place backend secrets in frontend variables.
- Use different secrets per environment.

Sensitive variables include:

```txt
JWT_SECRET
JWT_REFRESH_SECRET
DB_PASS
MICROSOFT_CLIENT_SECRET
GOOGLE_CLIENT_SECRET
```

---

# Audit Security

Security-sensitive actions should be auditable.

Recommended audit events:

- login success,
- login failure,
- logout,
- token refresh,
- invalid token usage,
- permission denied,
- user status changes,
- role assignment changes,
- permission assignment changes,
- configuration changes.

Audit logs must not include:

- passwords,
- password hashes,
- raw tokens,
- secrets,
- private keys.

Severity usage guidance:

- Use `WARNING` for isolated suspicious authentication events.
- Use `ERROR` for important token/auth failures that are not active attack patterns.
- Reserve `CRITICAL` for high-risk or repeated patterns such as brute force, token replay-like behavior, or repeated locked-account attempts.

---

# Dependency Security

Dependencies should be reviewed before being added.

Rules:

- Avoid unnecessary dependencies.
- Prefer mature and maintained packages.
- Do not add packages for simple logic.
- Review security impact.
- Keep package manager consistent with pnpm.
- Do not generate package-lock.json.

---

# Docker Security

Docker support must remain safe.

Rules:

- Do not hardcode production secrets in Dockerfiles.
- Do not commit real `.env` files.
- Avoid running unnecessary services.
- Keep images minimal when possible.
- Do not expose unnecessary ports.
- Use environment variables for configuration.

Docker is recommended for:

- demos,
- onboarding,
- CI/CD,
- deployment validation.

Docker is not mandatory for daily development.

---

# Logging Security

Logs must not expose sensitive data.

Do not log:

- passwords,
- password hashes,
- access tokens,
- refresh tokens,
- secrets,
- private keys,
- full authorization headers.

Logs may include safe metadata:

- user id,
- event type,
- timestamp,
- route,
- status code,
- sanitized error message.

---

# Error Handling Security

Error responses should be safe.

Rules:

- Do not expose stack traces in production.
- Do not expose database internals.
- Do not expose token validation internals.
- Use safe error messages.
- Use proper HTTP status codes.

Recommended status codes:

- 400 for validation errors,
- 401 for unauthenticated access,
- 403 for unauthorized access,
- 404 for missing resources,
- 409 for conflicts,
- 500 for unexpected errors.

---

# AI-Assisted Security Rules

AI agents must follow these rules:

1. Do not create or commit real secrets.
2. Do not bypass authentication.
3. Do not bypass authorization.
4. Do not place secrets in frontend code.
5. Do not expose password hashes.
6. Do not store raw refresh tokens.
7. Do not remove security checks to fix errors.
8. Do not introduce unnecessary dependencies.
9. Do not create project-specific security exceptions unless a feature specification explicitly requires them.
10. Ask for clarification when a security-sensitive requirement is ambiguous.

---

# Security Review Checklist

Before accepting security-sensitive changes, verify:

- Are secrets protected?
- Are DTOs validated?
- Are private endpoints protected?
- Are permissions enforced in the backend?
- Are frontend checks treated only as UX?
- Are sensitive fields excluded from responses?
- Are audit events considered?
- Are environment variables documented?
- Are dependencies necessary?
- Are project-specific rules kept outside the Kyrae platform?

---

# Out of Scope

The generic security standards must not include domain-specific security rules for:

- POS,
- inventory,
- sales,
- billing,
- warehouse operations,
- logistics,
- customer-specific workflows.

Those rules must be defined by project-specific feature specifications.
