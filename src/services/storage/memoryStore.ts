import type { LevelId } from '../../runtime/loadLevel';
import type { PersonalBestStore, ProgressBlob, ProgressStore } from './types';
import { defaultProgressBlob } from './types';
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

function cloneBlob(b: ProgressBlob): ProgressBlob {
  return {
    v: 2,
    unlocked: [...b.unlocked],
    bestByLevel: { ...b.bestByLevel },
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
  };
}

export function createMemoryProgressStore(
  seed?: ProgressBlob,
): ProgressStore {
  let blob = seed != null ? cloneBlob(seed) : defaultProgressBlob();

  return {
    async getBest(): Promise<number> {
      return blob.bestScore;
    },
    async getBestForLevel(id: LevelId): Promise<number> {
      return blob.bestByLevel[id] ?? 0;
    },
    async recordLevelBest(id: LevelId, score: number): Promise<void> {
      const n = Math.floor(score);
      if (!(n >= 0) || !Number.isFinite(n)) {
        return;
      }
      const prev = blob.bestByLevel[id] ?? 0;
      if (!(n > prev)) {
        return;
      }
      blob.bestByLevel[id] = n;
      if (n > blob.bestScore) {
        blob.bestScore = n;
      }
      blob.updatedAt = Date.now();
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
