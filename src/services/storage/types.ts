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
 * Bounded daily history window (D-15), same reasoning as `RECENT_RUNS_BOUND` above and the
 * same obligation to state arithmetic rather than assert a number. A `{ date, score,
 * outcome }` entry serialises to roughly 45 bytes of JSON, so 400 entries is ~18KB against
 * the ~2MB Android CursorWindow practical ceiling the ring-buffer comment already names —
 * the same order of magnitude of headroom as the 50-entry ring.
 *
 * 400 rather than a rounder 365 because the window IS the longest ended streak the D-17
 * line can ever report as ended: past it, `endedStreakLength` hits the window floor and
 * must omit the line entirely. A tighter window would start suppressing that line a month
 * earlier for no storage gain worth having.
 *
 * Declared in plan 12-03 rather than 12-01: 12-01's tracer reaches no history long enough
 * to trim, and a constant a slice never exercises is a rider on that slice. This is the
 * first plan that both applies the bound and overshoots it in a test.
 */
export const DAILY_HISTORY_BOUND = 400 as const;

/**
 * Hard stop for the `currentStreakStart` walk — a TAMPER FENCE, not a streak ceiling.
 *
 * 36 525 is a hundred Gregorian years of unbroken daily play (365.25 x 100, leap days
 * included): longer than any human can accumulate, so a legitimate blob can never reach
 * it and the fence never truncates a real streak. What it bounds is a hostile one — the
 * blob is plaintext, and a `currentStreakStart` of `0001-01-01` would otherwise spin the
 * walk through roughly 740 000 iterations.
 *
 * MEASURED on this project's own Node (plan 12-03): the full 36 525-step walk costs 7.25ms
 * and a realistic 450-day streak costs 0.69ms. This runs once when a date closes, never
 * per frame.
 *
 * **Exceeding it discards the stored start rather than saturating at it.** Reaching the
 * cap proves the value is not a real run, and reporting ~36 525 days of daily play that
 * never happened would inflate a lifetime achievement out of garbage. The walk falls back
 * to the start the stored window can vouch for, which under-reports and never inflates —
 * the safe direction, and the same direction `endedStreakLength` chose at its own floor.
 */
export const DAILY_STREAK_WALK_CAP = 36_525 as const;

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
 * additionally, because keying that map by anything that VARIES PER DATE would grow a map
 * whose only cap is a blanket one: `sanitizeAggregateMap` (in `parseBlob.ts` — cited by
 * SYMBOL because this comment carried `parseBlob.ts:383-399` while the function sat near
 * line 670, the citation drift this repo has now hit four times) bounds the map at
 * `AGGREGATE_MAP_BOUND` and nothing downstream trims it further, so a per-date key would
 * survive until it hit that blanket cap and then silently lose dates. The per-date history
 * belongs in `TelemetryBlob.daily`, which is a bounded collection with a policy about
 * WHICH entries it keeps.
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
  /**
   * Longest run of consecutive closed dates EVER (D-16). Updated when a date closes and
   * **never recomputed from the trimmed window** — that sentence is the whole of D-16.
   * Without it, trimming the history would silently erase an achievement, and a streak
   * longer than the window would read as the window length.
   *
   * It is a running max and never falls: breaking a streak restarts `currentStreakStart`,
   * it does not lower this.
   */
  longestStreak: number;
  /**
   * Count of dates ever closed (D-16). Also never recomputed from the trimmed window: a
   * player past the window size would watch a number they have been growing go DOWN.
   * Incremented only when a date is closed for the FIRST time, so a repeated write of the
   * same date is idempotent (D-06).
   */
  totalDaysPlayed: number;
  /**
   * The first date of the run currently in progress, as a `YYYY-MM-DD` key, or `''` when
   * no date has ever been closed.
   *
   * **A date, deliberately not a counter.** SC-3 requires the streak be "computed from
   * stored dates rather than an incrementing counter that a crash could corrupt"; the
   * current streak is a `previousDateKey` walk from the closing date back to this one, so
   * it stays derived — this field just says how far back to walk, which the bounded
   * window (D-15) cannot otherwise express.
   *
   * **Why it exists (amends D-16, approved at plan 12-03's decision checkpoint).** With
   * only the two scalars above, the closing streak could only be derived from the stored
   * window, so `longestStreak` saturated at `DAILY_HISTORY_BOUND + 1` and could never
   * report a longer run — MEASURED at 401 for 450 consecutive closes. That defeats D-16's
   * own purpose. One more stored date makes the run exactly derivable and unbounded.
   *
   * **Self-correcting, by contract.** Whenever the stored window contains a gap, the run
   * start is derivable from the dates alone and the derived value WINS — any stored value
   * is discarded. The field is trusted only where the window is consecutive end to end and
   * therefore cannot contradict it. A malformed, future-dated or absurdly old value
   * degrades to the window-derived start, which under-reports and never inflates.
   */
  currentStreakStart: string;
};

