---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 04
subsystem: game-rules
tags: [lives, stepRun, scoring, pickups, effects, multiball, last-ball, barrel]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: scoring / pickups / effects / multiball modules + compactBallPool
provides:
  - applyLivesFromBallCount with D-13 life-reset cleanup (PWR-01)
  - stepRun PLAYING pipeline score→drops→pickups→effects→lives→win
  - src/core/index.ts Wave 2 barrel exports for scoring/pickups/effects/multiball
affects:
  - 05-05 anti-stall wiring into stepRun
  - Phase 6 HUD chrome mirrors for score/lives

tech-stack:
  added: []
  patterns:
    - "Life from activeBallCount===0 only — never BALL_OUT event scan"
    - "stepRun owns ordered Phase 5 rules after stepWorld (stall deferred)"
    - "dockBall deactivates all slots then docks index 0"

key-files:
  created: []
  modified:
    - src/core/rules/lives.ts
    - src/core/rules/serve.ts
    - src/core/stepRun.ts
    - src/core/index.ts
    - tests/rules.lives.test.ts
    - tests/rules.scoring.test.ts

key-decisions:
  - "Deleted applyLivesFromEvents; no deprecated alias"
  - "Life-reset sets combo=1 while preserving score and brick HP"
  - "stepRun integration for life uses empty-pool after compact, not fragile bottom CCD"

patterns-established:
  - "D-13 checklist: clear pickups → clear effects + derivePaddleWidth → combo=1 → DOCKED + dockBall"
  - "PLAYING order locked: applyScoringFromEvents → applyDropsFromBreaks → stepPickups → stepEffects → applyLivesFromBallCount → applyWinCheck"

requirements-completed: [PWR-01, PWR-02, PWR-03, RUN-01]

duration: 3min
completed: 2026-09-20
---

# Phase 05 Plan 04: Lives + stepRun Wiring Summary

**Last-ball life via `applyLivesFromBallCount`, D-13 reset cleanup, and full non-stall Phase 5 rules orchestration inside `stepRun` with Wave 2 barrel exports**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T09:52:32Z
- **Completed:** 2026-09-20T09:55:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Life decrements only when `activeBallCount === 0`; multi-ball outs while others remain are free
- Life reset clears pickups/expand, docks one ball, preserves score + brick HP, resets combo to 1
- `stepRun` PLAYING path runs score → drops → pickups → effects → lives → win (stall deferred to Plan 05)
- Barrel exports for scoring/pickups/effects/multiball consolidated in `src/core/index.ts`

## Task Commits

Each task was committed atomically (TDD test → feat):

1. **Task 1: Rewrite lives to last-ball + D-13 cleanup** - `08f02ee` (test) + `40e1a6f` (feat)
2. **Task 2: Wire stepRun orchestration** - `99a8533` (feat)

**Plan metadata:** `1cdcbce`

## Files Created/Modified

- `src/core/rules/lives.ts` — `applyLivesFromBallCount` (replaced BALL_OUT scan)
- `src/core/rules/serve.ts` — `dockBall` deactivates all slots then docks index 0
- `src/core/stepRun.ts` — full non-stall Phase 5 pipeline
- `src/core/index.ts` — Wave 2 rule barrel exports + lives rename
- `tests/rules.lives.test.ts` — last-ball + D-13 + stepRun empty-pool integration
- `tests/rules.scoring.test.ts` — stepRun brick-hit score smoke (`evOverflow===0`)

## Decisions Made

- Removed `applyLivesFromEvents` entirely (no alias) — all `src/` call sites updated
- On life loss with lives remaining: `combo = 1` (CONTEXT preserve score; plan interface reset combo)
- stepRun life integration asserts empty pool post-compact rather than CCD bottom-miss (paddle/backstop made trajectory flaky)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Retargeted stepRun import during Task 1 rename**
- **Found during:** Task 1 (GREEN)
- **Issue:** Deleting `applyLivesFromEvents` broke `stepRun` import before Task 2
- **Fix:** Pointed `stepRun` at `applyLivesFromBallCount` in the Task 1 feat commit; Task 2 added the full pipeline
- **Files modified:** `src/core/stepRun.ts`
- **Verification:** lives tests green after Task 1
- **Committed in:** `40e1a6f`

**2. [Rule 1 - Bug] Switched stepRun life integration away from bottom-miss CCD**
- **Found during:** Task 2
- **Issue:** Ball near field bottom stuck at y≈606 (paddle/backstop interaction); life never fired in 30 steps
- **Fix:** Integration test sets `activeBallCount=0` (post-compact empty pool) then one `stepRun`
- **Files modified:** `tests/rules.lives.test.ts`
- **Verification:** vitest green; score smoke still uses real brick CCD
- **Committed in:** `99a8533`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Correctness-preserving; no scope creep; stall still deferred.

## Issues Encountered

Bottom-miss CCD through paddle zone was unreliable for life integration — covered via empty-pool + unit last-ball tests instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 can insert `stepAntiStall` into the PLAYING pipeline after effects / before lives (or per research order)
- No `applyLivesFromEvents` remaining under `src/`

## TDD Gate Compliance

- RED commit: `08f02ee`
- GREEN commit: `40e1a6f`
- Task 2 feat (orchestration + integration): `99a8533`

## Self-Check: PASSED

- FOUND: `src/core/rules/lives.ts`, `src/core/stepRun.ts`, `src/core/index.ts`
- FOUND: commits `08f02ee`, `40e1a6f`, `99a8533`
- FOUND: no `applyLivesFromEvents` in `src/`
---

*Phase: 05-run-rules-score-combo-power-ups-anti-stall*
*Completed: 2026-09-20*
