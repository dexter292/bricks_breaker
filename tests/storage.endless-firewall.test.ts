/**
 * SC-3 / N-END-02 — the endless firewall.
 *
 * Research found a live defect: `recordRunEnd` wrote `bestByLevel`, raised
 * `blob.bestScore` (inside `applyLevelBest`) and called `unlockAfterClearPure`
 * for EVERY mode, with no reference to `args.mode` — so the first endless win
 * would silently write a campaign best and unlock a campaign level. This file is
 * the proof that it cannot, asserted SEPARATELY for the memory store and the
 * AsyncStorage-backed store, because they are two hand-mirrored implementations
 * and a gate added to one is no evidence about the other.
 *
 * The guarantee has two halves and both are checked here:
 *   - runtime: the `args.mode === 'campaign'` gate in both stores (the `it`s below);
 *   - compile time: `RecordRunEndArgs` is a discriminated union whose endless arm
 *     has no `levelId`, pinned by the `@ts-expect-error` case — which fails
 *     `npm run typecheck` if the union ever collapses back to a flat type.
 *
 * Level ids come from `PLAYABLE_LEVEL_ORDER`, never as literals: the campaign
 * order has been reshuffled once already (E2).
 */
import { describe, it, expect } from 'vitest';
import {
  ENDLESS_TELEMETRY_KEY,
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

/**
 * One suite body, run against each store implementation. Both stores implement
 * the same `ProgressStore` interface, and SC-3 is a claim about that interface —
 * so the assertions are identical by construction and a gate that lands in only
 * one store fails here loudly.
 */
function firewallSuite(label: string, makeStore: () => ProgressStore): void {
  describe(`endless firewall — ${label} (SC-3 / N-END-02)`, () => {
    it('an endless win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values', async () => {
      const store = makeStore();
      const before = await store.getSnapshot();

      store.recordRunEnd({
        mode: 'endless',
        wave: 14,
        score: 8_400,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: 260, ticksPlayed: 30_000 }),
      });

      const after = await store.getSnapshot();
      expect(after.unlocked).toEqual(before.unlocked);
      expect(after.bestByLevel).toEqual(before.bestByLevel);
      expect(after.bestScore).toBe(before.bestScore);
      // The defect wrote `bestByLevel[undefined]`; assert the map gained no key at all.
      expect(Object.keys(after.bestByLevel)).toEqual(Object.keys(before.bestByLevel));
      // `bestScore` is the campaign Title rollup — an 8 400-point endless run must
      // not raise it even though it dwarfs every campaign score.
      expect(after.bestScore).toBe(0);
    });

    it('the same endless win DOES raise the endless record and DOES bump the byMode.endless aggregate', async () => {
      const store = makeStore();

      store.recordRunEnd({
        mode: 'endless',
        wave: 14,
        score: 8_400,
        outcome: 'win',
        livesRemaining: 3,
        stats: runStats({ bricksBroken: 260, ticksPlayed: 30_000 }),
      });

      const after = await store.getSnapshot();
      // Proof the write LANDED rather than being dropped by the gate.
      expect(after.telemetry.endless).toEqual({ bestWave: 14, bestScore: 8_400 });
      expect(after.telemetry.byMode.endless[ENDLESS_TELEMETRY_KEY]?.runsPlayed).toBe(1);
      expect(after.telemetry.byMode.endless[ENDLESS_TELEMETRY_KEY]?.bricksBroken).toBe(260);
      expect(after.telemetry.lifetime.runsPlayed).toBe(1);
      // …and it landed under the D-12 constant key, not under a campaign level id.
      expect(after.telemetry.byMode.campaign).toEqual({});
    });

    it('a campaign win against the same store still unlocks, still writes bestByLevel and still raises bestScore — the gate did not break the existing path', async () => {
      const first = PLAYABLE_LEVEL_ORDER[0];
      const second = PLAYABLE_LEVEL_ORDER[1];
      const store = makeStore();

      // An endless run first, so the campaign path is exercised on a store that
      // has already taken an endless write.
      store.recordRunEnd({
        mode: 'endless',
        wave: 4,
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
      // The earlier endless run is still recorded and still did not leak.
      expect(after.telemetry.endless).toEqual({ bestWave: 4, bestScore: 500 });
      expect(after.telemetry.lifetime.runsPlayed).toBe(2);
    });

    it('an endless run worse on both axes leaves the record at its previous maxima', async () => {
      const store = makeStore();

      store.recordRunEnd({
        mode: 'endless',
        wave: 21,
        score: 9_000,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 400 }),
      });
      store.recordRunEnd({
        mode: 'endless',
        wave: 2,
        score: 120,
        outcome: 'lose',
        livesRemaining: 0,
        stats: runStats({ bricksBroken: 12 }),
      });

      const after = await store.getSnapshot();
      expect(after.telemetry.endless).toEqual({ bestWave: 21, bestScore: 9_000 });
      // The aggregate still counts both runs — only the record is a max.
      expect(after.telemetry.byMode.endless[ENDLESS_TELEMETRY_KEY]?.runsPlayed).toBe(2);
      expect(after.telemetry.byMode.endless[ENDLESS_TELEMETRY_KEY]?.bricksBroken).toBe(412);
      // And still nothing campaign-side moved.
      expect(after.bestScore).toBe(0);
      expect(after.bestByLevel).toEqual({});
      expect(after.unlocked).toEqual(['level-01']);
    });

    it('a campaign-shaped argument cannot be supplied on the endless arm — the compile-time half of SC-3 (D-11)', () => {
      const store = makeStore();

      // If `RecordRunEndArgs` ever collapses back to a flat type with an always-
      // present `levelId`, this line stops erroring and `npm run typecheck` fails
      // on the unused @ts-expect-error — which is exactly the regression alarm.
      store.recordRunEnd({
        mode: 'endless',
        // @ts-expect-error — the endless arm has no `levelId`; campaign fields are
        // unreachable from a non-campaign run at the type level (D-11 / SC-3).
        levelId: PLAYABLE_LEVEL_ORDER[0],
        wave: 1,
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
