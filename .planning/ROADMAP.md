# Roadmap: AMAUC Freelas

**Generated:** 2026-04-09
**Source:** `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/research/SUMMARY.md`
**Granularity:** fine
**Coverage:** 15/15 v1 requirements mapped

## Phases Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Identity | Establish multiplatform baseline with secure auth and roles | AUTH-01, AUTH-02, AUTH-03 | 4 |
| 2 | Demand Publishing | Enable contractor-first demand lifecycle scoped to AMAUC | DEMD-01, DEMD-02, DEMD-03 | 4 |
| 3 | Local Discovery | Deliver useful search/filter experience by service and geography | DISC-01, DISC-02, DISC-03 | 4 |
| 4 | Provider Trust Base | Implement basic verification and portfolio proof for providers | TRST-01, TRST-02 | 4 |
| 5 | Connection & Reputation | Support off-platform closing with traceable status and reviews | CONN-01, CONN-02, TRST-03 | 4 |
| 6 | Subscription Monetization | Launch provider subscription with clear visibility benefits | REVN-01 | 3 |
| 7 | Hardening & Readiness | Raise quality, observability, and compliance readiness for scale | (cross-cutting) | 3 |

## Phase Details

### Phase 1: Foundation & Identity

**Goal:** Establish secure access and role separation for contractor-first flows.

**Requirements:** AUTH-01, AUTH-02, AUTH-03

**Plans:** 6 plans

Plans:
- [ ] `01-01-PLAN.md` — pnpm/Turborepo monorepo, `@amauc/shared` role contracts (Zod), minimal Hono API + Vitest smoke (**AUTH-03**)
- [ ] `01-02-PLAN.md` — Expo SDK 55 + expo-router shell for mobile (**AUTH-01**)
- [ ] `01-03-PLAN.md` — Supabase CLI, `profiles` + RLS migration, runbook, **[BLOCKING] `supabase db push`** (`scripts/verify-supabase-push-evidence.mjs`) (**AUTH-03**)
- [ ] `01-04-PLAN.md` — Clerk JWT middleware, RPC identity, session revoke, role unit tests (**AUTH-03**)
- [ ] `01-05-PLAN.md` — `@clerk/clerk-expo` phone OTP, SecureStore + Supabase client (**AUTH-01**, **AUTH-02**)
- [ ] `01-06-PLAN.md` — GitHub Actions CI, pino + `@hono/otel`, Firebase `expo.extra` stub (D-09, D-10; no extra REQ-ID — AUTH-02 proven in 01-05)

**Success Criteria:**
1. User can authenticate via OTP phone flow and access account.
2. Session persists between app restarts and browser refresh where applicable.
3. Role-based authorization prevents provider-only/contractor-only action leaks.
4. Core app/API baseline is deployable in a repeatable way.

### Phase 2: Demand Publishing

**Goal:** Let contractors publish and manage local service demands with proper visibility scope.

**Requirements:** DEMD-01, DEMD-02, DEMD-03

**Success Criteria:**
1. Contractor can create demand with required fields (service type, description, location, urgency).
2. Contractor can edit and close their own demand without affecting others.
3. Demand visibility respects municipality/radius constraints at read time.
4. Validation prevents malformed demand data from being published.

### Phase 3: Local Discovery

**Goal:** Make matching viable by allowing search/filter based on rural/manual service context.

**Requirements:** DISC-01, DISC-02, DISC-03

**Success Criteria:**
1. Contractor can search providers by service type with relevant results.
2. Contractor can filter by municipality and radius to narrow local matches.
3. Empty states explain lack of local supply and suggest next action.
4. Discovery endpoints/pages remain responsive under realistic list sizes.

### Phase 4: Provider Trust Base

**Goal:** Increase buyer confidence with visible proof and basic verification.

**Requirements:** TRST-01, TRST-02

**Success Criteria:**
1. Provider can complete basic verification workflow and receive trust status.
2. Verified badge state is visible consistently in provider profile.
3. Provider can upload and manage service portfolio evidence.
4. Portfolio and trust indicators are visible in discovery/profile contexts.

### Phase 5: Connection & Reputation

**Goal:** Support practical off-platform closure while preserving minimal audit trail and reputation.

**Requirements:** CONN-01, CONN-02, TRST-03

**Success Criteria:**
1. Contractor can reveal/share contact details for off-platform negotiation.
2. Demand status can transition between open, in-contact, and completed.
3. Review flow is available after completion status with basic anti-abuse guardrails.
4. Reputation signals become visible for future contractor decisions.

### Phase 6: Subscription Monetization

**Goal:** Enable provider subscription tied to clear product benefits.

**Requirements:** REVN-01

**Success Criteria:**
1. Provider can subscribe through configured payment flow.
2. Subscription status drives defined visibility/benefit rules in product.
3. Billing state changes are handled reliably and reflected in account access.

### Phase 7: Hardening & Readiness

**Goal:** Improve reliability and operational readiness before broader rollout.

**Requirements:** Cross-cutting stabilization for existing v1 scope

**Success Criteria:**
1. Critical user journeys have automated test coverage and pass reliably.
2. Observability (logs/metrics/alerts) is in place for key marketplace flows.
3. Baseline privacy/compliance checklist is documented for production readiness.

## Notes

- Roadmap prioritizes contractor value first, then trust, then monetization.
- Off-platform closure remains explicit in V1 strategy.
- Expansion beyond AMAUC is intentionally deferred until local liquidity metrics are healthy.

---
*Last updated: 2026-04-09 after roadmap initialization*
