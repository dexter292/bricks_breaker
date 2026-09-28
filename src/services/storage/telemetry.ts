/**
 * Pure telemetry merge helpers for ProgressBlob v4 (N-STAT-02 / D-05…D-10).
 * No I/O — same `merge(prev, incoming) → next` shape as stars.ts / watermark.ts.
 *
 * Sum-vs-max is the contract: cumulative counters add, `*Ever` fields take a
 * running max. `bestComboEver` (brick hits without paddle contact, D-06) and
 * `longestRallyEver` (paddle hits without losing a life, D-10) are deliberately
 * DISTINCT fields — do not collapse them.
 *
 * `endless.bestWave` and `endless.bestScore` (N-END-02, Phase 11) are max-fields
 * on the same contract, and each takes its own max independently — a short
 * high-scoring run must not lower the deepest wave, nor the reverse. They are
 * written ONLY by `mergeEndlessRecord`; `mergeRunIntoTelemetry` never touches
 * them, so no campaign run can reach the endless record (SC-3).
 */
import {
  RECENT_RUNS_BOUND,
  defaultTelemetryAggregate,
  type DailyHistoryEntry,
  type DailyRecord,
  type EndlessRecord,
  type GameMode,
  type RunLogEntry,
  type RunOutcome,
  type RunStatsInput,
  type TelemetryAggregate,
  type TelemetryBlob,
} from './types';

export { defaultTelemetryAggregate };

