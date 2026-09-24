import { NativeModules, TurboModuleRegistry } from 'react-native';
import {
  createMemoryPersonalBestStore,
  createMemoryProgressStore,
} from './memoryStore';
import { migrateOrDefault } from './migrateProgress';
import { parsePersonalBestResult, parseProgressResult } from './parseBlob';
import {
  unlockAfterClear as unlockAfterClearPure,
  isUnlocked as isUnlockedPure,
} from './unlock';
import {
  PERSONAL_BEST_KEY,
  PERSONAL_BEST_VERSION,
  PROGRESS_KEY,
  defaultProgressBlob,
  type PersonalBestBlob,
  type PersonalBestStore,
  type ProgressBlob,
  type ProgressStore,
} from './types';
import type { LevelId } from '../../runtime/loadLevel';

type AsyncStorageLike = {
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

function cloneBlob(b: ProgressBlob): ProgressBlob {
  return {
    v: 2,
    unlocked: [...b.unlocked],
    bestByLevel: { ...b.bestByLevel },
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
  };
}

/** Never lower known watermarks when merging disk into memory (F-26). */
function mergeHighWatermark(
  memory: ProgressBlob,
  incoming: ProgressBlob,
): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, number>> = {
    ...memory.bestByLevel,
  };
  for (const [key, val] of Object.entries(incoming.bestByLevel)) {
    if (typeof val !== 'number') continue;
    const id = key as LevelId;
    const prev = bestByLevel[id] ?? 0;
    if (val > prev) {
      bestByLevel[id] = val;
    }
  }
  const unlocked: LevelId[] = [];
  const seen = new Set<LevelId>();
  for (const id of [...memory.unlocked, ...incoming.unlocked]) {
    if (!seen.has(id)) {
      seen.add(id);
      unlocked.push(id);
    }
  }
  if (!seen.has('level-01')) {
    unlocked.unshift('level-01');
  }
  return {
    v: 2,
    unlocked,
    bestByLevel,
    bestScore: Math.max(memory.bestScore, incoming.bestScore),
    updatedAt: Math.max(memory.updatedAt, incoming.updatedAt),
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

  async function ensureHydrated(): Promise<void> {
    if (hydrated) {
      return;
    }
    try {
      const v2Raw = await AsyncStorage.getItem(PROGRESS_KEY);
      const parsed = parseProgressResult(v2Raw);

      if (parsed.status === 'ok') {
        memory = mergeHighWatermark(memory, parsed.progress);
        hydrated = true;
        return;
      }

      // Absent or corrupt v2 → try v1 migrate (D-08); never clobber watermarks.
      const v1Raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
      const migrated = migrateOrDefault(v2Raw, v1Raw);
      memory = mergeHighWatermark(memory, migrated);

      // Write-through once when we seeded from v1 (v2 was not ok).
      if (
        !wroteMigrateThrough &&
        parsePersonalBestResult(v1Raw).status === 'ok' &&
        parsed.status !== 'ok'
      ) {
        wroteMigrateThrough = true;
        await persist(memory);
      }
    } catch {
      // Soft-fail — keep memory defaults / prior watermarks.
    }
    hydrated = true;
  }

  return {
    async getBest(): Promise<number> {
      await ensureHydrated();
      return memory.bestScore;
    },
    async getBestForLevel(id: LevelId): Promise<number> {
      await ensureHydrated();
      return memory.bestByLevel[id] ?? 0;
    },
    async recordLevelBest(id: LevelId, score: number): Promise<void> {
      await ensureHydrated();
      const n = Math.floor(score);
      if (!(n >= 0) || !Number.isFinite(n)) {
        return;
      }
      const prev = memory.bestByLevel[id] ?? 0;
      if (!(n > prev)) {
        return;
      }
      memory = {
        ...memory,
        bestByLevel: { ...memory.bestByLevel, [id]: n },
        bestScore: Math.max(memory.bestScore, n),
        updatedAt: Date.now(),
      };
      await persist(memory);
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
