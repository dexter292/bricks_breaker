/**
 * Deterministic anti-stall escalation (PHYS-07 / D-15…D-18).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   STALL_IDLE_TICKS = 960
 *   STALL_TIER2_EXTRA_TICKS = 240 → tier 2 at 1200
 *   STALL_TIER3_EXTRA_TICKS = 480 → tier 3 at 1440
 *   STALL_SPEED_MULT = 1.08
 *   MAX_BALL_SPEED = 720
 *   STALL_ANGLE_NUDGE_DEG = 8
 *   MIN_VERTICAL_RATIO = cos(62°)
 *
 * PHYS-07: no random bounce jitter
 */
import type { World } from '../types';
import { BrickFlags, EventCode, SimPhase } from '../types';
import {
  enforceMinVerticalRatio,
  enforceMinHorizontalRatio,
} from '../physics/resolve';

/** True if the event ring contains breakable BRICK_HIT or BRICK_BREAK. */
function hasBreakableDamage(world: World): boolean {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return false;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];
    if (code !== EventCode.BRICK_HIT && code !== EventCode.BRICK_BREAK) {
      continue;
    }
    const b = world.evB[idx];
    if (b < 0 || b >= world.brickCount) {
      // BREAK without a valid brick index still counts as breakable damage
      if (code === EventCode.BRICK_BREAK) {
        return true;
      }
      continue;
    }
    if ((world.brickFlags[b] & BrickFlags.UNBREAKABLE) !== 0) {
      continue;
    }
    return true;
  }
  return false;
}

/** Multiply live ball speeds by 1.08, clamp to MAX_BALL_SPEED, preserve direction. */
function applyTier2SpeedBoost(world: World): void {
  'worklet';
  const speedMult = 1.08;
  const maxSpeed = 720;
  const limit = world.activeBallCount;
  for (let i = 0; i < limit; i++) {
    if (world.ballActive[i] === 0) {
      continue;
    }
    let vx = world.ballVx[i];
    let vy = world.ballVy[i];
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      continue;
    }
    const speed0 = Math.hypot(vx, vy);
    if (!(speed0 > 0)) {
      continue;
    }
    let speed1 = speed0 * speedMult;
    if (speed1 > maxSpeed) {
      speed1 = maxSpeed;
    }
    const scale = speed1 / speed0;
    vx *= scale;
    vy *= scale;
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      continue;
    }
    // F-22: when already at MAX_BALL_SPEED the boost is a no-op — still
    // lift near-horizontal headings so recovery is not deferred to tier 3.
    let steep = enforceMinVerticalRatio(vx, vy);
    steep = enforceMinHorizontalRatio(steep.vx, steep.vy);
    world.ballVx[i] = steep.vx;
    world.ballVy[i] = steep.vy;
  }
}

/**
 * Rotate each live ball by escalating ±nudge (8°, 16°, 24°… capped at 30°),
 * alternating sign by ball index and repeat count; enforce both angle floors.
 */
function applyTier3AngleNudge(world: World, repeatN: number): void {
  'worklet';
  const baseNudgeDeg = 8;
  const nudgeDeg =
    baseNudgeDeg + baseNudgeDeg * repeatN > 30
      ? 30
      : baseNudgeDeg + baseNudgeDeg * repeatN;
  const nudgeRad = (nudgeDeg * Math.PI) / 180;
  const maxSpeed = 720;

  const limit = world.activeBallCount;
  for (let i = 0; i < limit; i++) {
    if (world.ballActive[i] === 0) {
      continue;
    }
    let vx = world.ballVx[i];
    let vy = world.ballVy[i];
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
      continue;
    }
    let speed = Math.hypot(vx, vy);
    if (!(speed > 0)) {
      continue;
    }

    const signParity = i % 2 === 0 ? 1 : -1;
    const signRepeat = repeatN % 2 === 0 ? 1 : -1;
    const theta = signParity * signRepeat * nudgeRad;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    let nvx = vx * c - vy * s;
    let nvy = vx * s + vy * c;
    if (!Number.isFinite(nvx) || !Number.isFinite(nvy)) {
      continue;
    }

    const speed1 = Math.hypot(nvx, nvy);
    if (speed1 > 0) {
      const scale = speed / speed1;
      nvx *= scale;
      nvy *= scale;
    }

    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      nvx *= scale;
      nvy *= scale;
      speed = maxSpeed;
    }

    let steep = enforceMinVerticalRatio(nvx, nvy);
    let flat = enforceMinHorizontalRatio(steep.vx, steep.vy);
    nvx = flat.vx;
    nvy = flat.vy;

    if (!Number.isFinite(nvx) || !Number.isFinite(nvy)) {
      continue;
    }
    world.ballVx[i] = nvx;
    world.ballVy[i] = nvy;
  }
}

/**
 * Advance run-level stall idle + escalate tiers on PLAYING steps only.
 * Idle increments only when this function runs — pause must skip stepRun.
 */
export function stepAntiStall(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }

  // Literals must match STALL_* / MAX_BALL_SPEED in constants.ts
  const idleTier1 = 960;
  const idleTier2 = 1200; // 960 + 240
  const idleTier3 = 1440; // 960 + 480
  const tier3Repeat = 240; // STALL_TIER3_REPEAT_TICKS

  if (hasBreakableDamage(world)) {
    world.stallIdleTicks = 0;
    world.stallTier = 0;
    return;
  }

  world.stallIdleTicks += 1;
  const idle = world.stallIdleTicks;
  const prevTier = world.stallTier;

  let nextTier = 0;
  if (idle >= idleTier3) {
    nextTier = 3;
  } else if (idle >= idleTier2) {
    nextTier = 2;
  } else if (idle >= idleTier1) {
    nextTier = 1;
  }
  world.stallTier = nextTier;

  if (nextTier >= 2 && prevTier < 2) {
    applyTier2SpeedBoost(world);
  }
  if (nextTier >= 3) {
    const sinceTier3 = idle - idleTier3;
    const repeatN = Math.floor(sinceTier3 / tier3Repeat);
    if (prevTier < 3) {
      applyTier3AngleNudge(world, repeatN);
    } else if (sinceTier3 > 0 && sinceTier3 % tier3Repeat === 0) {
      applyTier3AngleNudge(world, repeatN);
    }
  }
}