/** Counters stay non-negative integers even if a caller hands over garbage. */
function safeCounter(n: number): number {
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function cloneAggregate(a: TelemetryAggregate): TelemetryAggregate {
  return { ...a };
}

function cloneAggregateMap(
  map: Partial<Record<string, TelemetryAggregate>>,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  for (const [key, val] of Object.entries(map)) {
    if (val != null) {
      out[key] = cloneAggregate(val);
    }
  }
  return out;
}

/** Structural clone — callers may mutate the result without touching the input. */
export function cloneTelemetryBlob(t: TelemetryBlob): TelemetryBlob {
  return {
    lifetime: cloneAggregate(t.lifetime),
    byMode: {
      campaign: cloneAggregateMap(t.byMode.campaign),
      endless: cloneAggregateMap(t.byMode.endless),
      daily: cloneAggregateMap(t.byMode.daily),
    },
    endless: { ...t.endless },
    daily: { history: t.daily.history.map((e) => ({ ...e })) },
    recentRuns: t.recentRuns.map((e) => ({ ...e })),
  };
}

/**
 * Fold one finished endless run into the endless record (N-END-02).
 *
 * Deliberately NOT part of `mergeRunIntoTelemetry`: that function is the
 * mode-keyed aggregate/log path every mode shares, and keeping the record on a
 * separate entry point is what makes "a campaign run cannot write the endless
 * best" a structural fact rather than a convention. Same clone-then-mutate order
 * as `mergeRunIntoTelemetry` — the input blob is never touched.
 *
 * Each field takes its own running max: a deep low-scoring run and a shallow
 * high-scoring run each keep their own record.
 */
export function mergeEndlessRecord(
  telemetry: TelemetryBlob,
  run: { wave: number; score: number },
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  next.endless = {
    bestWave: Math.max(next.endless.bestWave, safeCounter(run.wave)),
    bestScore: Math.max(next.endless.bestScore, safeCounter(run.score)),
  };
  return next;
}

/**
 * Fold one CLOSED date into the daily history (N-DAILY-02 / D-01 / D-06).
 *
 * Deliberately NOT part of `mergeRunIntoTelemetry`, for exactly the reason
 * `mergeEndlessRecord` is not: that function is the mode-keyed aggregate/log path every
 * mode shares, and keeping the per-date record on a separate entry point is what makes
 * "a campaign run cannot close a daily date" a structural fact rather than a
 * convention. Same clone-then-mutate order — the input blob is never touched.
 *
 * A date already present is REPLACED IN PLACE rather than appended twice (D-06: one
 * attempt per date). That also makes the write idempotent, which is what makes a
 * repeated close of the same date benign rather than a history that grows a duplicate
 * every time.
 *
 * No write-time history bound here: `DAILY_HISTORY_BOUND` belongs to plan 12-03, the
 * first plan that both declares it and overshoots it in a test. No history reachable on
 * this path is long enough to trim.
 */
export function mergeDailyRecord(
  telemetry: TelemetryBlob,
  run: { date: string; score: number; outcome: 'win' | 'lose' },
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  const entry: DailyHistoryEntry = {
    date: run.date,
    score: safeCounter(run.score),
    outcome: run.outcome,
  };
  const at = next.daily.history.findIndex((e) => e.date === entry.date);
  const history = [...next.daily.history];
  if (at >= 0) {
    history[at] = entry;
  } else {
    history.push(entry);
  }
  next.daily = { history };
  return next;
}

/** Fold one finished run into an aggregate (cumulative sums, running maxes). */
function bumpAggregate(
  prev: TelemetryAggregate,
  outcome: RunOutcome,
  stats: RunStatsInput,
): TelemetryAggregate {
  return {
    runsPlayed: prev.runsPlayed + 1,
    runsWon: prev.runsWon + (outcome === 'win' ? 1 : 0),
    runsLost: prev.runsLost + (outcome === 'lose' ? 1 : 0),
    runsAbandoned: prev.runsAbandoned + (outcome === 'abandoned' ? 1 : 0),
    bricksBroken: prev.bricksBroken + safeCounter(stats.bricksBroken),
    bestComboEver: Math.max(prev.bestComboEver, safeCounter(stats.bestCombo)),
    pickupMultiball: prev.pickupMultiball + safeCounter(stats.pickupMultiball),
    pickupExpand: prev.pickupExpand + safeCounter(stats.pickupExpand),
    pickupExtraLife: prev.pickupExtraLife + safeCounter(stats.pickupExtraLife),
    pickupSlow: prev.pickupSlow + safeCounter(stats.pickupSlow),
    pickupFireball: prev.pickupFireball + safeCounter(stats.pickupFireball),
    livesLost: prev.livesLost + safeCounter(stats.livesLost),
    longestRallyEver: Math.max(
      prev.longestRallyEver,
      safeCounter(stats.longestRally),
    ),
    largestCascadeEver: Math.max(
      prev.largestCascadeEver,
      safeCounter(stats.largestCascade),
    ),
    ticksPlayed: prev.ticksPlayed + safeCounter(stats.ticksPlayed),
    wallClockMsTotal: prev.wallClockMsTotal + safeCounter(stats.wallClockMs),
  };
}

/**
 * Fold a finished run into lifetime AND the per-(mode, levelId) aggregate, then
 * append its small log entry and re-apply the D-05 bound on write.
 * `Date.now()` is legal here — services layer, not core (LC-01 bans it in src/core only).
 */
export function mergeRunIntoTelemetry(
  telemetry: TelemetryBlob,
  args: {
    mode: GameMode;
    levelId: string;
    outcome: RunOutcome;
    score: number;
    stats: RunStatsInput;
  },
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  next.lifetime = bumpAggregate(next.lifetime, args.outcome, args.stats);

  const byLevel = next.byMode[args.mode];
  byLevel[args.levelId] = bumpAggregate(
    byLevel[args.levelId] ?? defaultTelemetryAggregate(),
    args.outcome,
    args.stats,
  );

  const entry: RunLogEntry = {
    mode: args.mode,
    levelId: args.levelId,
    outcome: args.outcome,
    score: Math.floor(Number.isFinite(args.score) ? args.score : 0),
    ticks: safeCounter(args.stats.ticksPlayed),
    timestamp: Date.now(),
  };
  next.recentRuns = [...next.recentRuns, entry].slice(-RECENT_RUNS_BOUND);
  return next;
}

function mergeAggregates(
  a: TelemetryAggregate,
  b: TelemetryAggregate,
): TelemetryAggregate {
  return {
    runsPlayed: a.runsPlayed + b.runsPlayed,
    runsWon: a.runsWon + b.runsWon,
    runsLost: a.runsLost + b.runsLost,
    runsAbandoned: a.runsAbandoned + b.runsAbandoned,
    bricksBroken: a.bricksBroken + b.bricksBroken,
    bestComboEver: Math.max(a.bestComboEver, b.bestComboEver),
    pickupMultiball: a.pickupMultiball + b.pickupMultiball,
    pickupExpand: a.pickupExpand + b.pickupExpand,
    pickupExtraLife: a.pickupExtraLife + b.pickupExtraLife,
    pickupSlow: a.pickupSlow + b.pickupSlow,
    pickupFireball: a.pickupFireball + b.pickupFireball,
    livesLost: a.livesLost + b.livesLost,
    longestRallyEver: Math.max(a.longestRallyEver, b.longestRallyEver),
    largestCascadeEver: Math.max(a.largestCascadeEver, b.largestCascadeEver),
    ticksPlayed: a.ticksPlayed + b.ticksPlayed,
    wallClockMsTotal: a.wallClockMsTotal + b.wallClockMsTotal,
  };
}

function mergeAggregateMaps(
  a: Partial<Record<string, TelemetryAggregate>>,
  b: Partial<Record<string, TelemetryAggregate>>,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  // Union of level keys present on either side — never drop one side's levels.
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const left = a[key];
    const right = b[key];
    if (left != null && right != null) {
      out[key] = mergeAggregates(left, right);
    } else if (left != null) {
      out[key] = cloneAggregate(left);
    } else if (right != null) {
      out[key] = cloneAggregate(right);
    }
  }
  return out;
}

