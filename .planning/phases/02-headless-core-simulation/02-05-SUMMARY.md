---
phase: 02-headless-core-simulation
plan: 05
subsystem: testing
tags: [fast-check, property-tests, tunneling, golden-replay, PHYS-02, PHYS-03, PHYS-04, PHYS-06, D-05, D-14]

requires:
  - phase: 02-headless-core-simulation
    provides: stepWorld CCD, resolvePaddleEnglish, reflectVelocity, hashWorld, loadTestGrid (02-01…02-04)
provides:
  - PROP-TUNNEL / PROP-SPEED / PROP-CLAMP property suites at Nyquist minima
  - Golden-replay chunking identity + PROP-DETERM
  - Phase 2 physics merge gate (2× tunneling + fixed-step hash)
affects: [Phase 3 host accumulator, Phase 4 levels]

tech-stack:
  added: []
  patterns:
    - Dense grid with spatial cellToBrick aligned to broadphase cols×rows
    - Dual oracle: center-not-in-brick + free-segment crossing → hit or earlier TOI stop
    - runChunked host helper: only FIXED_DT; Node-stable hashWorld (not cross-device)

key-files:
  created:
    - tests/physics.tunneling.prop.test.ts
    - tests/physics.golden-replay.test.ts
  modified: []

key-decisions:
  - "Dense tunneling grid uses custom 12×20 spatial mapping (not loadTestGrid 1-row pack) so broadphase finds bricks"
  - "PROP-SPEED/CLAMP exercise resolve paths directly; PROP-TUNNEL drives stepWorld at 2× MAX_BALL_SPEED"
  - "hashWorld documented as Node-stable same-process identity, not cross-device bit lock"

patterns-established:
  - "Property suites via @fast-check/vitest test.prop with Nyquist numRuns"
  - "Golden-replay: N×1 vs random partition of FIXED_DT steps → identical hash + SoA scalars"

requirements-completed: [PHYS-02, PHYS-03, PHYS-04, PHYS-06]

duration: 3min
completed: 2026-09-20
---

# Phase 02 Plan 05: Property Suites + Golden-Replay Summary

**fast-check PROP-TUNNEL at 2× MAX_BALL_SPEED (dual oracle), PROP-SPEED/CLAMP, and FIXED_DT golden-replay chunking identity — Phase 2 physics gate green**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T03:51:10Z
- **Completed:** 2026-09-20T03:54:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- PROP-TUNNEL (100 runs) fires balls at `2 * MAX_BALL_SPEED` through a dense unbreakable grid with dual-oracle checks
- PROP-SPEED (50) and PROP-CLAMP (50) cover paddle/wall/brick resolve invariants (PHYS-04 / D-02 / D-03)
- Golden-replay + PROP-DETERM (20): same seed+intents under different FIXED_DT chunkings → identical `hashWorld` and world scalars
- Full `npm test` + `npx eslint src/core` green; purity still bans `Math.random`

## Task Commits

Each task was committed atomically:

1. **Task 1: Tunneling + clamp + speed property tests** - `8fecfeb` (test)
2. **Task 2: Golden-replay chunking + purity/smoke final gate** - `db0eee1` (test)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `tests/physics.tunneling.prop.test.ts` — PROP-TUNNEL / PROP-SPEED / PROP-CLAMP
- `tests/physics.golden-replay.test.ts` — D-14 chunking identity + PROP-DETERM

Purity/smoke unchanged (exports stable from 02-04); both remain green under the full suite gate.

## Decisions Made

- Built dense grid with `gridCols=12` / `gridRows=20` and spatial `cellToBrick` so broadphase matches brick placement (loadTestGrid’s 1-row pack would miss candidates)
- Speed/clamp props call `resolvePaddleEnglish` / `reflectVelocity` directly; tunneling props exercise production `stepWorld`
- Documented Node-stable hash (not cross-device bit lock) in golden-replay header comment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — MAX_BALL_SPEED=720 did not require retune; PROP-TUNNEL completed well under the 60s Nyquist ceiling (~0.5s locally).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 physics gate closed: fixed-step golden-replay, 2× tunneling, paddle clamps, purity/RNG bans
- Ready for Phase 3 host loop / gestures consuming `stepWorld` + FIXED_DT accumulator (no leftover partial dt)

## Verification Results

- `npx vitest run tests/physics.tunneling.prop.test.ts` — 3 passed
- `npx vitest run tests/physics.golden-replay.test.ts` — 3 passed
- `npm test` — 8 files, 31 passed
- `npx eslint src/core` — exit 0

## Self-Check: PASSED

- Key artifacts exist (`physics.tunneling.prop.test.ts`, `physics.golden-replay.test.ts`)
- `git log --grep=02-05` returns ≥2 task commits
- All task acceptance criteria re-verified green
- Did not modify STATE.md or ROADMAP.md (orchestrator-owned)

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
