---
phase: 02
slug: headless-core-simulation
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-20
updated: 2026-09-20
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` § Validation Architecture + planner task IDs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `5.0.1` + fast-check `4.10.2` (+ `@fast-check/vitest` `0.5.0`) |
| **Config file** | `vitest.config.ts` (`environment: 'node'`) |
| **Quick run command** | `npm run test:core` |
| **Full suite command** | `npm test` |
| **Lint purity** | `npx eslint src/core` |
| **Estimated runtime** | ~5–30s typical; PROP-TUNNEL suite may approach **60s** max |
| **Node** | 24 (`.nvmrc`) — prefer `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"` |

---

## Sampling Rate

- **After every task commit:** `npm run test:core` + `npx eslint src/core`
- **After every plan wave:** `npm test` + `npx eslint src/core`
- **Before `/gsd-verify-work`:** Full suite green; tunneling prop + golden-replay must pass
- **Max feedback latency:** 60 seconds (PROP-TUNNEL may approach this ceiling; acceptable per Nyquist budget)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-00-01 | 00 | 0 | PHYS-06 | T-02-02 | Install PBT deps | infra | `npm ls fast-check@4.10.2 @fast-check/vitest@0.5.0` | ❌ W0 | ⬜ pending |
| 02-00-02 | 00 | 0 | PHYS-06 | T-02-02/03 | Ban Math.random / wall-clock + nested boundaries | lint | `npx eslint src/core` | ❌ W0 | ⬜ pending |
| 02-00-03 | 00 | 0 | PHYS-06 | T-02-02 | Purity regex RNG/clock | unit | `npx vitest run tests/core.purity.test.ts` | ✅ extend | ⬜ pending |
| 02-01-01 | 01 | 1 | PHYS-06 | T-02-02 | World/RNG/ring/hash modules lint | lint | `npx eslint src/core` | ❌ | ⬜ pending |
| 02-01-02 | 01 | 1 | PHYS-06 | T-02-01/04 | World shape + smoke | unit | `npx vitest run tests/physics.world-shape.test.ts tests/core.smoke.test.ts` | ❌ | ⬜ pending |
| 02-01-03 | 01 | 1 | PHYS-06 | — | Harness tsc after SpikeWorld removal | typecheck | `npx tsc --noEmit` | ✅ migrate | ⬜ pending |
| 02-02-01 | 02 | 2 | PHYS-02 | — | Sweep tests RED | unit | `npx vitest run tests/physics.sweep.test.ts` (expect fail) | ❌ | ⬜ pending |
| 02-02-02 | 02 | 2 | PHYS-02/03 | T-02-01 | Sweep/broadphase GREEN | unit | `npx vitest run tests/physics.sweep.test.ts` | ❌ | ⬜ pending |
| 02-03-01 | 03 | 2 | PHYS-04 | — | Paddle tests RED | unit | `npx vitest run tests/physics.paddle.test.ts` (expect fail) | ❌ | ⬜ pending |
| 02-03-02 | 03 | 2 | PHYS-04 | T-02-01 | Paddle english GREEN | unit | `npx vitest run tests/physics.paddle.test.ts` | ❌ | ⬜ pending |
| 02-04-01 | 04 | 3 | PHYS-02/06 | — | Barrel export consolidation | lint | `grep` + `npm run test:core` | ✅ migrate | ⬜ pending |
| 02-04-02 | 04 | 3 | PHYS-02 | — | Brick tests RED | unit | `npx vitest run tests/physics.bricks.test.ts` (expect fail) | ❌ | ⬜ pending |
| 02-04-03 | 04 | 3 | PHYS-02/06 | T-02-01 | stepWorld CCD + finite Intent | unit | `npx vitest run tests/physics.bricks.test.ts tests/core.smoke.test.ts` | ❌ | ⬜ pending |
| 02-05-01 | 05 | 4 | PHYS-02/03/04 | T-02-01 | 2× tunneling + clamp/speed props | property | `npx vitest run tests/physics.tunneling.prop.test.ts` | ❌ | ⬜ pending |
| 02-05-02 | 05 | 4 | PHYS-06 | T-02-02 | Golden-replay + full suite | unit | `npx vitest run tests/physics.golden-replay.test.ts && npm test` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement → test file

| Req ID | Automated Command | File | Exists |
|--------|-------------------|------|--------|
| PHYS-06 | `npx vitest run tests/physics.golden-replay.test.ts` | golden-replay | ❌ → plan 05 |
| PHYS-06 | `npx vitest run tests/core.purity.test.ts` | purity | ✅ extend plan 00 |
| PHYS-06 | `npx eslint src/core` | eslint RNG ban | ❌ → plan 00 |
| PHYS-02 | `npx vitest run tests/physics.sweep.test.ts` | sweep | ❌ → plan 02 |
| PHYS-02/03 | `npx vitest run tests/physics.tunneling.prop.test.ts` | tunneling prop | ❌ → plan 05 |
| PHYS-04 | `npx vitest run tests/physics.paddle.test.ts` | paddle | ❌ → plan 03 |
| PHYS-03 / D-10 | `npx vitest run tests/physics.bricks.test.ts` | bricks | ❌ → plan 04 |
| D-07/08 | `npx vitest run tests/physics.world-shape.test.ts` | world-shape | ❌ → plan 01 |

### Property tests (Nyquist)

| Property ID | Invariant | Runs (min) |
|-------------|-----------|------------|
| PROP-TUNNEL | No tunneling / missed collisions at 2× `MAX_BALL_SPEED` | 100 |
| PROP-SPEED | Speed preserved on reflect (ε ≤ 1e-4) | 50 |
| PROP-CLAMP | Paddle outgoing angle within clamps | 50 |
| PROP-DETERM | Identical seed+intents → identical `hashWorld` | 20 |

---

## Wave 0 Requirements

- [ ] `npm install -D fast-check@4.10.2 @fast-check/vitest@0.5.0` — plan 02-00
- [ ] ESLint restrictions for `Math.random` / `Date.now` / `performance.now` in `src/core/**` — plan 02-00
- [ ] Extend `tests/core.purity.test.ts` regex for RNG/clock — plan 02-00
- [ ] Update `boundaries` patterns for nested `src/core/**` — plan 02-00
- [ ] `npm run test:core` script — already present; confirm in 02-00
- [ ] Physics test files + World/harness — plans 02-01…02-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | All Phase 2 behaviors have automated verification (headless) |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter after plans land

**Approval:** plans mapped 2026-09-20
