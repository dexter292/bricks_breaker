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

/**
 * Endless-mode personal record (N-END-02 / Phase 11 D-12).
 *
 * Lives INSIDE `TelemetryBlob`, never on `ProgressBlob`: telemetry is the one
 * sub-object whose parser is validated independently of its siblings
 * (`parseBlob.ts` `sanitizeTelemetry`), so a corrupt endless record degrades
 * itself alone and can never take campaign unlocks/bests with it (SC-3).
 */
export type EndlessRecord = {
  /**
   * Deepest wave index ever reached in an endless run (D-01/D-02 wave numbering,
   * 1-based) — a depth record, deliberately NOT a count of waves played.
   */
  bestWave: number;
  /**
   * Highest score ever reached in an endless run, deliberately NOT
   * `ProgressBlob.bestScore` — that is the rolled-up *campaign* Title PB (see
   * `ProgressBlob` below), which an endless run must never raise (SC-3 / N-END-02).
   */
  bestScore: number;
};

/**
 * The `byMode.endless` map key (Phase 11 D-12). A plain constant string rather
 * than a `LevelId` because a generated board has no catalog id, and widening
 * `LevelId` to admit one would open every campaign-progress code path — the
 * `bestByLevel` and `unlocked` key type — to endless values.
 */
export const ENDLESS_TELEMETRY_KEY = 'endless' as const;

/**
 * The `byMode.daily` map key (Phase 12 D-15). A plain constant string for the same
 * reason `ENDLESS_TELEMETRY_KEY` is one — a generated board has no catalog id — and,
 * additionally, because keying that map by anything that VARIES PER DATE creates a map
 * with no cap: `sanitizeAggregateMap` (`parseBlob.ts:383-399`) copies every key it
 * finds on read with no bound, so a per-date key would never be trimmed by anything
 * downstream. The per-date history belongs in `TelemetryBlob.daily`, which is a bounded
 * collection.
 */
export const DAILY_TELEMETRY_KEY = 'daily' as const;

/** One closed date (D-01) — the date, what it scored, and how it ended. */
export type DailyHistoryEntry = {
  /** Local calendar date as `YYYY-MM-DD` (`src/services/daily` `localDateKey`). */
  date: string;
  score: number;
  /**
   * Deliberately NOT `RunOutcome`: an `abandoned` run accumulates telemetry (D-09) but
   * does not CLOSE the date (D-07), so it never reaches this history at all.
   */
  outcome: 'win' | 'lose';
};

/**
 * Daily per-date history (N-DAILY-02 / D-01 / D-15).
 *
 * Lives INSIDE `TelemetryBlob` for the same reason `EndlessRecord` does: telemetry is
 * the one sub-object whose parser is validated independently of its siblings
 * (`parseBlob.ts` `sanitizeTelemetry`), so a corrupt daily history degrades itself alone
 * and can never take campaign unlocks or bests with it (SC-5).
 *
 * D-16's two unbounded scalars — longest streak ever, total dates played — are additive
 * to this same record and land with plan 12-03 behind its decision checkpoint. They need
 * no version bump, exactly as the endless record needed none when it was added to an
 * existing v4 blob.
 */
export type DailyRecord = {
  history: DailyHistoryEntry[];
};

export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: {
    campaign: Partial<Record<string, TelemetryAggregate>>;
    endless: Partial<Record<string, TelemetryAggregate>>;
    daily: Partial<Record<string, TelemetryAggregate>>;
  };
  /** Endless running maxima (N-END-02) — written only by `mergeEndlessRecord`. */
  endless: EndlessRecord;
  /** Daily per-date history (D-15) — written only by `mergeDailyRecord`. */
  daily: DailyRecord;
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

/** All-zero endless record — no endless run has been recorded yet. */
export function defaultEndlessRecord(): EndlessRecord {
  return { bestWave: 0, bestScore: 0 };
}

/** Empty daily record — no date has been closed yet. */
export function defaultDailyRecord(): DailyRecord {
  return { history: [] };
}

export function defaultTelemetryBlob(): TelemetryBlob {
  return {
    lifetime: defaultTelemetryAggregate(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    endless: defaultEndlessRecord(),
    daily: defaultDailyRecord(),
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

/**
 * `recordRunEnd`'s argument (Phase 11 D-11 / SC-3 / N-END-02).
 *
 * A discriminated union on `mode`, not one flat object with an optional
 * `levelId`, because the campaign fields must be unreachable from a non-campaign
 * run AT COMPILE TIME. TypeScript's narrowing then *forces* the runtime
 * `args.mode === 'campaign'` gate in both stores to exist, since `args.levelId`
 * does not typecheck outside it — so SC-3 ("an endless run cannot alter campaign
 * unlocks, bests or stars") is a property of the type, not of a caller
 * convention that one careless edit can drop.
 *
 * Phase 12 added the `daily` arm below — this union is now the whole mode set, and
 * `GameMode` no longer has a member that `recordRunEnd` cannot express.
 */
export type RecordRunEndArgs =
  | {
      mode: 'campaign';
      /** Catalog level played — the key for `bestByLevel` and the unlock ladder. */
      levelId: LevelId;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    }
  /**
   * The endless arm carries `wave` and has NO `levelId` — a generated board has
   * no catalog id (D-12), and that absence is what makes the campaign write
   * unreachable. `wave` and `score` fold into `telemetry.endless` (N-END-02);
   * nothing on this arm may reach `bestByLevel`, `unlocked` or `bestScore`.
   */
  | {
      mode: 'endless';
      wave: number;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    }
  /**
   * The daily arm carries `date` where the endless arm carries `wave`, and has NO
   * `levelId` — a generated board has no catalog id (D-12), and that absence is what
   * makes the campaign write unreachable rather than merely unwritten. `date` and
   * `score` fold into `telemetry.daily` (N-DAILY-02); nothing on this arm may reach
   * `bestByLevel`, `unlocked` or `bestScore` (N-DAILY-03 / SC-5).
   *
   * `outcome` stays the full `RunOutcome`: an `abandoned` daily run still accumulates
   * telemetry (D-09), it just does not close the date (D-07), so the narrowing to
   * win-or-lose happens at the record write, not at this boundary.
   */
  | {
      mode: 'daily';
      date: string;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    };

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
  recordRunEnd(args: RecordRunEndArgs): ProgressBlob;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
