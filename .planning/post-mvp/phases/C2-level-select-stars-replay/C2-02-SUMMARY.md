---
phase: C2-level-select-stars-replay
plan: 02
subsystem: ui
tags: [SelectScreen, ShellPhase, ResultOverlay, Next, stars, GameHost, vitest]

requires:
  - phase: C2-level-select-stars-replay
    provides: ProgressBlob v3 getSnapshot + selectRowState (C2-01 / C2-00)
provides:
  - SelectScreen full-screen Levels list with three row states
  - ShellPhase title|select|playing with CERT/SOAK Select bypass
  - ResultOverlay optional win stars + gated onNext (omit not disable)
  - GameScreen stars/onNext pass-through
affects:
  - C2-03 PlayingHost levelId required + handleRunEnded Next bake

tech-stack:
  added: []
  patterns:
    - Mount-only getSnapshot for Select refresh (D-20)
    - Next omitted when onNext null/undefined (D-11)
    - CERT/SOAK never setShellPhase('select') (D-01)

key-files:
  created:
    - app/_components/SelectScreen.tsx
  modified:
    - app/_components/GameHost.tsx
    - app/_components/PlayingHost.tsx
    - app/_components/TitleScreen.tsx
    - src/runtime/overlays/ResultOverlay.tsx
    - src/runtime/GameScreen.tsx
    - tests/ui/SelectScreen.test.tsx
    - tests/ui/GameHost.test.tsx
    - tests/ui/ResultOverlay.test.tsx
    - tests/ui/GameScreen.test.tsx

key-decisions:
  - "TitleScreen chrome unchanged; only GameHost onPlay → select"
  - "PlayingHost accepts optional levelId (ignored until C2-03); GameHost passes CERT level-03 vs activeLevelId"
  - "Uncleared/legacy-cleared empty stars render as compact ☆☆☆ text for RTL queryability"

patterns-established:
  - "ShellPhase select branch between Title and Playing; Menu always → title"
  - "ResultOverlay showNext = win && typeof onNext === 'function'"

requirements-completed: [N-LVL-02, N-PROG-04]

duration: 4min
completed: 2026-09-25
---

# Phase C2 Plan 02: SelectScreen + Results Chrome Summary

**SelectScreen with three-state rows + ShellPhase `select`, and ResultOverlay win stars with gated Next (omit, never disable)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-25T01:13:09Z
- **Completed:** 2026-09-25T01:17:14Z
- **Tasks:** 2 (both TDD RED+GREEN)
- **Files modified:** 10

## Accomplishments

- Shipped `SelectScreen`: Levels heading, Back outline, 5 catalog rows, mount `getSnapshot()`, locked ignore, Best only when cleared + score present
- Extended `GameHost` to `title | select | playing`; Title Play → Select; Menu → Title; CERT initial playing + SOAK title↔playing only
- Evolved `ResultOverlay` / `GameScreen` for optional win stars and Next (`Play next level`) in Retry → Next? → Menu order
- All Plan-02 UI Vitest suites green (16 tests across Select/GameHost/Result/GameScreen)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): SelectScreen + GameHost shell tests** - `cfbbcad` (test)
2. **Task 1 (GREEN): SelectScreen + ShellPhase select** - `76fb062` (feat)
3. **Task 2 (RED): ResultOverlay Next + stars tests** - `acd45f3` (test)
4. **Task 2 (GREEN): ResultOverlay stars + gated Next** - `3afb014` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `app/_components/SelectScreen.tsx` — full-screen Select per UI-SPEC / D-17…D-23
- `app/_components/GameHost.tsx` — ShellPhase + activeLevelId + CERT/SOAK bypass
- `app/_components/PlayingHost.tsx` — optional `levelId` prop (forward-compat; source of truth in C2-03)
- `app/_components/TitleScreen.tsx` — unchanged (wiring only via GameHost)
- `src/runtime/overlays/ResultOverlay.tsx` — optional `stars` / `onNext`
- `src/runtime/GameScreen.tsx` — pass-through props
- `tests/ui/SelectScreen.test.tsx` — GREEN three states + locked + mount + Back
- `tests/ui/GameHost.test.tsx` — Title→Select→Playing→Menu→Title + CERT/SOAK source contract
- `tests/ui/ResultOverlay.test.tsx` — Next visibility + stars
- `tests/ui/GameScreen.test.tsx` — Next/stars pass-through contracts

## Decisions Made

- TitleScreen left untouched; only `GameHost` `onPlay` retargets to `'select'` (D-14)
- PlayingHost `levelId` optional and unused until Plan 03 required-prop + bake wiring
- Compact `☆☆☆` string for empty star lines so uncleared assertions stay stable under RN-web

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for C2-03: wire required `levelId`, `recordRunEnd` → Results stars, Next bake checklist, loadLevel default removal
- Select + Results chrome testable without PlayingHost Next yet (`onNext` optional)

## TDD Gate Compliance

- RED: `cfbbcad` test(C2-02) Select/GameHost; `acd45f3` test(C2-02) ResultOverlay/GameScreen
- GREEN: `76fb062` feat(C2-02) Select/shell; `3afb014` feat(C2-02) Results chrome

## Self-Check: PASSED

- All key files found on disk
- Commits `cfbbcad`, `76fb062`, `acd45f3`, `3afb014` present
- Vitest SelectScreen + GameHost + ResultOverlay + GameScreen exit 0 (16 tests)
- No toast/preview; no disabled Next; SOAK paths never `setShellPhase('select')`

---
*Phase: C2-level-select-stars-replay*
*Completed: 2026-09-25*
