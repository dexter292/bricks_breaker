---
phase: 07-feedback-neon-vfx-audio
plan: 05
subsystem: feedback
tags: [vfx, audio, useGameLoop, eventBridge, reduce-motion, PlayingHost, FX-01, FX-02, FX-03]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: Pure deletable src/vfx/ SoA + stepVfx + consume/audioBatch (Plan 02)
  - phase: 07-feedback-neon-vfx-audio
    provides: Modular AudioService preload/playBatch/release (Plan 03)
  - phase: 07-feedback-neon-vfx-audio
    provides: bakeGlowSprites + recordFrame optional vfx path (Plan 04)
provides:
  - useVfxIntensity AccessibilityInfo → SharedValue (1.0 / 0.2)
  - eventBridge flushAudioBatchOnJS (sole scheduleOnRN hop)
  - useGameLoop per-substep VFX/audio drain + stepVfx + recordFrame(vfx)
  - PlayingHost preload/bake/release gated before setActive(true)
affects:
  - 07-06 Pixel 6a measurement / UAT
  - Phase 8 performance certification

tech-stack:
  added: []
  patterns:
    - Per-substep event drain before clearEvents; one audio hop/frame via eventBridge
    - Host passes playBatch SharedValue — runtime never imports services/
    - Cold-path fxReady gate (preload + glow bake) mirrors level compile gate

key-files:
  created:
    - src/runtime/eventBridge.ts
    - src/runtime/useVfxIntensity.ts
  modified:
    - src/runtime/useGameLoop.ts
    - app/_components/PlayingHost.tsx

key-decisions:
  - "flushAudioBatchOnJS copies Int16Array before scheduleOnRN to avoid UI overwrite race"
  - "DestroyFlashState life owned in useGameLoop (≤100ms punch on BRICK_BREAK)"
  - "New useGameLoop VFX options optional with defaults so intermediate compile stays green"

patterns-established:
  - "scheduleOnRN only in eventBridge.ts; useGameLoop calls flushAudioBatchOnJS"
  - "PlayingHost soft-fails audio/glow; never Alert; release() on unmount"

requirements-completed: [FX-01, FX-02, FX-03]

duration: 4min
completed: 2026-09-20
---

# Phase 07 Plan 05: Live Loop VFX + Audio Wiring Summary

**Integrated deletable VFX + modular SFX into the live game loop: per-substep event drain, one batched audio hop via `eventBridge`, OS reduce-motion intensity, and PlayingHost preload/bake/release before play.**

## Performance

- **Duration:** 4min
- **Started:** 2026-09-20T13:32:26Z
- **Completed:** 2026-09-20T13:36:30Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Wired `consumeEventsForVfx` + `appendEventsForAudio` + `pushTrail` after every `stepRun`; `stepVfx` + single `flushAudioBatchOnJS` after the substep loop
- `useVfxIntensity` maps `AccessibilityInfo` reduce-motion live to 1.0 / 0.2 SharedValue
- PlayingHost preloads AudioService, bakes glow atlas, gates `setActive(true)`, releases players on unmount

## Task Commits

Each task was committed atomically:

1. **Task 1: useVfxIntensity + eventBridge + useGameLoop drain** — `5615e18` (feat)
2. **Task 2: PlayingHost preload, bake, release** — `007ea93` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/runtime/eventBridge.ts` — `flushAudioBatchOnJS` with code copy + `scheduleOnRN`
- `src/runtime/useVfxIntensity.ts` — `isReduceMotionEnabled` + `reduceMotionChanged` → intensity
- `src/runtime/useGameLoop.ts` — allocate Vfx/AudioBatch; per-substep drain; `stepVfx`; flash; `recordFrame(vfx,…)`
- `app/_components/PlayingHost.tsx` — audio preload/release, `bakeGlowSprites`, intensity + playBatch wiring

## Decisions Made

- Snapshot-copy audio codes in the bridge so UI-thread `resetAudioBatch` / next-frame overwrite cannot race the JS hop
- Produce destroy flash (≤100ms) in the loop when `BRICK_BREAK` is seen — Plan 04 deferred lifetime ownership here
- Keep new loop options optional with internal defaults for clean Task-1 intermediate state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Audio batch copy before scheduleOnRN**
- **Found during:** Task 1 (eventBridge design)
- **Issue:** Passing the live `Int16Array` then immediately `resetAudioBatch` / next-frame append can overwrite codes before the JS hop runs
- **Fix:** `flushAudioBatchOnJS` copies into a fresh `Int16Array(n)` before `scheduleOnRN`
- **Files modified:** `src/runtime/eventBridge.ts`
- **Verification:** eslint + event-drain vitest green
- **Committed in:** `5615e18`

**2. [Rule 2 - Missing critical functionality] Destroy flash producer in useGameLoop**
- **Found during:** Task 1 (recordFrame expects flash; Plan 04 deferred life to Plan 05)
- **Issue:** Without a producer, destroy flash never appears despite draw path
- **Fix:** Punch `DestroyFlashState` on `BRICK_BREAK` after consume; decay each frame
- **Files modified:** `src/runtime/useGameLoop.ts`
- **Verification:** eslint; core tests green
- **Committed in:** `5615e18`

**Total deviations:** 2 auto-fixed (Rule 2)
**Impact on plan:** Correctness-only; no scope creep beyond FX wiring.

## Issues Encountered

None beyond the auto-fixes above. Acceptance `rg` initially matched `scheduleOnRN` in a `useGameLoop` comment — scrubbed so the ban grep stays clean.

## User Setup Required

None — no external services or secrets.

## Next Phase Readiness

Live play drains events into VFX+audio with reduce-motion intensity. Plan 06 can measure Pixel 6a frame budget and UAT feel. Deleting VFX wiring leaves core/tests unchanged.

## Known Stubs

None — fxReady soft-fail paths intentionally continue with null glow / no-op memory audio (UI-SPEC).

## Threat Flags

None — surfaces match plan threat model (T-07-21 one hop/frame; T-07-22 release on unmount; T-07-23 soft-fail preload).

## Self-Check: PASSED

- `src/runtime/eventBridge.ts`, `useVfxIntensity.ts`, updated `useGameLoop.ts`, `PlayingHost.tsx` present
- Commits `5615e18`, `007ea93` present in git log
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
