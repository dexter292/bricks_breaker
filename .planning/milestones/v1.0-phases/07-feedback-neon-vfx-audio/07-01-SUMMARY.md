---
phase: 07-feedback-neon-vfx-audio
plan: 01
subsystem: feedback
tags: [EventCode, event-ring, pickups, lives, win, FX-03, tdd]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: Wave 0 events.fx.test.ts it.todo stubs + event ring infrastructure
provides:
  - EventCode.POWERUP_CATCH|LIFE_LOST|WIN|LOSE (6–9)
  - pushEvent sites in pickups/lives/win
  - GREEN tests/events.fx.test.ts coverage
affects:
  - 07-02+ audio/VFX consumers of FX-03 event codes
  - AudioService EventCode→SFX mapping

tech-stack:
  added: []
  patterns:
    - Cosmetic EventCode pushes at authoritative mutation sites only
    - Fixed numeric enum extension without renumbering 1–5

key-files:
  created: []
  modified:
    - src/core/types.ts
    - src/core/rules/pickups.ts
    - src/core/rules/lives.ts
    - src/core/rules/win.ts
    - tests/events.fx.test.ts

key-decisions:
  - "EventCode 6–9 appended; existing 1–5 unchanged (D-24)"
  - "LIFE_LOST always on decrement; LOSE only when lives→0 / SimPhase.LOST"
  - "hashWorld includes event ring — new pushes stay deterministic (no Math.random)"

patterns-established:
  - "FX events emitted via pushEvent at catch/life/win sites; stepRun still owns clearEvents"

requirements-completed: [FX-03]

duration: 1min
completed: 2026-09-20
---

# Phase 07 Plan 01: FX-03 EventCode Taxonomy Summary

**Extended EventCode with POWERUP_CATCH/LIFE_LOST/WIN/LOSE (6–9) and emit them from pickups catch, lives decrement/terminal loss, and win check — covered by GREEN `tests/events.fx.test.ts`.**

## Performance

- **Duration:** 1min
- **Started:** 2026-09-20T13:20:39Z
- **Completed:** 2026-09-20T13:21:47Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added stable EventCode values 6–9 without renumbering WALL_HIT…BALL_OUT
- Wired `pushEvent` at pickup AABB catch, life loss (always), LOSE (terminal only), and WIN
- Replaced Wave 0 `it.todo` stubs with four GREEN behavioral tests; full `test:core` green

## Task Commits

Each task was committed atomically:

1. **Task 1: RED→GREEN EventCode + push sites**
   - `bf7b0a6` (test) — failing FX-03 expectations
   - `abc4d90` (feat) — EventCode + pickups/lives/win push sites
2. **Task 2: Core suite regression gate** — no code changes (suite already green; purity grep clean)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/core/types.ts` — POWERUP_CATCH:6, LIFE_LOST:7, WIN:8, LOSE:9
- `src/core/rules/pickups.ts` — POWERUP_CATCH before multiball/expand apply
- `src/core/rules/lives.ts` — LIFE_LOST after lives write; LOSE on terminal loss
- `src/core/rules/win.ts` — WIN when simPhase→WON
- `tests/events.fx.test.ts` — four expect-based FX-03 tests (zero it.todo)
- `src/core/index.ts` — unchanged (EventCode object already re-exported)

## Decisions Made

- Followed plan literals and push signatures exactly (`a` = pickup type / remaining lives / 0)
- Documented that `hashWorld` **does** mix the event ring; new emissions are deterministic so golden-replay stayed green without hash/test changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external services or secrets.

## Known Stubs

None in this plan's deliverables. Remaining Wave 0 stubs (other Phase 7 plans):

| File | Stub | Reason |
|------|------|--------|
| `tests/vfx.*.test.ts` | it.todo | Later FX-01/02 plans |
| `tests/audio.mapping.test.ts` | it.todo | Later FX-03 AudioService |
| `tests/runtime.event-drain.test.ts` | it.todo | Later FX-03 drain |

## Threat Flags

None — surfaces match plan threat model (T-07-06 fixed enum; T-07-08 no RN/audio imports in core/).

## TDD Gate Compliance

- RED: `bf7b0a6` — `test(07-01): add failing test for FX-03 EventCode push sites`
- GREEN: `abc4d90` — `feat(07-01): implement FX-03 EventCode + push sites`

## Self-Check: PASSED

- `src/core/types.ts` contains POWERUP_CATCH: 6, LIFE_LOST: 7, WIN: 8, LOSE: 9
- Push sites present in pickups.ts / lives.ts / win.ts
- Commits `bf7b0a6` and `abc4d90` present in git log
- `tests/events.fx.test.ts` exists with ≥4 expect assertions, zero it.todo
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
