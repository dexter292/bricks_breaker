---
phase: 05-run-rules-score-combo-power-ups-anti-stall
plan: 06
subsystem: ui-runtime
tags: [SharedValue, HUD, score, combo, stall, pickups, Skia, RUN-01, PHYS-07, PWR-03]

requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: World score/combo/stallTier + pickup SoA + stepRun power-up/anti-stall rules
provides:
  - scoreOut/comboOut/stallTierOut SharedValue mirrors (lives-pattern)
  - GameHost reactions → GameScreen Score · / ×combo / Stall! chrome
  - Flat amber #FBBF24 pickup rects in recordFrame
affects:
  - Phase 6 HUD polish
  - Phase 7 neon/particles (must not invent polish here)

tech-stack:
  added: []
  patterns:
    - "Separate SharedValue per numeric chrome field (do not pack score into 8-bit lives/phase)"
    - "useAnimatedReaction + runOnJS only on change for React HUD state"
    - "Flat Skia drawRect for pickups — no blur/glow/shadow"

key-files:
  created: []
  modified:
    - src/runtime/useGameLoop.ts
    - app/_components/GameHost.tsx
    - src/runtime/GameScreen.tsx
    - src/runtime/useSpikeLoop.ts
    - src/render/recordSprites.ts

key-decisions:
  - "Show ×combo always while playing (not only when combo > 1)"
  - "Stall! · N rendered only when stallTier > 0"
  - "Pickup sprites are flat amber rects; gameplay catch remains core-authoritative"

patterns-established:
  - "Chrome mirrors clone livesOut pattern: publish every frame from World, react on UI thread"
  - "recordFrame scans maxPickups skipping inactive for sparse pickup pool"

requirements-completed: [RUN-01, PHYS-07, PWR-03]

duration: 11min
completed: 2026-09-20
---

# Phase 05 Plan 06: Score/Combo/Stall Chrome + Flat Pickups Summary

**Minimal SharedValue HUD for Score · N, ×combo, and Stall! · tier plus flat amber pickup rects in recordFrame — SC-1/SC-5 visibility without Phase 6 polish**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-20T10:04:00Z
- **Completed:** 2026-09-20T10:15:19Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `useGameLoop` publishes `scoreOut` / `comboOut` / `stallTierOut` every frame alongside lives (no per-frame React setState in the worklet)
- `GameHost` uses separate `useAnimatedReaction`s → React state; `GameScreen` shows `Score · N`, `×combo`, and conditional `Stall! · tier`
- `recordFrame` draws active pickups as flat `#FBBF24` 20×12 rects centered on SoA positions
- Human verify approved: chrome + catch-only pickups + stall visibility (no defects reported)

## Task Commits

Each task was committed atomically:

1. **Task 1: SharedValue mirrors + GameHost/GameScreen chrome** - `5737560` (feat)
2. **Task 2: Flat pickup sprites in recordFrame** - `edac144` (feat)
3. **Task 3: Human verify Score/combo/Stall chrome + pickup catch** - approved (no code commit)

**Plan metadata:** `f1b39bf`

## Files Created/Modified

- `src/runtime/useGameLoop.ts` — score/combo/stallTier SharedValue outs + publish sites
- `app/_components/GameHost.tsx` — SharedValues, reactions, pass chrome props
- `src/runtime/GameScreen.tsx` — Score · / ×combo / Stall! text in HUD row
- `src/runtime/useSpikeLoop.ts` — dummy SharedValues for new outs
- `src/render/recordSprites.ts` — flat amber pickup draw loop

## Decisions Made

- Always show `×${combo}` while chrome is visible (plan discretion)
- Stall chrome gated on `stallTier > 0` only
- No Phase 6 menus/high-score or neon/particle polish

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — chrome mirrors live World fields; pickup draw uses active SoA slots.

## Threat Flags

None — display-only SharedValue mirrors and visual pickup rects; no new network/auth/file surface. T-05-01 accept (offline chrome), T-05-02/03 mitigated upstream (stall on sim steps; inactive skip).

## Human Verification

- **Task 3:** approved (2026-09-20)
- **Signal:** user replied `approved`
- **Defects reported:** none

## Next Phase Readiness

- Phase 05 chrome + rules visibility complete; Phase 6 can polish HUD without changing mirror topology
- Ready for phase verification / next milestone step

## Self-Check: PASSED

- FOUND: `src/runtime/useGameLoop.ts` (`scoreOut.value = w.score`)
- FOUND: `src/runtime/GameScreen.tsx` (`Score ·`, `Stall!`)
- FOUND: `src/render/recordSprites.ts` (`FBBF24`, `pickupActive`)
- FOUND: commits `5737560`, `edac144`
- FOUND: human-verify approved with no code changes

---
*Phase: 05-run-rules-score-combo-power-ups-anti-stall*
*Completed: 2026-09-20*
