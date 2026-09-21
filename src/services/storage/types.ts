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
