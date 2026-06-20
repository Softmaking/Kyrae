# Coding Preferences

## Language And Documentation

Mandatory:

- Technical documentation, SDD artifacts, agents, workflows, templates and architecture documents must be written in English.

Source: user-approved Softmaking SDD requirement.

## General Engineering

Recommended:

- Prefer minimal correct changes.
- Avoid unrelated refactors.
- Preserve existing architecture and visual language.
- Keep changes focused on the touched area.

Source: `AGENTS.md`.

## Backend Preferences

Mandatory:

- Use DTOs for inputs.
- Keep controllers lightweight.
- Put business logic in services.
- Use migrations for schema changes.

Sources: `AGENTS.md`, `docs/standards/backend-standards.md`.

Recommended:

- Audit security-sensitive actions.
- Keep permission logic centralized.

Sources: `AGENTS.md`, `docs/system-context.md`.

## Frontend Preferences

Mandatory:

- Use Angular standalone components.
- Keep component templates and styles in separate files.
- Keep API calls in services.

Sources: `AGENTS.md`, `apps/frontend/AGENTS.md`.

Recommended:

- Prefer Signals for local state.
- Use shared components for repeated admin UI patterns.
- Use Tailwind CSS tokens and existing brand palette.

Sources: `apps/frontend/AGENTS.md`, `apps/frontend/src/styles.css`.

## Mobile Preferences

Recommended:

- Follow the existing Flutter clean architecture pattern for auth.
- Use Riverpod providers and GoRouter routing patterns already present.

Sources: `apps/mobile/lib/app/*`, `apps/mobile/lib/features/auth/*`.

## Pending / Not Evidenced

- No preference for a mocking library in mobile tests is evidenced.
- No global frontend state management library beyond Angular Signals and services is evidenced.
