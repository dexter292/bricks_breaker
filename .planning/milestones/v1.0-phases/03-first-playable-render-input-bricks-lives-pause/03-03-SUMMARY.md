---
phase: 03-first-playable-render-input-bricks-lives-pause
plan: 03
subsystem: input
tags: [rngh, reanimated, SharedValue, Gesture.Race, relative-drag, tap-serve, PHYS-01, PHYS-05]

requires:
  - phase: 03-00
    provides: computeRelativePaddleX, shouldAcceptServeTap, feel constants (no core import)
provides:
  - usePaddleGesture Race(Pan, Tap) → paddleTarget / launchFlag / panActive SharedValues
  - src/input barrel for app/GameHost composition
affects:
  - 03-05 GameHost gesture wiring
  - 03-04 useGameLoop Intent.paddleX / launch consumption

tech-stack:
  added: []
  patterns:
    - RNGH Gesture.Race on UI thread writing SharedValues only (no runOnJS)
    - Relative-drag anchor from paddleTarget — never finger absoluteX
    - Mode gates via simPhase/uiPhase SharedValues inside worklets

key-files:
  created:
    - src/input/usePaddleGesture.ts
    - src/input/index.ts
  modified:
    - src/input/paddleIntent.ts
    - src/input/gestureGates.ts

key-decisions:
  - "gesture typed as ComposedGesture (Race return) — GestureType cast is invalid under RNGH 2.32"
  - "Phase gates checked inside worklets because .enabled() takes boolean only"
  - "Added 'worklet' directives to Plan 00 helpers so UI-thread calls stay portable"

patterns-established:
  - "Pattern: input layer owns RNGH; writes absolute paddle target + launch edge SharedValues"
  - "Pattern: serve via shouldAcceptServeTap; Resume never on playfield"

requirements-completed: [PHYS-01, PHYS-05]

duration: 2min
completed: 2026-09-20
---

# Phase 03 Plan 03: usePaddleGesture Race Pan+Tap Summary

**UI-thread `Gesture.Race(Pan, Tap)` hook writing relative-drag paddleTarget and mode-gated launchFlag SharedValues without importing core or hopping to JS**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T04:50:54Z
- **Completed:** 2026-09-20T04:52:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented `usePaddleGesture` with relative-drag Pan (anchor from paddleTarget) and docked-only Tap serve
- Composed via `Gesture.Race`; `panActive` blocks accidental serve; no Resume on playfield
- Exported stable `src/input` barrel for GameHost; eslint + Plan 00 helper tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: usePaddleGesture Race(Pan, Tap) SharedValue writers** — `4f29721` (feat)
2. **Task 2: input barrel export for app composition** — `97339cb` (feat)

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/input/usePaddleGesture.ts` — Race pan+tap → SharedValue handles
- `src/input/index.ts` — public re-exports (no core/runtime)
- `src/input/paddleIntent.ts` — `'worklet'` on clamp/compute for UI-thread calls
- `src/input/gestureGates.ts` — `'worklet'` on serve/resume predicates

## Decisions Made

- Typed `gesture` as RNGH `ComposedGesture` (Race return) instead of plan’s `GestureType` — TypeScript rejects the unsafe cast
- Gate pan/tap modes inside worklets reading `simPhase`/`uiPhase` SharedValues (`.enabled()` is boolean-only)
- Marked Plan 00 pure helpers with `'worklet'` so gesture handlers can call them on the UI thread without `runOnJS`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Worklet-mark Plan 00 helpers**
- **Found during:** Task 1
- **Issue:** `computeRelativePaddleX` / `shouldAcceptServeTap` lacked `'worklet'` and would not be callable from RNGH UI-thread handlers
- **Fix:** Added `'worklet'` directives to paddleIntent + gestureGates (Node/Vitest unaffected)
- **Files modified:** `src/input/paddleIntent.ts`, `src/input/gestureGates.ts`
- **Verification:** helper vitest suites still exit 0
- **Committed in:** `4f29721`

**2. [Rule 3 - Blocking] ComposedGesture vs GestureType**
- **Found during:** Task 1 typecheck
- **Issue:** `Gesture.Race` returns `ComposedGesture`; casting to `GestureType` fails under tsc
- **Fix:** Typed handle as `ComposedGesture`
- **Files modified:** `src/input/usePaddleGesture.ts`
- **Verification:** no TS2352 on the Race assignment
- **Committed in:** `4f29721`

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3)
**Impact on plan:** Correctness/type safety only; gesture contract unchanged.

## Issues Encountered

None beyond the deviations above. Parallel plan 04 commits landed in the same worktree between tasks; left those files untouched.

## Known Stubs

None

## Threat Flags

None — pan still routes through `computeRelativePaddleX` (T-03-01); tap still through `shouldAcceptServeTap` (T-03-02); no new network/auth/file surfaces.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 / GameHost can `GestureDetector` the returned `gesture` and feed `paddleTarget`/`launchFlag` into the loop Intent
- Manual UAT (Plan 05) still required for Race feel on device — no Node RNGH host

## Self-Check: PASSED

- FOUND: `src/input/usePaddleGesture.ts`, `src/input/index.ts`, `src/input/paddleIntent.ts`, `src/input/gestureGates.ts`
- FOUND commits: `4f29721`, `97339cb`

---
*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Completed: 2026-09-20*
