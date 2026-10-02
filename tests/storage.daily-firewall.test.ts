/**
 * SC-5 / N-DAILY-03 — the daily firewall.
 *
 * A daily run must never move campaign state and never move the endless record. This is
 * the file that proves it cannot, asserted SEPARATELY for the memory store and the
 * AsyncStorage-backed store, because they are two hand-mirrored implementations and a
 * gate added to one is no evidence about the other. Its analog is
 * `tests/storage.endless-firewall.test.ts`, which exists because research found the live
 * version of this defect: `recordRunEnd` wrote `bestByLevel`, raised `blob.bestScore` and
 * called `unlockAfterClearPure` for EVERY mode, with no reference to `args.mode`. A third
 * mode is a third chance to reintroduce it.
 *
 * The guarantee has two halves and both are checked here:
 *   - runtime: the `args.mode === 'campaign'` gate in both stores (the `it`s below);
 *   - compile time: `RecordRunEndArgs` is a discriminated union whose `daily` arm has no
 *     `levelId`, pinned by the `@ts-expect-error` case — which fails `npm run typecheck`
 *     if the union ever collapses back to a flat type.
 *
 * Three cases here have NO endless counterpart and are written fresh:
 *   1. *the daily write LANDED*. A firewall suite that only asserts absence passes
 *      trivially when the write was dropped altogether, so absence is always paired with
 *      presence (the endless file's own companion case exists for this reason).
 *   2. *the daily aggregate map does not grow with dates* — the standing alarm for the
 *      smallest-edit-that-compiles defect (12-RESEARCH § Pitfall 1). Adding the `daily`
 *      arm stops the old two-way telemetry-key ternary compiling, and the one-character
 *      fix that makes it compile again keys the map per DATE. `sanitizeAggregateMap`
 *      copies every key it finds on read with no cap, so nothing downstream would ever
 *      trim it — in a blob read whole on every app open.
 *   3. *the endless record is untouched by a daily run*. The endless file has no
 *      counterpart because there was no third mode to isolate from.
 *
 * **Assertions are on cardinality and on absence, never a whole-object equality over the
 * daily record.** Plan 12-03 adds D-16's two scalars to `DailyRecord` behind a decision
 * checkpoint; a `toEqual` over that record would red the moment they land, for no defect.
 *
 * Level ids come from `PLAYABLE_LEVEL_ORDER`, never as literals: the campaign order has
 * been reshuffled once already (E2).
 */
import { describe, it, expect } from 'vitest';
import {
  DAILY_TELEMETRY_KEY,
  PLAYABLE_LEVEL_ORDER,
  createMemoryProgressStore,
  defaultRunStatsInput,
  type ProgressStore,
  type RunStatsInput,
} from '../src/services/storage';
import { __createAsyncStorageProgressStoreForTests } from '../src/services/storage/asyncStorageStore';

/** All-zero per-run counters with only the fields a case cares about set. */
function runStats(over: Partial<RunStatsInput> = {}): RunStatsInput {
  return { ...defaultRunStatsInput(), ...over };
}

/** Minimal in-memory AsyncStorage double — genuinely async, like the device. */
function fakeAsyncStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    map,
    getItem: async (key: string): Promise<string | null> => map.get(key) ?? null,
    setItem: async (key: string, value: string): Promise<void> => {
      map.set(key, value);
    },
  };
}

/** The date the single-run cases close. Any valid `YYYY-MM-DD` key would do. */
const TODAY = '2026-09-27';

/**
 * How many distinct dates the unbounded-map alarm plays before re-counting the aggregate
 * map. Large enough that a per-date key is unmistakable in the failure message, small
 * enough to stay instant in both stores.
 */
const DISTINCT_DATES = 40;

