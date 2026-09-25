/**
 * Migrate personal-best v1 / progress v2 → v3 → v4 (N-PROG-03 / D-05 / N-STAT-02).
 * Pure — no I/O. Does not delete legacy keys (caller leaves v1/v2/v3 on disk).
 *
 * The v3/v2/v1 links are the already-tested C2 chain, reused verbatim under
 * `migrateOrDefaultV3`; v4 only adds one more link on top.
 */
import {
  parsePersonalBestResult,
  parseProgressResult,
  parseProgressV2Result,
  parseProgressV3Result,
} from './parseBlob';
import {
  defaultProgressBlobV3,
  defaultTelemetryBlob,
  type LevelBest,
  type ProgressBlob,
  type ProgressBlobV2,
  type ProgressBlobV3,
} from './types';
import type { LevelId } from '../../core';

function v2ToV3(v2: ProgressBlobV2): ProgressBlobV3 {
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

/** Pure structural copy — v4 adds telemetry and changes nothing else (SC-3). */
export function v3ToV4(v3: ProgressBlobV3): ProgressBlob {
  return {
    v: 4,
    unlocked: [...v3.unlocked],
    bestByLevel: { ...v3.bestByLevel },
    bestScore: v3.bestScore,
    updatedAt: v3.updatedAt,
    telemetry: defaultTelemetryBlob(),
  };
}

/**
 * Legacy chain (unchanged C2 behavior, renamed): prefer valid v3. Else v2→v3
 * (number→{score}, omit stars). Else v1→v3 seeds bestScore only
 * (unlocked=[level-01]; empty bestByLevel).
 */
export function migrateOrDefaultV3(
  v3Raw: string | null,
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlobV3 {
  const v3 = parseProgressV3Result(v3Raw);
  if (v3.status === 'ok') {
    return v3.progress;
  }

  const v2 = parseProgressV2Result(v2Raw);
  if (v2.status === 'ok') {
    return v2ToV3(v2.progress);
  }

  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') {
    const base = defaultProgressBlobV3();
    base.bestScore = v1.best;
    base.updatedAt = Date.now();
    return base;
  }

  return defaultProgressBlobV3();
}

/**
 * Prefer valid v4. Otherwise delegate to the untouched v3/v2/v1 chain and lift
 * its result with `v3ToV4` — a corrupt v4 can never block the older fallbacks.
 */
export function migrateOrDefault(
  v4Raw: string | null,
  v3Raw: string | null,
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob {
  const v4 = parseProgressResult(v4Raw);
  if (v4.status === 'ok') {
    return v4.progress;
  }

  return v3ToV4(migrateOrDefaultV3(v3Raw, v2Raw, v1Raw));
}
