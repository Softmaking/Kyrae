# New Feature Workflow

## Trigger

Use when adding new user-visible or system behavior.

## Agents Involved

- Orchestrator
- Product Owner
- Business Analyst
- Architect
- Tech Lead
- Developer
- QA

## Flow

1. Orchestrator selects this workflow.
2. Product Owner creates or refines the feature specification.
3. Business Analyst identifies business rules, permissions, audit impact, and mobile scope.
4. Architect creates technical design.
5. Tech Lead creates task plan and validation plan.
6. Approval gate before implementation.
7. Developer implements approved tasks only.
8. QA validates and may approve or reject.
9. Implementation report is finalized.

## Expected Artifacts

- `feature-spec.md`
- `technical-design.md`
- `task-plan.md`
- `test-plan.md`
- `implementation-report.md`

## Approval Gates

Mandatory:

- Requirements approved before architecture.
- Technical design approved before tasks.
- Task plan approved before Developer modifies code.
- QA approval required before completion.

## Stop Criteria

- Missing requirement approval.
- Shared-contract impact unresolved.
- Database migration impact unresolved.
- Security or authorization impact unclear.
- Evidence is missing and cannot be marked safely as pending.
