---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 02
subsystem: core
tags: [scoring, combo, event-ring, worklet, RUN-01, deterministic]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: World score/combo fields + SCORE_* constants (05-01)
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: Wave 0 scoring it.todo stubs (05-00)
provides:
  - applyScoringFromEvents ring drain (award-then-increment)
  - Green RUN-01 unit coverage for HIT/BREAK/paddle/unbreakable/ordered multi-hit
affects:
  - 05-04 stepRun wiring + barrel export
  - RUN-01 chrome mirrors (Score · N / combo)

tech-stack:
  added: []
  patterns:
    - "Event-ring scan oldest→newest (lives.ts pattern); do not clear ring"
    - "Worklet-inlined scoreHit=10 / scoreBreakBonus=50 with constants.ts parity comment"

key-files:
  created:
    - src/core/rules/scoring.ts
  modified:
    - tests/rules.scoring.test.ts

key-decisions:
  - "Award-then-increment locked: score uses current combo before combo += 1"
  - "Barrel export + stepRun wiring deferred to Plan 04 (Wave 2 ownership)"
  - "Unbreakable BRICK_HIT skipped via brickFlags[evB] & UNBREAKABLE"

patterns-established:
  - "Rules modules importable via direct path until Plan 04 barrel"
  - "Scoring never touches RNG / Math.random (T-05-01)"

requirements-completed: [RUN-01]

duration: 2min
completed: 2026-09-20
---

# Phase 5 Plan 02: Score + Combo Rules Summary

**Deterministic `applyScoringFromEvents` awards HIT/BREAK × combo then increments, resets combo on paddle contact, and ignores unbreakable hits.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T09:45:54Z
- **Completed:** 2026-09-20T09:47:20Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- Replaced Wave 0 `it.todo` scoring stubs with green unit tests covering D-01/D-02 behaviors
- Implemented worklet-safe ring drain with award-then-increment and unbreakable skip
- Documented SCORE_HIT/SCORE_BREAK_BONUS parity; purity suite still green

## Task Commits

Each task was committed atomically:

1. **Task 1: RED→GREEN scoring unit tests** - `f624f65` (test) → `7f3eccc` (feat)
2. **Task 2: Document scoring constants parity + purity smoke** - `24a924d` (chore)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/core/rules/scoring.ts` — `applyScoringFromEvents` ring scan; inlined 10/50 literals
- `tests/rules.scoring.test.ts` — RUN-01 coverage + resetWorld score/combo baseline

## Decisions Made
- Followed RESEARCH Q1 lock: award with current combo, then `combo += 1`
- Direct import from `../src/core/rules/scoring` — no `src/core/index.ts` or `stepRun` changes (Plan 04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. RED phase: unbreakable "no change" test passed against no-op stub (expected); other four cases failed until GREEN.

## User Setup Required
None

## Known Stubs
No stubs in scoring module. Barrel export and `stepRun` wiring intentionally deferred to Plan 04.

## Threat Flags
None — T-05-01 mitigated (no RNG); no new network/auth/file surfaces.

## TDD Gate Compliance
- RED: `f624f65` test(...) with failing assertions
- GREEN: `7f3eccc` feat(...) implementation

## Next Phase Readiness
Plan 04 can barrel-export and wire `applyScoringFromEvents` into `stepRun`. Plan 03 (pickups) remains independent of this module.

## Self-Check: PASSED

- Found: `src/core/rules/scoring.ts`, `tests/rules.scoring.test.ts`
- Commits `f624f65`, `7f3eccc`, `24a924d` present in git log
