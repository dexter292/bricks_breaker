/**
 * F-51 — substep cap keeps fractional remainder when not truly behind.
 */
import { describe, it, expect } from 'vitest';
import { FIXED_DT, MAX_SUBSTEPS } from '../src/core';
import { remainderAfterSubstepCap } from '../src/runtime/substepCap';

describe('substep cap remainder (F-51)', () => {
  it('keeps 4ms remainder after 5 full steps from 5*dt+4ms', () => {
    const start = 5 * FIXED_DT + 0.004;
    const after = start - 5 * FIXED_DT;
    expect(after).toBeCloseTo(0.004, 6);
    expect(
      remainderAfterSubstepCap(after, 5, MAX_SUBSTEPS, FIXED_DT),
    ).toBeCloseTo(0.004, 6);
  });

  it('zeros when still behind after hitting the cap', () => {
    // 6 full steps queued but only 5 run → leftover still ≥ fixedDt
    const after = 6 * FIXED_DT - 5 * FIXED_DT;
    expect(after).toBeGreaterThanOrEqual(FIXED_DT);
    expect(remainderAfterSubstepCap(after, 5, MAX_SUBSTEPS, FIXED_DT)).toBe(0);
  });

  it('leaves accumulator untouched when steps < max', () => {
    expect(
      remainderAfterSubstepCap(0.003, 2, MAX_SUBSTEPS, FIXED_DT),
    ).toBeCloseTo(0.003, 6);
  });
});
