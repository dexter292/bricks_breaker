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
import { isValidDateKey, previousDateKey, streakFrom } from '../daily';
import {
  DAILY_HISTORY_BOUND,
  DAILY_STREAK_WALK_CAP,
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
    daily: {
      history: t.daily.history.map((e) => ({ ...e })),
      longestStreak: t.daily.longestStreak,
      totalDaysPlayed: t.daily.totalDaysPlayed,
      currentStreakStart: t.daily.currentStreakStart,
    },
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
 * The history is bounded on write by `DAILY_HISTORY_BOUND` (D-15), in the one-line shape
 * the recent-run ring already uses. The three D-16 values are maintained here and are
 * NEVER recomputed from the trimmed window — see `resolveStreakStart` below for the one
 * rule that makes that safe rather than merely asserted.
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
  // Keep the array sorted: every D-16 derivation below is a walk over a sorted key array
  // (`src/services/daily/streak.ts`), and an out-of-order arrival would shorten a streak
  // silently rather than loudly. Runs normally arrive in date order, so this is a fence,
  // not a hot path.
  history.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));

  const keys = history.map((e) => e.date);
  // Incremented only on a date's FIRST close, which is what makes a repeated write
  // idempotent (D-06 / A-01). Hoisted above the streak derivation because
  // `resolveStreakStart` bounds a carried start by this count and must see the count that
  // INCLUDES the date being closed right now — otherwise the 450th consecutive close would
  // have its own legitimate 450-day start rejected by a bound of 449.
  const totalDaysPlayed = safeCounter(next.daily.totalDaysPlayed) + (at >= 0 ? 0 : 1);
  // The admissibility question is asked about the record being WRITTEN, handed over as one
  // object. There is no arrangement of arguments available here that could hold this claim
  // to some other record's window or counter — that is the whole of the shape fix; see
  // `carriedStartIsCredible`.
  //
  // `history` is deliberately the UNTRIMMED array. The run start is derived from it, and
  // trimming first would move that start one day forward on the close that crosses the
  // bound — a visible discontinuity in the streak exactly at `DAILY_HISTORY_BOUND`.
  const pending: DailyRecord = {
    history,
    longestStreak: safeCounter(next.daily.longestStreak),
    totalDaysPlayed,
    currentStreakStart: next.daily.currentStreakStart,
  };
  const currentStreakStart = resolveStreakStart(pending);
  const currentStreak = streakLengthFrom(keys, currentStreakStart);

  next.daily = {
    // Bound on write (D-15), same one-line shape as the recent-run ring below.
    history: history.slice(-DAILY_HISTORY_BOUND),
    // A running max that never falls — breaking a streak restarts the run, it does not
    // lower the lifetime best.
    // The one-way scalar (D-16). It can only ever be raised from `currentStreak`, which is
    // derived from `currentStreakStart` above — so the bound in `carriedStartIsCredible` is
    // what keeps a bare claim out of a number no later release can repair.
    longestStreak: Math.max(safeCounter(next.daily.longestStreak), currentStreak),
    totalDaysPlayed,
    currentStreakStart,
  };
  return next;
}

/**
 * A run start DERIVED from stored dates, as opposed to one a record merely CLAIMS.
 *
 * Nominal on purpose, and the reason is the fifth leak of D-16's one rule. A carried claim
 * is admissible only if it beats a floor that stored dates actually prove, and the two
 * values are both `YYYY-MM-DD` strings — so nothing but a convention stopped a call site
 * passing a claim where the floor belongs, which would admit every claim. `runStartInWindow`
 * is the only producer of this type, so that mistake is now a compile error.
 */
type DerivedStart = string & { readonly __derivedFromStoredDates: unique symbol };

/** A record's OWN stored date keys, in stored order. Never re-sorted — see `sanitizeStreakStart`. */
function dateKeysOf(record: DailyRecord): readonly string[] {
  return record.history.map((e) => e.date);
}

/**
 * The oldest key of the consecutive run ending at the newest stored key, and whether that
 * walk ran out of window rather than meeting a real gap.
 *
 * `floored: false` means the window CONTAINS the gap that started the current run, so the
 * run's start is exactly derivable from stored dates and nothing carried can override it.
 * `floored: true` means the window is consecutive end to end: the run may reach back
 * further than anything stored, and the window is silent on how much further.
 */
