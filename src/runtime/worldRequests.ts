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
  dockBall,
  resetWorld,
  spawnMultiballFromPaddle,
  type CompiledLevel,
  type World,
} from '../core';
import { punchShake, spawnBurst, type VfxState } from '../vfx';

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

/** Clear cosmetic SoA so trails / sparks / shake do not leak across Retry. */
export function clearCosmeticVfx(vfx: VfxState): void {
  'worklet';
  vfx.particleCount = 0;
  vfx.particleOldest = 0;
  const act = vfx.active;
  for (let i = 0; i < act.length; i++) {
    act[i] = 0;
  }
  // F-16: zero heads + sample rings (head-only clear left ghost samples drawable).
  const heads = vfx.trailHead;
  for (let i = 0; i < heads.length; i++) {
    heads[i] = 0;
  }
  const tx = vfx.trailX;
  const ty = vfx.trailY;
  for (let i = 0; i < tx.length; i++) {
    tx[i] = 0;
    ty[i] = 0;
  }
  vfx.shakeAmp = 0;
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
