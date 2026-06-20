# Frontend Standards

# Overview

This document defines frontend development standards for the Kyrae.

The frontend uses Angular with standalone components, Signals, Tailwind CSS and Angular Material.

Kyrae is IAM-first and security-first. Frontend code must remain generic, reusable and independent from project-specific business domains unless a feature specification explicitly requires otherwise.

---

# Frontend Goals

Frontend standards must help to:

- keep UI code maintainable,
- keep authentication centralized,
- keep authorization reusable,
- avoid duplicated logic,
- avoid business logic inside components,
- improve AI-assisted development quality,
- support enterprise layouts,
- support reusable IAM screens,
- keep frontend and backend decoupled.

---

# Official Stack

The official frontend stack is:

- Angular,
- TypeScript,
- Standalone Components,
- Signals,
- Tailwind CSS,
- Angular Material,
- pnpm Workspace.

---

# Architecture Principles

Frontend architecture must follow these principles:

- use standalone components,
- use feature-based organization,
- keep components lightweight,
- keep business logic out of components,
- centralize API communication in services,
- centralize authentication state,
- centralize authorization and permission checks,
- keep UI reusable and responsive,
- avoid project-specific features in the Kyrae platform.

---

# Suggested Structure

Recommended structure:

```txt
src/
├── app/
│   ├── core/
│   ├── shared/
│   ├── features/
│   └── app.config.ts
│
├── assets/
└── environments/
```

---

# Core Folder

The `core` folder should contain application-wide logic.

Examples:

```txt
core/
├── config/
├── guards/
├── interceptors/
└── layout/
```

Allowed:

- singleton services,
- auth state,
- permission services,
- interceptors,
- global guards,
- app configuration.

Not allowed:

- feature-specific components,
- project-specific business logic,
- duplicated UI components.

---

# Shared Folder

The `shared` folder should contain reusable frontend elements.

Examples:

```txt
shared/
├── components/
├── directives/
├── pipes/
├── models/
└── utils/
```

Allowed:

- reusable UI components,
- generic directives,
- generic pipes,
- reusable frontend models,
- utility functions.

Not allowed:

- API-specific services,
- business-specific feature logic,
- IAM state ownership.

---

# Layout Folder

The `layout` folder should contain reusable layouts.

Examples:

```txt
layout/
├── dashboard-layout/
└── components/
    ├── app-navbar/
    └── app-sidenav/
```

Layout components should remain generic and reusable.

They must not contain project-specific business rules.

---

# Features Folder

The `features` folder contains feature-specific UI.

Core generic features may include:

```txt
features/
├── auth/
├── users/
├── roles/
├── permissions/
├── audit/
├── organizations/
├── branches/
└── configuration/
```

Project-specific features must only be added when a feature specification explicitly requires them.

---

# Component Standards

Components must be:

- standalone,
- lightweight,
- focused on presentation and interaction,
- easy to test,
- reusable when appropriate.

Components must not:

- contain business logic,
- call APIs directly,
- duplicate permission checks,
- own global auth state,
- directly access local storage for auth when a service exists.

---

# Service Standards

Services should contain reusable logic.

Use services for:

- API communication,
- auth state,
- session management,
- permission checks,
- shared state,
- feature logic,
- mapping API responses when needed.

Services must not:

- directly manipulate unrelated UI,
- duplicate backend authorization logic,
- contain project-specific logic unless the service belongs to a project-specific feature.

---

# Signals Standards

Prefer Signals for local and shared frontend state when appropriate.

Use Signals for:

- auth state,
- current user state,
- permissions state,
- loading state,
- selected organization,
- selected branch,
- UI state.

Avoid:

- unnecessary RxJS complexity,
- duplicated state,
- unclear mutable state,
- spreading auth state across unrelated components.

---

# RxJS Standards

RxJS may be used when appropriate for:

- HTTP streams,
- event streams,
- complex async flows,
- interoperability with Angular APIs.

Avoid RxJS when simple Signals are enough.

Do not introduce complex RxJS chains for simple state.

---

# HTTP Standards

API communication must happen through services.

Rules:

- do not call APIs directly from components,
- keep API methods typed,
- use shared contracts when applicable,
- handle errors consistently,
- keep backend implementation details hidden from components.

Example:

```txt
users.service.ts
roles.service.ts
permissions.service.ts
auth.service.ts
```

