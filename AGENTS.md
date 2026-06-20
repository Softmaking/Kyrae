# AGENTS.md

## Scope

- This is Kyrae, an IAM-first assistant platform. Keep the IAM/security foundation reusable and avoid unrelated business modules unless a spec explicitly requires them.
- If prose conflicts with executable config or scripts, trust scripts/config.

## Softmaking SDD Entry Point

This repository uses Softmaking SDD as the mandatory development process.

Before performing any task that may change code, documentation, contracts, tests, architecture, or workflows, agents must follow the Softmaking SDD startup sequence:

1. `.sdd/README.md`
2. `.sdd/memory/project-rules.md`
3. `.sdd/memory/architecture-decisions.md`
4. `.sdd/memory/coding-preferences.md`

The README defines workflow selection, agent orchestration and artifact generation rules.

Agents must also read:

- docs/system-context.md
- docs/source-of-truth.md

before selecting a workflow.

Before selecting a workflow, agents must classify the request as one of:

- New Feature
- Bugfix
- Refactor
- Module Generation
- Hotfix

Workflow selection is mandatory.

Available workflows:

- `.sdd/workflows/new-feature.md`
- `.sdd/workflows/bugfix.md`
- `.sdd/workflows/refactor.md`
- `.sdd/workflows/module-generation.md`
- `.sdd/workflows/hotfix.md`

## Feature Artifacts

Feature artifacts stored under `specs/features/` are considered the authoritative source for feature implementation.

See `.sdd/memory/project-rules.md` for source-of-truth precedence rules.

The expected artifact structure is:

specs/features/<feature-name>/

- feature-spec.md
- technical-design.md
- task-plan.md
- test-plan.md
- implementation-report.md

Artifacts must be updated as the feature evolves.

If implementation conflicts with a Feature Spec, the Feature Spec takes precedence until explicitly updated and approved.

The SDD process controls how work is planned, approved, implemented, and validated.

Only the Developer Agent may modify code.

Documentation-only changes may be performed without Developer Agent involvement when no production code, contracts, infrastructure, architecture or tests are affected.

Approval authority is:

- The user
- An explicitly approved Feature Spec
- An explicitly approved Technical Design
- An explicitly approved Task Plan

Agents must not self-approve artifacts.

The following artifacts must exist and be approved before implementation when required by the selected workflow:

- Feature Spec

- Technical Design

- Task Plan

Direct implementation without approved artifacts is prohibited for:

- New features
- Architectural changes
- Cross-application changes
- Database changes
- Security-sensitive changes

Minor fixes, documentation updates, typo corrections and non-functional maintenance tasks may use the Bugfix workflow with lightweight artifacts.

The QA Agent may reject an implementation if it does not satisfy the approved spec, technical design, task plan, tests, or repository standards.

Do not bypass Softmaking SDD unless the user explicitly requests a direct change or the selected Hotfix workflow allows abbreviated artifacts.

When working inside a specific application, agents must load and follow the relevant skills available for that application.

Examples:

- `apps/backend/.agents/skills/`
- `apps/frontend/.agents/skills/`

If no application-specific skills exist, agents must follow Softmaking SDD memory, workflows and repository standards.

For mobile development, agents must follow:

- `.sdd/memory/*`
- `docs/standards/*`
- Mobile architecture and conventions documented in the repository.

Technology-specific skills supplement Softmaking SDD and do not replace it.

## Agent Execution Order

For New Feature workflows:

Orchestrator
→ Product Owner
→ Business Analyst
→ Architect
→ Tech Lead
→ Developer
→ QA

Agents may not skip mandatory predecessors.

For Bugfix workflows:

Orchestrator
→ Tech Lead
→ Developer
→ QA

For Refactor workflows:

Orchestrator
→ Architect
→ Tech Lead
→ Developer
→ QA

For Module Generation workflows:

Orchestrator
→ Product Owner
→ Business Analyst
→ Architect
→ Tech Lead
→ Developer
→ QA

For Hotfix workflows:

Orchestrator
→ Tech Lead
→ Developer
→ QA

Hotfix workflows may use abbreviated artifacts when production stability or security is at risk.

## Fast Context For Agents

- Before exploring the full repository, read `docs/system-context.md` and `docs/source-of-truth.md`.
- Then read only feature-specific docs/files related to the current task.
- Do not scan the entire repository unless the task requires broad analysis.

## Repository Shape

- pnpm workspace: `apps/*` and `packages/*` from `pnpm-workspace.yaml`.
- Frontend app: `apps/frontend`
- Backend app: `apps/backend`
- Mobile app (beta): `apps/mobile`
- Principal assistant agent: `OpenClaw` (documented target capability; no runtime module is implemented yet)
- Voice interaction is a documented target capability; do not implement voice features without an approved feature spec.
- Shared contracts package: `packages/shared-contracts`; use it as the source of truth for DTOs/types shared by frontend and backend.
- Do not modify `.opencode/` files unless explicitly requested.

