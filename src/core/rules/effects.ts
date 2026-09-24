/**
 * Timed effects — paddle expand + slow-ball + fireball (PWR-02 / N-PWR-02…04).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   PADDLE_WIDTH = 72
 *   EXPAND_SCALE = 1.5
 *   EXPAND_DURATION_TICKS = 1200
 *   SLOW_DURATION_TICKS = 960
 *   SLOW_SPEED_SCALE = 0.5
 *   FIREBALL_DURATION_TICKS = 960
 *   LOGICAL_WIDTH = 360
 *   EFFECT_TYPE_EXPAND = 1
 *   EFFECT_TYPE_SLOW = 2
 *   EFFECT_TYPE_FIREBALL = 3
 */
import type { World } from '../types';

/** Derive paddleW from active expand effect; clamp paddleX in field. */
export function derivePaddleWidth(world: World): void {
  'worklet';
  const baseW = 72;
  const scale = 1.5;
  const logicalWidth = 360;
  const effectTypeExpand = 1;

  let hasExpand = false;
  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeExpand) {
      hasExpand = true;
      break;
    }
  }

  world.paddleW = hasExpand ? baseW * scale : baseW;

  const half = world.paddleW * 0.5;
  let x = world.paddleX;
  if (x < half) x = half;
  else if (x > logicalWidth - half) x = logicalWidth - half;
  world.paddleX = x;
}

/**
 * Live ball speed multiplier from SLOW effect (N-PWR-02).
 * Stored vx/vy stay absolute — scale applied in step CCD / advanceBall.
 */
export function ballSpeedScale(world: World): number {
  'worklet';
  const effectTypeSlow = 2;
  const slowScale = 0.5;
  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeSlow) {
      return slowScale;
    }
  }
  return 1;
}

/** True while FIREBALL effect is active (N-PWR-03 pierce). */
export function isFireballActive(world: World): boolean {
  'worklet';
  const effectTypeFireball = 3;
  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeFireball) {
      return true;
    }
  }
  return false;
}

/**
 * N-PWR-04 — only one timed offensive effect (SLOW XOR FIREBALL).
 * Removes conflicting offensive types; expand is never cleared here.
 */
export function clearConflictingOffensiveEffects(
  world: World,
  keepType: number,
): void {
  'worklet';
  const effectTypeSlow = 2;
  const effectTypeFireball = 3;
  let write = 0;
  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    const t = world.effectType[i];
    const isOffensive = t === effectTypeSlow || t === effectTypeFireball;
    if (isOffensive && t !== keepType) {
      world.effectType[i] = 0;
      world.effectUntilTick[i] = 0;
      continue;
    }
    if (write !== i) {
      world.effectType[write] = t;
      world.effectUntilTick[write] = world.effectUntilTick[i];
      world.effectType[i] = 0;
      world.effectUntilTick[i] = 0;
    }
    write += 1;
  }
  world.effectCount = write;
}

/**
 * Apply expand with refresh stackPolicy (D-08).
 * If expand already active, only refresh effectUntilTick; never stack width.
 */
export function applyOrRefreshExpand(world: World): void {
  'worklet';
  const durationTicks = 1200;
  const effectTypeExpand = 1;
  const until = world.tick + durationTicks;

  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeExpand) {
      world.effectUntilTick[i] = until;
      derivePaddleWidth(world);
      return;
    }
  }

  if (n >= world.maxEffects) {
    derivePaddleWidth(world);
    return;
  }

  world.effectType[n] = effectTypeExpand;
  world.effectUntilTick[n] = until;
  world.effectCount = n + 1;
  derivePaddleWidth(world);
}

/**
 * Apply / refresh slow-ball (N-PWR-02). Clears fireball if present (N-PWR-04).
 */
export function applyOrRefreshSlow(world: World): void {
  'worklet';
  const durationTicks = 960;
  const effectTypeSlow = 2;
  clearConflictingOffensiveEffects(world, effectTypeSlow);
  const until = world.tick + durationTicks;

  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeSlow) {
      world.effectUntilTick[i] = until;
      return;
    }
  }

  if (n >= world.maxEffects) {
    return;
  }

  world.effectType[n] = effectTypeSlow;
  world.effectUntilTick[n] = until;
  world.effectCount = n + 1;
}

/**
 * Apply / refresh fireball pierce (N-PWR-03). Clears slow if present (N-PWR-04).
 */
export function applyOrRefreshFireball(world: World): void {
  'worklet';
  const durationTicks = 960;
  const effectTypeFireball = 3;
  clearConflictingOffensiveEffects(world, effectTypeFireball);
  const until = world.tick + durationTicks;

  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (world.effectType[i] === effectTypeFireball) {
      world.effectUntilTick[i] = until;
      return;
    }
  }

  if (n >= world.maxEffects) {
    return;
  }

  world.effectType[n] = effectTypeFireball;
  world.effectUntilTick[n] = until;
  world.effectCount = n + 1;
}

/**
 * Expire effects whose untilTick has passed; compact slots; re-derive paddleW.
 */
export function stepEffects(world: World): void {
  'worklet';
  const tick = world.tick;
  let write = 0;
  const n = world.effectCount;
  for (let i = 0; i < n; i++) {
    if (tick >= world.effectUntilTick[i]) {
      world.effectType[i] = 0;
      world.effectUntilTick[i] = 0;
      continue;
    }
    if (write !== i) {
      world.effectType[write] = world.effectType[i];
      world.effectUntilTick[write] = world.effectUntilTick[i];
      world.effectType[i] = 0;
      world.effectUntilTick[i] = 0;
    }
    write += 1;
  }
  world.effectCount = write;
  derivePaddleWidth(world);
}
