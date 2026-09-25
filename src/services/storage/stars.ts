/**
 * Pure star / select-row helpers — no I/O, no React (N-PROG-03 / D-07 / D-18 / D-23 / R-30).
 */
import type { LevelId } from '../../core';
import type { LevelBest, StarCount } from './types';
import { nextLevelId } from './catalog';
import { isUnlocked } from './unlock';

export type SelectRowState = 'locked' | 'uncleared' | 'cleared';

/**
 * On win: stars = clamp(floor(livesRemaining), 1, 3). Non-finite → 1.
 * Note: lives===0 at WON is unreachable (applyWinCheck before applyLives); clamp(0)→1 is defensive only.
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

function hasRecordedStars(best: LevelBest | undefined): boolean {
  const s = best?.stars;
  return s === 1 || s === 2 || s === 3;
}

/**
 * Cleared when unlock chain proves a prior clear, or stars were recorded (R-30 / D-25).
 * - Intermediate: `nextLevelId(id)` unlocked ⇒ this id was cleared (unlockAfterClear only adds next on win).
 * - Final (`level-06`): no next — cleared only via `best.stars` (v2→v3 omit-stars leaves final uncleared until first C2 win).
 */
export function isLevelCleared(
  id: LevelId,
  unlocked: readonly LevelId[],
  best: LevelBest | undefined,
): boolean {
  if (hasRecordedStars(best)) {
    return true;
  }
  const next = nextLevelId(id);
  return next != null && isUnlocked(unlocked, next);
}

/**
 * Select list row state (D-18 / D-23 / D-25 / R-30).
 * Display: cleared-without-stars (legacy v2 migrate) → ☆☆☆ + Best if score present.
 */
export function selectRowState(
  id: LevelId,
  unlocked: readonly LevelId[],
  best: LevelBest | undefined,
): SelectRowState {
  if (!isUnlocked(unlocked, id)) {
    return 'locked';
  }
  if (isLevelCleared(id, unlocked, best)) {
    return 'cleared';
  }
  return 'uncleared';
}
