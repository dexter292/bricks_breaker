/**
 * Drain World event ring into cosmetic VFX (particles + shake).
 * Does NOT clear the ring — stepRun owns clear policy (scoring analog).
 */
import type { World } from '../core/types';
import { EventCode, BrickFlags } from '../core/types';
import { nextFloat } from '../core/rng/mulberry32';
import type { VfxState } from './types';
import { IMPULSE_DESTROY, IMPULSE_LIFE_LOST } from './types';
import { spawnBurst } from './particles';
import { punchShake } from './shake';
import { spawnBrickGhost } from './brickGhosts';
import { punchPaddleSquash } from './paddleSquash';

export type BrickRgb = { r: number; g: number; b: number };

export type ConsumeVfxOpts = {
  resolveBrickRgb?: (world: World, brickIndex: number) => BrickRgb;
  /** Cosmetic RNG [0,1) — never host RNG / gameplay stream */
  rng?: () => number;
};

/** Default brick body color from HP / flags (0–1 channels; core-only deps). */
export function rgbFromBrickHp(hp: number, flags: number): BrickRgb {
  'worklet';
  if ((flags & BrickFlags.UNBREAKABLE) !== 0) {
    return { r: 0.42, g: 0.447, b: 0.502 }; // #6B7280
  }
  if ((flags & BrickFlags.EXPLOSIVE) !== 0) {
    return { r: 0.976, g: 0.451, b: 0.086 }; // #F97316
  }
  if (hp >= 3) {
    return { r: 0.769, g: 0.271, b: 0.412 }; // #C44569
  }
  if (hp === 2) {
    return { r: 0.878, g: 0.478, b: 0.373 }; // #E07A5F
  }
  return { r: 0.949, g: 0.8, b: 0.561 }; // #F2CC8F
}

/** Resolve from live brick HP (post-damage may be 0 on BREAK — prefer event snapshot). */
export function defaultResolveBrickRgb(
  world: World,
  brickIndex: number,
): BrickRgb {
  'worklet';
  if (brickIndex < 0 || brickIndex >= world.brickCount) {
    return { r: 1, g: 1, b: 1 };
  }
  return rgbFromBrickHp(world.brickHp[brickIndex], world.brickFlags[brickIndex]);
}

/**
 * Scan event ring like applyScoringFromEvents; spawn chips/destroys + punch shake.
 * When opts.rng is omitted, advances world.rngCosmetic (never rngGameplay).
 */
export function consumeEventsForVfx(
  world: World,
  vfx: VfxState,
  intensity: number,
  opts?: ConsumeVfxOpts,
): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }

  const resolve = opts?.resolveBrickRgb ?? defaultResolveBrickRgb;
  // F-17: avoid allocating a fresh rng closure every substep when using cosmetic stream.
  const customRng = opts?.rng;
  const rng = (): number => {
    'worklet';
    if (customRng != null) {
      return customRng();
    }
    return nextFloat(world.rngCosmetic, 0);
  };

  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];
    const x = world.evX[idx];
    const y = world.evY[idx];
    const brickIndex = world.evB[idx];

    if (code === EventCode.BRICK_HIT) {
      // evA = HP before damage (F-13); fall back to live HP if absent
      const hpSnap = world.evA[idx];
      const flags =
        brickIndex >= 0 && brickIndex < world.brickCount
          ? world.brickFlags[brickIndex]
          : 0;
      const rgb =
        hpSnap > 0
          ? rgbFromBrickHp(hpSnap, flags)
          : resolve(world, brickIndex);
      spawnBurst(vfx, { kind: 'chip', x, y, rgb, intensity, rng });
      continue;
    }

    if (code === EventCode.BRICK_BREAK) {
      const hpSnap = world.evA[idx];
      const flags =
        brickIndex >= 0 && brickIndex < world.brickCount
          ? world.brickFlags[brickIndex]
          : 0;
      const rgb =
        hpSnap > 0
          ? rgbFromBrickHp(hpSnap, flags)
          : resolve(world, brickIndex);
      // Explosive break: 1.25× intensity — Mid cap 128 / FIFO eviction (see EXPLOSIVE-BRICKS.md)
      const burstIntensity =
        (flags & BrickFlags.EXPLOSIVE) !== 0 ? intensity * 1.25 : intensity;
      spawnBurst(vfx, {
        kind: 'destroy',
        x,
        y,
        rgb,
        intensity: burstIntensity,
        rng,
      });
      punchShake(vfx, IMPULSE_DESTROY, burstIntensity);
      if (brickIndex >= 0 && brickIndex < world.brickCount) {
        spawnBrickGhost(vfx, {
          x: world.brickX[brickIndex],
          y: world.brickY[brickIndex],
          w: world.brickW[brickIndex],
          h: world.brickH[brickIndex],
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
        });
      }
      continue;
    }

    if (code === EventCode.PADDLE_HIT) {
      punchPaddleSquash(vfx);
      continue;
    }

    if (code === EventCode.LIFE_LOST) {
      punchShake(vfx, IMPULSE_LIFE_LOST, intensity);
    }
  }
}
