/**
 * N-STAT-02 — Wave 0 scaffold for ProgressBlob v4 (Phase 9, Plan 00 Task 2).
 *
 * Every case is an `it.todo` on purpose: this file is created BEFORE the v4 schema,
 * parse, migrate and store work exists (Plans 02/03), so it imports only the barrel
 * export that is already safe today. The todo strings ARE the acceptance checklist
 * Plans 02/03 must turn green.
 *
 * Phase-9 decision anchors (`.planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md`):
 *   D-03 outcome is `win | lose | abandoned` · D-04 v4 is mode-aware from the start
 *   D-05 bounded `recentRuns` ring buffer · D-07/D-08/D-10 counter aggregation semantics
 * Carried lock (C1 D-09): parse is fail-soft — corrupt or partial data degrades to
 * defaults and never throws into gameplay. Research Pitfall 4: telemetry corruption must
 * degrade telemetry ALONE, never the sibling progress fields.
 */
import { describe, it, expect } from 'vitest';
import {
  PLAYABLE_LEVEL_ORDER,
  PROGRESS_KEY,
  PROGRESS_KEY_V3,
  PROGRESS_VERSION,
  RECENT_RUNS_BOUND,
  createMemoryProgressStore,
  defaultProgressBlob,
  defaultRunStatsInput,
  defaultTelemetryBlob,
  mergeHighWatermark,
  mergeRunIntoTelemetry,
  mergeTelemetryBlobs,
  migrateOrDefault,
  parseProgressResult,
  defaultTelemetryAggregate,
  v3ToV4,
  type ProgressBlob,
  type RunStatsInput,
} from '../src/services/storage';
import { __createAsyncStorageProgressStoreForTests } from '../src/services/storage/asyncStorageStore';

/**
 * A realistic "existing player" v3 blob, shaped exactly like today's persisted
 * `@nbb/progress/v3` value: three levels unlocked, two of them with recorded bests, and
 * a rolled-up title PB. Plan 03's v3→v4 round-trip test asserts migration loses none of
 * it, so the fixture shape is fixed here rather than invented under implementation
 * pressure. Keys come from `PLAYABLE_LEVEL_ORDER` — the campaign order has been
 * reshuffled once already (E2), so nothing here hard-codes a level id.
 *
 * Exported so Plan 03 can consume it directly (and so it does not read as dead code
 * while every case below is still a todo).
 */
export function buildV3Fixture() {
  const first = PLAYABLE_LEVEL_ORDER[0] as string;
  const second = PLAYABLE_LEVEL_ORDER[1] as string;
  return {
    v: 3,
    unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
    bestByLevel: {
      [first]: { score: 1200, stars: 3 },
      [second]: { score: 640, stars: 2 },
    },
    bestScore: 1200,
    updatedAt: 1700000000000,
  };
}

/** All-zero per-run counters with only the fields a case cares about set. */
function runStats(over: Partial<RunStatsInput> = {}): RunStatsInput {
  return { ...defaultRunStatsInput(), ...over };
}

describe('PROGRESS_KEY / VERSION (v4)', () => {
  it('PROGRESS_KEY is @nbb/progress/v4 and PROGRESS_VERSION is 4; PROGRESS_KEY_V3 preserves the old @nbb/progress/v3 string as a legacy migrate-on-read source', () => {
    expect(PROGRESS_VERSION).toBe(4);
    expect(PROGRESS_KEY).toBe('@nbb/progress/v4');
    // Legacy keys are never deleted — they stay as migrate-on-read sources.
    expect(PROGRESS_KEY_V3).toBe('@nbb/progress/v3');
    const b = defaultProgressBlob();
    expect(b.v).toBe(4);
    expect(b.unlocked).toEqual(['level-01']);
    expect(b.bestByLevel).toEqual({});
    expect(b.bestScore).toBe(0);
    expect(b.telemetry).toEqual(defaultTelemetryBlob());
  });
});

