/**
 * N-ACH-02 / SC-2 / SC-3 / SC-5 / D-01 / D-02 / D-12 / D-14 / D-19 / D-22 / D-23 — the
 * achievement write path AND the three claims a parser test cannot make, end to end through
 * both stores.
 *
 * This is plan 13-01's primary verify. It drives real runs through `recordRunEnd` and
 * asserts four things the tracer exists to prove: that a qualifying run PERSISTS the
 * unlock with a timestamp AND reports it on the widened return; that the same run a second
 * time reports nothing and moves nothing; that the evaluation sits OUTSIDE every mode gate;
 * and that the write touches no campaign state.
 *
 * Plan 13-03 EXTENDED it with the five claims that need a whole store rather than a parse:
 * that an unlock survives a genuine cold start (SC-3); that reconciling memory against
 * freshly-hydrated disk keeps the EARLIEST timestamp for a shared id (D-22); that no id
 * inherits another id's timestamp; that an ordinary campaign run recorded afterwards does
 * not erase the set (D-23, the site no test names directly); and that a hand-edited blob
 * cannot grow the collection (T-13-02).
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
 *  - The SANITIZER's own field rules. Plan 13-03 wired `sanitizeAchievementRecord` into
 *    `sanitizeTelemetry`, so the stored field now survives a read and the cases below
 *    depend on that — but the unknown-id drop, the timestamp default (D-21), the
 *    de-duplication, the trim-after-drop ordering, the degrades-alone independence
 *    contract and the no-migration case are all asserted at the parser, in
 *    `tests/storage.progress-v4.test.ts` § `sanitizeAchievementRecord`. The cardinality
 *    case below is the ONE claim here that reaches the parser, and it reaches it through a
 *    whole store on purpose: an alarm on the composition, not on the sanitizer.
 *  - The PANEL. `tests/ui/ResultOverlay.achievements.test.tsx` owns the markup and
 *    `tests/ui/PlayingHost.daily-run.test.tsx` owns the host wiring. Nothing here renders.
 *  - WINDOWS #27. `sanitizeAggregateMap` in the same parser is still uncapped and plan
 *    13-03 did not close it. The cardinality case below names it as the defect family it
 *    watches for; nothing here should be read as evidence that it is fixed.
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
  ACHIEVEMENT_UNLOCK_BOUND,
  PLAYABLE_LEVEL_ORDER,
  PROGRESS_KEY,
  createMemoryProgressStore,
  defaultProgressBlob,
  defaultRunStatsInput,
  defaultTelemetryAggregate,
  defaultTelemetryBlob,
  mergeTelemetryBlobs,
  parseProgressResult,
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

/**
 * The post-run telemetry a single `QUALIFYING_BRICKS` CAMPAIGN WIN produces, near enough.
 *
 * **The `byMode.campaign` region is modelled and must stay modelled (13-02).** Plan 13-01's
 * catalog held one entry reading `lifetime` alone, so a fixture that set one lifetime
 * counter described the whole evaluation. D-12 made the catalog mode-aware: a campaign win
 * with no lives lost now qualifies for a campaign-only entry too, so a fixture naming only
 * `lifetime` computes an `EXPECTED_IDS` SMALLER than the store's real result and the
 * cardinality assertions below red on a plan that contains no defect. The fixture describes
 * the run the cases actually drive — one win on `PLAYABLE_LEVEL_ORDER[0]`, no lives lost —
 * and no id or threshold is named here either way.
 */
