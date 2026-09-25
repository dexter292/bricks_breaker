/**
 * Pure telemetry merge helpers for ProgressBlob v4 (N-STAT-02 / D-05…D-10).
 * No I/O — same `merge(prev, incoming) → next` shape as stars.ts / watermark.ts.
 *
 * Sum-vs-max is the contract: cumulative counters add, `*Ever` fields take a
 * running max. `bestComboEver` (brick hits without paddle contact, D-06) and
 * `longestRallyEver` (paddle hits without losing a life, D-10) are deliberately
 * DISTINCT fields — do not collapse them.
 */
import {
  RECENT_RUNS_BOUND,
  defaultTelemetryAggregate,
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
    recentRuns: t.recentRuns.map((e) => ({ ...e })),
  };
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
    recentRuns,
  };
}
