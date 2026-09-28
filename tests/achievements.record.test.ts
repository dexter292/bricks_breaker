/**
 * N-ACH-02 / SC-2 / SC-5 / D-01 / D-02 / D-12 / D-14 / D-19 — the achievement write path,
 * end to end through both stores.
 *
 * This is plan 13-01's primary verify. It drives real runs through `recordRunEnd` and
 * asserts four things the tracer exists to prove: that a qualifying run PERSISTS the
 * unlock with a timestamp AND reports it on the widened return; that the same run a second
 * time reports nothing and moves nothing; that the evaluation sits OUTSIDE every mode gate;
 * and that the write touches no campaign state.
 *
 * SHAPE MERGED FROM TWO SHIPPED ANALOGS. The both-stores harness — the parameterised suite
 * body, its two instantiations, the `fakeAsyncStorage` double and the `runStats` helper —
 * is `tests/storage.daily-firewall.test.ts`. The read/write case shapes and the
 * `expect(value, 'why')` second-argument convention are `tests/daily.record.test.ts`. Both
 * stores are asserted SEPARATELY because they are two hand-mirrored implementations and a
 * gate added to one is no evidence about the other — the obligation phases 9, 11 and 12
 * each paid.
 *
 * WHAT THIS FILE IS NOT EVIDENCE ABOUT, stated so its silence is not read as coverage:
 *  - The READ path. `parseBlob.ts` is untouched by plan 13-01, so a stored achievements
 *    field is currently discarded on read (`sanitizeTelemetry` starts from
 *    `defaultTelemetryBlob()`). The sanitizer, the unknown-id drop and the
 *    degrades-alone case are plan 13-03's, and nothing here says they exist.
 *  - The PANEL. `tests/ui/ResultOverlay.achievements.test.tsx` owns the markup and
 *    `tests/ui/PlayingHost.daily-run.test.tsx` owns the host wiring. Nothing here renders.
 *  - The EVALUATOR's own correctness. The expected id set below is DERIVED by running the
 *    catalog's predicates, which is deliberate — the subject of this file is the storage
 *    wiring around them (placement, persistence, timestamps, set difference, firewall).
 *    The evaluator's determinism, idempotency and hostile-input battery are plan 13-02's
 *    `tests/achievements.evaluate.test.ts`.
 *
 * **Assertions are on cardinality, on containment and on absence — never a whole-object
 * equality over the achievements record.** Phase 14 reads this record and later plans add
 * to it; a `toEqual` over it would red the moment they land, for no defect.
 *
 * The positive-control id is DERIVED from `ACHIEVEMENT_CATALOG` rather than written as a
 * literal, for `tests/ui/certLevelPlan.test.ts`'s reason: a hand-written id would go on
 * passing while plan 13-02's catalog expansion silently shrank this file's coverage.
 */
import { describe, it, expect } from 'vitest';
import {
  PLAYABLE_LEVEL_ORDER,
  createMemoryProgressStore,
  defaultRunStatsInput,
  defaultTelemetryBlob,
  type ProgressStore,
  type RunStatsInput,
} from '../src/services/storage';
import { __createAsyncStorageProgressStoreForTests } from '../src/services/storage/asyncStorageStore';
import {
  ACHIEVEMENT_CATALOG,
  qualifyingAchievements,
} from '../src/services/achievements';

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

/** The date the daily cases close. Any valid `YYYY-MM-DD` key would do. */
const TODAY = '2026-09-27';

/**
 * A brick count far past any cumulative threshold D-09's 8-12 entries could reasonably
 * set — the `FAR_WAVE = 10000` idiom from `tests/endless.ramp.test.ts`, which exists so no
 * assertion here pins a dial constant that is legitimately re-tunable (D-11).
 *
 * `mergeRunIntoTelemetry` runs BEFORE the evaluation inside `recordRunEnd`, so a single
 * run carrying this many bricks crosses the threshold on a FRESH store with no seeding.
 */
const QUALIFYING_BRICKS = 1_000_000;

/** The post-run telemetry a single `QUALIFYING_BRICKS` run produces, near enough. */
function qualifyingTelemetry() {
  const t = defaultTelemetryBlob();
  t.lifetime.bricksBroken = QUALIFYING_BRICKS;
  return t;
}

