/**
 * Pickup drop / fall / AABB catch (PWR-01 / PWR-03 / N-PWR-01…04).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   DROP_CHANCE = 0.2
 *   DROP_CUM_MULTIBALL = 0.36
 *   DROP_CUM_EXPAND = 0.72
 *   DROP_CUM_SLOW = 0.82
 *   DROP_CUM_FIREBALL = 0.92
 *   PICKUP_FALL_SPEED = 120
 *   PICKUP_WIDTH = 20
 *   PICKUP_HEIGHT = 12
 *   LOGICAL_HEIGHT = 640
 *   PICKUP_TYPE_MULTIBALL = 1
 *   PICKUP_TYPE_EXPAND = 2
 *   PICKUP_TYPE_EXTRA_LIFE = 3
 *   PICKUP_TYPE_SLOW = 4
 *   PICKUP_TYPE_FIREBALL = 5
 *   MAX_LIVES = 5
 */
import type { World } from '../types';
import { EventCode, SimPhase } from '../types';
import { pushEvent } from '../events/ring';
import { nextFloat } from '../rng/mulberry32';
import {
  applyOrRefreshExpand,
  applyOrRefreshSlow,
  applyOrRefreshFireball,
} from './effects';
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

/** Map [0,1) roll → pickup type via N-PWR-04 cumulative table. */
function pickupTypeFromRoll(which: number): number {
  'worklet';
  const cumMultiball = 0.36;
  const cumExpand = 0.72;
  const cumSlow = 0.82;
  const cumFireball = 0.92;
  const typeMultiball = 1;
  const typeExpand = 2;
  const typeExtraLife = 3;
  const typeSlow = 4;
  const typeFireball = 5;
  if (which < cumMultiball) {
    return typeMultiball;
  }
  if (which < cumExpand) {
    return typeExpand;
  }
  if (which < cumSlow) {
    return typeSlow;
  }
  if (which < cumFireball) {
    return typeFireball;
  }
  return typeExtraLife;
}

/**
 * Roll gameplay RNG on BRICK_BREAK events and maybe spawn pickups (D-05/D-09).
 * Does not clear the ring. Gameplay stream only (T-05-01).
 */
export function applyDropsFromBreaks(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }
  const n = world.evCount;
  if (n <= 0) {
    return;
  }

  const dropChance = 0.2;

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
    world.pickupType[slot] = pickupTypeFromRoll(which);
    world.pickupActive[slot] = 1;
    world.pickupCount += 1;
  }
}

/**
 * Fall pickups, remove below field, AABB-catch on paddle (D-10/D-11).
 * Catch wires multiball / expand / extra life / slow / fireball. No magnetic pull.
 */
export function stepPickups(world: World, dt: number): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }
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
  const typeExtraLife = 3;
  const typeSlow = 4;
  const typeFireball = 5;
  const maxLives = 5;

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
      pushEvent(world, EventCode.POWERUP_CATCH, type, -1, x, y);
      if (type === typeMultiball) {
        spawnMultiballFromPaddle(world);
      } else if (type === typeExpand) {
        applyOrRefreshExpand(world);
      } else if (type === typeExtraLife) {
        let lives = world.lives + 1;
        if (lives > maxLives) {
          lives = maxLives;
        }
        world.lives = lives;
      } else if (type === typeSlow) {
        applyOrRefreshSlow(world);
      } else if (type === typeFireball) {
        applyOrRefreshFireball(world);
      }
      continue;
    }

    live += 1;
  }
  world.pickupCount = live;
}
