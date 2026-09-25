import type { LevelId } from '../../core';
import type { LevelBest, PersonalBestStore, ProgressBlob, ProgressStore } from './types';
import { defaultProgressBlob } from './types';
import { computeStars, mergeLevelBest } from './stars';
import {
  unlockAfterClear as unlockAfterClearPure,
  isUnlocked as isUnlockedPure,
} from './unlock';

export function createMemoryPersonalBestStore(): PersonalBestStore {
  let bestScore = 0;
  return {
    async getBest(): Promise<number> {
      return bestScore;
    },
    async setBest(next: number): Promise<void> {
      const n = Math.floor(next);
      if (n > bestScore) {
        bestScore = n;
      }
    },
    async flush(): Promise<void> {
      // in-memory — nothing to flush
    },
  };
}

function cloneLevelBest(b: LevelBest): LevelBest {
  const out: LevelBest = { score: b.score };
  if (b.stars === 1 || b.stars === 2 || b.stars === 3) {
    out.stars = b.stars;
  }
  return out;
}

function cloneBlob(b: ProgressBlob): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, val] of Object.entries(b.bestByLevel)) {
    if (val != null) {
      bestByLevel[key as LevelId] = cloneLevelBest(val);
    }
  }
  return {
    v: 3,
    unlocked: [...b.unlocked],
    bestByLevel,
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
  };
}

export function createMemoryProgressStore(
  seed?: ProgressBlob,
): ProgressStore {
  let blob = seed != null ? cloneBlob(seed) : defaultProgressBlob();

  function applyLevelBest(id: LevelId, next: LevelBest): void {
    blob.bestByLevel[id] = next;
    if (next.score > blob.bestScore) {
      blob.bestScore = next.score;
    }
    blob.updatedAt = Date.now();
  }

  return {
    async getBest(): Promise<number> {
      return blob.bestScore;
    },
    async getBestForLevel(id: LevelId): Promise<number> {
      return blob.bestByLevel[id]?.score ?? 0;
    },
    async recordLevelBest(id: LevelId, score: number): Promise<void> {
      const n = Math.floor(score);
      if (!(n >= 0) || !Number.isFinite(n)) {
        return;
      }
      const prevScore = blob.bestByLevel[id]?.score ?? 0;
      if (!(n > prevScore)) {
        return;
      }
      applyLevelBest(id, mergeLevelBest(blob.bestByLevel[id], n, null));
    },
    recordRunEnd(args: {
      levelId: LevelId;
      score: number;
      outcome: 'win' | 'lose';
      livesRemaining: number;
    }): ProgressBlob {
      const starsFromWin =
        args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
      const merged = mergeLevelBest(
        blob.bestByLevel[args.levelId],
        args.score,
        starsFromWin,
      );
      applyLevelBest(args.levelId, merged);
      if (args.outcome === 'win') {
        blob.unlocked = unlockAfterClearPure(blob.unlocked, args.levelId);
        blob.updatedAt = Date.now();
      }
      return cloneBlob(blob);
    },
    async unlockAfterClear(id: LevelId): Promise<void> {
      blob.unlocked = unlockAfterClearPure(blob.unlocked, id);
      blob.updatedAt = Date.now();
    },
    async isUnlocked(id: LevelId): Promise<boolean> {
      return isUnlockedPure(blob.unlocked, id);
    },
    async getSnapshot(): Promise<ProgressBlob> {
      return cloneBlob(blob);
    },
    async flush(): Promise<void> {
      // in-memory — nothing to flush
    },
  };
}
