import type { World } from '../types';
import { EventCode, SimPhase } from '../types';
import { pushEvent } from '../events/ring';
import { dockBall } from './serve';
import { derivePaddleWidth } from './effects';

/**
 * Last-ball life (D-12 / D-13): decrement only when activeBallCount === 0.
 * Does not scan BALL_OUT events — multi-ball outs while others remain are free.
 */
export function applyLivesFromBallCount(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }

  if (world.activeBallCount > 0) {
    return;
  }

  let lives = world.lives - 1;
  if (lives < 0) lives = 0;
  world.lives = lives;
  pushEvent(world, EventCode.LIFE_LOST, lives, -1, world.paddleX, world.paddleY);

  if (lives > 0) {
    // D-13: clear falling pickups
    const maxP = world.maxPickups;
    for (let i = 0; i < maxP; i++) {
      world.pickupActive[i] = 0;
      world.pickupType[i] = 0;
      world.pickupX[i] = 0;
      world.pickupY[i] = 0;
    }
    world.pickupCount = 0;

    // Expire expand / all effects; restore base paddle width
    const maxE = world.maxEffects;
    for (let i = 0; i < maxE; i++) {
      world.effectType[i] = 0;
      world.effectUntilTick[i] = 0;
    }
    world.effectCount = 0;
    derivePaddleWidth(world);

    // Preserve score; reset combo on life loss
    world.combo = 1;

    world.simPhase = SimPhase.DOCKED;
    dockBall(world);
  } else {
    world.simPhase = SimPhase.LOST;
    pushEvent(world, EventCode.LOSE, 0, -1, world.paddleX, world.paddleY);
  }
}
