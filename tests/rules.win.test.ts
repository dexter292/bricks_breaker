/**
 * RUN-02 — last breakable destroyed → WON; unbreakables ignored.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  stepRun,
  countBreakableAlive,
  SimPhase,
  FIXED_DT,
  BALL_RADIUS,
} from '../src/core';

describe('win rules (last breakable)', () => {
  it('countBreakableAlive ignores UNBREAKABLE bricks', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    loadTestGrid(w, [
      { x: 40, y: 80, w: 36, h: 16, hp: 1 },
      { x: 100, y: 80, w: 36, h: 16, hp: 2 },
      { x: 160, y: 80, w: 36, h: 16, hp: 99, unbreakable: true },
    ]);
    expect(countBreakableAlive(w)).toBe(2);

    w.brickHp[0] = 0;
    expect(countBreakableAlive(w)).toBe(1);
  });

  it('destroying the last breakable with steel remaining → WON', () => {
    const w = allocateWorld();
    resetWorld(w, 3, 4);
    loadTestGrid(w, [
      { x: 160, y: 200, w: 40, h: 20, hp: 1 },
      { x: 220, y: 200, w: 40, h: 20, hp: 99, unbreakable: true },
    ]);
    w.simPhase = SimPhase.PLAYING;
    w.ballX[0] = 180;
    w.ballY[0] = 200 + 20 + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let won = false;
    for (let s = 0; s < 90; s++) {
      stepRun(w, { paddleX: 180, launch: 0 }, FIXED_DT);
      if (w.simPhase === SimPhase.WON) {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);
    expect(countBreakableAlive(w)).toBe(0);
    expect(w.brickHp[1]).toBeGreaterThan(0); // steel still present
  });
});
