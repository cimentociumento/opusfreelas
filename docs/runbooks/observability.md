# Observability runbook (Phase 01-06)

## Objective

Define baseline logging and tracing for API flows in V1 without storing PII.

## API instrumentation

- `apps/api/src/observability.ts` registers:
  - `@hono/otel` middleware for traces.
  - `pino` structured logger for request metadata.
- `apps/api/src/index.ts` calls `initObservability(app)` during bootstrap.

## Environment variables

- `OTEL_SERVICE_NAME=amauc-api`
- `OTEL_EXPORTER_OTLP_ENDPOINT=` (optional; set when collector is available)
- `LOG_LEVEL=info`

## Logging policy

- Log method, path, status, duration.
- Do **not** log phone numbers, OTP codes, bearer tokens, or full request bodies.

## Validation

Run in API package:

```bash
pnpm vitest run
```