describe('migrateOrDefault (v4, extends the existing v3/v2/v1 chain)', () => {
  it('valid v4 is preferred over v3/v2/v1', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const v4 = JSON.stringify({
      v: 4,
      unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
      bestByLevel: { [first]: { score: 5, stars: 2 } },
      bestScore: 5,
      updatedAt: 3,
      telemetry: defaultTelemetryBlob(),
    });
    const v3 = JSON.stringify(buildV3Fixture());
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01'],
      bestByLevel: { 'level-01': 999 },
      bestScore: 999,
      updatedAt: 2,
    });
    const v1 = JSON.stringify({ v: 1, bestScore: 50_000, updatedAt: 1 });

    const m = migrateOrDefault(v4, v3, v2, v1);
    expect(m.v).toBe(4);
    expect(m.bestScore).toBe(5);
    expect(m.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
  });

  it('absent/corrupt v4 + valid v3 (buildV3Fixture) heals into v4 losing zero unlocked/bestByLevel/bestScore entries — v3ToV4 is lossless', () => {
    const fixture = buildV3Fixture();
    const m = migrateOrDefault(null, JSON.stringify(fixture), null, null);

    expect(m.v).toBe(4);
    expect(m.unlocked).toEqual(fixture.unlocked);
    expect(m.bestByLevel).toEqual(fixture.bestByLevel);
    expect(m.bestScore).toBe(fixture.bestScore);
    expect(m.updatedAt).toBe(fixture.updatedAt);
    // A fresh v4 blob starts with empty telemetry — nothing to back-fill from v3.
    expect(m.telemetry).toEqual(defaultTelemetryBlob());
  });

  it('absent v4 and v3 falls back to the existing v2/v1 chain unchanged', () => {
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': 77 },
      bestScore: 77,
      updatedAt: 2,
    });
    const fromV2 = migrateOrDefault(null, null, v2, null);
    expect(fromV2.v).toBe(4);
    expect(fromV2.bestScore).toBe(77);
    expect(fromV2.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
    expect(fromV2.bestByLevel['level-01']).toEqual({ score: 77 });

    const v1 = JSON.stringify({ v: 1, bestScore: 42, updatedAt: 1 });
    const fromV1 = migrateOrDefault(null, null, null, v1);
    expect(fromV1.v).toBe(4);
    expect(fromV1.bestScore).toBe(42);
    expect(fromV1.unlocked).toEqual(['level-01']);
    expect(fromV1.bestByLevel).toEqual({});

    expect(migrateOrDefault(null, null, null, null)).toEqual(defaultProgressBlob());
  });

  it('corrupt v4 does not prevent the v3 fallback from running', () => {
    const fixture = buildV3Fixture();
    const m = migrateOrDefault('{broken', JSON.stringify(fixture), null, null);
    expect(m.v).toBe(4);
    expect(m.bestScore).toBe(fixture.bestScore);
    expect(m.bestByLevel).toEqual(fixture.bestByLevel);

    // v3ToV4 alone is a pure, lossless structural copy.
    const direct = v3ToV4({
      v: 3,
      unlocked: [...fixture.unlocked] as never,
      bestByLevel: fixture.bestByLevel as never,
      bestScore: fixture.bestScore,
      updatedAt: fixture.updatedAt,
    });
    expect(direct.v).toBe(4);
    expect(direct.unlocked).toEqual(fixture.unlocked);
    expect(direct.bestByLevel).toEqual(fixture.bestByLevel);
    expect(direct.telemetry).toEqual(defaultTelemetryBlob());
  });
});

