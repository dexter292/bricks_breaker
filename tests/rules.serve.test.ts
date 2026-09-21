/**
 * PHYS-05 — docked serve: fixed vertical launch (F-21 scope-b).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepRun,
  applyServe,
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

  it('launch=1 while docked applies fixed vertical serve (0, -SERVE_SPEED)', () => {
    const w = allocateWorld();
    resetWorld(w, 3, 4);
    // Pre-offset is wiped by dockBall before serve — contract is always vertical.
    w.paddleX = 180;
    w.ballX[0] = 180 + 35;

    stepRun(w, { paddleX: 180, launch: 1 }, FIXED_DT);

    expect(w.simPhase).toBe(SimPhase.PLAYING);
    expect(w.ballActive[0]).toBe(1);
    expect(w.ballVx[0]).toBe(0);
    expect(w.ballVy[0]).toBeCloseTo(-SERVE_SPEED, 5);
  });

  it('applyServe is independent of pre-set ballX / paddleX (F-21b)', () => {
    const cases = [
      { paddleX: 80, ballX: 40 },
      { paddleX: 180, ballX: 180 },
      { paddleX: 280, ballX: 310 },
    ];
    for (const c of cases) {
      const w = allocateWorld();
      resetWorld(w, 1, 2);
      w.paddleX = c.paddleX;
      w.ballX[0] = c.ballX;
      applyServe(w, SERVE_SPEED);
      expect(w.ballVx[0]).toBe(0);
      expect(w.ballVy[0]).toBeCloseTo(-SERVE_SPEED, 5);
    }
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
