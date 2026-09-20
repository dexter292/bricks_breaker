---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 03
subsystem: game-rules
tags: [pickups, effects, multiball, power-ups, rng, aabb, worklet]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: World SoA pickups/effects reserves, DROP_*/EXPAND_*/MULTIBALL_* constants, Wave 0 test stubs
provides:
  - applyOrRefreshExpand / stepEffects / derivePaddleWidth (PWR-02)
  - spawnMultiballFromPaddle with min(2, freeSlots) (PWR-01)
  - applyDropsFromBreaks + stepPickups AABB catch (PWR-01/03)
affects:
  - 05-04 stepRun + barrel wiring
  - lives life-reset cleanup of pickups/expand

tech-stack:
  added: []
  patterns:
    - "Pure core/rules modules imported directly by tests (no index.ts barrel yet)"
    - "Worklet-inlined literals matching constants.ts"
    - "Gameplay RNG only for drops; catch wires sibling helpers"

key-files:
  created:
    - src/core/rules/effects.ts
    - src/core/rules/multiball.ts
    - src/core/rules/pickups.ts
  modified:
    - tests/rules.effects.test.ts
    - tests/rules.multiball.test.ts
    - tests/rules.pickups.test.ts

key-decisions:
  - "Task order effects → multiball → pickups so catch can import helpers"
  - "Even/odd SoA slot index signs ±18°/±36° multiball angles"
  - "Barrel export + stepRun deferred to Plan 04"

patterns-established:
  - "Refresh stackPolicy for expand: update effectUntilTick only; derive paddleW from effect presence"
  - "Pickup catch deactivates then calls spawnMultiballFromPaddle / applyOrRefreshExpand"
  - "Drop sequence: nextFloat chance then nextFloat type; skip spawn if pool full"

requirements-completed: [PWR-01, PWR-02, PWR-03]

duration: 3min
completed: 2026-09-20
---

# Phase 05 Plan 03: Power-ups Rules Summary

**Pure `effects` / `multiball` / `pickups` modules: expand refresh×1.5 for 1200 ticks, `min(2,freeSlots)` spawn at ±18°/±36°, BREAK drops via gameplay RNG with AABB paddle catch**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T09:47:54Z
- **Completed:** 2026-09-20T09:51:02Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Expand effect with refresh stackPolicy; derive width 108; expire restores 72 with field clamp
- Multiball spawn capped at free slots; existing velocities untouched; finite angle guard
- Pickup drop/fall/miss/AABB catch wired to helpers; no cosmetic RNG / no magnetic pull

## Task Commits

Each task was committed atomically (TDD test → feat):

1. **Task 1: Expand effects** - `9cd9d3c` (test) + `08ee10d` (feat)
2. **Task 2: Multiball spawn** - `996643c` (test) + `2913df4` (feat)
3. **Task 3: Pickups drop/fall/catch** - `0ff1193` (test) + `4de0c88` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/core/rules/effects.ts` — applyOrRefreshExpand, stepEffects, derivePaddleWidth
- `src/core/rules/multiball.ts` — spawnMultiballFromPaddle
- `src/core/rules/pickups.ts` — applyDropsFromBreaks, stepPickups
- `tests/rules.effects.test.ts` — PWR-02 green
- `tests/rules.multiball.test.ts` — PWR-01 spawn green
- `tests/rules.pickups.test.ts` — PWR-01/03 drop/catch green

## Decisions Made

- Executed effects → multiball → pickups so pickup catch imports live helpers
- Multiball angle sign from SoA slot parity (odd −, even +); magnitudes 18° then 36°
- Left `src/core/index.ts` and `stepRun` untouched for Plan 04 Wave 2 ownership

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Float32 SoA precision broke strict multiball velocity asserts**
- **Found during:** Task 2 (GREEN)
- **Issue:** `toBe(123.45)` / `toBeCloseTo(..., 5)` failed on Float32Array storage
- **Fix:** Compare against stored Float32 values; loosen speed/angle asserts to 4 digits
- **Files modified:** `tests/rules.multiball.test.ts`
- **Verification:** `npx vitest run tests/rules.multiball.test.ts` green
- **Committed in:** `2913df4`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test harness only; spawn logic unchanged.

## Issues Encountered

None beyond Float32 assert precision above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 can barrel-export and wire into `stepRun` (score + pickups + effects + multiball)
- Unit surface for PWR-01/02/03 is green without step integration

## TDD Gate Compliance

- RED commits: `9cd9d3c`, `996643c`, `0ff1193`
- GREEN commits: `08ee10d`, `2913df4`, `4de0c88`

## Self-Check: PASSED
