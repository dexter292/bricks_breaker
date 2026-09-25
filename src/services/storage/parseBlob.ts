/**
 * Fail-soft parse of AsyncStorage personal-best / progress JSON (T-06-01 / F-26 / N-PROG).
 * Distinguishes absent vs corrupt so callers never treat garbage as best=0.
 */

import type { LevelId } from '../../core';
import { PLAYABLE_LEVEL_ORDER } from './catalog';
import {
  RECENT_RUNS_BOUND,
  defaultProgressBlob,
  defaultProgressBlobV3,
  defaultTelemetryAggregate,
  defaultTelemetryBlob,
  type GameMode,
  type LevelBest,
  type ProgressBlob,
  type ProgressBlobV2,
  type ProgressBlobV3,
  type RunLogEntry,
  type RunOutcome,
  type StarCount,
  type TelemetryAggregate,
  type TelemetryBlob,
} from './types';

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

/** Legacy v3 parse result — migrate-on-read input only. */
export type ParseProgressV3Result =
  | { status: 'ok'; progress: ProgressBlobV3 }
  | { status: 'absent'; progress: ProgressBlobV3 }
  | { status: 'corrupt'; progress: ProgressBlobV3 };

export type ParseProgressResultV2 =
  | { status: 'ok'; progress: ProgressBlobV2 }
  | { status: 'absent'; progress: ProgressBlobV2 }
  | { status: 'corrupt'; progress: ProgressBlobV2 };

const PLAYABLE_SET = new Set<string>(PLAYABLE_LEVEL_ORDER);

function defaultProgressBlobV2(): ProgressBlobV2 {
  return {
    v: 2,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
  };
}

/**
 * Normalise the unlocked list to a **prefix of the catalog order**, preserving how many
 * levels the player had opened rather than which ids.
 *
 * Unlocking is a chain, so a valid save is always a prefix — but E2 reordered the campaign
 * (`PLAYABLE_LEVEL_ORDER`), and `unlocked` stores ids, not slots. A pre-E2 save could hold
 * `[01, 03, 04, 06]`, which under the new order leaves `level-05` locked while `level-06`
 * and `level-03` sit unlocked behind it — a hole in the ladder the player cannot close.
 *
 * Healing by **count** (4 unlocked ⇒ the first 4 of the new order) keeps the player's
 * progress distance and closes the hole. Healing by *identity* would be wrong: `level-03`
 * used to be slot 2 and is now the finale, so it would hand out the whole campaign to
 * anyone who had merely cleared the first level.
 *
 * Per-level bests and stars are untouched — only access changes.
 */
function sanitizeUnlocked(raw: unknown): LevelId[] {
  const seen = new Set<LevelId>();
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && PLAYABLE_SET.has(id)) {
        seen.add(id as LevelId);
      }
    }
  }
  seen.add('level-01');
  const count = Math.min(seen.size, PLAYABLE_LEVEL_ORDER.length);
  return PLAYABLE_LEVEL_ORDER.slice(0, count);
}

function sanitizeLevelBest(raw: unknown): LevelBest | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as { score?: unknown; stars?: unknown };
  if (typeof entry.score !== 'number' || !Number.isFinite(entry.score) || entry.score < 0) {
    return null;
  }
  const best: LevelBest = { score: Math.floor(entry.score) };
  if (entry.stars === 1 || entry.stars === 2 || entry.stars === 3) {
    best.stars = entry.stars as StarCount;
  }
  return best;
}

