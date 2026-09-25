import type { VfxState } from './types';
import { GHOST_CAP_DEFAULT } from './types';

/** Ghost pool cap — re-export for acceptance greps / callers. */
export const GHOST_CAP = GHOST_CAP_DEFAULT;

/** Short scale/fade life (UI-SPEC ≤~150–250ms — keep short). */
export const GHOST_LIFE_MAX = 0.15;

export type BrickGhostGeom = {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
};

function findFreeOrEvictGhost(vfx: VfxState): number {
  'worklet';
  for (let i = 0; i < vfx.ghostCap; i++) {
    if (vfx.ghostActive[i] === 0) {
      return i;
    }
  }
  const slot = vfx.ghostOldest % vfx.ghostCap;
  vfx.ghostOldest = (slot + 1) % vfx.ghostCap;
  return slot;
}

/**
 * Snapshot brick geom/rgb into ghost SoA. Caller passes geom — never reads World.
 * Round-robin evict when full (ghostOldest advances only on full-pool spawn).
 */
export function spawnBrickGhost(
  vfx: VfxState,
  geom: BrickGhostGeom,
  lifeMax?: number,
): void {
  'worklet';
  const life = lifeMax != null && lifeMax > 0 ? lifeMax : GHOST_LIFE_MAX;
  const slot = findFreeOrEvictGhost(vfx);
  vfx.ghostX[slot] = geom.x;
  vfx.ghostY[slot] = geom.y;
  vfx.ghostW[slot] = geom.w;
  vfx.ghostH[slot] = geom.h;
  vfx.ghostR[slot] = geom.r;
  vfx.ghostG[slot] = geom.g;
  vfx.ghostB[slot] = geom.b;
  vfx.ghostLifeMax[slot] = life;
  vfx.ghostLife[slot] = life;
  vfx.ghostActive[slot] = 1;
}

/** Decay ghost life; release when ≤ 0. */
export function stepBrickGhosts(vfx: VfxState, dt: number): void {
  'worklet';
  if (dt <= 0) {
    return;
  }
  for (let i = 0; i < vfx.ghostCap; i++) {
    if (vfx.ghostActive[i] === 0) continue;
    vfx.ghostLife[i] -= dt;
    if (vfx.ghostLife[i] <= 0) {
      vfx.ghostLife[i] = 0;
      vfx.ghostActive[i] = 0;
    }
  }
}

/**
 * Pure draw params from remaining life fraction (t=1→0).
 * Writes into `out` — out[0]=scale, out[1]=alpha. No object alloc (SoA draw path).
 * scale: 0.85 + 0.15*t (short shrink); alpha: t (fade out).
 */
export function ghostDrawFromLife(
  life: number,
  lifeMax: number,
  out: Float32Array,
): void {
  'worklet';
  const max = lifeMax > 0 ? lifeMax : GHOST_LIFE_MAX;
  let t = life / max;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  out[0] = 0.85 + 0.15 * t;
  out[1] = t;
}
