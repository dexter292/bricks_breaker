/**
 * Playable campaign catalog order (N-PROG-01 / D-01).
 * Matches PlayingHost DEV cycle — never includes level-02.
 */
import type { LevelId } from '../../core';

export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
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
