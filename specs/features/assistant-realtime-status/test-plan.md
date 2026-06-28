# Test Plan: Assistant Realtime Status

## Backend

- Verify build and lint.
- Verify gateway compiles and events are type-compatible.
- Verify existing backend tests keep passing.

## Web

- Verify frontend builds.
- Manually verify realtime connection, session join, processing state, and completed response.

## Mobile

- Verify `flutter analyze` and `flutter test` pass.
- Manually verify session join, realtime status, completed response, and fallback polling.
