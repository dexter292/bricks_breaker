import { createMemoryPersonalBestStore } from './memoryStore';
import { parsePersonalBestBlob } from './parseBlob';
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
 * Callers should use this as the app default (D-13 soft-fail).
 */
export function createDefaultPersonalBestStore(): PersonalBestStore {
  const AsyncStorage = loadAsyncStorage();
  if (!AsyncStorage) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[storage] AsyncStorage native module missing — using memory store. Rebuild the dev client (`npx expo run:ios` / `run:android`) for persistent high scores.',
      );
    }
    return createMemoryPersonalBestStore();
  }
  return createAsyncStoragePersonalBestStoreFrom(AsyncStorage);
}

/** Explicit AsyncStorage-backed store; falls back to memory if native missing. */
export function createAsyncStoragePersonalBestStore(): PersonalBestStore {
  const AsyncStorage = loadAsyncStorage();
  if (!AsyncStorage) {
    return createMemoryPersonalBestStore();
  }
  return createAsyncStoragePersonalBestStoreFrom(AsyncStorage);
}

function createAsyncStoragePersonalBestStoreFrom(
  AsyncStorage: AsyncStorageLike,
): PersonalBestStore {
  return {
    async getBest(): Promise<number> {
      try {
        const raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
        return parsePersonalBestBlob(raw);
      } catch {
        return 0;
      }
    },
    async setBest(bestScore: number): Promise<void> {
      const blob: PersonalBestBlob = {
        v: PERSONAL_BEST_VERSION,
        bestScore: Math.floor(bestScore),
        updatedAt: Date.now(),
      };
      try {
        await AsyncStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(blob));
      } catch {
        // Soft-fail persistence (UI-SPEC / D-13)
      }
    },
  };
}