/**
 * Hard cap on the stored unlock collection — a TAMPER FENCE, not a capacity estimate.
 *
 * The `DAILY_HISTORY_BOUND` framing is the wrong one here and a reader will reach for it,
 * so: this bound is not sizing a window a legitimate player could fill. A legitimate
 * record can never exceed the CATALOG's size, because an unknown id is dropped on read
 * (D-15, `isKnownAchievementId`) and that drop IS the natural cap. 64 is more than five
 * times D-09's largest catalog and leaves Phase 14 and beyond room without a bound edit,
 * while capping a hostile blob at roughly `64 x 40` bytes of JSON, about 2.5KB, against
 * the ~2MB Android CursorWindow practical ceiling the ring-buffer comment above names.
 *
 * **Why it exists at all, given the id check already caps it.** It is the fence that
 * survives a future relaxation of that check — the "forward-compatible with a later
 * catalog" edit that looks harmless and turns the collection into the unbounded map
 * `DAILY_TELEMETRY_KEY`'s comment above exists to prevent. `13-PATTERNS.md`'s rule is that
 * the collection must have the bound or the id validation and must not have neither.
 */
export const ACHIEVEMENT_UNLOCK_BOUND = 64 as const;

/**
 * The per-map key cap for the three `byMode` aggregate maps (WINDOWS #27 / T-09-A1).
 *
 * **Why this exists, and why it did not until now.** `sanitizeAggregateMap` in
 * `parseBlob.ts` copied EVERY key it found on every parse, with no bound — and it does not
 * merely copy, it EXPANDS: a stored `{}` cell becomes a full sixteen-field
 * `TelemetryAggregate`. MEASURED 2026-09-29 on a valid v4 blob: 20 000 empty campaign
 * cells at **229 KB stored** parse to **5.79 MB in memory**, a **25x inflation**, with all
 * 20 000 keys surviving and `status: 'ok'`. The ratio rises as stored key names shorten.
 * The phase-09 audit measured the same shape at 11.2x with longer keys; both are the one
 * defect. Against the ~2MB Android CursorWindow ceiling the ring-buffer comment above
 * names, the parsed side had no ceiling at all.
 *
 * This was WINDOWS #27, open since plan 09-02 (`ddbbec3`), and phases 11, 12 and 13 each
 * *transferred* a threat to it — `13-SECURITY.md`'s `T-13-07`/`T-13-02` row among them — on
 * the understanding that it was tracked. Tracked is not bounded.
 *
 * **Why 64 does not cost anything real.** Every legitimate key comes from a closed domain:
 * `byMode.campaign` is keyed by `LevelId`, which has exactly FIVE members
 * (`src/core/levels/levelIds.ts`); `byMode.endless` holds the single
 * `ENDLESS_TELEMETRY_KEY`; `byMode.daily` the single `DAILY_TELEMETRY_KEY` — and
 * `DAILY_TELEMETRY_KEY`'s own comment above explains that it is a constant precisely so
 * this map cannot grow per date. So a real blob carries at most five keys in the largest
 * of the three maps. 64 is thirteen times that, leaves room for a campaign several times
 * its present size without a bound edit, and can only ever discard keys a tampered blob
 * invented.
 *
 * Applied **keep-first**, matching `ACHIEVEMENT_UNLOCK_BOUND`'s direction and for the same
 * reason: the entries a real player accumulated come first, and dropping the oldest would
 * discard the levels they have played longest.
 */
export const AGGREGATE_MAP_BOUND = 64 as const;

/** One earned achievement (D-14) — which one, and when it was first earned. */
export type AchievementUnlock = {
  /**
   * The catalog id (`src/services/achievements` `ACHIEVEMENT_CATALOG`). Minted there and
   * validated there — `isKnownAchievementId` is the read-path gate (D-15). Never coerced:
   * an id is not a counter and there is no nearest valid value.
   */
  id: string;
  /**
   * Unix ms at which this achievement was FIRST earned (D-14).
   *
   * Stored rather than derived because it cannot be reconstructed afterwards for anything
   * already unlocked: the moment is gone once the run that produced it has ended, and
   * Phase 14's Achievements screen wants a recency order. That irreversibility is exactly
   * why D-14 is rated one-way for the data and why the field lands now rather than later.
   *
   * It never moves. An id already present keeps its existing timestamp on every subsequent
   * write and on every merge (D-17 / D-22) — an unlock is one-way and its moment does not
   * drift forward.
   */
  at: number;
};