function sanitizeProgressV3(raw: {
  unlocked: unknown;
  bestByLevel: unknown;
  bestScore: unknown;
  updatedAt: unknown;
}): ProgressBlobV3 {
  const unlocked = sanitizeUnlocked(raw.unlocked);

  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  if (raw.bestByLevel != null && typeof raw.bestByLevel === 'object') {
    const map = raw.bestByLevel as Record<string, unknown>;
    for (const key of Object.keys(map)) {
      if (!PLAYABLE_SET.has(key)) continue;
      const best = sanitizeLevelBest(map[key]);
      if (best != null) {
        bestByLevel[key as LevelId] = best;
      }
    }
  }

  let bestScore = 0;
  if (typeof raw.bestScore === 'number' && Number.isFinite(raw.bestScore) && raw.bestScore >= 0) {
    bestScore = Math.floor(raw.bestScore);
  }
  for (const v of Object.values(bestByLevel)) {
    if (v != null && v.score > bestScore) {
      bestScore = v.score;
    }
  }

  let updatedAt = 0;
  if (typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)) {
    updatedAt = raw.updatedAt;
  }

  return {
    v: 3,
    unlocked,
    bestByLevel,
    bestScore,
    updatedAt,
  };
}

function sanitizeProgressV2(raw: {
  unlocked: unknown;
  bestByLevel: unknown;
  bestScore: unknown;
  updatedAt: unknown;
}): ProgressBlobV2 {
  const unlocked = sanitizeUnlocked(raw.unlocked);

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

/** Parse legacy ProgressBlob v3 (v===3 only) for migrate-on-read input. */
export function parseProgressV3Result(
  raw: string | null,
): ParseProgressV3Result {
  if (raw == null) {
    return { status: 'absent', progress: defaultProgressBlobV3() };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlobV3() };
    }
    const blob = parsed as {
      v?: unknown;
      unlocked?: unknown;
      bestByLevel?: unknown;
      bestScore?: unknown;
      updatedAt?: unknown;
    };
    if (blob.v !== 3) {
      return { status: 'corrupt', progress: defaultProgressBlobV3() };
    }
    if (!Array.isArray(blob.unlocked)) {
      return { status: 'corrupt', progress: defaultProgressBlobV3() };
    }
    if (blob.bestByLevel == null || typeof blob.bestByLevel !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlobV3() };
    }
    if (typeof blob.bestScore !== 'number' || !Number.isFinite(blob.bestScore)) {
      return { status: 'corrupt', progress: defaultProgressBlobV3() };
    }
    return {
      status: 'ok',
      progress: sanitizeProgressV3({
        unlocked: blob.unlocked,
        bestByLevel: blob.bestByLevel,
        bestScore: blob.bestScore,
        updatedAt: blob.updatedAt,
      }),
    };
  } catch {
    return { status: 'corrupt', progress: defaultProgressBlobV3() };
  }
}

/** Parse legacy v2 blob for migrate-on-read input. */
export function parseProgressV2Result(raw: string | null): ParseProgressResultV2 {
  if (raw == null) {
    return { status: 'absent', progress: defaultProgressBlobV2() };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlobV2() };
    }
    const blob = parsed as {
      v?: unknown;
      unlocked?: unknown;
      bestByLevel?: unknown;
      bestScore?: unknown;
      updatedAt?: unknown;
    };
    if (blob.v !== 2) {
      return { status: 'corrupt', progress: defaultProgressBlobV2() };
    }
    if (!Array.isArray(blob.unlocked)) {
      return { status: 'corrupt', progress: defaultProgressBlobV2() };
    }
    if (blob.bestByLevel == null || typeof blob.bestByLevel !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlobV2() };
    }
    if (typeof blob.bestScore !== 'number' || !Number.isFinite(blob.bestScore)) {
      return { status: 'corrupt', progress: defaultProgressBlobV2() };
    }
    return {
      status: 'ok',
      progress: sanitizeProgressV2({
        unlocked: blob.unlocked,
        bestByLevel: blob.bestByLevel,
        bestScore: blob.bestScore,
        updatedAt: blob.updatedAt,
      }),
    };
  } catch {
    return { status: 'corrupt', progress: defaultProgressBlobV2() };
  }
}

const GAME_MODE_SET = new Set<string>(['campaign', 'endless', 'daily']);
const RUN_OUTCOME_SET = new Set<string>(['win', 'lose', 'abandoned']);

/** Counters are non-negative integers; anything else degrades to 0. */
function safeCounter(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return Math.floor(raw);
}

