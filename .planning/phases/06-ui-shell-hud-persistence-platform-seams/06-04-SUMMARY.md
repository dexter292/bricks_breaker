---
phase: 06-ui-shell-hud-persistence-platform-seams
plan: 04
subsystem: ui
tags: [hud-strip, safe-area, letterbox, sharedvalue-mirrors, plt-02]

# Dependency graph
requires:
  - phase: 06-ui-shell-hud-persistence-platform-seams
    provides: Title/PlayingHost shell (Plan 03)
provides:
  - HudStrip 48px top safe-area chrome (Score · Combo · Lives · Stall · Pause)
  - playfieldSafe.top = insets.top + 48 (strip above letterbox)
affects: [06-05 Results Score/Best + onRunEnded]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HUD strip content height constant HUD_STRIP_CONTENT = 48"
    - "playfieldTop = insets.top + HUD_STRIP_CONTENT"
    - "HudStrip props-only — discrete React mirrors, no SharedValue reads"

key-files:
  created:
    - src/runtime/HudStrip.tsx
  modified:
    - src/runtime/GameScreen.tsx

key-decisions:
  - "Strip height 48 + rgba(18,18,31,0.8) per UI-SPEC"
  - "playfield starts below notch + strip so opaque chrome never covers brick rows"
  - "Stall gate unchanged: PLAYING + stallTier > 0 (D-09)"

patterns-established:
  - "Pattern: HudStrip presentational strip above letterboxed Skia field"
  - "Pattern: __DEV__ level switch top = insets.top + 48 + 8"

requirements-completed: [PLT-02]

# Metrics
duration: 2min
completed: 2026-09-20
---

# Phase 06 Plan 04: HUD Strip Above Letterbox Summary

**Compact 48px safe-area HudStrip with Score · Combo · Lives · Stall · Pause, and playfieldSafe.top = insets.top + 48 so the strip sits above the letterboxed field.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T11:52:53Z
- **Completed:** 2026-09-20T11:55:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Created `HudStrip` — UI-SPEC strip tokens, props-only metrics, Pause outline trailing
- Wired GameScreen so letterbox starts below notch + 48px strip (PLT-02 / D-06…D-15)
- Preserved Stall PLAYING gate, overlay z-order, serve hint, and discrete SharedValue mirror data path

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HudStrip component per UI-SPEC** - `06072fb` (feat)
2. **Task 2: GameScreen — strip above letterbox (playfieldTop)** - `9698a2d` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

- `src/runtime/HudStrip.tsx` — Compact top HUD strip (Score · ×combo · Lives · Stall! · Pause)
- `src/runtime/GameScreen.tsx` — `HUD_STRIP_CONTENT` / `playfieldTop`; replaces free-floating HUD; moves __DEV__ switch below strip

## Decisions Made

- Strip height 48 with `rgba(18,18,31,0.8)` backing (UI-SPEC Secondary @ 80%)
- `playfieldTop = insets.top + 48` so brick rows are never under opaque HUD chrome
- Stall visibility still requires `simPhaseNum === SIM_PLAYING` (D-09)
- No per-frame `setState` in GameScreen — mirrors remain PlayingHost-owned (T-06-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit` still reports pre-existing errors in `app/index.tsx` (`styles.fill`) and overlay `StyleSheet.absoluteFillObject` — deferred from prior plans; no new errors in HudStrip/GameScreen.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — HudStrip is fully wired to existing discrete mirror props.

## Next Phase Readiness

- Plan 05 can add Results Score/Best + persist + `onRunEnded` without further HUD layout changes

## Self-Check: PASSED

- Created files found: `src/runtime/HudStrip.tsx`
- Modified files found: `src/runtime/GameScreen.tsx`
- Commits found: `06072fb`, `9698a2d`
