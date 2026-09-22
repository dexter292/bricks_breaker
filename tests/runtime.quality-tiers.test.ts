/**
 * PLT-03 — quality tier heuristic (08-W0-02 → Plan 02).
 */
import { describe, it, expect } from 'vitest';
import {
  BUDGETS,
  resolveQualityTier,
  tierFromMemory,
  type QualityTier,
} from '../src/runtime/resolveQualityTier';

const GB = 1024 ** 3;

describe('runtime.quality-tiers', () => {
  it('null/invalid totalMemory → tier mid (unknown-device fallback)', () => {
    expect(tierFromMemory(null)).toBeNull();
    expect(tierFromMemory(Number.NaN)).toBeNull();
    expect(tierFromMemory(0)).toBeNull();
    expect(tierFromMemory(-1)).toBeNull();
    expect(resolveQualityTier({ totalMemory: null }).tier).toBe('mid');
    expect(resolveQualityTier({ totalMemory: Number.NaN }).tier).toBe('mid');
    expect(resolveQualityTier({}).tier).toBe('mid');
  });

  it('~6GB memory maps to mid (Pixel 6a band)', () => {
    expect(tierFromMemory(6 * GB)).toBe('mid');
    expect(resolveQualityTier({ totalMemory: 6 * GB }).tier).toBe('mid');
    expect(resolveQualityTier({ totalMemory: 4 * GB }).tier).toBe('mid');
    expect(resolveQualityTier({ totalMemory: 7.9 * GB }).tier).toBe('mid');
  });

  it('≥8GB maps to high; <4GB maps to low', () => {
    expect(tierFromMemory(8 * GB)).toBe('high');
    expect(tierFromMemory(16 * GB)).toBe('high');
    expect(tierFromMemory(3.9 * GB)).toBe('low');
    expect(resolveQualityTier({ totalMemory: 8 * GB }).tier).toBe('high');
    expect(resolveQualityTier({ totalMemory: 2 * GB }).tier).toBe('low');
  });

  it('BUDGETS.low|mid|high expose particleCap trailMax glowScale', () => {
    const tiers: QualityTier[] = ['low', 'mid', 'high'];
    for (const t of tiers) {
      expect(BUDGETS[t]).toEqual(
        expect.objectContaining({
          particleCap: expect.any(Number),
          trailMax: expect.any(Number),
          glowScale: expect.any(Number),
        }),
      );
    }
    expect(BUDGETS.low).toEqual({
      particleCap: 48,
      trailMax: 2,
      glowScale: 0,
    });
    expect(BUDGETS.mid).toEqual({
      particleCap: 128,
      trailMax: 4,
      glowScale: 1,
    });
    expect(BUDGETS.high).toEqual({
      particleCap: 192,
      trailMax: 5,
      glowScale: 1,
    });
    expect(BUDGETS.mid.particleCap).toBe(128);
    expect(BUDGETS.high.trailMax).toBeGreaterThan(BUDGETS.mid.trailMax);
    expect(BUDGETS.low.glowScale).toBe(0);
  });

  it('trailMax never below 2 (FX-01)', () => {
    expect(BUDGETS.low.trailMax).toBeGreaterThanOrEqual(2);
    expect(BUDGETS.mid.trailMax).toBeGreaterThanOrEqual(2);
    expect(BUDGETS.high.trailMax).toBeGreaterThanOrEqual(2);
  });

  it('override wins; Pixel 6a modelName forces mid (D-13)', () => {
    expect(resolveQualityTier({ override: 'high', totalMemory: null }).tier).toBe(
      'high',
    );
    expect(
      resolveQualityTier({
        totalMemory: 2 * GB,
        modelName: 'Pixel 6a',
      }).tier,
    ).toBe('mid');
    expect(
      resolveQualityTier({
        totalMemory: 16 * GB,
        modelName: 'Google Pixel 6a',
      }).tier,
    ).toBe('mid');
  });

  it('resolveQualityTier returns matching BUDGETS entry', () => {
    const { tier, budget } = resolveQualityTier({ totalMemory: 6 * GB });
    expect(tier).toBe('mid');
    expect(budget).toEqual(BUDGETS.mid);
  });
});
