---
phase: C2-level-select-stars-replay
plan: 01
subsystem: storage
tags: [ProgressBlob, v3, migrate, recordRunEnd, stars, AsyncStorage, vitest]

requires:
  - phase: C2-level-select-stars-replay
    provides: Pure computeStars / mergeLevelBest / selectRowState (C2-00)
  - phase: C1-progress-storage
    provides: ProgressStore substrate + C1 Human UAT approved 2026-09-25
provides:
  - ProgressBlob v3 with nested LevelBest {score, stars?}
  - migrateOrDefault(v3,v2,v1) prefer-valid migrate-on-read
  - recordRunEnd sync memory merge + blob return
  - mergeHighWatermark never lowers score/stars
affects:
  - C2-02 SelectScreen snapshot consumers
  - C2-03 PlayingHost handleRunEnded / ResultOverlay stars

tech-stack:
  added: []
  patterns:
    - Nested LevelBest clone + field-by-field sanitize (T-C2-01)
    - Sync recordRunEnd then void persist (D-10 / F-26)
    - Leave v1/v2 keys on disk after write-through v3

key-files:
  created:
    - src/services/storage/watermark.ts
  modified:
    - src/services/storage/types.ts
    - src/services/storage/parseBlob.ts
    - src/services/storage/migrateProgress.ts
    - src/services/storage/memoryStore.ts
    - src/services/storage/asyncStorageStore.ts
    - src/services/storage/index.ts
    - tests/storage.progress-v3.test.ts
    - tests/storage.progress-v2.test.ts

key-decisions:
  - "C1 UAT gate satisfied via C1-VALIDATION Human UAT: approved 2026-09-25 — Task 2 proceeded without wait"
  - "PROGRESS_KEY_V2 kept for migrate reads; v1/v2 keys never deleted"
  - "mergeHighWatermark extracted to watermark.ts and exported for unit coverage"
  - "progress-v2 suite rewritten around parseProgressV2Result + 3-arg migrateOrDefault"

patterns-established:
  - "parseProgressResult accepts v===3 only; parseProgressV2Result for migrate input"
  - "recordRunEnd: win→computeStars+mergeLevelBest+unlock; lose→score max only; return clone"

requirements-completed: [N-PROG-03]

duration: 3min
completed: 2026-09-25
---

# Phase C2 Plan 01: ProgressBlob v3 Migrate + Store Summary

**ProgressBlob v3 with nested LevelBest, fail-soft v1/v2→v3 migrate-on-read, and sync `recordRunEnd` returning a cloned blob for Results**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-25T01:09:00Z
- **Completed:** 2026-09-25T01:12:11Z
- **Tasks:** 2 (Task 1 gate pre-satisfied; Task 2 TDD RED+GREEN)
- **Files modified:** 9

## Accomplishments

- Cleared C1 device UAT gate (`Human UAT: approved 2026-09-25`) before any `@nbb/progress/v3` write-through
- Flipped schema to `v: 3` / `@nbb/progress/v3` with `bestByLevel[id] = { score, stars? }`
- Implemented prefer-valid migrate (v3 → v2 number→`{score}` omit stars → v1 bestScore) without deleting legacy keys
- `recordRunEnd` merges win stars + unlock in one memory update and returns a clone before disk await
- All Plan-00 storage `it.todo`s converted to GREEN; three storage Vitest suites exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate — C1 device UAT approved** - _(pre-satisfied; no commit)_ — `C1-VALIDATION.md` already records `Human UAT: approved 2026-09-25`
2. **Task 2 (RED): failing v3 migrate/store suite** - `8aab922` (test)
3. **Task 2 (GREEN): ProgressBlob v3 parse/migrate/store** - `8151faf` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `src/services/storage/types.ts` — `PROGRESS_VERSION=3`, `PROGRESS_KEY`, `PROGRESS_KEY_V2`, nested `ProgressBlob`, `recordRunEnd`
- `src/services/storage/parseBlob.ts` — v3 parse + `parseProgressV2Result` for migrate input
- `src/services/storage/migrateProgress.ts` — `migrateOrDefault(v3,v2,v1)`
- `src/services/storage/watermark.ts` — exported `mergeHighWatermark` (score+stars max; never drop stars)
- `src/services/storage/memoryStore.ts` — nested clone, `recordRunEnd`, score-only `recordLevelBest`
- `src/services/storage/asyncStorageStore.ts` — hydrate prefer v3; migrate-on-read; write-through v3 once
- `src/services/storage/index.ts` — barrel exports
- `tests/storage.progress-v3.test.ts` — GREEN migrate/parse/watermark/recordRunEnd
- `tests/storage.progress-v2.test.ts` — slimmed to catalog + v2 migrate-input + nested store basics

## Decisions Made

- Task 1 treated as satisfied from existing validation line (orchestrator/user: approved) — no second wait
- Extracted `mergeHighWatermark` to `watermark.ts` so F-26 nested watermark rules are unit-testable without AsyncStorage
- Kept C1 factory names `createAsyncStorage*Store` (not AsyncStorage 3.x `AsyncStorage.create`)
- Honored R-30 / D-25: did not revert unlock-chain `selectRowState`; migrate omits stars

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extracted mergeHighWatermark to exportable module**
- **Found during:** Task 2 (watermark unit coverage)
- **Issue:** Plan required mergeHighWatermark tests but function was private inside asyncStorageStore; Vitest has no AsyncStorage native under `VITEST`
- **Fix:** Moved to `watermark.ts` and exported via barrel / asyncStore re-export
- **Files modified:** `src/services/storage/watermark.ts`, `asyncStorageStore.ts`, `index.ts`
- **Verification:** progress-v3 mergeHighWatermark cases pass
- **Committed in:** `8151faf`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Enables required watermark assertions without AsyncStorage mock; no scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for C2-02 (SelectScreen) — `getSnapshot()` returns v3 nested bests; `selectRowState` already R-30-aware
- Ready for C2-03 — wire `recordRunEnd` into PlayingHost / ResultOverlay stars + Next gate
- Hosts still compile: `getBestForLevel` returns nested `.score`; `recordLevelBest` remains score-only

## TDD Gate Compliance

- RED: `8aab922` test(C2-01) — failing migrate/parse/store suite
- GREEN: `8151faf` feat(C2-01) — implementation passes

## Self-Check: PASSED

- All key files found on disk
- Commits `8aab922`, `8151faf` present
- Vitest `progress-v3` + `progress-v2` + `personal-best` exit 0 (52 tests)
- No `it.todo` in progress-v3; no `removeItem` of legacy keys; no `AsyncStorage.create`

---
*Phase: C2-level-select-stars-replay*
*Completed: 2026-09-25*
