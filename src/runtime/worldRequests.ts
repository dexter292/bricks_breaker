/**
 * UI-runtime world / VFX request helpers (audit WP-1 / F-01).
 * Pure mutations for unit tests + frame-callback application — never read SharedValue here.
 */

import {
  applyCompiledLevel,
  applyServe,
  dockBall,
  resetWorld,
  spawnMultiballFromPaddle,
  SimPhase,
  type CompiledLevel,
  type World,
} from '../core';
import {
  IMPULSE_LIFE_LOST,
  punchShake,
  spawnBurst,
  type VfxState,
} from '../vfx';

/** Default RNG seeds — match allocateWorld / useGameLoop literals. */
export const SEED_GAMEPLAY = 0xc0ffee01;
export const SEED_COSMETIC = 0xbadc0de2;

/**
 * Retry / level-reload reset on the live World object (UI runtime).
 */
export function applyRetryWorldReset(
  world: World,
  level: CompiledLevel | null,
  seedGameplay: number = SEED_GAMEPLAY,
  seedCosmetic: number = SEED_COSMETIC,
): void {
  'worklet';
  resetWorld(world, seedGameplay, seedCosmetic);
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
  if (world.simPhase === SimPhase.DOCKED) {
    applyServe(world, 360);
    world.simPhase = SimPhase.PLAYING;
  } else if (
    world.simPhase === SimPhase.WON ||
    world.simPhase === SimPhase.LOST
  ) {
    resetWorld(world, SEED_GAMEPLAY, SEED_COSMETIC);
    if (level != null) {
      applyCompiledLevel(world, level);
    }
    applyServe(world, 360);
    world.simPhase = SimPhase.PLAYING;
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

  punchShake(vfx, IMPULSE_LIFE_LOST, 1);
}
