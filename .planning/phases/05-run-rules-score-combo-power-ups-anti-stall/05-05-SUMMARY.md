---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 05
subsystem: game-rules
tags: [anti-stall, PHYS-07, stepAntiStall, determinism, no-rng]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: World stallIdleTicks/stallTier + hashWorld mixes; stepRun score→effects→lives→win
provides:
  - stepAntiStall with tiered 960/1200/1440 escalation (PHYS-07)
  - stepRun PLAYING order effects → stall → lives → win
  - Green rules.stall.test.ts (unit + stepRun integration + hash parity)
affects:
  - 05-06 Stall! HUD chrome mirrors
  - Phase 6 polish HUD

tech-stack:
  added: []
  patterns:
    - "win.ts PLAYING early-out for run-level stall gate"
    - "Idle +=1 only inside stepAntiStall; pause = skip stepRun"
    - "Tier transitions apply speed/angle once on entry; no Math.random"

key-files:
  created:
    - src/core/rules/stall.ts
  modified:
    - src/core/stepRun.ts
    - src/core/index.ts
    - tests/rules.stall.test.ts

key-decisions:
  - "Apply ×1.08 speed once when entering tier 2; ±8° nudge once when entering tier 3"
  - "stepRun integration uses sentinel breakable below paddle so win check does not WON on empty grid"
  - "PHYS-07: no random bounce jitter comment + purity tests"

patterns-established:
  - "stepAntiStall mirrors applyWinCheck PLAYING gate + event-ring breakable scan"
  - "PLAYING order locked: … → stepEffects → stepAntiStall → applyLivesFromBallCount → applyWinCheck"

requirements-completed: [PHYS-07]

duration: 5min
completed: 2026-09-20
---

# Phase 05 Plan 05: Anti-Stall Escalation Summary

**Deterministic sim-time anti-stall (PHYS-07): 8s idle without breakable damage escalates warning → ×1.08 speed → ±8° angle nudge, wired into `stepRun` with no RNG**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-20T09:56:39Z
- **Completed:** 2026-09-20T10:01:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `stepAntiStall` advances `stallIdleTicks` only on PLAYING steps; breakable `BRICK_HIT`/`BRICK_BREAK` resets idle + tier; wall/paddle/unbreakable do not
- Tier 1 at 960 (warning only), tier 2 at 1200 (×1.08 clamp to 720), tier 3 at 1440 (deterministic ±8° nudge + min-vertical)
- `stepRun` order: score → drops → pickups → effects → **stall** → lives → win
- Pause modeled by skipping `stepRun` leaves stall idle unchanged; dual-world `hashWorld` parity holds

## Task Commits

Each task was committed atomically (TDD test → feat):

1. **Task 1: Implement stepAntiStall + green stall tests** - `0e7df7d` (test) + `1623fa5` (feat)
2. **Task 2: Wire stepAntiStall into stepRun + replay hash** - `d899542` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/core/rules/stall.ts` — `stepAntiStall` with tier schedule + velocity mutations
- `src/core/index.ts` — export `stepAntiStall`
- `src/core/stepRun.ts` — call after `stepEffects`, before lives
- `tests/rules.stall.test.ts` — thresholds, reset, freeze-by-skip, stepRun integration, determinism

## Decisions Made

- Speed mult and angle nudge apply once on tier entry (idempotent via `prevTier` gate), not every step while tier ≥ N
- Empty-grid `stepRun` tests use a sentinel breakable below the paddle so `applyWinCheck` does not immediately WON while ball never damages it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Float edge on min-vertical after tier-3 nudge**
- **Found during:** Task 1 (tier 3 test)
- **Issue:** Post-nudge `|vy|/speed` was ~1e-8 below `MIN_VERTICAL_RATIO`
- **Fix:** Final min-vertical re-clamp after speed clamp; test epsilon `1e-6`
- **Files modified:** `src/core/rules/stall.ts`, `tests/rules.stall.test.ts`
- **Verification:** vitest green
- **Committed in:** `1623fa5`

**2. [Rule 3 - Blocking] Empty grid triggers WON via applyWinCheck**
- **Found during:** Task 2 (stepRun integration)
- **Issue:** `countBreakableAlive === 0` → `SimPhase.WON` before 960 idle steps
- **Fix:** Sentinel breakable at y=630 (below paddle); paddle-tracking keeps ball off it
- **Files modified:** `tests/rules.stall.test.ts`
- **Verification:** stepRun 960-step + determinism tests green
- **Committed in:** `d899542`

---

**Total deviations:** 2 auto-fixed (1× Rule 1, 1× Rule 3)
**Impact on plan:** Correctness-preserving; no scope creep; PHYS-07 schedule unchanged

## Issues Encountered

None beyond the auto-fixes above.

## User Setup Required

None

## Known Stubs

None — all Wave 0 `it.todo` stall stubs replaced with green tests.

## Threat Flags

None — stall path uses existing event ring + ball SoA; no new network/auth/file surface. T-05-01/02/03 mitigations present (no RNG, skip-step freeze, finite clamps).

## Next Phase Readiness

- Anti-stall live in core; Plan 06 can mirror `stallTier` to Stall! HUD chrome
- Ready for Plan 06

## Self-Check: PASSED

- FOUND: `src/core/rules/stall.ts`
- FOUND: `src/core/stepRun.ts` contains `stepAntiStall`
- FOUND: commits `0e7df7d`, `1623fa5`, `d899542`
- FOUND: vitest stall + golden-replay + purity exit 0
