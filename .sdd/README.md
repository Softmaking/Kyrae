# Softmaking SDD

Softmaking SDD is the internal Spec Driven Development framework for Softmaking projects. It defines how ideas become requirements, technical designs, approved tasks, implementation reports, and validation evidence.

## What It Is

Softmaking SDD is a reusable development operating model for this repository and future Softmaking projects. It is designed to work with OpenCode and future AI agents while remaining independent from any AI provider.

## Mandatory

- Use repository evidence before making decisions. Sources include `AGENTS.md`, `docs/system-context.md`, `docs/source-of-truth.md`, `docs/standards/*`, `docs/architecture/*`, `specs/features/README.md`, `apps/*`, `packages/shared-contracts/src/*`, `docker-compose.yml`, and workspace configuration.
- Do not invent architecture, modules, permissions, commands, or capabilities.
- Mark non-evidenced assumptions as `Pending / Not evidenced`.
- Keep productive code unchanged unless an approved implementation task is assigned to the Developer agent.
- Technical documentation, SDD artifacts, agents, workflows, templates and architecture documents must be written in English.

## Recommended Flow

1. Use `workflows/new-feature.md`, `workflows/bugfix.md`, `workflows/refactor.md`, or `workflows/module-generation.md`.
2. The Orchestrator selects the workflow and required agents.
3. Product Owner and Business Analyst clarify requirements and rules.
4. Architect creates the technical design.
5. Tech Lead converts the design into implementation tasks.
6. Developer implements only approved tasks.
7. QA validates and may reject the implementation.
8. Reports and memory are updated when relevant.

## When To Use Each Workflow

- `new-feature.md`: when adding user-visible or system behavior.
- `bugfix.md`: when fixing an evidenced defect or regression.
- `refactor.md`: when changing structure without intended behavior change.
- `module-generation.md`: when generating a complete reusable module across backend, frontend, mobile, contracts, database, and docs as applicable.

## Relationship Between Areas

- `agents/`: role definitions for multi-agent collaboration.
- `workflows/`: execution paths and approval gates.
- `templates/`: reusable document shapes for specs, designs, plans, tests, and reports.
- `memory/`: persistent project rules, architectural decisions, and coding preferences.
- `reports/`: evidence-based audit, integration, and roadmap documents.

## Recommended Context Before Any SDD Work

Mandatory sources inferred from `AGENTS.md` and `docs/source-of-truth.md`:

- `AGENTS.md`
- `docs/system-context.md`
- `docs/source-of-truth.md`

Recommended sources depending on scope:

- `docs/standards/*`
- `docs/architecture/*`
- `specs/features/README.md`
- `packages/shared-contracts/src/*`
- relevant `apps/backend`, `apps/frontend`, or `apps/mobile` files