/** `DISTINCT_DATES` consecutive ISO keys in September/October 2026, built by counting. */
function distinctDates(): string[] {
  const out: string[] = [];
  for (let i = 0; i < DISTINCT_DATES; i++) {
    const dayOfSeptember = i + 1;
    out.push(
      dayOfSeptember <= 30
        ? `2026-09-${String(dayOfSeptember).padStart(2, '0')}`
        : `2026-10-${String(dayOfSeptember - 30).padStart(2, '0')}`,
    );
  }
  return out;
}

/**
 * One suite body, run against each store implementation. Both stores implement the same
 * `ProgressStore` interface, and SC-5 is a claim about that interface — so the assertions
 * are identical by construction and a gate that lands in only one store fails here loudly.
 */
function firewallSuite(label: string, makeStore: () => ProgressStore): void {
  describe(`daily firewall — ${label} (SC-5 / N-DAILY-03)`, () => {
    it('a daily win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values', async () => {
      const store = makeStore();
      const before = await store.getSnapshot();

      store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 8_400,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: 260, ticksPlayed: 30_000 }),
      });

      const after = await store.getSnapshot();
      expect(after.unlocked).toEqual(before.unlocked);
      expect(after.bestByLevel).toEqual(before.bestByLevel);
      expect(after.bestScore).toBe(before.bestScore);
      // The original defect wrote `bestByLevel[undefined]`; assert the map gained no key.
      expect(Object.keys(after.bestByLevel)).toEqual(Object.keys(before.bestByLevel));
      // `bestScore` is the campaign Title rollup — an 8 400-point daily run must not
      // raise it even though it dwarfs every campaign score.
      expect(after.bestScore).toBe(0);
      // And the unlock ladder is still exactly where a fresh blob leaves it.
      expect(after.unlocked).toEqual([PLAYABLE_LEVEL_ORDER[0]]);
    });

    it('a daily win leaves telemetry.endless byte-identical — the third mode is isolated from the second too', async () => {
      const store = makeStore();
      // Bank a real endless record first, so the case is about PRESERVING a value rather
      // than about two defaults happening to match.
      store.recordRunEnd({
        mode: 'endless',
        wave: 21,
        score: 9_000,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 400 }),
      });
      const before = await store.getSnapshot();
      expect(
        before.telemetry.endless,
        'the endless record must be non-default here, or this case is vacuous',
      ).toEqual({ bestWave: 21, bestScore: 9_000 });

      store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 12_000,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: 300 }),
      });

      const after = await store.getSnapshot();
      expect(after.telemetry.endless).toEqual(before.telemetry.endless);
      // A 12 000-point daily run must not become an endless best score.
      expect(after.telemetry.endless.bestScore).toBe(9_000);
    });

    it('the same daily win DOES land: the date joins the history and the aggregate bumps under the constant key', async () => {
      const store = makeStore();

      store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 8_400,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: 260, ticksPlayed: 30_000 }),
      });

      const after = await store.getSnapshot();
      // Proof the write LANDED rather than being dropped by the gate. Asserted field by
      // field, never as a whole-object equality: plan 12-03 adds D-16's scalars here.
      const entry = after.telemetry.daily.history.find((e) => e.date === TODAY);
      expect(entry, `the daily history must contain an entry for ${TODAY}`).toBeDefined();
      expect(entry?.score).toBe(8_400);
      expect(entry?.outcome).toBe('win');
      expect(after.telemetry.daily.history).toHaveLength(1);
      expect(after.telemetry.byMode.daily[DAILY_TELEMETRY_KEY]?.runsPlayed).toBe(1);
      expect(after.telemetry.byMode.daily[DAILY_TELEMETRY_KEY]?.bricksBroken).toBe(260);
      expect(after.telemetry.lifetime.runsPlayed).toBe(1);
      // …and it landed under the D-15 constant key, not under a campaign level id.
      expect(after.telemetry.byMode.campaign).toEqual({});
      expect(Object.keys(after.telemetry.byMode.daily)).toEqual([DAILY_TELEMETRY_KEY]);
    });

    it('a campaign win against the same store still unlocks, still writes bestByLevel and still raises bestScore — the gate did not break the existing path', async () => {
      const first = PLAYABLE_LEVEL_ORDER[0];
      const second = PLAYABLE_LEVEL_ORDER[1];
      const store = makeStore();

      // A daily run first, so the campaign path is exercised on a store that has already
      // taken a daily write.
      store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 500,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 30 }),
      });
      store.recordRunEnd({
        mode: 'campaign',
        levelId: first,
        score: 100,
        outcome: 'win',
        livesRemaining: 2,
        stats: runStats({ bricksBroken: 10 }),
      });

      const after = await store.getSnapshot();
      expect(after.bestByLevel[first]).toEqual({ score: 100, stars: 2 });
      expect(after.unlocked).toEqual([first, second]);
      expect(after.bestScore).toBe(100);
      expect(await store.isUnlocked(second)).toBe(true);
      // The earlier daily run is still recorded and still did not leak.
      expect(after.telemetry.daily.history.map((e) => e.date)).toEqual([TODAY]);
      expect(after.telemetry.lifetime.runsPlayed).toBe(2);
    });

    it('the daily aggregate map still holds exactly one key after 40 distinct dates (T-12-08 / D-15)', async () => {
      const store = makeStore();
      const dates = distinctDates();
      expect(
        new Set(dates).size,
        'the alarm needs genuinely distinct dates, or it cannot detect a per-date key',
      ).toBe(DISTINCT_DATES);

      for (const date of dates) {
        store.recordRunEnd({
          mode: 'daily',
          date,
          score: 100,
          outcome: 'win',
          livesRemaining: 1,
          stats: runStats({ bricksBroken: 5 }),
        });
      }

      const after = await store.getSnapshot();
      const keys = Object.keys(after.telemetry.byMode.daily);
      expect(
        keys,
        `byMode.daily must stay keyed by the constant alone; ${DISTINCT_DATES} dates produced keys [${keys.join(', ')}]. A per-date key is unbounded — sanitizeAggregateMap copies every key it finds on read with no cap, in a blob read whole on every app open.`,
      ).toEqual([DAILY_TELEMETRY_KEY]);
      // The aggregate under that one key counted every run, so the map is CONSTANT-keyed
      // rather than merely small.
      expect(after.telemetry.byMode.daily[DAILY_TELEMETRY_KEY]?.runsPlayed).toBe(
        DISTINCT_DATES,
      );
      // The per-date detail rides the bounded history instead, which is where it belongs.
      expect(after.telemetry.daily.history).toHaveLength(DISTINCT_DATES);
      // And 40 daily dates still moved nothing campaign-side.
      expect(after.bestScore).toBe(0);
      expect(after.bestByLevel).toEqual({});
      expect(after.unlocked).toEqual([PLAYABLE_LEVEL_ORDER[0]]);
    });

    it('a campaign-shaped argument cannot be supplied on the daily arm — the compile-time half of SC-5 (N-DAILY-03)', () => {
      const store = makeStore();

      // If `RecordRunEndArgs` ever collapses back to a flat type with an always-present
      // `levelId`, the line below stops erroring and `npm run typecheck` then fails on
      // the unused directive — which is exactly the regression alarm.
      //
      // (This prose deliberately does NOT open a line with the directive token: a `//`
      // comment whose text begins with it IS a directive to the compiler, wherever it
      // sits, and one aimed at a line that does not error is itself an `error TS2578`.)
      store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        // @ts-expect-error — the daily arm has no `levelId`; campaign fields are
        // unreachable from a non-campaign run at the type level (N-DAILY-03 / SC-5).
        levelId: PLAYABLE_LEVEL_ORDER[0],
        score: 1,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats(),
      });

      expect(true).toBe(true);
    });
  });
}

firewallSuite('memory store', () => createMemoryProgressStore());
firewallSuite('AsyncStorage-backed store', () =>
  __createAsyncStorageProgressStoreForTests(fakeAsyncStorage()),
);
