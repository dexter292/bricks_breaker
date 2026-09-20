// tests/vfx.intensity.test.ts — FX-02 intensity scalar contracts
import { describe, it, expect } from 'vitest';
import {
  intensityFromReduceMotion,
  trailLength,
  clampIntensity,
} from '../src/vfx/intensity';

describe('vfx intensity (FX-02)', () => {
  it('intensityFromReduceMotion(false) === 1.0', () => {
    expect(intensityFromReduceMotion(false)).toBe(1.0);
  });

  it('intensityFromReduceMotion(true) === 0.2', () => {
    expect(intensityFromReduceMotion(true)).toBe(0.2);
  });

  it('clampIntensity clamps to [0,1]', () => {
    expect(clampIntensity(0.5)).toBe(0.5);
    expect(clampIntensity(-1)).toBe(0);
    expect(clampIntensity(2)).toBe(1);
    expect(clampIntensity(Number.NaN)).toBe(0);
    expect(clampIntensity(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('vfx trailLength (FX-01 via intensity)', () => {
  it('trailLength(1.0) === 5', () => {
    expect(trailLength(1.0)).toBe(5);
  });

  it('trailLength(0.2) === 2', () => {
    expect(trailLength(0.2)).toBe(2);
  });

  it('trailLength never returns 0', () => {
    expect(trailLength(0)).toBe(2);
    expect(trailLength(-10)).toBe(2);
  });
});
