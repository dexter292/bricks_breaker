import type { World } from '../types';

/**
 * Push an event into the fixed-capacity SoA ring (D-08).
 * Overflow policy: drop newest + set evOverflow = 1. No heap alloc.
 */
export function pushEvent(
  world: World,
  code: number,
  a: number,
  b: number,
  x: number,
  y: number,
): void {
  'worklet';
  if (world.evCount >= world.evCap) {
    world.evOverflow = 1;
    return;
  }
  const i = world.evHead;
  world.evCode[i] = code;
  world.evA[i] = a;
  world.evB[i] = b;
  world.evX[i] = x;
  world.evY[i] = y;
  world.evHead = (i + 1) % world.evCap;
  world.evCount += 1;
}

/** Clear ring cursors (does not zero payload arrays). */
export function clearEvents(world: World): void {
  'worklet';
  world.evHead = 0;
  world.evCount = 0;
  world.evOverflow = 0;
}
