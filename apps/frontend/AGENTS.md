# Frontend AGENTS.md

# Context

This application is the Angular frontend of Kyrae.

It must support the Kyrae assistant platform with a reusable IAM and security foundation.

The frontend must keep shared IAM/admin UI reusable and avoid unrelated business features unless a feature specification explicitly requires them.

Before working on frontend code, read `docs/system-context.md` and `docs/source-of-truth.md` for full project context.

---

# Official Frontend Stack

- Angular
- Standalone Components
- Signals
- Tailwind CSS
- Angular Material
- TypeScript
- pnpm Workspace

---

# Frontend Rules

## Architecture

- Use feature-based architecture.
- Keep core logic centralized.
- Keep shared UI components reusable.
- Keep business-specific features isolated.
- Keep documentation updated when adding or modifying features, services, or components.
- Do not create project-specific business features unless explicitly requested by a feature specification.

## Components

- Use standalone components only.
- Keep components lightweight.
- Avoid business logic inside components.
- Prefer reusable components.
- Keep templates readable and maintainable.
- Use the shared `app-table` component for list views with pagination, search, and toolbar.
- `app-table` supports two pagination modes: `page` (default, with page numbers) and `cursor` (with "Cargar más" button). Use `paginationMode="cursor"` for append-only or high-growth datasets like audit events. See Audit component for a reference implementation.

## State Management

- Prefer Signals for local state.
- Use services for shared state when required.
- Avoid unnecessary RxJS complexity.
- Do not duplicate authentication or permission state across components.
- Keep state predictable and easy to test.

## Services

- Use services for API communication.
- Avoid direct HTTP usage inside components.
- Keep global API configuration in `core`; keep feature-specific API services under `features/<feature>/services`.
- Keep reusable frontend logic inside services.

## Styling

- Use Tailwind CSS as primary styling system.
- Use Angular Material when appropriate.
- Maintain responsive layouts.
- Avoid duplicated design patterns.
- Prefer reusable layout and UI patterns.
- Use design color tokens defined in `src/styles.css` (`brand-*` palette) for new UI work.
- Avoid hardcoded hex colors in components when a token exists.
- Do not introduce a new color palette without explicit request.

## Routing

- Use guards for protected routes.
- Use guards for guest-only routes when needed.
- Use permission-based route protection when applicable.
- Keep route definitions clear and modular.

## Guards and Interceptors

Use guards for:

- authenticated routes,
- guest-only routes,
- permission-based routes,
- role-based routes when needed.

Use interceptors for:

- auth token injection,
- error handling,
- loading indicators,
- request metadata.

---

# Core Frontend Areas

The frontend core scope includes:

- auth,
- users,
- roles,
- permissions,
- organizations,
- branches,
- audit,
- dashboard,
- public,
- layout,
- guards,
- interceptors,
- shared components,
- reusable UI patterns.

These areas are part of the Kyrae assistant platform foundation.

Do not create project-specific business features unless explicitly requested by a feature specification.

---

# Authentication and Authorization

- Centralize authentication logic.
- Centralize authorization logic.
- Use guards for protected routes.
- Use interceptors for token handling.
- Do not duplicate permission logic across components.
- Do not hardcode permissions inside UI components.
- Permission checks should be reusable and easy to audit.

---

# Package Manager Rules

- Use pnpm only.
- Do not use npm install.
- Do not generate package-lock.json.
- Use pnpm commands from the repository root.
- Commit pnpm-lock.yaml.
- Do not delete internal tooling lock files unless explicitly required.

---

# Testing Rules

Frontend testing strategy:

- unit tests,
- e2e tests.

Testing priority:

1. Authentication flows.
2. Authorization and permission checks.
3. Route guards.
4. Core services.
5. Shared components.
6. Critical UI flows.

---

# Restrictions

- Do not place business logic inside components.
- Do not call APIs directly from components.
- Do not duplicate permission checks across multiple components.
- Do not create domain-specific modules such as POS, inventory, sales, billing or logistics unless explicitly requested.
- Do not tightly couple UI components to backend implementation details.
- Do not introduce unnecessary dependencies.
- Do not use npm commands.
- Do not generate package-lock.json.

---

# Priority

Priority order for frontend implementations:

1. Security
2. Architecture consistency
3. Maintainability
4. Reusability
5. Scalability
6. Clean UI
7. Performance
8. Development speed
