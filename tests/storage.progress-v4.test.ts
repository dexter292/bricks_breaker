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
  defaultProgressBlob,
  defaultTelemetryBlob,
  parseProgressResult,
} from '../src/services/storage';

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
  it.todo('valid v4 is preferred over v3/v2/v1');
  it.todo(
    'absent/corrupt v4 + valid v3 (buildV3Fixture) heals into v4 losing zero unlocked/bestByLevel/bestScore entries — v3ToV4 is lossless',
  );
  it.todo('absent v4 and v3 falls back to the existing v2/v1 chain unchanged');
  it.todo('corrupt v4 does not prevent the v3 fallback from running');
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
  it.todo(
    'win/lose behave exactly as v3 (stars/unlock win-gated); abandoned outcome merges score/stats but never touches stars/unlock',
  );
  it.todo('stats aggregate into both telemetry.lifetime and telemetry.byMode.campaign[levelId]');
  it.todo(
    'per-pickup-type and cascade/rally fields aggregate with the correct sum-vs-max semantics (D-07/D-08/D-10)',
  );
});

describe('recentRuns ring buffer (D-05)', () => {
  it.todo('recentRuns never exceeds RECENT_RUNS_BOUND entries; oldest is evicted first (FIFO)');
  it.todo(
    'each entry is the small shape: mode, levelId, outcome, score, ticks, timestamp — no full stats blob',
  );
});

describe('lifetime + per-level aggregates survive an app kill (SC-2)', () => {
  it.todo(
    're-instantiating an AsyncStorage-backed store from a previously persisted v4 JSON string reproduces identical lifetime + byMode aggregates',
  );
});
