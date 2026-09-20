---
phase: 06-ui-shell-hud-persistence-platform-seams
plan: 03
subsystem: ui
tags: [title-shell, playing-host, menu, run-03, overlays]

# Dependency graph
requires:
  - phase: 06-ui-shell-hud-persistence-platform-seams
    provides: AsyncStorage personal-best store (Plan 01)
provides:
  - TitleScreen cold start (Neon Brick Breaker, Best · N, Play)
  - PlayingHost extracted game session host
  - GameHost shellPhase title|playing + Best refresh on Title
  - Pause/Results Menu → Title (unmount PlayingHost); instant Retry preserved
affects: [06-04 HUD strip, 06-05 Results Score/Best + onRunEnded]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "shellPhase title|playing — conditional mount of PlayingHost"
    - "Menu outline secondary CTA; Retry/Play filled primary"
    - "Storage read only in GameHost Title path (not src/runtime)"

key-files:
  created:
    - app/_components/TitleScreen.tsx
    - app/_components/PlayingHost.tsx
  modified:
    - app/_components/GameHost.tsx
    - src/runtime/GameScreen.tsx
    - src/runtime/overlays/PauseOverlay.tsx
    - src/runtime/overlays/ResultOverlay.tsx

key-decisions:
  - "Cold start defaults shellPhase to title (D-02)"
  - "Menu unmounts PlayingHost — no freeze-under-Title (Pattern 1)"
  - "GameHost loads fonts for Title; PlayingHost keeps own useFonts gate"
  - "Retry/Menu have no Alert.alert confirmation (RUN-03)"

patterns-established:
  - "Pattern: GameHost shell orchestrates TitleScreen vs PlayingHost"
  - "Pattern: Overlay Menu accessibilityLabel Return to title"

requirements-completed: [RUN-03]

# Metrics
duration: 2min
completed: 2026-09-20
---

# Phase 06 Plan 03: Title ↔ Playing Shell Summary

**Title cold start with Play, extracted PlayingHost, and Pause/Results Menu → Title (unmount) while Retry stays one-tap with no confirmation.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T11:49:55Z
- **Completed:** 2026-09-20T11:52:04Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

- Cold start lands on Title (Neon Brick Breaker, Best · N, Play) per UI-SPEC
- Extracted full game loop/gesture/pause FSM into `PlayingHost`; GameHost is shell-only
- Pause and Results expose outline Menu → Title (unmounts PlayingHost; Best refreshes)
- Retry remains instant on both overlays with no confirmation dialog

## Task Commits

Each task was committed atomically:

1. **Task 1: TitleScreen + extract PlayingHost + GameHost shellPhase** - `ac46d49` (feat)
2. **Task 2: Menu on Pause/Results + GameScreen onMenu** - `d185978` (feat)

**Plan metadata:** `d402a11` (docs: complete plan)

## Files Created/Modified

- `app/_components/TitleScreen.tsx` — Title shell: brand, Best · N, Play CTA
- `app/_components/PlayingHost.tsx` — Former GameHost body; accepts `onMenu`
- `app/_components/GameHost.tsx` — `shellPhase` title|playing + Best refresh
- `src/runtime/GameScreen.tsx` — passes `onMenu` to Pause/Result overlays
- `src/runtime/overlays/PauseOverlay.tsx` — Resume → Retry → Menu
- `src/runtime/overlays/ResultOverlay.tsx` — Retry → Menu (Score/Best deferred Plan 05)

## Decisions Made

- Default `shellPhase` to `'title'` so gameplay is not cold-start (D-02)
- Menu sets `shellPhase` to `'title'`, unmounting PlayingHost (locked Pattern 1)
- Fonts loaded in GameHost so Title SpaceMono works before Playing mounts (D-01 brand)
- No confirmation on Retry or Menu (RUN-03 / D-03 / D-04)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Font gate on GameHost shell**
- **Found during:** Task 1
- **Issue:** Plan moved `useFonts` entirely into PlayingHost; Title would render without SpaceMono on cold start
- **Fix:** Load SpaceMono in GameHost before Title/Playing; PlayingHost retains its own gate as extracted
- **Files modified:** `app/_components/GameHost.tsx`
- **Commit:** `ac46d49`

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Necessary for Title brand typography; no scope creep.

## Issues Encountered

- `npx tsc --noEmit` still fails on pre-existing `app/index.tsx` (`styles.fill`) and overlay `StyleSheet.absoluteFillObject` — deferred from prior plans; none introduced by new Title/PlayingHost APIs.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- ResultOverlay Score / Best / New Record intentionally omitted until Plan 05 (plan said do not invent placeholders).
- Personal best on Title reads storage now; end-of-run write still Plan 05.

## Next Phase Readiness

- Plan 04 can polish HUD strip inside GameScreen without shell changes
- Plan 05 wires Results Score/Best + persist + `onRunEnded` on PlayingHost cold path

## Self-Check: PASSED

- Created files found: `TitleScreen.tsx`, `PlayingHost.tsx`
- Modified files found: `GameHost.tsx`, `GameScreen.tsx`, `PauseOverlay.tsx`, `ResultOverlay.tsx`
- Commits found: `ac46d49`, `d185978`
