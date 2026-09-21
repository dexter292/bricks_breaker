// tests/storage.personal-best.test.ts — RUN-04 personal-best compare / parse / memory
import { describe, it, expect, beforeEach } from 'vitest';
import { evaluatePersonalBest } from '../src/services/storage/compareBest';
import {
  parsePersonalBestBlob,
  parsePersonalBestResult,
} from '../src/services/storage/parseBlob';
import { createMemoryPersonalBestStore } from '../src/services/storage/memoryStore';
import {
  createDefaultPersonalBestStore,
  __resetSharedPersonalBestStoreForTests,
} from '../src/services/storage/asyncStorageStore';

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

describe('parsePersonalBestBlob / Result (F-26)', () => {
  it('returns 0 for null (absent)', () => {
    expect(parsePersonalBestBlob(null)).toBe(0);
    expect(parsePersonalBestResult(null)).toEqual({
      status: 'absent',
      best: 0,
    });
  });

  it('marks corrupt distinctly from absent', () => {
    expect(parsePersonalBestResult('{not-json').status).toBe('corrupt');
    expect(
      parsePersonalBestResult(
        JSON.stringify({ v: 2, bestScore: 99, updatedAt: 1 }),
      ).status,
    ).toBe('corrupt');
    expect(
      parsePersonalBestResult(
        JSON.stringify({ v: 1, bestScore: Number.NaN, updatedAt: 1 }),
      ).status,
    ).toBe('corrupt');
    expect(
      parsePersonalBestResult(
        JSON.stringify({ v: 1, bestScore: -1, updatedAt: 1 }),
      ).status,
    ).toBe('corrupt');
  });

  it('legacy blob helper still returns 0 for corrupt (compat)', () => {
    expect(parsePersonalBestBlob('{not-json')).toBe(0);
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 2, bestScore: 99, updatedAt: 1 }),
      ),
    ).toBe(0);
  });

  it('floors a valid v1 blob bestScore', () => {
    expect(
      parsePersonalBestBlob(
        JSON.stringify({ v: 1, bestScore: 42.9, updatedAt: 123 }),
      ),
    ).toBe(42);
    expect(
      parsePersonalBestResult(
        JSON.stringify({ v: 1, bestScore: 42.9, updatedAt: 123 }),
      ),
    ).toEqual({ status: 'ok', best: 42 });
  });
});

describe('memory store watermark (F-26)', () => {
  it('setBest never lowers the watermark', async () => {
    const store = createMemoryPersonalBestStore();
    await store.setBest(50);
    await store.setBest(20);
    expect(await store.getBest()).toBe(50);
  });
});

describe('createDefaultPersonalBestStore singleton (F-26)', () => {
  beforeEach(() => {
    __resetSharedPersonalBestStoreForTests();
  });

  it('returns the same instance across calls', () => {
    const a = createDefaultPersonalBestStore();
    const b = createDefaultPersonalBestStore();
    expect(a).toBe(b);
  });

  it('returns a working store without throwing when AsyncStorage native is absent (Node)', async () => {
    const store = createDefaultPersonalBestStore();
    expect(await store.getBest()).toBe(0);
    await store.setBest(7);
    expect(await store.getBest()).toBe(7);
  });
});