describe('parseProgressResult (v4, telemetry validated independently — Pitfall 4)', () => {
  it('ok v4 blob parses unlocked/bestByLevel/bestScore/telemetry all correctly', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.runsPlayed = 9;
    telemetry.lifetime.runsWon = 4;
    telemetry.lifetime.bricksBroken = 812;
    telemetry.lifetime.bestComboEver = 11;
    telemetry.lifetime.longestRallyEver = 23;
    telemetry.lifetime.largestCascadeEver = 6;
    telemetry.byMode.campaign[first] = {
      ...telemetry.lifetime,
    };
    telemetry.recentRuns.push({
      mode: 'campaign',
      levelId: first,
      outcome: 'win',
      score: 1200,
      ticks: 3600,
      timestamp: 1700000000000,
    });

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 1200, stars: 3 } },
        bestScore: 1200,
        updatedAt: 1700000000000,
        telemetry,
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.v).toBe(4);
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1200, stars: 3 });
    expect(r.progress.bestScore).toBe(1200);
    expect(r.progress.telemetry).toEqual(telemetry);
  });

  it('corrupt telemetry sub-object alone degrades ONLY telemetry to defaultTelemetryBlob(); unlocked/bestByLevel/bestScore survive untouched', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 640, stars: 2 } },
        bestScore: 640,
        updatedAt: 42,
        telemetry: 'not-an-object',
      }),
    );

    // SC-4: corrupt telemetry must NOT make the whole blob read as corrupt…
    expect(r.status).toBe('ok');
    // …and must not wipe the sibling progress fields.
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 640, stars: 2 });
    expect(r.progress.bestScore).toBe(640);
    expect(r.progress.updatedAt).toBe(42);
    // Only telemetry degrades.
    expect(r.progress.telemetry).toEqual(defaultTelemetryBlob());
  });

  it('partial telemetry keeps the fields it does have and defaults only the missing/invalid ones', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 10 } },
        bestScore: 10,
        updatedAt: 1,
        telemetry: {
          lifetime: { runsPlayed: 3, bricksBroken: 'nope', bestComboEver: 7 },
          byMode: { campaign: { [first]: { runsPlayed: 3 } } },
          recentRuns: [
            { mode: 'campaign', levelId: first, outcome: 'win', score: 5, ticks: 9, timestamp: 1 },
            { mode: 'bogus-mode', levelId: first, outcome: 'win', score: 5, ticks: 9, timestamp: 2 },
          ],
        },
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.bestScore).toBe(10);
    expect(r.progress.telemetry.lifetime.runsPlayed).toBe(3);
    expect(r.progress.telemetry.lifetime.bestComboEver).toBe(7);
    // Invalid counter degrades to 0, siblings survive.
    expect(r.progress.telemetry.lifetime.bricksBroken).toBe(0);
    expect(r.progress.telemetry.byMode.campaign[first]?.runsPlayed).toBe(3);
    // Unknown mode entries are dropped, valid ones kept.
    expect(r.progress.telemetry.recentRuns).toHaveLength(1);
    expect(r.progress.telemetry.recentRuns[0]?.timestamp).toBe(1);
  });

  it('structurally corrupt top-level JSON degrades the whole blob to defaults and never throws', () => {
    expect(() => parseProgressResult('{not-json')).not.toThrow();
    expect(parseProgressResult('{not-json').status).toBe('corrupt');
    expect(parseProgressResult('{not-json').progress).toEqual(defaultProgressBlob());
    // Wrong version under the v4 key is corrupt, not silently accepted.
    expect(
      parseProgressResult(
        JSON.stringify({ v: 3, unlocked: ['level-01'], bestByLevel: {}, bestScore: 1 }),
      ).status,
    ).toBe('corrupt');
    // null → absent (not corrupt), with defaults.
    const absent = parseProgressResult(null);
    expect(absent.status).toBe('absent');
    expect(absent.progress).toEqual(defaultProgressBlob());
  });
});

