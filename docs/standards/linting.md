# Linting and formatting configuration

## Frontend

Frontend lint: `pnpm --dir apps/frontend lint`
Frontend format: `pnpm --dir apps/frontend format`

## Backend

Backend lint: `pnpm --dir apps/backend lint`
Backend format: `pnpm --dir apps/backend format`

## Root

Format all: `pnpm prettier --write "apps/**/*.{ts,html,css}"`

## Pre-commit Hooks

- **commit-msg**: Valida mensajes en español (commitlint)
- **pre-commit**: Ejecuta lint completo de frontend y backend.
- `lint-staged` está instalado como dependencia de tooling, pero el hook actual no lo ejecuta.
