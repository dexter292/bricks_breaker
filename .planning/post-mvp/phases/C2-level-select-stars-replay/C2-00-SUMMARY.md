---
phase: C2-level-select-stars-replay
plan: 00
subsystem: storage
tags: [stars, LevelBest, vitest, nyquist, progress-v3-prep]

requires:
  - phase: C1-progress-storage
    provides: ProgressBlob v2 substrate, isUnlocked, unlock helpers
provides:
  - Pure computeStars / mergeLevelBest / selectRowState
  - Additive StarCount + LevelBest types (v2 ProgressBlob unchanged)
  - Wave 0 Nyquist stubs for migrate/store/Select/Next/bake/Results
affects:
  - C2-01 progress v3 migrate/store
  - C2-02 SelectScreen
  - C2-03 Next / ResultOverlay / bake gate

tech-stack:
  added: []
  patterns:
    - Pure storage helpers (no I/O/React) colocated like compareBest/unlock
    - Wave 0 it.todo stubs reserve Nyquist paths before implementation

key-files:
  created:
    - src/services/storage/stars.ts
    - tests/storage.progress-v3.test.ts
    - tests/ui/SelectScreen.test.tsx
    - tests/ui/PlayingHost.next-bake.test.ts
    - tests/ui/ResultOverlay.test.tsx
  modified:
    - src/services/storage/types.ts
    - src/services/storage/index.ts
    - .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md

key-decisions:
  - "StarCount/LevelBest additive on types.ts; ProgressBlob stays v2 until Plan 01"
  - "stars omitted until first win; lose preserves prior stars via mergeLevelBest(null)"
  - "selectRowState cleared iff best.stars ∈ {1,2,3}"

patterns-established:
  - "stars.ts pure helpers: clamp lives→1–3; merge score always / stars on win only"
  - "Wave 0 Vitest: GREEN for stars; it.todo for migrate/store/UI Plans 01–03"

requirements-completed: [N-PROG-03, N-LVL-02, N-PROG-04]

duration: 1min
completed: 2026-09-24
---

# Phase C2 Plan 00: Stars Helpers + Wave 0 Nyquist Summary

**Pure `computeStars` / `mergeLevelBest` / `selectRowState` with LevelBest types, progress-v3 Vitest GREEN + Plan-01 todos, and UI stub suites — ProgressBlob still v2**

## Performance

- **Duration:** 1 min
- **Started:** 2026-09-24T16:27:34Z
- **Completed:** 2026-09-24T16:29:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Locked lives-based star formula (clamp 1–3, non-finite → 1) and LevelBest merge/row-state rules
- Additive `StarCount` / `LevelBest` types without flipping `PROGRESS_VERSION` / `ProgressBlob` to v3
- Nyquist Wave 0 complete: progress-v3 suite GREEN for stars; UI stubs + VALIDATION `wave_0_complete: true`

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): stars failing tests** - `3d0dafa` (test)
2. **Task 1 (GREEN): stars helpers + LevelBest** - `9ca81eb` (feat)
3. **Task 2: UI Nyquist stubs + VALIDATION Wave 0** - `24dc31c` (test)

**Plan metadata:** _(pending final docs commit)_

## Files Created/Modified

- `src/services/storage/stars.ts` — pure computeStars / mergeLevelBest / selectRowState
- `src/services/storage/types.ts` — StarCount + LevelBest (v2 ProgressBlob unchanged)
- `src/services/storage/index.ts` — barrel exports for new symbols
- `tests/storage.progress-v3.test.ts` — stars GREEN + 7 Plan-01 it.todo
- `tests/ui/SelectScreen.test.tsx` — N-LVL-02 stub todos
- `tests/ui/PlayingHost.next-bake.test.ts` — D-03 bake stub todos
- `tests/ui/ResultOverlay.test.tsx` — N-PROG-04 Next/stars stub todos
- `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md` — wave_0_complete

## Decisions Made

- Kept ProgressBlob at v2; Plan 01 owns schema bump and migrate/store GREEN
- Prefer omit `stars` until win (discretion aligned with D-05 / D-23)
- Cleared select row requires `stars` present — score-only best stays uncleared

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for C2-01 (v3 migrate/store) — todos reserved in progress-v3 suite
- Select / Next / ResultOverlay stubs reserved for Plans 02–03
- Do not write `@nbb/progress/v3` until C1 device UAT approved

## TDD Gate Compliance

- RED: `3d0dafa` test(C2-00) — failing stars suite
- GREEN: `9ca81eb` feat(C2-00) — stars helpers pass

## Self-Check: PASSED

- All key files found on disk
- Commits `3d0dafa`, `9ca81eb`, `24dc31c` present
- Vitest Wave 0 suites exit 0; ProgressBlob still v2; `wave_0_complete: true`

---
*Phase: C2-level-select-stars-replay*
*Completed: 2026-09-24*
