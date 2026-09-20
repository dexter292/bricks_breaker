---
phase: 02-headless-core-simulation
plan: 01
subsystem: simulation
tags: [World, SoA, mulberry32, event-ring, hashWorld, FNV-1a, worklet, PHYS-06]

requires:
  - phase: 02-headless-core-simulation
    provides: D-13 purity ESLint/Vitest gates, nested core boundaries, fast-check pins (02-00)
provides:
  - Full World SoA (N-ball, paddle, brick grid slots, dual RNG, event ring, empty effects)
  - allocateWorld / resetWorld / loadTestGrid / stub stepWorld / hashWorld
  - mulberry32 nextU32/nextFloat and drop-newest pushEvent
  - Spike harness compile-safe on World with blank SkPicture field
affects: [02-02 CCD sweep, 02-03 paddle english, 02-04 stepWorld integration, golden-replay]

tech-stack:
  added: []
  patterns:
    - World SoA prealloc once; worklet-inline literals matching constants.ts
    - Dual mulberry32 slots on World (never share streams)
    - Fixed event ring drop-newest + evOverflow
    - FNV-1a hashWorld over SoA Uint32 views + scalars

key-files:
  created:
    - src/core/rng/mulberry32.ts
    - src/core/events/ring.ts
    - src/core/hash.ts
    - src/core/reset.ts
    - tests/physics.world-shape.test.ts
  modified:
    - src/core/types.ts
    - src/core/constants.ts
    - src/core/allocate.ts
    - src/core/step.ts
    - src/core/index.ts
    - tests/core.smoke.test.ts
    - src/runtime/useSpikeLoop.ts
    - src/render/recordSprites.ts

key-decisions:
  - "Replace SpikeWorld entirely; blank playfield + overlay until Phase 3"
  - "Lock discretionary caps: MAX_BALLS=8, EVENT_RING_CAPACITY=128, MAX_EFFECTS=16, MAX_BALL_SPEED=720"
  - "Stub stepWorld only clamps finite paddleX + tick; CCD deferred to Wave 2"

patterns-established:
  - "core/{rng,events} nested modules with 'worklet' hot paths"
  - "Host fixed-timestep loop stays in runtime; core accepts exact FIXED_DT only"
  - "Intent paddleX non-finite → keep prior paddle (T-02-01 stub)"

requirements-completed: [PHYS-06]

duration: 3min
completed: 2026-09-20
---

# Phase 02 Plan 01: World SoA + Dual RNG + Event Ring Summary

**Preallocated World SoA with dual mulberry32, drop-newest event ring, FNV-1a hashWorld, and thin spike harness on a blank playfield**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T03:40:08Z
- **Completed:** 2026-09-20T03:42:59Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Replaced SpikeWorld with full World contracts (Intent/Hit/EventCode/BrickFlags) and Phase 2 constants
- Shipped allocate/reset, stub stepWorld, dual RNG, event ring, and Node-stable hashWorld
- Migrated useSpikeLoop + recordSprites so the app typechecks with blank field + overlay metrics

## Task Commits

Each task was committed atomically:

1. **Task 1: World types, constants, mulberry32, event ring, hash** - `50c20b6` (feat)
2. **Task 2: allocate/reset + world-shape tests + stub stepWorld** - `07b0528` (test) + `6e2b4a9` (feat)
3. **Task 3: Thin spike harness migration** - `1f6377b` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `src/core/types.ts` — World / Intent / Hit; EventCode; BrickFlags; HitKind
- `src/core/constants.ts` — FIXED_DT, caps, speeds, clamps, LOGICAL_*, y-down note
- `src/core/rng/mulberry32.ts` — nextU32 / nextFloat on Uint32Array slots
- `src/core/events/ring.ts` — pushEvent drop-newest + evOverflow; clearEvents
- `src/core/hash.ts` — FNV-1a hashWorld over SoA + scalars + RNG + ring cursors
- `src/core/allocate.ts` — allocateWorld(capacities?) prealloc SoA, one active ball
- `src/core/reset.ts` — resetWorld / loadTestGrid (zero alloc, D-11)
- `src/core/step.ts` — stub stepWorld (paddle clamp + tick; no CCD)
- `src/core/index.ts` — public barrel without SpikeWorld/stepStub
- `tests/physics.world-shape.test.ts` — D-07/D-08/D-09 shape + overflow
- `tests/core.smoke.test.ts` — stepWorld + finite ballX
- `src/runtime/useSpikeLoop.ts` — World + stepWorld; host accumulator preserved
- `src/render/recordSprites.ts` — blank field fill + overlay only

## Decisions Made

- Discretionary constants locked per plan context (MAX_BALLS=8, EVENT_RING_CAPACITY=128, MAX_EFFECTS=16, MAX_BALL_SPEED=720, PADDLE_ANGLE_CLAMP_DEG=62)
- SpikeWorld removed entirely; harness draws blank logical field until Phase 3
- Static Intent `{ paddleX: w.paddleX, launch: 0 }` per substep (no gestures)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Closed-over Intent mutation failed react-hooks/immutability**
- **Found during:** Task 3 (Thin spike harness migration)
- **Issue:** Mutating a render-scoped `intent` object inside `useFrameCallback` triggered ESLint `react-hooks/immutability`
- **Fix:** Pass a fresh `{ paddleX: w.paddleX, launch: 0 }` literal into `stepWorld` each substep
- **Files modified:** `src/runtime/useSpikeLoop.ts`
- **Verification:** `npx eslint src/runtime/useSpikeLoop.ts` exits 0; `tsc --noEmit` exits 0
- **Committed in:** `1f6377b` (Task 3)

---

**Total deviations:** 1 auto-fixed (1 bug/lint)
**Impact on plan:** No scope creep; preserves static-Intent intent of the plan while satisfying the harness lint gate.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for Wave 2 CCD plans (`sweep` / `resolve` / full `stepWorld`)
- World shape, dual RNG, event ring, and hashWorld surface locked for golden-replay
- Spike app remains compile-safe with blank field; no gameplay UI added

## Verification Results

- `npx vitest run tests/physics.world-shape.test.ts tests/core.smoke.test.ts tests/core.purity.test.ts` — 8 passed
- `npx tsc --noEmit` — exit 0
- `npx eslint src/core` — exit 0
- `npm run test:core` — exit 0
- Host loop still contains accumulator / maxSubsteps / maxFrameTime / fixedDt

## Self-Check: PASSED

- Key artifacts exist on disk
- `git log --grep=02-01` returns ≥1 commit
- All task acceptance criteria re-verified green

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
