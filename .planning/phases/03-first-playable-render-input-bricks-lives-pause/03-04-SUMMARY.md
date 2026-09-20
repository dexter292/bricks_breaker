---
phase: 03-first-playable-render-input-bricks-lives-pause
plan: 04
subsystem: runtime
tags: [useGameLoop, stepRun, AppState, freeze, GameLoopHandle, PLT-01, PHYS-05]

requires:
  - phase: 03-00
    provides: resetAccumulator / clampFrameDt / shouldFreezeForUiPhase
  - phase: 03-01
    provides: stepRun / resetWorld / loadPhase3Grid / dockBall / SimPhase
  - phase: 03-02
    provides: letterboxed recordFrame entity renderer
provides:
  - useGameLoop playable host with Intent SharedValues → stepRun
  - GameLoopHandle {world, picture, surfaceSize, setActive, retry}
  - subscribeAppStateAutoPause with no auto-resume on active
affects:
  - 03-05 GameHost overlays / Resume countdown / retry wiring

tech-stack:
  added: []
  patterns:
    - setActive(false) always pairs with resetAccumulator; setActive(true) never from AppState
    - launchFlag edge-consumed after each stepRun substep
    - GameHost resets via GameLoopHandle.retry — app never imports core

key-files:
  created:
    - src/runtime/useGameLoop.ts
    - src/runtime/appStatePause.ts
  modified:
    - src/runtime/useSpikeLoop.ts

key-decisions:
  - "UiPhaseNum 0/1/2 shared with gesture map; WON/LOST freeze via simPhase belt"
  - "SpikeLoop thin wrapper creates blank Intent SVs until Plan 05 removes cliff"
  - "AppState inactive|background → setActive(false)+uiPhase=paused+onOsPause; active is no-op"

patterns-established:
  - "Pattern: GameLoopHandle is the only app→runtime reset surface (no core imports in app/)"
  - "Pattern: OS pause never auto-unfreezes — Resume→countdown owns setActive(true)"

requirements-completed: [PLT-01, PHYS-05]

duration: 2min
completed: 2026-09-20
---

# Phase 03 Plan 04: useGameLoop + AppState Freeze Summary

**Playable fixed-timestep host with stepRun Intent wiring, GameLoopHandle.{setActive,retry}, and AppState auto-pause that never auto-resumes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T04:51:03Z
- **Completed:** 2026-09-20T04:53:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Evolved spike loop into `useGameLoop`: paddleTarget/launchFlag → `stepRun`, letterboxed `recordFrame`, null-dt → 16.67ms
- Exported `GameLoopHandle` with `world`, `picture`, `surfaceSize`, `setActive`, `retry` so Plan 05 GameHost never imports core for reset
- Added `subscribeAppStateAutoPause` (inactive|background only) wired to freeze + accumulator reset + optional `onOsPause`

## Task Commits

Each task was committed atomically:

1. **Task 1: useGameLoop with stepRun Intent + freeze controls** — `7816118` (feat)
2. **Task 2: AppState auto-pause subscription (no auto-resume)** — `537834b` (feat)

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/runtime/useGameLoop.ts` — playable host + GameLoopHandle + applyFreeze helper
- `src/runtime/appStatePause.ts` — AppState change listener (no auto-resume)
- `src/runtime/useSpikeLoop.ts` — thin blank-Intent wrapper for SpikeScreen cliff harness

## Decisions Made

- Numeric `UiPhaseNum` (0 playing / 1 paused / 2 countdown) mirrors Plan 03 gesture map; terminal freeze uses `simPhase` WON/LOST belt inside the worklet
- Kept PERF overlay / `spriteTarget` extras on the return object so SpikeScreen still compiles until Plan 05
- AppState path sets `uiPhase` SharedValue to paused and calls `onOsPause` for React UI — never `setActive(true)` on foreground

## Deviations from Plan

None - plan executed exactly as written.

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint react-hooks/immutability on SharedValue Intent writes**
- **Found during:** Task 1 verification
- **Issue:** Compiler rule flagged `paddleTarget`/`launchFlag` mutations inside `useFrameCallback`
- **Fix:** Scoped `eslint-disable react-hooks/immutability` around the worklet (same D-14 pattern as prior spike)
- **Files modified:** `src/runtime/useGameLoop.ts`
- **Verification:** `npx eslint src/runtime/useGameLoop.ts` clean
- **Committed in:** `7816118`

**2. [Rule 1 - Bug] ESLint react-hooks/refs on ref write during render**
- **Found during:** Task 2 verification
- **Issue:** `onOsPauseRef.current = …` during render violated refs rule
- **Fix:** Pass `options.onOsPause` via effect dependency instead of render-time ref mutation
- **Files modified:** `src/runtime/useGameLoop.ts`
- **Verification:** eslint clean
- **Committed in:** `537834b`

---

**Total deviations:** 2 auto-fixed (Rule 1)
**Impact on plan:** Lint compliance only; behavior matches plan contract.

## Issues Encountered

None beyond the eslint fixes above. Parallel Plan 03 commits landed on the shared branch mid-wave; left untracked `src/input/index.ts` alone (out of scope).

## Known Stubs

None — `retry`/`setActive` are fully wired; overlays/countdown remain Plan 05.

## Threat Flags

None — T-03-01 (launch edge clear) and T-03-03 (AppState freeze, no auto-resume) implemented; no new network/auth/file surfaces.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 can compose `GameHost` from `GameLoopHandle` + `usePaddleGesture` without importing `src/core`
- Resume path must call countdown then `setActive(true)` — OS return stays paused
- SpikeScreen cliff wrapper can be deleted when GameHost replaces the spike host

## Self-Check: PASSED

- FOUND: `src/runtime/useGameLoop.ts`, `src/runtime/appStatePause.ts`, `src/runtime/useSpikeLoop.ts`
- FOUND commits: `7816118`, `537834b`
- FOUND: `GameLoopHandle` fields `world`, `picture`, `surfaceSize`, `setActive`, `retry`
- CONFIRMED: no `setActive(true)` in `appStatePause.ts`; no `src/input` imports under `src/runtime`

---
*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Completed: 2026-09-20*
