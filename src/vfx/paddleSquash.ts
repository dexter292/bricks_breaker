import type { VfxState } from './types';

/** Max squash timer seconds (draw-only; never mutate paddleW). */
export const PADDLE_SQUASH_T_MAX = 0.1;

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
