# Bugfix Workflow

## Trigger

Use when fixing an evidenced defect, regression, failing test, or incorrect behavior.

## Agents Involved

- Orchestrator
- Business Analyst when functional impact exists
- Architect when architecture or contracts may change
- Tech Lead
- Developer
- QA

## Flow

1. Orchestrator confirms bug evidence.
2. Business Analyst documents expected behavior if functional rules are involved.
3. Architect reviews whether a design change is needed.
4. Tech Lead creates focused fix tasks.
5. Approval gate before implementation.
6. Developer implements only the approved fix.
7. QA validates regression coverage.

## Expected Artifacts

- Bug summary.
- Task plan.
- Test plan.
- Implementation report.

## Approval Gates

Mandatory:

- Bug evidence approved before implementation.
- Scope approved before Developer modifies code.
- QA can reject if the fix lacks regression validation.

## Stop Criteria

- Bug cannot be reproduced or evidenced.
- Fix requires architectural change without Architect approval.
- Fix expands scope into a feature.
