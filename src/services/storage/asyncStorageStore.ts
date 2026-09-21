import { createMemoryPersonalBestStore } from './memoryStore';
import { parsePersonalBestResult } from './parseBlob';
import {
  PERSONAL_BEST_KEY,
  PERSONAL_BEST_VERSION,
  type PersonalBestBlob,
  type PersonalBestStore,
} from './types';

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

/** Process-wide singleton — Title + Playing must share one store (F-26). */
let sharedStore: PersonalBestStore | null = null;

/**
 * Lazy-load AsyncStorage so Metro does not evaluate the native module at
 * import time. When the native module is missing (stale expo-dev-client),
 * requiring the package throws — catch and fall back to memory.
 */
function loadAsyncStorage(): AsyncStorageLike | null {
  // Vitest/Node has no native module; avoid the package's RN entry entirely.
  if (typeof process !== 'undefined' && process.env.VITEST) {
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
