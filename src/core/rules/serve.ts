import type { Intent, World } from '../types';
import { SimPhase } from '../types';
import { resolvePaddleEnglish } from '../physics/resolve';

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
 * Launch via paddle english with upward seed velocity (0, -serveSpeed).
 * Deterministic — no host RNG.
 */
export function applyServe(world: World, serveSpeed: number): void {
  'worklet';
  if (!Number.isFinite(serveSpeed) || !(serveSpeed > 0)) {
    return;
  }
  const bi = 0;
  const half = world.paddleW * 0.5;
  const out = resolvePaddleEnglish(
    world.ballX[bi],
    world.paddleX,
    half,
    0,
    -serveSpeed,
  );
  world.ballVx[bi] = out.vx;
  world.ballVy[bi] = out.vy;
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
