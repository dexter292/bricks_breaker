import { NativeModules, TurboModuleRegistry } from 'react-native';
import {
  createMemoryPersonalBestStore,
  createMemoryProgressStore,
} from './memoryStore';
import { migrateOrDefault } from './migrateProgress';
import {
  parsePersonalBestResult,
  parseProgressResult,
  parseProgressV2Result,
  parseProgressV3Result,
} from './parseBlob';
import { computeStars, mergeLevelBest } from './stars';
import { cloneTelemetryBlob, mergeRunIntoTelemetry } from './telemetry';
import { mergeHighWatermark } from './watermark';
import {
  unlockAfterClear as unlockAfterClearPure,
  isUnlocked as isUnlockedPure,
} from './unlock';
import {
  PERSONAL_BEST_KEY,
  PERSONAL_BEST_VERSION,
  PROGRESS_KEY,
  PROGRESS_KEY_V3,
  PROGRESS_KEY_V2,
  defaultProgressBlob,
  type GameMode,
  type LevelBest,
  type PersonalBestBlob,
  type PersonalBestStore,
  type ProgressBlob,
  type ProgressStore,
  type RunOutcome,
  type RunStatsInput,
} from './types';
import type { LevelId } from '../../core';

export { mergeHighWatermark } from './watermark';

export type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

/** Process-wide singleton — Title + Playing must share one store (F-26). */
let sharedStore: PersonalBestStore | null = null;
let sharedProgressStore: ProgressStore | null = null;

/**
 * Probe native bridge before requiring the JS package.
 * Requiring `@react-native-async-storage/async-storage` when the native
 * module is missing throws a LogBox ERROR even inside try/catch (module
 * init throws synchronously and RN still reports it).
 */
function hasAsyncStorageNative(): boolean {
  try {
    const turbo =
      TurboModuleRegistry.get?.('RNCAsyncStorage') ??
      TurboModuleRegistry.get?.('RNC_AsyncSQLiteDBStorage') ??
      null;
    if (turbo != null) {
      return true;
    }
    return !!(
      NativeModules.RNCAsyncStorage ||
      NativeModules.RNC_AsyncSQLiteDBStorage ||
      NativeModules.PlatformLocalStorage
    );
  } catch {
    return false;
  }
}

/**
 * Lazy-load AsyncStorage so Metro does not evaluate the native module at
 * import time. When the native module is missing (stale expo-dev-client),
 * skip require and fall back to memory.
 */
function loadAsyncStorage(): AsyncStorageLike | null {
  // Vitest/Node has no native module; avoid the package's RN entry entirely.
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return null;
  }
  if (!hasAsyncStorageNative()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native load
    const mod = require('@react-native-async-storage/async-storage') as {
      default: AsyncStorageLike;
    };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

/**
 * Prefer AsyncStorage when the native module is linked; otherwise memory.
 * Always returns the same instance for the process lifetime (F-26).
 */
export function createDefaultPersonalBestStore(): PersonalBestStore {
  if (sharedStore != null) {
    return sharedStore;
  }
  const AsyncStorage = loadAsyncStorage();
  if (!AsyncStorage) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[storage] AsyncStorage native module missing — using memory store. Rebuild the dev client (`npx expo run:ios` / `run:android`) for persistent high scores.',
      );
    }
    sharedStore = createMemoryPersonalBestStore();
  } else {
    sharedStore = createAsyncStoragePersonalBestStoreFrom(AsyncStorage);
  }
  return sharedStore;
}

/** Explicit AsyncStorage-backed store; falls back to memory if native missing. */
export function createAsyncStoragePersonalBestStore(): PersonalBestStore {
  return createDefaultPersonalBestStore();
}

/** Test-only: drop the singleton between cases. */
export function __resetSharedPersonalBestStoreForTests(): void {
  sharedStore = null;
}

/**
 * Prefer AsyncStorage when linked; otherwise memory.
 * Process singleton shared by Title + Playing (D-10 / F-26).
 */
export function createDefaultProgressStore(): ProgressStore {
  if (sharedProgressStore != null) {
    return sharedProgressStore;
  }
  const AsyncStorage = loadAsyncStorage();
  if (!AsyncStorage) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[storage] AsyncStorage native module missing — using memory progress store. Rebuild the dev client for durable unlocks.',
      );
    }
    sharedProgressStore = createMemoryProgressStore();
  } else {
    sharedProgressStore = createAsyncStorageProgressStoreFrom(AsyncStorage);
  }
  return sharedProgressStore;
}

