/**
 * Migrate personal-best v1 → progress v2 (N-PROG-01 / D-08).
 * Pure — no I/O.
 */
import { parsePersonalBestResult, parseProgressResult } from './parseBlob';
import { defaultProgressBlob, type ProgressBlob } from './types';

/**
 * Prefer valid v2. If v2 absent/corrupt, seed bestScore from v1 only
 * (unlocked stays [level-01]; bestByLevel empty).
 */
export function migrateOrDefault(
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob {
  const v2 = parseProgressResult(v2Raw);
  if (v2.status === 'ok') {
    return v2.progress;
  }

  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') {
    const base = defaultProgressBlob();
    base.bestScore = v1.best;
    base.updatedAt = Date.now();
    return base;
  }

  return defaultProgressBlob();
}
