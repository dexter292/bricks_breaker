/**
 * F-45 / N-CNT-03 — ball speed ramp (Phase E2).
 *
 * Raises a **floor** under live ball speed as the run goes on:
 *
 *     floor(t) = min(SERVE_SPEED * (1 + SPEED_RAMP_PER_SECOND * t), MAX_BALL_SPEED)
 *
 * A floor, not an assignment — anything already faster (anti-stall tier-2 ×1.08) keeps
 * its speed, so stall escalation is unaffected. Direction is always preserved.
 *
 * `t` comes from `world.tick`, so the ramp is a pure function of world state and
 * `hashWorld` stays reproducible.
 *
 * Rationale and measurements: `docs/ops/BALANCE-E2.md`.
 */
import type { World } from '../types';

/** Apply the ramp floor to every live ball. */
export function applySpeedRamp(world: World): void {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const ratePerSecond = 0.01; // SPEED_RAMP_PER_SECOND
  const serveSpeed = 360; // SERVE_SPEED
  const maxSpeed = 720; // MAX_BALL_SPEED
  const ticksPerSecond = 120; // 1 / FIXED_DT

  if (!(ratePerSecond > 0)) {
    return;
  }

  const elapsed = world.tick / ticksPerSecond;
  let floorSpeed = serveSpeed * (1 + ratePerSecond * elapsed);
  if (floorSpeed > maxSpeed) {
    floorSpeed = maxSpeed;
  }

  const limit = world.activeBallCount;
  for (let i = 0; i < limit; i++) {
    if (world.ballActive[i] === 0) {
      continue;
    }
    const vx = world.ballVx[i];
    const vy = world.ballVy[i];
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      continue;
    }
    const speed0 = Math.hypot(vx, vy);
    if (!(speed0 > 0) || speed0 >= floorSpeed) {
      continue;
    }
    const scale = floorSpeed / speed0;
    const nvx = vx * scale;
    const nvy = vy * scale;
    if (!Number.isFinite(nvx) || !Number.isFinite(nvy)) {
      continue;
    }
    world.ballVx[i] = nvx;
    world.ballVy[i] = nvy;
  }
}