/**
 * Earned achievements (N-ACH-02 / D-13 / D-14 / D-15).
 *
 * Lives INSIDE `TelemetryBlob` for the reason `DailyRecord` does, which cites
 * `EndlessRecord` for the same reason in turn: telemetry is the one sub-object whose
 * parser is validated independently of its siblings (`parseBlob.ts` `sanitizeTelemetry`),
 * so a corrupt unlock set degrades itself alone and can never take campaign unlocks,
 * bests or the daily history with it (SC-5).
 *
 * The field is ADDITIVE and needs no `PROGRESS_VERSION` bump and no migration (D-13),
 * because `sanitizeTelemetry` starts from `defaultTelemetryBlob()` and copies field by
 * field, so an older v4 blob defaults it cleanly — exactly as the endless record needed
 * none when it was added, and the daily record after it.
 */
export type AchievementRecord = {
  /**
   * Earned achievements, one entry per id. Bounded on write by
   * `ACHIEVEMENT_UNLOCK_BOUND`; the read bound and the unknown-id drop are plan 13-03's.
   *
   * An ARRAY of entries, deliberately not a map keyed by id: `sanitizeAggregateMap`
   * (`parseBlob.ts`) is the counter-example living one file away, copying every key it
   * finds on read with no cap forever.
   */
  unlocked: AchievementUnlock[];
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
  /** Earned achievements (D-14) — written only by `mergeAchievementUnlocks`. */
  achievements: AchievementRecord;
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
  return { history: [], longestStreak: 0, totalDaysPlayed: 0, currentStreakStart: '' };
}

/** Empty achievement record — nothing has been earned yet. */
export function defaultAchievementRecord(): AchievementRecord {
  return { unlocked: [] };
}

export function defaultTelemetryBlob(): TelemetryBlob {
  return {
    lifetime: defaultTelemetryAggregate(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    endless: defaultEndlessRecord(),
    daily: defaultDailyRecord(),
    // Reachable from here is what makes D-13's no-migration claim TRUE rather than
    // intended: `sanitizeTelemetry` starts from this value, so a v4 blob written before
    // the field existed parses with it defaulted and no `v` bump.
    achievements: defaultAchievementRecord(),
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

/**
 * What `recordRunEnd` returns: the post-write blob, plus the ids this write newly
 * unlocked (D-19).
 *
 * **Why the return type widens at all.** The delta D-02 computes cannot otherwise cross
 * the store boundary. By the time `recordRunEnd` returns, the UNION has been persisted and
 * the set difference is gone — it is not recoverable from the post-write blob. The store
 * holds both sets at the moment it computes them, so returning the delta costs nothing and
 * reads nothing extra.
 *
 * Rejected: the host pre-reading storage and diffing after. That needs an extra storage
 * read, which D-01 explicitly avoided, and it opens a race between the read and the write.
 *
 * **The MEASURED blast radius, stated verbatim because it is smaller than it looks and the
 * gap is a hazard.** Making `newlyUnlocked` a REQUIRED field reds exactly two lines —
 * `memoryStore.ts(100,5)` and `asyncStorageStore.ts(369,5)`, both `TS2322` — and nothing
 * else. The four mocked-store harnesses do NOT break, because each builds its store as a
 * bare object literal inside a `vi.mock` factory and is therefore not contextually typed
 * as `ProgressStore`. So three of them hand the host an `undefined` at runtime: **every
 * consumer must fail soft on an absent `newlyUnlocked`**, and a harness that means to
 * exercise the real path must SUPPLY the field or it silently exercises the fail-soft
 * branch instead — the same trap `tests/ui/PlayingHost.endless-run.test.tsx` already warns
 * about for its own `telemetry.endless` mock.
 *
 * `recordRunEnd`'s return has not changed since Phase 9. That is a reason to be
 * deliberate, not a reason to take the worse option.
 */
export type RecordRunEndResult = ProgressBlob & {
  /**
   * Ids newly unlocked by THIS write, in catalog declaration order. Always an array —
   * `[]` when nothing fired, never `undefined` from a real store.
   */
  readonly newlyUnlocked: readonly string[];
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
   *
   * Returns `RecordRunEndResult` — the blob PLUS the newly-unlocked ids (D-19). See that
   * type for why the delta rides the return and what fails soft on its absence.
   */
  recordRunEnd(args: RecordRunEndArgs): RecordRunEndResult;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
