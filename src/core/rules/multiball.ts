/**
 * Multi-ball spawn from paddle catch (PWR-01 / D-07 / D-14).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   SERVE_SPEED = 360
 *   MULTIBALL_ANGLE_A_DEG = 18
 *   MULTIBALL_ANGLE_B_DEG = 36
 *   MIN_VERTICAL_RATIO ≈ cos(62°)
 *   BALL_RADIUS = 6
 */
import type { World } from '../types';

/**
 * Spawn min(2, freeSlots) balls from paddle center at fixed angles.
 * Does not modify existing balls' velocities. Consumes no pickup itself.
 */
export function spawnMultiballFromPaddle(world: World): void {
  'worklet';
  const serveSpeed = 360;
  if (!Number.isFinite(serveSpeed) || !(serveSpeed > 0)) {
    return;
  }

  const freeSlots = world.maxBalls - world.activeBallCount;
  const toSpawn = Math.min(2, freeSlots);
  if (toSpawn <= 0) {
    return;
  }

  // Literals must match PADDLE_ANGLE_CLAMP / MIN_VERTICAL_RATIO
  const clampRad = (62 * Math.PI) / 180;
  const minVert = Math.cos(clampRad);
  const angleA = (18 * Math.PI) / 180;
  const angleB = (36 * Math.PI) / 180;
  const ballRadius = 6;

  const cx = world.paddleX;
  const cy = world.paddleY - ballRadius - 1;

  for (let s = 0; s < toSpawn; s++) {
    const slot = world.activeBallCount;
    if (slot >= world.maxBalls) {
      break;
    }

    // First spawn uses 18°, second uses 36°; + for even slot index, − for odd
    let theta = s === 0 ? angleA : angleB;
    if (slot % 2 === 1) {
      theta = -theta;
    }

    let vx = serveSpeed * Math.sin(theta);
    let vy = -serveSpeed * Math.cos(theta);

    // Clamp near-horizontal (should not trigger at 18°/36°, but guard T-05-03)
    const absVyRatio = Math.abs(vy) / serveSpeed;
    if (absVyRatio < minVert) {
      const sign = vx >= 0 ? 1 : -1;
      const clamped = sign * clampRad;
      vx = serveSpeed * Math.sin(clamped);
      vy = -serveSpeed * Math.cos(clamped);
    }

    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      continue;
    }

    world.ballX[slot] = cx;
    world.ballY[slot] = cy;
    world.ballVx[slot] = vx;
    world.ballVy[slot] = vy;
    world.ballRadius[slot] = ballRadius;
    world.ballActive[slot] = 1;
    world.activeBallCount = slot + 1;
  }
}
