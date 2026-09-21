import type { VfxState } from './types';

/**
 * Merge shake impulse with max + hard cap (D-15…D-19 / F-28).
 * Impulse is scaled by intensity BEFORE max-merge so a soft punch cannot
 * shrink an already-running shake: max(amp, impulse*intensity) then cap 2.5.
 */
export function punchShake(
  vfx: VfxState,
  impulse: number,
  intensity: number,
): void {
  'worklet';
  const scaled = impulse * intensity;
  vfx.shakeAmp = Math.min(2.5, Math.max(vfx.shakeAmp, scaled));
}

/**
 * Decay amp toward 0. Factor 0.85 per 1/60s (F-31 dt-based).
 * intensity unused (baked at punch).
 */
export function stepShake(vfx: VfxState, _intensity: number, dt?: number): void {
  'worklet';
  const frameDt =
    dt != null && Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
  const factor = Math.pow(0.85, frameDt * 60);
  let amp = vfx.shakeAmp * factor;
  if (amp < 0.05) {
    amp = 0;
  }
  vfx.shakeAmp = amp;
  // Advance phase so render can alternate direction (F-31).
  vfx.shakePhase = (vfx.shakePhase + frameDt * 18) % (Math.PI * 2);
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
