import type { LevelId } from '../../core';
import type {
  LevelBest,
  PersonalBestStore,
  ProgressBlob,
  ProgressStore,
  RecordRunEndArgs,
  RecordRunEndResult,
} from './types';
import {
  DAILY_TELEMETRY_KEY,
  ENDLESS_TELEMETRY_KEY,
  defaultProgressBlob,
} from './types';
import {
  cloneTelemetryBlob,
  markAchievementsUnseen,
  mergeAchievementUnlocks,
  mergeDailyRecord,
  mergeEndlessRecord,
  mergeRunIntoTelemetry,
} from './telemetry';
import { newlyUnlockedAchievements } from '../achievements';
import { computeStars, mergeLevelBest } from './stars';
import {
  unlockAfterClear as unlockAfterClearPure,
  isUnlocked as isUnlockedPure,
} from './unlock';

export function createMemoryPersonalBestStore(): PersonalBestStore {
  let bestScore = 0;
  return {
    async getBest(): Promise<number> {
      return bestScore;
    },
    async setBest(next: number): Promise<void> {
      const n = Math.floor(next);
      if (n > bestScore) {
        bestScore = n;
      }
    },
    async flush(): Promise<void> {
      // in-memory — nothing to flush
    },
  };
}

function cloneLevelBest(b: LevelBest): LevelBest {
  const out: LevelBest = { score: b.score };
  if (b.stars === 1 || b.stars === 2 || b.stars === 3) {
    out.stars = b.stars;
  }
  return out;
}

function cloneBlob(b: ProgressBlob): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, val] of Object.entries(b.bestByLevel)) {
    if (val != null) {
      bestByLevel[key as LevelId] = cloneLevelBest(val);
    }
  }
  return {
    v: 4,
    unlocked: [...b.unlocked],
    bestByLevel,
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
    telemetry: cloneTelemetryBlob(b.telemetry),
  };
}