describe('recordRunEnd (v4, mode-aware, D-03/D-04)', () => {
  it('win/lose behave exactly as v3 (stars/unlock win-gated); abandoned outcome merges score/stats but never touches stars/unlock', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const second = PLAYABLE_LEVEL_ORDER[1];
    const third = PLAYABLE_LEVEL_ORDER[2];
    const store = createMemoryProgressStore();

    // WIN — stars from lives, and the next catalog level unlocks (v3 behaviour).
    const afterWin = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 100,
      outcome: 'win',
      livesRemaining: 2,
      stats: runStats({ bricksBroken: 10 }),
    });
    expect(afterWin.bestByLevel[first]).toEqual({ score: 100, stars: 2 });
    expect(afterWin.unlocked).toEqual([first, second]);
    expect(afterWin.bestScore).toBe(100);
    expect(afterWin.telemetry.lifetime.runsWon).toBe(1);

    // LOSE — score still merges, stars are NOT recomputed from livesRemaining,
    // and nothing new unlocks.
    const afterLose = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 250,
      outcome: 'lose',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 5 }),
    });
    expect(afterLose.bestByLevel[first]).toEqual({ score: 250, stars: 2 });
    expect(afterLose.unlocked).toEqual([first, second]);
    expect(afterLose.bestScore).toBe(250);
    expect(afterLose.telemetry.lifetime.runsLost).toBe(1);

    // ABANDONED — falls into the same non-win branch as lose: score merges, no
    // stars are awarded, and the unlock ladder does not advance (D-03).
    const afterAbandon = store.recordRunEnd({
      mode: 'campaign',
      levelId: second,
      score: 40,
      outcome: 'abandoned',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 3 }),
    });
    expect(afterAbandon.bestByLevel[second]).toEqual({ score: 40 });
    expect(afterAbandon.bestByLevel[second]?.stars).toBeUndefined();
    expect(afterAbandon.unlocked).toEqual([first, second]);
    expect(await store.isUnlocked(third)).toBe(false);

    // …but telemetry still counts it (research Assumption A1).
    expect(afterAbandon.telemetry.lifetime.runsAbandoned).toBe(1);
    expect(afterAbandon.telemetry.lifetime.runsPlayed).toBe(3);
    expect(afterAbandon.telemetry.lifetime.bricksBroken).toBe(18);
  });

  it('stats aggregate into both telemetry.lifetime and telemetry.byMode.campaign[levelId]', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const second = PLAYABLE_LEVEL_ORDER[1];
    const store = createMemoryProgressStore();

    store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 100,
      outcome: 'win',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 30, ticksPlayed: 600, wallClockMs: 10_000 }),
    });
    const blob = store.recordRunEnd({
      mode: 'campaign',
      levelId: second,
      score: 60,
      outcome: 'lose',
      livesRemaining: 0,
      stats: runStats({ bricksBroken: 12, ticksPlayed: 300, wallClockMs: 5_000 }),
    });

    // Lifetime rolls both runs up…
    expect(blob.telemetry.lifetime.runsPlayed).toBe(2);
    expect(blob.telemetry.lifetime.bricksBroken).toBe(42);
    expect(blob.telemetry.lifetime.ticksPlayed).toBe(900);
    expect(blob.telemetry.lifetime.wallClockMsTotal).toBe(15_000);

    // …while each (mode, levelId) bucket keeps only its own.
    expect(blob.telemetry.byMode.campaign[first]?.runsPlayed).toBe(1);
    expect(blob.telemetry.byMode.campaign[first]?.bricksBroken).toBe(30);
    expect(blob.telemetry.byMode.campaign[second]?.runsPlayed).toBe(1);
    expect(blob.telemetry.byMode.campaign[second]?.bricksBroken).toBe(12);
    // Only campaign is written this phase (D-04).
    expect(blob.telemetry.byMode.endless).toEqual({});
    expect(blob.telemetry.byMode.daily).toEqual({});

    // The returned blob is a deep clone — mutating it cannot reach into the store.
    blob.telemetry.lifetime.bricksBroken = 9_999;
    blob.telemetry.recentRuns.length = 0;
    const snap = await store.getSnapshot();
    expect(snap.telemetry.lifetime.bricksBroken).toBe(42);
    expect(snap.telemetry.recentRuns).toHaveLength(2);
  });

  it('per-pickup-type and cascade/rally fields aggregate with the correct sum-vs-max semantics (D-07/D-08/D-10)', () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const store = createMemoryProgressStore();

    store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 100,
      outcome: 'win',
      livesRemaining: 3,
      stats: runStats({
        bricksBroken: 30,
        bestCombo: 11,
        longestRally: 9,
        largestCascade: 6,
        pickupMultiball: 2,
        pickupExpand: 1,
        pickupExtraLife: 1,
        pickupSlow: 3,
        pickupFireball: 1,
        livesLost: 1,
        ticksPlayed: 600,
        wallClockMs: 10_000,
      }),
    });

    // Second run deliberately has a LOWER bestCombo/largestCascade and a HIGHER
    // longestRally, so a regression in the max logic cannot hide.
    const blob = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 20,
      outcome: 'abandoned',
      livesRemaining: 3,
      stats: runStats({
        bricksBroken: 12,
        bestCombo: 4,
        longestRally: 20,
        largestCascade: 2,
        pickupMultiball: 1,
        pickupSlow: 1,
        livesLost: 2,
        ticksPlayed: 300,
        wallClockMs: 5_000,
      }),
    });

    const life = blob.telemetry.lifetime;
    // *Ever fields take a running max and never regress…
    expect(life.bestComboEver).toBe(11);
    expect(life.longestRallyEver).toBe(20);
    expect(life.largestCascadeEver).toBe(6);
    // …and combo (brick hits without paddle contact) stays a DIFFERENT metric
    // from rally (paddle hits without losing a life) — D-10 keeps them distinct.
    expect(life.bestComboEver).not.toBe(life.longestRallyEver);

    // Every cumulative counter sums, per pickup type.
    expect(life.bricksBroken).toBe(42);
    expect(life.pickupMultiball).toBe(3);
    expect(life.pickupExpand).toBe(1);
    expect(life.pickupExtraLife).toBe(1);
    expect(life.pickupSlow).toBe(4);
    expect(life.pickupFireball).toBe(1);
    expect(life.livesLost).toBe(3);
    expect(life.ticksPlayed).toBe(900);
    expect(life.wallClockMsTotal).toBe(15_000);

    // One level played ⇒ its bucket mirrors lifetime exactly.
    expect(blob.telemetry.byMode.campaign[first]).toEqual(life);

    // The abandoned second run left the win's stars and unlock ladder alone.
    expect(blob.bestByLevel[first]).toEqual({ score: 100, stars: 3 });
    expect(blob.unlocked).toEqual([first, PLAYABLE_LEVEL_ORDER[1]]);
  });
});

