/**
 * Fail-soft parse of AsyncStorage personal-best / progress JSON (T-06-01 / F-26 / N-PROG).
 * Distinguishes absent vs corrupt so callers never treat garbage as best=0.
 */

import type { LevelId } from '../../core';
// Services may import services: the stored date key is validated by the very predicate
// that lives beside the derivation which MINTS it (`src/services/daily`), rather than by a
// second opinion restated here that could drift from it (T-12-15 / D-15).
import { isValidDateKey } from '../daily';
// Same edge, same reason, one module over: the stored achievement id is validated by the
// predicate that lives beside the catalog which MINTS it (`src/services/achievements`).
// The parser must NOT restate that closed set — a catalog change would leave a stale copy
// here, accepting an id the catalog had dropped and rejecting one it had gained, with
// nothing to say so (D-15 / T-13-01).
import { isKnownAchievementId } from '../achievements';
import { PLAYABLE_LEVEL_ORDER } from './catalog';
import {
  ACHIEVEMENT_UNLOCK_BOUND,
  AGGREGATE_MAP_BOUND,
  DAILY_HISTORY_BOUND,
  RECENT_RUNS_BOUND,
  RUN_LOG_LEVEL_ID_MAX,
  defaultAchievementRecord,
  defaultDailyRecord,
  defaultProgressBlob,
  defaultProgressBlobV3,
  defaultEndlessRecord,
  defaultTelemetryAggregate,
  defaultTelemetryBlob,
  type AchievementRecord,
  type AchievementUnlock,
  type DailyHistoryEntry,
  type DailyRecord,
  type EndlessRecord,
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

function sanitizeEndlessRecord(raw: unknown): EndlessRecord {
  const out = defaultEndlessRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(out) as (keyof EndlessRecord)[]) {
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
  // Bounded at BOTH ends (T-09-A2). The lower bound was always here; the upper one was
  // not, so a hand-edited blob could store a 4 000-character id that survived to whatever
  // renders `recentRuns` — which is Phase 14's statistics screen, not anything shipped
  // today. See `RUN_LOG_LEVEL_ID_MAX` for why this is a length bound and not a membership
  // check: only one of the three modes stores a `LevelId` at all.
  if (
    typeof entry.levelId !== 'string' ||
    entry.levelId.length === 0 ||
    entry.levelId.length > RUN_LOG_LEVEL_ID_MAX
  ) {
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

/**
 * The two outcomes that CLOSE a date. Deliberately not `RunOutcome`: an `abandoned` run
 * accumulates telemetry (D-09) but does not close the date (D-07), so it can never
 * legitimately reach this history at all.
 */
const DAILY_OUTCOME_SET = new Set<string>(['win', 'lose']);

/**
 * One stored daily result, or `null` when any field fails (T-12-15).
 *
 * Same shape and same contract as `sanitizeRunLogEntry` above: validate each field against
 * a closed set, return nothing on any failure, and let the caller SKIP the entry. Dropping
 * rather than repairing is what `12-UI-SPEC.md` § Storage-failure asks for — an entry that
 * cannot be read means "this date has no stored result", which is the PLAYABLE direction.
 * The cost is named and accepted there in writing: a transient read failure can hand a
 * player a second attempt at the day, whereas treating unreadable as CLOSED would lock a
 * player out of their day on a transient fault, which is strictly worse.
 *
 * The date is validated by `isValidDateKey` from `src/services/daily` — integer range
 * checks with no parse round trip, living beside the derivation it guards. This is the
 * ASVS V5 control for the daily phase: AsyncStorage is plaintext, so on a rooted device the
 * blob is fully attacker-controllable and is the only externally-influenced input the phase
 * has. `12-UI-SPEC.md` renders the stored key VERBATIM with no formatting step, so a
 * 4 000-character `date` would otherwise reach a `Text` inside a 320px panel.
 */
function sanitizeDailyHistoryEntry(raw: unknown): DailyHistoryEntry | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as { date?: unknown; score?: unknown; outcome?: unknown };
  if (!isValidDateKey(entry.date)) {
    return null;
  }
  if (typeof entry.outcome !== 'string' || !DAILY_OUTCOME_SET.has(entry.outcome)) {
    return null;
  }
  return {
    date: entry.date,
    score: safeCounter(entry.score),
    outcome: entry.outcome as 'win' | 'lose',
  };
}

/**
 * The start of the run in progress, or `''` — always in the UNDER-reporting direction.
 *
 * `currentStreakStart` is the one member of this record that can INFLATE a lifetime number:
 * the current streak is a calendar walk from the newest stored date back to this key, so a
 * hostile `0001-01-01` would claim two millennia of daily play. Every rejection here
 * therefore falls back to `''`, which carries nothing and leaves the streak to whatever the
 * stored window can derive on its own — short, and never longer than the truth. Same
 * direction `resolveStreakStart` and `DAILY_STREAK_WALK_CAP` chose in `telemetry.ts`, for
 * the same reason: a lifetime achievement invented out of a tampered blob is a worse
 * failure than one that stopped growing.
 *
 * Three rejections:
 *  1. Not a well-formed, in-range key — the same `isValidDateKey` fence the history uses.
 *  2. No surviving stored dates — there is no run in progress for a start to name.
 *  3. Later than the newest surviving date — a run cannot start after its own newest proven
 *     date. Mirrors `resolveStreakStart`'s rule 4 rather than inventing a second opinion.
 *
 * Deliberately NOT rejected: a start OLDER than the oldest surviving date. That is the whole
 * reason the field is stored rather than derived (D-16 as amended at plan 12-03's decision
 * checkpoint) — the window is bounded at `DAILY_HISTORY_BOUND`, so a run longer than the
 * window can only be expressed by a key reaching back past it. The walk-cap fence for a
 * start reaching absurdly far belongs to `telemetry.ts`, which is where the walk lives; this
 * body's obligation is shape and ordering.
 *
 * Also deliberately NOT rejected here: a start claiming a run longer than the record's own
 * `totalDaysPlayed` — the review finding CR-01 defect. The bound is real and it is enforced,
 * but it lives in ONE place and that place is `carriedStartIsCredible` in `telemetry.ts`,
 * not here. Reason: this function only ever sees a record crossing the PARSE boundary,
 * whereas the number the bound protects (`longestStreak`, one-way under D-16) is raised by
 * `mergeDailyRecord` over a record held in memory that never re-enters this parser. A rule
 * stated at the boundary alone would not govern the write that makes the damage permanent;
 * a rule stated in both places is a rule that drifts. So the boundary keeps shape and
 * ordering, and the walk keeps length.
 *
 * The newest key is taken as a MAXIMUM rather than as the last element, because a tampered
 * blob need not be sorted and this predicate must not depend on an order it cannot trust.
 */
function sanitizeStreakStart(raw: unknown, history: readonly DailyHistoryEntry[]): string {
  if (!isValidDateKey(raw) || history.length === 0) {
    return '';
  }
  let newest = '';
  for (const entry of history) {
    if (entry.date > newest) {
      newest = entry.date;
    }
  }
  return raw <= newest ? raw : '';
}

/**
 * Validate the daily record INDEPENDENTLY of its siblings (N-DAILY-02 / N-DAILY-03 / SC-5),
 * on exactly the terms the endless record above is validated on.
 *
 * **Shape** copies `sanitizeEndlessRecord`: start from `defaultDailyRecord()`, copy only the
 * keys the default declares, and coerce each field on its own — so a broken `longestStreak`
 * cannot discard a good history, and an existing v4 blob written before this record existed
 * defaults cleanly with no `v` bump and no migration. The independence contract stated for
 * `telemetry` at `sanitizeTelemetry` below is inherited here verbatim, one level down.
 *
 * **Bound on read** copies the recent-run ring's trim, and is applied AFTER invalid entries
 * are dropped — never before. Trimming first would let padding garbage push real dates out
 * of the window, which is the opposite of what the bound exists for. The write-side bound
 * (`mergeDailyRecord`, D-15) is what the decision asks for; this one is what makes it hold
 * against a blob written by an older build or edited on a rooted device.
 *
 * The surviving history is NOT re-sorted and NOT de-duplicated. `mergeDailyRecord` sorts on
 * write, so out-of-order entries are evidence of tampering; the streak walk simply ends
 * early on them, which under-reports. Sorting here would REPAIR a tampered blob into a
 * longer streak than its own stored order can justify — an inflation, in the one direction
 * this phase refuses.
 */
function sanitizeDailyRecord(raw: unknown): DailyRecord {
  const out = defaultDailyRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const record = raw as {
    history?: unknown;
    longestStreak?: unknown;
    totalDaysPlayed?: unknown;
    currentStreakStart?: unknown;
  };
  out.longestStreak = safeCounter(record.longestStreak);
  out.totalDaysPlayed = safeCounter(record.totalDaysPlayed);
  if (Array.isArray(record.history)) {
    const entries: DailyHistoryEntry[] = [];
    for (const item of record.history) {
      const entry = sanitizeDailyHistoryEntry(item);
      if (entry != null) {
        entries.push(entry);
      }
    }
    // Bound on read as well as on write — a tampered blob cannot grow the window.
    out.history = entries.slice(-DAILY_HISTORY_BOUND);
  }
  out.currentStreakStart = sanitizeStreakStart(record.currentStreakStart, out.history);
  return out;
}

/**
 * One stored unlock, or `null` when the ID fails (D-15 / D-21 / T-13-01).
 *
 * The id is validated by `isKnownAchievementId` from `src/services/achievements`, imported
 * across the module boundary exactly as `isValidDateKey` is imported from `'../daily'`
 * above and for the identical reason: the predicate lives beside the derivation that MINTS
 * the ids, so the parser cannot hold a stale copy of a closed set it does not own. An id is
 * never coerced — an id is not a counter and there is no nearest valid id.
 *
 * This is the read-side half of the control the host carries on the write side. Together
 * they mean no string the catalog has never minted can reach a rendered `Text`: AsyncStorage
 * is plaintext, so on a rooted device this field is fully attacker-controllable, and a
 * 4 000-character `id` would otherwise arrive at Phase 14's Achievements screen.
 *
 * ## The timestamp takes a DIFFERENT failure rule from the id, and that pair has no
 * precedent in this file
 *
 * `sanitizeRunLogEntry` above DROPS the whole entry when its `timestamp` is not a finite
 * number, and `sanitizeDailyHistoryEntry` has no timestamp at all — so the shipped
 * drop-on-invalid rule is the WRONG analog here, and it is the one a later reader will reach
 * for. D-15 says a malformed timestamp DEFAULTS and D-17 makes an unlock one-way: dropping
 * the entry would **un-earn an achievement the player did earn**, which is the one thing
 * this phase forbids. Degrading the timestamp costs a sort order (D-14's recency order,
 * which only Phase 14 reads); degrading the id costs the achievement itself.
 *
 * So inside this one entry sanitizer: a bad id DROPS the entry, and a bad `at` takes this
 * file's local `safeCounter` zero and KEEPS it. There is no in-repo precedent for two rules
 * in one entry sanitizer, so the reason is written here rather than left to be inferred — a
 * later reader who unifies them will do it silently, and the unification un-earns
 * achievements on every corrupt clock read.
 *
 * `safeCounter` is the one LOCAL to this file (`raw: unknown`), not the same-named
 * `safeCounter(n: number)` in `telemetry.ts`. Two functions, one name, two files.
 */
function sanitizeAchievementUnlock(raw: unknown): AchievementUnlock | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as { id?: unknown; at?: unknown };
  if (!isKnownAchievementId(entry.id)) {
    return null;
  }
  return { id: entry.id, at: safeCounter(entry.at) };
}

/**
 * Validate the achievements record INDEPENDENTLY of its siblings (N-ACH-02 / D-13 / D-15),
 * on exactly the terms `sanitizeDailyRecord` above is validated on.
 *
 * **Shape** copies it: start from `defaultAchievementRecord()`, return that unchanged on any
 * structural failure, and never let a broken field reach a sibling. Because `out` starts
 * from the default and `sanitizeTelemetry` assigns field by field, a v4 blob written before
 * this record existed defaults cleanly — no `PROGRESS_VERSION` bump and no migration (D-13),
 * exactly as the endless record needed none when it was added and the daily record after it.
 *
 * Three steps, IN THIS ORDER, and the order is contract:
 *
 *  1. **Drop** per entry — an unknown id is gone, a malformed timestamp is zeroed (D-21).
 *  2. **De-duplicate** by id, keeping the EARLIEST `at`.
 *  3. **Bound**, after both.
 *
 * **Why the bound comes last.** The daily record's own comment applies verbatim: trimming
 * first would let padding garbage push real unlocks out of the window, which is the opposite
 * of what the bound exists for. `mergeAchievementUnlocks` (`telemetry.ts`) holds the write
 * side; this is what makes it hold against a blob written by an older build or edited on a
 * rooted device.
 *
 * **Why the bound keeps the FIRST entries and not the last.** `slice(0, …)` matches
 * `mergeAchievementUnlocks` and `mergeAchievementRecords`, both of which state the reason:
 * the recent-run ring keeps the NEWEST because it is a window on recent activity, whereas an
 * unlock is permanent under D-17 and dropping the oldest would un-earn the achievements the
 * player has held longest. All three sites therefore trim in the same direction. (The plan
 * for this task wrote `slice(-…)`; that is the ring's direction and it contradicts the two
 * shipped sites — see this plan's SUMMARY.)
 *
 * **Why de-duplication is legitimate here where re-sorting is NOT legitimate for dates.**
 * `sanitizeDailyRecord` refuses to re-sort because sorting would REPAIR a tampered blob into
 * a longer streak than its own stored order can justify. There is no equivalent inflation
 * here: an unlock set is unordered, D-14's timestamps are the recency key rather than a
 * position, and `13-UI-SPEC.md` makes CATALOG DECLARATION ORDER the display order, derived
 * in the host and not in storage. So there is no stored order to inflate. Earliest-wins is
 * required for the same reason D-22 requires it in the merge: a later duplicate walking the
 * timestamp forward destroys exactly the order D-14 stores it for.
 *
 * The de-duplication is also why step 3 is structurally unreachable while step 1 stands — a
 * legitimate set cannot exceed the catalog's size — and that is precisely what the bound is
 * for. See the note at the `slice` below.
 */
function sanitizeAchievementRecord(raw: unknown): AchievementRecord {
  const out = defaultAchievementRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const record = raw as { unlocked?: unknown };
  if (!Array.isArray(record.unlocked)) {
    return out;
  }
  const byId = new Map<string, AchievementUnlock>();
  for (const item of record.unlocked) {
    const entry = sanitizeAchievementUnlock(item);
    if (entry == null) {
      continue;
    }
    const prior = byId.get(entry.id);
    // Earliest wins (D-22). Whole `{ id, at }` entries are keyed and merged as units —
    // never two parallel collections, and never a reduce across ALL the timestamps, which
    // would attach one entry's evidence to another's claim.
    if (prior == null || entry.at < prior.at) {
      byId.set(entry.id, entry);
    }
  }
  // Bound on read as well as on write — a tampered blob cannot grow the collection —
  // applied AFTER the drop loop, never before.
  //
  // The trap this bound is measured against lives in this same file: `sanitizeAggregateMap`
  // below has NO key cap and copies every key it finds on every parse. WINDOWS #27 records
  // 5 000 injected keys surviving `parseProgressResult` with `status: 'ok'`. This collection
  // avoids that shape only because it is a bounded ARRAY whose ids are validated — the
  // pattern map's rule is that it must have the bound or the id check and must not have
  // neither. If a later change relaxes the unknown-id drop "to be forward-compatible with a
  // later catalog", this line is the only remaining cap and must stay.
  out.unlocked = [...byId.values()].slice(0, ACHIEVEMENT_UNLOCK_BOUND);
  return out;
}

function sanitizeAggregateMap(
  raw: unknown,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  // Bounded on READ (WINDOWS #27 / T-09-A1), and the bound is applied to the SURVIVING
  // keys — after the non-object drop below, never to `Object.keys(map)` before it, so
  // padding garbage cannot push a real level's aggregate out of the window. Same
  // drop-then-trim order, for the same reason, as `sanitizeAchievementRecord` above.
  //
  // This function does not merely copy, it EXPANDS: `sanitizeAggregate` turns a stored
  // `{}` into a full sixteen-field aggregate. Measured before the bound existed: 20 000
  // empty cells at 229KB stored parsed to 5.79MB, a 25x inflation, all keys surviving at
  // `status: 'ok'`. See `AGGREGATE_MAP_BOUND` for why 64 cannot cost a real player
  // anything — every legitimate key comes from a five-member or one-member domain.
  let kept = 0;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry == null || typeof entry !== 'object') {
      continue;
    }
    if (kept >= AGGREGATE_MAP_BOUND) {
      break;
    }
    out[key] = sanitizeAggregate(entry);
    kept += 1;
  }
  return out;
}

