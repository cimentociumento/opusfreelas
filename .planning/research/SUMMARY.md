# Project Research Summary

**Project:** Opus Freelas  
**Domain:** Regional two-sided services marketplace (manual/rural labor, AMAUC/SC, Brazil), contractor-first V1, off-platform closure, provider subscription monetization  
**Researched:** 2026-04-09  
**Confidence:** MEDIUM–HIGH (stack and geo patterns strongly sourced; payments BR, SMS, LGPD details need live validation)

## Executive Summary

Opus Freelas is a **local two-sided marketplace** in a segment where success depends less on “feature parity with national players” than on **geographic liquidity**, **trust signals**, and **fitting the informal channel reality** (WhatsApp, word of mouth). Expert practice for this shape of product favors a **modular monolith** on managed Postgres (+ PostGIS when spatial queries matter), **async jobs** for notifications and webhooks, **adapters** for SMS/OTP and billing, and **one versioned API** serving Expo-based mobile (and optional web). The recommended product approach is **narrow geography first** (1–2 polos, anchor providers, honest empty states), **table-stakes marketplace flows** (publish demand, discover by locality/type, provider profile with portfolio, basic verification, post-job reviews, clear contact handoff), and **subscription only after** perceived lead quality and visibility exist—aligned with FEATURES.md MVP ordering and ARCHITECTURE.md build order.

The main risks are **cold start** (demand without credible local supply), **suboptimizing against WhatsApp** (app feels slower than “ask in the group”), **over-expanding municipalities** before density, **weak verification** versus perceived risk in rural/home-access contexts, and **premature subscription** that reads as a tax. Mitigations: operational minimum liquidity SLAs, pilot metrics (zero-result, time-to-first-qualified-contact), mobile-first low-friction copy and templates, phased municipal rollout, layered trust (portfolio, badges, moderation), and deferred billing until core discovery loops work. **LGPD**, **PSP choice** (Mercado Pago / Pagar.me vs Stripe caveats), and **review fairness without in-app payment** need explicit phase-level research or legal/commercial sign-off—not optional gloss.

## Key Findings

### Recommended Stack

See [STACK.md](./STACK.md) for versions and rationale. The synthesis: **Expo SDK 55** (React Native 0.83, React 19.2) with **expo-router**, **TanStack Query**, **Zod**, **i18next**; maps via **react-native-maps**; lists via **FlashList**; media and geo via standard Expo modules. Backend: **Node 22 LTS**, **Hono 4**, **Drizzle** + **PostgreSQL 17** + **PostGIS**, **Redis** + **BullMQ**, **JWT + refresh** with phone **OTP** (e.g. Twilio Verify). Subscriptions: **Mercado Pago Subscriptions** primary, **Pagar.me** alternative; treat **Stripe as secondary** until BR recurrence/Pix fit is validated. Object storage (S3-compatible), **EAS** for builds, **OpenTelemetry** for production. Monorepo: **pnpm** + **Turborepo**; **Vitest** + **Playwright/Maestro** for tests.

**Core technologies:**

- **Expo SDK 55 / RN 0.83** — one codebase multiplatform; official matrix confidence HIGH  
- **Hono + Drizzle + Postgres/PostGIS** — typed API + explicit SQL for geo; better PostGIS fit than heavier ORM abstractions  
- **Mercado Pago (subscriptions)** — BRL/local habits; validate account/product with finance before locking  
- **BullMQ + Redis** — OTP throttling, notifications, webhook retries, idempotent side effects  

### Expected Features

See [FEATURES.md](./FEATURES.md). Table stakes include demand publication with minimal context, **search/filters by locality + service type**, **provider profiles** (locality, radius, proof/portfolio), **clear contact / off-app handoff**, **basic verification**, **post-service reviews**, **taxonomy aligned to rural/manual vocabulary**, and **usable mobile experience**. Differentiators are **intentional AMAUC liquidity**, rural-focused taxonomy and copy, **transparent radius/municipality**, **subscription (not escrow)**, **light connection flow**, visible trust signals, and future accessible media (audio post-V1). **Anti-features for V1:** in-app legal-grade contracts, heavy in-app negotiation, intermediary fees/escrow, bank-grade contractor onboarding, national scale before density, chat that traps users away from WhatsApp, opaque ranking, heavy fiscal onboarding blocking MVP.

**Must have (table stakes):**

- Publish demand + categories — minimal friction; same vocabulary as search  
- Discovery by municipality/radius + service type — core value  
- Provider profile + portfolio — substitute for word-of-mouth proof  
- Contact handoff — V1 closure off-platform is explicit product choice  
- Basic verification — fraud/perception risk in local services  
- Reviews — social proof; needs eligibility rules  

**Should have (competitive / regional):**

- AMAUC-first liquidity and honest coverage UX — avoids “empty region” trap  
- Rural/manual taxonomy and transparency of service area — differentiation vs generic marketplaces  
- Subscription tied to visibility — after value is demonstrable  

