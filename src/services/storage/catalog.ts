/**
 * Playable campaign catalog order (N-PROG-01 / D-01).
 * Matches PlayingHost DEV cycle — never includes level-02.
 *
 * Order is the E2 difficulty curve (N-CNT-01), not the file-name order: it is monotone
 * non-decreasing in both brick count (32 → 48 → 55 → 68 → 94) and total HP
 * (55 → 64 → 94 → 132 → 173). `level-03` "Neon Gauntlet" is the 10×16 showpiece and is
 * ~2.7× the authored weight of `level-04`; it sat at slot 2 before E2, making slot 2 the
 * hardest board in the campaign. It is now the finale. Guarded by
 * `tests/balance.curve-e2.test.ts`; measurements in `docs/ops/BALANCE-E2.md`.
 */
import type { LevelId } from '../../core';

export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01',
  'level-04',
  'level-05',
  'level-06',
  'level-03',
] as const;

export function defaultUnlocked(): LevelId[] {
  return ['level-01'];
}

/** Next playable id after `id`, or null at end / unknown. */
export function nextLevelId(id: LevelId): LevelId | null {
  const i = PLAYABLE_LEVEL_ORDER.indexOf(id);
  if (i < 0) {
    return null;
  }
  if (i >= PLAYABLE_LEVEL_ORDER.length - 1) {
    return null;
  }
  return PLAYABLE_LEVEL_ORDER[i + 1] ?? null;
}
