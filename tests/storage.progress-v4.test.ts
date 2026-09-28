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
  mergeEndlessRecord,
  mergeRunIntoTelemetry,
  mergeTelemetryBlobs,
  migrateOrDefault,
  parseProgressResult,
  defaultTelemetryAggregate,
  defaultEndlessRecord,
  ENDLESS_TELEMETRY_KEY,
  DAILY_HISTORY_BOUND,
  defaultDailyRecord,
  ACHIEVEMENT_UNLOCK_BOUND,
  defaultAchievementRecord,
  cloneTelemetryBlob,
  v3ToV4,
  type ProgressBlob,
  type RunStatsInput,
} from '../src/services/storage';
import { __createAsyncStorageProgressStoreForTests } from '../src/services/storage/asyncStorageStore';
import { ACHIEVEMENT_CATALOG } from '../src/services/achievements';

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
    // Only telemetry degrades — including the endless record inside it (N-END-02).
    expect(r.progress.telemetry).toEqual(defaultTelemetryBlob());
    expect(r.progress.telemetry.endless).toEqual(defaultEndlessRecord());
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
          // Structurally broken endless record — must degrade ITSELF and nothing else.
          endless: 'not-an-object',
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
    // The broken endless record degrades alone — its sibling telemetry fields above
    // all survived, which is the SC-3 independence argument one level down.
    expect(r.progress.telemetry.endless).toEqual(defaultEndlessRecord());
  });

  it('a partial endless record keeps the fields it does have and coerces the invalid ones to non-negative integers (N-END-02)', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.runsPlayed = 6;
    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 500, stars: 1 } },
        bestScore: 500,
        updatedAt: 7,
        // A negative wave next to a perfectly good score: the bad field degrades
        // alone. (`NaN`/`Infinity` cannot survive JSON — `JSON.stringify` emits
        // `null` for both, and the `null` form is covered below.)
        telemetry: { ...telemetry, endless: { bestWave: -5, bestScore: 4200 } },
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 0, bestScore: 4200 });
    // Sibling telemetry survives…
    expect(r.progress.telemetry.lifetime.runsPlayed).toBe(6);
    // …and so does every campaign field (SC-3).
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
    expect(r.progress.bestScore).toBe(500);
  });

  it('every non-numeric endless field shape degrades to 0 without touching its sibling field or the enclosing blob', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    const parseWith = (endless: unknown) =>
      parseProgressResult(
        JSON.stringify({
          v: 4,
          unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
          bestByLevel: { [first]: { score: 500, stars: 1 } },
          bestScore: 500,
          updatedAt: 7,
          telemetry: { ...defaultTelemetryBlob(), endless },
        }),
      );

    // A string counter, a fractional counter and a JSON `null` (the wire form of
    // NaN/Infinity) each degrade that field ALONE.
    expect(parseWith({ bestWave: '12', bestScore: 30 }).progress.telemetry.endless).toEqual({
      bestWave: 0,
      bestScore: 30,
    });
    expect(parseWith({ bestWave: 1.7, bestScore: 12.9 }).progress.telemetry.endless).toEqual({
      bestWave: 1,
      bestScore: 12,
    });
    expect(parseWith({ bestWave: Number.NaN, bestScore: 8 }).progress.telemetry.endless).toEqual({
      bestWave: 0,
      bestScore: 8,
    });

    // Whole-record shapes that are not objects fall back to the default record…
    for (const broken of ['nope', [], null, 42, undefined]) {
      const r = parseWith(broken);
      // …without ever making the enclosing blob read as corrupt (SC-3).
      expect(r.status).toBe('ok');
      expect(r.progress.telemetry.endless).toEqual(defaultEndlessRecord());
      expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
      expect(r.progress.bestScore).toBe(500);
    }
  });

  it('an existing v4 blob written before the endless record existed parses with the field defaulted and every campaign field intact — no version bump, no migration', () => {
    const first = PLAYABLE_LEVEL_ORDER[0] as string;
    // The exact old shape: a v4 telemetry object with no `endless` key at all.
    const oldTelemetry = {
      lifetime: { ...defaultTelemetryAggregate(), runsPlayed: 4, bricksBroken: 120 },
      byMode: { campaign: { [first]: { ...defaultTelemetryAggregate(), runsPlayed: 4 } }, endless: {}, daily: {} },
      recentRuns: [],
    };
    expect(Object.keys(oldTelemetry)).not.toContain('endless');

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 1200, stars: 3 } },
        bestScore: 1200,
        updatedAt: 1_700_000_000_000,
        telemetry: oldTelemetry,
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.v).toBe(PROGRESS_VERSION);
    expect(r.progress.telemetry.endless).toEqual(defaultEndlessRecord());
    expect(r.progress.telemetry.lifetime.bricksBroken).toBe(120);
    expect(r.progress.telemetry.byMode.campaign[first]?.runsPlayed).toBe(4);
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1200, stars: 3 });
    expect(r.progress.bestScore).toBe(1200);
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

