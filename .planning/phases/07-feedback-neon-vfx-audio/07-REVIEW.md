---
phase: 07-feedback-neon-vfx-audio
reviewed: 2026-09-21T03:30:00Z
depth: advisory
status: issues
findings:
  blocker: 0
  warning: 2
  info: 4
  total: 6
focus:
  - worklet/thread safety
  - soft-fail audio
  - particle budget
  - BlurMask absence
  - LC-07 scheduleOnRN only in eventBridge
files_reviewed:
  - src/vfx/*
  - src/services/audio/*
  - src/runtime/eventBridge.ts
  - src/runtime/useVfxIntensity.ts
  - src/runtime/useGameLoop.ts
  - app/_components/PlayingHost.tsx
  - src/render/recordSprites.ts
  - src/render/textures/bakeGlowSprites.ts
  - src/render/colors.ts
  - src/core EventCode push sites
---

# Phase 7: Advisory Code Review

**Status:** issues (0 blocker / 2 warning / 4 info)  
**Scope:** feedback neon VFX + audio wiring

## Verdict

Phase 7 focus contracts hold: **`scheduleOnRN` only in `eventBridge.ts`**, no live `BlurMask`/`MaskFilter`, particle pool hard-capped ≤192 with oldest eviction, and audio soft-fails to memory/no-op without blocking play. Two warnings are cosmetic-timing / soft-audio races, not layer-contract breaks.

## Focus checklist

| Check | Result |
| --- | --- |
| LC-07: `scheduleOnRN` solely in `eventBridge` | Pass — one hop/frame after batch drain; `useGameLoop` only calls `flushAudioBatchOnJS` |
| Soft-fail audio | Pass — native probe, preload/play try/catch, memory fallback, RN-scoped `playBatch` ref (not SharedValue) |
| Particle budget | Pass — default 128, hard max 192, spawn eviction when full |
| No live BlurMask | Pass — concentric bake in `bakeGlowSprites`; comment-only “blur” wording |
| Worklet / thread safety | Mostly pass — VFX SoA + `'worklet'` drains on UI; chrome still uses existing `runOnJS` reactions in `PlayingHost` (Phase 6 pattern, not LC-07 audio path) |

## Warnings

### WR-01: `stepVfx` uses `fixedDt` per frame, flash uses wall `dt`

**File:** `src/runtime/useGameLoop.ts` (~349–350)  
**Issue:** Particles/shake advance by `FIXED_DT` once per frame callback; destroy flash decays by actual frame `dt`. Under dropped FPS, spark/shake lifetime stretches in wall time while flash stays wall-clock accurate.  
**Fix (advisory):** Pass frame `dt` into `stepVfx`, or step VFX once per physics substep with `fixedDt`.

### WR-02: `seekTo(0)` not awaited before `play()`

**File:** `src/services/audio/expoAudioService.ts` (~129–130)  
**Issue:** `void player.seekTo(0)` then immediate `play()` can race if `seekTo` is async — rare soft glitches / truncated retriggers under voice reuse. Soft-fail catch still prevents throws.  
**Fix (advisory):** `void player.seekTo(0).then(() => player.play())` (or sync seek API if available), still inside the existing try/catch.

## Info

### IN-01: Duplicate particle pool literals

`PARTICLE_POOL_DEFAULT` / `HARD_MAX` exist in both `src/vfx/types.ts` and `src/vfx/particles.ts`; barrel exports types. Values match today (128/192) — prefer a single source to avoid drift.

### IN-02: Baked `strong` glow unused

`bakeGlowSprites` builds `soft` + `strong`; `recordSprites` only blits `variant.soft`. Extra cold-path work / atlas size with no runtime consumer yet.

### IN-03: `trailLength` duplicated in recorder

`recordSprites.trailLengthLocal` mirrors `vfx/intensity.trailLength` — intentional worklet isolation, but endpoints can drift if one side changes.

### IN-04: Audio batch overflow drops newest

`appendEventsForAudio` sets `overflow=1` and stops at cap 256 — by design (T-07-10). Extreme multi-substep bursts can mute trailing SFX in that frame only.

## Clean notes (no finding)

- EventCode push sites (step / lives / win / pickups) align with `mapping.ts` numeric literals (1–9).
- `flushAudioBatchOnJS` copies to `Int16Array` before hop (no UI overwrite race).
- Intensity / AccessibilityInfo soft-fails to 1.0; reduce-motion → 0.2 dampen.
- Cliff cyan avoided (`TRAIL_CYAN` / fleck `#67E8F9`).