/** Per-field running max — the same sum-vs-max contract as `*Ever` (N-END-02). */
function mergeEndlessRecords(a: EndlessRecord, b: EndlessRecord): EndlessRecord {
  return {
    bestWave: Math.max(a.bestWave, b.bestWave),
    bestScore: Math.max(a.bestScore, b.bestScore),
  };
}

/**
 * Union two daily histories BY DATE, then sort by the key (N-DAILY-02 / D-14).
 *
 * A union, not a per-field max: two sides can hold entries for dates the other has
 * never seen, and dropping either side's dates would break a streak that really was
 * played. Where both sides carry the same date, `incoming` wins — it is the
 * freshly-hydrated disk state, and D-06 makes a date's result write-once anyway, so the
 * two can only differ if one of them is stale or tampered.
 *
 * The sort is lexicographic on the key and that is chronological ON PURPOSE: the key is
 * ISO-8601 local `YYYY-MM-DD` (`src/services/daily` `localDateKey`), zero-padded to a
 * fixed width, which is the whole reason D-14's streak walk needs no date parsing.
 *
 * D-16's two scalars are not here yet. When plan 12-03 adds them this function gains
 * the max-vs-sum reconcile its blocking checkpoint decides — `longestStreak` is a max
 * and `totalDaysPlayed` is a count, and this record will be the first structure in the
 * blob needing both in one object.
 */
function mergeDailyRecords(a: DailyRecord, b: DailyRecord): DailyRecord {
  const byDate = new Map<string, DailyHistoryEntry>();
  for (const e of a.history) {
    byDate.set(e.date, { ...e });
  }
  for (const e of b.history) {
    byDate.set(e.date, { ...e });
  }
  const history = [...byDate.values()].sort((x, y) =>
    x.date < y.date ? -1 : x.date > y.date ? 1 : 0,
  );
  return { history };
}

/** Merge two telemetry blobs (memory ↔ freshly-hydrated disk). */
export function mergeTelemetryBlobs(
  memory: TelemetryBlob,
  incoming: TelemetryBlob,
): TelemetryBlob {
  const recentRuns = [...memory.recentRuns, ...incoming.recentRuns]
    .map((e) => ({ ...e }))
    .sort((x, y) => x.timestamp - y.timestamp)
    .slice(-RECENT_RUNS_BOUND);

  return {
    lifetime: mergeAggregates(memory.lifetime, incoming.lifetime),
    byMode: {
      campaign: mergeAggregateMaps(
        memory.byMode.campaign,
        incoming.byMode.campaign,
      ),
      endless: mergeAggregateMaps(memory.byMode.endless, incoming.byMode.endless),
      daily: mergeAggregateMaps(memory.byMode.daily, incoming.byMode.daily),
    },
    endless: mergeEndlessRecords(memory.endless, incoming.endless),
    daily: mergeDailyRecords(memory.daily, incoming.daily),
    recentRuns,
  };
}