/**
 * The read half of the daily record (N-DAILY-02 / N-DAILY-03 / D-15 / D-16 / T-12-15…17,
 * plan 12-04).
 *
 * Mirrors the endless-record block above case for case, because the daily record inherits
 * `sanitizeTelemetry`'s independence contract verbatim: start from the default, copy only
 * the keys the default declares, coerce each field on its own so a broken one cannot
 * discard a good sibling. Three things the endless record has no counterpart for are
 * written fresh, and each exists against a named threat:
 *
 *  - **Per-entry validation** (T-12-15). 12-UI-SPEC renders the stored key verbatim with no
 *    formatting step, so a 4 000-character `date` would reach a `Text` inside a 320px
 *    panel. The entry is DROPPED — never truncated, never repaired.
 *  - **Bound on read** (T-12-16), applied AFTER the drop. Trimming first would let padding
 *    garbage push real dates out of the window; the ordering case below is built so that
 *    mistake is falsifiable rather than merely forbidden in a comment.
 *  - **Degrade downward, never upward** (D-16 as amended at 12-03's checkpoint). An invalid
 *    `currentStreakStart` falls back to the empty start, which under-reports a streak.
 *    Inflating one out of a tampered blob is the direction this phase has refused at every
 *    turn.
 *
 * 12-UI-SPEC § Storage-failure is what makes dropping the right answer rather than merely a
 * safe one: an unreadable entry means "this date has no stored result", i.e. playable. The
 * cost — a transient fault handing a player a second attempt at the day — is accepted there
 * in writing, because the alternative locks a player out of their day on a transient fault.
 */