export function createMemoryProgressStore(
  seed?: ProgressBlob,
): ProgressStore {
  let blob = seed != null ? cloneBlob(seed) : defaultProgressBlob();

  function applyLevelBest(id: LevelId, next: LevelBest): void {
    blob.bestByLevel[id] = next;
    if (next.score > blob.bestScore) {
      blob.bestScore = next.score;
    }
    blob.updatedAt = Date.now();
  }

  return {
    async getBest(): Promise<number> {
      return blob.bestScore;
    },
    async getBestForLevel(id: LevelId): Promise<number> {
      return blob.bestByLevel[id]?.score ?? 0;
    },
    async recordLevelBest(id: LevelId, score: number): Promise<void> {
      const n = Math.floor(score);
      if (!(n >= 0) || !Number.isFinite(n)) {
        return;
      }
      const prevScore = blob.bestByLevel[id]?.score ?? 0;
      if (!(n > prevScore)) {
        return;
      }
      applyLevelBest(id, mergeLevelBest(blob.bestByLevel[id], n, null));
    },
    recordRunEnd(args: RecordRunEndArgs): RecordRunEndResult {
      // Campaign progress is mode-gated (SC-3 / N-END-02): an endless or daily
      // run must never move bestByLevel, bestScore or the unlock ladder. The
      // discriminated union makes args.levelId reachable ONLY inside this block,
      // so the gate cannot be dropped without a compile error.
      if (args.mode === 'campaign') {
        // Stars and unlock stay win-gated; an abandoned run merges score + stats only.
        const starsFromWin =
          args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
        const merged = mergeLevelBest(
          blob.bestByLevel[args.levelId],
          args.score,
          starsFromWin,
        );
        applyLevelBest(args.levelId, merged);
        if (args.outcome === 'win') {
          blob.unlocked = unlockAfterClearPure(blob.unlocked, args.levelId);
          blob.updatedAt = Date.now();
        }
      }
      // Telemetry is mode-keyed BY DESIGN and stays OUTSIDE the gate — every mode
      // accumulates runs/bricks/ticks. A generated endless or daily board has no
      // catalog id, so each keys on its own constant instead of a LevelId.
      //
      // T-12-01 / D-15: the daily branch MUST reach the constant. Keying this map by
      // anything that varies per calendar day makes it unbounded — `sanitizeAggregateMap`
      // (`parseBlob.ts`) copies every key it finds on read with no cap, so nothing
      // downstream would ever trim it. The per-day history rides `telemetry.daily`,
      // which is a bounded collection.
      //
      // What holds that is BEHAVIOURAL, and it is in `tests/storage.daily-firewall.test.ts`:
      // “the same daily win DOES land… under the constant key” and “the daily aggregate
      // map still holds exactly one key after 40 distinct dates (T-12-08 / D-15)”.
      // MEASURED: keying this branch per calendar date reds both of them, in THIS store
      // only, with the sibling store's copies still green — the two hand-mirrored stores
      // are parameterised separately and gated independently.
      //
      // Nothing reads the SHAPE of the expression below, so an if/else chain, a switch or
      // a helper is a free refactor. Keep the daily branch reaching the constant and those
      // two cases will say so if it ever stops.
      //
      // ACHIEVEMENTS ARE THE SECOND MEMBER OF THAT CATEGORY (D-01 / D-12). The evaluation
      // block at the tail of this function sits outside every `args.mode === …` gate for
      // the same reason the telemetry write does: the catalog reads `lifetime`, all three
      // `byMode` maps, the endless record and the daily record, so a mode-gated evaluation
      // would satisfy the LETTER of SC-5 and not its point. Nothing reads the shape of that
      // region either. What holds it is behavioural, and it is the *every mode unlocks the
      // same achievement* case in `tests/achievements.record.test.ts`, which drives one
      // qualifying run under campaign, endless AND daily and asserts each one unlocks —
      // against this store and the AsyncStorage-backed one separately.
      const telemetryKey =
        args.mode === 'endless'
          ? ENDLESS_TELEMETRY_KEY
          : args.mode === 'daily'
            ? DAILY_TELEMETRY_KEY
            : args.levelId;
      blob.telemetry = mergeRunIntoTelemetry(blob.telemetry, {
        mode: args.mode,
        levelId: telemetryKey,
        outcome: args.outcome,
        score: args.score,
        stats: args.stats,
      });
      if (args.mode === 'endless') {
        // The endless record is the ONLY personal best an endless run may raise.
        // Nothing in here may reference bestByLevel, unlocked or bestScore.
        blob.telemetry = mergeEndlessRecord(blob.telemetry, {
          wave: args.wave,
          score: args.score,
        });
        blob.updatedAt = Date.now();
      }
      if (args.mode === 'daily') {
        // The daily history is the ONLY record a daily run may write. Nothing in here
        // may reference bestByLevel, unlocked or bestScore (N-DAILY-03 / SC-5) — and
        // the daily arm carries no levelId, so none of them is even reachable.
        //
        // D-07: win or lose CLOSES the date; abandoning does not. An abandoned daily
        // run has already accumulated its telemetry above (D-09) and stops here, so a
        // real interruption does not cost the day.
        if (args.outcome === 'win' || args.outcome === 'lose') {
          blob.telemetry = mergeDailyRecord(blob.telemetry, {
            date: args.date,
            score: args.score,
            outcome: args.outcome,
          });
          blob.updatedAt = Date.now();
        }
      }
      // Achievements (N-ACH-02 / D-01 / D-02 / D-12 / D-14 / D-19), OUTSIDE every mode
      // gate — see the paragraph above `telemetryKey`. Placed after both record merges so
      // the snapshot it evaluates is the one this run just produced, which is the whole of
      // D-01's "one call site, one snapshot, no extra storage read".
      //
      // `blob.telemetry` satisfies `AchievementSnapshot` STRUCTURALLY: the evaluator
      // imports no storage type and declares its own read-only view (D-20), and this call
      // site is where the compiler checks the two agree.
      //
      // The clock is read HERE, beside the `updatedAt = Date.now()` this store already
      // does. That is what keeps the evaluator pure (D-03) while D-14 still gets a real
      // unlock instant.
      //
      // Nothing in this block may reference `bestByLevel`, `unlocked` or `bestScore`
      // (T-13-05): outside the campaign gate `args.levelId` does not narrow, so none of
      // them is reachable, and the *touches no campaign state* case asserts the runtime
      // half against both stores.
      const newlyUnlocked = newlyUnlockedAchievements(
        blob.telemetry,
        blob.telemetry.achievements.unlocked.map((e) => e.id),
      );
      if (newlyUnlocked.length > 0) {
        blob.telemetry = mergeAchievementUnlocks(
          blob.telemetry,
          newlyUnlocked,
          Date.now(),
        );
        // D-11/D-12, 14-02 decision: store-side, gated on the run's OUTCOME. An
        // abandoned run never reaches a result panel — the same gate `PlayingHost`
        // applies one function away (`handleRunEnded`) for the identical reason — so
        // an unlock earned there is marked unseen here. Named residual: `outcome` is
        // a PROXY for "no panel rendered", not the fact itself; all four shipped run
        // exits were traced and pass abandoned only when no panel renders, but that
        // is a reading of control flow, not a test. One write still: this rides the
        // same `blob.telemetry` assignment and `updatedAt` stamp as the unlock merge
        // above, not a second persist.
        if (args.outcome === 'abandoned') {
          blob.telemetry = markAchievementsUnseen(blob.telemetry, newlyUnlocked);
        }
        blob.updatedAt = Date.now();
      }
      // D-19: the delta rides the return. `cloneBlob` has already produced a
      // caller-owned object, so the spread adds no aliasing. `newlyUnlocked` is `[]` and
      // never `undefined` when nothing fired.
      return { ...cloneBlob(blob), newlyUnlocked };
    },
    async unlockAfterClear(id: LevelId): Promise<void> {
      blob.unlocked = unlockAfterClearPure(blob.unlocked, id);
      blob.updatedAt = Date.now();
    },
    async isUnlocked(id: LevelId): Promise<boolean> {
      return isUnlockedPure(blob.unlocked, id);
    },
    async getSnapshot(): Promise<ProgressBlob> {
      return cloneBlob(blob);
    },
    async flush(): Promise<void> {
      // in-memory — nothing to flush
    },
    async markAchievementsSeen(): Promise<void> {
      blob.telemetry = {
        ...blob.telemetry,
        achievements: { ...blob.telemetry.achievements, unseen: [] },
      };
      blob.updatedAt = Date.now();
    },
  };
}
