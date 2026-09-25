/**
 * N-PROG-03 — progress v3 stars helpers + migrate/parse/store (C2 Plan 01).
 */
import { describe, it, expect } from 'vitest';
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  PERSONAL_BEST_KEY,
  computeStars,
  mergeLevelBest,
  selectRowState,
  defaultProgressBlob,
  parseProgressResult,
  migrateOrDefault,
  createMemoryProgressStore,
  mergeHighWatermark,
  type LevelBest,
  type ProgressBlob,
} from '../src/services/storage';

describe('computeStars (C2 Wave 0)', () => {
  it('maps 1|2|3 to themselves', () => {
    expect(computeStars(1)).toBe(1);
    expect(computeStars(2)).toBe(2);
    expect(computeStars(3)).toBe(3);
  });

  it('clamps 0 → 1 (defensive; unreachable at WON) and 5 → 3', () => {
    // applyWinCheck runs before applyLives — lives===0 at WON should not occur
    expect(computeStars(0)).toBe(1);
    expect(computeStars(5)).toBe(3);
  });

  it('non-finite → 1', () => {
    expect(computeStars(Number.NaN)).toBe(1);
    expect(computeStars(Number.POSITIVE_INFINITY)).toBe(1);
    expect(computeStars(Number.NEGATIVE_INFINITY)).toBe(1);
  });

  it('floors fractional lives before clamp', () => {
    expect(computeStars(2.9)).toBe(2);
  });
});

describe('mergeLevelBest (C2 Wave 0)', () => {
  it('undefined + win → score and stars', () => {
    expect(mergeLevelBest(undefined, 100, 2)).toEqual({
      score: 100,
      stars: 2,
    });
  });

  it('maxes score and stars on win', () => {
    const prev: LevelBest = { score: 50, stars: 3 };
    expect(mergeLevelBest(prev, 40, 1)).toEqual({ score: 50, stars: 3 });
  });

  it('lose maxes score and preserves prior stars', () => {
    const prev: LevelBest = { score: 50, stars: 2 };
    expect(mergeLevelBest(prev, 80, null)).toEqual({ score: 80, stars: 2 });
  });

  it('lose with no prior omits stars key', () => {
    expect(mergeLevelBest(undefined, 10, null)).toEqual({ score: 10 });
    expect(mergeLevelBest(undefined, 10, null)).not.toHaveProperty('stars');
  });

  it('floors score', () => {
    expect(mergeLevelBest(undefined, 10.7, 1)).toEqual({
      score: 10,
      stars: 1,
    });
  });
});

describe('selectRowState (C2 Wave 0 / R-30)', () => {
  it('locked when not unlocked', () => {
    expect(selectRowState('level-03', ['level-01'], undefined)).toBe('locked');
  });

  it('uncleared when unlocked, no next unlocked, no stars', () => {
    expect(
      selectRowState('level-01', ['level-01'], undefined),
    ).toBe('uncleared');
    expect(
      selectRowState('level-01', ['level-01'], { score: 10 }),
    ).toBe('uncleared');
  });

  it('cleared when stars are 1–3', () => {
    expect(
      selectRowState('level-01', ['level-01'], { score: 10, stars: 1 }),
    ).toBe('cleared');
    expect(
      selectRowState('level-03', ['level-01', 'level-03'], {
        score: 50,
        stars: 3,
      }),
    ).toBe('cleared');
  });

  it('R-30: cleared when next is unlocked even if stars omitted (v2→v3)', () => {
    const unlocked = ['level-01', 'level-03', 'level-04'] as const;
    expect(
      selectRowState('level-01', unlocked, { score: 2150 }),
    ).toBe('cleared');
    expect(
      selectRowState('level-03', unlocked, { score: 900 }),
    ).toBe('cleared');
    // next after 03 is 04 (unlocked) ⇒ 03 cleared; 04 has no next unlocked ⇒ uncleared
    expect(selectRowState('level-04', unlocked, undefined)).toBe('uncleared');
  });

  it('final level-06: cleared only via stars (no next in catalog)', () => {
    const unlocked = [
      'level-01',
      'level-03',
      'level-04',
      'level-05',
      'level-06',
    ] as const;
    expect(
      selectRowState('level-06', unlocked, { score: 100 }),
    ).toBe('uncleared');
    expect(
      selectRowState('level-06', unlocked, { score: 100, stars: 2 }),
    ).toBe('cleared');
    // 05 is cleared because 06 is unlocked
    expect(selectRowState('level-05', unlocked, { score: 50 })).toBe('cleared');
  });
});