export function createAsyncStorageProgressStore(): ProgressStore {
  return createDefaultProgressStore();
}

/** Test-only: drop the progress singleton between cases. */
export function __resetSharedProgressStoreForTests(): void {
  sharedProgressStore = null;
}

/**
 * Test-only: build a progress store over an injected storage double.
 * `createDefaultProgressStore` probes the native bridge and falls back to the
 * memory store under Vitest, so the AsyncStorage hydrate/migrate/persist chain
 * is otherwise unreachable from a test.
 */
export function __createAsyncStorageProgressStoreForTests(
  storage: AsyncStorageLike,
): ProgressStore {
  return createAsyncStorageProgressStoreFrom(storage);
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
    v: 4,
    unlocked: [...b.unlocked],
    bestByLevel,
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
    telemetry: cloneTelemetryBlob(b.telemetry),
  };
}

function createAsyncStoragePersonalBestStoreFrom(
  AsyncStorage: AsyncStorageLike,
): PersonalBestStore {
  /** High-watermark — never lower on corrupt read (F-26). */
  let memoryBest = 0;
  let pendingWrite: number | null = null;

  return {
    async getBest(): Promise<number> {
      try {
        const raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
        const parsed = parsePersonalBestResult(raw);
        if (parsed.status === 'corrupt') {
          // Refuse to treat garbage as 0 — keep watermark.
          return memoryBest;
        }
        memoryBest = Math.max(memoryBest, parsed.best);
        return memoryBest;
      } catch {
        return memoryBest;
      }
    },
    async setBest(bestScore: number): Promise<void> {
      const next = Math.floor(bestScore);
      if (!(next >= 0) || !Number.isFinite(next)) {
        return;
      }
      // Never lower a known watermark (protects against corrupt→0 races).
      if (next < memoryBest) {
        return;
      }
      memoryBest = next;
      pendingWrite = next;
      const blob: PersonalBestBlob = {
        v: PERSONAL_BEST_VERSION,
        bestScore: next,
        updatedAt: Date.now(),
      };
      try {
        await AsyncStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(blob));
        pendingWrite = null;
      } catch {
        // Soft-fail — pendingWrite kept for AppState flush (F-26).
      }
    },
    /** Re-attempt last failed write (call on AppState background). */
    async flush(): Promise<void> {
      if (pendingWrite == null) {
        return;
      }
      const blob: PersonalBestBlob = {
        v: PERSONAL_BEST_VERSION,
        bestScore: pendingWrite,
        updatedAt: Date.now(),
      };
      try {
        await AsyncStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(blob));
        pendingWrite = null;
      } catch {
        // keep pending
      }
    },
  };
}

