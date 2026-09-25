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

/** Campaign progress blob (N-PROG-01 / N-PROG-02 / N-PROG-03). */
export const PROGRESS_VERSION = 3 as const;
export const PROGRESS_KEY = '@nbb/progress/v3' as const;
/** Legacy v2 key — migrate-on-read source only; never delete. */
export const PROGRESS_KEY_V2 = '@nbb/progress/v2' as const;

/** Lives-based star count after a win (N-PROG-03 / D-07). */
export type StarCount = 1 | 2 | 3;

/**
 * Per-level best (D-04 / D-05).
 * `stars` present only after ≥1 win (omit until first C2 win).
 */
export type LevelBest = {
  score: number;
  stars?: StarCount;
};

export type ProgressBlob = {
  v: 3;
  /** Always includes 'level-01'; catalog order; never level-02 */
  unlocked: LevelId[];
  /** Sparse map; missing key ⇒ best 0 / no stars */
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  /** Rolled-up Title PB = max(scores) maintained on write (D-07) */
  bestScore: number;
  updatedAt: number;
};

/** Legacy v2 blob shape for migrate input only. */
export type ProgressBlobV2 = {
  v: 2;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, number>>;
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob {
  return {
    v: 3,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
  };
}

export interface ProgressStore {
  getBest(): Promise<number>;
  /** Returns nested `.score` (missing → 0). */
  getBestForLevel(id: LevelId): Promise<number>;
  /** Score-only path (lose / legacy); stars unchanged via mergeLevelBest(null). */
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  /**
   * Preferred end-of-run: sync memory merge score/stars/unlock; void persist;
   * return clone before awaiting disk (D-10 / F-26).
   */
  recordRunEnd(args: {
    levelId: LevelId;
    score: number;
    outcome: 'win' | 'lose';
    livesRemaining: number;
  }): ProgressBlob;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