describe('PROGRESS_KEY / VERSION (C2 Plan 01)', () => {
  it("PROGRESS_KEY === '@nbb/progress/v3' and PROGRESS_VERSION === 3", () => {
    expect(PROGRESS_VERSION).toBe(3);
    expect(PROGRESS_KEY).toBe('@nbb/progress/v3');
    const b = defaultProgressBlob();
    expect(b.v).toBe(3);
    expect(b.unlocked).toEqual(['level-01']);
    expect(b.bestByLevel).toEqual({});
    expect(b.bestScore).toBe(0);
  });
});

describe('migrateOrDefault (C2 Plan 01)', () => {
  it('v1→v3 seeds bestScore; unlocked=[level-01]; empty bestByLevel', () => {
    const v1 = JSON.stringify({
      v: 1,
      bestScore: 42,
      updatedAt: 1,
    });
    const m = migrateOrDefault(null, null, v1);
    expect(m.v).toBe(3);
    expect(m.bestScore).toBe(42);
    expect(m.unlocked).toEqual(['level-01']);
    expect(m.bestByLevel).toEqual({});
  });

  it('v2→v3 preserves unlocked + maps number→{score} omit stars', () => {
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': 100, 'level-03': 50.7 },
      bestScore: 100,
      updatedAt: 9,
    });
    const m = migrateOrDefault(null, v2, null);
    expect(m.v).toBe(3);
    expect(m.unlocked).toEqual(['level-01', 'level-03']);
    expect(m.bestByLevel['level-01']).toEqual({ score: 100 });
    expect(m.bestByLevel['level-03']).toEqual({ score: 50 });
    expect(m.bestByLevel['level-01']).not.toHaveProperty('stars');
    expect(m.bestScore).toBe(100);
    expect(m.updatedAt).toBe(9);
  });

  it('valid v3 preferred over v2/v1', () => {
    const v3 = JSON.stringify({
      v: 3,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': { score: 5, stars: 2 } },
      bestScore: 5,
      updatedAt: 3,
    });
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01'],
      bestByLevel: { 'level-01': 999 },
      bestScore: 999,
      updatedAt: 2,
    });
    const v1 = JSON.stringify({ v: 1, bestScore: 50_000, updatedAt: 1 });
    const m = migrateOrDefault(v3, v2, v1);
    expect(m.bestScore).toBe(5);
    expect(m.unlocked).toContain('level-03');
    expect(m.bestByLevel['level-01']).toEqual({ score: 5, stars: 2 });
  });

  it('corrupt v3 + ok v2 still migrates from v2 (do not wipe)', () => {
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': 77 },
      bestScore: 77,
      updatedAt: 2,
    });
    const m = migrateOrDefault('{broken', v2, null);
    expect(m.v).toBe(3);
    expect(m.bestScore).toBe(77);
    expect(m.unlocked).toContain('level-03');
    expect(m.bestByLevel['level-01']).toEqual({ score: 77 });
  });
});

