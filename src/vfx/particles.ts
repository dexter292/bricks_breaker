import type { VfxState } from './types';
import { CHIP_SPARKS_AT_1, DESTROY_SPARKS_AT_1 } from './types';

/** Pool caps (T-07-09) — single source in types.ts; re-export for acceptance greps. */
export {
  PARTICLE_POOL_DEFAULT,
  PARTICLE_POOL_HARD_MAX,
} from './types';

export type SpawnKind = 'chip' | 'destroy';

export type SpawnBurstOpts = {
  kind: SpawnKind;
  x: number;
  y: number;
  rgb: { r: number; g: number; b: number };
  intensity: number;
  /** Cosmetic RNG in [0,1) — never host RNG or gameplay stream (T-07-12). */
  rng: () => number;
};

export function countActiveParticles(vfx: VfxState): number {
  'worklet';
  let n = 0;
  for (let i = 0; i < vfx.particleCap; i++) {
    if (vfx.active[i] !== 0) n += 1;
  }
  return n;
}

function findFreeOrEvict(vfx: VfxState): number {
  'worklet';
  // F-60: O(1) free-list pop; FIFO ring only when full.
  if (vfx.freeTop > 0) {
    vfx.freeTop -= 1;
    return vfx.freeStack[vfx.freeTop];
  }
  const slot = vfx.particleOldest % vfx.particleCap;
  vfx.particleOldest = (slot + 1) % vfx.particleCap;
  return slot;
}

function releaseSlot(vfx: VfxState, slot: number): void {
  'worklet';
  if (vfx.active[slot] === 0) {
    return;
  }
  vfx.active[slot] = 0;
  vfx.life[slot] = 0;
  vfx.particleCount -= 1;
  if (vfx.particleCount < 0) {
    vfx.particleCount = 0;
  }
  if (vfx.freeTop < vfx.particleCap) {
    vfx.freeStack[vfx.freeTop] = slot;
    vfx.freeTop += 1;
  }
}

/**
 * Spawn a chip/destroy spark burst. Count = max(0, round(base × intensity)).
 * Pool hard-caps at particleCap (≤192); oldest eviction when full (T-07-09).
 */
export function spawnBurst(vfx: VfxState, opts: SpawnBurstOpts): void {
  'worklet';
  const base = opts.kind === 'chip' ? CHIP_SPARKS_AT_1 : DESTROY_SPARKS_AT_1;
  const count = Math.max(0, Math.round(base * opts.intensity));
  if (count <= 0) {
    return;
  }

  // Chip life 0.12–0.16s; destroy 0.16–0.22s
  const lifeMin = opts.kind === 'chip' ? 0.12 : 0.16;
  const lifeSpan = opts.kind === 'chip' ? 0.04 : 0.06;
  const speed = opts.kind === 'chip' ? 80 : 140;

  for (let n = 0; n < count; n++) {
    const slot = findFreeOrEvict(vfx);
    const wasInactive = vfx.active[slot] === 0;
    // Evicting an active slot: do not push to free-list (it stays occupied).

    const angle = opts.rng() * Math.PI * 2;
    const spd = speed * (0.5 + opts.rng() * 0.5);
    const fleck = opts.rng() < 0.25;

    vfx.px[slot] = opts.x;
    vfx.py[slot] = opts.y;
    vfx.vx[slot] = Math.cos(angle) * spd;
    vfx.vy[slot] = Math.sin(angle) * spd;
    vfx.life[slot] = lifeMin + opts.rng() * lifeSpan;

    if (fleck) {
      // White / cyan highlight fleck (D-08)
      if (opts.rng() < 0.5) {
        vfx.r[slot] = 1;
        vfx.g[slot] = 1;
        vfx.b[slot] = 1;
      } else {
        vfx.r[slot] = 0.404; // ≈ #67E8F9
        vfx.g[slot] = 0.91;
        vfx.b[slot] = 0.976;
      }
    } else {
      vfx.r[slot] = opts.rgb.r;
      vfx.g[slot] = opts.rgb.g;
      vfx.b[slot] = opts.rgb.b;
    }
    vfx.a[slot] = 1;
    vfx.active[slot] = 1;

    if (wasInactive) {
      vfx.particleCount += 1;
    }
  }

  // Keep tallies sane under eviction
  if (vfx.particleCount > vfx.particleCap) {
    vfx.particleCount = vfx.particleCap;
  }
}

/** Integrate sparks; deactivate when life ≤ 0. */
export function stepParticles(vfx: VfxState, dt: number): void {
  'worklet';
  if (dt <= 0) {
    return;
  }
  for (let i = 0; i < vfx.particleCap; i++) {
    if (vfx.active[i] === 0) continue;
    vfx.life[i] -= dt;
    if (vfx.life[i] <= 0) {
      releaseSlot(vfx, i);
      continue;
    }
    vfx.px[i] += vfx.vx[i] * dt;
    vfx.py[i] += vfx.vy[i] * dt;
    // Fade alpha with remaining life fraction (visual only)
    const fade = vfx.life[i] < 0.08 ? vfx.life[i] / 0.08 : 1;
    vfx.a[i] = fade;
  }
}
