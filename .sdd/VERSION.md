# Softmaking SDD Version

## Version

1.0.0

## Date

2026-06-04

## Scope

Mandatory:

- Initial SDD framework for the current Kyrae repository.
- Evidence-based project audit.
- Persistent memory files for rules, architecture decisions, and coding preferences.
- Agent definitions for Orchestrator, Product Owner, Business Analyst, Architect, Tech Lead, Developer, and QA.
- Reusable workflows for new features, bugfixes, refactors, and module generation.
- Reusable templates for feature specs, technical designs, task plans, test plans, and implementation reports.
- Integration plan for `AGENTS.md`, `opencode.json`, `docs/`, and `specs/`.
- Roadmap for future SDD maturity.

Recommended:

- Use this version as the baseline for future Softmaking projects.
- Keep `.sdd/memory/*` synchronized with repository standards and decisions.

## Known Pending Items

Pending / Not evidenced:

- No real multi-agent runtime is implemented in this repository.
- No automated SDD workflow runner is evidenced.
- No persistent external memory store is evidenced.
- No root scripts for mobile `flutter analyze` and `flutter test` are evidenced.
- Commitlint is referenced by hooks, but no commitlint config file was evidenced in the audit.
- Advanced modal accessibility behavior such as focus trap and ARIA labelling is not evidenced.