**Defer (v2+):**

- Escrow, formal in-app contracting, heavy exclusive chat, national expansion before density, audio without moderation strategy  

### Architecture Approach

See [ARCHITECTURE.md](./ARCHITECTURE.md). Use a **modular monolith** (modulith) with clear bounded contexts: **Identity & access**, **Marketplace core**, **Discovery/search**, **Trust & verification**, **Reputation**, **Billing/subscriptions**, **Notifications**, **Media**, **Observability**. Enforce **server-side authorization**; use **outbox/queue** for side effects; **anti-corruption adapters** for third parties; **geo model** (municipality + radius → PostGIS when needed). Avoid microservices-for-slides in V1, trust logic only in UI, and rich in-app chat as system of truth when product assumes off-app closure.

**Major components:**

1. **Client (Expo)** — UI, offline-tolerant reads where possible; single API contract  
2. **API core** — use cases, validation, RBAC (contractor vs provider)  
3. **Async workers** — notifications, webhook processing, verification callbacks  
4. **Data plane** — Postgres (+ PostGIS), object storage, Redis/BullMQ  

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md). Top risks and mitigations:

1. **Cold start without minimum credible supply** — start with 1–2 polos, anchor providers, operational SLA for zero-result; measure liquidity not vanity cadastros  
2. **Ignoring WhatsApp/indicação baseline** — embrace off-app closure; add value before/after (ficha, history, reviews, share/deep links where validated)  
3. **Geography too wide too early** — expand municipality-by-municipality with minimum density; “active vs em breve” UX  
4. **Verification misaligned with risk** — tiered badges, portfolio where it matters, human moderation queue early  
5. **Subscription before liquid value** — pilot pricing, lead-quality metrics, clear scope of what subscription buys  

**Cross-cutting:** **LGPD by design** (data map, minimization, retention, subprocessors)—not a late phase; **review manipulation** in small networks—eligibility + moderation + simple transparent ranking rules  

## Implications for Roadmap

Suggested phase structure merges ARCHITECTURE build order, FEATURES MVP priorities, and PITFALLS phase hooks.

### Phase 1: Foundation — identity, API, monorepo

**Rationale:** Every flow depends on authN/authZ, roles (contractor vs provider), and a deployable API with observability baseline.  
**Delivers:** Monorepo skeleton (pnpm/Turborepo), Expo app + API, JWT + OTP path (adapter-ready), structured logging, CI smoke tests.  
**Addresses:** Table stakes verification prep; multiplatform requirement.  
**Avoids:** Trust logic only on client (PITFALLS / ARCHITECTURE anti-patterns).  

### Phase 2: Demand & taxonomy (AMAUC-scoped)

