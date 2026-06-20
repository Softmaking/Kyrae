# Frontend Application

## Overview

Frontend application built with Angular using standalone components, Signals, Tailwind CSS and Angular Material.

This application is responsible for:

* user interfaces,
* authentication flows,
* authorization flows,
* user management screens,
* role and permission management screens,
* enterprise layouts,
* responsive layouts,
* API integration.

The frontend must remain generic, reusable and independent from project-specific business domains.

---

# Main Stack

* Angular
* TypeScript
* Standalone Components
* Signals
* Tailwind CSS
* Angular Material
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

Run frontend:

```bash
pnpm frontend:dev
```

Build frontend:

```bash
pnpm frontend:build
```

Run tests:

```bash
pnpm frontend:test
```

Run e2e tests:

```bash
pnpm frontend:e2e
```

---

# Architecture Principles

* Feature-based architecture.
* Reusable UI components.
* Responsive-first design.
* Separation between UI and business logic.
* HTTP communication through services only.
* Authentication and authorization logic must be centralized.
* Business-specific frontend features must be isolated per project.

---

# Suggested Structure

```txt
src/
├── app/
│   ├── core/
│   │   ├── config/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── layout/
│   ├── shared/
│   ├── features/
│   ├── app.config.ts
│   └── app.routes.ts
│
├── assets/
└── environments/
```

---

# Core Frontend Areas

The frontend foundation should support:

* auth,
* users,
* roles,
* permissions,
* layouts,
* guards,
* interceptors,
* shared components,
* reusable UI patterns.

Business-specific frontend features must be added per project and must not be part of the generic archetype foundation.

---

# Authentication and Authorization

Authentication and authorization must be centralized.

The frontend should support:

* protected routes,
* guest-only routes,
* permission-based UI rendering,
* role-based navigation when needed,
* token handling through interceptors,
* remote logout with backend refresh-token revocation,
* reusable auth state,
* reusable permission checks.

Permission logic must not be duplicated across components.

---

# State Management

State management should follow these rules:

* Prefer Signals for local state.
* Use services for shared state.
* Avoid unnecessary RxJS complexity.
* Keep authentication state centralized.
* Keep permission state centralized.
* Keep state predictable and easy to test.

---

# Styling

Tailwind CSS is the primary styling system.

Angular Material may be used when appropriate for:

* dialogs,
* menus,
* tables,
* forms,
* date pickers,
* enterprise UI controls.

Styling rules:

* Maintain responsive layouts.
* Prefer reusable layout components.
* Avoid duplicated design patterns.
* Keep UI consistent across modules.

---

# API Integration

API communication must happen through services.

Rules:

* Do not call APIs directly from components.
* Keep API services reusable.
* Use interceptors for token injection.
* Use interceptors for error handling when appropriate.
* Keep backend implementation details hidden from UI components.

---

# Testing

Testing strategy:

* unit tests,
* e2e tests.

Testing priority:

1. Authentication flows.
2. Authorization and permission checks.
3. Route guards.
4. Core services.
5. Shared components.
6. Critical UI flows.

---

# Restrictions

* Do not place business logic inside components.
* Do not call APIs directly from components.
* Do not duplicate permission checks across multiple components.
* Do not create domain-specific modules such as POS, inventory, sales, billing or logistics unless explicitly requested.
* Do not tightly couple UI components to backend implementation details.
* Do not introduce unnecessary dependencies.
* Do not use npm commands.
* Do not generate package-lock.json.
