import type { Intent, World } from '../types';
import { SimPhase } from '../types';

/**
 * Deactivate all ball slots, then dock index 0 on paddle (activeBallCount=1).
 * Does not touch score (D-13).
 */
export function dockBall(world: World): void {
  'worklet';
  const maxB = world.maxBalls;
  for (let i = 0; i < maxB; i++) {
    world.ballActive[i] = 0;
  }
  const bi = 0;
  const r = world.ballRadius[bi];
  world.ballX[bi] = world.paddleX;
  world.ballY[bi] = world.paddleY - r - 1;
  world.ballVx[bi] = 0;
  world.ballVy[bi] = 0;
  world.ballActive[bi] = 1;
  world.activeBallCount = 1;
}

/**
 * Launch docked ball straight up at serveSpeed (PHYS-05 / audit F-21 scope-b).
 * Aimed launch deferred — dockBall snaps ballX=paddleX every docked step so
 * paddle-english offset was always zero; keep the honest fixed-vertical contract.
 */
export function applyServe(world: World, serveSpeed: number): void {
  'worklet';
  if (!Number.isFinite(serveSpeed) || !(serveSpeed > 0)) {
    return;
  }
  const bi = 0;
  world.ballVx[bi] = 0;
  world.ballVy[bi] = -serveSpeed;
  world.ballActive[bi] = 1;
  world.activeBallCount = 1;
}

/**
 * While docked: keep ball snapped; on finite non-zero launch → serve + PLAYING.
 * Caller owns clearing intent.launch after the step.
 */
export function processDocked(world: World, intent: Intent, serveSpeed: number): void {
  'worklet';
  dockBall(world);
  const launch = intent.launch;
  if (Number.isFinite(launch) && launch !== 0) {
    applyServe(world, serveSpeed);
    world.simPhase = SimPhase.PLAYING;
  }
}