**Rationale:** Contractor-first V1 requires publish + valid local context before discovery is meaningful.  
**Delivers:** Demand CRUD, service taxonomy v1 (rural/manual vocabulary), AMAUC municipality constraints, consent/copy for contact visibility.  
**Addresses:** FEATURES table stakes (publish, categories); PITFALLS taxonomy/language.  
**Avoids:** National-scale empty catalog (PITFALLS #3).  

### Phase 3: Discovery — search, filters, geo

**Rationale:** Close the “publish → find” loop for contractors; instrument health metrics early.  
**Delivers:** Listings by type + locality/radius; indexes or PostGIS as needed; pagination; zero-result telemetry and operator-oriented empty states.  
**Addresses:** Table stakes search/filters; ARCHITECTURE discovery module.  
**Avoids:** Cold start silent failure (PITFALLS #1); vanity metrics without contact quality (PITFALLS #10).  

### Phase 4: Supply — provider profiles & media

**Rationale:** Discovery is hollow without profiles, radius, and portfolio metadata.  
**Delivers:** Provider profile, radius, presigned uploads, FlashList feeds; trust placeholders in UI.  
**Addresses:** PROFILE.md-style requirements; FEATURES differentiator (transparency, proof).  
**Avoids:** High visibility without portfolio norms where risk is high (PITFALLS #4).  

### Phase 5: Trust — verification (async)

**Rationale:** Reduces perceived fraud without blocking MVP inconsistently.  
**Delivers:** OTP/verification provider adapter, states in DB, queue + retries/DLQ, badges on profile.  
**Addresses:** Basic verification table stake.  
**Avoids:** “Weak verification” trust hole (PITFALLS #4); duplicated webhook effects (ARCHITECTURE idempotency).  

### Phase 6: Connection & reputation

**Rationale:** Off-app handoff is explicit; platform still needs audit trail for reviews.  
**Delivers:** Reveal contact / handoff flow, optional share/deep link experiments, review eligibility rules, aggregates, basic anti-abuse.  
**Addresses:** Contact + reviews; FEATURES dependency chain (conclusion → review).  
**Avoids:** Chat as sole truth; review toxicity without rules (PITFALLS #8).  

### Phase 7: Monetization — provider subscription

**Rationale:** ARCHITECTURE and FEATURES agree: bill after marketplace value is felt.  
**Delivers:** PSP adapter (MP/Pagar.me), checkout, webhook idempotency, entitlements (visibility rules), in-app subscription state.  
**Addresses:** PROJECT monetization; FEATURES subscription differentiator.  
**Avoids:** Subscription-as-tax before lead quality (PITFALLS #5).  

### Phase 8: Hardening & scale readiness

**Rationale:** Rural connectivity and growth require operational discipline.  
**Delivers:** OpenTelemetry dashboards/alerts, read-path tuning, LGPD documentation pass, Playwright/Maestro on critical paths, seasonal/operational playbooks.  
**Addresses:** STACK observability; PITFALLS LGPD (#6), seasonality (#9).  
**Avoids:** Production blindness under heterogeneous connectivity.  

### Phase Ordering Rationale

- **Liquidity chain:** taxonomy + demand → discovery needs provider data → profiles before rich matching → verification and reviews reinforce trust → subscription last.  
- **Architecture:** modular monolith allows incremental extraction (billing/verification) only when SLOs demand it.  
- **Pitfalls:** pilot geography, anchor supply, and honest UX are **parallel product obligations** in Phases 2–4—not afterthoughts.  

### Research Flags

Phases likely needing deeper research during planning (`/gsd-research-phase` or specialist input):

- **Phase 5 (Trust):** SMS/OTP cost, MNO behavior in BR, optional doc verification depth—per FEATURES gaps  
- **Phase 6 (Reputation):** “Fair review” without in-app payment—eligibility and dispute culture (FEATURES + PITFALLS)  
- **Phase 7 (Monetization):** PSP contract, Pix/recurrence, tax/contador alignment—STACK MEDIUM confidence  
- **Cross-cutting:** LGPD inventory and subprocessors—legal review (PITFALLS #6)  

Phases with standard patterns (lighter research):

- **Phase 1 & stack:** Expo SDK matrix, Hono/OpenAPI, Drizzle migrations—well-trodden  
- **Phase 3 geo:** PostGIS distance patterns—official PostGIS docs  
- **Phase 4 media:** Presigned S3 pattern—standard  

## Confidence Assessment

| Area        | Confidence   | Notes |
|------------|--------------|--------|
| Stack      | MEDIUM–HIGH  | Expo/RN/React matrix HIGH; Hono/Drizzle MEDIUM; payments BR MEDIUM pending account validation |
| Features   | MEDIUM       | Strong alignment to PROJECT.md (HIGH); generic marketplace lists filtered (MEDIUM) |
| Architecture | MEDIUM–HIGH | Industry monolith-first + explicit module boundaries; legal/policy detail still phase-owned |
| Pitfalls   | MEDIUM       | Solid pattern literature + BR context; AMAUC-specific validation pending pilots |

**Overall confidence:** MEDIUM–HIGH for direction; execution risk concentrated in **liquidity operations**, **PSP**, and **trust/review policy**.

### Gaps to Address

- **Liquidity metrics and pilot design** — define per-municipality “minimum viable offer” and instrument before broad marketing (PITFALLS).  
- **Payment and fiscal** — confirm Mercado Pago vs Pagar.me with real account and counsel; do not assume Stripe recurrence for BR (STACK).  
- **Review governance** — phase research for eligibility and retaliation in small towns (FEATURES + PITFALLS).  
- **Verification depth vs cost** — microentrepreneur constraints (FEATURES gaps).  
- **Offline/low connectivity UX** — product/design phase beyond pure backend (ARCHITECTURE gap).  

## Sources

### Aggregated from research files

**Primary (HIGH confidence):**

- [Expo SDK reference](https://docs.expo.dev/versions/latest/) — SDK 55 / RN 0.83 / React 19.2 matrix (STACK)  
- [PostGIS documentation](https://postgis.net/) — geography, indexing, radius (STACK, ARCHITECTURE)  
- `.planning/PROJECT.md` — V1 scope, monetization, anti-scope (FEATURES, ARCHITECTURE, PITFALLS)  

**Secondary (MEDIUM confidence):**

- [Mercado Pago — Subscriptions](https://www.mercadopago.com.br/developers/en/docs/subscriptions/overview) (STACK)  
- [Stripe — Pix / BR recurrence caveats](https://docs.stripe.com/payments/pix) (STACK)  
- [Twilio — SMS Brazil guidelines](https://www.twilio.com/en-us/guidelines/br/sms) (STACK)  
- Marketplace cold start / chicken-and-egg guides (Reforge, Jobtech Alliance) — PITFALLS  
- FGV / marketplace LGPD report — PITFALLS  
- [GetNinjas](https://www.getninjas.com.br/) — BR market reference (FEATURES)  

**Tertiary (LOWER confidence — validate in pilots):**

- Regional WhatsApp/informal economy anecdote synthesis (FEATURES, PITFALLS)  
- Generic “marketplace features” checklists (FEATURES)  

---

*Research completed: 2026-04-09*  
*Ready for roadmap: yes*
