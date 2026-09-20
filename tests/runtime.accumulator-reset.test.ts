// tests/runtime.accumulator-reset.test.ts — PLT-01 no catch-up after stall
import { describe, it, expect } from 'vitest';
import {
  clampFrameDt,
  resetAccumulator,
  pendingSubsteps,
} from '../src/runtime/freeze';
import { FIXED_DT, MAX_FRAME_TIME, MAX_SUBSTEPS } from '../src/runtime/constants';

describe('accumulator reset after stall (PLT-01)', () => {
  it('clamp then reset leaves 0 pending steps (no catch-up)', () => {
    const world = { accumulator: 0 };

    // Simulate a long background stall injecting huge wall-clock dt
    const rawDt = 5; // 5 seconds away
    const dt = clampFrameDt(rawDt, MAX_FRAME_TIME);
    world.accumulator += dt;

    // Before reset there would be pending substeps from the clamped gap
    expect(pendingSubsteps(world.accumulator, FIXED_DT, MAX_SUBSTEPS)).toBeGreaterThan(0);

    // Pause / AppState path must zero accumulator — never catch up
    resetAccumulator(world);
    expect(world.accumulator).toBe(0);
    expect(pendingSubsteps(world.accumulator, FIXED_DT, MAX_SUBSTEPS)).toBe(0);
  });
});
