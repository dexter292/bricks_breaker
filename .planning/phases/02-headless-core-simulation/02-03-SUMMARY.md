---
phase: 02-headless-core-simulation
plan: 03
subsystem: simulation
tags: [paddle-english, reflectVelocity, PHYS-04, clamps, worklet, resolve]

requires:
  - phase: 02-headless-core-simulation
    provides: World SoA + PADDLE_ANGLE_CLAMP_DEG + constants (02-01)
provides:
  - resolvePaddleEnglish with ±62° clamps and speed preservation
  - reflectVelocity for wall/brick normals
  - PADDLE_ANGLE_CLAMP_RAD + MIN_VERTICAL_RATIO exports
  - PHYS-04 unit coverage in tests/physics.paddle.test.ts
affects: [02-04 stepWorld paddle hit path, 02-05 PROP-CLAMP/PROP-SPEED]

tech-stack:
  added: []
  patterns:
    - Classic Breakout t∈[-1,1] → angleFromUp with y-down (−vy up)
    - Worklet-inline clamp literals matching constants.ts
    - Speed preserved via hypot rescale (ε ≤ 1e-4)

key-files:
  created:
    - src/core/physics/resolve.ts
    - tests/physics.paddle.test.ts
  modified:
    - src/core/constants.ts

key-decisions:
  - "Deep-import physics/resolve in tests (barrel owned by 02-04)"
  - "Inline 62° / cos(clamp) literals inside worklet bodies"
  - "Non-finite inputs return prior velocity unchanged (T-02-01)"

patterns-established:
  - "resolve.ts as pure worklet math; tests deep-import until barrel wave"
  - "MIN_VERTICAL_RATIO = cos(PADDLE_ANGLE_CLAMP_RAD) for D-03 gates"

requirements-completed: [PHYS-04]

duration: 2min
completed: 2026-09-20
---

# Phase 02 Plan 03: Paddle English + Reflect Summary

**Classic Breakout paddle english with ±62° clamps, speed preservation, and wall/brick velocity reflect — green under PHYS-04 unit tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T03:44:05Z
- **Completed:** 2026-09-20T03:46:25Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- RED: PHYS-04 paddle tests covering clamp edges (±1), center, speed ε≤1e-4, near-horizontal inbound, and vertical-wall reflect
- GREEN: `resolvePaddleEnglish` + `reflectVelocity` with `'worklet'` + inline literals; exported `PADDLE_ANGLE_CLAMP_RAD` / `MIN_VERTICAL_RATIO`
- Left `src/core/index.ts` and sweep/integrate/broadphase untouched for parallel plans

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — paddle english / clamp tests** - `c032893` (test)
2. **Task 2: GREEN — resolve.ts paddle english + reflect** - `947f4bf` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `tests/physics.paddle.test.ts` — PHYS-04 clamp-edge, speed, min-vertical, reflectVelocity cases
- `src/core/physics/resolve.ts` — `resolvePaddleEnglish` + `reflectVelocity` (worklet-safe)
- `src/core/constants.ts` — `PADDLE_ANGLE_CLAMP_RAD`, `MIN_VERTICAL_RATIO`

## Decisions Made

- Tests deep-import `../src/core/physics/resolve` so wave-2 can parallel with 02-02 without racing the barrel
- Worklet bodies inline `(62 * Math.PI) / 180` and `Math.cos(clampRad)` rather than closing over module consts
- Non-finite ball/paddle/normal inputs return prior velocity (T-02-01)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 02-04 to wire `resolvePaddleEnglish` / `reflectVelocity` into `stepWorld` and barrel-export
- PHYS-04 unit bar met; property PROP-CLAMP/PROP-SPEED remain for 02-05

## Verification Results

- `npx vitest run tests/physics.paddle.test.ts` — 6 passed
- `npx eslint src/core` — exit 0
- `npm run test:core` — 22 passed
- `grep PADDLE_ANGLE_CLAMP src/core/constants.ts` — matches DEG/RAD
- Speed assertions use ε ≤ 1e-4

## Self-Check: PASSED

- Key artifacts exist on disk (`resolve.ts`, `physics.paddle.test.ts`)
- `git log --grep=02-03` returns ≥2 commits
- All task acceptance criteria re-verified green
- Did not modify `src/core/index.ts`, `sweep.ts`, `integrate.ts`, or `broadphase.ts`

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
