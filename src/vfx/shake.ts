import type { VfxState } from './types';

/**
 * Merge shake impulse with max + hard cap, then scale by intensity (D-15…D-19).
 * Literals must stay in-file for worklet safety / acceptance greps (CAP 2.5, decay 0.85).
 * Does not mutate World simulation coordinates.
 */
export function punchShake(
  vfx: VfxState,
  impulse: number,
  intensity: number,
): void {
  'worklet';
  const capped = Math.min(2.5, Math.max(vfx.shakeAmp, impulse));
  vfx.shakeAmp = capped * intensity;
}

/** Decay amp ×0.85; zero below 0.05. intensity unused (baked at punch). */
export function stepShake(vfx: VfxState, _intensity: number): void {
  'worklet';
  let amp = vfx.shakeAmp * 0.85;
  if (amp < 0.05) {
    amp = 0;
  }
  vfx.shakeAmp = amp;
}

/** Cosmetic offset from amp × unit direction (nx, ny). */
export function shakeOffset(
  amp: number,
  nx: number,
  ny: number,
): { x: number; y: number } {
  'worklet';
  return { x: amp * nx, y: amp * ny };
}
