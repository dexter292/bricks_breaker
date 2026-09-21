---
phase: 07-feedback-neon-vfx-audio
reviewed: 2026-09-21T06:54:00Z
depth: standard
status: issues
findings:
  blocker: 0
  warning: 1
  info: 0
  total: 1
focus:
  - LC-07 scheduleOnRN only in eventBridge
  - soft-fail audio + RN-scoped playBatch
  - particle budget ≤192
  - no live BlurMask/MaskFilter
  - prior fix pass (WR-01/02, IN-01..03)
files_reviewed: 36
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - app.json
  - docs/layer-contract.md
  - docs/phase7-vfx-measurement.md
  - eslint.config.js
  - package.json
  - src/core/rules/lives.ts
  - src/core/rules/pickups.ts
  - src/core/rules/win.ts
  - src/core/types.ts
  - src/render/colors.ts
  - src/render/recordSprites.ts
  - src/render/textures/bakeGlowSprites.ts
  - src/runtime/eventBridge.ts
  - src/runtime/useGameLoop.ts
  - src/runtime/useVfxIntensity.ts
  - src/services/audio/expoAudioService.ts
  - src/services/audio/index.ts
  - src/services/audio/mapping.ts
  - src/services/audio/types.ts
  - src/vfx/audioBatch.ts
  - src/vfx/consumeEvents.ts
  - src/vfx/index.ts
  - src/vfx/intensity.ts
  - src/vfx/particles.ts
  - src/vfx/shake.ts
  - src/vfx/stepVfx.ts
  - src/vfx/trails.ts
  - src/vfx/types.ts
  - tests/audio.mapping.test.ts
  - tests/events.fx.test.ts
  - tests/runtime.event-drain.test.ts
  - tests/vfx.intensity.test.ts
  - tests/vfx.particles.test.ts
  - tests/vfx.shake.test.ts
  - tests/vfx.trails.test.ts
---

# Phase 7: Standard Code Review (post fix-pass)

**Status:** issues (0 blocker / 1 warning / 0 info)  
**Scope:** feedback neon VFX + audio after WR-01/02 + IN-01..03 fixes  
**Prior fix report:** `07-REVIEW-FIX.md` (IN-04 skipped by design)

## Verdict

Focus contracts and the documented fix pass all hold. One new warning: the live game loop never supplies a cosmetic RNG to particle spawn, so production bursts collapse to a constant `0.5` stream.

## Focus checklist

| Check | Result |
| --- | --- |
| LC-07: `scheduleOnRN` solely in `eventBridge` | Pass — call site only in `eventBridge.ts`; ESLint ban + file override; `useGameLoop` only calls `flushAudioBatchOnJS` |
| Soft-fail audio + RN-scoped `playBatch` | Pass — native probe, try/catch preload/play, memory fallback; `playBatchRef` + stable `useCallback` (never SharedValue) |
| Particle budget ≤192 | Pass — `PARTICLE_POOL_DEFAULT` 128 / `HARD_MAX` 192 in `types.ts`; allocate clamps; oldest eviction |
| No live BlurMask/MaskFilter | Pass — concentric bake only; no matches under `src/render` |
| WR-01 wall-clock `dt` → `stepVfx` | Pass — `stepVfx(vfx, dt, intensity)` shares frame `dt` with `decayFlash` |
| WR-02 `seekTo` then `play` | Pass — `Promise.resolve(player.seekTo(0)).then(() => play())` + soft-fail catches; test flushes microtask |
| IN-01 single-source pool constants | Pass — `particles.ts` re-exports from `types.ts` only |
| IN-02 no unused strong glow | Pass — atlas is `{ soft }` only |
| IN-03 shared `trailLength` | Pass — `recordSprites` imports `../vfx/intensity` |
| IN-04 drop-newest overflow | Intentional non-finding — T-07-10 / JSDoc “Drop newest on overflow”; unchanged |

## Warnings

### WR-01: Production `consumeEventsForVfx` omits cosmetic RNG

**File:** `src/runtime/useGameLoop.ts` (~323); `src/vfx/consumeEvents.ts` (`defaultRng`)  
**Issue:** Frame path calls `consumeEventsForVfx(w, vfx, intensity)` with no `opts.rng`. Fallback `defaultRng` always returns `0.5`, so every spark in a chip/destroy burst gets the same angle, speed, and fleck roll — particles stack as one fleck instead of a neon burst (FX-02 / D-06–D-08). Tests pass a real RNG; PATTERNS expect `world.rngCosmetic` or a VFX-local stream.  
**Fix:** Wire `nextFloat(world.rngCosmetic, 0)` (or allocate a VFX-local mulberry state in `allocateVfx`) into the consume call from `useGameLoop` / inside `consumeEventsForVfx` when `opts.rng` is omitted.

## Clean notes (no finding)

- EventCode 6–9 push sites (`pickups` / `lives` / `win`) align with `mapping.ts` literals; WALL_HIT / BALL_OUT stay silent for SFX.
- `flushAudioBatchOnJS` copies `Int16Array` before the hop (no UI overwrite race).
- Intensity: AccessibilityInfo soft-fails to 1.0; reduce-motion → 0.2; trail never fully disables (`trailLength` ≥ 2).
- Cliff cyan avoided (`TRAIL_CYAN` / fleck ≈ `#67E8F9`).
- Shake is translate-only inside letterbox; particles/flash draw under paddle/ball.
- `app.json` expo-audio plugin: mic off; `package.json` pins `expo-audio ~57.0.5`.
- IN-04 audio batch overflow drop-newest remains by design (not re-filed).

---

_Reviewed: 2026-09-21T06:54:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_  
_Iteration: 2 (post fix-pass)_
