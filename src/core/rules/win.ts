import type { World } from '../types';
import { BrickFlags, SimPhase } from '../types';

/** Count bricks with hp>0 that are not UNBREAKABLE. */
export function countBreakableAlive(world: World): number {
  'worklet';
  let n = 0;
  const count = world.brickCount;
  for (let i = 0; i < count; i++) {
    if (world.brickHp[i] > 0 && (world.brickFlags[i] & BrickFlags.UNBREAKABLE) === 0) {
      n += 1;
    }
  }
  return n;
}

/** If playing and no breakables remain → WON (steel never blocks). */
export function applyWinCheck(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }
  if (countBreakableAlive(world) === 0) {
    world.simPhase = SimPhase.WON;
  }
}
