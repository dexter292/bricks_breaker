/**
 * RUN-02 — BALL_OUT decrements lives; re-dock or LOST.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepRun,
  pushEvent,
  clearEvents,
  EventCode,
  SimPhase,
  FIXED_DT,
} from '../src/core';

describe('lives rules (BALL_OUT)', () => {
  it('BALL_OUT with lives>1 decrements and re-docks', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 3;
    w.ballVx[0] = 0;
    w.ballVy[0] = 100;
    clearEvents(w);
    pushEvent(w, EventCode.BALL_OUT, 0, -1, 180, 640);

    // stepRun while PLAYING drains events via applyLivesFromEvents
    stepRun(w, { paddleX: w.paddleX, launch: 0 }, FIXED_DT);

    expect(w.lives).toBe(2);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
    expect(w.ballVx[0]).toBe(0);
    expect(w.ballVy[0]).toBe(0);
    expect(w.ballActive[0]).toBe(1);
    expect(w.ballX[0]).toBe(w.paddleX);
  });

  it('BALL_OUT with lives=1 sets LOST', () => {
    const w = allocateWorld();
    resetWorld(w, 3, 4);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 1;
    clearEvents(w);
    pushEvent(w, EventCode.BALL_OUT, 0, -1, 100, 640);

    stepRun(w, { paddleX: w.paddleX, launch: 0 }, FIXED_DT);

    expect(w.lives).toBe(0);
    expect(w.simPhase).toBe(SimPhase.LOST);
  });

  it('WON/LOST phases are no-ops', () => {
    const w = allocateWorld();
    resetWorld(w, 7, 8);
    w.simPhase = SimPhase.LOST;
    w.lives = 0;
    const tick0 = w.tick;
    stepRun(w, { paddleX: 200, launch: 1 }, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.LOST);
    expect(w.paddleX).not.toBe(200); // no paddle apply
    expect(w.tick).toBe(tick0);
  });
});
