# Backend Application

## Overview

Backend API built with NestJS, TypeORM and PostgreSQL.

This application is responsible for:

* authentication,
* authorization,
* identity and access management,
* users,
* roles,
* permissions,
* audit and security,
* data access,
* validations,
* enterprise workflows,
* API exposure.

The backend must remain generic, reusable and independent from project-specific business domains.

---

# Main Stack

* NestJS
* TypeScript
* PostgreSQL
* TypeORM
* Scalar
* JWT Authentication
* pnpm Workspace

---

# Package Manager

This application uses pnpm workspace.

Rules:

* Do not use npm install.
* Use pnpm from repository root.
* Do not generate package-lock.json.
* Commit pnpm-lock.yaml from the repository root.

---

# Development Commands

Install dependencies from root:

```bash
pnpm install
```

Run backend:

```bash
pnpm backend:dev
```

API Documentation (Scalar):

```bash
http://localhost:3000/scalar
```

Build backend:

```bash
pnpm backend:build
```

Run tests:

```bash
pnpm backend:test
```

Run e2e tests:

```bash
pnpm backend:test:e2e
```

Run migrations:

```bash
pnpm --dir apps/backend migration:run
```

Seed admin and base permissions:

```bash
pnpm --dir apps/backend seed
```

---

# Architecture Principles

* Modular architecture.
* Lightweight controllers.
* Business logic inside services.
* Validated DTOs.
* Scalable structure.
* TypeORM migrations for database changes.
* IAM modules independent from business-specific modules.
* Security and authorization must be explicit.

---

# Suggested Structure

```txt
src/
├── audit/
├── auth/
├── branches/
├── common/
├── configuration/
├── database/
├── health/
├── organizations/
├── permissions/
├── roles/
├── security/
├── users/
├── app.module.ts
└── main.ts
```

---

# Core Backend Modules

The backend foundation should support:

* auth,
* users,
* roles,
* permissions,
* audit,
* security,
* organizations,
* branches,
* configuration,
* health.

Business-specific backend modules must be added per project and must not be part of the generic archetype foundation.

---

# Authentication

Initial authentication is based on:

* email and password,
* JWT access token,
* refresh token strategy.

The architecture must remain prepared for:

* Microsoft Entra ID,
* Google Identity,
* external identity providers,
* future MFA,
* future SSO.

Authentication providers must remain modular and optional.

---

# Authorization

Authorization must be based on roles and permissions.

The backend should support:

* user-role relationships,
* role-permission relationships,
* permission-based guards,
* reusable decorators,
* centralized permission checks.

Authorization logic must remain reusable and must not be duplicated across controllers or services.

---

# API Documentation

Scalar is the official API documentation tool.

API documentation should include:

* endpoint purpose,
* request DTOs,
* response DTOs,
* authentication requirements,
* permission requirements when applicable.

---

# Database

The backend uses PostgreSQL with TypeORM.

Database rules:

* Use migrations for schema changes.
* Do not modify schema without a migration.
* Keep entity relationships explicit.
* Do not access the database directly from controllers.
* Keep database configuration environment-based.

---

# Environment Files

Recommended backend environment files:

```txt
.env.example
.env.development
.env.production
```

Rules:

* `.env.example` documents required variables.
* `.env.development` is used for local development.
* `.env.production` is used as production reference.
* Real secrets must not be committed.

---

# Testing

Testing strategy:

* unit tests,
* e2e tests.

Testing priority:

1. Authentication flows.
2. Authorization and permission checks.
3. User management logic.
4. Role and permission assignment logic.
5. Core services.
6. API endpoints.

---

# Restrictions

* Do not place business logic in controllers.
* Do not bypass DTO validation.
* Do not access the database directly from controllers.
* Do not create domain-specific modules such as POS, inventory, sales, billing or logistics unless explicitly requested.
* Do not tightly couple IAM modules to project-specific business logic.
* Do not introduce unnecessary dependencies.
* Do not use npm commands.
* Do not generate package-lock.json.
