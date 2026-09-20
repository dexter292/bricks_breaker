import type { World } from '../types';

/**
 * Advance ball i by velocity * t (t is remaining-time or TOI×remaining).
 * Zero alloc; mutates SoA in place.
 */
export function advanceBall(world: World, i: number, t: number): void {
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
  world.ballX[ix] = world.ballX[ix] + vx * t;
  world.ballY[ix] = world.ballY[ix] + vy * t;
}
