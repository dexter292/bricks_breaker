// tests/core.smoke.test.ts — D-09 / Phase 2 World
import { describe, it, expect } from 'vitest';
import { allocateWorld, stepWorld, FIXED_DT } from '../src/core';

describe('core/ runs unchanged in Node', () => {
  it('allocates and steps a World with finite ball state', () => {
    const w = allocateWorld();
    const intent = { paddleX: w.paddleX, launch: 0 };
    stepWorld(w, intent, FIXED_DT);
    stepWorld(w, intent, FIXED_DT);
    expect(Number.isFinite(w.ballX[0])).toBe(true);
    expect(w.tick).toBe(2);
  });
});
