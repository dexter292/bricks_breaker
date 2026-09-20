// tests/core.smoke.test.ts — D-09 / Phase 2 World
import { describe, it, expect } from 'vitest';
import { allocateWorld, stepWorld, FIXED_DT } from '../src/core';

describe('core/ runs unchanged in Node', () => {
  it('allocates and steps a World with real motion and finite ball state', () => {
    const w = allocateWorld();
    const intent = { paddleX: w.paddleX, launch: 0 };
    const x0 = w.ballX[0];
    const y0 = w.ballY[0];
    const vx0 = w.ballVx[0];

    stepWorld(w, intent, FIXED_DT);
    stepWorld(w, intent, FIXED_DT);

    expect(Number.isFinite(w.ballX[0])).toBe(true);
    expect(Number.isFinite(w.ballY[0])).toBe(true);
    expect(w.tick).toBe(2);
    // Position should change under non-zero velocity
    expect(w.ballX[0] !== x0 || w.ballY[0] !== y0).toBe(true);

    // Drive into left wall and expect vx to flip sign after enough steps
    w.ballX[0] = 10;
    w.ballY[0] = 320;
    w.ballVx[0] = -600;
    w.ballVy[0] = 0;
    w.ballActive[0] = 1;
    for (let i = 0; i < 30; i++) {
      stepWorld(w, intent, FIXED_DT);
      if (w.ballVx[0] > 0) break;
    }
    expect(w.ballVx[0]).toBeGreaterThan(0);
    expect(Number.isFinite(vx0)).toBe(true);
  });
});
