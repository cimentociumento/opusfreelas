# Plan 01-04 Summary — Clerk middleware, RPC authz, session revoke

**Status:** Complete  
**Date:** 2026-04-27

## Delivered

- `apps/api/src/middleware/clerk.ts` with Clerk JWT verification using `authenticateRequest` + `authorizedParties` from `CLERK_AUTHORIZED_PARTIES`.
- `POST /rpc` envelope (`{ procedure, input }`) via `apps/api/src/rpc/router.ts`.
- Identity procedures in `apps/api/src/rpc/identity.ts`:
  - `identity.getProfile`
  - `identity.updateRoles`
  - `identity.providerOnlyPing` (403 when `is_provider=false`).
- Session revoke endpoint `POST /sessions/revoke-others` backed by Clerk session list/revoke in `apps/api/src/sessions/revoke.ts`.
- Unit tests in `apps/api/src/authz/roles.test.ts` covering 401/403, provider pass path (200), and revoke-others behavior.
- API env template in `apps/api/.env.example`.

## Verification

- `pnpm --filter @amauc/api test` passed.
- 401 without Bearer token verified.
- 403 for provider-only RPC with provider flag false verified.
- Session revoke path verifies list + revoke call flow.

## Notes

- Profile role state is read/upserted in Supabase (`profiles`) using service role key on server side.