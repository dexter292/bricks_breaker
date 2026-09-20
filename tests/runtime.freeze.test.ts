// tests/runtime.freeze.test.ts — PLT-01 freeze / clamp helpers
import { describe, it, expect } from 'vitest';
import {
  UiPhase,
  clampFrameDt,
  resetAccumulator,
  shouldFreezeForUiPhase,
  pendingSubsteps,
} from '../src/runtime/freeze';

describe('resetAccumulator', () => {
  it('zeros the accumulator', () => {
    const world = { accumulator: 1.5 };
    resetAccumulator(world);
    expect(world.accumulator).toBe(0);
  });
});

describe('clampFrameDt', () => {
  it('clamps long dt to maxFrameTime', () => {
    expect(clampFrameDt(5, 0.25)).toBe(0.25);
  });

  it('passes through short finite dt', () => {
    expect(clampFrameDt(0.01, 0.25)).toBe(0.01);
  });

  it('returns 1/60 for non-finite dt', () => {
    expect(clampFrameDt(Number.NaN, 0.25)).toBe(1 / 60);
    expect(clampFrameDt(Number.POSITIVE_INFINITY, 0.25)).toBe(1 / 60);
  });
});

describe('shouldFreezeForUiPhase', () => {
  it('freezes paused, countdown, won, lost', () => {
    expect(shouldFreezeForUiPhase(UiPhase.PAUSED)).toBe(true);
    expect(shouldFreezeForUiPhase(UiPhase.COUNTDOWN)).toBe(true);
    expect(shouldFreezeForUiPhase(UiPhase.WON)).toBe(true);
    expect(shouldFreezeForUiPhase(UiPhase.LOST)).toBe(true);
  });

  it('does not freeze playing', () => {
    expect(shouldFreezeForUiPhase(UiPhase.PLAYING)).toBe(false);
  });
});

describe('pendingSubsteps', () => {
  it('floors accumulator/fixedDt capped by maxSubsteps', () => {
    expect(pendingSubsteps(0.1, 1 / 120, 5)).toBe(Math.min(Math.floor(0.1 / (1 / 120)), 5));
  });
});
