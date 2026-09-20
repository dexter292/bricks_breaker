/**
 * RUN-02 — BALL_OUT decrements lives; re-dock or LOST.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepRun,
  applyLivesFromEvents,
  pushEvent,
  clearEvents,
  EventCode,
  SimPhase,
  FIXED_DT,
  LOGICAL_HEIGHT,
} from '../src/core';

describe('lives rules (BALL_OUT)', () => {
  it('BALL_OUT with lives>1 decrements and re-docks', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 3;
    clearEvents(w);
    pushEvent(w, EventCode.BALL_OUT, 0, -1, 180, 640);

    applyLivesFromEvents(w);

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

    applyLivesFromEvents(w);

    expect(w.lives).toBe(0);
    expect(w.simPhase).toBe(SimPhase.LOST);
  });

  it('stepRun playing miss drains BALL_OUT and re-docks', () => {
    const w = allocateWorld();
    resetWorld(w, 9, 10);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 3;
    // Drive ball past bottom edge (no paddle catch)
    w.paddleX = 40;
    w.ballX[0] = 300;
    w.ballY[0] = LOGICAL_HEIGHT - 4;
    w.ballVx[0] = 0;
    w.ballVy[0] = 800;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let docked = false;
    for (let s = 0; s < 30; s++) {
      stepRun(w, { paddleX: 40, launch: 0 }, FIXED_DT);
      if (w.simPhase === SimPhase.DOCKED) {
        docked = true;
        break;
      }
    }
    expect(docked).toBe(true);
    expect(w.lives).toBe(2);
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
