import type { VfxState } from './types';
import { TRAIL_MAX } from './types';

/**
 * Push a ghost sample into the per-ball typed-array ring (D-10…D-14).
 * `len` comes from trailLength(intensity) — never 0.
 */
export function pushTrail(
  vfx: VfxState,
  ballIndex: number,
  x: number,
  y: number,
  len: number,
): void {
  'worklet';
  if (ballIndex < 0 || ballIndex >= vfx.maxBalls) {
    return;
  }
  const cap = vfx.trailMax < 2 ? 2 : vfx.trailMax > TRAIL_MAX ? TRAIL_MAX : vfx.trailMax;
  const ringLen = len < 2 ? 2 : len > cap ? cap : len | 0;
  const head = vfx.trailHead[ballIndex] % ringLen;
  const base = ballIndex * TRAIL_MAX;
  vfx.trailX[base + head] = x;
  vfx.trailY[base + head] = y;
  vfx.trailHead[ballIndex] = (head + 1) % ringLen;
}

/**
 * Reset one ball's trail ring (F-16 / NF-7).
 * Seeds every sample to (x,y) so the renderer never draws ghosts at (0,0).
 */
export function clearTrailBall(
  vfx: VfxState,
  ballIndex: number,
  x: number,
  y: number,
): void {
  'worklet';
  if (ballIndex < 0 || ballIndex >= vfx.maxBalls) {
    return;
  }
  vfx.trailHead[ballIndex] = 0;
  const base = ballIndex * TRAIL_MAX;
  for (let i = 0; i < TRAIL_MAX; i++) {
    vfx.trailX[base + i] = x;
    vfx.trailY[base + i] = y;
  }
}

/** Clear trails for every slot at/above fromIndex (post-compact / ball death). */
export function clearTrailsFromIndex(
  vfx: VfxState,
  fromIndex: number,
  ballX?: Float32Array,
  ballY?: Float32Array,
  ballActive?: Uint8Array,
): void {
  'worklet';
  const start = fromIndex < 0 ? 0 : fromIndex;
  for (let i = start; i < vfx.maxBalls; i++) {
    let x = 0;
    let y = 0;
    if (
      ballActive != null &&
      ballX != null &&
      ballY != null &&
      i < ballActive.length &&
      ballActive[i] !== 0
    ) {
      x = ballX[i];
      y = ballY[i];
    }
    clearTrailBall(vfx, i, x, y);
  }
}

/** Alias used by barrel / allocate naming in patterns. */
export function allocateTrails(vfx: VfxState): VfxState {
  'worklet';
  return vfx;
}
