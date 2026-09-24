/**
 * Fail-soft parse of AsyncStorage personal-best / progress JSON (T-06-01 / F-26 / N-PROG).
 * Distinguishes absent vs corrupt so callers never treat garbage as best=0.
 */

import type { LevelId } from '../../core';
import { PLAYABLE_LEVEL_ORDER } from './catalog';
import { defaultProgressBlob, type ProgressBlob } from './types';

export type ParseBestResult =
  | { status: 'ok'; best: number }
  | { status: 'absent'; best: 0 }
  | { status: 'corrupt'; best: 0 };

export function parsePersonalBestResult(
  raw: string | null,
): ParseBestResult {
  if (raw == null) {
    return { status: 'absent', best: 0 };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', best: 0 };
    }
    const blob = parsed as { v?: unknown; bestScore?: unknown };
    if (blob.v !== 1 || typeof blob.bestScore !== 'number') {
      return { status: 'corrupt', best: 0 };
    }
    if (!Number.isFinite(blob.bestScore) || blob.bestScore < 0) {
      return { status: 'corrupt', best: 0 };
    }
    return { status: 'ok', best: Math.floor(blob.bestScore) };
  } catch {
    return { status: 'corrupt', best: 0 };
  }
}

/**
 * Legacy helper — absent → 0; corrupt → 0.
 * Prefer parsePersonalBestResult when refusing to clobber a known best (F-26).
 */
export function parsePersonalBestBlob(raw: string | null): number {
  return parsePersonalBestResult(raw).best;
}

export type ParseProgressResult =
  | { status: 'ok'; progress: ProgressBlob }
  | { status: 'absent'; progress: ProgressBlob }
  | { status: 'corrupt'; progress: ProgressBlob };

const PLAYABLE_SET = new Set<string>(PLAYABLE_LEVEL_ORDER);

function sanitizeProgress(raw: {
  unlocked: unknown;
  bestByLevel: unknown;
  bestScore: unknown;
  updatedAt: unknown;
}): ProgressBlob {
  const unlocked: LevelId[] = [];
  const seen = new Set<LevelId>();
  if (Array.isArray(raw.unlocked)) {
    for (const id of raw.unlocked) {
      if (typeof id === 'string' && PLAYABLE_SET.has(id) && !seen.has(id as LevelId)) {
        seen.add(id as LevelId);
        unlocked.push(id as LevelId);
      }
    }
  }
  if (!seen.has('level-01')) {
    unlocked.unshift('level-01');
  }

  const bestByLevel: Partial<Record<LevelId, number>> = {};
  if (raw.bestByLevel != null && typeof raw.bestByLevel === 'object') {
    const map = raw.bestByLevel as Record<string, unknown>;
    for (const key of Object.keys(map)) {
      if (!PLAYABLE_SET.has(key)) continue;
      const n = map[key];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) {
        bestByLevel[key as LevelId] = Math.floor(n);
      }
    }
  }

  let bestScore = 0;
  if (typeof raw.bestScore === 'number' && Number.isFinite(raw.bestScore) && raw.bestScore >= 0) {
    bestScore = Math.floor(raw.bestScore);
  }
  for (const v of Object.values(bestByLevel)) {
    if (typeof v === 'number' && v > bestScore) {
      bestScore = v;
    }
  }

  let updatedAt = 0;
  if (typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)) {
    updatedAt = raw.updatedAt;
  }

  return {
    v: 2,
    unlocked,
    bestByLevel,
    bestScore,
    updatedAt,
  };
}

export function parseProgressResult(raw: string | null): ParseProgressResult {
  if (raw == null) {
    return { status: 'absent', progress: defaultProgressBlob() };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    const blob = parsed as {
      v?: unknown;
      unlocked?: unknown;
      bestByLevel?: unknown;
      bestScore?: unknown;
      updatedAt?: unknown;
    };
    if (blob.v !== 2) {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    if (!Array.isArray(blob.unlocked)) {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    if (blob.bestByLevel == null || typeof blob.bestByLevel !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    if (typeof blob.bestScore !== 'number' || !Number.isFinite(blob.bestScore)) {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    return {
      status: 'ok',
      progress: sanitizeProgress({
        unlocked: blob.unlocked,
        bestByLevel: blob.bestByLevel,
        bestScore: blob.bestScore,
        updatedAt: blob.updatedAt,
      }),
    };
  } catch {
    return { status: 'corrupt', progress: defaultProgressBlob() };
  }
}