/**
 * Validate `telemetry` INDEPENDENTLY of its sibling progress fields (Pitfall 4 /
 * roadmap SC-4): any structural failure here degrades telemetry alone to defaults
 * and must never make the enclosing blob read as `corrupt`. Partial telemetry keeps
 * every field it does have.
 *
 * That independence is also the whole reason the endless record (`endless`,
 * N-END-02) lives in here rather than on `ProgressBlob`: a corrupt or hand-edited
 * endless best degrades to `defaultEndlessRecord()` and cannot take `unlocked`,
 * `bestByLevel` or `bestScore` down with it (roadmap SC-3). Each of its fields
 * degrades on its own too — a broken `bestWave` does not discard a good
 * `bestScore`. Because `out` starts from `defaultTelemetryBlob()`, a v4 blob
 * written before the record existed defaults cleanly: no `v` bump, no migration.
 *
 * The daily record (`daily`, N-DAILY-02) is here for the same reason and on the same
 * terms, and that is the whole of SC-5's read half: a corrupt or hand-edited daily
 * history degrades to `defaultDailyRecord()` and cannot take campaign unlocks, bests,
 * stars or the endless record down with it. It carries two obligations the endless
 * record does not — every stored date key is validated on read (`isValidDateKey`,
 * T-12-15) and the history is bounded on read as well as on write (D-15, T-12-16) —
 * both discharged by `sanitizeDailyRecord` above.
 *
 * The achievements record (`achievements`, N-ACH-02) is here on the same terms and is the
 * whole of SC-3's read half: a corrupt or hand-edited unlock set degrades to
 * `defaultAchievementRecord()` and cannot take campaign unlocks, bests, stars, the endless
 * record or the daily history down with it. Because `out` starts from
 * `defaultTelemetryBlob()`, an older v4 blob that predates the field defaults it cleanly —
 * no `v` bump, no migration (D-13). It carries two obligations the daily record does not,
 * both discharged by `sanitizeAchievementRecord` above: every stored id is validated against
 * the CATALOG on read (`isKnownAchievementId`, T-13-01), so an id the catalog has never
 * minted cannot reach the host let alone a rendered `Text`; and the timestamp DEGRADES where
 * the id DROPS (D-21), because D-17 makes an unlock one-way and dropping an entry over a
 * malformed clock read would un-earn an achievement the player did earn.
 */
function sanitizeTelemetry(raw: unknown): TelemetryBlob {
  const out = defaultTelemetryBlob();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const telemetry = raw as {
    lifetime?: unknown;
    byMode?: unknown;
    endless?: unknown;
    daily?: unknown;
    achievements?: unknown;
    recentRuns?: unknown;
  };
  out.lifetime = sanitizeAggregate(telemetry.lifetime);
  out.endless = sanitizeEndlessRecord(telemetry.endless);
  out.daily = sanitizeDailyRecord(telemetry.daily);
  out.achievements = sanitizeAchievementRecord(telemetry.achievements);
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
