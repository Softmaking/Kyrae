# Configuration Architecture

# Overview

This document defines the generic configuration module for the Kyrae.

The configuration module provides a reusable key-value store for non-secret application settings.

Kyrae remains IAM-first and security-first. Configuration data must remain generic and must not include project-specific business workflows.

---

# Scope

The module supports:

- CRUD operations over configuration keys,
- JSON-compatible values,
- optional categorization,
- audit logging for configuration changes,
- permission-protected access.

The module does not replace environment variables for secrets.

---

# Data Model

Table:

```txt
app_config
```

Fields:

```txt
id (uuid)
key (unique varchar)
value (jsonb)
description (nullable varchar)
is_active (boolean)
category (nullable varchar)
createdAt
updatedAt
```

`value` supports:

- string,
- number,
- boolean,
- JSON object.

---

# API Endpoints

Base route:

```txt
/configuration
```

Endpoints:

```txt
POST   /configuration
GET    /configuration
GET    /configuration/:id
GET    /configuration/key/:key
PATCH  /configuration/:id
DELETE /configuration/:id
```

List endpoint query parameters:

```txt
category
isActive
search
page
pageSize
```

---

# Permissions

Required permissions:

```txt
CONFIGURATION_READ
CONFIGURATION_CREATE
CONFIGURATION_UPDATE
CONFIGURATION_DELETE
```

---

# Audit

Configuration mutations generate audit events using:

```txt
action: CONFIGURATION_UPDATED
resourceType: CONFIGURATION
```

Audit metadata includes the operation (`created`, `updated`, `deleted`) and affected key when applicable.

---

# Security Rules

- Do not store secrets in `app_config`.
- Use environment variables for credentials, keys and tokens.
- Keep configuration keys generic and reusable.
- Restrict write operations using configuration permissions.

---

# Shared Contracts

Shared contracts are defined in:

```txt
packages/shared-contracts/src/configuration/configuration.contracts.ts
```

Contracts include:

- `AppConfigDto`,
- `CreateAppConfigCommand`,
- `UpdateAppConfigCommand`,
- `ListAppConfigsQuery`,
- `ListAppConfigsResponse`.

---

# Frontend Integration

The Angular frontend exposes a configuration management feature under:

```txt
apps/frontend/src/app/features/configuration
```

Current frontend route:

```txt
/configuration
```

Route protection:

- `authGuard` for authenticated access,
- `permissionGuard` with `CONFIGURATION_READ` for visibility and access control.

The frontend service consumes shared contracts and uses the backend pagination/query API (`page`, `pageSize`, `search`, `category`, `isActive`).
