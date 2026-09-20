/** Logical play-field — must match core allocate/step. */
export const LOGICAL_W = 360;
export const LOGICAL_H = 640;

export type Camera = { scale: number; ox: number; oy: number };

/**
 * Uniform letterbox scale into a surface/safe box (D-03).
 * Non-finite or sub-1 sizes fall back to logical dims (T-03-01).
 */
export function makeCamera(safeW: number, safeH: number): Camera {
  'worklet';
  const sw = Number.isFinite(safeW) && safeW > 1 ? safeW : LOGICAL_W;
  const sh = Number.isFinite(safeH) && safeH > 1 ? safeH : LOGICAL_H;
  const scale = Math.min(sw / LOGICAL_W, sh / LOGICAL_H);
  return {
    scale,
    ox: (sw - LOGICAL_W * scale) * 0.5,
    oy: (sh - LOGICAL_H * scale) * 0.5,
  };
}
