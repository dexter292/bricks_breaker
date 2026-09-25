import type { LevelId } from '../../core';

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

/** Campaign progress blob (N-PROG-01 / N-PROG-02 / N-PROG-03 / N-STAT-02). */
export const PROGRESS_VERSION = 4 as const;
export const PROGRESS_KEY = '@nbb/progress/v4' as const;
/** Legacy v3 key — migrate-on-read source only; never delete. */
export const PROGRESS_KEY_V3 = '@nbb/progress/v3' as const;
/** Legacy v2 key — migrate-on-read source only; never delete. */
export const PROGRESS_KEY_V2 = '@nbb/progress/v2' as const;

/** Lives-based star count after a win (N-PROG-03 / D-07). */
export type StarCount = 1 | 2 | 3;

/**
 * Per-level best (D-04 / D-05).
 * `stars` present only after ≥1 win (omit until first C2 win).
 */
export type LevelBest = {
  score: number;
  stars?: StarCount;
};

/**
 * Run mode (Phase 9 D-04). v4 is mode-aware from the start so Phases 11/12 add a
 * mode value instead of forcing a v5 and a v6 migration. Only `campaign` is
 * written this phase.
 */
export type GameMode = 'campaign' | 'endless' | 'daily';

/** Closed set of run outcomes (Phase 9 D-02 / D-03). */
export type RunOutcome = 'win' | 'lose' | 'abandoned';

/**
 * Bounded recent-run ring (D-05). ~120 bytes/entry × 50 ≈ 6KB against the ~2MB
 * Android CursorWindow practical ceiling — orders of magnitude of headroom.
 */
export const RECENT_RUNS_BOUND = 50 as const;

/**
 * Lifetime / per-(mode, level) counter roll-up (D-06…D-10).
 * Cumulative fields sum across runs; `*Ever` fields take a running max.
 */
export type TelemetryAggregate = {
  runsPlayed: number;
  runsWon: number;
  runsLost: number;
  runsAbandoned: number;
  bricksBroken: number;
  /** Max consecutive brick hits without paddle contact (D-06) — an aggression streak. */
  bestComboEver: number;
  pickupMultiball: number;
  pickupExpand: number;
  pickupExtraLife: number;
  pickupSlow: number;
  pickupFireball: number;
  livesLost: number;
  /**
   * Max consecutive paddle hits without losing a life (D-10) — a survival streak,
   * deliberately NOT the same metric as `bestComboEver`.
   */
  longestRallyEver: number;
  /** Grid-adjacency-grouped cascade size (src/runtime/runStats.ts) — exact for every real playable level (all use the lattice broadphase). A narrow fallback treats a break with no resolvable lattice cell as its own singleton group, which can only ever UNDERcount, never overcount — safe for an achievement trigger (D-08); see 09-CONTEXT.md "Notes for later phases". */
  largestCascadeEver: number;
  /** Simulated time (world ticks); excludes pause. */
  ticksPlayed: number;
  /** Wall-clock play time in ms (D-09) — a different question from ticks. */
  wallClockMsTotal: number;
};

/** One entry in the bounded recent-run ring (D-05) — deliberately small. */
export type RunLogEntry = {
  mode: GameMode;
  levelId: string;
  outcome: RunOutcome;
  score: number;
  ticks: number;
  timestamp: number;
};

/**
 * Per-run counters handed to `recordRunEnd` at end of run.
 * Intentionally excludes `rallyCurrent` (runtime-internal bookkeeping only, see
 * src/runtime/runStats.ts) and never imports src/runtime/* (LC boundary: services
 * may import core/services only, never runtime).
 */
export type RunStatsInput = {
  bricksBroken: number;
  bestCombo: number;
  pickupMultiball: number;
  pickupExpand: number;
  pickupExtraLife: number;
  pickupSlow: number;
  pickupFireball: number;
  livesLost: number;
  longestRally: number;
  largestCascade: number;
  ticksPlayed: number;
  wallClockMs: number;
};

export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: {
    campaign: Partial<Record<string, TelemetryAggregate>>;
    endless: Partial<Record<string, TelemetryAggregate>>;
    daily: Partial<Record<string, TelemetryAggregate>>;
  };
  recentRuns: RunLogEntry[];
};

export function defaultTelemetryAggregate(): TelemetryAggregate {
  return {
    runsPlayed: 0,
    runsWon: 0,
    runsLost: 0,
    runsAbandoned: 0,
    bricksBroken: 0,
    bestComboEver: 0,
    pickupMultiball: 0,
    pickupExpand: 0,
    pickupExtraLife: 0,
    pickupSlow: 0,
    pickupFireball: 0,
    livesLost: 0,
    longestRallyEver: 0,
    largestCascadeEver: 0,
    ticksPlayed: 0,
    wallClockMsTotal: 0,
  };
}

export function defaultTelemetryBlob(): TelemetryBlob {
  return {
    lifetime: defaultTelemetryAggregate(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    recentRuns: [],
  };
}

/** All-zero per-run counters — a run that recorded nothing. */
export function defaultRunStatsInput(): RunStatsInput {
  return {
    bricksBroken: 0,
    bestCombo: 0,
    pickupMultiball: 0,
    pickupExpand: 0,
    pickupExtraLife: 0,
    pickupSlow: 0,
    pickupFireball: 0,
    livesLost: 0,
    longestRally: 0,
    largestCascade: 0,
    ticksPlayed: 0,
    wallClockMs: 0,
  };
}

/** Active progress blob (v4 — N-STAT-02). */
export type ProgressBlob = {
  v: 4;
  /** Always includes 'level-01'; catalog order; never level-02 */
  unlocked: LevelId[];
  /** Sparse map; missing key ⇒ best 0 / no stars */
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  /** Rolled-up Title PB = max(scores) maintained on write (D-07) */
  bestScore: number;
  updatedAt: number;
  /** Run telemetry (Phase 9). Corruption here degrades telemetry alone (SC-4). */
  telemetry: TelemetryBlob;
};

/** Legacy v3 blob shape for migrate input only. */
export type ProgressBlobV3 = {
  v: 3;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  bestScore: number;
  updatedAt: number;
};

/** Legacy v2 blob shape for migrate input only. */
export type ProgressBlobV2 = {
  v: 2;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, number>>;
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob {
  return {
    v: 4,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
    telemetry: defaultTelemetryBlob(),
  };
}

export function defaultProgressBlobV3(): ProgressBlobV3 {
  return {
    v: 3,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
  };
}

export interface ProgressStore {
  getBest(): Promise<number>;
  /** Returns nested `.score` (missing → 0). */
  getBestForLevel(id: LevelId): Promise<number>;
  /** Score-only path (lose / legacy); stars unchanged via mergeLevelBest(null). */
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  /**
   * Preferred end-of-run: sync memory merge score/stars/unlock; void persist;
   * return clone before awaiting disk (D-10 / F-26).
   * Telemetry rides this call rather than a parallel one (C2 lock).
   */
  recordRunEnd(args: {
    levelId: LevelId;
    mode: GameMode;
    score: number;
    outcome: RunOutcome;
    livesRemaining: number;
    stats: RunStatsInput;
  }): ProgressBlob;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
