---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 01
subsystem: core
tags: [soa, hashWorld, compactBallPool, score, pickups, stall, deterministic]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: Wave 0 Nyquist stubs (05-00)
  - phase: 02-deterministic-physics-engine
    provides: World SoA allocate/reset/step/hash baseline
provides:
  - Phase 5 constants (SCORE_*, DROP_*, EXPAND_*, STALL_*, MAX_PICKUPS, spawn angles)
  - World score/combo/pickup SoA/stall fields + PickupType/EffectType
  - compactBallPool so activeBallCount is live dense count (D-12)
  - hashWorld mixes score/combo/pickups/stall
affects:
  - 05-02 scoring/combo rules
  - 05-03 pickups/effects/multiball
  - 05-04 lives from ball count
  - 05-05 anti-stall
  - RUN-01 PWR-01 PWR-02 PWR-03 PHYS-07

tech-stack:
  added: []
  patterns:
    - "activeBallCount === live dense prefix after compactBallPool (no mid-loop compact)"
    - "Phase 5 gameplay scalars mixed into hashWorld after effects block"

key-files:
  created: []
  modified:
    - src/core/constants.ts
    - src/core/types.ts
    - src/core/index.ts
    - src/core/allocate.ts
    - src/core/reset.ts
    - src/core/hash.ts
    - src/core/step.ts
    - tests/physics.golden-replay.test.ts

key-decisions:
  - "Locked SCORE_HIT=10, DROP_CHANCE=0.2, EXPAND_DURATION_TICKS=1200, STALL_IDLE_TICKS=960 verbatim"
  - "compactBallPool swaps SoA slots after CCD; BALL_OUT only marks inactive"
  - "hashWorld extended with score/combo/pickups/stall (T-05-01)"

patterns-established:
  - "Pickup SoA mirrors effects: allocate MAX_PICKUPS, reset clears active/count"
  - "D-12: never compact mid-ball-loop; pack once before tick++"

requirements-completed: [RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07]

duration: 2min
completed: 2026-09-20
---

# Phase 5 Plan 01: World Foundation + Ball Compact Summary

**World SoA extended for score/combo/pickups/stall with constants + hash mixes, and `compactBallPool` makes `activeBallCount` a live dense count after each step (D-12).**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T09:43:24Z
- **Completed:** 2026-09-20T09:45:00Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments
- Added Phase 5 constants and `PickupType` / `EffectType`; extended `World` with score, combo, pickup SoA, stall scalars
- Wired allocate/reset defaults; `hashWorld` mixes all new gameplay fields
- Implemented `compactBallPool` after CCD; golden-replay + purity green with D-12 assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 5 constants + World type fields** - `6fb238d` (feat)
2. **Task 2: allocate/reset/hash + compactBallPool in stepWorld** - `9bb45d0` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/core/constants.ts` — SCORE_*, DROP_*, EXPAND_*, STALL_*, MAX_PICKUPS, spawn angles
- `src/core/types.ts` — PickupType/EffectType; World score/combo/pickup/stall fields
- `src/core/index.ts` — barrel exports for new constants and enums
- `src/core/allocate.ts` — pickup SoA allocation; score=0, combo=1, stall zeros
- `src/core/reset.ts` — clear pickups/score/combo/stall like effects
- `src/core/hash.ts` — mix score/combo/pickups/stall after effects
- `src/core/step.ts` — `compactBallPool` before tick++
- `tests/physics.golden-replay.test.ts` — D-12 inactive sole-ball → activeBallCount 0

## Decisions Made
- Encoded locked RESEARCH values verbatim (no discretionary retuning)
- Compact only after the per-ball CCD loop; early invalid-dt path skips compact (no ball mutations that tick)
- Extended golden-replay with a one-off D-12 expect rather than a separate suite

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None

## Known Stubs
No new stubs. Wave 0 `it.todo` suites from 05-00 remain intentional until Plans 02–05.

## Threat Flags
None — hash extension matches T-05-01 mitigate; no new network/auth/file surfaces.

## Next Phase Readiness
Rules modules (scoring, pickups, stall, lives) can import World fields and rely on dense `activeBallCount` after each `stepWorld`.

## Self-Check: PASSED

- Key files found: constants, types, index, allocate, reset, hash, step, golden-replay test
- Commits `6fb238d` and `9bb45d0` present in git log
