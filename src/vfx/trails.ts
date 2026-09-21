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

/** Zero one ball's trail ring (F-16 — after death / compaction). */
export function clearTrailBall(vfx: VfxState, ballIndex: number): void {
  'worklet';
  if (ballIndex < 0 || ballIndex >= vfx.maxBalls) {
    return;
  }
  vfx.trailHead[ballIndex] = 0;
  const base = ballIndex * TRAIL_MAX;
  for (let i = 0; i < TRAIL_MAX; i++) {
    vfx.trailX[base + i] = 0;
    vfx.trailY[base + i] = 0;
  }
}

/** Clear trails for every slot at/above live ball count (post-compact). */
export function clearTrailsFromIndex(vfx: VfxState, fromIndex: number): void {
  'worklet';
  const start = fromIndex < 0 ? 0 : fromIndex;
  for (let i = start; i < vfx.maxBalls; i++) {
    clearTrailBall(vfx, i);
  }
}

/** Alias used by barrel / allocate naming in patterns. */
export function allocateTrails(vfx: VfxState): VfxState {
  'worklet';
  return vfx;
}
