/**
 * N-PROG-03 — progress v3 stars helpers (Wave 0 GREEN) + migrate/store todos (Plan 01).
 */
import { describe, it, expect } from 'vitest';
import {
  computeStars,
  mergeLevelBest,
  selectRowState,
  type LevelBest,
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

describe('migrateOrDefault / store (C2 Plan 01 todos)', () => {
  it.todo(
    'migrateOrDefault: v1→v3 seeds bestScore; unlocked=[level-01]; empty bestByLevel',
  );
  it.todo(
    'migrateOrDefault: v2→v3 preserves unlocked + maps number→{score} omit stars',
  );
  it.todo('migrateOrDefault: valid v3 preferred over v2/v1');
  it.todo('parseProgressResult: corrupt v3 → defaults; never throw');
  it.todo(
    'mergeHighWatermark: corrupt disk must not lower memory score/stars',
  );
  it.todo(
    'recordRunEnd: win merges max(stars); lose does not write stars; returns blob',
  );
  it.todo("PROGRESS_KEY === '@nbb/progress/v3' and PROGRESS_VERSION === 3");
});
