import type { LevelId } from '../../core';

export const PERSONAL_BEST_VERSION = 1 as const;
export const PERSONAL_BEST_KEY = '@nbb/personal-best/v1' as const;

export type PersonalBestBlob = {
  v: 1;
  bestScore: number;
  updatedAt: number; // ms epoch, informational only
};

export interface PersonalBestStore {
  getBest(): Promise<number>;
  setBest(bestScore: number): Promise<void>;
  /** Optional: re-attempt a failed write (F-26 AppState flush). */
  flush?(): Promise<void>;
}

/** Campaign progress blob (N-PROG-01 / N-PROG-02). */
export const PROGRESS_VERSION = 2 as const;
export const PROGRESS_KEY = '@nbb/progress/v2' as const;

/** Lives-based star count after a win (N-PROG-03 / D-07). */
export type StarCount = 1 | 2 | 3;

/**
 * Per-level best for v3 schema (additive types; ProgressBlob stays v2 until Plan 01).
 * `stars` present only after ≥1 win (D-05 / D-23).
 */
export type LevelBest = {
  score: number;
  stars?: StarCount;
};

export type ProgressBlob = {
  v: 2;
  /** Always includes 'level-01'; catalog order; never level-02 */
  unlocked: LevelId[];
  /** Sparse map; missing key ⇒ best 0 */
  bestByLevel: Partial<Record<LevelId, number>>;
  /** Rolled-up Title PB = max(values) maintained on write (D-07) */
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob {
  return {
    v: 2,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
  };
}

export interface ProgressStore {
  getBest(): Promise<number>;
  getBestForLevel(id: LevelId): Promise<number>;
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
