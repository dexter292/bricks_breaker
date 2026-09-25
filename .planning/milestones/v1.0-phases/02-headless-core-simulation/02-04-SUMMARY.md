---
phase: 02-headless-core-simulation
plan: 04
subsystem: simulation
tags: [CCD, stepWorld, brick-HP, unbreakable, Intent-guard, PHYS-02, PHYS-06, worklet]

requires:
  - phase: 02-headless-core-simulation
    provides: World SoA, loadTestGrid, event ring, sweep/broadphase/integrate (02-01/02-02)
  - phase: 02-headless-core-simulation
    provides: resolvePaddleEnglish + reflectVelocity (02-03)
provides:
  - Barrel re-exports for physics primitives from src/core/index.ts
  - Production stepWorld swept CCD loop (walls, paddle, bricks)
  - Multi-HP + unbreakable brick rules with brickDamagedThisStep
  - Intent Number.isFinite paddleX guard (T-02-01)
affects: [02-05 tunneling props / golden-replay, Phase 3 host loop]

tech-stack:
  added: []
  patterns:
    - Earliest-TOI CCD among walls/paddle/grid bricks capped at MAX_CCD_ITERATIONS=5
    - brickDamagedThisStep prevents multi-HP loss per stepWorld call
    - Unbreakable reflects via reflectVelocity without HP change or BRICK_BREAK

key-files:
  created:
    - tests/physics.bricks.test.ts
  modified:
    - src/core/index.ts
    - src/core/step.ts
    - tests/core.smoke.test.ts

key-decisions:
  - "Bottom wall emits BALL_OUT and deactivates the ball (no Phase 3 lives)"
  - "remaining time uses tAbs = toi * remaining (sweep t is fraction of displacement)"
  - "loadTestGrid from 02-01 reused as-is (D-11); no reset.ts changes"

patterns-established:
  - "stepWorld as sole CCD entry: Intent clamp → per-ball earliest sweep → resolve/pushEvent → tick++"
  - "Barrel owns physics re-exports after wave-2 parallel plans"

requirements-completed: [PHYS-02, PHYS-06]

duration: 2min
completed: 2026-09-20
---

# Phase 02 Plan 04: stepWorld CCD + Brick HP Summary

**Production `stepWorld` swept CCD with multi-HP/unbreakable bricks, Intent finite guards, and consolidated physics barrel exports — green under PHYS-02 brick unit tests + smoke**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T03:47:56Z
- **Completed:** 2026-09-20T03:49:55Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Consolidated wave-2 physics exports on `src/core/index.ts` (barrel ownership for 02-04)
- RED then GREEN TDD for multi-HP break sequence, unbreakable no-HP-loss, and per-step damage cap
- Shipped full CCD `stepWorld`: walls/paddle/bricks, paddle english, brick HP rules, BALL_OUT stub, Intent `Number.isFinite` clamp

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate core barrel exports** - `021df87` (feat)
2. **Task 2: RED — brick HP + unbreakable tests** - `d30a827` (test)
3. **Task 3: Implement stepWorld CCD + Intent guards** - `ba09db7` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `src/core/index.ts` — re-exports `sweepCircleAabb`, `forEachBrickCandidate`, `advanceBall`, `resolvePaddleEnglish`, `reflectVelocity`
- `src/core/step.ts` — production CCD loop + brick HP/unbreakable + Intent finite guards
- `tests/physics.bricks.test.ts` — multi-HP, unbreakable, brickDamagedThisStep coverage
- `tests/core.smoke.test.ts` — asserts real motion + wall bounce vx flip

## Decisions Made

- Bottom field contact → `BALL_OUT` + deactivate ball (lives deferred to Phase 3)
- TOI from sweep is fractional; absolute advance uses `toi * remaining`
- Existing `loadTestGrid` sufficient for D-11 test grids — no reset changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 02-05 tunneling property / golden-replay plans consuming `stepWorld` + FIXED_DT
- Phase 3 can host `stepWorld` inside the frame accumulator without React writes in core

## Verification Results

- `npx vitest run tests/physics.bricks.test.ts` — 3 passed (was RED after Task 2)
- `npx vitest run tests/physics.bricks.test.ts tests/physics.sweep.test.ts tests/physics.paddle.test.ts tests/core.smoke.test.ts` — 18 passed
- `npx eslint src/core` — exit 0
- `npm run test:core` — 25 passed (6 files)
- `grep -R "useState|setState" src/core` — no matches

## Self-Check: PASSED

- Key artifacts exist (`index.ts` physics exports, `step.ts` CCD, `physics.bricks.test.ts`)
- `git log --grep=02-04` returns ≥3 commits
- All task acceptance criteria re-verified green
- Did not modify STATE.md or ROADMAP.md (orchestrator-owned)

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
