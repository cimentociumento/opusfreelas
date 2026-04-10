# Phase 1: Foundation & Identity - Research

**Researched:** 2026-04-09  
**Domain:** Multi-provider identity (Clerk + Supabase + Firebase), Expo mobile, Hono API, JWT verification, RBAC for contractor/provider  
**Confidence:** MEDIUM-HIGH (Clerk/Supabase/Hono patterns well documented; Firebase “suporte” scope and production SMS/session pricing need product confirmation)

## Summary

Phase 1 is **greenfield**: no application packages exist yet; research aligns the **locked stack** from `01-CONTEXT.md` (Clerk for authN, JWT sessions, Supabase as primary BaaS, Firebase in a support role) with **AUTH-01…03** from `REQUIREMENTS.md`. For **AUTH-01** (phone OTP), Clerk’s passwordless phone flow (`useSignIn` / `useSignUp` + SMS code) matches the requirement; Brazil (+55) must be enabled on Clerk’s **SMS allowlist** in the Dashboard, and **production SMS is a paid capability** on Clerk’s model [CITED: https://clerk.dev/docs/guides/configure/auth-strategies/sign-up-sign-in-options]. **AUTH-02** (stay signed in on the same device) maps to Clerk session persistence with **`expo-secure-store`** on native, as recommended by Expo’s Clerk guide [CITED: https://docs.expo.dev/guides/using-clerk/], plus Clerk session lifetime settings (e.g. **maximum lifetime** toward the **24h** decision) [CITED: https://clerk.com/docs/guides/secure/session-options]. **AUTH-03** (contractor vs provider authorization) should use **one Clerk user** with **app-owned role state** (Supabase rows + RLS, and/or API checks): Clerk supplies stable `sub`; roles and business rules live in your schema—do not rely on client-only checks given **D-07** (mixed server + app enforcement).

**Primary recommendation:** Implement **Clerk Expo custom flows** for phone OTP → **Clerk session JWT** on the client; wire **Supabase JS client** with Clerk session token via the **native third-party auth integration** (not deprecated JWT templates) [CITED: https://supabase.com/docs/guides/auth/third-party/clerk] [CITED: https://clerk.com/docs/integration/supabase]; verify the same JWT on **Hono** with `@clerk/backend` `authenticateRequest()` or equivalent [CITED: https://clerk.com/docs/backend-requests/manual-jwt]; persist profile + role flags in Postgres (Supabase) with RLS keyed on `auth.jwt()->>'sub'` [CITED: Supabase Clerk guide].

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Content below is copied from `.planning/phases/01-foundation-identity/01-CONTEXT.md` → `<decisions>` / `## Implementation Decisions` (verbatim structure).

#### Authentication Stack

- **D-01:** Stack de auth no V1: `Clerk (Auth) + JWT sessions + Supabase (BaaS principal) + Firebase (suporte)`.
- **D-02:** Recuperacao de acesso no V1 usa e-mail de backup.
- **D-03:** Fluxo de onboarding com conta unica e papeis gerenciados no perfil (sem separar apps/contas).

#### Session Policy

- **D-04:** Sessao curta/estrita no V1 (24h) com novo login mais frequente.
- **D-05:** Multiplos dispositivos permitidos, com opcao de encerrar todas as sessoes.

#### Roles & Authorization

- **D-06:** Usuario pode atuar nos dois papeis (contratante e prestador) na mesma conta.
- **D-07:** Autorizacao em modo misto no V1: validacoes principais no backend, com reforco na camada de app.

#### Technical Baseline

- **D-08:** Interface de API inicial em estilo RPC para auth/identidade.
- **D-09:** Meta de entrega da fase 1: ambiente local + CI funcional (sem staging/producao nesta fase).
- **D-10:** Observabilidade minima ja inclui logs estruturados, erros, metricas e tracing.

#### Claude's Discretion

- Detalhes de modelagem interna de claims/permissoes JWT.
- Estrategia de organizacao de modulos/servicos para identidade no repositorio.
- Definicao de ferramentas especificas para tracing/metrics compativeis com a stack.

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Usuario pode criar conta e acessar com OTP por telefone | Clerk phone OTP custom flows; E.164; SMS allowlist includes BR; Expo secure storage [CITED: Clerk email/SMS OTP guide — https://clerk.dev/docs/guides/development/custom-flows/authentication/email-sms-otp] |
| AUTH-02 | Usuario permanece autenticado entre sessoes no mesmo dispositivo | Clerk + `expo-secure-store`; session lifetime / refresh behavior; avoid hand-rolled token storage [CITED: Expo Clerk guide — https://docs.expo.dev/guides/using-clerk/] |
| AUTH-03 | Sistema aplica papeis distintos de contratante e prestador com autorizacao adequada | Single user id (`sub`); roles in DB + RLS; Hono middleware validates JWT + loads authz context; UI guards are supplementary only [CITED: Supabase + Clerk RLS — https://supabase.com/docs/guides/auth/third-party/clerk] |

</phase_requirements>

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` entries found in the workspace (glob search 2026-04-09). Follow `AGENTS.md` / `PROJECT.md` and existing planning artifacts.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/clerk-expo` | **2.19.31** [VERIFIED: npm registry] | Auth in Expo (hooks, custom native flows) | Official Expo path; pairs with SecureStore [CITED: https://docs.expo.dev/guides/using-clerk/] |
| `expo-secure-store` | **55.0.13** [VERIFIED: npm registry] | Encrypted session/token storage on device | Recommended by Expo for Clerk token storage [CITED: https://docs.expo.dev/guides/using-clerk/] |
| `@clerk/backend` | **3.2.8** [VERIFIED: npm registry] | Verify Clerk session JWT on Hono | `authenticateRequest()` / networkless JWT key option [CITED: https://clerk.com/docs/backend-requests/manual-jwt] |
| `hono` | **4.12.12** [VERIFIED: npm registry] | HTTP API (matches project STACK.md) | Lightweight, Web Standards; fits Node 22 API service |
| `@supabase/supabase-js` | pin at scaffold [ASSUMED: latest 2.x unless locked] | DB/RLS/Storage with Clerk JWT | Native Clerk third-party auth integration [CITED: https://supabase.com/docs/guides/auth/third-party/clerk] |
| `zod` | **4.3.6** [VERIFIED: npm registry] | Request/response validation | Matches STACK.md intent (3.x also common—align monorepo on one major at scaffold) |
| `@hono/otel` | **1.1.1** [VERIFIED: npm registry] | Traces/metrics hooks for Hono | Official Hono middleware [CITED: https://www.npmjs.com/package/@hono/otel] |
| `vitest` | **4.1.4** [VERIFIED: npm registry] | Unit tests for API auth helpers | STACK.md recommendation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@opentelemetry/sdk-node` + OTLP exporter | pin with `@hono/otel` README | Export traces to vendor | D-10 tracing baseline [CITED: https://www.npmjs.com/package/@hono/otel] |
| `pino` or `hono/logger` | pin at scaffold | Structured logs | D-10 structured logging (pick one; avoid ad-hoc `console` only in API) [ASSUMED: common pairing] |

### Firebase (D-01 “suporte”)

| Use | Notes |
|-----|--------|
| **FCM** (push), **Remote Config**, or **Analytics** | Typical “support” roles alongside Clerk; **not** a second identity system unless explicitly decided [ASSUMED] |

**Alternatives Considered**

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk phone OTP | Custom Twilio Verify + own JWT | More control, far more compliance/rate-limit/session work; conflicts with D-01 lock |
| Supabase Auth only | Supabase phone auth | Conflicts with D-01 Clerk lock; Clerk remains IdP |
| Deprecated Clerk JWT template for Supabase | Native third-party integration | Templates deprecated Apr 2025; native path avoids extra token minting [CITED: https://clerk.com/docs/integration/supabase] |

**Installation (illustrative — exact workspace layout is planner’s discretion):**

```bash
# Mobile (Expo — use expo install for native modules)
npx expo install @clerk/clerk-expo expo-secure-store

# API
npm install hono @clerk/backend @supabase/supabase-js zod
npm install -D vitest typescript @types/node
npm install @hono/otel @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

**Version verification:** Registry versions recorded 2026-04-09 via `npm view` for `@clerk/clerk-expo`, `@clerk/backend`, `hono`, `zod`, `vitest`, `expo-secure-store`, `@hono/otel`.

## Architecture Patterns

### Recommended Project Structure

```
apps/
├── mobile/                 # Expo (expo-router): ClerkProvider, auth screens, role UI
└── api/                    # Hono: JWT middleware, RPC-style identity routes, webhooks
packages/
└── shared/                 # Zod contracts, role enums, shared types
```

(Exact naming is **Claude’s discretion** per CONTEXT; structure follows modular monolith guidance in `.planning/research/SUMMARY.md`.)

### Pattern 1: Clerk phone OTP (sign-in) on Expo

**What:** Custom UI calling Clerk’s phone code strategies.  
**When to use:** AUTH-01.  
**Example:**

```typescript
// Source: https://clerk.dev/docs/guides/development/custom-flows/authentication/email-sms-otp
// Pseudocode shape — use useSignIn() from @clerk/clerk-expo
await signIn.create({ identifier: phoneE164 });
await signIn.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId });
await signIn.attemptFirstFactor({ strategy: 'phone_code', code });
```

Phone numbers **must be E.164** [CITED: Clerk OTP guide above].

### Pattern 2: Supabase client with Clerk session token

**What:** Pass Clerk JWT into Supabase client `accessToken` / global `Authorization` so PostgREST/RLS sees `auth.jwt()`.  
**When to use:** Any direct mobile→Supabase access (if used); otherwise API can use service role + user context—planner chooses boundary.  
**Example (shape from official docs):**

```typescript
// Source: https://supabase.com/docs/guides/auth/third-party/clerk
import { createClient } from '@supabase/supabase-js'
// obtain JWT from Clerk session in Expo via useAuth().getToken() etc.
export const supabase = createClient(url, anonKey, {
  accessToken: async () => (await clerkSession.getToken()) ?? null,
})
```

RLS: use `auth.jwt()->>'sub'` for Clerk user id, **not** `auth.uid()` [CITED: same guide].

### Pattern 3: Hono — verify Clerk JWT per request

**What:** Use Clerk backend SDK to authenticate `Authorization: Bearer <session_jwt>`; attach `userId` to context.  
**When to use:** All protected RPC routes.  
**Example:**

```typescript
// Source: https://clerk.com/docs/backend-requests/manual-jwt
// Use authenticateRequest() with publishableKey + optional jwtKey for networkless verify
const { isAuthenticated, toAuth } = await clerkClient.authenticateRequest(request, {
  authorizedParties: ['your-app-scheme-or-origin'],
})
```

Set **`authorizedParties` / `azp`** explicitly to reduce CSRF/token misuse risk [CITED: Clerk manual JWT doc].

### Pattern 4: “RPC style” (D-08) without microservices

**What:** Namespace procedures under a single base path with typed inputs, e.g. `POST /rpc` + `Zod` discriminated union **or** `POST /identity/*` endpoints with OpenAPI operationIds—both read as “RPC-like” to clients.  
**When to use:** Phase 1 identity API surface.  
**Anti-pattern:** Unversioned ad-hoc REST chaos without shared Zod contracts.

### Anti-Patterns to Avoid

- **Client-only RBAC:** Enforcing contractor/provider only in React; violates D-07 and OWASP ASVS access-control expectations [ASSUMED: ASVS mapping].
- **Dual identity silos:** Letting Firebase Auth compete with Clerk for the same user without a single source of truth [ASSUMED: integration risk].
- **Skipping SMS allowlist:** OTP silently fails for +55 until Brazil enabled [CITED: Clerk sign-up/sign-in options doc].
- **Deprecated Clerk→Supabase JWT template** for new work [CITED: https://clerk.com/docs/integration/supabase].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS OTP delivery + throttling | Own SMS gateway logic | Clerk phone OTP (+ Dashboard policies) | MNO failures, fraud, rate limits, compliance [CITED: Clerk docs] |
| JWT verify / JWKS caching | Custom crypto only | `@clerk/backend` or well-tested JWT lib + Clerk JWKS | Signature/`exp`/`azp` pitfalls [CITED: https://clerk.com/docs/backend-requests/manual-jwt] |
| Secure mobile token storage | AsyncStorage for secrets | `expo-secure-store` | Plain storage is extractable on rooted devices [CITED: Expo Clerk guide] |
| Session revoke-all UX | Ignore other devices | `getSessionList` + `revokeSession` [CITED: https://clerk.com/docs/reference/backend/sessions/get-session-list] [CITED: https://clerk.com/docs/reference/backend/sessions/revoke-session] | Maps to D-05 |

**Key insight:** Clerk owns **credentialing + session JWT**; your app owns **roles and business authorization** in Postgres and API middleware.

## Common Pitfalls

### Pitfall 1: Brazil SMS not enabled

**What goes wrong:** Users with +55 never receive OTP; errors at `sendCode`.  
**Why it happens:** Default SMS allowlist is limited; Brazil must be enabled in Dashboard [CITED: https://clerk.dev/docs/guides/configure/auth-strategies/sign-up-sign-in-options].  
**How to avoid:** Enable BR in **SMS → Settings** before UAT; document in runbook.  
**Warning signs:** Dev-only US numbers work; BR pilot fails.

### Pitfall 2: Production vs dev Clerk capabilities

**What goes wrong:** Session max lifetime or SMS behave differently when leaving dev instance.  
**Why it happens:** Clerk documents **paid-plan** requirements for several production features (e.g. custom **maximum lifetime**, **inactivity timeout**, SMS in production) [CITED: https://clerk.com/docs/guides/secure/session-options] [CITED: sign-up/sign-in options doc].  
**How to avoid:** Treat pricing/plan matrix as a **pre-go-live** checklist; keep D-04 testable in development.  
**Warning signs:** Dashboard banners / 402-like errors from SMS.

### Pitfall 3: Misaligned token for Supabase

**What goes wrong:** RLS denies all rows or `auth.jwt()` empty.  
**Why it happens:** Supabase not configured for Clerk domain / missing `role: authenticated` claim from integration [CITED: https://clerk.com/docs/integration/supabase].  
**How to avoid:** Complete Clerk “Connect with Supabase” + Supabase third-party provider setup; verify a known RLS policy in SQL editor.  
**Warning signs:** Anonymous access only from mobile.

### Pitfall 4: Weak `azp` / authorized parties

**What goes wrong:** Overly broad acceptance of tokens across origins/schemes.  
**Why it happens:** Skipping `authorizedParties` validation [CITED: https://clerk.com/docs/backend-requests/manual-jwt].  
**How to avoid:** Enumerate app scheme(s), localhost, and future web origin in API config.  
**Warning signs:** Token replay from unexpected client.

## Code Examples

Verified patterns from official sources are embedded under **Architecture Patterns** (Clerk OTP shape, Supabase `createClient`, `authenticateRequest`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk JWT template + Supabase HS256 secret | Supabase **third-party auth** + Clerk JWKS | 2025-03 / deprecation notice Apr 2025 [CITED: https://clerk.com/changelog/2025-03-31-supabase-integration] | Simpler client; planner must not template-docs older tutorials |
| Cookie-only Clerk sessions | Bearer session JWT to mobile API | Mobile-first standard | Hono must read `Authorization` header |

**Deprecated/outdated:**

- Clerk Supabase **JWT template** path for new integrations [CITED: https://clerk.com/docs/integration/supabase].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | “Firebase (suporte)” means ancillary services (e.g. FCM), not a parallel user directory | Standard Stack / Pitfalls | Duplicate identity, broken SSO, wasted integration |
| A2 | `zod` 4.x is acceptable for greenfield; if monorepo standardizes on 3.x, downgrade consistently | Standard Stack | Type/helper drift across packages |
| A3 | Some mobile flows will call Supabase directly with user JWT (not only via Hono) | Architecture | If false, RLS setup can be deferred behind API-only access |

**If this table were empty:** All claims would be verified — not the case while A1–A3 stand.

## Open Questions (RESOLVED)

Decisions below are **locked for planning** (2026-04-09) so downstream agents do not re-open them without an explicit roadmap change.

1. **Exact Firebase scope for D-01** — **RESOLVED:** Phase 1 uses Firebase only for **ancillary** product setup (e.g. `expo.extra` placeholders for future **FCM**), **not** Firebase Auth or a second user directory. Analytics/Remote Config are optional and off by default until a later phase.

2. **Direct Supabase from mobile vs API-only** — **RESOLVED:** **Hybrid V1:** sensitive **RPC** identity and role mutations go through **Hono** (`@clerk/backend` validation). The mobile app may use **Supabase client + Clerk JWT** for **RLS-protected reads** where the data model allows it (per Supabase third-party Clerk integration). **RLS remains mandatory** for any direct client path.

3. **Clerk production plan vs D-04/D-05 in production** — **RESOLVED:** **Development** uses Clerk **free/dev** tier to implement flows. **Production** tier, SMS quotas, and custom session limits are **TBD** with finance before launch; **do not** promise production SLOs beyond what the chosen Clerk plan documents. Pilot BR SMS uses **+55 allowlist** in Clerk Dashboard as documented in runbooks.

## Environment Availability

Step 2.6 executed on **Windows 10** (developer machine, 2026-04-09).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Hono API, tooling | ✓ | v22.17.1 | — |
| pnpm | Monorepo (STACK.md) | ✗ | — | Enable via `corepack enable pnpm` or `npm i -g pnpm`; CI can use `pnpm/action-setup` |
| git | CI, GSD | ✓ | 2.50.1 | — |
| Clerk account | AUTH-01…03 | — | — | Dev instance free tier; confirm SMS/plan for BR pilots |
| Supabase project | D-01 BaaS | — | — | Cloud project + CLI optional |
| PostgreSQL local | Optional if using Supabase only | — | — | Supabase hosted DB |

**Missing dependencies with no fallback:**

- None for **documentation/research**; **implementation** needs pnpm or an explicit npm-workspaces alternative in the plan.

**Missing dependencies with fallback:**

- pnpm → corepack/npm global as above.

## Validation Architecture

`workflow.nyquist_validation` is **true** in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest **2.x** (aligned with `01-01-PLAN.md` pin; not yet in repo) |
| Config file | `apps/api/vitest.config.ts` — **Wave 0** |
| Quick run command | `pnpm vitest run` (from `apps/api` once scaffolded) |
| Full suite command | `pnpm turbo run test` (once Turborepo exists) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTH-01 | Phone OTP sign-up/sign-in happy path | integration / manual device | Manual on device + optional Clerk test phones [ASSUMED] | ❌ Wave 0 |
| AUTH-02 | Token persisted across app restart | E2E (Maestro) or manual | Maestro flow [ASSUMED] | ❌ |
| AUTH-03 | API denies provider-only action for contractor context | unit | `pnpm vitest run src/authz/contractor-provider.test.ts` [ASSUMED path] | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run` scoped to touched package.
- **Per wave merge:** full `vitest` for `apps/api`.
- **Phase gate:** CI green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] Monorepo scaffold (`apps/mobile`, `apps/api`, `packages/shared`) — prerequisite for any test path.
- [ ] `apps/api/vitest.config.ts` + sample test for JWT middleware mock.
- [ ] CI workflow (GitHub Actions) running `pnpm install` + `vitest` — aligns with D-09.
- [ ] Document manual UAT steps for real BR SMS in pilot environment.

*(No application code or test files exist yet — all infrastructure gaps.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Clerk-managed factors; phone OTP; backup email per D-02 |
| V3 Session Management | yes | Clerk sessions; 24h policy; secure storage on device |
| V4 Access Control | yes | Server-side checks (Hono) + optional Supabase RLS; never UI-only |
| V5 Input Validation | yes | Zod on API boundaries |
| V6 Cryptography | yes | Clerk JWT signatures; no custom password hashing in phase 1 |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token replay across clients | Spoofing | `authorizedParties` / `azp` validation [CITED: Clerk manual JWT] |
| Broken RLS with wrong JWT | Elevation | Use `auth.jwt()->>'sub'`; test policies [CITED: Supabase Clerk guide] |
| OTP brute force | Tampering | Clerk throttling + app-level rate limits (Redis later per STACK.md) [ASSUMED: defense in depth] |
| Webhook forgery (user sync) | Spoofing | Verify Clerk webhooks with Svix signing secret when syncing profiles [ASSUMED: standard Clerk pattern] |

## Sources

### Primary (HIGH confidence)

- https://docs.expo.dev/guides/using-clerk/ — Expo + Clerk features, SecureStore
- https://clerk.com/docs/quickstarts/expo — Expo quickstart (Native API, env keys)
- https://clerk.dev/docs/guides/development/custom-flows/authentication/email-sms-otp — Phone OTP flow
- https://clerk.dev/docs/guides/configure/auth-strategies/sign-up-sign-in-options — SMS allowlist, plan notes
- https://clerk.com/docs/guides/secure/session-options — Session lifetime / inactivity
- https://clerk.com/docs/backend-requests/manual-jwt — `authenticateRequest`, `azp`
- https://clerk.com/docs/reference/backend/sessions/get-session-list — List sessions
- https://clerk.com/docs/reference/backend/sessions/revoke-session — Revoke session
- https://supabase.com/docs/guides/auth/third-party/clerk — Third-party auth + RLS
- https://clerk.com/docs/integration/supabase — Clerk-side setup, deprecation note
- https://www.npmjs.com/package/@hono/otel — OTel middleware for Hono

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md`, `STACK.md` — monorepo and modular monolith alignment
- WebSearch synthesis cross-checked against Clerk/Supabase official URLs above

### Tertiary (LOW confidence)

- Firebase exact product choice for “suporte” — **not** verified against Firebase docs this session (see Assumptions A1).

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** for Clerk/Expo/Hono/Supabase integration paths (official docs + npm registry).
- Architecture: **MEDIUM** pending API-vs-direct-Supabase boundary and Firebase scope.
- Pitfalls: **HIGH** for SMS allowlist and deprecated integration; **MEDIUM** for production pricing.

**Research date:** 2026-04-09  
**Valid until:** ~2026-05-09 (auth vendor docs and npm versions move frequently)
