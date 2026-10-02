/**
 * UI-runtime world / VFX request helpers (audit WP-1 / F-01).
 * Pure mutations for unit tests + frame-callback application — never read SharedValue here.
 *
 * Worklet rule: never close over module exports (SEED_*, IMPULSE_*, SimPhase.*).
 * Inline numeric literals inside `'worklet'` bodies; keep exported consts for JS/tests only.
 */

import {
  applyCompiledLevel,
  applyServe,
  derivePaddleWidth,
  dockBall,
  resetWorld,
  spawnMultiballFromPaddle,
  type CompiledLevel,
  type World,
} from '../core';
import { punchShake, spawnBurst, clearTrailsFromIndex, type VfxState } from '../vfx';

/** Default RNG seeds — match allocateWorld / useGameLoop literals (JS/tests only). */
export const SEED_GAMEPLAY = 0xc0ffee01;
export const SEED_COSMETIC = 0xbadc0de2;

/**
 * Retry / level-reload reset on the live World object (UI runtime).
 */
export function applyRetryWorldReset(
  world: World,
  level: CompiledLevel | null,
  seedGameplay?: number,
  seedCosmetic?: number,
): void {
  'worklet';
  // Defaults inlined — default-param expressions close over module bindings (UI crash).
  const sg = seedGameplay === undefined ? 0xc0ffee01 : seedGameplay;
  const sc = seedCosmetic === undefined ? 0xbadc0de2 : seedCosmetic;
  resetWorld(world, sg, sc);
  if (level != null) {
    applyCompiledLevel(world, level);
  }
  dockBall(world);
}

/**
 * Swap the next board onto a live World mid-run (N-END-01 / SC-1 / D-03 / D-06).
 *
 * This is deliberately **not** `applyRetryWorldReset`: `resetWorld` zeroes `lives`,
 * `score` and `combo` and re-seeds both RNG streams (`src/core/reset.ts:44-47,79-81`), and
 * those are exactly the five fields SC-1 and SC-4 require be carried across a wave. Nothing
 * below touches `world.lives`, `world.score`, `world.combo`, `world.rngGameplay` or
 * `world.rngCosmetic` — a run is one continuous score and one continuous RNG stream, and
 * the wave boundary is invisible to both.
 *
 * Mode-agnostic by construction: it takes a World and a CompiledLevel, knows nothing about
 * waves, seeds or difficulty, and therefore Phase 12's daily challenge reuses it verbatim.
 *
 * D-03 is what it *does* clear: timed effects expire, falling pickups vanish, extra balls
 * are dropped and the ball re-docks onto the existing serve path.
 */
export function applyWaveAdvance(world: World, level: CompiledLevel | null): void {
  'worklet';
  // Effects first — see the `world.tick = 0` comment below. This ordering is contract.
  const maxE = world.maxEffects;
  for (let i = 0; i < maxE; i++) {
    world.effectType[i] = 0;
    world.effectUntilTick[i] = 0;
  }
  world.effectCount = 0;
  // Expand may have been live: restore the base width and re-clamp paddleX into the field.
  derivePaddleWidth(world);

  const maxP = world.maxPickups;
  for (let i = 0; i < maxP; i++) {
    world.pickupActive[i] = 0;
    world.pickupType[i] = 0;
    world.pickupX[i] = 0;
    world.pickupY[i] = 0;
  }
  world.pickupCount = 0;

  if (level != null) {
    applyCompiledLevel(world, level);
  }
  // Drops every extra ball and re-docks ball 0 above the paddle (D-03).
  dockBall(world);
  world.simPhase = 0; // SimPhase.DOCKED
  world.stallIdleTicks = 0;
  world.stallTier = 0;
  // D-06: each wave starts at serve speed, because the E2 ramp is a pure function of tick
  // and reaches MAX_BALL_SPEED inside wave 1. The effect clear above MUST stay above this
  // line: effectUntilTick is an absolute tick, so zeroing tick first would turn a live
  // 10-second expand into a permanent one.
  world.tick = 0;
  world.accumulator = 0;
}

/** Clear cosmetic SoA so trails / sparks / shake do not leak across Retry. */
export function clearCosmeticVfx(vfx: VfxState, world: World): void {
  'worklet';
  vfx.particleCount = 0;
  vfx.particleOldest = 0;
  const act = vfx.active;
  for (let i = 0; i < act.length; i++) {
    act[i] = 0;
  }
  // Rebuild free-list (F-60)
  const cap = vfx.particleCap;
  for (let i = 0; i < cap; i++) {
    vfx.freeStack[i] = i;
  }
  vfx.freeTop = cap;
  vfx.particleOldest = 0;
  // F-16 / NF-7: seed trail rings from live ball positions (never leave (0,0) ghosts).
  clearTrailsFromIndex(vfx, 0, world.ballX, world.ballY, world.ballActive);
  vfx.shakeAmp = 0;
  vfx.shakePhase = 0;
}

/**
 * One-shot Cert WC inject on the live World + VfxState (PLT-03 / D-14).
 * Mutates in place — caller must own the UI-runtime objects.
 */
export function applyCertWorstCaseInject(
  world: World,
  vfx: VfxState,
  level: CompiledLevel | null,
): void {
  'worklet';
  // Inline SimPhase / seeds / impulse — worklets cannot read module exports.
  if (world.simPhase === 0 /* DOCKED */) {
    applyServe(world, 360);
    world.simPhase = 1; // PLAYING
  } else if (world.simPhase === 2 /* WON */ || world.simPhase === 3 /* LOST */) {
    resetWorld(world, 0xc0ffee01, 0xbadc0de2);
    if (level != null) {
      applyCompiledLevel(world, level);
    }
    applyServe(world, 360);
    world.simPhase = 1; // PLAYING
  }

  let guard = 0;
  while (
    world.activeBallCount < 3 &&
    world.activeBallCount < world.maxBalls &&
    guard < 4
  ) {
    const before = world.activeBallCount;
    spawnMultiballFromPaddle(world);
    if (world.activeBallCount <= before) {
      break;
    }
    guard += 1;
  }

  let seed = 0.314159;
  const rng = () => {
    'worklet';
    seed = (seed * 1.6180339887) % 1;
    return seed;
  };
  const nearCap = Math.max(0, vfx.particleCap - 4);
  let bursts = 0;
  while (vfx.particleCount < nearCap && bursts < 64) {
    spawnBurst(vfx, {
      kind: 'destroy',
      x: 120 + (bursts % 8) * 24,
      y: 160 + (bursts % 6) * 28,
      rgb: { r: 0.2, g: 0.85, b: 1 },
      intensity: 1,
      rng,
    });
    bursts += 1;
  }

  punchShake(vfx, 2.0 /* IMPULSE_LIFE_LOST */, 1);
}
