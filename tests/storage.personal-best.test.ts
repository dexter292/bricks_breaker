// tests/storage.personal-best.test.ts — RUN-04 personal-best compare / parse / memory
import { describe, it, expect } from 'vitest';
import { evaluatePersonalBest } from '../src/services/storage/compareBest';
import { parsePersonalBestBlob } from '../src/services/storage/parseBlob';
import { createMemoryPersonalBestStore } from '../src/services/storage/memoryStore';

describe('evaluatePersonalBest', () => {
  it('strict greater-than sets isNewRecord and best = runScore', () => {
    expect(evaluatePersonalBest(100, 50)).toEqual({
      best: 100,
      isNewRecord: true,
    });
  });

  it('equal score is not a new record', () => {
    expect(evaluatePersonalBest(50, 50)).toEqual({
      best: 50,
      isNewRecord: false,
    });
  });

  it('lower runScore keeps previous best', () => {
    expect(evaluatePersonalBest(40, 50)).toEqual({
      best: 50,
      isNewRecord: false,
    });
  });
});

describe('parsePersonalBestBlob', () => {
  it('returns 0 for null', () => {
    expect(parsePersonalBestBlob(null)).toBe(0);
  });

  it('returns 0 for corrupt JSON / wrong v / non-finite / negative', () => {
    expect(parsePersonalBestBlob('{not-json')).toBe(0);
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 2, bestScore: 99, updatedAt: 1 }),
      ),
    ).toBe(0);
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 1, bestScore: Number.NaN, updatedAt: 1 }),
      ),
    ).toBe(0);
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 1, bestScore: -1, updatedAt: 1 }),
      ),
    ).toBe(0);
    expect(
      parsePersonalBestBlob(
        JSON.stringify({
          v: 1,
          bestScore: Number.POSITIVE_INFINITY,
          updatedAt: 1,
        }),
      ),
    ).toBe(0);
  });

  it('floors a valid v1 blob bestScore', () => {
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 1, bestScore: 42.9, updatedAt: 123 }),
      ),
    ).toBe(42);
  });
});

describe('createDefaultPersonalBestStore', () => {
  it('returns a working store without throwing when AsyncStorage native is absent (Node)', async () => {
    const { createDefaultPersonalBestStore } = await import(
      '../src/services/storage/asyncStorageStore'
    );
    const store = createDefaultPersonalBestStore();
    expect(await store.getBest()).toBe(0);
    await store.setBest(7);
    expect(await store.getBest()).toBe(7);
  });
});
