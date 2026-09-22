/**
 * F-41 — equal-TOI brick seam: first candidate (broadphase / index order) wins.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  stepWorld,
  clearEvents,
  FIXED_DT,
  BALL_RADIUS,
  MAX_BALL_SPEED,
  EventCode,
} from '../src/core';

const intent = { paddleX: 180, launch: 0 };

describe('PHYS seam tie-break (F-41)', () => {
  it('two adjacent bricks + upward seam hit: exactly one brick loses 1 HP', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    clearEvents(w);

    // Harness: 60×20 bricks flush at the seam; ball straight up into the join.
    const brickW = 60;
    const brickH = 20;
    const brickY = 200;
    const leftX = 150;
    const rightX = leftX + brickW; // adjacent, no gap
    loadTestGrid(w, [
      { x: leftX, y: brickY, w: brickW, h: brickH, hp: 2 },
      { x: rightX, y: brickY, w: brickW, h: brickH, hp: 3 },
    ]);

    const seamX = rightX;
    w.ballX[0] = seamX;
    w.ballY[0] = brickY + brickH + BALL_RADIUS + 1;
    w.ballVx[0] = 0;
    w.ballVy[0] = -MAX_BALL_SPEED;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    const hp0 = w.brickHp[0];
    const hp1 = w.brickHp[1];

    let damaged = false;
    for (let s = 0; s < 30 && !damaged; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      const lost0 = hp0 - w.brickHp[0];
      const lost1 = hp1 - w.brickHp[1];
      if (lost0 + lost1 > 0) {
        damaged = true;
        expect(lost0 + lost1).toBe(1);
        // First-candidate-wins: lower brick index (0) takes the equal-TOI hit.
        expect(lost0).toBe(1);
        expect(lost1).toBe(0);
        expect(w.evCode[0] === EventCode.BRICK_HIT || w.evCount >= 1).toBe(true);
      }
    }

    expect(damaged).toBe(true);
    expect(hp0 - w.brickHp[0] + (hp1 - w.brickHp[1])).toBe(1);
  });
});
