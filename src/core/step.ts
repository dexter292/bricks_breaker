import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants';
import type { SpikeWorld } from './types';

/**
 * Advance stub sprites by velocity * dt and bounce inside the logical box.
 * No allocations in the hot loop.
 */
export function stepStub(world: SpikeWorld, dt: number): void {
  'worklet';
  const n = world.spriteCount;
  const { x, y, vx, vy, w, h } = world;

  for (let i = 0; i < n; i++) {
    let nx = x[i] + vx[i] * dt;
    let ny = y[i] + vy[i] * dt;
    const halfW = w[i] * 0.5;
    const halfH = h[i] * 0.5;

    if (nx - halfW < 0) {
      nx = halfW;
      vx[i] = -vx[i];
    } else if (nx + halfW > LOGICAL_WIDTH) {
      nx = LOGICAL_WIDTH - halfW;
      vx[i] = -vx[i];
    }

    if (ny - halfH < 0) {
      ny = halfH;
      vy[i] = -vy[i];
    } else if (ny + halfH > LOGICAL_HEIGHT) {
      ny = LOGICAL_HEIGHT - halfH;
      vy[i] = -vy[i];
    }

    x[i] = nx;
    y[i] = ny;
  }

  world.tick += 1;
}
