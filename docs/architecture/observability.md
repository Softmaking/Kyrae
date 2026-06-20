# Observability Architecture

# Overview

This document defines the observability architecture for the Kyrae.

Kyrae is IAM-first, security-first and Docker-ready but not Docker-dependent. Observability must help teams understand application health, errors and security-relevant behavior without exposing sensitive data.

Observability must remain generic and reusable. Project-specific monitoring rules must be defined per project.

---

# Observability Goals

Observability should help to:

* detect application failures,
* understand backend and frontend behavior,
* support debugging,
* support deployment validation,
* support security investigations,
* support IAM auditability,
* provide health and readiness visibility,
* avoid exposing secrets or sensitive data.

---

# Observability Scope

The Kyrae platform may include:

* health checks,
* structured logs,
* request logs,
* error logs,
* audit events,
* basic metrics,
* readiness checks,
* deployment validation logs.

The Kyrae platform should not include:

* project-specific dashboards,
* business KPIs,
* domain-specific analytics,
* customer-specific monitoring rules,
* production credentials for monitoring tools.

---

# Health Checks

Health checks are the minimum required observability feature.

Recommended endpoint:

```txt
GET /health
```

Recommended checks:

* API availability,
* database connectivity,
* application readiness.

Current baseline in this repository:

- `GET /health` returns liveness status and timestamp,
- `GET /health/ready` validates database readiness,
- readiness returns `503` when database is not available.

Health checks must not expose:

* secrets,
* database credentials,
* internal infrastructure details,
* private environment values.

---

# Readiness Checks

Readiness checks indicate whether the application is ready to receive traffic.

Possible checks:

* backend started successfully,
* database connection available,
* required environment variables loaded,
* migrations status when applicable.

Readiness checks are useful for:

* Docker,
* CI/CD,
* deployment validation,
* orchestration platforms.

---

# Logging Strategy

Logs should be structured and safe.

Logs may include:

* timestamp,
* request id,
* correlation id,
* route,
* method,
* status code,
* duration,
* user id when safe,
* sanitized error message.

Logs must not include:

* passwords,
* password hashes,
* access tokens,
* refresh tokens,
* JWT secrets,
* OAuth secrets,
* private keys,
* full authorization headers,
* database passwords.

---

# Request Logging

Backend request logs may include:

```txt
method
path
statusCode
duration
requestId
userId when available
```

Request logs should not include raw request bodies by default.

Request body logging may expose sensitive data and must be avoided unless explicitly sanitized.

---

# Error Logging

Error logs should help debug issues without exposing sensitive data.

Error logs may include:

* error type,
* sanitized message,
* stack trace in development,
* request id,
* affected route,
* timestamp.

Production logs must avoid exposing:

* stack traces to clients,
* SQL internals,
* token validation internals,
* secrets,
* sensitive payloads.

---

# Correlation IDs

Correlation IDs help trace requests across services.

Recommended header:

```txt
X-Correlation-Id
```

If no correlation id is provided, the backend may generate one.

Correlation IDs should be included in logs and responses when appropriate.

Current baseline in this repository:

- backend accepts `X-Correlation-Id` from incoming requests,
- backend generates one when missing,
- backend returns `X-Correlation-Id` in response headers,
- request logs include correlation id, status code and duration,
- failed requests are logged with sanitized error names without request bodies or token values.

---

# Audit vs Logs

Audit and logs are different concerns.

## Logs

Used for debugging and operational visibility.

## Audit

Used for security and traceability.

Security-sensitive actions should use audit events, not only logs.

Examples:

* login success,
* login failure,
* permission denied,
* role assignment,
* permission assignment,
* user deactivation.

---

# Metrics

Metrics are optional in the initial Kyrae baseline.

Future metrics may include:

* request count,
* error count,
* response time,
* login failures,
* permission denied count,
* database connectivity status,
* memory usage,
* CPU usage.

Metrics tooling should be added only when required by a project.

---

# Frontend Observability

Frontend observability may include:

* error boundary/logging strategy,
* failed API request tracking,
* route navigation errors,
* auth session errors,
* user-facing error messages.

Frontend must not log:

* tokens,
* secrets,
* passwords,
* sensitive personal data,
* private backend responses.

---

# Backend Observability

Backend observability may include:

* request logs,
* error logs,
* health checks,
* readiness checks,
* audit events,
* performance timings,
* database connectivity checks.

Backend should centralize logging behavior instead of scattering logging logic across modules.

---

# Docker Observability

Docker workflows may use:

```bash
pnpm docker:logs
```

Expected behavior:

```bash
docker compose logs -f
```

Docker logs should be useful for:

* demos,
* onboarding,
* debugging,
* deployment validation.

Docker logs must not expose secrets.

---

# CI/CD Observability

CI/CD should expose logs for:

* dependency installation,
* lint,
* tests,
* build,
* Docker build,
* migration validation,
* deployment.

CI/CD logs must not expose:

* secrets,
* environment values,
* tokens,
* private keys.

---

# Alerting

Alerting is optional in the Kyrae platform.

Future alerting may include:

* high error rate,
* repeated failed login attempts,
* database unavailable,
* API unavailable,
* unusual permission denied spikes,
* deployment failure.

Alerting rules should be defined per project.

---

# Observability Tools

The Kyrae platform does not require a specific observability tool.

Possible future tools:

* application logs,
* Docker logs,
* cloud logs,
* Sentry,
* Grafana,
* Prometheus,
* OpenTelemetry,
* uptime monitoring.

Tooling should be selected per project.

---

# Security Rules

Observability must not compromise security.

Rules:

* do not log secrets,
* do not log raw tokens,
* do not log passwords,
* sanitize errors,
* protect audit endpoints,
* avoid exposing internals through health endpoints,
* keep monitoring credentials outside the repository.

---

# AI Agent Rules

AI agents must follow these rules:

1. Do not log secrets or tokens.
2. Do not expose internal infrastructure details through health checks.
3. Keep observability generic.
4. Do not add project-specific dashboards unless explicitly requested.
5. Prefer centralized logging patterns.
6. Add audit events for security-sensitive actions.
7. Do not confuse logs with audit.
8. Use pnpm commands.
9. Do not add monitoring dependencies unless justified.
10. Update documentation when observability behavior changes.

---

# Out of Scope

The generic observability architecture must not include:

* business dashboards,
* POS metrics,
* inventory metrics,
* sales KPIs,
* billing metrics,
* logistics monitoring,
* customer-specific analytics,
* production monitoring credentials.

Those must be defined by project-specific documentation.
