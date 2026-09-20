/**
 * PWR-01 — last-ball life (D-12 / D-13).
 * Life decrements only when activeBallCount === 0 after the step.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  applyLivesFromBallCount,
  applyOrRefreshExpand,
  SimPhase,
  FIXED_DT,
  stepRun,
} from '../src/core';

function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  w.simPhase = SimPhase.PLAYING;
  return w;
}

describe('lives rules (last-ball)', () => {
  it('activeBallCount === 0 decrements exactly one life and docks', () => {
    const w = playingWorld();
    w.lives = 3;
    w.score = 420;
    w.activeBallCount = 0;
    for (let i = 0; i < w.maxBalls; i++) {
      w.ballActive[i] = 0;
    }

    applyLivesFromBallCount(w);

    expect(w.lives).toBe(2);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.activeBallCount).toBe(1);
    expect(w.ballActive[0]).toBe(1);
    expect(w.score).toBe(420);
  });

  it('losing one ball while others remain does not change lives', () => {
    const w = playingWorld();
    w.lives = 3;
    // Two active balls (dense prefix after compact)
    w.ballActive[0] = 1;
    w.ballActive[1] = 1;
    w.activeBallCount = 2;

    // Simulate compact removing one ball → count=1
    w.ballActive[1] = 0;
    w.activeBallCount = 1;

    applyLivesFromBallCount(w);

    expect(w.lives).toBe(3);
    expect(w.simPhase).toBe(SimPhase.PLAYING);
  });

  it('life reset clears pickups, expires expand, docks one ball, preserves score and brick HP', () => {
    const w = playingWorld();
    w.lives = 2;
    w.score = 999;
    w.combo = 7;
    loadTestGrid(w, [
      { x: 40, y: 80, w: 36, h: 16, hp: 3 },
      { x: 80, y: 80, w: 36, h: 16, hp: 2 },
    ]);
    const hp0 = w.brickHp[0];
    const hp1 = w.brickHp[1];

    // Falling pickup
    w.pickupActive[0] = 1;
    w.pickupType[0] = 1;
    w.pickupX[0] = 100;
    w.pickupY[0] = 200;
    w.pickupCount = 1;

    // Expand active
    applyOrRefreshExpand(w);
    expect(w.paddleW).toBe(108);

    // Last ball gone
    w.activeBallCount = 0;
    for (let i = 0; i < w.maxBalls; i++) {
      w.ballActive[i] = 0;
    }

    applyLivesFromBallCount(w);

    expect(w.lives).toBe(1);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.score).toBe(999);
    expect(w.combo).toBe(1);
    expect(w.pickupCount).toBe(0);
    for (let i = 0; i < w.maxPickups; i++) {
      expect(w.pickupActive[i]).toBe(0);
    }
    expect(w.effectCount).toBe(0);
    expect(w.paddleW).toBe(72);
    expect(w.activeBallCount).toBe(1);
    expect(w.ballActive[0]).toBe(1);
    for (let i = 1; i < w.maxBalls; i++) {
      expect(w.ballActive[i]).toBe(0);
    }
    expect(w.brickHp[0]).toBe(hp0);
    expect(w.brickHp[1]).toBe(hp1);
  });

  it('lives === 1 and activeBallCount === 0 → SimPhase.LOST', () => {
    const w = playingWorld();
    w.lives = 1;
    w.activeBallCount = 0;
    for (let i = 0; i < w.maxBalls; i++) {
      w.ballActive[i] = 0;
    }

    applyLivesFromBallCount(w);

    expect(w.lives).toBe(0);
    expect(w.simPhase).toBe(SimPhase.LOST);
  });

  it('WON/LOST phases are no-ops for stepRun', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.WON;
    w.lives = 2;
    w.score = 50;
    stepRun(w, { paddleX: 180, launch: 0 }, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.WON);
    expect(w.lives).toBe(2);
    expect(w.score).toBe(50);

    w.simPhase = SimPhase.LOST;
    w.lives = 0;
    stepRun(w, { paddleX: 180, launch: 1 }, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.LOST);
    expect(w.lives).toBe(0);
  });

  it('stepRun last-ball miss decrements life once and docks', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 3;
    w.score = 77;
    // Simulate post-compact empty pool (last ball already BALL_OUT'd this step)
    for (let i = 0; i < w.maxBalls; i++) {
      w.ballActive[i] = 0;
    }
    w.activeBallCount = 0;

    stepRun(w, { paddleX: 180, launch: 0 }, FIXED_DT);

    expect(w.lives).toBe(2);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.activeBallCount).toBe(1);
    expect(w.ballActive[0]).toBe(1);
    expect(w.score).toBe(77);
    expect(w.paddleW).toBe(72);
  });
});
