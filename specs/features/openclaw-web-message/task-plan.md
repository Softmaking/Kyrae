# Task Plan: OpenClaw Web Message

## Documentation Tasks

- [x] Create roadmap checklist.
- [x] Create feature spec.
- [x] Create technical design.
- [x] Create task plan.
- [x] Create test plan.
- [x] Update implementation report.

## Shared Contract Tasks

- [x] Add OpenClaw assistant contracts.
- [x] Export contracts from shared-contracts index.

## Backend Tasks

- [x] Add conversation entity.
- [x] Add message entity.
- [x] Add TypeORM migration.
- [x] Register entities in TypeORM config and data source.
- [x] Add OpenClaw module and service.
- [x] Add messages module, DTO, controller, and service.
- [x] Register messages module in app module.
- [x] Add `ASSISTANT_CHAT_USE` permission to seed.
- [x] Add OpenClaw environment variables to `.env.example`.
- [x] Add basic audit events for message processing.

## Frontend Tasks

- [x] Add assistant frontend model.
- [x] Add assistant API service.
- [x] Add assistant page component.
- [x] Add assistant route.
- [x] Register assistant route in app routes.
- [x] Add assistant menu entry gated by `ASSISTANT_CHAT_USE`.

## Validation Tasks

- [x] Run backend lint.
- [x] Run backend tests.
- [x] Run frontend build.
- [x] Run frontend tests.
