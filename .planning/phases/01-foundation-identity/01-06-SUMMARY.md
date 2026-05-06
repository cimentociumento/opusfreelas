# Plan 01-06 Summary — CI, observability baseline, Firebase placeholder

**Status:** Complete  
**Date:** 2026-04-27

## Delivered

- CI workflow `.github/workflows/ci.yml`:
  - Node 22 + pnpm 9
  - `pnpm install --frozen-lockfile`
  - API vitest execution (`pnpm --filter @amauc/api vitest run`).
- API observability baseline:
  - `apps/api/src/observability.ts` adds `@hono/otel` HTTP instrumentation middleware and `pino` structured request logs.
  - `apps/api/src/index.ts` initializes observability on startup.
- Runbook `docs/runbooks/observability.md` with env vars and no-PII logging guidance.
- Firebase placeholder added to `apps/mobile/app.json` (`expo.extra.firebaseProjectId` + note that Clerk remains sole IdP for V1).

## Verification

- `pnpm --filter @amauc/api test` passed.
- `pnpm test` at monorepo root passed.
- Acceptance grep targets for CI and Firebase placeholder matched.

## Notes

- Observability baseline is intentionally lightweight for phase 1 and can later be extended with OTLP exporter wiring.