function runStartInWindow(sortedKeys: readonly string[]): {
  start: DerivedStart;
  floored: boolean;
} {
  if (sortedKeys.length === 0) {
    return { start: '' as DerivedStart, floored: false };
  }
  const n = streakFrom(sortedKeys);
  return {
    start: sortedKeys[sortedKeys.length - n]! as DerivedStart,
    floored: n === sortedKeys.length,
  };
}

/**
 * Days from `start` to `end` inclusive by calendar walk, or 0 if `start` is not reachable
 * within `DAILY_STREAK_WALK_CAP`.
 *
 * Calendar arithmetic, never duration arithmetic — `previousDateKey` steps the day field
 * through the local-field `Date` constructor, so a 23- or 25-hour DST day counts as one
 * day like every other. Subtracting timestamps would not.
 *
 * Returning 0 on exceeding the cap is the tamper signal, and callers treat it as "this
 * start is not credible" rather than as a length. See `DAILY_STREAK_WALK_CAP` for why
 * discarding beats saturating.
 */
function inclusiveDaySpan(start: string, end: string): number {
  let cursor = end;
  let days = 1;
  while (cursor !== start) {
    if (days >= DAILY_STREAK_WALK_CAP) {
      return 0;
    }
    cursor = previousDateKey(cursor);
    days++;
  }
  return days;
}

