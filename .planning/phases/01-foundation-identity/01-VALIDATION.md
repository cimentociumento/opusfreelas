---
phase: 01
slug: foundation-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (install in Wave 0 — not yet in repo; aligned with `01-01-PLAN.md`) |
| **Config file** | `apps/api/vitest.config.ts` — **Wave 0** |
| **Quick run command** | `pnpm vitest run` (from `apps/api` once scaffolded) |
| **Full suite command** | `pnpm turbo run test` (once Turborepo exists) |
| **Estimated runtime** | ~30–120 seconds (API unit scope) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run` scoped to the touched package
- **After every plan wave:** Run full `vitest` for `apps/api` (when present)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | AUTH-01 | T-01 / — | OTP only via Clerk; BR SMS allowlist | manual + integration | Manual device + Clerk test phones [ASSUMED] | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | AUTH-02 | T-02 / — | Tokens in SecureStore; session max ~24h | E2E / manual | Maestro or manual restart flow [ASSUMED] | ❌ | ⬜ pending |
| TBD | 01 | 1 | AUTH-03 | T-03 / — | Server denies wrong role | unit | `pnpm vitest run` authz tests [ASSUMED path] | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Monorepo scaffold (`apps/mobile`, `apps/api`, `packages/shared`)
- [ ] `apps/api/vitest.config.ts` + sample JWT middleware / authz test stub
- [ ] CI workflow (GitHub Actions): `pnpm install` + `vitest`
- [ ] Document manual UAT for real BR SMS in pilot environment

*No application code exists yet — all infrastructure gaps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real SMS OTP in BR | AUTH-01 | Carrier/plan dependent | Use pilot Clerk project + physical device; verify +55 E.164 |
| Session after cold start | AUTH-02 | Device lifecycle | Kill app, relaunch; confirm still signed in per D-04 policy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