/**
 * The ids such a run is expected to unlock, DERIVED from the shipped catalog.
 *
 * Deriving rather than listing is what keeps plan 13-02's expansion from shrinking this
 * file's coverage in silence. It is not circular for the claims below: what is under test
 * here is the STORE — whether the evaluation runs, where it runs, what it persists and
 * what it returns — not whether a predicate is right.
 */
const EXPECTED_IDS = qualifyingAchievements(qualifyingTelemetry());
const CONTROL_ID = EXPECTED_IDS[0] ?? '';

/** Ids a FRESH blob already qualifies for — must be none, or the absence cases are about the catalog. */
const IDS_ON_A_FRESH_BLOB = qualifyingAchievements(defaultTelemetryBlob());

function recordSuite(label: string, makeStore: () => ProgressStore): void {
  describe(`achievement write path — ${label} (N-ACH-02 / D-01 / D-19)`, () => {
    it('the fixtures are non-vacuous: the catalog qualifies something for a big run and nothing for a fresh blob', () => {
      expect(
        ACHIEVEMENT_CATALOG.length,
        'an empty catalog would make every case below pass by rendering nothing to unlock',
      ).toBeGreaterThan(0);
      expect(
        EXPECTED_IDS.length,
        `a ${QUALIFYING_BRICKS}-brick run must cross at least one catalog threshold, or the positive cases below assert nothing`,
      ).toBeGreaterThan(0);
      expect(
        IDS_ON_A_FRESH_BLOB,
        'a fresh blob must qualify for NOTHING, or the "crosses nothing" case below is testing the catalog rather than the store',
      ).toEqual([]);
    });

    it('a qualifying run unlocks, persists and reports it on the widened return (D-14 / D-19)', async () => {
      const store = makeStore();

      const result = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 900,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS, ticksPlayed: 30_000 }),
      });

      expect(
        result.newlyUnlocked,
        'D-19: the set difference cannot cross the store boundary any other way — once the union is persisted it is gone',
      ).toContain(CONTROL_ID);

      const after = await store.getSnapshot();
      const entries = after.telemetry.achievements.unlocked;
      expect(
        entries,
        'the same write that reported the unlock must also have PERSISTED it — one write, no second storage read (D-01)',
      ).toHaveLength(EXPECTED_IDS.length);
      const entry = entries.find((e) => e.id === CONTROL_ID);
      expect(entry, `the stored collection must hold an entry for ${CONTROL_ID}`).toBeDefined();
      expect(
        Number.isFinite(entry!.at),
        'D-14: the unlock instant is stored because it cannot be reconstructed afterwards — a NaN is the same as not storing it',
      ).toBe(true);
      expect(entry!.at).toBeGreaterThanOrEqual(0);
    });

    it('the same qualifying run a second time reports nothing and moves no timestamp (SC-2 / D-02 / D-17)', async () => {
      const store = makeStore();
      const first = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 900,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      expect(
        first.newlyUnlocked,
        'the first run is what makes the second one a test of idempotency rather than of nothing happening',
      ).toContain(CONTROL_ID);
      const between = await store.getSnapshot();
      const firstAt = between.telemetry.achievements.unlocked.find(
        (e) => e.id === CONTROL_ID,
      )!.at;

      const second = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 900,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });

      expect(
        second.newlyUnlocked,
        'D-02: idempotency is a SET DIFFERENCE, not a per-achievement flag — an id already in the stored set produces an empty delta by construction',
      ).toEqual([]);
      const after = await store.getSnapshot();
      expect(
        after.telemetry.achievements.unlocked,
        'and the collection did not grow a duplicate entry',
      ).toHaveLength(EXPECTED_IDS.length);
      expect(
        after.telemetry.achievements.unlocked.find((e) => e.id === CONTROL_ID)!.at,
        'D-17: an unlock is one-way and its moment does not move — a re-write that stamped `now` over it would destroy exactly the recency order D-14 stores it for',
      ).toBe(firstAt);
    });

    it('a run that crosses nothing reports nothing and writes nothing', async () => {
      const store = makeStore();

      const result = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 10,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 0 }),
      });

      expect(
        result.newlyUnlocked,
        'the paired positive control is the qualifying case above, in this same suite body — it is what makes this absence non-vacuous rather than a write that was dropped altogether',
      ).toEqual([]);
      const after = await store.getSnapshot();
      expect(
        after.telemetry.achievements.unlocked,
        'nothing crossed, so nothing is stored — and the field exists to be empty rather than being absent',
      ).toEqual([]);
    });

    it('every mode unlocks the same achievement — the evaluation is outside every mode gate (SC-5 / D-12)', () => {
      const campaign = makeStore().recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 900,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      const endless = makeStore().recordRunEnd({
        mode: 'endless',
        wave: 7,
        score: 4_000,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      const daily = makeStore().recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 4_000,
        outcome: 'win',
        livesRemaining: 2,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });

      // BEHAVIOURAL rather than structural on purpose: both stores' own gate comments
      // record that nothing reads the SHAPE of that region, so a case that drives each
      // mode is what will say so if the evaluation ever drifts inside a gate.
      expect(
        campaign.newlyUnlocked,
        'a campaign run must unlock — the evaluation sits after the campaign gate closes',
      ).toContain(CONTROL_ID);
      expect(
        endless.newlyUnlocked,
        'an endless run must unlock the SAME achievement — a catalog reading `lifetime` is reachable from every mode (D-12)',
      ).toContain(CONTROL_ID);
      expect(
        daily.newlyUnlocked,
        'and so must a daily run; an evaluation copied into the daily arm would pass the first two of these and fail here',
      ).toContain(CONTROL_ID);
    });

    it('the achievements write touches no campaign state (T-13-05 / SC-5)', async () => {
      const first = PLAYABLE_LEVEL_ORDER[0]!;
      const second = PLAYABLE_LEVEL_ORDER[1]!;
      const store = makeStore();

      // Pre-seed a real campaign win so every value this case claims to preserve is
      // NON-DEFAULT — the `tests/storage.daily-firewall.test.ts` idiom. Its bricks are
      // deliberately far below the threshold, so this run unlocks nothing and the daily
      // run below is unambiguously the write under test.
      const seed = store.recordRunEnd({
        mode: 'campaign',
        levelId: first,
        score: 100,
        outcome: 'win',
        livesRemaining: 2,
        stats: runStats({ bricksBroken: 10 }),
      });
      expect(
        seed.newlyUnlocked,
        'the seeding run must unlock nothing, or it — not the daily run — is what this case measures',
      ).toEqual([]);

      const before = await store.getSnapshot();
      expect(
        before.bestScore,
        'the campaign rollup must be non-default here, or the preservation assertion below is vacuous',
      ).toBe(100);
      expect(
        before.unlocked,
        'and so must the unlock ladder',
      ).toEqual([first, second]);
      expect(
        before.bestByLevel[first],
        'and so must the per-level best',
      ).toEqual({ score: 100, stars: 2 });

      const result = store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 50_000,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      expect(
        result.newlyUnlocked,
        'the achievements write must actually have fired, or "it touched nothing" is true for the wrong reason',
      ).toContain(CONTROL_ID);

      const after = await store.getSnapshot();
      expect(after.bestByLevel).toEqual(before.bestByLevel);
      expect(after.unlocked).toEqual(before.unlocked);
      expect(after.bestScore).toBe(before.bestScore);
      expect(
        after.bestScore,
        'a 50 000-point daily run that also unlocked an achievement must not raise the campaign Title rollup',
      ).toBe(100);
    });

    it('a qualifying daily run on a FRESH store leaves bestByLevel empty', async () => {
      const store = makeStore();

      const result = store.recordRunEnd({
        mode: 'daily',
        date: TODAY,
        score: 8_400,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      expect(
        result.newlyUnlocked,
        'the unlock fired, so the empty map below is a preserved absence rather than a dropped write',
      ).toContain(CONTROL_ID);

      const after = await store.getSnapshot();
      expect(after.bestByLevel).toEqual({});
      expect(after.bestScore).toBe(0);
      expect(after.unlocked).toEqual([PLAYABLE_LEVEL_ORDER[0]]);
    });
  });
}

recordSuite('memory store', () => createMemoryProgressStore());
recordSuite('AsyncStorage-backed store', () =>
  __createAsyncStorageProgressStoreForTests(fakeAsyncStorage()),
);
