// tests/core.smoke.test.ts — D-09
import { describe, it, expect } from 'vitest';
import { allocateWorld, stepStub } from '../src/core';

describe('core/ runs unchanged in Node', () => {
  it('allocates and mutates a world across steps with no RN runtime', () => {
    const w = allocateWorld(256);
    const x0 = w.x[0];
    stepStub(w, 1 / 120);
    stepStub(w, 1 / 120);
    expect(w.x[0]).not.toBe(x0); // mutated in place
    expect(Number.isFinite(w.x[0])).toBe(true);
  });
});
