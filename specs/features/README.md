# Feature Specifications

# Overview

This folder contains feature specifications used to guide AI-assisted development.

Every non-trivial feature should have a written specification before implementation.

The goal is to make OpenCode, Codex, Claude Code and other AI agents work with clear requirements instead of guessing architecture or behavior.

---

# Purpose

Feature specifications help to:

* define requirements before coding,
* reduce ambiguity,
* keep frontend and backend aligned,
* define API contracts,
* define data models,
* define acceptance criteria,
* improve AI-generated code quality,
* avoid unnecessary files and duplicated logic,
* document project-specific business rules.

---

# Feature Folder Structure

Each feature should be created inside its own folder.

Recommended structure:

```txt
specs/features/
└── feature-name/
    ├── requirements.md
    ├── acceptance-criteria.md
    ├── api-contract.md
    ├── data-model.md
    ├── tasks.md
    └── notes.md
```

Example:

```txt
specs/features/
└── user-management/
    ├── requirements.md
    ├── acceptance-criteria.md
    ├── api-contract.md
    ├── data-model.md
    ├── tasks.md
    └── notes.md
```

Use kebab-case for feature folders.

---

# Required Files

## requirements.md

Defines what the feature must do.

Should include:

* business purpose,
* functional requirements,
* user flows,
* validation rules,
* permissions required,
* frontend behavior,
* backend behavior,
* out-of-scope items.

## acceptance-criteria.md

Defines how to verify that the feature is complete.

Should include:

* expected behavior,
* edge cases,
* error cases,
* security expectations,
* permission expectations,
* UI expectations when applicable.

## api-contract.md

Defines API behavior when the feature requires backend endpoints.

Should include:

* endpoint paths,
* HTTP methods,
* request DTOs,
* response DTOs,
* authentication requirements,
* permission requirements,
* possible errors.

## data-model.md

Defines database or shared model changes when needed.

Should include:

* entities,
* relationships,
* indexes,
* constraints,
* migrations,
* shared enums,
* shared DTOs or interfaces.

## tasks.md

Breaks the implementation into actionable steps.

Should include:

* backend tasks,
* frontend tasks,
* shared-contracts tasks,
* testing tasks,
* documentation tasks.

## notes.md

Optional file for:

* implementation decisions,
* assumptions,
* open questions,
* risks,
* future improvements.

---

# Feature Specification Template

Use this template when creating a new feature folder.

```md
# Feature: Feature Name

# Overview

Briefly describe the purpose of the feature.

---

# Goals

* Goal 1
* Goal 2
* Goal 3

---

# Out of Scope

* Item that should not be implemented
* Business rule not included yet
* Future improvement not included now

---

# Functional Requirements

## Requirement 1

Description.

## Requirement 2

Description.

---

# Permissions

Required permissions:

* PERMISSION_CODE

Rules:

* Who can access the feature.
* Who can create, update, delete or view data.

---

# Frontend Behavior

Describe:

* pages,
* components,
* forms,
* validation,
* route protection,
* permission-based UI behavior.

---

# Backend Behavior

Describe:

* modules,
* services,
* controllers,
* DTOs,
* guards,
* validations,
* audit requirements.

---

# API Contract

Describe endpoints or reference `api-contract.md`.

---

# Data Model

Describe entities or reference `data-model.md`.

---

# Acceptance Criteria

Describe expected final behavior or reference `acceptance-criteria.md`.

---

# Tasks

Describe implementation tasks or reference `tasks.md`.
```

---

# AI Agent Rules

AI agents must follow these rules:

1. Read the root `AGENTS.md`.
2. Read `docs/architecture/overview.md`.
3. Read `docs/standards/coding-standards.md`.
4. Read the related feature specification before generating code.
5. Do not create project-specific business modules unless the feature specification explicitly requests them.
6. Do not modify shared contracts without checking frontend and backend impact.
7. Do not create unnecessary files.
8. Do not bypass authentication, authorization or DTO validation.
9. Do not duplicate permission checks across frontend and backend.
10. Update documentation when the feature changes architecture, commands or workflows.

---

# IAM-First Feature Rules

For IAM-related features, always consider:

* authentication,
* authorization,
* users,
* roles,
* permissions,
* audit,
* security,
* organizations,
* branches,
* configuration.

When a feature affects access control, it must define:

* required permissions,
* backend guards,
* frontend route guards,
* permission-based UI behavior,
* audit requirements when applicable.

---

# Backend Feature Rules

Backend feature specifications should define:

* module name,
* controller responsibilities,
* service responsibilities,
* DTOs,
* entities,
* migrations,
* guards,
* permissions,
* audit events,
* API documentation requirements.

Backend implementation must follow:

* NestJS modular architecture,
* TypeORM migrations,
* validated DTOs,
* lightweight controllers,
* reusable services,
* Scalar API documentation.

---

# Frontend Feature Rules

Frontend feature specifications should define:

* route structure,
* layout requirements,
* components,
* services,
* guards,
* interceptors when needed,
* state management approach,
* permission-based UI behavior.

Frontend implementation must follow:

* Angular standalone components,
* Signals when appropriate,
* services for API communication,
* Tailwind CSS as primary styling,
* Angular Material when appropriate.

---

# Shared Contracts Rules

If the feature requires shared contracts, define them in the specification.

Allowed shared-contracts content:

* DTOs,
* enums,
* types,
* interfaces,
* API contracts.

Not allowed:

* business logic,
* database access,
* framework-specific implementation,
* secrets,
* environment-specific configuration.

---

# Out of Scope for Kyrae Platform

The Kyrae platform must not include project-specific business modules unless a feature specification explicitly requests them.

Out-of-scope examples:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* production workflows,
* customer-specific operational workflows.

---

# Recommended Workflow

Before asking an AI agent to implement a feature:

1. Create a folder under `specs/features/feature-name`.
2. Define `requirements.md`.
3. Define `acceptance-criteria.md`.
4. Define `api-contract.md` if backend is involved.
5. Define `data-model.md` if database or shared models are involved.
6. Define `tasks.md`.
7. Ask the AI agent to read the relevant specification.
8. Ask for an implementation plan.
9. Review the plan.
10. Generate code.
11. Run tests.
12. Update documentation if needed.

---

# Example Prompt for OpenCode

```txt
Read AGENTS.md, docs/architecture/overview.md, docs/standards/coding-standards.md and specs/features/user-management.

Then propose an implementation plan before generating code.

Do not create project-specific business modules.
Keep the implementation IAM-first, security-first and aligned with the existing architecture.
```