/**
 * Is a CARRIED start credible against the record that carries it?
 *
 * ## The shape, and why it is the shape (the fifth leak)
 *
 * **The claimant arrives as ONE `DailyRecord`, and the only other argument is a
 * `DerivedStart` that only `runStartInWindow` can mint.** That is not a style choice; it is
 * the fix for the fifth escape of this rule. The predicate used to take the window keys,
 * the day counter and the claimed start as three loose strings-and-numbers, and
 * `reconcileStreakStart` — reconciling two devices — passed the UNIONED keys for both
 * records while passing each record's own counter. A record with two stored dates therefore
 * borrowed its partner's saturated window to clear question 3, then cleared question 4 with
 * its own inflated counter: each guard defeated by a different side. MEASURED on the shipped
 * code: a legitimate 450-day copy A merged with a 2-date copy B carrying
 * `totalDaysPlayed: 3000` and a start of `2020-01-01` read `Streak · 2709`, where A alone
 * reads 450 and B alone reads 2.
 *
 * Four earlier patches of this same rule were each a correct new condition at a new site
 * (write, read, sanitize, the bound itself). The fifth is not another condition: **a record's
 * window, counter and claim can no longer be separated at a call site, so no call site can
 * cross them.** The evidence and the claim travel as one object or not at all. Everything
 * below is asked of `claimant` and of nothing else, and `scripts/assert-streak-evidence.mjs`
 * fails the build if a future edit reintroduces a second evidence source.
 *
 * The floor is the one value that legitimately comes from the surrounding context — the
 * merge asks about the UNIONED history, which is what the merged record's dates will be.
 * That direction is safe and deliberate: a floored union spans at least every date each side
 * holds, so its derived start is never LATER than a side's own, and a floor moving earlier
 * can only reject claims, never admit them. It is branded so that the one catastrophic
 * mis-call — handing a carried claim in as its own floor — cannot be written.
 *
 * ## The rule
 *
 * **This is the single home of the carried-start admissibility rule.** Both
 * `resolveStreakStart` (which serves the write path via `mergeDailyRecord` and the read
 * path via `currentDailyStreak`) and `reconcileStreakStart` (which serves the two-device
 * merge) ask this one predicate, and nothing else restates it. `parseBlob.ts`'s
 * `sanitizeStreakStart` deliberately does NOT repeat it — see the note there for why the
 * parse boundary is the wrong place: a record assembled in memory never re-enters the
 * parser, so a rule stated only at the boundary would not govern the write that makes
 * `longestStreak` permanent. One rule, one place.
 *
 * Four questions, all of which a carried key must answer:
 *  1. Well-formed and in range (`isValidDateKey` — integer checks, no parse round trip).
 *  2. Strictly older than the derived start. A carried value that is not older carries
 *     nothing stored dates do not already prove.
 *  3. **The claimant's OWN window** is SATURATED at `DAILY_HISTORY_BOUND`, so trimming is
 *     available to explain the days that window does not hold. Not the union's, not a
 *     partner's — see the shape note above; asking this of anything but the claimant is
 *     exactly the defect that shape exists to prevent.
 *  4. Reachable from **the claimant's own newest stored date** within
 *     `DAILY_STREAK_WALK_CAP`, **and within the claimant's own `totalDaysPlayed`**.
 *
 * ## Question 3 — the saturation gate
 *
 * Question 4 alone was not enough, and the reason is that `totalDaysPlayed` is itself a
 * carried claim with nothing behind it. `sanitizeDailyRecord` copies it WHOLE through
 * `safeCounter` — a non-negative-integer coercion — while `sanitizeDailyHistoryEntry` drops
 * history ENTRY BY ENTRY, so the number doing the bounding shrinks no faster than the claim
 * it bounds. MEASURED on the code that had only question 4: three stored dates beside
 * `totalDaysPlayed: 3000` and a carried `2020-01-01` read `Streak · 2463`, and the next
 * close persisted `longestStreak: 2464` — CR-01's own numbers, reached by raising the
 * counter instead of the date. Reproduced end to end through `parseProgressResult` with 100
 * entries dropped by the sanitizer: `status: ok`, 2463, 2464.
 *
 * The bound therefore cannot rest on a self-reported counter alone, and it equally cannot be
 * `history.length`: a genuine 450-day player holds 450 in `totalDaysPlayed` against a
 * 400-entry window, and clamping to the surviving count would read `Streak · 400` for
 * exactly the player D-16 was re-opened to serve.
 *
 * What distinguishes them is STRUCTURAL rather than self-reported: **whether the window is
 * full.** A record's window only ever shrinks below `DAILY_HISTORY_BOUND` by not having
 * reached it — `mergeDailyRecord` trims with `slice(-DAILY_HISTORY_BOUND)`, which yields
 * either the whole history or exactly the bound, and `mergeDailyRecords` unions before it
 * trims, so it can never return fewer keys than the larger side brought. A sub-saturated
 * window is therefore a window that has never been trimmed, which makes the dates it holds
 * the WHOLE of the record's evidence, and a start older than its oldest key has nothing
 * left to explain the gap. A saturated window has been trimmed or is about to be, so a start
 * reaching back past it is credible and `totalDaysPlayed` bounds how far — question 4,
 * unchanged.
 *
 * The one legitimate record this refuses is a formerly-saturated window DAMAGED at its
 * oldest end, which the record cannot distinguish from a short one. MEASURED: a 450-day
 * player who loses one entry off the oldest end of a 400-key window reads 399 instead of
 * 450. That is an under-report, which is the direction every other fence in this phase
 * degrades in — `sanitizeStreakStart` refuses to sort a tampered blob because sorting would
 * lengthen a streak, `resolveStreakStart` falls back to the derived start on every discard,
 * and `longestStreak` is one-way (D-16) and repairable only by a migration. Reading 399 for
 * a 450-day player costs that player a badge until their next close; reading 2463 for a
 * 3-day one writes 2464 into storage forever.
 *
 * Question 4's length bound is the whole of the fix for review finding CR-01. Every date
 * increments `totalDaysPlayed` on its FIRST close (`mergeDailyRecord`) and a streak counts
 * closed dates, so `currentStreak <= totalDaysPlayed` is an invariant of every
 * legitimately-written record — the bound needs no new field, no migration and no second
 * source of truth. It is needed because the carried start is the one member of this record
 * with no stored evidence behind it: `sanitizeDailyHistoryEntry` drops history ENTRY BY
 * ENTRY while `currentStreakStart` survives WHOLE, so any rejection — tampering, a
 * truncated write, a field an older build never wrote — shrinks the evidence without
 * shrinking the claim, and a consecutive floored remainder is exactly the condition the
 * carried start was designed to be trusted on. MEASURED on the shipped code before this
 * bound: two stored dates with `totalDaysPlayed: 2` beside a carried `2020-01-01` read as
 * `Streak · 2463`, and the next close persisted `longestStreak: 2464`, which is one-way
 * (D-16) and repairable only by a migration.
 *
 * The bound can only ever UNDER-report, which is the direction this phase chooses at every
 * other site. `mergeDailyRecords`' documented lossy topology under-counts `totalDaysPlayed`
 * and never over-counts, so a reconciled record can only make this bite EARLIER, and
 * biting means falling back to the window-derived start. The legitimate case D-16 exists to
 * serve is untouched: a player on a genuine 450-day run carries `totalDaysPlayed: 450`, so
 * a start 450 days back is admitted even though only `DAILY_HISTORY_BOUND` dates survive
 * the window.
 *
 * The window-DERIVED start is deliberately NOT subject to this bound. It is backed by dates
 * actually present in the record, whereas a carried start is a bare claim; clamping the
 * derived value too would read `Streak · 0` off any older blob that has real history but
 * never wrote a `totalDaysPlayed`.
 */
