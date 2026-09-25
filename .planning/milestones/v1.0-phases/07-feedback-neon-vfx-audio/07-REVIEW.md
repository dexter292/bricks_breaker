---
phase: 07-feedback-neon-vfx-audio
reviewed: 2026-09-21T07:48:48Z
depth: standard
status: clean
findings:
  blocker: 0
  warning: 0
  info: 0
  total: 0
focus:
  - LC-07 scheduleOnRN only in eventBridge
  - soft-fail audio + RN-scoped playBatch
  - particle budget ≤192
  - no live BlurMask/MaskFilter
  - consumeEventsForVfx uses world.rngCosmetic when opts.rng omitted
  - stepVfx wall-clock dt; seekTo.then(play); single-source pool; shared trailLength; no unused strong glow
files_reviewed: 38
files_reviewed_list:
  - AGENTS.md
  - app/_components/PlayingHost.tsx
  - app.json
  - docs/layer-contract.md
  - docs/phase7-vfx-measurement.md
  - eslint.config.js
  - package.json
  - .planning/milestones/v1.0-phases/07-feedback-neon-vfx-audio/07-REVIEW-FIX.md
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

# Phase 7: Standard Code Review (post WR-01 rngCosmetic)

**Status:** clean (0 blocker / 0 warning / 0 info)  
**Scope:** feedback neon VFX + audio after WR-01 fix in `8a09d4e`  
**Prior fix report:** `07-REVIEW-FIX.md` (iteration 1, all_fixed)

## Verdict

All focus contracts hold. Prior WR-01 (constant `0.5` RNG fallback) is resolved: production `consumeEventsForVfx` advances `world.rngCosmetic` via `nextFloat` when `opts.rng` is omitted, and the production-style drain test asserts varied particle velocities without touching `rngGameplay`.

## Focus checklist

| Check | Result |
| --- | --- |
| LC-07: `scheduleOnRN` solely in `eventBridge` | Pass — sole call site `eventBridge.ts`; ESLint ban + file override; `useGameLoop` only calls `flushAudioBatchOnJS` |
| Soft-fail audio + RN-scoped `playBatch` | Pass — native probe, try/catch preload/play, memory fallback; `playBatchRef` + stable `useCallback` (never SharedValue) |
| Particle budget ≤192 | Pass — `PARTICLE_POOL_DEFAULT` 128 / `HARD_MAX` 192 in `types.ts` only; allocate clamps; oldest eviction |
| No live BlurMask/MaskFilter | Pass — concentric bake only; zero matches under `src/` |
| WR-01 `rngCosmetic` when `opts.rng` omitted | Pass — `nextFloat(world.rngCosmetic, 0)`; gameplay stream untouched; production-style test in `runtime.event-drain` |
| Wall-clock `dt` → `stepVfx` | Pass — `stepVfx(vfx, dt, intensity)` shares frame `dt` with `decayFlash` |
| `seekTo` then `play` | Pass — `Promise.resolve(player.seekTo(0)).then(() => play())` + soft-fail catches |
| Single-source pool constants | Pass — `particles.ts` re-exports from `types.ts` only |
| No unused strong glow | Pass — atlas is `{ soft }` only; destroy flash is separate white circle |
| Shared `trailLength` | Pass — `recordSprites` imports `../vfx/intensity` |
| IN-04 drop-newest overflow | Intentional non-finding — T-07-10 / JSDoc “Drop newest on overflow”; unchanged |

## Findings

None.

## Clean notes (no finding)

- EventCode 6–9 push sites (`pickups` / `lives` / `win`) align with `mapping.ts` literals; WALL_HIT / BALL_OUT stay silent for SFX.
- `flushAudioBatchOnJS` copies `Int16Array` before the hop (no UI overwrite race).
- Intensity: AccessibilityInfo soft-fails to 1.0; reduce-motion → 0.2; trail never fully disables (`trailLength` ≥ 2).
- Cliff cyan avoided (`TRAIL_CYAN` / fleck ≈ `#67E8F9`).
- Shake is translate-only inside letterbox; particles/flash draw under paddle/ball.
- `app.json` expo-audio plugin: mic off; `package.json` pins `expo-audio ~57.0.5`.
- IN-04 audio batch overflow drop-newest remains by design (not re-filed).
- Commit `8a09d4e` + `07-REVIEW-FIX.md` match the live `consumeEvents.ts` / drain test.

---

_Reviewed: 2026-09-21T07:48:48Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_  
_Iteration: 3 (fresh after WR-01)_
