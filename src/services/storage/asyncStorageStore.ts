import AsyncStorage from '@react-native-async-storage/async-storage';
import { parsePersonalBestBlob } from './parseBlob';
import {
  PERSONAL_BEST_KEY,
  PERSONAL_BEST_VERSION,
  type PersonalBestBlob,
  type PersonalBestStore,
} from './types';

export function createAsyncStoragePersonalBestStore(): PersonalBestStore {
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
      await AsyncStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(blob));
    },
  };
}
