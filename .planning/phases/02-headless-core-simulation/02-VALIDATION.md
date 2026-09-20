---
phase: 02
slug: headless-core-simulation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `5.0.1` + fast-check `4.10.2` (+ `@fast-check/vitest` `0.5.0`) |
| **Config file** | `vitest.config.ts` (`environment: 'node'`) |
| **Quick run command** | `npm run test:core` |
| **Full suite command** | `npm test` |
| **Lint purity** | `npx eslint src/core` |
| **Estimated runtime** | ~5–30s (props dominate) |

---

## Sampling Rate

- **After every task commit:** `npm run test:core` + `npx eslint src/core`
- **After every plan wave:** `npm test` + `npx eslint src/core`
- **Before `/gsd-verify-work`:** Full suite green; tunneling prop + golden-replay must pass
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-00-01 | 00 | 0 | PHYS-06 | T-02-01 | NaN/finite intent guards later; install PBT | infra | `npm ls fast-check` | ❌ W0 | ⬜ pending |
| 02-00-02 | 00 | 0 | PHYS-06 | — | Ban `Math.random` / wall-clock in `src/core/**` | lint | `npx eslint src/core` | ❌ W0 | ⬜ pending |
| 02-W*-* | * | * | PHYS-* | T-02-01 | See plans after planner fills task IDs | unit/prop | per plan `<automated>` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement → test file (planner must wire tasks)

| Req ID | Automated Command | File | Exists |
|--------|-------------------|------|--------|
| PHYS-06 | `npx vitest run tests/physics.golden-replay.test.ts` | golden-replay | ❌ W0 |
| PHYS-06 | `npx vitest run tests/core.purity.test.ts` | purity | ✅ extend |
| PHYS-06 | `npx eslint src/core` | eslint RNG ban | ❌ W0 |
| PHYS-02 | `npx vitest run tests/physics.sweep.test.ts` | sweep | ❌ W0 |
| PHYS-02/03 | `npx vitest run tests/physics.tunneling.prop.test.ts` | tunneling prop | ❌ W0 |
| PHYS-04 | `npx vitest run tests/physics.paddle.test.ts` | paddle | ❌ W0 |
| PHYS-03 / D-10 | `npx vitest run tests/physics.bricks.test.ts` | bricks | ❌ W0 |
| D-07/08 | `npx vitest run tests/physics.world-shape.test.ts` | world-shape | ❌ W0 |

### Property tests (Nyquist)

| Property ID | Invariant | Runs (min) |
|-------------|-----------|------------|
| PROP-TUNNEL | No tunneling / missed collisions at 2× `MAX_BALL_SPEED` | 100 |
| PROP-SPEED | Speed preserved on reflect (ε ≤ 1e-4) | 50 |
| PROP-CLAMP | Paddle outgoing angle within clamps | 50 |
| PROP-DETERM | Identical seed+intents → identical `hashWorld` | 20 |

---

## Wave 0 Requirements

- [ ] `npm install -D fast-check@4.10.2 @fast-check/vitest@0.5.0`
- [ ] ESLint restrictions for `Math.random` / `Date.now` / `performance.now` in `src/core/**`
- [ ] Extend `tests/core.purity.test.ts` regex for RNG/clock
- [ ] Update `boundaries` patterns for nested `src/core/**` if needed
- [ ] Stub/create physics test files listed above (or create in-feature plans with TDD)
- [ ] Update `tests/core.smoke.test.ts` for `World` / `stepWorld`
- [ ] Thin `useSpikeLoop` migration so app typechecks after `SpikeWorld` removal
- [ ] Add `npm run test:core` script if missing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | All Phase 2 behaviors have automated verification (headless) |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after plans land

**Approval:** pending
