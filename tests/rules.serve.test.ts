/**
 * PHYS-05 — docked serve via Intent.launch + resolvePaddleEnglish.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepRun,
  SimPhase,
  SERVE_SPEED,
  FIXED_DT,
} from '../src/core';

describe('serve rules (dock / launch)', () => {
  it('keeps ball docked while launch=0 and rides paddleX', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.ballVx[0]).toBe(0);
    expect(w.ballVy[0]).toBe(0);

    const targetX = 220;
    stepRun(w, { paddleX: targetX, launch: 0 }, FIXED_DT);

    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.paddleX).toBe(targetX);
    expect(w.ballX[0]).toBe(targetX);
    expect(w.ballVx[0]).toBe(0);
    expect(w.ballVy[0]).toBe(0);
    expect(w.ballActive[0]).toBe(1);
  });

  it('launch=1 while docked applies upward english serve and enters PLAYING', () => {
    const w = allocateWorld();
    resetWorld(w, 3, 4);
    // Offset ball from paddle center so english produces non-zero vx
    w.paddleX = 180;
    w.ballX[0] = 180 + 20;

    stepRun(w, { paddleX: 180, launch: 1 }, FIXED_DT);

    expect(w.simPhase).toBe(SimPhase.PLAYING);
    expect(w.ballActive[0]).toBe(1);
    expect(w.ballVy[0]).toBeLessThan(0); // upward in y-down
    expect(Math.abs(w.ballVy[0])).toBeGreaterThan(Math.abs(w.ballVx[0]));
    const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
    expect(speed).toBeCloseTo(SERVE_SPEED, 5);
  });

  it('ignores non-finite launch and leaves prior paddle on non-finite paddleX', () => {
    const w = allocateWorld();
    resetWorld(w, 5, 6);
    const px0 = w.paddleX;

    stepRun(w, { paddleX: Number.NaN, launch: Number.NaN }, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.paddleX).toBe(px0);
    expect(w.ballVx[0]).toBe(0);

    stepRun(w, { paddleX: px0, launch: Number.POSITIVE_INFINITY }, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.ballVy[0]).toBe(0);
  });
});