function createAsyncStorageProgressStoreFrom(
  AsyncStorage: AsyncStorageLike,
): ProgressStore {
  let memory = defaultProgressBlob();
  let hydrated = false;
  let hydrating: Promise<void> | null = null;
  let pendingWrite: ProgressBlob | null = null;
  let wroteMigrateThrough = false;

  async function persist(blob: ProgressBlob): Promise<void> {
    pendingWrite = cloneBlob(blob);
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(blob));
      pendingWrite = null;
    } catch {
      // Soft-fail — pendingWrite kept for AppState flush (F-26).
    }
  }

  function applyLevelBest(id: LevelId, next: LevelBest): void {
    memory = {
      ...memory,
      bestByLevel: { ...memory.bestByLevel, [id]: next },
      bestScore: Math.max(memory.bestScore, next.score),
      updatedAt: Date.now(),
    };
  }

  /** Never throws and always leaves `hydrated` true — see ensureHydrated. */
  async function hydrateOnce(): Promise<void> {
    try {
      const v4Raw = await AsyncStorage.getItem(PROGRESS_KEY);
      const parsed = parseProgressResult(v4Raw);

      if (parsed.status === 'ok') {
        memory = mergeHighWatermark(memory, parsed.progress);
        hydrated = true;
        return;
      }

      // Absent or corrupt v4 → migrate from v3 + v2 + v1 (D-05 / N-STAT-02);
      // never clobber watermarks. Leave v1/v2/v3 keys on disk (rollback safety).
      const v3Raw = await AsyncStorage.getItem(PROGRESS_KEY_V3);
      const v2Raw = await AsyncStorage.getItem(PROGRESS_KEY_V2);
      const v1Raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
      const migrated = migrateOrDefault(v4Raw, v3Raw, v2Raw, v1Raw);
      memory = mergeHighWatermark(memory, migrated);

      const fromV3 = parseProgressV3Result(v3Raw).status === 'ok';
      const fromV2 = parseProgressV2Result(v2Raw).status === 'ok';
      const fromV1 = parsePersonalBestResult(v1Raw).status === 'ok';
      if (!wroteMigrateThrough && (fromV3 || fromV2 || fromV1)) {
        wroteMigrateThrough = true;
        await persist(memory);
      }
    } catch {
      // Soft-fail — keep memory defaults / prior watermarks.
    }
    hydrated = true;
  }

  /**
   * Single-flight. `hydrateOnce` folds the disk blob into memory with
   * `mergeHighWatermark`, whose telemetry half SUMS lifetime counters — so
   * running it twice against the same disk blob would double every counter and
   * the next `persist` would write the inflated values back permanently.
   * `hydrated` only flips after the first `await`, so overlapping callers must
   * share one promise rather than each re-entering the body. Overlap is
   * ordinary: Title's `getBest()` and Select's `getSnapshot()` hit the same
   * singleton (F-26) when Play is tapped before the first read resolves.
   */
  function ensureHydrated(): Promise<void> {
    if (hydrated) {
      return Promise.resolve();
    }
    hydrating ??= hydrateOnce();
    return hydrating;
  }

  return {
    async getBest(): Promise<number> {
      await ensureHydrated();
      return memory.bestScore;
    },
    async getBestForLevel(id: LevelId): Promise<number> {
      await ensureHydrated();
      return memory.bestByLevel[id]?.score ?? 0;
    },
    async recordLevelBest(id: LevelId, score: number): Promise<void> {
      await ensureHydrated();
      const n = Math.floor(score);
      if (!(n >= 0) || !Number.isFinite(n)) {
        return;
      }
      const prevScore = memory.bestByLevel[id]?.score ?? 0;
      if (!(n > prevScore)) {
        return;
      }
      applyLevelBest(id, mergeLevelBest(memory.bestByLevel[id], n, null));
      await persist(memory);
    },
    recordRunEnd(args: {
      levelId: LevelId;
      mode: GameMode;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    }): ProgressBlob {
      // Sync memory update first so Results can use returned blob (D-10 / F-26).
      // Hydration is best-effort fire-and-forget if not yet done — callers that
      // need disk state should await getSnapshot/getBest first (hosts do).
      if (!hydrated) {
        // Kick hydrate without blocking return; rare cold path before first read.
        void ensureHydrated();
      }
      // Stars and unlock stay win-gated; an abandoned run merges score + stats only.
      const starsFromWin =
        args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
      const merged = mergeLevelBest(
        memory.bestByLevel[args.levelId],
        args.score,
        starsFromWin,
      );
      applyLevelBest(args.levelId, merged);
      memory = {
        ...memory,
        telemetry: mergeRunIntoTelemetry(memory.telemetry, {
          mode: args.mode,
          levelId: args.levelId,
          outcome: args.outcome,
          score: args.score,
          stats: args.stats,
        }),
      };
      if (args.outcome === 'win') {
        memory = {
          ...memory,
          unlocked: unlockAfterClearPure(memory.unlocked, args.levelId),
          updatedAt: Date.now(),
        };
      }
      const snapshot = cloneBlob(memory);
      void persist(memory);
      return snapshot;
    },
    async unlockAfterClear(id: LevelId): Promise<void> {
      await ensureHydrated();
      const nextUnlocked = unlockAfterClearPure(memory.unlocked, id);
      memory = {
        ...memory,
        unlocked: nextUnlocked,
        updatedAt: Date.now(),
      };
      await persist(memory);
    },
    async isUnlocked(id: LevelId): Promise<boolean> {
      await ensureHydrated();
      return isUnlockedPure(memory.unlocked, id);
    },
    async getSnapshot(): Promise<ProgressBlob> {
      await ensureHydrated();
      return cloneBlob(memory);
    },
    async flush(): Promise<void> {
      if (pendingWrite == null) {
        return;
      }
      try {
        await AsyncStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify(pendingWrite),
        );
        pendingWrite = null;
      } catch {
        // keep pending
      }
    },
  };
}
