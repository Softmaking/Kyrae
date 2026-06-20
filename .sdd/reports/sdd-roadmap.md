# Softmaking SDD Roadmap

## Version 1: Basic SDD

Mandatory:

- Establish `.sdd/` structure.
- Define agents, workflows, templates, memory, and reports.
- Base every rule on repository evidence.
- Keep artifacts provider-independent.

Status: Implemented in `.sdd/` version `1.0.0`.

## Version 2: Persistent Memory

Recommended:

- Add a formal process for updating `.sdd/memory/*` after each approved feature or architecture decision.
- Add memory review gates to workflows.
- Track changed decisions with date, source, and impact.

Pending / Not evidenced:

- No external persistent memory store is evidenced.

## Version 3: Multi-Agent System

Recommended:

- Add machine-readable handoff metadata between agents.
- Define approval state transitions.
- Introduce agent execution logs in `.sdd/reports/`.

Pending / Not evidenced:

- No real multi-agent runtime is evidenced.
- No agent orchestration API is evidenced.

## Version 4: Full Automation

Recommended:

- Add workflow runners for spec validation, task generation, testing, and reporting.
- Add automatic evidence collection from code, docs, and test outputs.
- Add CI gates for SDD artifact completeness.

Pending / Not evidenced:

- No SDD CI automation is evidenced.
- No automatic spec-to-code traceability tooling is evidenced.