describe('recentRuns ring buffer (D-05)', () => {
  it('recentRuns never exceeds RECENT_RUNS_BOUND entries; oldest is evicted first (FIFO)', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    let telemetry = defaultTelemetryBlob();
    for (let i = 0; i < RECENT_RUNS_BOUND + 10; i++) {
      telemetry = mergeRunIntoTelemetry(telemetry, {
        mode: 'campaign',
        levelId: first,
        outcome: 'win',
        score: i,
        stats: { ...defaultRunStatsInput(), ticksPlayed: i },
      });
    }
    expect(telemetry.recentRuns).toHaveLength(RECENT_RUNS_BOUND);
    // Oldest evicted first: the surviving window is the LAST RECENT_RUNS_BOUND writes.
    expect(telemetry.recentRuns[0]?.score).toBe(10);
    expect(telemetry.recentRuns[RECENT_RUNS_BOUND - 1]?.score).toBe(
      RECENT_RUNS_BOUND + 9,
    );
    expect(telemetry.lifetime.runsPlayed).toBe(RECENT_RUNS_BOUND + 10);
  });

  it('each entry is the small shape: mode, levelId, outcome, score, ticks, timestamp — no full stats blob', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const telemetry = mergeRunIntoTelemetry(defaultTelemetryBlob(), {
      mode: 'campaign',
      levelId: first,
      outcome: 'abandoned',
      score: 321,
      stats: { ...defaultRunStatsInput(), ticksPlayed: 900, bricksBroken: 44 },
    });
    const entry = telemetry.recentRuns[0];
    expect(entry).toBeDefined();
    expect(Object.keys(entry as object).sort()).toEqual([
      'levelId',
      'mode',
      'outcome',
      'score',
      'ticks',
      'timestamp',
    ]);
    expect(entry?.outcome).toBe('abandoned');
    expect(entry?.score).toBe(321);
    expect(entry?.ticks).toBe(900);
    expect(typeof entry?.timestamp).toBe('number');
  });
});