describe('parseProgressResult v3 (C2 Plan 01)', () => {
  it('corrupt v3 → defaults; never throw', () => {
    expect(() => parseProgressResult('{not-json')).not.toThrow();
    expect(parseProgressResult('{not-json').status).toBe('corrupt');
    expect(parseProgressResult('{not-json').progress).toEqual(
      defaultProgressBlob(),
    );
    // wrong version (v2 under v3 parser)
    expect(
      parseProgressResult(
        JSON.stringify({
          v: 2,
          unlocked: ['level-01'],
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressResult(
        JSON.stringify({
          v: 3,
          unlocked: 'nope',
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressResult(
        JSON.stringify({
          v: 3,
          unlocked: ['level-01'],
          bestByLevel: null,
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
  });

  it('ok parse: floors scores; stars only 1|2|3; drops unknown ids', () => {
    const r = parseProgressResult(
      JSON.stringify({
        v: 3,
        unlocked: ['level-03', 'level-02', 'level-99'],
        bestByLevel: {
          'level-03': { score: 10.7, stars: 2 },
          'level-01': { score: 5, stars: 9 },
          'level-02': { score: 99, stars: 1 },
          'level-bogus': { score: 5, stars: 1 },
        },
        bestScore: 3.2,
        updatedAt: 100,
      }),
    );
    expect(r.status).toBe('ok');
    expect(r.progress.unlocked).toEqual(['level-01', 'level-03']);
    expect(r.progress.bestByLevel['level-03']).toEqual({
      score: 10,
      stars: 2,
    });
    expect(r.progress.bestByLevel['level-01']).toEqual({ score: 5 });
    expect(r.progress.bestByLevel['level-01']).not.toHaveProperty('stars');
    expect(r.progress.bestByLevel).not.toHaveProperty('level-02');
    expect(r.progress.bestScore).toBe(10);
    expect(r.progress.updatedAt).toBe(100);
  });
});

describe('mergeHighWatermark (C2 Plan 01 / F-26)', () => {
  it('corrupt disk must not lower memory score/stars', () => {
    const memory: ProgressBlob = {
      v: 3,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: {
        'level-01': { score: 200, stars: 3 },
      },
      bestScore: 200,
      updatedAt: 50,
    };
    const incoming: ProgressBlob = {
      v: 3,
      unlocked: ['level-01'],
      bestByLevel: {
        'level-01': { score: 10 },
      },
      bestScore: 10,
      updatedAt: 1,
    };
    const merged = mergeHighWatermark(memory, incoming);
    expect(merged.bestByLevel['level-01']).toEqual({
      score: 200,
      stars: 3,
    });
    expect(merged.bestScore).toBe(200);
    expect(merged.unlocked).toContain('level-03');
  });

  it('maxes score; maxes stars when both present; never drops stars when incoming omits', () => {
    const memory: ProgressBlob = {
      v: 3,
      unlocked: ['level-01'],
      bestByLevel: { 'level-01': { score: 50, stars: 2 } },
      bestScore: 50,
      updatedAt: 1,
    };
    const incoming: ProgressBlob = {
      v: 3,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: {
        'level-01': { score: 80 },
        'level-03': { score: 40, stars: 1 },
      },
      bestScore: 80,
      updatedAt: 2,
    };
    const merged = mergeHighWatermark(memory, incoming);
    expect(merged.bestByLevel['level-01']).toEqual({ score: 80, stars: 2 });
    expect(merged.bestByLevel['level-03']).toEqual({ score: 40, stars: 1 });
    expect(merged.unlocked).toContain('level-03');
    expect(merged.bestScore).toBe(80);
  });
});

describe('recordRunEnd (C2 Plan 01)', () => {
  it('win merges max(stars); lose does not write stars; returns blob', () => {
    const store = createMemoryProgressStore();
    const win = store.recordRunEnd({
      levelId: 'level-01',
      score: 100,
      outcome: 'win',
      livesRemaining: 2,
    });
    expect(win.v).toBe(3);
    expect(win.bestByLevel['level-01']).toEqual({ score: 100, stars: 2 });
    expect(win.unlocked).toContain('level-03');
    expect(win.bestScore).toBe(100);

    const lose = store.recordRunEnd({
      levelId: 'level-01',
      score: 150,
      outcome: 'lose',
      livesRemaining: 0,
    });
    expect(lose.bestByLevel['level-01']).toEqual({ score: 150, stars: 2 });
    expect(lose.bestByLevel['level-01']).toHaveProperty('stars', 2);

    const winLowerStars = store.recordRunEnd({
      levelId: 'level-01',
      score: 90,
      outcome: 'win',
      livesRemaining: 1,
    });
    expect(winLowerStars.bestByLevel['level-01']).toEqual({
      score: 150,
      stars: 2,
    });

    const winHigherStars = store.recordRunEnd({
      levelId: 'level-01',
      score: 160,
      outcome: 'win',
      livesRemaining: 3,
    });
    expect(winHigherStars.bestByLevel['level-01']).toEqual({
      score: 160,
      stars: 3,
    });
  });

  it('getBestForLevel returns nested .score', async () => {
    const store = createMemoryProgressStore();
    expect(await store.getBestForLevel('level-01')).toBe(0);
    store.recordRunEnd({
      levelId: 'level-01',
      score: 42,
      outcome: 'lose',
      livesRemaining: 1,
    });
    expect(await store.getBestForLevel('level-01')).toBe(42);
    const snap = await store.getSnapshot();
    expect(snap.bestByLevel['level-01']).toEqual({ score: 42 });
  });
});

// Keep PERSONAL_BEST_KEY visible for migrate coverage.
void PERSONAL_BEST_KEY;
