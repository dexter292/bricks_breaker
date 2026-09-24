/** UI-SPEC Phase 3 flat fills — no cliff cyan in gameplay (D-01/D-02). */

export const FIELD_NAVY = '#1a1a2e';
export const LETTERBOX_BLACK = '#000000';
export const BALL_PADDLE = '#FFFFFF';

/** Trail rim / particle fleck cyan — Shatter neon (D-01); never Phase 1 cliff `#00ffaa`. */
export const TRAIL_CYAN = '#67E8F9';

export const BRICK_HP3 = '#C44569';
export const BRICK_HP2 = '#E07A5F';
export const BRICK_HP1 = '#F2CC8F';
export const BRICK_UNBREAKABLE = '#6B7280';
/** Explosive brick fill (N-BRK-01) — distinct from HP palette. */
export const BRICK_EXPLOSIVE = '#F97316';

/** BrickFlags bits — mirrored to avoid coupling draw helpers to core imports. */
const UNBREAKABLE_BIT = 1;
const EXPLOSIVE_BIT = 2;

/**
 * Flat brick fill from remaining HP / flags (UI-SPEC row palette + explosive).
 */
export function brickFill(hp: number, flags: number): string {
  'worklet';
  if ((flags & UNBREAKABLE_BIT) !== 0) {
    return BRICK_UNBREAKABLE;
  }
  if ((flags & EXPLOSIVE_BIT) !== 0) {
    return BRICK_EXPLOSIVE;
  }
  if (hp >= 3) {
    return BRICK_HP3;
  }
  if (hp === 2) {
    return BRICK_HP2;
  }
  return BRICK_HP1;
}