function carriedStartIsCredible(claimant: DailyRecord, derivedStart: DerivedStart): boolean {
  const candidate = claimant.currentStreakStart;
  if (!isValidDateKey(candidate) || candidate >= derivedStart) {
    return false;
  }
  // The saturation gate. Asked before the walk because it is the cheaper question and
  // because it is the one that does not depend on a number the record supplied about itself.
  const ownKeys = dateKeysOf(claimant);
  if (ownKeys.length < DAILY_HISTORY_BOUND) {
    return false;
  }
  const span = inclusiveDaySpan(candidate, ownKeys[ownKeys.length - 1]!);
  return span > 0 && span <= safeCounter(claimant.totalDaysPlayed);
}

/**
 * The start of the run in progress: derived from stored dates wherever they can say, and
 * carried forward only where they cannot. **This is the whole self-correction contract.**
 *
 * In order:
 *  1. No stored dates — no run, `''`.
 *  2. The window contains a gap — the start is EXACTLY derivable, so the derived value
 *     wins and any stored value is discarded, tampered or merely stale.
 *  3. The stored value fails `carriedStartIsCredible` — malformed, not older than the
 *     derived start, reaching back past a window that was never full enough to have been
 *     trimmed, unreachable within the walk cap, or claiming a run longer than the record's
 *     own `totalDaysPlayed`. Discard it. That predicate is the ONLY statement of the rule;
 *     do not restate any part of it here, and do not take its inputs apart — it is handed
 *     the whole record precisely so that no caller can choose which record each input
 *     comes from.
 *  4. Otherwise the window is consecutive end to end and cannot contradict the stored
 *     value, so carry it: this is the only path on which a streak longer than
 *     `DAILY_HISTORY_BOUND` survives, and it is exactly what D-16 exists to protect.
 *
 * Every discard path falls back to the window-derived start, which UNDER-reports the
 * streak and never inflates it. That direction is deliberate: a lifetime best invented
 * out of a tampered blob is a worse failure than one that stopped growing.
 *
 * `record.totalDaysPlayed` must be the count AFTER the date being written is counted — see
 * the `pending` record in `mergeDailyRecord`. Passing the pre-increment count would reject
 * the legitimate carried start of a player closing the newest day of their own longest run.
 *
 * Takes the whole record rather than its parts: the window, the counter and the claim are
 * all evidence ABOUT ONE RECORD, so a signature that let a caller supply them separately is
 * a signature that lets a caller supply them from different records. That is how the rule
 * escaped a fifth time; see `carriedStartIsCredible`.
 */
function resolveStreakStart(record: DailyRecord): string {
  const { start, floored } = runStartInWindow(dateKeysOf(record));
  if (start === '' || !floored) {
    return start;
  }
  return carriedStartIsCredible(record, start) ? record.currentStreakStart : start;
}

/** The current run's length: the calendar span back to its start, or the derivable walk. */
function streakLengthFrom(sortedKeys: readonly string[], start: string): number {
  if (sortedKeys.length === 0 || start === '') {
    return 0;
  }
  const span = inclusiveDaySpan(start, sortedKeys[sortedKeys.length - 1]!);
  return span > 0 ? span : streakFrom(sortedKeys);
}

