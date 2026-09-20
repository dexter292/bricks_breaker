import type { World } from '../types';
import { EventCode, SimPhase } from '../types';
import { dockBall } from './serve';

/**
 * Scan event ring for BALL_OUT → decrement lives; re-dock or LOST.
 * Does not clear the ring (stepRun / stepWorld own clear policy).
 */
export function applyLivesFromEvents(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }

  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  let ballOut = false;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    if (world.evCode[idx] === EventCode.BALL_OUT) {
      ballOut = true;
      break;
    }
  }
  if (!ballOut) {
    return;
  }

  let lives = world.lives - 1;
  if (lives < 0) lives = 0;
  world.lives = lives;

  if (lives > 0) {
    world.simPhase = SimPhase.DOCKED;
    dockBall(world);
  } else {
    world.simPhase = SimPhase.LOST;
  }
}
