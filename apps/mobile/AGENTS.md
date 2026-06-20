# Mobile AGENTS.md

## Context

This is the Flutter mobile client (official beta) of Kyrae.

Kyrae is an assistant platform whose principal target agent is `OpenClaw`. Voice interaction is documented as a target capability but is not implemented in the current mobile beta.

It consumes the same backend APIs as the Angular frontend but is limited to a subset of features.

Before working on mobile code, read `docs/system-context.md` and `docs/source-of-truth.md` for full project context.

---

## Official Mobile Stack

- Flutter
- Dart
- Riverpod (state management)
- GoRouter (routing)
- Dio (HTTP client)
- flutter_secure_storage (token storage)
- Clean Architecture (data/domain/presentation layers)

---

## Beta Scope

- auth (login, logout, me, refresh)
- home (dashboard)
- profile

Out of scope for mobile beta:

- users
- roles
- permissions
- audit
- organizations
- branches
- configuration

---

## Architecture

- Use Clean Architecture layers: data, domain, presentation.
- Keep API calls in data sources; business logic in use cases.
- Keep state management in Riverpod providers/notifiers.
- Do not bypass backend auth/authorization rules.
- Do not duplicate business logic from the backend.

---

## Important Notes

- Refresh token flow is implemented in `AuthInterceptor`. Expired tokens are automatically refreshed and failed requests are retried.
- Modules outside beta scope must not be implemented unless explicitly requested.

---

## Testing And Validation

- Run `flutter analyze` from `apps/mobile` for static analysis.
- Run `flutter test` from `apps/mobile` for unit/widget tests.
- Mobile tests live under `apps/mobile/test/**/*.dart`.