describe('sanitizeDailyRecord — bounded on read, every stored key validated (12-04)', () => {
  const first = PLAYABLE_LEVEL_ORDER[0] as string;

  /** A v4 blob with a known campaign payload and a caller-supplied daily record. */
  function parseWithDaily(daily: unknown) {
    return parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 500, stars: 1 } },
        bestScore: 500,
        updatedAt: 7,
        telemetry: { ...defaultTelemetryBlob(), daily },
      }),
    );
  }

  /**
   * `count` consecutive ISO keys from 2025-01-01, built by UTC counting rather than through
   * `localDateKey`. This is a FIXTURE: deriving it with the very function the parser's
   * validator guards would let a broken pair agree by computing the same wrong answer twice.
   */
  function consecutiveKeys(count: number): string[] {
    const out: string[] = [];
    const d = new Date(Date.UTC(2025, 0, 1));
    for (let i = 0; i < count; i++) {
      out.push(
        `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
      );
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }

  const winEntry = (date: string, score = 100) => ({ date, score, outcome: 'win' as const });

  it('a missing or non-object daily record parses to the default without making the enclosing blob corrupt', () => {
    for (const broken of [undefined, null, 'nope', [], 42, true]) {
      const r = parseWithDaily(broken);
      expect(r.status, `daily: ${String(broken)} must not make the blob corrupt`).toBe('ok');
      expect(r.progress.telemetry.daily).toEqual(defaultDailyRecord());
      // …and every campaign field is untouched by it (N-DAILY-03 / SC-5).
      expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
      expect(r.progress.bestScore).toBe(500);
    }
  });

  it('a partial daily record keeps the fields it does have and coerces the invalid ones (D-16)', () => {
    const r = parseWithDaily({
      history: [
        winEntry('2026-09-26', 1_200),
        { date: '2026-09-27', score: -5, outcome: 'lose' },
      ],
      longestStreak: 2,
      totalDaysPlayed: -3,
    });

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.daily.history).toEqual([
      { date: '2026-09-26', score: 1_200, outcome: 'win' },
      { date: '2026-09-27', score: 0, outcome: 'lose' },
    ]);
    expect(r.progress.telemetry.daily.longestStreak).toBe(2);
    expect(r.progress.telemetry.daily.totalDaysPlayed).toBe(0);
    // Absent entirely — the field the record does not carry defaults rather than throwing.
    expect(r.progress.telemetry.daily.currentStreakStart).toBe('');
  });

  it('every non-numeric daily scalar shape degrades to 0 without touching its sibling scalar', () => {
    const daily = (over: Record<string, unknown>) => ({
      history: [winEntry('2026-09-27')],
      longestStreak: 4,
      totalDaysPlayed: 9,
      currentStreakStart: '2026-09-27',
      ...over,
    });

    // A string counter, a JSON `null` (the wire form of NaN/Infinity) and a fractional
    // counter each degrade that field ALONE.
    expect(parseWithDaily(daily({ longestStreak: '4' })).progress.telemetry.daily).toMatchObject({
      longestStreak: 0,
      totalDaysPlayed: 9,
    });
    expect(
      parseWithDaily(daily({ totalDaysPlayed: Number.NaN })).progress.telemetry.daily,
    ).toMatchObject({ longestStreak: 4, totalDaysPlayed: 0 });
    expect(
      parseWithDaily(daily({ longestStreak: 4.7, totalDaysPlayed: 9.2 })).progress.telemetry.daily,
    ).toMatchObject({ longestStreak: 4, totalDaysPlayed: 9 });

    // …and a broken scalar leaves the history and the stored start standing.
    const broken = parseWithDaily(daily({ longestStreak: null })).progress.telemetry.daily;
    expect(broken.longestStreak).toBe(0);
    expect(broken.history).toHaveLength(1);
    expect(broken.currentStreakStart).toBe('2026-09-27');
  });

  it('drops a history entry that is not an object, and one whose date is not a string', () => {
    const r = parseWithDaily({
      history: [
        'nope',
        null,
        42,
        [],
        { score: 10, outcome: 'win' },
        { date: 20_260_927, score: 10, outcome: 'win' },
        winEntry('2026-09-27'),
      ],
    });

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.daily.history.map((e) => e.date)).toEqual(['2026-09-27']);
  });

  it('drops a history entry naming an impossible calendar date — month 0 or 13, day 0 or 32, 30 February, and 29 February in a non-leap year', () => {
    const impossible = [
      '2026-00-10',
      '2026-13-10',
      '2026-09-00',
      '2026-09-32',
      '2026-02-30',
      '2026-02-29',
      '1900-02-29',
      '2026-9-27',
      '2026-09-27T00:00:00Z',
      '',
      'not-a-date',
    ];
    for (const date of impossible) {
      const r = parseWithDaily({ history: [{ date, score: 10, outcome: 'win' }] });
      expect(r.status, `${date} must not make the blob corrupt`).toBe('ok');
      expect(r.progress.telemetry.daily.history, `${date} must be dropped`).toEqual([]);
    }

    // The non-vacuity control: the leap rule is the FULL one, so a real 29 February — and a
    // 400th-year one — survive. Without this the case above would pass on a validator that
    // rejected everything.
    const leap = parseWithDaily({ history: [winEntry('2024-02-29'), winEntry('2000-02-29')] });
    expect(leap.progress.telemetry.daily.history.map((e) => e.date)).toEqual([
      '2024-02-29',
      '2000-02-29',
    ]);
  });

  it('drops a 4 000-character date string rather than truncating it or rendering it (T-12-15)', () => {
    const hostile = '9'.repeat(4_000);
    const r = parseWithDaily({
      history: [{ date: hostile, score: 10, outcome: 'win' }, winEntry('2026-09-27')],
    });

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.daily.history.map((e) => e.date)).toEqual(['2026-09-27']);
    // Not truncated either: no prefix of it survives anywhere in the record.
    expect(JSON.stringify(r.progress.telemetry.daily)).not.toContain(hostile.slice(0, 32));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
  });

  it('drops a history entry whose outcome is outside the closed set — abandoned never closes a date (D-07)', () => {
    for (const outcome of ['abandoned', 'WIN', 'won', '', 1, null, undefined]) {
      const r = parseWithDaily({ history: [{ date: '2026-09-27', score: 10, outcome }] });
      expect(
        r.progress.telemetry.daily.history,
        `outcome ${String(outcome)} is outside { win, lose } and must be dropped`,
      ).toEqual([]);
    }
    // Control: both members of the closed set survive.
    const ok = parseWithDaily({
      history: [
        { date: '2026-09-26', score: 10, outcome: 'win' },
        { date: '2026-09-27', score: 10, outcome: 'lose' },
      ],
    });
    expect(ok.progress.telemetry.daily.history).toHaveLength(2);
  });

  it('trims a history longer than DAILY_HISTORY_BOUND on read — a tampered blob cannot grow the window (T-12-16)', () => {
    const keys = consecutiveKeys(DAILY_HISTORY_BOUND + 60);
    const r = parseWithDaily({ history: keys.map((k) => winEntry(k)) });
    const history = r.progress.telemetry.daily.history;

    expect(history).toHaveLength(DAILY_HISTORY_BOUND);
    // The TRAILING window survives — newest kept, oldest evicted, exactly as the shipped
    // recent-run ring does one field below.
    expect(history[history.length - 1]?.date).toBe(keys[keys.length - 1]);
    expect(history[0]?.date).toBe(keys[60]);
  });

  it('applies the trailing-window trim AFTER dropping invalid entries, so padding garbage cannot push real dates out of the window', () => {
    const keys = consecutiveKeys(DAILY_HISTORY_BOUND);
    const padding = Array.from({ length: 40 }, () => ({
      date: '2026-02-30',
      score: 1,
      outcome: 'win',
    }));
    const r = parseWithDaily({ history: [...keys.map((k) => winEntry(k)), ...padding] });
    const history = r.progress.telemetry.daily.history;

    // Trim-then-drop keeps the last 400 of 440 — losing the 40 OLDEST real dates and then
    // dropping the padding anyway, for 360 survivors. Drop-then-trim keeps all 400. The
    // difference is what makes the ordering falsifiable rather than merely asserted.
    expect(history).toHaveLength(DAILY_HISTORY_BOUND);
    expect(history.map((e) => e.date)).toEqual(keys);
  });

  it('degrades an invalid currentStreakStart downward to the empty start, never to one that inflates a streak (D-16 amendment)', () => {
    const history = [winEntry('2026-09-26'), winEntry('2026-09-27')];
    const startFor = (currentStreakStart: unknown) =>
      parseWithDaily({ history, longestStreak: 2, totalDaysPlayed: 2, currentStreakStart })
        .progress.telemetry.daily.currentStreakStart;

    // Controls first, so the rejections below cannot pass vacuously: a well-formed in-window
    // start is carried…
    expect(startFor('2026-09-26')).toBe('2026-09-26');
    // …and so is one reaching back PAST the trimmed window, which is the entire reason the
    // field is stored rather than derived (D-16, as amended).
    expect(startFor('2020-01-01')).toBe('2020-01-01');

    for (const hostile of ['2026-02-30', '9'.repeat(4_000), 20_260_927, null, '', '2026-9-26']) {
      expect(
        startFor(hostile),
        `${String(hostile).slice(0, 16)} must degrade to the empty start`,
      ).toBe('');
    }

    // A start that POSTDATES its own newest stored date cannot be a real run start —
    // discarded, which under-reports rather than inflating.
    expect(startFor('2027-01-01')).toBe('');
    // And with no stored dates at all there is no run in progress for a start to name.
    expect(
      parseWithDaily({ history: [], currentStreakStart: '2026-09-26' }).progress.telemetry.daily
        .currentStreakStart,
    ).toBe('');
  });

  it('a fully corrupt daily record leaves unlocked, bestByLevel, bestScore, stars and the endless record intact (N-DAILY-03 / SC-5)', () => {
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.runsPlayed = 6;
    telemetry.endless = { bestWave: 14, bestScore: 8_400 };

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 1_200, stars: 3 } },
        bestScore: 1_200,
        updatedAt: 1_700_000_000_000,
        telemetry: {
          ...telemetry,
          daily: {
            history: 'not-an-array',
            longestStreak: 'lots',
            totalDaysPlayed: [],
            currentStreakStart: 999,
          },
        },
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.daily).toEqual(defaultDailyRecord());
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1_200, stars: 3 });
    expect(r.progress.bestScore).toBe(1_200);
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 14, bestScore: 8_400 });
    expect(r.progress.telemetry.lifetime.runsPlayed).toBe(6);
  });

  it('an existing v4 blob written before the daily record existed parses with the field defaulted and every campaign field intact — no version bump, no migration', () => {
    // The exact old shape: a v4 telemetry object with no `daily` key at all.
    const oldTelemetry = {
      lifetime: { ...defaultTelemetryAggregate(), runsPlayed: 4, bricksBroken: 120 },
      byMode: {
        campaign: { [first]: { ...defaultTelemetryAggregate(), runsPlayed: 4 } },
        endless: {},
        daily: {},
      },
      endless: { bestWave: 3, bestScore: 900 },
      recentRuns: [],
    };
    expect(Object.keys(oldTelemetry)).not.toContain('daily');

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 1_200, stars: 3 } },
        bestScore: 1_200,
        updatedAt: 1_700_000_000_000,
        telemetry: oldTelemetry,
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.v).toBe(PROGRESS_VERSION);
    expect(r.progress.telemetry.daily).toEqual(defaultDailyRecord());
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 3, bestScore: 900 });
    expect(r.progress.telemetry.lifetime.bricksBroken).toBe(120);
    expect(r.progress.telemetry.byMode.campaign[first]?.runsPlayed).toBe(4);
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1_200, stars: 3 });
    expect(r.progress.bestScore).toBe(1_200);
  });
});

/**
 * The stored achievements set on the READ path (N-ACH-02 / SC-3 / D-13 / D-15 / D-17 / D-21).
 *
 * A SIBLING of `describe('sanitizeDailyRecord …')` above, deliberately not a rewrite of it:
 * the harness shape, the fixture-not-derived rule, the trim-after-drop case, the
 * independence case and the no-migration case are all copied from it, because the two
 * records carry the same independence contract one level down inside `sanitizeTelemetry`.
 *
 * Two obligations this record carries that the daily one does not, and both are asserted
 * here: every stored id is validated against the CATALOG on read, and the timestamp
 * DEGRADES where the id DROPS (D-21) — two different failure rules inside one entry
 * sanitizer, which no other sanitizer in `parseBlob.ts` has.
 */
describe('sanitizeAchievementRecord — the stored achievements set, bounded on read and validated against the catalog (13-03)', () => {
  const first = PLAYABLE_LEVEL_ORDER[0] as string;

  /**
   * A v4 blob with a known campaign payload, a known endless record and a known daily
   * record, plus a caller-supplied achievements field.
   *
   * Every case therefore asserts INDEPENDENCE as well as its own claim, rather than one
   * case doing it for all of them — the `parseWithDaily` shape above, for its reason.
   */
  function parseWithAchievements(achievements: unknown) {
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.runsPlayed = 6;
    telemetry.endless = { bestWave: 14, bestScore: 8_400 };
    telemetry.daily = {
      history: [{ date: '2026-09-27', score: 700, outcome: 'win' }],
      longestStreak: 3,
      totalDaysPlayed: 5,
      currentStreakStart: '2026-09-27',
    };
    return parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 500, stars: 1 } },
        bestScore: 500,
        updatedAt: 7,
        telemetry: { ...telemetry, achievements },
      }),
    );
  }

  const unlockedIn = (r: ReturnType<typeof parseWithAchievements>) =>
    r.progress.telemetry.achievements.unlocked;

  /**
   * KNOWN ids are DERIVED from the shipped catalog, so plan 13-02's expansion — and any
   * later one — cannot silently shrink this block's coverage. `tests/ui/certLevelPlan.test.ts`'s
   * argument, and the same rule `tests/achievements.record.test.ts` applies to its control id.
   */
  const KNOWN = ACHIEVEMENT_CATALOG.map((a) => a.id);

  /**
   * The UNKNOWN id is a hard LITERAL and goes the other way, which is the direction the
   * daily block's `consecutiveKeys` comment states: deriving this fixture with the very
   * data the validator guards (`KNOWN[0] + '-x'`) would let a broken pair agree by
   * computing the same wrong answer twice. A catalog that ever mints this string would
   * fail the case rather than pass it, which is the safe direction.
   */
  const NOT_AN_ID = 'not-an-achievement';

  it('the fixtures are non-vacuous: the catalog mints ids, and the hostile id is not one of them', () => {
    expect(
      KNOWN.length,
      'an empty catalog would make every "survives" assertion below pass by having nothing to keep',
    ).toBeGreaterThan(2);
    expect(
      KNOWN,
      `${NOT_AN_ID} must not be a real id, or the unknown-id case below is asserting that a REAL achievement is dropped`,
    ).not.toContain(NOT_AN_ID);
  });

  it('drops a stored achievements entry whose id the catalog never minted, and keeps its siblings (T-13-01 / D-15)', () => {
    const r = parseWithAchievements({
      unlocked: [
        { id: NOT_AN_ID, at: 1_700_000_000_000 },
        { id: KNOWN[0], at: 1_700_000_000_001 },
        { id: '9'.repeat(4_000), at: 1_700_000_000_002 },
        { id: 42, at: 1 },
        { id: '', at: 1 },
        'nope',
        null,
        [],
        { id: KNOWN[1], at: 1_700_000_000_003 },
      ],
    });

    expect(r.status, 'a hostile achievements field must not make the enclosing blob corrupt').toBe(
      'ok',
    );
    // The survivors are the positive control: without them this case would pass against a
    // sanitizer that dropped everything.
    expect(
      unlockedIn(r).map((e) => e.id),
      'an id the catalog never minted cannot reach the host, let alone a rendered Text — and the two real ids must survive it',
    ).toEqual([KNOWN[0], KNOWN[1]]);
    // Not truncated or coerced either: no prefix of the 4 000-character id survives.
    expect(JSON.stringify(r.progress.telemetry.achievements)).not.toContain('99999999');
    // …and the campaign payload beside it is untouched.
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
  });

  it('KEEPS an achievements entry whose timestamp is malformed and defaults the timestamp to 0 — the id drops, the timestamp degrades (D-15 / D-17 / D-21)', () => {
    const why =
      'D-21: dropping the entry because its timestamp is malformed would un-earn an achievement the player did earn (D-17 makes an unlock one-way). Degrading the timestamp costs a sort order; degrading the id costs the achievement — so the two fields take DIFFERENT failure rules inside one entry sanitizer.';

    for (const at of [Number.NaN, '1700000000000', -5, undefined, null, [], {}, true]) {
      const r = parseWithAchievements({ unlocked: [{ id: KNOWN[0], at }] });
      const entries = unlockedIn(r);
      // BOTH halves in one case: the entry is KEPT…
      expect(entries.map((e) => e.id), `at: ${String(at)} — ${why}`).toEqual([KNOWN[0]]);
      // …and its timestamp defaulted rather than the entry being dropped.
      expect(entries[0]?.at, `at: ${String(at)} — ${why}`).toBe(0);
    }

    // `Infinity` and `-Infinity` have no JSON form and arrive as `null`; asserted through
    // the object path so the numeric non-finite cases are covered too, not just their wire
    // shape. This is the shipped `safeCounter` contract, local to `parseBlob.ts`.
    for (const at of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const r = parseProgressResult(
        JSON.stringify({
          v: 4,
          unlocked: [],
          bestByLevel: {},
          bestScore: 0,
          updatedAt: 7,
          telemetry: { ...defaultTelemetryBlob(), achievements: { unlocked: [{ id: KNOWN[0], at }] } },
        }),
      );
      expect(unlockedIn(r).map((e) => e.id), `at: ${String(at)} — ${why}`).toEqual([KNOWN[0]]);
      expect(unlockedIn(r)[0]?.at, `at: ${String(at)} — ${why}`).toBe(0);
    }

    // The non-vacuity control: a WELL-FORMED timestamp is carried through unchanged, so the
    // zeroes above are a degradation rather than a sanitizer that zeroes everything.
    const ok = parseWithAchievements({ unlocked: [{ id: KNOWN[0], at: 1_700_000_000_123 }] });
    expect(unlockedIn(ok)[0]?.at).toBe(1_700_000_000_123);
  });

  it('collapses duplicate achievements ids to one entry, keeping the EARLIEST timestamp (D-14 / D-22)', () => {
    const r = parseWithAchievements({
      unlocked: [
        { id: KNOWN[0], at: 1_700_000_500_000 },
        { id: KNOWN[1], at: 1_700_000_100_000 },
        { id: KNOWN[0], at: 1_700_000_200_000 },
        { id: KNOWN[0], at: 1_700_000_900_000 },
      ],
    });
    const entries = unlockedIn(r);

    expect(
      entries.filter((e) => e.id === KNOWN[0]),
      'one entry per id — the collection is a SET keyed by id, and a tampered blob cannot grow it by repeating one',
    ).toHaveLength(1);
    expect(
      entries.find((e) => e.id === KNOWN[0])?.at,
      'earliest wins: D-14 stores the moment the achievement was FIRST earned, and a later duplicate walking it forward destroys exactly the recency order it is stored for (D-22 inverts mergeDailyRecords incoming-wins for this reason)',
    ).toBe(1_700_000_200_000);
    // The inverse, stated explicitly — a last-writer-wins collapse would still hold one
    // entry per id and would pass a cardinality-only assertion.
    expect(
      JSON.stringify(entries),
      'no later duplicate timestamp may appear anywhere in the surviving collection',
    ).not.toContain('1700000900000');
    expect(entries.find((e) => e.id === KNOWN[1])?.at).toBe(1_700_000_100_000);
  });

  it('applies the achievements bound AFTER the drop loop, so padding garbage cannot push real unlocks out of the window (T-13-02)', () => {
    const padding = Array.from({ length: ACHIEVEMENT_UNLOCK_BOUND + 6 }, (_, i) => ({
      id: `${NOT_AN_ID}-${i}`,
      at: 1_700_000_000_000 + i,
    }));
    const real = KNOWN.slice(0, 3).map((id, i) => ({ id, at: 1_800_000_000_000 + i }));
    expect(
      padding.length,
      'the padding must exceed the bound, or trim-first and drop-first produce the same answer and the ordering is not falsifiable',
    ).toBeGreaterThan(ACHIEVEMENT_UNLOCK_BOUND);

    const r = parseWithAchievements({ unlocked: [...padding, ...real] });

    // Trim-then-drop keeps the FIRST `ACHIEVEMENT_UNLOCK_BOUND` of 73 — all padding — and
    // then drops every one of them, for zero survivors. Drop-then-trim keeps all three real
    // unlocks. The difference is what makes the ordering falsifiable rather than asserted.
    expect(
      unlockedIn(r).map((e) => e.id),
      'the three real unlocks survive 70 entries of padding garbage — trimming before the drop loop would evict them and leave nothing',
    ).toEqual(real.map((e) => e.id));
    // The fence itself: structurally unreachable while the unknown-id drop stands (a
    // legitimate set cannot exceed the catalog's size), which is exactly why it exists —
    // it is what survives a future relaxation of that check (WINDOWS #27's shape).
    expect(unlockedIn(r).length).toBeLessThanOrEqual(ACHIEVEMENT_UNLOCK_BOUND);
  });

  it('a missing or non-object achievements record parses to the default without making the enclosing blob corrupt (D-15)', () => {
    for (const broken of [undefined, null, 'nope', [], 42, true, { unlocked: 'nope' }, { unlocked: 7 }, { unlocked: null }, { unlocked: {} }]) {
      const r = parseWithAchievements(broken);
      expect(
        r.status,
        `achievements: ${JSON.stringify(broken) ?? 'undefined'} must not make the blob corrupt`,
      ).toBe('ok');
      expect(
        r.progress.telemetry.achievements,
        'a non-array in the `unlocked` position yields the empty record — never a throw, and never a coerced scalar',
      ).toEqual(defaultAchievementRecord());
      // …and every campaign field is untouched by it.
      expect(r.progress.bestByLevel[first as never]).toEqual({ score: 500, stars: 1 });
      expect(r.progress.bestScore).toBe(500);
    }
  });

  it('a fully corrupt achievements field leaves unlocked, bestByLevel, bestScore, the endless record and the daily history intact (D-15 / SC-5)', () => {
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.runsPlayed = 6;
    telemetry.endless = { bestWave: 14, bestScore: 8_400 };
    telemetry.daily = {
      history: [{ date: '2026-09-27', score: 700, outcome: 'win' }],
      longestStreak: 3,
      totalDaysPlayed: 5,
      currentStreakStart: '2026-09-27',
    };

    // EVERY value this case claims to preserve is proved NON-DEFAULT first, in this same
    // case. Without this the whole case passes on a blob whose siblings were empty to begin
    // with — the vacuity trap phase 12 hit at this very function.
    expect(telemetry.endless, 'the endless record must be non-default, or its survival is vacuous').not.toEqual(
      defaultEndlessRecord(),
    );
    expect(telemetry.daily, 'and so must the daily record').not.toEqual(defaultDailyRecord());
    expect(telemetry.lifetime, 'and so must the lifetime aggregate').not.toEqual(
      defaultTelemetryAggregate(),
    );

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 1_200, stars: 3 } },
        bestScore: 1_200,
        updatedAt: 1_700_000_000_000,
        telemetry: { ...telemetry, achievements: { unlocked: 'not-an-array', bogus: 9 } },
      }),
    );

    expect(r.status).toBe('ok');
    expect(r.progress.telemetry.achievements).toEqual(defaultAchievementRecord());
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1_200, stars: 3 });
    expect(r.progress.bestScore).toBe(1_200);
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 14, bestScore: 8_400 });
    expect(r.progress.telemetry.daily.history.map((e) => e.date)).toEqual(['2026-09-27']);
    expect(r.progress.telemetry.daily.longestStreak).toBe(3);
    expect(r.progress.telemetry.lifetime.runsPlayed).toBe(6);
  });

  it('an existing v4 blob written before the achievements record existed parses with the field defaulted and every campaign, endless and daily field intact — no version bump, no migration (D-13)', () => {
    // The exact old shape: a v4 telemetry object with no `achievements` key at all.
    const oldTelemetry = {
      lifetime: { ...defaultTelemetryAggregate(), runsPlayed: 4, bricksBroken: 120 },
      byMode: {
        campaign: { [first]: { ...defaultTelemetryAggregate(), runsPlayed: 4 } },
        endless: {},
        daily: {},
      },
      endless: { bestWave: 3, bestScore: 900 },
      daily: {
        history: [{ date: '2026-09-26', score: 400, outcome: 'win' }],
        longestStreak: 1,
        totalDaysPlayed: 1,
        currentStreakStart: '2026-09-26',
      },
      recentRuns: [],
    };
    // This assertion is what makes the case about the ABSENCE rather than about a value —
    // exactly as the shipped daily no-migration case above does it.
    expect(Object.keys(oldTelemetry)).not.toContain('achievements');

    const r = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 3),
        bestByLevel: { [first]: { score: 1_200, stars: 3 } },
        bestScore: 1_200,
        updatedAt: 1_700_000_000_000,
        telemetry: oldTelemetry,
      }),
    );

    expect(r.status).toBe('ok');
    expect(
      r.progress.v,
      'D-13: the field is ADDITIVE — an older v4 blob parses clean with no PROGRESS_VERSION bump and no migration step',
    ).toBe(PROGRESS_VERSION);
    expect(r.progress.telemetry.achievements).toEqual(defaultAchievementRecord());
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 3, bestScore: 900 });
    expect(r.progress.telemetry.daily.history.map((e) => e.date)).toEqual(['2026-09-26']);
    expect(r.progress.telemetry.daily.longestStreak).toBe(1);
    expect(r.progress.telemetry.lifetime.bricksBroken).toBe(120);
    expect(r.progress.telemetry.byMode.campaign[first]?.runsPlayed).toBe(4);
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 3));
    expect(r.progress.bestByLevel[first as never]).toEqual({ score: 1_200, stars: 3 });
    expect(r.progress.bestScore).toBe(1_200);
  });

  it('round trip: a stored achievements entry parses back with its id and its timestamp intact — the read half of SC-3', () => {
    const at = 1_700_000_321_000;
    const r = parseWithAchievements({ unlocked: [{ id: KNOWN[0], at }] });

    expect(r.status).toBe('ok');
    expect(
      unlockedIn(r),
      'the positive control for every absence case above, and the whole of SC-3 at the parser: an unlock written before an app kill is still there after the next cold start. Before this plan `sanitizeTelemetry` started from `defaultTelemetryBlob()` and never looked at a stored achievements field, so this returned [].',
    ).toEqual([{ id: KNOWN[0], at }]);
    // A fractional stored timestamp floors rather than dropping the entry — `safeCounter`,
    // local to `parseBlob.ts` and NOT the same-named function in `telemetry.ts`.
    expect(unlockedIn(parseWithAchievements({ unlocked: [{ id: KNOWN[0], at: 12.7 }] }))[0]?.at).toBe(
      12,
    );
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

  /**
   * N-END-02 — the endless personal record. It lives on `TelemetryBlob` (never on
   * `ProgressBlob`), takes a running max per field, and is written by one dedicated
   * merge so no campaign path can reach it. See `11-02-PLAN.md` § D-11 / D-12.
   */
  it('defaultTelemetryBlob seeds an all-zero endless record, and the byMode key is a constant not a LevelId (N-END-02 / D-12)', () => {
    expect(defaultTelemetryBlob().endless).toEqual({ bestWave: 0, bestScore: 0 });
    expect(defaultEndlessRecord()).toEqual({ bestWave: 0, bestScore: 0 });
    // D-12: a plain string key, because a generated board has no LevelId.
    expect(typeof ENDLESS_TELEMETRY_KEY).toBe('string');
    expect(ENDLESS_TELEMETRY_KEY.length).toBeGreaterThan(0);
    expect(PLAYABLE_LEVEL_ORDER as readonly string[]).not.toContain(ENDLESS_TELEMETRY_KEY);
  });

  it('cloneTelemetryBlob deep-copies the endless record so a mutation cannot leak across the memory/disk boundary', () => {
    const source = defaultTelemetryBlob();
    source.endless = { bestWave: 7, bestScore: 900 };

    const clone = cloneTelemetryBlob(source);
    expect(clone.endless).toEqual({ bestWave: 7, bestScore: 900 });
    expect(clone.endless).not.toBe(source.endless);

    clone.endless.bestWave = 99;
    expect(source.endless.bestWave).toBe(7);
  });

  it('mergeEndlessRecord takes each field running max INDEPENDENTLY, so a short high-scoring run keeps the deeper wave', () => {
    const t = defaultTelemetryBlob();
    t.endless = { bestWave: 20, bestScore: 100 };

    const next = mergeEndlessRecord(t, { wave: 12, score: 500 });
    expect(next.endless).toEqual({ bestWave: 20, bestScore: 500 });
    // Clone-then-mutate, exactly like mergeRunIntoTelemetry: the input is untouched.
    expect(t.endless).toEqual({ bestWave: 20, bestScore: 100 });
    expect(next).not.toBe(t);
    // A run worse on both axes moves nothing.
    expect(mergeEndlessRecord(next, { wave: 1, score: 1 }).endless).toEqual({
      bestWave: 20,
      bestScore: 500,
    });
  });

  it('mergeEndlessRecord hardens garbage into non-negative integers', () => {
    const t = defaultTelemetryBlob();
    expect(mergeEndlessRecord(t, { wave: -5, score: -1 }).endless).toEqual({
      bestWave: 0,
      bestScore: 0,
    });
    expect(
      mergeEndlessRecord(t, { wave: Number.NaN, score: Number.POSITIVE_INFINITY }).endless,
    ).toEqual({ bestWave: 0, bestScore: 0 });
    expect(mergeEndlessRecord(t, { wave: 1.7, score: 12.9 }).endless).toEqual({
      bestWave: 1,
      bestScore: 12,
    });
  });

  it('mergeTelemetryBlobs takes the per-field max of the two endless records, in either argument order', () => {
    const a = defaultTelemetryBlob();
    a.endless = { bestWave: 31, bestScore: 40 };
    const b = defaultTelemetryBlob();
    b.endless = { bestWave: 4, bestScore: 5_000 };

    expect(mergeTelemetryBlobs(a, b).endless).toEqual({ bestWave: 31, bestScore: 5_000 });
    expect(mergeTelemetryBlobs(b, a).endless).toEqual({ bestWave: 31, bestScore: 5_000 });
  });

  it('mergeRunIntoTelemetry never writes the endless record — an endless run bumps byMode.endless aggregates only', () => {
    const before = defaultTelemetryBlob();
    before.endless = { bestWave: 3, bestScore: 77 };

    const after = mergeRunIntoTelemetry(before, {
      mode: 'endless',
      levelId: ENDLESS_TELEMETRY_KEY,
      outcome: 'lose',
      score: 99_999,
      stats: runStats({ bricksBroken: 40, ticksPlayed: 5_000 }),
    });

    // The record is a separate merge — a campaign run can never write it either.
    expect(after.endless).toEqual({ bestWave: 3, bestScore: 77 });
    // …but the mode-keyed aggregate DID land, so this is not a vacuous pass.
    expect(after.byMode.endless[ENDLESS_TELEMETRY_KEY]?.runsPlayed).toBe(1);
    expect(after.byMode.endless[ENDLESS_TELEMETRY_KEY]?.bricksBroken).toBe(40);
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

  it('a run recorded before hydration finishes still persists the UNION of disk history and the new run', async () => {
    const first = PLAYABLE_LEVEL_ORDER[0];
    const storage = fakeAsyncStorage({
      [PROGRESS_KEY]: JSON.stringify(diskBlobWithTelemetry()),
    });
    const store = __createAsyncStorageProgressStoreForTests(storage);

    // Cold path: recordRunEnd fires before any awaited read, so it kicks
    // hydration itself. Persisting the in-memory blob right away would write a
    // blob that has not seen the disk history yet — destroying 5 runs' worth of
    // lifetime counters on the next app kill.
    const returned = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 1_000,
      outcome: 'win',
      livesRemaining: 3,
      stats: runStats({ bricksBroken: 40, ticksPlayed: 500 }),
    });
    // The synchronous return is still pre-hydration by contract (D-10 / F-26).
    expect(returned.telemetry.lifetime.bricksBroken).toBe(40);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const persisted = parseProgressResult(storage.map.get(PROGRESS_KEY) ?? null);
    expect(persisted.status).toBe('ok');
    expect(persisted.progress.telemetry.lifetime.runsPlayed).toBe(6);
    expect(persisted.progress.telemetry.lifetime.bricksBroken).toBe(290);
    expect(persisted.progress.telemetry.lifetime.ticksPlayed).toBe(4_500);
    expect(persisted.progress.bestScore).toBe(1_000);
    // And the store's own view agrees with what landed on disk.
    const snap = await store.getSnapshot();
    expect(snap.telemetry.lifetime.bricksBroken).toBe(290);
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
