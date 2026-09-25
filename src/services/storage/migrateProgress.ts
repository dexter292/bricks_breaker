/**
 * Migrate personal-best v1 / progress v2 → progress v3 (N-PROG-03 / D-05).
 * Pure — no I/O. Does not delete legacy keys (caller leaves v1/v2 on disk).
 */
import {
  parsePersonalBestResult,
  parseProgressResult,
  parseProgressV2Result,
} from './parseBlob';
import {
  defaultProgressBlob,
  type LevelBest,
  type ProgressBlob,
  type ProgressBlobV2,
} from './types';
import type { LevelId } from '../../core';

function v2ToV3(v2: ProgressBlobV2): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, score] of Object.entries(v2.bestByLevel)) {
    if (typeof score === 'number') {
      bestByLevel[key as LevelId] = { score };
    }
  }
  return {
    v: 3,
    unlocked: [...v2.unlocked],
    bestByLevel,
    bestScore: v2.bestScore,
    updatedAt: v2.updatedAt,
  };
}

/**
 * Prefer valid v3. Else v2→v3 (number→{score}, omit stars).
 * Else v1→v3 seeds bestScore only (unlocked=[level-01]; empty bestByLevel).
 */
export function migrateOrDefault(
  v3Raw: string | null,
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob {
  const v3 = parseProgressResult(v3Raw);
  if (v3.status === 'ok') {
    return v3.progress;
  }

  const v2 = parseProgressV2Result(v2Raw);
  if (v2.status === 'ok') {
    return v2ToV3(v2.progress);
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