describe('telemetry merge semantics (D-07/D-08/D-10, Plan 02 helpers)', () => {
  it('mergeRunIntoTelemetry sums cumulative fields and maxes the *Ever fields, in lifetime and byMode alike', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const runA = {
      ...defaultRunStatsInput(),
      bricksBroken: 30,
      bestCombo: 7,
      longestRally: 12,
      largestCascade: 5,
      pickupMultiball: 2,
      pickupFireball: 1,
      livesLost: 1,
      ticksPlayed: 600,
      wallClockMs: 10_000,
    };
    const runB = {
      ...defaultRunStatsInput(),
      bricksBroken: 12,
      bestCombo: 4,
      longestRally: 25,
      largestCascade: 3,
      pickupExpand: 1,
      livesLost: 3,
      ticksPlayed: 300,
      wallClockMs: 5_000,
    };

    let t = mergeRunIntoTelemetry(defaultTelemetryBlob(), {
      mode: 'campaign',
      levelId: first,
      outcome: 'win',
      score: 100,
      stats: runA,
    });
    t = mergeRunIntoTelemetry(t, {
      mode: 'campaign',
      levelId: first,
      outcome: 'lose',
      score: 50,
      stats: runB,
    });

    expect(t.lifetime.runsPlayed).toBe(2);
    expect(t.lifetime.runsWon).toBe(1);
    expect(t.lifetime.runsLost).toBe(1);
    expect(t.lifetime.runsAbandoned).toBe(0);
    // Cumulative
    expect(t.lifetime.bricksBroken).toBe(42);
    expect(t.lifetime.livesLost).toBe(4);
    expect(t.lifetime.ticksPlayed).toBe(900);
    expect(t.lifetime.wallClockMsTotal).toBe(15_000);
    expect(t.lifetime.pickupMultiball).toBe(2);
    expect(t.lifetime.pickupExpand).toBe(1);
    expect(t.lifetime.pickupFireball).toBe(1);
    // Running maxes — combo and rally are DISTINCT metrics (D-10)
    expect(t.lifetime.bestComboEver).toBe(7);
    expect(t.lifetime.longestRallyEver).toBe(25);
    expect(t.lifetime.largestCascadeEver).toBe(5);
    // Per-(mode, level) mirrors lifetime when only one level was played
    expect(t.byMode.campaign[first]).toEqual(t.lifetime);
    expect(t.byMode.endless).toEqual({});
    expect(t.byMode.daily).toEqual({});
  });

  it('mergeTelemetryBlobs sums cumulative, maxes *Ever, unions byMode keys and bounds recentRuns by timestamp', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const second = PLAYABLE_LEVEL_ORDER[1] as string;

    const a = mergeRunIntoTelemetry(defaultTelemetryBlob(), {
      mode: 'campaign',
      levelId: first,
      outcome: 'win',
      score: 10,
      stats: { ...defaultRunStatsInput(), bricksBroken: 5, bestCombo: 9, ticksPlayed: 100 },
    });
    a.recentRuns[0]!.timestamp = 1;

    const b = mergeRunIntoTelemetry(defaultTelemetryBlob(), {
      mode: 'campaign',
      levelId: second,
      outcome: 'abandoned',
      score: 4,
      stats: { ...defaultRunStatsInput(), bricksBroken: 7, bestCombo: 3, ticksPlayed: 50 },
    });
    b.recentRuns[0]!.timestamp = 2;

    const merged = mergeTelemetryBlobs(a, b);
    expect(merged.lifetime.runsPlayed).toBe(2);
    expect(merged.lifetime.bricksBroken).toBe(12);
    expect(merged.lifetime.ticksPlayed).toBe(150);
    expect(merged.lifetime.bestComboEver).toBe(9);
    // byMode keys are unioned, not replaced
    expect(merged.byMode.campaign[first]?.bricksBroken).toBe(5);
    expect(merged.byMode.campaign[second]?.bricksBroken).toBe(7);
    // recentRuns concatenated, sorted ascending by timestamp, bounded
    expect(merged.recentRuns.map((e) => e.timestamp)).toEqual([1, 2]);
    expect(merged.recentRuns.length).toBeLessThanOrEqual(RECENT_RUNS_BOUND);
  });

  it('mergeHighWatermark (v4) never lowers progress watermarks and merges telemetry', () => {
    const memory = defaultProgressBlob();
    memory.unlocked = [...PLAYABLE_LEVEL_ORDER.slice(0, 2)];
    memory.bestByLevel = { 'level-01': { score: 200, stars: 3 } };
    memory.bestScore = 200;
    memory.updatedAt = 50;
    memory.telemetry.lifetime.bricksBroken = 10;
    memory.telemetry.lifetime.bestComboEver = 8;

    const incoming = defaultProgressBlob();
    incoming.unlocked = ['level-01'];
    incoming.bestByLevel = { 'level-01': { score: 10 } };
    incoming.bestScore = 10;
    incoming.updatedAt = 1;
    incoming.telemetry.lifetime.bricksBroken = 5;
    incoming.telemetry.lifetime.bestComboEver = 3;

    const merged = mergeHighWatermark(memory, incoming);
    expect(merged.v).toBe(4);
    expect(merged.bestByLevel['level-01']).toEqual({ score: 200, stars: 3 });
    expect(merged.bestScore).toBe(200);
    expect(merged.updatedAt).toBe(50);
    expect(merged.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
    expect(merged.telemetry.lifetime.bricksBroken).toBe(15);
    expect(merged.telemetry.lifetime.bestComboEver).toBe(8);
  });
});