/**
 * The current daily streak of a STORED record — the read-side counterpart of the number
 * `mergeDailyRecord` computes on write, and deliberately the SAME derivation (12-05).
 *
 * **Why this exists rather than the panel calling `streakFrom` over the stored keys.**
 * `streakFrom` walks the TRIMMED window, so it saturates at `DAILY_HISTORY_BOUND`.
 * MEASURED against this module over 450 consecutive closes: the stored record reads
 * `longestStreak: 450` and `totalDaysPlayed: 450`, while `streakFrom` over the surviving
 * 400-key window returns **400**. A panel rendering that would state a streak the player
 * does not have, and — because the record badge fires on `streak === longestStreak` — it
 * would also stop congratulating a player who is, right now, on their best-ever run and
 * extending it every day. That is the very failure D-16 was re-opened at plan 12-03's
 * blocking checkpoint to eliminate, re-entering through the read side.
 *
 * One function, one answer: the write side's `longestStreak` and the read side's
 * `Streak · {n}` are now the same computation over the same inputs, so they cannot
 * disagree. The self-correction contract in `resolveStreakStart` applies unchanged —
 * every discard path falls back to the window-derived start, which under-reports and
 * never inflates.
 *
 * Note what this does NOT change: `endedStreakLength` (D-17) still walks the window and
 * still returns nothing at the floor. That omission is correct and is not the same
 * question — an ENDED run has no stored start to carry, so the window is genuinely all
 * the evidence there is.
 */
export function currentDailyStreak(record: DailyRecord): number {
  return streakLengthFrom(dateKeysOf(record), resolveStreakStart(record));
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
 * ## The D-16 reconcile contract (`max-and-union`, decided at plan 12-03's checkpoint)
 *
 * This record is the first structure in the blob needing a max AND a count in one object,
 * so the rule is stated here rather than read off an analog. `mergeEndlessRecords` is a
 * pure per-field maximum and is **not** the model for the count: a maximum over two
 * devices' counts loses every date the lower copy held exclusively, and a sum
 * double-counts every date both hold. The in-repo precedent for a type that both sums and
 * maxes is `mergeAggregates` in this file, whose sum-vs-max contract is stated in the
 * module header above.
 *
 *  - `longestStreak` is an "ever" field and takes the **maximum**.
 *  - `totalDaysPlayed` is a count and takes the maximum of the two carried scalars **and
 *    the size of the unioned history** — so it neither double-counts a date both copies
 *    hold nor drops one only a single copy holds. The union is computed right here, so
 *    there is no second pass.
 *  - `currentStreakStart` is a date and follows neither rule; see `reconcileStreakStart`.
 *
 * **This is NOT lossless, and must not be described as such.** One topology under-counts:
 * a copy whose history has been TRIMMED, reconciled against one holding dates exclusively
 * outside that window. Worked example — copy A has closed 500 dates but its window holds
 * the newest 400; copy B holds 10 dates A has never seen. The union sees 410, the carried
 * scalars are 500 and 10, so the rule reports 500 while the truth is 510: B's exclusive
 * dates are lost because A's window cannot vouch for them and A's scalar already exceeds
 * the union. The error is bounded by that exclusive-and-outside-the-window overlap, and it
 * is always in the under-reporting direction — the rule can never inflate past the truth.
 * `tests/daily.record.test.ts` asserts this topology rather than only describing it.
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
  const keys = history.map((e) => e.date);
  // The union size is taken BEFORE the bound below: trimming what we store must not lower
  // what we have counted, which is the whole of D-16.
  //
  // Deliberately NOT the bound `reconcileStreakStart` holds the carried claims to. Each
  // claim is held to the total of the record that CARRIED it — see the note there.
  const totalDaysPlayed = Math.max(
    safeCounter(a.totalDaysPlayed),
    safeCounter(b.totalDaysPlayed),
    keys.length,
  );
  // TWO questions, asked in order, because they are genuinely different questions and
  // collapsing them is what this rule keeps escaping through:
  //
  //  1. `reconcileStreakStart` — is a claim credible ABOUT THE COPY THAT MADE IT? That is
  //     each copy's own window, own counter, own claim, and it is what keeps a two-date
  //     copy's "on a run since 2020" out of the merge.
  //  2. `resolveStreakStart` — can the record we are about to WRITE account for the claim
  //     that survived? A copy that stopped syncing can be telling the truth about a run its
  //     partner never saw, and `totalDaysPlayed` under-counts on exactly that topology
  //     (accepted cost 5), so the merged record may be unable to support a true claim.
  //
  // Question 2 can only ever move the start LATER — it chooses between the surviving claim
  // and the union-derived start, and a claim is admitted only if it is strictly older — so
  // this composition is downward-only, and it is the SAME function the read path and the
  // write path use. It is not a sixth restatement of the rule; it is the rule being asked
  // once more, about the record it is now about to be written into.
  //
  // Without it the merge could store a start the record's own read path immediately
  // refuses, and that refusal is not free: the surviving claim DISPLACES the union-derived
  // start, which would have survived. MEASURED on a device that stopped syncing 150 days
  // into a 600-day run and then reconciled: storing the unsupportable claim reads 400,
  // asking this second question reads 550 (the union-derived run, every day of it backed by
  // a stored date). The truth is 600; both under-report, and 550 is the one backed by dates.
  //
  // `pending` deliberately carries the UNTRIMMED union for the same reason `mergeDailyRecord`
  // does: trimming first would throw away the very dates that prove the longer run.
  const pending: DailyRecord = {
    history,
    longestStreak: Math.max(safeCounter(a.longestStreak), safeCounter(b.longestStreak)),
    totalDaysPlayed,
    currentStreakStart: reconcileStreakStart(keys, a, b),
  };
  return {
    // Bound on merge as well as on write — reconciling two full windows must not produce
    // a longer one, exactly as the recent-run ring is re-bounded below.
    history: history.slice(-DAILY_HISTORY_BOUND),
    longestStreak: pending.longestStreak,
    totalDaysPlayed,
    currentStreakStart: resolveStreakStart(pending),
  };
}