function qualifyingTelemetry() {
  const t = defaultTelemetryBlob();
  t.lifetime.bricksBroken = QUALIFYING_BRICKS;
  t.lifetime.runsPlayed = 1;
  t.lifetime.runsWon = 1;
  const level = defaultTelemetryAggregate();
  level.bricksBroken = QUALIFYING_BRICKS;
  level.runsPlayed = 1;
  level.runsWon = 1;
  t.byMode.campaign[PLAYABLE_LEVEL_ORDER[0]!] = level;
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

/**
 * The three ids the merge cases key on, DERIVED from the catalog for the reason
 * `CONTROL_ID` is: a hand-written id would go on passing while a catalog change silently
 * shrank this file's coverage. Only the FIRST three are needed, and the catalog's size is
 * asserted non-vacuously in the suite body before they are used.
 */
const CATALOG_IDS = ACHIEVEMENT_CATALOG.map((a) => a.id);

/**
 * Four distinct unlock instants, deliberately far apart and deliberately all DIFFERENT.
 *
 * The D-22 case asserts that the later of a shared pair appears NOWHERE in the merged
 * collection, so no other entry in that case may legitimately carry the same number — a
 * shared constant would make the absence assertion unfalsifiable.
 */
const T_SHARED_EARLY = 1_700_000_100_000;
const T_ONLY_MEMORY = 1_700_000_200_000;
const T_SHARED_LATE = 1_700_000_300_000;
const T_ONLY_DISK = 1_700_000_400_000;

/**
 * One store flavour: how to make one, how to hydrate one from persisted BYTES, and whether
 * it has a disk that a second store can be re-opened over.
 *
 * `coldStart` is `null` for a store with no disk. That is not a gap to be papered over with
 * an assertion that happens to hold — see the skip in the suite body, which states the
 * reason in the test name instead.
 */
type StoreFlavor = {
  label: string;
  make: () => ProgressStore;
  /**
   * A store hydrated from a raw persisted v4 JSON string, through the REAL parse path.
   *
   * Both flavours route through `parseProgressResult`, which is what makes the cardinality
   * claim below uniform across them: the memory store takes no raw bytes of its own, so it
   * is seeded from a parsed blob exactly as the shipped app-kill case in
   * `tests/storage.progress-v4.test.ts` seeds its relaunched store.
   */
  fromRaw: (raw: string) => ProgressStore;
  /** A live store, the bytes it persisted, and a SECOND store over those same bytes. */
  coldStart:
    | (() => {
        live: ProgressStore;
        persisted: () => string | null;
        relaunch: () => ProgressStore;
      })
    | null;
};

function recordSuite(flavor: StoreFlavor): void {
  // Aliased so plan 13-01's five cases below read exactly as it left them.
  const { label, make: makeStore } = flavor;
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
      //
      // **It loses one life, and that is load-bearing rather than incidental (13-02).**
      // The catalog is mode-aware from plan 13-02: a campaign win with ZERO lives lost is
      // itself a skill-gated achievement, so a spotless seeding run would unlock something
      // and the guard below would red — correctly, since the case would then be measuring
      // the seed rather than the daily run. Losing a life keeps the seed silent without
      // naming an id or a threshold, and `stars` derives from `livesRemaining`, so the
      // per-level best this case preserves is unchanged.
      const seed = store.recordRunEnd({
        mode: 'campaign',
        levelId: first,
        score: 100,
        outcome: 'win',
        livesRemaining: 2,
        stats: runStats({ bricksBroken: 10, livesLost: 1 }),
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

    // ───────────────────────────────────────────────────────────────────────────────
    // Plan 13-03: the five claims a parser test cannot make.
    // ───────────────────────────────────────────────────────────────────────────────

    if (flavor.coldStart == null) {
      // An explicit SKIP with its reason in the name, never an assertion that passes
      // vacuously. This store is constructed from a blob held in RAM: a "second store over
      // the same bytes" would be the same object, so the case would report green while
      // asserting nothing at all about persistence.
      it.skip(`an unlock survives a cold start — SKIPPED for the ${label}, which has no disk: a second store over the same bytes is the same object in RAM, so the case would pass without asserting persistence (N-ACH-02 / SC-3)`, () => {
        // Asserted for the AsyncStorage-backed instantiation of this same suite body; the
        // parser half of SC-3 is the round-trip case in tests/storage.progress-v4.test.ts.
      });
    } else {
      const coldStart = flavor.coldStart;
      it('an unlock survives a cold start — a SECOND store over the same persisted bytes hydrates it (N-ACH-02 / SC-3 / D-13)', async () => {
        const { live, persisted, relaunch } = coldStart();
        await live.getSnapshot(); // hydrate first, as the hosts do

        const result = live.recordRunEnd({
          mode: 'campaign',
          levelId: PLAYABLE_LEVEL_ORDER[0]!,
          score: 900,
          outcome: 'win',
          livesRemaining: 3,
          stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
        });
        expect(
          result.newlyUnlocked,
          'the unlock must fire on the live store, or the relaunch below is reading a blob that never had one',
        ).toContain(CONTROL_ID);
        const at = (await live.getSnapshot()).telemetry.achievements.unlocked.find(
          (e) => e.id === CONTROL_ID,
        )!.at;

        await live.flush?.();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(
          persisted() ?? '',
          'the BYTES on disk must carry the field — an app kill leaves nothing else behind, so this is the intermediate control between the write and the hydrate',
        ).toContain(CONTROL_ID);

        // The app kill: a brand-new store closure over the same stored string, reading it
        // back through `parseProgressResult` exactly as a relaunch does.
        const relaunched = relaunch();
        const snap = await relaunched.getSnapshot();
        expect(
          snap.telemetry.achievements.unlocked.map((e) => e.id),
          'SC-3: until plan 13-03 wired the sanitizer, `sanitizeTelemetry` started from `defaultTelemetryBlob()` and never looked at a stored achievements field — so this hydrated [] and the unlock was silently un-earned on every cold start',
        ).toContain(CONTROL_ID);
        expect(
          snap.telemetry.achievements.unlocked.find((e) => e.id === CONTROL_ID)!.at,
          'D-14: the moment came back with it, unchanged — a timestamp that cannot survive the trip cannot be reconstructed afterwards',
        ).toBe(at);
      });
    }

    // The name carries the word `earliest` in LOWER CASE deliberately: `13-VALIDATION.md`'s
    // row for D-22 filters this file with `-t "earliest"`, and MEASURED — vitest's `-t` is
    // case-SENSITIVE, so a name spelling it `EARLIEST` leaves the gate matching nothing and
    // exiting 0 on `Tests 24 skipped (24)`.
    it('the reconcile keeps the earliest timestamp for a shared id — memory against freshly-hydrated disk (D-22)', () => {
      expect(
        CATALOG_IDS.length,
        'this case needs three distinct catalog ids, or the union it asserts over is degenerate',
      ).toBeGreaterThan(2);
      const [shared, onlyMemory, onlyDisk] = CATALOG_IDS as [string, string, string];

      const early = defaultTelemetryBlob();
      early.achievements = {
        unlocked: [
          { id: shared, at: T_SHARED_EARLY },
          { id: onlyMemory, at: T_ONLY_MEMORY },
        ],
      };
      const late = defaultTelemetryBlob();
      late.achievements = {
        unlocked: [
          { id: shared, at: T_SHARED_LATE },
          { id: onlyDisk, at: T_ONLY_DISK },
        ],
      };

      /**
       * BOTH argument orders, and the symmetry is the whole point.
       *
       * MEASURED while writing this case: asserting one order alone is not enough. With the
       * later copy passed as `memory` and the earlier as `incoming`, an incoming-wins loop
       * — `byId.set` on every entry, `mergeDailyRecords`' shipped rule — returns the EARLY
       * timestamp too, because the earlier copy simply happens to be written last. The case
       * then passes against exactly the defect D-22 exists to forbid. Earliest-wins is
       * COMMUTATIVE and incoming-wins is not, so requiring the same answer in both
       * directions is what actually binds the rule.
       */
      for (const [label, merged] of [
        ['memory=early, incoming=late', mergeTelemetryBlobs(early, late)],
        ['memory=late, incoming=early', mergeTelemetryBlobs(late, early)],
      ] as const) {
        const entries = merged.achievements.unlocked;

        expect(
          entries.map((e) => e.id).sort(),
          `${label}: the union must hold all three ids — neither side may lose its exclusive unlock, because D-17 makes an unlock one-way`,
        ).toEqual([shared, onlyMemory, onlyDisk].sort());
        expect(
          entries.filter((e) => e.id === shared),
          `${label}: one entry per id — whole \`{ id, at }\` records are keyed and merged as units`,
        ).toHaveLength(1);
        expect(
          entries.find((e) => e.id === shared)?.at,
          `${label}: D-22 — earliest wins. \`mergeDailyRecords\` resolves the same situation incoming-wins, and copying that loop without inverting it walks the timestamp FORWARD on every reconcile, destroying exactly the recency order D-14 stores it for.`,
        ).toBe(T_SHARED_EARLY);
        // The inverse, stated EXPLICITLY over the WHOLE collection. An incoming-wins copy
        // still produces all three ids and still produces one entry per id, so both
        // assertions above pass against it in at least one argument order.
        expect(
          entries.map((e) => e.at),
          `${label}: the LATER of the shared pair must appear NOWHERE in the merged collection — a containment-only assertion would pass against an incoming-wins merge`,
        ).not.toContain(T_SHARED_LATE);
      }
    });

    it('the reconcile does not cross one id with another id’s timestamp — the phase-12 evidence-crossing defect in its narrow achievements form', () => {
      const [idA, idB] = CATALOG_IDS as [string, string];

      const memory = defaultTelemetryBlob();
      memory.achievements = { unlocked: [{ id: idA, at: T_SHARED_EARLY }] };
      const incoming = defaultTelemetryBlob();
      incoming.achievements = { unlocked: [{ id: idB, at: T_ONLY_DISK }] };

      const merged = mergeTelemetryBlobs(memory, incoming);
      const why =
        'the defect this watches for is a merge that unions the IDS and then reduces over ALL the timestamps — a min across the collection rather than per id — which stamps every achievement with the earliest instant in either copy. That is one record’s evidence attached to another’s claim: the phase-12 `carriedStartIsCredible` defect in a new place.';

      expect(merged.achievements.unlocked.find((e) => e.id === idA)?.at, why).toBe(
        T_SHARED_EARLY,
      );
      expect(merged.achievements.unlocked.find((e) => e.id === idB)?.at, why).toBe(T_ONLY_DISK);
      // Disjoint ids, so the collection is exactly the two of them — neither dropped.
      expect(merged.achievements.unlocked).toHaveLength(2);
    });

    it('a campaign run recorded AFTER an unlock does not erase the unlock set (D-23)', async () => {
      const store = makeStore();

      const unlocking = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 900,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: QUALIFYING_BRICKS }),
      });
      expect(
        unlocking.newlyUnlocked,
        'the unlock must LAND first — it is the positive control that makes the survival assertion below non-vacuous rather than a set that was empty all along',
      ).toContain(CONTROL_ID);
      const before = (await store.getSnapshot()).telemetry.achievements.unlocked;
      expect(before.length).toBeGreaterThan(0);
      const at = before.find((e) => e.id === CONTROL_ID)!.at;

      // An ORDINARY campaign run that qualifies for nothing. `mergeRunIntoTelemetry` starts
      // from `cloneTelemetryBlob`, so a field missing from that clone is erased by every
      // other mode's run-end write — silently, with no test naming the function that did
      // it. The compiler forces `cloneTelemetryBlob` to NAME the field (`error TS2741` at
      // its declaration, measured); it cannot see whether the field is CARRIED or reset.
      const ordinary = store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[1]!,
        score: 25,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 3, livesLost: 3 }),
      });
      expect(
        ordinary.newlyUnlocked,
        'the second run must cross nothing, or this case is measuring a new unlock rather than the survival of the old one',
      ).toEqual([]);

      const after = (await store.getSnapshot()).telemetry.achievements.unlocked;
      expect(
        after.map((e) => e.id).sort(),
        'D-23: every id present before the ordinary run is still present after it. A `cloneTelemetryBlob` that dropped the field would report an EMPTY set here while every other assertion in this file stayed green',
      ).toEqual(before.map((e) => e.id).sort());
      expect(
        after.find((e) => e.id === CONTROL_ID)?.at,
        'and the moment did not move — carried, not re-stamped (D-17)',
      ).toBe(at);
    });

    it('a hostile blob cannot grow the stored collection past the catalog’s size — the cardinality alarm (T-13-02)', async () => {
      const padding = Array.from({ length: ACHIEVEMENT_UNLOCK_BOUND * 4 }, (_, i) => ({
        id: `not-an-achievement-${i}`,
        at: 1_600_000_000_000 + i,
      }));
      const real = CATALOG_IDS.slice(0, 2).map((id, i) => ({
        id,
        at: 1_650_000_000_000 + i,
      }));
      const seeded = [...padding, ...real];
      expect(
        seeded.length,
        'the seed must exceed ACHIEVEMENT_UNLOCK_BOUND, or the alarm cannot detect a collection that grows without limit',
      ).toBeGreaterThan(ACHIEVEMENT_UNLOCK_BOUND);

      const blob = defaultProgressBlob();
      blob.telemetry.achievements = { unlocked: seeded };
      const store = flavor.fromRaw(JSON.stringify(blob));
      await store.getSnapshot(); // hydrate, as the hosts do

      store.recordRunEnd({
        mode: 'campaign',
        levelId: PLAYABLE_LEVEL_ORDER[0]!,
        score: 100,
        outcome: 'win',
        livesRemaining: 2,
        stats: runStats({ bricksBroken: 10, livesLost: 1 }),
      });

      const stored = (await store.getSnapshot()).telemetry.achievements.unlocked;
      expect(
        stored.length,
        `a hand-edited blob carrying ${seeded.length} entries must not produce more than the catalog's ${ACHIEVEMENT_CATALOG.length}; it produced ${stored.length}. The defect family this watches for is sanitizeAggregateMap in the same parser, which has NO cap at all and copies every key it finds on every read — WINDOWS #27 measured 5 000 injected keys surviving parseProgressResult with status 'ok'. This collection is bounded only because it is an ARRAY with a bound whose ids are validated; relax either and it becomes that map.`,
      ).toBeLessThanOrEqual(ACHIEVEMENT_CATALOG.length);
      // Non-vacuity: the two REAL seeded unlocks survived, so the cap above is a cap and
      // not a sanitizer that discarded the whole field.
      expect(
        stored.map((e) => e.id),
        'the real unlocks in the hostile blob are kept — a hostile blob yields FEWER achievements than a clean one and never more, which is the phase invariant',
      ).toContain(real[0]!.id);
      // And none of the invented ids reached the store.
      expect(
        stored.filter((e) => e.id.startsWith('not-an-achievement')),
        'no invented id survives to reach the host, let alone a rendered Text (T-13-01)',
      ).toEqual([]);
    });
  });
}

recordSuite({
  label: 'memory store',
  make: () => createMemoryProgressStore(),
  fromRaw: (raw) => createMemoryProgressStore(parseProgressResult(raw).progress),
  // No disk: see the explicit skip in the suite body.
  coldStart: null,
});
recordSuite({
  label: 'AsyncStorage-backed store',
  make: () => __createAsyncStorageProgressStoreForTests(fakeAsyncStorage()),
  fromRaw: (raw) =>
    __createAsyncStorageProgressStoreForTests(fakeAsyncStorage({ [PROGRESS_KEY]: raw })),
  coldStart: () => {
    const storage = fakeAsyncStorage();
    return {
      live: __createAsyncStorageProgressStoreForTests(storage),
      persisted: () => storage.map.get(PROGRESS_KEY) ?? null,
      relaunch: () => __createAsyncStorageProgressStoreForTests(storage),
    };
  },
});
