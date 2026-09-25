---
phase: 02-headless-core-simulation
plan: 02
subsystem: simulation
tags: [CCD, sweep, Minkowski, broadphase, integrate, PHYS-02, worklet]

requires:
  - phase: 02-headless-core-simulation
    provides: World SoA, constants (MAX_BALL_SPEED, BALL_RADIUS), typed Hit (02-01)
provides:
  - sweepCircleAabb Minkowski TOI + face/corner normals
  - advanceBall SoA integrate helper
  - forEachBrickCandidate grid cell walk (D-12)
  - PHYS-02 Vitest unit coverage (walls/paddle/brick/corner/miss)
affects: [02-03 paddle english, 02-04 stepWorld CCD loop, 02-05 tunneling props]

tech-stack:
  added: []
  patterns:
    - Minkowski expand AABB by radius then ray-slab segment for TOI in [0,1]
    - Corner normals via closest-point on original AABB (radial)
    - Grid broadphase walks cellToBrick only — no quadtree
    - Deep-import physics modules until barrel lands in 02-04

key-files:
  created:
    - src/core/physics/sweep.ts
    - src/core/physics/broadphase.ts
    - src/core/physics/integrate.ts
    - tests/physics.sweep.test.ts
  modified: []

key-decisions:
  - "Separating normal = normalize(impactCenter − closestPointOnAabb); slab face fallback when radial degenerates"
  - "Broadphase uniqueness via first-occurrence scan in the candidate window (zero alloc)"
  - "Did not edit src/core/index.ts — barrel owned by 02-04; tests deep-import"

patterns-established:
  - "physics/ nested worklet modules with inline numeric literals"
  - "T-02-01 early-out: non-finite sweep inputs → hit=false"

requirements-completed: [PHYS-02, PHYS-03]

duration: 2min
completed: 2026-09-20
---

# Phase 02 Plan 02: Swept CCD Primitives Summary

**Minkowski swept circle-vs-AABB with face/corner normals, ball integrate helper, and grid-cell broadphase — green under PHYS-02 Vitest fixtures at MAX_BALL_SPEED**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T03:43:58Z
- **Completed:** 2026-09-20T03:46:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- RED then GREEN TDD for swept hits against walls, paddle AABB, single brick, corner, miss, and NaN guard
- Shipped `sweepCircleAabb`, `advanceBall`, and `forEachBrickCandidate` as `'worklet'` pure modules
- Grid broadphase only (D-12); no paddle english; barrel left for 02-04

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — physics.sweep unit tests** - `9a95685` (test)
2. **Task 2: GREEN — integrate + sweepCircleAabb + broadphase** - `197a8c4` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `src/core/physics/sweep.ts` — Minkowski expand + ray slab TOI; face/corner normals; finite-input guard
- `src/core/physics/integrate.ts` — `advanceBall(world, i, t)` SoA position += vel × t
- `src/core/physics/broadphase.ts` — uniform grid cell walk over `cellToBrick`; unique visit
- `tests/physics.sweep.test.ts` — PHYS-02 deep-import unit suite (8 cases)

## Decisions Made

- Radial normal from closest point on original AABB; slab enter-face when radial length ≈ 0
- Reject grazing contacts where `dot(displacement, n) >= 0` unless already overlapping
- Broadphase dedupes brick indices without heap alloc via first-occurrence scan
- Tests deep-import `../src/core/physics/sweep` to avoid wave-2 race on the barrel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 02-03 paddle english / resolve and 02-04 full `stepWorld` CCD wiring
- Property tunneling suite (2× max speed) remains plan 02-05
- `src/core/index.ts` must not be touched until 02-04 barrel consolidation

## Verification Results

- `npx vitest run tests/physics.sweep.test.ts` — 8 passed
- `npx eslint src/core` — exit 0
- `npm run test:core` — 22 passed (5 files)
- No `Math.random` under `src/core/physics`

## Self-Check: PASSED

- Key artifacts exist on disk (`sweep.ts`, `broadphase.ts`, `integrate.ts`, `physics.sweep.test.ts`)
- `git log --grep=02-02` returns ≥2 commits
- All task acceptance criteria re-verified green

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
