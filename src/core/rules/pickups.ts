/**
 * Pickup drop / fall / AABB catch (PWR-01 / PWR-03).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   DROP_CHANCE = 0.2
 *   DROP_TYPE_MULTIBALL_THRESHOLD = 0.5
 *   PICKUP_FALL_SPEED = 120
 *   PICKUP_WIDTH = 20
 *   PICKUP_HEIGHT = 12
 *   LOGICAL_HEIGHT = 640
 *   PICKUP_TYPE_MULTIBALL = 1
 *   PICKUP_TYPE_EXPAND = 2
 */
import type { World } from '../types';
import { EventCode } from '../types';
import { nextFloat } from '../rng/mulberry32';
import { applyOrRefreshExpand } from './effects';
import { spawnMultiballFromPaddle } from './multiball';

/** Find first inactive pickup slot, or -1 if full. */
function findFreePickupSlot(world: World): number {
  'worklet';
  for (let i = 0; i < world.maxPickups; i++) {
    if (world.pickupActive[i] === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Roll gameplay RNG on BRICK_BREAK events and maybe spawn pickups (D-05/D-09).
 * Does not clear the ring. Gameplay stream only (T-05-01).
 */
export function applyDropsFromBreaks(world: World): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }

  const dropChance = 0.2;
  const multiballThreshold = 0.5;
  const typeMultiball = 1;
  const typeExpand = 2;

  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    if (world.evCode[idx] !== EventCode.BRICK_BREAK) {
      continue;
    }

    const roll = nextFloat(world.rngGameplay, 0);
    if (roll >= dropChance) {
      continue;
    }

    const which = nextFloat(world.rngGameplay, 0);
    const slot = findFreePickupSlot(world);
    if (slot < 0) {
      continue;
    }

    world.pickupX[slot] = world.evX[idx];
    world.pickupY[slot] = world.evY[idx];
    world.pickupType[slot] =
      which < multiballThreshold ? typeMultiball : typeExpand;
    world.pickupActive[slot] = 1;
    world.pickupCount += 1;
  }
}

/**
 * Fall pickups, remove below field, AABB-catch on paddle (D-10/D-11).
 * Catch wires multiball spawn / expand refresh. No magnetic pull.
 */
export function stepPickups(world: World, dt: number): void {
  'worklet';
  // Allow dt===0 for catch-only steps; reject NaN/negative
  if (!Number.isFinite(dt) || dt < 0) {
    return;
  }

  const fallSpeed = 120;
  const pickupHalfW = 20 * 0.5;
  const pickupHalfH = 12 * 0.5;
  const logicalHeight = 640;
  const typeMultiball = 1;
  const typeExpand = 2;

  const paddleHalfW = world.paddleW * 0.5;
  const paddleMinX = world.paddleX - paddleHalfW;
  const paddleMaxX = world.paddleX + paddleHalfW;
  const paddleMinY = world.paddleY;
  const paddleMaxY = world.paddleY + world.paddleH;

  let live = 0;
  for (let i = 0; i < world.maxPickups; i++) {
    if (world.pickupActive[i] === 0) {
      continue;
    }

    world.pickupY[i] += fallSpeed * dt;
    const y = world.pickupY[i];
    const x = world.pickupX[i];

    if (y > logicalHeight) {
      world.pickupActive[i] = 0;
      world.pickupType[i] = 0;
      continue;
    }

    const pMinX = x - pickupHalfW;
    const pMaxX = x + pickupHalfW;
    const pMinY = y - pickupHalfH;
    const pMaxY = y + pickupHalfH;

    const overlap =
      pMinX < paddleMaxX &&
      pMaxX > paddleMinX &&
      pMinY < paddleMaxY &&
      pMaxY > paddleMinY;

    if (overlap) {
      const type = world.pickupType[i];
      world.pickupActive[i] = 0;
      world.pickupType[i] = 0;
      if (type === typeMultiball) {
        spawnMultiballFromPaddle(world);
      } else if (type === typeExpand) {
        applyOrRefreshExpand(world);
      }
      continue;
    }

    live += 1;
  }
  world.pickupCount = live;
}
