import type { World } from '../types';

/**
 * Advance ball i by velocity * t * speedScale (t is remaining-time or TOI×remaining).
 * Callers must pass speedScale explicitly (worklets: no default-param expressions).
 * Zero alloc; mutates SoA in place.
 */
export function advanceBall(
  world: World,
  i: number,
  t: number,
  speedScale: number,
): void {
  'worklet';
  if (!Number.isFinite(t) || !Number.isFinite(i) || i < 0) {
    return;
  }
  const ix = i | 0;
  if (ix >= world.maxBalls) {
    return;
  }
  const vx = world.ballVx[ix];
  const vy = world.ballVy[ix];
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    return;
  }
  const s =
    Number.isFinite(speedScale) && speedScale > 0 ? speedScale : 1;
  world.ballX[ix] = world.ballX[ix] + vx * t * s;
  world.ballY[ix] = world.ballY[ix] + vy * t * s;
}
