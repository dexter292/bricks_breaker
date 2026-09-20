/**
 * Timed paddle-expand effects (PWR-02).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   PADDLE_WIDTH = 72
 *   EXPAND_SCALE = 1.5
 *   EXPAND_DURATION_TICKS = 1200
 *   LOGICAL_WIDTH = 360
 *   EFFECT_TYPE_EXPAND = 1
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
