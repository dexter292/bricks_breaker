---
phase: 03-first-playable-render-input-bricks-lives-pause
plan: 00
subsystem: input
tags: [vitest, relative-drag, gesture-gates, freeze, accumulator, nyquist]

requires:
  - phase: 02-headless-core-simulation
    provides: Fixed-timestep runtime constants (FIXED_DT, MAX_FRAME_TIME, MAX_SUBSTEPS)
provides:
  - Pure computeRelativePaddleX / clampPaddleCenter (PHYS-01)
  - shouldAcceptServeTap / shouldAcceptResumeTap predicates (D-11)
  - resetAccumulator / clampFrameDt / shouldFreezeForUiPhase (PLT-01)
  - Wave 0 it.todo stubs for serve/lives/win/grid (Plan 01)
affects:
  - 03-01 core serve/lives/win rules
  - 03-03 paddle gesture wiring
  - 03-04 pause / AppState freeze path

tech-stack:
  added: []
  patterns:
    - Node-testable pure helpers in src/input and src/runtime (no RNGH/Skia/AppState)
    - Pass logicalWidth as arg — input never imports core (LC-05)
    - Wave 0 it.todo stubs colocated for Nyquist VALIDATION file checklist

key-files:
  created:
    - src/input/constants.ts
    - src/input/paddleIntent.ts
    - src/input/gestureGates.ts
    - src/runtime/freeze.ts
    - tests/input.paddle-intent.test.ts
    - tests/input.gesture-gates.test.ts
    - tests/runtime.freeze.test.ts
    - tests/runtime.accumulator-reset.test.ts
    - tests/rules.serve.test.ts
    - tests/rules.lives.test.ts
    - tests/rules.win.test.ts
    - tests/levels.phase3-grid.test.ts
  modified: []

key-decisions:
  - "Discretion defaults locked: PADDLE_GAIN=1.25, SMOOTH_ALPHA=0.45, LOGICAL_WIDTH_VU=360"
  - "Non-finite / zero camScale returns prevTarget unchanged (T-03-01)"
  - "Resume only when fromResumeControl — playfield never resumes (D-11/D-15)"

patterns-established:
  - "Pattern: relative-drag math lives in input/ as pure functions for Vitest"
  - "Pattern: freeze/accumulator policy extracted to runtime/freeze.ts without RN lifecycle imports"
  - "Pattern: Wave 0 Nyquist stubs use it.todo so suites stay green until Plan 01"

requirements-completed: [PHYS-01, PHYS-05, PLT-01]

duration: 2min
completed: 2026-09-20
---

# Phase 03 Plan 00: Wave 0 Nyquist Input/Freeze Scaffold Summary

**Node-testable relative-drag, serve/resume gates, and freeze/accumulator helpers with green Vitest suites plus Plan 01 `it.todo` stubs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T04:45:13Z
- **Completed:** 2026-09-20T04:46:38Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Extracted PHYS-01 relative-drag math (`computeRelativePaddleX`) with clamp + non-finite guards
- Encoded D-11 serve/resume gate predicates without RNGH
- Shipped PLT-01 freeze helpers (`resetAccumulator`, `clampFrameDt`, `shouldFreezeForUiPhase`) with no-catch-up stall test
- Added Wave 0 `it.todo` stubs for serve/lives/win/grid so VALIDATION file checklist exists

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 RED:** `7dcc9ab` (test) — failing paddle-intent + gesture-gate tests
2. **Task 1 GREEN:** `a94ffe9` (feat) — `src/input/*` helpers
3. **Task 2 RED:** `c05627e` (test) — failing freeze tests + rules/grid stubs
4. **Task 2 GREEN:** `f38150a` (feat) — `src/runtime/freeze.ts`
5. **Task 2 fix:** `2d64741` (fix) — remove AppState from freeze comment (acceptance)

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/input/constants.ts` — PADDLE_GAIN / SMOOTH_ALPHA / LOGICAL_WIDTH_VU defaults
- `src/input/paddleIntent.ts` — relative-drag → absolute paddle center
- `src/input/gestureGates.ts` — serve/resume tap predicates
- `src/runtime/freeze.ts` — accumulator reset + frame dt clamp + UI-phase freeze
- `tests/input.paddle-intent.test.ts` — PHYS-01 green suite
- `tests/input.gesture-gates.test.ts` — D-11 green suite
- `tests/runtime.freeze.test.ts` — PLT-01 freeze helpers
- `tests/runtime.accumulator-reset.test.ts` — no catch-up after stall
- `tests/rules.serve.test.ts` — Plan 01 todo stub
- `tests/rules.lives.test.ts` — Plan 01 todo stub
- `tests/rules.win.test.ts` — Plan 01 todo stub
- `tests/levels.phase3-grid.test.ts` — Plan 01 todo stub

## Decisions Made

- Locked discretion defaults from plan context (`PADDLE_GAIN=1.25`, `SMOOTH_ALPHA=0.45`)
- `LOGICAL_WIDTH_VU=360` mirrored in input constants — no core import (LC-05)
- Threat mitigations T-03-01/02/03 implemented in pure helpers as specified

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Strip AppState from freeze.ts comment**
- **Found during:** Task 2 verification
- **Issue:** Acceptance requires `rg AppState src/runtime/freeze.ts` finds no matches; initial file comment mentioned AppState
- **Fix:** Reworded comment to "no React Native lifecycle imports"
- **Files modified:** `src/runtime/freeze.ts`
- **Verification:** `rg -n "AppState" src/runtime/freeze.ts` empty
- **Committed in:** `2d64741`

---

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Comment-only acceptance compliance; no behavior change.

## Issues Encountered

None

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `tests/rules.serve.test.ts` | `it.todo` dock/launch | Plan 01 fills contract |
| `tests/rules.lives.test.ts` | `it.todo` BALL_OUT lives | Plan 01 fills contract |
| `tests/rules.win.test.ts` | `it.todo` last breakable win | Plan 01 fills contract |
| `tests/levels.phase3-grid.test.ts` | `it.todo` multi-HP+unbreakable grid | Plan 01 fills contract |

Intentional Wave 0 Nyquist scaffolding — plan goal achieved (stubs exist, suite green).

## TDD Gate Compliance

- RED commits present: `7dcc9ab`, `c05627e`
- GREEN commits present: `a94ffe9`, `f38150a`
- Optional REFACTOR: not needed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01 can flesh out rules/grid todos against core
- Plan 03 can wire `usePaddleGesture` calling these pure helpers
- Pause path can call `resetAccumulator` / `shouldFreezeForUiPhase` (no AppState in helper module)

## Self-Check: PASSED

- FOUND: `src/input/paddleIntent.ts`, `src/input/gestureGates.ts`, `src/input/constants.ts`, `src/runtime/freeze.ts`
- FOUND: all 8 test files
- FOUND commits: `7dcc9ab`, `a94ffe9`, `c05627e`, `f38150a`, `2d64741`

---
*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Completed: 2026-09-20*
