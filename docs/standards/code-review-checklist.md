# Code Review Checklist

# Overview

This document defines the code review checklist for the Kyrae.

Kyrae is IAM-first, security-first and optimized for AI-assisted development. Code review must verify that changes remain generic, reusable, secure and aligned with the documented architecture.

This checklist applies to:

* manual code reviews,
* AI-generated code reviews,
* pull requests,
* feature reviews,
* refactors,
* documentation changes.

---

# Review Goals

Code review must help to:

* protect architecture consistency,
* prevent security regressions,
* avoid duplicated logic,
* keep IAM modules reusable,
* keep frontend and backend decoupled,
* avoid unnecessary dependencies,
* validate documentation alignment,
* improve maintainability.

---

# General Review Checklist

Before approving a change, verify:

* The change follows `AGENTS.md`.
* The change follows `docs/architecture/overview.md`.
* The change follows `docs/standards/coding-standards.md`.
* The change follows `docs/standards/security-standards.md`.
* The change uses pnpm.
* The change does not generate `package-lock.json`.
* The change does not introduce domain-specific logic unless a feature spec requires it.
* The change does not add unnecessary files.
* The change does not duplicate existing logic.
* The change updates documentation when behavior or architecture changes.

---

# Architecture Review

Verify:

* Frontend and backend remain decoupled.
* Shared contracts are used only for DTOs, enums, types and interfaces.
* Business logic is not placed in shared contracts.
* IAM modules remain reusable.
* Business-specific modules are not added to the Kyrae platform unless specified.
* New modules follow feature-based organization.
* Architecture changes are documented.

---

# Security Review

Verify:

* No secrets are committed.
* No passwords are stored in plain text.
* No raw refresh tokens are stored.
* No JWT secrets are exposed.
* Sensitive fields are not returned in API responses.
* Authentication is enforced where required.
* Authorization is enforced in the backend.
* Frontend permission checks are not treated as final security.
* DTO validation is present.
* Error responses do not expose internal details.
* Audit events are considered for security-sensitive actions.

---

# Authentication Review

Verify:

* Login validates user status.
* Inactive users cannot authenticate.
* Locked users cannot authenticate.
* JWT payload does not contain sensitive data.
* Refresh token handling is secure.
* External providers do not bypass local IAM rules.
* Authentication logic is not placed in controllers.
* Authentication behavior is tested or clearly validated.

---

# Authorization Review

Verify:

* Access control uses roles and permissions.
* Backend endpoints use guards where required.
* Permission decorators are used consistently.
* Permission logic is centralized.
* Permission checks are not duplicated across controllers, services or components.
* Frontend guards are used for protected routes.
* Backend remains the final authorization authority.
* Permission changes are reflected in shared contracts when needed.

---

# Backend Review

Verify:

* Controllers are lightweight.
* Business logic is inside services.
* DTOs are validated.
* Entities are not used directly as request DTOs.
* Database access is not performed directly from controllers.
* TypeORM migrations are included for schema changes.
* API documentation is updated with Scalar when endpoints change.
* Tests are added or updated for behavior changes.

---

# Frontend Review

Verify:

* Components are standalone.
* Components remain lightweight.
* Business logic is not placed inside components.
* API calls are made through services.
* Auth and permission state are centralized.
* Signals are used when appropriate.
* RxJS complexity is not introduced unnecessarily.
* UI is responsive.
* Permission-based UI behavior does not replace backend authorization.
* Tests are added or updated for critical UI behavior.

---

# Shared Contracts Review

Verify:

* Shared contracts contain only DTOs, enums, types or interfaces.
* No business logic is added.
* No TypeORM entities are added.
* No Angular components are added.
* No NestJS services are added.
* No secrets or environment values are added.
* Exports are updated through `index.ts`.
* Frontend and backend impact is reviewed.

---

# Database Review

Verify:

* Schema changes use TypeORM migrations.
* `synchronize` is not required for production.
* Relationships are explicit.
* Indexes and constraints are intentional.
* Sensitive fields are protected.
* No production data is committed.
* No project-specific tables are added without a feature spec.
* Seeds do not include real credentials or customer data.

---

# API Review

Verify:

* Endpoints follow REST conventions.
* Routes use kebab-case.
* DTOs are explicit.
* Responses do not expose sensitive fields.
* Pagination is considered for list endpoints.
* Filters are validated.
* Error handling is consistent.
* Authentication and permission requirements are documented.
* Scalar documentation is updated when needed.

---

# Testing Review

Verify:

* Unit tests are added or updated when logic changes.
* e2e tests are added or updated for critical flows.
* IAM and security-sensitive flows are prioritized.
* Tests do not use production data.
* Tests do not contain real secrets.
* Tests are not removed to make code pass.
* Untested behavior is documented when tests are not added.

---

# Documentation Review

Verify documentation is updated when changes affect:

* architecture,
* commands,
* package manager behavior,
* environment variables,
* authentication,
* authorization,
* database schema,
* Docker,
* deployment,
* shared contracts,
* testing strategy.

Documentation must not include project-specific business examples unless the document belongs to a concrete project.

---

# Dependency Review

Before accepting a new dependency, verify:

* The dependency is necessary.
* Existing tools cannot solve the problem.
* The dependency is actively maintained.
* The dependency does not introduce unnecessary complexity.
* The dependency does not conflict with pnpm workspace.
* The dependency does not generate `package-lock.json`.

---

# AI-Generated Code Review

When reviewing AI-generated code, verify:

* The agent followed the reading order.
* The implementation matches the feature specification.
* The implementation did not create unnecessary files.
* The implementation did not invent business-specific modules.
* The implementation did not bypass security rules.
* The implementation did not use npm.
* The implementation did not generate `package-lock.json`.
* The implementation did not create duplicated logic.
* The implementation is understandable and maintainable.

---

# Pull Request Checklist

A pull request should include:

* Summary of changes.
* Affected apps/packages.
* Related specs.
* Testing performed.
* Security impact.
* Migration notes when applicable.
* Screenshots when UI changes are included.
* Documentation updates when needed.

---

# Approval Criteria

A change can be approved when:

* It follows architecture rules.
* It follows security rules.
* It follows package manager rules.
* It does not introduce unnecessary complexity.
* It does not include domain-specific logic without specification.
* It has appropriate tests or clear validation.
* It updates documentation when needed.

---

# Rejection Criteria

A change should be rejected when:

* It bypasses authentication or authorization.
* It exposes secrets or sensitive data.
* It places business logic in frontend components.
* It places business logic in backend controllers.
* It modifies database schema without migration.
* It creates project-specific modules without a feature specification.
* It introduces `package-lock.json`.
* It uses npm commands.
* It duplicates existing logic unnecessarily.
* It ignores documented standards.

---

# Out of Scope

The generic code review checklist must not include domain-specific review rules for:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* customer-specific workflows.

Those review rules must be defined by project-specific documentation.

---

# AI Agent Rules

AI agents performing code review must:

1. Check architecture consistency first.
2. Check security impact.
3. Check IAM and authorization rules.
4. Check frontend/backend separation.
5. Check DTO validation and API contracts.
6. Check duplicated logic.
7. Check package manager compliance.
8. Check documentation impact.
9. Suggest minimal and actionable improvements.
10. Avoid broad rewrites unless explicitly requested.
