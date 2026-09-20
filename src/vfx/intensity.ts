/** Pure VFX intensity helpers — worklet-safe, no React/Skia (D-03). */

export function intensityFromReduceMotion(enabled: boolean): number {
  'worklet';
  return enabled ? 0.2 : 1.0;
}

/**
 * Trail history samples; always ≥2 (D-13).
 * Locked endpoints: intensity 1.0 → 5, 0.2 → 2 (UI-SPEC / plan asserts).
 * Note: `round(3+2*i)` yields 3 at 0.2 — use `round(5*i)` so reduce-motion maps to 2.
 */
export function trailLength(intensity: number): number {
  'worklet';
  return Math.max(2, Math.min(5, Math.round(5 * intensity)));
}

/** Clamp intensity scalar to [0, 1]; reject non-finite (T-07-11). */
export function clampIntensity(v: number): number {
  'worklet';
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
