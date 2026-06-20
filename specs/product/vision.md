# Product Vision

# Overview

Kyrae is an IAM-first assistant platform designed to provide a secure foundation for web, backend and mobile assistant experiences.

Kyrae is intended for:

* assistant-driven web applications,
* secure backend APIs,
* mobile assistant experiences,
* IAM-oriented systems,
* future voice interaction flows.

---

# Vision

Create a reusable assistant platform foundation capable of:

* standardizing development,
* improving scalability,
* reducing technical debt,
* accelerating delivery,
* supporting `OpenClaw` as the documented principal assistant agent,
* preparing future voice interaction,
* supporting long-term maintainability,
* providing a robust IAM and security base.

---

# Main Goals

* Standardize frontend, backend and mobile architecture.
* Maintain scalable monorepo organization.
* Enable reusable IAM and assistant-platform modules.
* Provide a robust IAM foundation.
* Improve onboarding experience.
* Support AI-assisted development workflows.
* Support future repository separation.
* Keep unrelated business modules outside Kyrae unless a specification explicitly requires them.

---

# Target Systems

Kyrae should support:

* assistant web applications,
* mobile assistant applications,
* authentication and IAM platforms,
* modular backend APIs,
* modular frontend applications,
* OpenClaw as a principal assistant agent,
* future voice input and output,
* AI-assisted development workflows.

---

# Core Enterprise Scope

Kyrae must focus on a secure assistant platform foundation.

Core scope:

* Authentication
* Authorization
* Identity and Access Management
* Users
* Roles
* Permissions
* Audit
* Security
* Organizations
* Branches
* Configuration

Business-specific modules must be defined by approved specifications and must not be added as part of the Kyrae baseline.

---

# Core Principles

* Assistant-platform-first architecture.
* Security-first architecture.
* IAM-first foundation.
* AI-first workflows.
* Modular design.
* Scalable structure.
* Reusable implementations.
* Docker-ready infrastructure.
* Optional local development.

---

# AI Vision

The repository is optimized for:

* OpenCode,
* Codex,
* Claude Code,
* Warp Agents,
* multi-agent workflows,
* spec-driven development.

AI agents should operate using:

* architecture documentation,
* coding standards,
* feature specifications,
* repository rules.

---

# Future Goals

Future evolution may include:

* OpenClaw runtime services,
* voice capture and speech-to-text,
* text-to-speech,
* microservices,
* advanced CI/CD,
* observability,
* multi-tenant support,
* cloud-native deployments,
* AI-assisted generators,
* external identity provider integrations,
* advanced IAM workflows.

---

# Out of Scope

Kyrae must not include unrelated domain-specific modules such as:

* POS,
* inventory,
* sales,
* billing,
* warehouse operations,
* logistics,
* project-specific business workflows.

Those modules must be created only when an approved Kyrae feature specification requires them.

---

# Current Stage

Current status:

* Enterprise monorepo initialized.
* Frontend and backend configured.
* pnpm workspace configured.
* TypeORM migrations and database seed configured.
* JWT auth, IAM CRUD foundation (users/roles/permissions) and Scalar docs implemented.
* Frontend login flow and Playwright e2e implemented.
* IAM-first assistant-platform vision defined.
* OpenClaw and voice interaction documented as target capabilities only.
* AI-assisted workflow preparation in progress.