/**
 * Reconcile two claimed run starts against the unioned history.
 *
 * `min(a, b)` on its own is WRONG: the earlier start is only meaningful if the union
 * actually supports an unbroken run from it, and two copies that disagree are exactly the
 * case where it may not. So the union is asked first, on the same principle as
 * `resolveStreakStart`: derived beats carried.
 *
 *  - If the unioned history contains a gap, the run start is exactly derivable from it and
 *    **both** stored claims are discarded — including the earlier one.
 *  - If the union is consecutive end to end it can contradict neither claim, so the
 *    EARLIEST admissible claim is carried. Admissible is exactly `carriedStartIsCredible`
 *    — the same predicate `resolveStreakStart` uses, and not restated here.
 *  - With no admissible claim, the derived start stands.
 *
 * ## The invariant this site exists to hold
 *
 * **A claim is evidence about the record that MADE it, so that record — and nothing else —
 * must be able to account for it.** The union decides the merged HISTORY. It is never
 * evidence for a claim that did not come from it.
 *
 * This has been got wrong twice here, each time by handing the predicate one record's
 * evidence beside another record's scalar:
 *
 *  - The merged total is `max(a, b, |union|)`, so asking both claims against it let one
 *    copy's large count vouch for the other's claim. MEASURED: copy A (2 dates,
 *    `totalDaysPlayed: 2`, carried `2020-01-01`) reads 2 alone, copy B (2 dates,
 *    `totalDaysPlayed: 3000`) reads 2 alone, and `mergeTelemetryBlobs(A, B)` read 2463.
 *  - Then this site passed the UNIONED keys for BOTH records while passing each record's own
 *    counter — so a sub-saturated claimant borrowed its partner's saturated window to clear
 *    the saturation question and its own inflated counter to clear the total question.
 *    MEASURED: a wholly legitimate 450-day copy A merged with that same copy B read
 *    `Streak · 2709`, and the next close would have persisted it into the one-way
 *    `longestStreak`.
 *
 * Both were a correct guard defeated by the wrong evidence reaching it. The fix is not a
 * third guard: `carriedStartIsCredible` now takes the claimant as ONE record and reads its
 * window, its counter and its claim off that object alone, so this loop has nothing left to
 * cross. The union is passed for the one thing it is actually for — deriving the floor, which
 * a floored union can only move EARLIER than either side's own and therefore can only reject.
 *
 * `scripts/assert-streak-evidence.mjs` fails the build if this loop regrows a second
 * evidence source, and `tests/daily.record.test.ts` states the invariant as a case.
 */
function reconcileStreakStart(
  unionKeys: readonly string[],
  a: DailyRecord,
  b: DailyRecord,
): string {
  const { start, floored } = runStartInWindow(unionKeys);
  if (start === '' || !floored) {
    return start;
  }
  const admissible = [a, b]
    .filter((record) => carriedStartIsCredible(record, start))
    .map((record) => record.currentStreakStart)
    .sort();
  return admissible[0] ?? start;
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
