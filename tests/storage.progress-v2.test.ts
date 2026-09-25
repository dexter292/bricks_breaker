/**
 * N-PROG-01 / N-PROG-02 — catalog, unlock, v2 migrate-input helpers, v3 store basics.
 * ProgressBlob is v3; legacy v2 JSON is covered via parseProgressV2Result + migrateOrDefault.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROGRESS_KEY,
  PROGRESS_KEY_V2,
  PROGRESS_VERSION,
  PERSONAL_BEST_KEY,
  defaultProgressBlob,
  PLAYABLE_LEVEL_ORDER,
  nextLevelId,
  defaultUnlocked,
  unlockAfterClear,
  isUnlocked,
  parseProgressResult,
  parseProgressV2Result,
  migrateOrDefault,
  createMemoryProgressStore,
  createDefaultProgressStore,
  __resetSharedProgressStoreForTests,
} from '../src/services/storage';

describe('progress catalog + unlock (C1 Wave 0)', () => {
  it('PLAYABLE_LEVEL_ORDER is 5 ids without level-02', () => {
    expect(PLAYABLE_LEVEL_ORDER).toHaveLength(5);
    expect(PLAYABLE_LEVEL_ORDER).toEqual([
      'level-01',
      'level-03',
      'level-04',
      'level-05',
      'level-06',
    ]);
    expect(PLAYABLE_LEVEL_ORDER.includes('level-02' as never)).toBe(false);
  });

  it('nextLevelId follows catalog; end and unknown → null', () => {
    expect(nextLevelId('level-01')).toBe('level-03');
    expect(nextLevelId('level-03')).toBe('level-04');
    expect(nextLevelId('level-06')).toBeNull();
    expect(nextLevelId('level-02' as never)).toBeNull();
  });

  it('defaultUnlocked is only level-01', () => {
    expect(defaultUnlocked()).toEqual(['level-01']);
  });

  it('unlockAfterClear unlocks next; idempotent; never level-02', () => {
    const u1 = unlockAfterClear(['level-01'], 'level-01');
    expect(u1).toContain('level-03');
    expect(u1).not.toContain('level-02' as never);
    expect(unlockAfterClear(u1, 'level-01')).toEqual(u1);
  });

  it('isUnlocked: level-01 always; others need membership', () => {
    expect(isUnlocked([], 'level-01')).toBe(true);
    expect(isUnlocked(['level-01'], 'level-03')).toBe(false);
    expect(isUnlocked(['level-01', 'level-03'], 'level-03')).toBe(true);
  });

  it('defaultProgressBlob shape (v3)', () => {
    const b = defaultProgressBlob();
    expect(b.v).toBe(PROGRESS_VERSION);
    expect(b.v).toBe(3);
    expect(PROGRESS_KEY).toBe('@nbb/progress/v3');
    expect(PROGRESS_KEY_V2).toBe('@nbb/progress/v2');
    expect(b.unlocked).toEqual(['level-01']);
    expect(b.bestByLevel).toEqual({});
    expect(b.bestScore).toBe(0);
  });
});

describe('parseProgressV2Result (migrate input)', () => {
  it('null → absent defaults', () => {
    const r = parseProgressV2Result(null);
    expect(r.status).toBe('absent');
    expect(r.progress.v).toBe(2);
    expect(r.progress.unlocked).toEqual(['level-01']);
  });

  it('corrupt JSON / wrong v / bad unlocked → corrupt', () => {
    expect(parseProgressV2Result('{not-json').status).toBe('corrupt');
    expect(
      parseProgressV2Result(
        JSON.stringify({
          v: 1,
          unlocked: ['level-01'],
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressV2Result(
        JSON.stringify({
          v: 2,
          unlocked: 'nope',
          bestByLevel: {},
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressV2Result(
        JSON.stringify({
          v: 2,
          unlocked: ['level-01'],
          bestByLevel: null,
          bestScore: 1,
        }),
      ).status,
    ).toBe('corrupt');
    expect(
      parseProgressV2Result(
        JSON.stringify({
          v: 2,
          unlocked: ['level-01'],
          bestByLevel: {},
          bestScore: Number.NaN,
        }),
      ).status,
    ).toBe('corrupt');
  });

  it('ok blob floors scores, drops unknown ids, ensures level-01', () => {
    const r = parseProgressV2Result(
      JSON.stringify({
        v: 2,
        unlocked: ['level-03', 'level-02', 'level-99'],
        bestByLevel: {
          'level-03': 10.7,
          'level-02': 99,
          'level-bogus': 5,
        },
        bestScore: 3.2,
        updatedAt: 100,
      }),
    );
    expect(r.status).toBe('ok');
    expect(r.progress.unlocked).toEqual(['level-01', 'level-03']);
    expect(r.progress.bestByLevel).toEqual({ 'level-03': 10 });
    expect(r.progress.bestScore).toBe(10);
    expect(r.progress.updatedAt).toBe(100);
  });
});

describe('parseProgressResult rejects v2 under v3 key', () => {
  it('v2 JSON is corrupt for parseProgressResult', () => {
    expect(
      parseProgressResult(
        JSON.stringify({
          v: 2,
          unlocked: ['level-01'],
          bestByLevel: { 'level-01': 5 },
          bestScore: 5,
        }),
      ).status,
    ).toBe('corrupt');
  });
});

describe('migrateOrDefault (v1/v2→v3)', () => {
  it('v1-only seeds bestScore; unlocked=[level-01]; empty bestByLevel', () => {
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

  it('valid v2 preferred over v1; maps to nested {score}', () => {
    const v2 = JSON.stringify({
      v: 2,
      unlocked: ['level-01', 'level-03'],
      bestByLevel: { 'level-01': 5 },
      bestScore: 5,
      updatedAt: 2,
    });
    const v1 = JSON.stringify({ v: 1, bestScore: 999, updatedAt: 1 });
    const m = migrateOrDefault(null, v2, v1);
    expect(m.v).toBe(3);
    expect(m.bestScore).toBe(5);
    expect(m.unlocked).toContain('level-03');
    expect(m.bestByLevel['level-01']).toEqual({ score: 5 });
  });

  it('null,null,null → defaults', () => {
    expect(migrateOrDefault(null, null, null)).toEqual(defaultProgressBlob());
  });

  it('corrupt v2 + ok v1 seeds from v1 (do not lose PB)', () => {
    const v1 = JSON.stringify({ v: 1, bestScore: 77, updatedAt: 1 });
    const m = migrateOrDefault(null, '{broken', v1);
    expect(m.bestScore).toBe(77);
    expect(m.unlocked).toEqual(['level-01']);
    expect(m.bestByLevel).toEqual({});
  });
});

describe('memory ProgressStore (v3 nested best)', () => {
  it('recordLevelBest strict >; rollup bestScore; getBestForLevel nested score', async () => {
    const store = createMemoryProgressStore();
    expect(await store.getBestForLevel('level-01')).toBe(0);
    await store.recordLevelBest('level-01', 100);
    expect(await store.getBestForLevel('level-01')).toBe(100);
    expect(await store.getBest()).toBe(100);
    await store.recordLevelBest('level-01', 100);
    expect(await store.getBestForLevel('level-01')).toBe(100);
    await store.recordLevelBest('level-01', 50);
    expect(await store.getBestForLevel('level-01')).toBe(100);
    await store.recordLevelBest('level-03', 120);
    expect(await store.getBest()).toBe(120);
    expect(await store.getBestForLevel('level-01')).toBe(100);
    const snap = await store.getSnapshot();
    expect(snap.bestByLevel['level-01']).toEqual({ score: 100 });
    expect(snap.bestByLevel['level-01']).not.toHaveProperty('stars');
  });

  it('unlockAfterClear on win semantics (store method)', async () => {
    const store = createMemoryProgressStore();
    expect(await store.isUnlocked('level-03')).toBe(false);
    await store.unlockAfterClear('level-01');
    expect(await store.isUnlocked('level-03')).toBe(true);
    const snap = await store.getSnapshot();
    expect(snap.unlocked).not.toContain('level-02' as never);
    await store.unlockAfterClear('level-01');
    expect(await store.getSnapshot()).toEqual({
      ...snap,
      updatedAt: expect.any(Number),
    });
  });
});

describe('createDefaultProgressStore singleton (C1 Wave 1)', () => {
  beforeEach(() => {
    __resetSharedProgressStoreForTests();
  });

  it('returns same instance; reset clears', () => {
    const a = createDefaultProgressStore();
    const b = createDefaultProgressStore();
    expect(a).toBe(b);
    __resetSharedProgressStoreForTests();
    const c = createDefaultProgressStore();
    expect(c).not.toBe(a);
  });
});

// Keep PERSONAL_BEST_KEY referenced so migrate key stays visible in suite.
void PERSONAL_BEST_KEY;
