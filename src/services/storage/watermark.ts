/**
 * Nested high-watermark merge for ProgressBlob (F-26 / D-04 / N-STAT-02).
 * Never lowers known score/stars when merging disk into memory.
 */
import type { LevelId } from '../../core';
import { mergeTelemetryBlobs } from './telemetry';
import type {
  LevelBest,
  ProgressBlob,
  ProgressBlobV3,
  StarCount,
} from './types';

function cloneLevelBest(b: LevelBest): LevelBest {
  const out: LevelBest = { score: b.score };
  if (b.stars === 1 || b.stars === 2 || b.stars === 3) {
    out.stars = b.stars;
  }
  return out;
}

/** Never lower known watermarks when merging disk into memory (F-26) — v3 legacy. */
export function mergeHighWatermarkV3(
  memory: ProgressBlobV3,
  incoming: ProgressBlobV3,
): ProgressBlobV3 {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, val] of Object.entries(memory.bestByLevel)) {
    if (val != null) {
      bestByLevel[key as LevelId] = cloneLevelBest(val);
    }
  }

  for (const [key, val] of Object.entries(incoming.bestByLevel)) {
    if (val == null || typeof val !== 'object') continue;
    const id = key as LevelId;
    const prev = bestByLevel[id];
    const nextScore = Math.max(prev?.score ?? 0, val.score ?? 0);

    let stars: StarCount | undefined =
      prev?.stars === 1 || prev?.stars === 2 || prev?.stars === 3
        ? prev.stars
        : undefined;
    if (val.stars === 1 || val.stars === 2 || val.stars === 3) {
      stars =
        stars != null
          ? ((Math.max(stars, val.stars) as StarCount))
          : val.stars;
    }

    const next: LevelBest = { score: nextScore };
    if (stars === 1 || stars === 2 || stars === 3) {
      next.stars = stars;
    }
    bestByLevel[id] = next;
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
    v: 3,
    unlocked,
    bestByLevel,
    bestScore: Math.max(memory.bestScore, incoming.bestScore),
    updatedAt: Math.max(memory.updatedAt, incoming.updatedAt),
  };
}

/** Strip the v4-only fields so the shared four-field merge stays single-sourced. */
function asV3(blob: ProgressBlob): ProgressBlobV3 {
  return {
    v: 3,
    unlocked: blob.unlocked,
    bestByLevel: blob.bestByLevel,
    bestScore: blob.bestScore,
    updatedAt: blob.updatedAt,
  };
}

/**
 * v4 watermark merge: unlocked/bestByLevel/bestScore/updatedAt go through the
 * unchanged v3 max-based logic; telemetry merges on its own sum-vs-max rules.
 */
export function mergeHighWatermark(
  memory: ProgressBlob,
  incoming: ProgressBlob,
): ProgressBlob {
  const shared = mergeHighWatermarkV3(asV3(memory), asV3(incoming));
  return {
    v: 4,
    unlocked: shared.unlocked,
    bestByLevel: shared.bestByLevel,
    bestScore: shared.bestScore,
    updatedAt: shared.updatedAt,
    telemetry: mergeTelemetryBlobs(memory.telemetry, incoming.telemetry),
  };
}
