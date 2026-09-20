import type { Intent, World } from './types';

/**
 * Advance one fixed simulation step (stub until Wave 2 CCD).
 * Applies finite paddleX clamp; ignores non-finite intent (T-02-01).
 */
export function stepWorld(world: World, intent: Intent, dt: number): void {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const logicalWidth = 360;
  void dt; // Wave 2 CCD will consume dt; stub keeps ball SoA untouched

  // Clear per-step brick damage marks
  const nBricks = world.brickDamagedThisStep.length;
  for (let i = 0; i < nBricks; i++) {
    world.brickDamagedThisStep[i] = 0;
  }

  const px = intent.paddleX;
  if (Number.isFinite(px)) {
    const half = world.paddleW * 0.5;
    let x = px;
    if (x < half) x = half;
    else if (x > logicalWidth - half) x = logicalWidth - half;
    world.paddleX = x;
  }

  world.tick += 1;
}
