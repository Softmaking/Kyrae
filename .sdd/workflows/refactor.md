# Refactor Workflow

## Trigger

Use when changing structure, readability, maintainability, or internal design without intended behavior change.

## Agents Involved

- Orchestrator
- Architect
- Tech Lead
- Developer
- QA

## Flow

1. Orchestrator confirms this is not a feature or bugfix.
2. Architect defines boundaries and expected non-behavioral outcome.
3. Tech Lead creates task plan and regression validation.
4. Approval gate before implementation.
5. Developer implements only approved refactor tasks.
6. QA validates behavior preservation.

## Expected Artifacts

- Technical design or refactor rationale.
- Task plan.
- Test plan.
- Implementation report.

## Approval Gates

Mandatory:

- Architecture approval required before refactoring.
- QA approval required to confirm no intended behavior change.

## Stop Criteria

- Refactor changes behavior without approved feature/bugfix workflow.
- Test coverage is insufficient for affected behavior.
- Scope grows beyond approved files or modules.
