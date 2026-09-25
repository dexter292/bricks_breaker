import type { VfxState } from './types';

/** Max squash timer seconds (draw-only; never mutate paddleW). */
export const PADDLE_SQUASH_T_MAX = 0.1;

/** Peak cosmetic squash amplitude (≤0.15 per plan). */
export const PADDLE_SQUASH_K_MAX = 0.15;

/**
 * Punch paddle squash timer with max-merge to T_MAX.
 * Cosmetic only — never references paddleW / World.
 */
export function punchPaddleSquash(vfx: VfxState): void {
  'worklet';
  vfx.paddleSquashT = Math.max(vfx.paddleSquashT, PADDLE_SQUASH_T_MAX);
}

/** Linear decay of squash timer toward 0. */
export function stepPaddleSquash(vfx: VfxState, dt: number): void {
  'worklet';
  if (dt <= 0 || vfx.paddleSquashT <= 0) {
    return;
  }
  let t = vfx.paddleSquashT - dt;
  if (t < 0) {
    t = 0;
  }
  vfx.paddleSquashT = t;
}

/**
 * Draw-only paddle size from source W/H + squash timer.
 * Widens + shortens around center; never writes World.
 */
export function paddleSquashDrawSize(
  w: number,
  h: number,
  squashT: number,
): { w: number; h: number } {
  'worklet';
  let u = squashT / PADDLE_SQUASH_T_MAX;
  if (u < 0) u = 0;
  if (u > 1) u = 1;
  const k = u * PADDLE_SQUASH_K_MAX;
  return { w: w * (1 + k), h: h * (1 - k) };
}
