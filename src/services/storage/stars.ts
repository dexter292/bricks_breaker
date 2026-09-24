/**
 * Pure star / select-row helpers — no I/O, no React (N-PROG-03 / D-07 / D-18 / D-23).
 */
import type { LevelId } from '../../core';
import type { LevelBest, StarCount } from './types';
import { isUnlocked } from './unlock';

export type SelectRowState = 'locked' | 'uncleared' | 'cleared';

/**
 * On win: stars = clamp(floor(livesRemaining), 1, 3). Non-finite → 1.
 */
export function computeStars(livesRemaining: number): StarCount {
  if (!Number.isFinite(livesRemaining)) {
    return 1;
  }
  const n = Math.floor(livesRemaining);
  return Math.max(1, Math.min(3, n)) as StarCount;
}

/**
 * Merge a run into prior LevelBest.
 * - score always max(prev, floor(score))
 * - stars only when starsFromWin != null (win); lose preserves prev.stars or omits
 */
export function mergeLevelBest(
  prev: LevelBest | undefined,
  score: number,
  starsFromWin: StarCount | null,
): LevelBest {
  const nextScore = Math.max(
    prev?.score ?? 0,
    Math.floor(Number.isFinite(score) ? score : 0),
  );

  if (starsFromWin == null) {
    if (prev?.stars === 1 || prev?.stars === 2 || prev?.stars === 3) {
      return { score: nextScore, stars: prev.stars };
    }
    return { score: nextScore };
  }

  const prevStars = prev?.stars;
  const nextStars: StarCount =
    prevStars === 1 || prevStars === 2 || prevStars === 3
      ? ((Math.max(prevStars, starsFromWin) as StarCount))
      : starsFromWin;

  return { score: nextScore, stars: nextStars };
}

/**
 * Select list row state from unlock + best (D-18 / D-23).
 * Cleared iff best.stars ∈ {1,2,3}; unlocked without stars → uncleared.
 */
export function selectRowState(
  id: LevelId,
  unlocked: readonly LevelId[],
  best: LevelBest | undefined,
): SelectRowState {
  if (!isUnlocked(unlocked, id)) {
    return 'locked';
  }
  const s = best?.stars;
  if (s === 1 || s === 2 || s === 3) {
    return 'cleared';
  }
  return 'uncleared';
}