describe('lifetime + per-level aggregates survive an app kill (SC-2)', () => {
  it('re-instantiating a store from a previously persisted v4 JSON string reproduces identical lifetime + byMode aggregates', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const second = PLAYABLE_LEVEL_ORDER[1];

    const live = createMemoryProgressStore();
    live.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 900,
      outcome: 'win',
      livesRemaining: 2,
      stats: runStats({
        bricksBroken: 55,
        bestCombo: 13,
        longestRally: 21,
        largestCascade: 4,
        pickupMultiball: 2,
        livesLost: 1,
        ticksPlayed: 1_200,
        wallClockMs: 20_000,
      }),
    });
    live.recordRunEnd({
      mode: 'campaign',
      levelId: second,
      score: 310,
      outcome: 'abandoned',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 18, bestCombo: 5, ticksPlayed: 400, wallClockMs: 7_000 }),
    });
    const before = await live.getSnapshot();

    // App kill: the only thing that survives is the JSON string on disk, so the
    // round-trip must go through the real persist/parse path — not a live object.
    const persisted = JSON.stringify(before);
    const reread = parseProgressResult(persisted);
    expect(reread.status).toBe('ok');

    const relaunched = createMemoryProgressStore(reread.progress);
    const after = await relaunched.getSnapshot();

    expect(after.telemetry).toEqual(before.telemetry);
    expect(after.telemetry.lifetime.runsPlayed).toBe(2);
    expect(after.telemetry.lifetime.bricksBroken).toBe(73);
    expect(after.telemetry.lifetime.bestComboEver).toBe(13);
    expect(after.telemetry.byMode.campaign[first]?.bricksBroken).toBe(55);
    expect(after.telemetry.byMode.campaign[second]?.bricksBroken).toBe(18);
    expect(after.telemetry.recentRuns).toHaveLength(2);
    // Progress fields survive the same trip.
    expect(after.unlocked).toEqual(before.unlocked);
    expect(after.bestByLevel).toEqual(before.bestByLevel);
    expect(after.bestScore).toBe(before.bestScore);

    // The relaunched store accumulates ON TOP of the restored counters rather
    // than starting a fresh tally.
    const next = relaunched.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 10,
      outcome: 'lose',
      livesRemaining: 0,
      stats: runStats({ bricksBroken: 7 }),
    });
    expect(next.telemetry.lifetime.runsPlayed).toBe(3);
    expect(next.telemetry.lifetime.bricksBroken).toBe(80);
    expect(next.telemetry.byMode.campaign[first]?.bricksBroken).toBe(62);
  });
});

/**
 * An in-memory AsyncStorage double. `getItem`/`setItem` are genuinely async, so
 * overlapping calls interleave exactly as they do on a device — which is what
 * makes the single-flight hydration case below reproducible.
 */
function fakeAsyncStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  const reads: string[] = [];
  return {
    map,
    reads,
    getItem: async (key: string): Promise<string | null> => {
      reads.push(key);
      return map.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      map.set(key, value);
    },
  };
}

/** A persisted v4 blob with non-zero telemetry — the thing a re-merge would double. */
function diskBlobWithTelemetry(): ProgressBlob {
  const first = PLAYABLE_LEVEL_ORDER[0];
  const blob = defaultProgressBlob();
  blob.unlocked = [...PLAYABLE_LEVEL_ORDER.slice(0, 2)];
  blob.bestByLevel = { [first]: { score: 900, stars: 3 } };
  blob.bestScore = 900;
  blob.updatedAt = 1_700_000_000_000;
  blob.telemetry.lifetime = {
    ...defaultTelemetryAggregate(),
    runsPlayed: 5,
    runsWon: 3,
    runsLost: 2,
    bricksBroken: 250,
    bestComboEver: 14,
    longestRallyEver: 31,
    ticksPlayed: 4_000,
    wallClockMsTotal: 90_000,
  };
  blob.telemetry.byMode.campaign[first] = {
    ...defaultTelemetryAggregate(),
    runsPlayed: 5,
    bricksBroken: 250,
  };
  blob.telemetry.recentRuns = [
    {
      mode: 'campaign',
      levelId: first,
      outcome: 'win',
      score: 900,
      ticks: 800,
      timestamp: 1_699_000_000_000,
    },
  ];
  return blob;
}