function sanitizeAggregate(raw: unknown): TelemetryAggregate {
  const out = defaultTelemetryAggregate();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(out) as (keyof TelemetryAggregate)[]) {
    out[key] = safeCounter(map[key]);
  }
  return out;
}

function sanitizeRunLogEntry(raw: unknown): RunLogEntry | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as {
    mode?: unknown;
    levelId?: unknown;
    outcome?: unknown;
    score?: unknown;
    ticks?: unknown;
    timestamp?: unknown;
  };
  if (typeof entry.mode !== 'string' || !GAME_MODE_SET.has(entry.mode)) {
    return null;
  }
  if (typeof entry.levelId !== 'string' || entry.levelId.length === 0) {
    return null;
  }
  if (typeof entry.outcome !== 'string' || !RUN_OUTCOME_SET.has(entry.outcome)) {
    return null;
  }
  if (typeof entry.timestamp !== 'number' || !Number.isFinite(entry.timestamp)) {
    return null;
  }
  return {
    mode: entry.mode as GameMode,
    levelId: entry.levelId,
    outcome: entry.outcome as RunOutcome,
    score: safeCounter(entry.score),
    ticks: safeCounter(entry.ticks),
    timestamp: Math.floor(entry.timestamp),
  };
}

function sanitizeAggregateMap(
  raw: unknown,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry == null || typeof entry !== 'object') {
      continue;
    }
    out[key] = sanitizeAggregate(entry);
  }
  return out;
}

/**
 * Validate `telemetry` INDEPENDENTLY of its sibling progress fields (Pitfall 4 /
 * roadmap SC-4): any structural failure here degrades telemetry alone to defaults
 * and must never make the enclosing blob read as `corrupt`. Partial telemetry keeps
 * every field it does have.
 */
function sanitizeTelemetry(raw: unknown): TelemetryBlob {
  const out = defaultTelemetryBlob();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const telemetry = raw as {
    lifetime?: unknown;
    byMode?: unknown;
    recentRuns?: unknown;
  };
  out.lifetime = sanitizeAggregate(telemetry.lifetime);
  if (telemetry.byMode != null && typeof telemetry.byMode === 'object') {
    const byMode = telemetry.byMode as Record<string, unknown>;
    out.byMode.campaign = sanitizeAggregateMap(byMode.campaign);
    out.byMode.endless = sanitizeAggregateMap(byMode.endless);
    out.byMode.daily = sanitizeAggregateMap(byMode.daily);
  }
  if (Array.isArray(telemetry.recentRuns)) {
    const entries: RunLogEntry[] = [];
    for (const item of telemetry.recentRuns) {
      const entry = sanitizeRunLogEntry(item);
      if (entry != null) {
        entries.push(entry);
      }
    }
    // Bound on read as well as on write — a tampered blob cannot grow the ring.
    out.recentRuns = entries.slice(-RECENT_RUNS_BOUND);
  }
  return out;
}

/**
 * Parse current ProgressBlob (v===4 only) — fail-soft (C1 D-09).
 * Top-level gating mirrors the v3 parser field-for-field; `telemetry` is validated
 * separately so its corruption can never discard unlocked/bestByLevel/bestScore.
 */
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
      telemetry?: unknown;
    };
    if (blob.v !== 4) {
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
    // Shared fields reuse the same private sanitizer the v3 parser uses (identical
    // semantics incl. the E2 ladder heal); only the version tag differs.
    const shared = sanitizeProgressV3({
      unlocked: blob.unlocked,
      bestByLevel: blob.bestByLevel,
      bestScore: blob.bestScore,
      updatedAt: blob.updatedAt,
    });
    return {
      status: 'ok',
      progress: {
        v: 4,
        unlocked: shared.unlocked,
        bestByLevel: shared.bestByLevel,
        bestScore: shared.bestScore,
        updatedAt: shared.updatedAt,
        telemetry: sanitizeTelemetry(blob.telemetry),
      },
    };
  } catch {
    return { status: 'corrupt', progress: defaultProgressBlob() };
  }
}
