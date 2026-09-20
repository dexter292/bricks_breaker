---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 00
subsystem: testing
tags: [vitest, nyquist, wave-0, stubs, run-rules]

requires:
  - phase: 04-levels-data-driven-compile-spatial
    provides: Vitest infra + existing rules.lives/win suites
provides:
  - Wave 0 it.todo stubs for scoring/pickups/effects/multiball/stall
  - Last-ball lives stub rewrite (no any-BALL_OUT assertions)
  - wave_0_complete: true in 05-VALIDATION.md
affects:
  - 05-01 through 05-06 (automated verify targets)
  - RUN-01 PWR-01 PWR-02 PWR-03 PHYS-07

tech-stack:
  added: []
  patterns:
    - "Wave 0 stubs import only { describe, it } from vitest; it.todo titles only"

key-files:
  created:
    - tests/rules.scoring.test.ts
    - tests/rules.pickups.test.ts
    - tests/rules.effects.test.ts
    - tests/rules.multiball.test.ts
    - tests/rules.stall.test.ts
  modified:
    - tests/rules.lives.test.ts
    - .planning/phases/05-run-rules-score-combo-power-ups-anti-stall/05-VALIDATION.md

key-decisions:
  - "Lives suite is stubs-only until Plan 04; no applyLivesFromEvents import"
  - "hashWorld golden-replay Wave 0 box left unchecked (Plan 01)"

patterns-established:
  - "Phase 5 Nyquist stubs: describe + it.todo, no unfinished core/rules imports"

requirements-completed: [RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07]

duration: 2min
completed: 2026-09-20
---

# Phase 5 Plan 00: Wave 0 Nyquist Stubs Summary

**Vitest `it.todo` stubs for scoring/pickups/effects/multiball/stall plus last-ball lives rewrite so Plans 01–06 have automated verify targets.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T09:41:18Z
- **Completed:** 2026-09-20T09:42:30Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments
- Created five Wave 0 stub suites (29 `it.todo` total across scoring/pickups/effects/multiball/stall/lives)
- Removed locked-wrong any-BALL_OUT → −life assertions from `rules.lives.test.ts`
- Marked `wave_0_complete: true` and checked Wave 0 boxes in `05-VALIDATION.md`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 it.todo stubs for scoring/pickups/effects/multiball/stall** - `2602fae` (test)
2. **Task 2: Rewrite lives.test.ts to last-ball todos + update VALIDATION.md** - `2c835f0` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `tests/rules.scoring.test.ts` — RUN-01 score/combo stubs
- `tests/rules.pickups.test.ts` — PWR-01/03 drop/catch/miss stubs
- `tests/rules.effects.test.ts` — PWR-02 expand refresh/expire stubs
- `tests/rules.multiball.test.ts` — PWR-01 +2 spawn / maxBalls stubs
- `tests/rules.stall.test.ts` — PHYS-07 tier/freeze/determinism stubs
- `tests/rules.lives.test.ts` — last-ball life todos (no expects)
- `.planning/phases/05-run-rules-score-combo-power-ups-anti-stall/05-VALIDATION.md` — Wave 0 complete

## Decisions Made
- Lives file imports only vitest; Plan 04 renames API to `applyLivesFromBallCount`
- Left "Extend hashWorld + golden replay" Wave 0 box unchecked for Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None

## Known Stubs
Intentional Wave 0 stubs (Nyquist scaffolding — Plans 02–05 implement):

| File | Stub | Reason |
|------|------|--------|
| `tests/rules.scoring.test.ts` | 5× `it.todo` | Plan 02 fills RUN-01 |
| `tests/rules.pickups.test.ts` | 5× `it.todo` | Plan 03 fills PWR-01/03 |
| `tests/rules.effects.test.ts` | 4× `it.todo` | Plan 03 fills PWR-02 |
| `tests/rules.multiball.test.ts` | 4× `it.todo` | Plan 03 fills PWR-01 spawn |
| `tests/rules.stall.test.ts` | 6× `it.todo` | Plan 05 fills PHYS-07 |
| `tests/rules.lives.test.ts` | 5× `it.todo` | Plan 04 fills last-ball lives |

## Next Phase Readiness
Plans 01–06 can target these files with real assertions; lives no longer encode deprecated BALL_OUT semantics.

## Self-Check: PASSED

- All 7 key files found on disk
- Commits `2602fae` and `2c835f0` present in git log