## Entrypoints

- Frontend bootstrap: `apps/frontend/src/main.ts`
- Frontend providers/router wiring: `apps/frontend/src/app/app.config.ts`
- Backend bootstrap: `apps/backend/src/main.ts`
- Backend root module: `apps/backend/src/app.module.ts`
- Mobile bootstrap: `apps/mobile/lib/main.dart`
- Backend API docs: Scalar at `/scalar`
- Backend health: `/health`

## Commands

- Install with pnpm only. Root `preinstall` rejects non-pnpm installs.
- Frontend dev: `pnpm frontend:dev`
- Frontend build: `pnpm frontend:build`
- Frontend unit tests: `pnpm frontend:test`
- Frontend e2e: `pnpm frontend:e2e`
- Backend dev: `pnpm backend:dev`
- Backend build: `pnpm backend:build`
- Backend lint: `pnpm backend:lint`
- Backend unit tests: `pnpm backend:test`
- Backend e2e: `pnpm backend:test:e2e`
- Mobile analyze: run `flutter analyze` from `apps/mobile`
- Mobile tests: run `flutter test` from `apps/mobile`
- Postgres only: `pnpm docker:db`
- Full Docker stack: `pnpm docker:up`
- Stop Docker stack: `pnpm docker:down`

## Backend Data

- Backend uses PostgreSQL + TypeORM with `synchronize: false`; schema changes need migrations.
- Migration commands live in `apps/backend/package.json`: `migration:generate`, `migration:run`, `migration:revert`.
- Local DB defaults are in `apps/backend/.env.example` and `docker-compose.yml`.
- Seed command: `pnpm --dir apps/backend seed`
- Default seed admin: `admin@softmaking.cl` / `ChangeMe123!`

## Frontend Rules

- Angular standalone components only.
- Components must be complete file-based components: use separate `.component.ts`, `.component.html`, and `.component.css` files. Do not use large inline templates or inline styles for application components.
- Frontend features must follow this structure: `pages/`, `components/`, `services/`, `models/`, and `<feature>.routes.ts` when the feature has routes.
- Prefer Signals for local state.
- Keep HTTP/API calls in services; use `core` for global clients/config and `features/<feature>/services` for feature-specific API services. Do not call APIs directly from components.
- Keep auth/permission logic centralized; do not duplicate permission checks in UI components.
- Tailwind CSS is primary styling. Preserve existing visual language when editing current UI.

## Backend Rules

- Keep controllers lightweight; business logic belongs in services.
- Validate DTOs; do not use entities as request DTOs.
- Do not access repositories/database directly from controllers.
- Authorization is role/permission based; keep permission logic centralized and auditable.
- Security-sensitive actions should create/reuse audit events.

## Contracts And Boundaries

- Frontend and backend must stay decoupled.
- Put shared DTOs/types in `packages/shared-contracts` only when both apps need them.
- `packages/shared-contracts` must not contain framework code, business logic, database access, secrets, or environment config.
- Before changing cross-app API shapes, inspect `packages/shared-contracts/src/index.ts` and the relevant contract file.
- When a change affects both frontend and backend, update shared contracts first, then backend DTOs/responses, then frontend models/services.
- All shared contracts live under `packages/shared-contracts/src/`; audit contracts are in `packages/shared-contracts/src/audit/audit.contracts.ts`.
- For contract rules and agent reading order, see `docs/standards/shared-contracts.md`.

## Documentation

- Update documentation when adding or modifying features, contracts, or architecture.
- Architecture docs must list all current features.
- Shared contracts docs must reflect all existing contract folders.
- Keep `docs/system-context.md` updated when adding/removing modules, features, env vars, auth behavior, permissions, or major architecture decisions.
- Keep `docs/source-of-truth.md` updated when changing where canonical information lives.

## Validation

- Frontend changes: run at least `pnpm frontend:build`; add `pnpm frontend:test` or `pnpm frontend:e2e` when behavior changes.
- Backend changes: run `pnpm backend:lint` plus relevant tests; e2e/database work may require Postgres via `pnpm docker:db`.
- Mobile changes: run `flutter analyze` plus `flutter test` from `apps/mobile`.
- Keep verification focused to touched areas; avoid unrelated refactors.

## Rule Priority

When instructions conflict, apply this order:

1. Explicit user request
2. Security and safety requirements
3. Approved Feature Spec
4. Approved Technical Design
5. Approved Task Plan
6. `AGENTS.md`
7. `.sdd/memory/project-rules.md`
8. `.sdd/workflows/*`
9. `.sdd/agents/*`
10. `docs/source-of-truth.md`
11. `docs/standards/*`
12. Existing code conventions

If a conflict cannot be resolved, stop and report the conflict before modifying files.
