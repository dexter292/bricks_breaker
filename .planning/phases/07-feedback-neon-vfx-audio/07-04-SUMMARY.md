---
phase: 07-feedback-neon-vfx-audio
plan: 04
subsystem: feedback
tags: [vfx, skia, glow, trails, particles, shake, recordFrame, bakeGlowSprites, FX-01, FX-02]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: Pure deletable src/vfx/ SoA (Plan 02) + UI-SPEC draw order / D-01 tokens
provides:
  - TRAIL_CYAN #67E8F9 token
  - bakeGlowSprites cold-path soft/strong halo atlas (no live blur)
  - recordFrame VFX draw path (glow/trails/particles/flash/shake) deletable when vfx=null
affects:
  - 07-05 PlayingHost bake + useGameLoop recordFrame wiring
  - Pixel 6a frame budget measurement (Phase 7 success / Phase 8 cert)

tech-stack:
  added: []
  patterns:
    - Baked SkImage halos via Surface.MakeOffscreen concentric fills (never live blur on hot path)
    - Optional recordFrame vfx params; shake = canvas.translate inside letterbox only
    - Worklet-local cyan/trail literals to avoid JS remotes

key-files:
  created:
    - src/render/textures/bakeGlowSprites.ts
  modified:
    - src/render/colors.ts
    - src/render/recordSprites.ts

key-decisions:
  - "Glow atlas keyed by brick fill hex; soft pad 4 / strong pad 8 (xs/sm)"
  - "Shake uses fixed unit-ish direction × shakeAmp (amp already intensity-scaled at punch)"
  - "Optional DestroyFlashState param — life owned by Plan 05 producer"

patterns-established:
  - "recordFrame(vfx=null) matches pre-Phase-7 flat draw (D-02 deletable)"
  - "Game Token Priority: navy→glow+bricks→cues→particles/flash→pickups→paddle→trails→ball"

requirements-completed: [FX-01, FX-02]

duration: 3min
completed: 2026-09-20
---

# Phase 07 Plan 04: Neon VFX Record Path Summary

**Baked neon brick halos + ghost trails/particles/flash/shake wired into Skia `recordFrame` under UI-SPEC Game Token Priority — deletable when `vfx` is null, zero live blur on the hot path.**

## Performance

- **Duration:** 3min
- **Started:** 2026-09-20T13:28:21Z
- **Completed:** 2026-09-20T13:31:17Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added `TRAIL_CYAN = '#67E8F9'` for Shatter neon rim / flecks (distinct from cliff `#00ffaa`)
- Cold-path `bakeGlowSprites()` builds soft/strong halo `SkImage`s per HP/unbreakable fill via concentric fills (no BlurMask/MaskFilter)
- Extended `recordFrame` with optional `vfx` / `vfxIntensity` / `glowAtlas` / `flash`; shake via letterbox `translate` only

## Task Commits

Each task was committed atomically:

1. **Task 1: TRAIL_CYAN + bakeGlowSprites**
   - `479a48b` (feat) — cyan token + glow atlas factory
   - `55e15d0` (fix) — scrub acceptance-ban tokens from bake file comments
2. **Task 2: recordFrame VFX draw + shake translate**
   - `feb2b4d` (feat) — glow/trails/particles/flash/shake draw order

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/render/colors.ts` — `TRAIL_CYAN` export
- `src/render/textures/bakeGlowSprites.ts` — `GlowAtlas` / `bakeGlowSprites` (soft + strong)
- `src/render/recordSprites.ts` — optional VFX args; Game Token Priority draw; `DestroyFlashState`

## Decisions Made

- Halo bake uses `Skia.Surface.MakeOffscreen` + concentric rect alpha rings (≤2 radii) instead of live image filters
- Shake direction is a fixed unit-ish vector applied to `shakeAmp` (no World mutation; amp already × intensity at punch per Plan 02)
- Destroy flash is an optional param (`DestroyFlashState`) so Plan 05 can own lifetime without extending `VfxState` here

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance grep matched BlurMask/MaskFilter in bake comments**
- **Found during:** Task 1 verification
- **Issue:** Plan bans those strings in `bakeGlowSprites.ts`; comments documenting the ban matched `rg`
- **Fix:** Reworded comments to describe concentric soft fills without naming banned APIs
- **Files modified:** `src/render/textures/bakeGlowSprites.ts`
- **Commit:** `55e15d0`

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Comment-only; behavior unchanged.

## Issues Encountered

None beyond the acceptance-grep comment scrub above. Pre-existing `tsc` errors in `app/index.tsx` / overlay StyleSheet APIs are out of scope (untouched files).

## User Setup Required

None — no external services or secrets.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `src/render/recordSprites.ts` | optional `glowAtlas` / `flash` / `vfx` default null | Plan 05 wires PlayingHost bake + loop drain |
| `src/render/textures/bakeGlowSprites.ts` | not called yet | Cold-path call before `setActive(true)` is Plan 05 |

Intentional — plan goal (record path + atlas factory) is achieved; runtime wiring is Plan 05.

## Threat Flags

None — no new network/auth/file trust boundaries. Mitigations T-07-17…T-07-19 held (no BlurMask; particle draw scans active pool only; shake translate-only).

## Self-Check: PASSED

- `src/render/colors.ts` contains `TRAIL_CYAN = '#67E8F9'`
- `src/render/textures/bakeGlowSprites.ts` exports `bakeGlowSprites`; no `BlurMask`/`MaskFilter`
- `src/render/recordSprites.ts` has `vfx`/`shake`/`#67E8F9`; trail draw before ball; no `BlurMask`
- Commits `479a48b`, `55e15d0`, `feb2b4d` present
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
