import type { SfxId } from './types';

/**
 * Map simulation EventCode integers → SfxId.
 * Numeric literals only (services must not import core/) — mirrors EventCode:
 * WALL_HIT=1, PADDLE_HIT=2, BRICK_HIT=3, BRICK_BREAK=4, BALL_OUT=5,
 * POWERUP_CATCH=6, LIFE_LOST=7, WIN=8, LOSE=9.
 */
export function mapEventToSfx(code: number): SfxId | null {
  switch (code) {
    case 2: // PADDLE_HIT
      return 'paddle_hit';
    case 3: // BRICK_HIT
      return 'brick_chip';
    case 4: // BRICK_BREAK
      return 'brick_break';
    case 6: // POWERUP_CATCH
      return 'powerup_catch';
    case 7: // LIFE_LOST
      return 'life_lost';
    case 8: // WIN
      return 'win';
    case 9: // LOSE
      return 'lose';
    default:
      // WALL_HIT (1), BALL_OUT (5), unknown
      return null;
  }
}

/** Linear gain hierarchy (D-22): life/win/lose → break → paddle/chip → catch. */
export const SFX_VOLUME: Record<SfxId, number> = {
  life_lost: 1.0,
  win: 1.0,
  lose: 1.0,
  brick_break: 0.85,
  paddle_hit: 0.7,
  brick_chip: 0.7,
  powerup_catch: 0.55,
};

/** Per-category voice pool sizes (D-23). */
export const VOICE_LIMITS: Record<SfxId, number> = {
  brick_chip: 3,
  brick_break: 3,
  paddle_hit: 2,
  powerup_catch: 2,
  life_lost: 1,
  win: 1,
  lose: 1,
};

/** Round-robin voice index; at limit reuses oldest (cursor % poolLen). */
export function selectVoiceIndex(cursor: number, poolLen: number): number {
  if (poolLen <= 0) return 0;
  return cursor % poolLen;
}
