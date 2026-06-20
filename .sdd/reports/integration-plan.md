# Softmaking SDD Integration Plan

## Goal

Integrate Softmaking SDD with the existing repository instructions, documentation, specifications, and OpenCode configuration without modifying productive code.

## Current Evidence

Mandatory:

- `AGENTS.md` defines repository-wide rules and reading order.
- `opencode.json` currently references selected docs for agent context.
- `docs/system-context.md` and `docs/source-of-truth.md` are mandatory context documents.
- `specs/features/README.md` defines a feature-spec workflow.

## Recommended Integration

Recommended:

- Add `.sdd/README.md` as the entry point for SDD work.
- Keep `AGENTS.md` as the operational rule source and `.sdd/memory/project-rules.md` as the SDD memory mirror.
- Use `docs/source-of-truth.md` to resolve conflicts between docs and executable code.
- Use `specs/features/<feature-name>/` for feature-specific artifacts and `.sdd/templates/*` as reusable templates.
- Use `.sdd/reports/project-audit.md` to onboard future agents.

## Suggested Reading Order

Mandatory:

1. `AGENTS.md`
2. `docs/system-context.md`
3. `docs/source-of-truth.md`
4. `.sdd/README.md`
5. `.sdd/memory/project-rules.md`
6. Workflow-specific file from `.sdd/workflows/`
7. Relevant feature spec from `specs/features/` when available

Recommended:

- `docs/standards/shared-contracts.md` before cross-app API changes.
- `docs/standards/git-workflow.md` before committing.
- relevant `docs/architecture/*` file before architectural changes.

## Integration With OpenCode

Recommended:

- Extend OpenCode context to include `.sdd/README.md`, `.sdd/memory/project-rules.md`, and the active workflow.
- Keep OpenCode provider-independent by storing process and agent behavior in Markdown artifacts.
- Do not duplicate productive-code instructions inside provider-specific config when `.sdd` can hold reusable rules.

Pending / Not evidenced:

- No automated OpenCode workflow runner is evidenced.
- No explicit multi-agent runtime is evidenced.

## Integration With Docs

Recommended:

- Keep `docs/*` as project documentation and `.sdd/*` as development-process documentation.
- When project rules change, update both the authoritative project doc and `.sdd/memory/*`.
- When a workflow reveals an architecture decision, add it to `.sdd/memory/architecture-decisions.md` and the relevant `docs/architecture/*` file if it affects the system.

## Integration With Specs

Recommended:

- Use `.sdd/templates/feature-spec.md` to bootstrap `specs/features/<feature>/requirements.md` or equivalent.
- Use `.sdd/templates/task-plan.md` to create implementation task lists.
- Use `.sdd/templates/test-plan.md` before QA validation.

## Risks

- Reading orders differ between `AGENTS.md`, standards docs, and specs docs.
- SDD memory can become stale unless updated after decisions.
- The repository has strong documentation, so duplicate SDD rules should cite sources and not replace source-of-truth docs.
