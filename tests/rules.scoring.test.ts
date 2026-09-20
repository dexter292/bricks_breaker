/**
 * RUN-01 — score / combo from event ring (Plan 02) + stepRun wiring (Plan 04).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  clearEvents,
  pushEvent,
  stepRun,
  SimPhase,
  EventCode,
  BrickFlags,
  FIXED_DT,
  BALL_RADIUS,
} from '../src/core';
import { applyScoringFromEvents } from '../src/core/rules/scoring';

function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

describe('scoring rules (RUN-01)', () => {
  it('resetWorld starts score at 0 and combo at 1', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    expect(w.score).toBe(0);
    expect(w.combo).toBe(1);
  });

  it('BRICK_HIT awards SCORE_HIT * combo then increments combo', () => {
    const w = playingWorld();
    expect(w.combo).toBe(1);
    expect(w.score).toBe(0);

    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(10);
    expect(w.combo).toBe(2);

    clearEvents(w);
    pushEvent(w, EventCode.BRICK_HIT, 0, 1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(30); // 10 + 10*2
    expect(w.combo).toBe(3);
  });

  it('BRICK_BREAK awards (SCORE_HIT + SCORE_BREAK_BONUS) * combo then increments combo', () => {
    const w = playingWorld();
    w.combo = 2;

    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(120); // (10+50)*2
    expect(w.combo).toBe(3);
  });

  it('PADDLE_HIT resets combo to 1', () => {
    const w = playingWorld();
    w.combo = 5;
    w.score = 100;

    pushEvent(w, EventCode.PADDLE_HIT, 0, -1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.combo).toBe(1);
    expect(w.score).toBe(100);
  });

  it('unbreakable BRICK_HIT awards no score and does not change combo', () => {
    const w = playingWorld();
    w.brickCount = 1;
    w.brickFlags[0] = BrickFlags.UNBREAKABLE;
    w.combo = 3;
    w.score = 50;

    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(50);
    expect(w.combo).toBe(3);
  });

  it('simultaneous multi-ball brick damage is deterministic (ring order)', () => {
    const w = playingWorld();
    // Two BRICK_HIT in one drain: first awards 10 (combo 1→2), second 20 (combo 2→3)
    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    pushEvent(w, EventCode.BRICK_HIT, 1, 1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(30);
    expect(w.combo).toBe(3);
  });

  it('stepRun awards score when ball hits a breakable brick', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    clearEvents(w);

    const brickW = 40;
    const brickH = 20;
    const brickX = 160;
    const brickY = 200;
    loadTestGrid(w, [{ x: brickX, y: brickY, w: brickW, h: brickH, hp: 2 }]);

    w.ballX[0] = brickX + brickW * 0.5;
    w.ballY[0] = brickY + brickH + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    expect(w.score).toBe(0);

    let scored = false;
    for (let s = 0; s < 60 && !scored; s++) {
      stepRun(w, { paddleX: 180, launch: 0 }, FIXED_DT);
      if (w.score > 0) scored = true;
    }

    expect(scored).toBe(true);
    expect(w.score).toBeGreaterThan(0);
    expect(w.combo).toBeGreaterThan(1);
    expect(w.evOverflow).toBe(0);
  });
});
