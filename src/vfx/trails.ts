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

/** Alias used by barrel / allocate naming in patterns. */
export function allocateTrails(vfx: VfxState): VfxState {
  'worklet';
  return vfx;
}
