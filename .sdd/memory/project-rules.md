# Project Rules

## Language Standard

Mandatory:

- Technical documentation, SDD artifacts, agents, workflows, templates and architecture documents must be written in English.
- All future SDD-generated artifacts must default to English unless explicitly requested otherwise.

Source: user-approved Softmaking SDD requirement.

Exceptions:

- Business requirements may contain Spanish examples when necessary.
- User stories may be written in Spanish if the target users are Spanish-speaking.
- Domain-specific names may remain in Spanish when they represent real business concepts.

## Repository Scope

Mandatory:

- The repository is Kyrae, an IAM-first assistant platform.
- Keep the IAM/security foundation reusable and do not add unrelated business modules unless a specification explicitly requires them.
- `OpenClaw` is the documented principal assistant agent target, and voice interaction is a documented target capability.
- Do not implement OpenClaw runtime behavior or voice features without approved feature artifacts.
- Trust executable config and scripts over prose when conflicts exist.

Sources: `AGENTS.md`, `docs/source-of-truth.md`.

## Source Of Truth Hierarchy

Mandatory:

For feature implementation, the following precedence order applies:

1. Approved Feature Spec
2. Approved Technical Design
3. Approved Task Plan
4. AGENTS.md
5. Repository standards
6. Existing implementation

Implementation must follow the highest-priority approved artifact available.

If existing code conflicts with an approved artifact, the approved artifact takes precedence until formally updated and approved.

Sources:

- AGENTS.md
- specs/features/*
- .sdd/workflows/*

## Package Manager

Mandatory:

- Use pnpm only.
- Do not generate `package-lock.json`.

Sources: `AGENTS.md`, root `package.json`, `pnpm-workspace.yaml`.

## Shared Contracts

Mandatory:

- Cross-app DTOs, shared types, queries, commands, and enums must live in `packages/shared-contracts/src/*`.
- Shared contracts must not contain framework code, database access, business logic, secrets, or environment config.
- For cross-app API shape changes, update shared contracts first, then backend, frontend, mobile if applicable, and docs.

Sources: `AGENTS.md`, `docs/source-of-truth.md`, `docs/standards/shared-contracts.md`.

## Backend Rules

Mandatory:

- Keep NestJS controllers lightweight.
- Put business logic in services.
- Validate request DTOs.
- Do not use entities as request DTOs.
- Schema changes require TypeORM migrations.
- Authorization logic must remain centralized and auditable.

Sources: `AGENTS.md`, `docs/system-context.md`, `apps/backend/src/*`.

## Frontend Rules

Mandatory:

- Use Angular standalone components.
- Application components must use separate `.component.ts`, `.component.html`, and `.component.css` files.
- Keep API calls in services.
- Keep auth and permission logic centralized.
- Use Tailwind CSS as primary styling.

Sources: `AGENTS.md`, `apps/frontend/AGENTS.md`, `apps/frontend/src/app/*`.

## Mobile Rules

Mandatory:

- Mobile beta scope is auth, home, and profile.
- Mobile must consume backend APIs without bypassing auth or authorization rules.

Sources: `docs/system-context.md`, `apps/mobile/AGENTS.md`, `apps/mobile/lib/*`.

## Validation Rules

Mandatory:

- Frontend changes require at least `pnpm frontend:build`.
- Backend changes require `pnpm backend:lint` and relevant tests.
- Mobile changes require `flutter analyze` and `flutter test` from `apps/mobile`.

Sources: `AGENTS.md`, root `package.json`, `apps/mobile/AGENTS.md`.

## Git Rules

Mandatory:

- Use Conventional Commits.
- Commit messages must be written in Spanish.
- Do not commit secrets.

Sources: `docs/standards/git-workflow.md`.

## Pending / Not Evidenced

- No real multi-agent runtime is implemented.
- No SDD workflow runner is evidenced.
- No root mobile validation scripts are evidenced.
- No automatic audit retention is evidenced.
