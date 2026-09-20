/**
 * Scoring rules (RUN-01).
 *
 * Worklet close-over ban: inlined literals below MUST match constants.ts:
 *   SCORE_HIT = 10
 *   SCORE_BREAK_BONUS = 50
 */
import type { World } from '../types';
import { BrickFlags, EventCode, SimPhase } from '../types';

/**
 * Award score + combo from the event ring (RUN-01 / D-01…D-04).
 * Does not clear the ring (stepRun owns clear policy).
 * Never touches RNG streams (T-05-01).
 */
export function applyScoringFromEvents(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }

  const n = world.evCount;
  if (n <= 0) {
    return;
  }

  // Worklet-local literals — must match SCORE_HIT / SCORE_BREAK_BONUS in constants.ts
  const scoreHit = 10;
  const scoreBreakBonus = 50;

  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];

    if (code === EventCode.PADDLE_HIT) {
      world.combo = 1;
      continue;
    }

    if (code === EventCode.BRICK_HIT) {
      const b = world.evB[idx];
      if (b >= 0 && (world.brickFlags[b] & BrickFlags.UNBREAKABLE) !== 0) {
        continue;
      }
      world.score += scoreHit * world.combo;
      world.combo += 1;
      continue;
    }

    if (code === EventCode.BRICK_BREAK) {
      world.score += (scoreHit + scoreBreakBonus) * world.combo;
      world.combo += 1;
    }
  }
}