---

# Interceptor Standards

Use interceptors for cross-cutting HTTP behavior.

Current interceptors:

- auth token injection (injection + 401 refresh),

Future interceptors (not yet implemented):

- error handling,
- loading state,
- correlation id.

Interceptors must not contain project-specific business logic.

---

# Guard Standards

Use guards for route protection.

Recommended guards (current implementation):

- auth guard,
- guest guard,
- permission guard.

Guards should rely on centralized auth and permission services.

Do not duplicate permission logic inside each route component.

---

# Authentication Standards

Authentication logic must be centralized.

Frontend authentication should support:

- login,
- logout,
- session state,
- current user,
- token handling through interceptors,
- unauthenticated redirects,
- guest-only redirects.

Frontend must not:

- store secrets,
- validate passwords directly,
- decide final authorization alone,
- bypass backend authentication.

---

# Authorization Standards

Authorization logic must be centralized.

Frontend authorization may control:

- routes,
- navigation,
- buttons,
- forms,
- UI actions,
- component visibility.

Frontend authorization is only UX support.

Backend authorization is mandatory and authoritative.

Do not hardcode permissions across many components.

---

# Permission-Based UI

Permission-based UI should use reusable helpers, services or directives.

Examples:

```txt
hasPermission('USERS_READ')
hasAnyPermission(['USERS_UPDATE', 'USERS_DELETE'])
```

Avoid:

```txt
user.permissions.includes('USERS_READ')
```

repeated across multiple components.

---

# Styling Standards

Tailwind CSS is the primary styling system.

Use Tailwind for:

- layout,
- spacing,
- typography,
- responsive behavior,
- utility styling.

Angular Material may be used for:

- dialogs,
- menus,
- tables,
- forms,
- date pickers,
- enterprise controls.

Avoid:

- duplicated custom CSS,
- inconsistent spacing,
- hardcoded styles repeated across components,
- unnecessary global styles.

---

# Responsive Design

All enterprise UI should be responsive.

Consider:

- desktop,
- tablet,
- mobile,
- collapsible navigation,
- readable tables,
- accessible forms,
- consistent spacing.

---

# Accessibility Standards

Frontend should consider accessibility.

Recommended practices:

- semantic HTML,
- labels for inputs,
- keyboard navigation,
- visible focus states,
- accessible dialogs,
- meaningful button text,
- sufficient contrast.

---

# Error Handling

Frontend errors should be handled consistently.

Use:

- error interceptor when appropriate,
- user-friendly messages,
- safe fallback UI,
- controlled redirects for auth errors.

Do not expose:

- internal backend errors,
- stack traces,
- sensitive data,
- raw token errors.

---

# Environment Rules

Frontend environment variables must be treated as public.

Allowed:

```txt
apiBaseUrl (via Angular environments: environment.ts / environment.production.ts)
  - development: http://localhost:3000
  - production: /api (proxied by Nginx)
```

Not allowed:

```txt
JWT_SECRET
DB_PASS
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_SECRET
```

Frontend must not contain secrets.

---

# Testing Standards

Frontend testing strategy:

- unit tests,
- e2e tests.

Prioritize tests for:

- auth flows,
- route guards,
- permission checks,
- core services,
- shared components,
- critical UI flows.

Recommended commands:

```bash
pnpm frontend:test
pnpm frontend:e2e
```

---

# Package Manager Rules

Use pnpm only.

Allowed:

```bash
pnpm frontend:dev
pnpm frontend:build
pnpm frontend:test
pnpm frontend:e2e
```

Forbidden:

```bash
npm install
npm run
npx
```

Do not generate `package-lock.json`.

---

# AI Agent Rules

AI agents must follow these rules:

1. Use standalone components.
2. Keep components lightweight.
3. Do not place business logic inside components.
4. Use services for API communication.
5. Centralize authentication state.
6. Centralize permission checks.
7. Use Signals when appropriate.
8. Do not create project-specific features unless a feature specification explicitly requires them.
9. Use pnpm commands only.
10. Update documentation when frontend architecture changes.

---

# Out of Scope

The generic frontend standards must not include domain-specific frontend rules for:

- POS,
- inventory,
- sales,
- billing,
- warehouse operations,
- logistics,
- customer-specific workflows.

Those rules must be defined by project-specific documentation.
