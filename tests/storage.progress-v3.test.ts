/**
 * N-PROG-03 — progress v3 stars helpers + migrate/parse (C2 Plan 01).
 *
 * Phase 9 bumped the active blob to v4, so the v3-active functions live on here
 * under their legacy `*V3` names with unchanged behavior. The v4 equivalents (and
 * the store-level recordRunEnd coverage) live in tests/storage.progress-v4.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  PERSONAL_BEST_KEY,
  computeStars,
  mergeLevelBest,
  selectRowState,
  defaultProgressBlobV3,
  parseProgressV3Result,
  migrateOrDefaultV3,
  mergeHighWatermarkV3,
  PLAYABLE_LEVEL_ORDER,
  type LevelBest,
  type ProgressBlobV3,
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

  it('E2 reorder: a pre-E2 save cannot leave a hole in the ladder', () => {
    // Observed on device after the E2 reorder: level-05 showed Locked while level-06 and
    // level-03 sat unlocked behind it, because the old chain unlocked ids in a different
    // order. Healing keeps the player's distance (4 unlocked) and closes the gap.
    const preE2 = JSON.stringify({
      v: 3,
      unlocked: ['level-01', 'level-03', 'level-04', 'level-06'],
      bestByLevel: { 'level-03': { score: 900, stars: 2 } },
      bestScore: 900,
      updatedAt: 7,
    });
    const m = migrateOrDefaultV3(preE2, null, null);

    expect(m.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 4));
    // No gap: every unlocked level is contiguous from the start of the campaign.
    m.unlocked.forEach((id, i) => expect(id).toBe(PLAYABLE_LEVEL_ORDER[i]));
    // Progress distance preserved, and bests/stars are untouched by the heal.
    expect(m.unlocked).toHaveLength(4);
    expect(m.bestByLevel['level-03']).toEqual({ score: 900, stars: 2 });
  });

  it('R-30: cleared when next is unlocked even if stars omitted (v2→v3)', () => {
    // Derived from the catalog so the E2 curve order is the single source of truth.
    const [first, second, third] = PLAYABLE_LEVEL_ORDER;
    const unlocked = [first!, second!, third!] as const;
    expect(selectRowState(first!, unlocked, { score: 2150 })).toBe('cleared');
    expect(selectRowState(second!, unlocked, { score: 900 })).toBe('cleared');
    // third's own next is not unlocked ⇒ uncleared
    expect(selectRowState(third!, unlocked, undefined)).toBe('uncleared');
  });

  it('final catalog level: cleared only via stars (no next in catalog)', () => {
    const unlocked = [...PLAYABLE_LEVEL_ORDER] as const;
    const last = PLAYABLE_LEVEL_ORDER[PLAYABLE_LEVEL_ORDER.length - 1]!;
    const penultimate = PLAYABLE_LEVEL_ORDER[PLAYABLE_LEVEL_ORDER.length - 2]!;
    expect(selectRowState(last, unlocked, { score: 100 })).toBe('uncleared');
    expect(selectRowState(last, unlocked, { score: 100, stars: 2 })).toBe('cleared');
    // penultimate is cleared because the final level is unlocked
    expect(selectRowState(penultimate, unlocked, { score: 50 })).toBe('cleared');
  });
});

describe('migrateOrDefaultV3 (C2 Plan 01)', () => {
  it('v1→v3 seeds bestScore; unlocked=[level-01]; empty bestByLevel', () => {
    const v1 = JSON.stringify({
      v: 1,
      bestScore: 42,
      updatedAt: 1,
    });
    const m = migrateOrDefaultV3(null, null, v1);
    expect(m.v).toBe(3);
    expect(m.bestScore).toBe(42);
    expect(m.unlocked).toEqual(['level-01']);
    expect(m.bestByLevel).toEqual({});
  });

  it('v2→v3 heals unlocked to a same-length catalog prefix; number→{score} omit stars', () => {
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': 100, 'level-03': 50.7 },
      bestScore: 100,
      updatedAt: 9,
    });
    const m = migrateOrDefaultV3(null, v2, null);
    expect(m.v).toBe(3);
    expect(m.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
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
    const m = migrateOrDefaultV3(v3, v2, v1);
    expect(m.bestScore).toBe(5);
    expect(m.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
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
    const m = migrateOrDefaultV3('{broken', v2, null);
    expect(m.v).toBe(3);
    expect(m.bestScore).toBe(77);
    expect(m.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
    expect(m.bestByLevel['level-01']).toEqual({ score: 77 });
  });
});

describe('parseProgressV3Result (C2 Plan 01)', () => {
  it('corrupt v3 → defaults; never throw', () => {
    expect(() => parseProgressV3Result('{not-json')).not.toThrow();
    expect(parseProgressV3Result('{not-json').status).toBe('corrupt');
    expect(parseProgressV3Result('{not-json').progress).toEqual(
      defaultProgressBlobV3(),
    );
    // wrong version (v2 under v3 parser)
    expect(
      parseProgressV3Result(
        JSON.stringify({
          v: 2,
          unlocked: ['level-01'],
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressV3Result(
        JSON.stringify({
          v: 3,
          unlocked: 'nope',
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressV3Result(
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
    const r = parseProgressV3Result(
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
    expect(r.progress.unlocked).toEqual(PLAYABLE_LEVEL_ORDER.slice(0, 2));
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

describe('mergeHighWatermarkV3 (C2 Plan 01 / F-26)', () => {
  it('corrupt disk must not lower memory score/stars', () => {
    const memory: ProgressBlobV3 = {
      v: 3,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: {
        'level-01': { score: 200, stars: 3 },
      },
      bestScore: 200,
      updatedAt: 50,
    };
    const incoming: ProgressBlobV3 = {
      v: 3,
      unlocked: ['level-01'],
      bestByLevel: {
        'level-01': { score: 10 },
      },
      bestScore: 10,
      updatedAt: 1,
    };
    const merged = mergeHighWatermarkV3(memory, incoming);
    expect(merged.bestByLevel['level-01']).toEqual({
      score: 200,
      stars: 3,
    });
    expect(merged.bestScore).toBe(200);
    expect(merged.unlocked).toContain('level-03');
  });

  it('maxes score; maxes stars when both present; never drops stars when incoming omits', () => {
    const memory: ProgressBlobV3 = {
      v: 3,
      unlocked: ['level-01'],
      bestByLevel: { 'level-01': { score: 50, stars: 2 } },
      bestScore: 50,
      updatedAt: 1,
    };
    const incoming: ProgressBlobV3 = {
      v: 3,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: {
        'level-01': { score: 80 },
        'level-03': { score: 40, stars: 1 },
      },
      bestScore: 80,
      updatedAt: 2,
    };
    const merged = mergeHighWatermarkV3(memory, incoming);
    expect(merged.bestByLevel['level-01']).toEqual({ score: 80, stars: 2 });
    expect(merged.bestByLevel['level-03']).toEqual({ score: 40, stars: 1 });
    expect(merged.unlocked).toContain('level-03');
    expect(merged.bestScore).toBe(80);
  });
});

// Keep PERSONAL_BEST_KEY visible for migrate coverage.
void PERSONAL_BEST_KEY;