describe('AsyncStorage-backed store: v4 hydrate chain (N-STAT-02)', () => {
  it('reads the v4 key first and never consults the legacy keys when it parses', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY]: JSON.stringify(diskBlobWithTelemetry()),
      [PROGRESS_KEY_V3]: JSON.stringify(buildV3Fixture()),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);

    const snap = await store.getSnapshot();
    expect(snap.v).toBe(4);
    expect(snap.bestScore).toBe(900);
    expect(snap.telemetry.lifetime.bricksBroken).toBe(250);
    expect(snap.telemetry.byMode.campaign[first]?.runsPlayed).toBe(5);
    expect(storage.reads).toEqual([PROGRESS_KEY]);
  });

  it('absent v4 migrates through v3 and writes the healed blob to the v4 key, leaving every legacy key on disk', async () => {
    const fixture = buildV3Fixture();
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY_V3]: JSON.stringify(fixture),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);

    const snap = await store.getSnapshot();
    expect(snap.v).toBe(4);
    expect(snap.bestScore).toBe(fixture.bestScore);
    expect(snap.bestByLevel).toEqual(fixture.bestByLevel);
    expect(snap.telemetry).toEqual(defaultTelemetryBlob());

    // v4 → v3 → v2 → v1 read order, and the healed blob writes through once.
    expect(storage.reads).toEqual([
      PROGRESS_KEY,
      PROGRESS_KEY_V3,
      '@nbb/progress/v2',
      '@nbb/personal-best/v1',
    ]);
    expect(parseProgressResult(storage.map.get(PROGRESS_KEY) ?? null).status).toBe('ok');
    // Legacy sources are migrate-on-read only — never deleted (rollback safety).
    expect(storage.map.get(PROGRESS_KEY_V3)).toBe(JSON.stringify(fixture));
  });

  it('corrupt v4 still falls through to the v2 then v1 links', async () => {
    const fromV2 = fakeAsyncStorage({
      [PROGRESS_KEY]: '{broken',
      '@nbb/progress/v2': JSON.stringify({
        v: 2,
        unlocked: ['level-01', 'level-04'],
        bestByLevel: { 'level-01': 77 },
        bestScore: 77,
        updatedAt: 2,
      }),
    });
    const v2Snap = await __createAsyncStorageProgressStoreForTests(fromV2).getSnapshot();
    expect(v2Snap.v).toBe(4);
    expect(v2Snap.bestScore).toBe(77);
    expect(v2Snap.telemetry).toEqual(defaultTelemetryBlob());

    const fromV1 = fakeAsyncStorage({
      [PROGRESS_KEY]: '{broken',
      '@nbb/personal-best/v1': JSON.stringify({ v: 1, bestScore: 42, updatedAt: 1 }),
    });
    expect(await __createAsyncStorageProgressStoreForTests(fromV1).getBest()).toBe(42);
  });

  it('recordRunEnd returns the merged blob synchronously and persists it to the v4 key', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY]: JSON.stringify(diskBlobWithTelemetry()),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);
    await store.getSnapshot(); // hydrate first, as the hosts do

    const returned = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 1_500,
      outcome: 'win',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 40, bestCombo: 20, ticksPlayed: 500 }),
    });

    // Synchronous return, merged on top of the hydrated disk counters (D-10 / F-26).
    expect(returned.bestScore).toBe(1_500);
    expect(returned.telemetry.lifetime.runsPlayed).toBe(6);
    expect(returned.telemetry.lifetime.bricksBroken).toBe(290);
    expect(returned.telemetry.lifetime.bestComboEver).toBe(20);

    await store.flush?.();
    const persisted = parseProgressResult(storage.map.get(PROGRESS_KEY) ?? null);
    expect(persisted.status).toBe('ok');
    expect(persisted.progress.telemetry.lifetime.runsPlayed).toBe(6);
    expect(persisted.progress.telemetry.lifetime.bricksBroken).toBe(290);
  });

  it('overlapping first reads hydrate once — mergeTelemetryBlobs never double-counts the persisted blob', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY]: JSON.stringify(diskBlobWithTelemetry()),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);

    // Title's getBest() and Select's getSnapshot() share one singleton (F-26),
    // so tapping Play before the first AsyncStorage read resolves puts two
    // hydrations in flight at once. mergeHighWatermark SUMS telemetry, so a
    // second merge of the same disk blob would permanently inflate lifetime
    // counters — and the next persist would write the inflated values back.
    const [best, snap] = await Promise.all([store.getBest(), store.getSnapshot()]);

    expect(best).toBe(900);
    expect(snap.telemetry.lifetime.runsPlayed).toBe(5);
    expect(snap.telemetry.lifetime.bricksBroken).toBe(250);
    expect(snap.telemetry.lifetime.ticksPlayed).toBe(4_000);
    expect(snap.telemetry.lifetime.wallClockMsTotal).toBe(90_000);
    expect(snap.telemetry.byMode.campaign[first]?.bricksBroken).toBe(250);
    expect(snap.telemetry.recentRuns).toHaveLength(1);
    // The disk read happens once, not once per caller.
    expect(storage.reads.filter((k) => k === PROGRESS_KEY)).toHaveLength(1);
  });

  it('re-reading an already-hydrated store is idempotent — repeated reads never grow the counters', async () => {
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY]: JSON.stringify(diskBlobWithTelemetry()),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);

    const once = await store.getSnapshot();
    await store.getBest();
    await store.isUnlocked(PLAYABLE_LEVEL_ORDER[1]);
    const again = await store.getSnapshot();

    expect(again.telemetry).toEqual(once.telemetry);
    expect(again.telemetry.lifetime.runsPlayed).toBe(5);
  });
});
