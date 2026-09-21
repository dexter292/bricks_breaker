/**
 * F-11 / F-12 — CCD miss double-advance + overlap depenetration.
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
  EventCode,
} from '../src/core';

const intent = { paddleX: 180, launch: 0 };

function eventCodes(world: ReturnType<typeof allocateWorld>): number[] {
  const codes: number[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    codes.push(world.evCode[(start + i) % world.evCap]);
  }
  return codes;
}

function countCode(codes: number[], code: number): number {
  let n = 0;
  for (const c of codes) {
    if (c === code) n += 1;
  }
  return n;
}

describe('physics overlap / CCD leftover (F-11 / F-12)', () => {
  it('ball center inside breakable brick exits AABB within N steps, ≤1 BRICK_HIT/step', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    const brickW = 40;
    const brickH = 40;
    const brickX = 160;
    const brickY = 150;
    loadTestGrid(w, [
      { x: brickX, y: brickY, w: brickW, h: brickH, hp: 5 },
    ]);

    w.ballX[0] = brickX + brickW * 0.5;
    w.ballY[0] = brickY + brickH * 0.5;
    w.ballVx[0] = 0;
    w.ballVy[0] = 0;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let escaped = false;
    for (let s = 0; s < 8; s++) {
      clearEvents(w);
      const hpBefore = w.brickHp[0];
      stepWorld(w, intent, FIXED_DT);
      const codes = eventCodes(w);
      expect(countCode(codes, EventCode.BRICK_HIT)).toBeLessThanOrEqual(1);
      // HP drops at most once per step
      expect(hpBefore - w.brickHp[0]).toBeLessThanOrEqual(1);

      const cx = w.ballX[0];
      const cy = w.ballY[0];
      const r = w.ballRadius[0];
      const outside =
        cx + r <= brickX ||
        cx - r >= brickX + brickW ||
        cy + r <= brickY ||
        cy - r >= brickY + brickH;
      if (outside) {
        escaped = true;
        break;
      }
    }
    expect(escaped).toBe(true);
  });

  it('ball inside unbreakable brick separates without infinite BRICK_HIT spam', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    loadTestGrid(w, [
      {
        x: 160,
        y: 150,
        w: 40,
        h: 40,
        hp: 1,
        unbreakable: true,
      },
    ]);

    w.ballX[0] = 180;
    w.ballY[0] = 170;
    w.ballVx[0] = 40;
    w.ballVy[0] = -40;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let escaped = false;
    for (let s = 0; s < 10; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      expect(countCode(eventCodes(w), EventCode.BRICK_HIT)).toBeLessThanOrEqual(
        1,
      );
      const cx = w.ballX[0];
      const cy = w.ballY[0];
      const r = w.ballRadius[0];
      if (
        cx + r <= 160 ||
        cx - r >= 200 ||
        cy + r <= 150 ||
        cy - r >= 190
      ) {
        escaped = true;
        break;
      }
    }
    expect(escaped).toBe(true);
  });

  it('ball under paddle bottom falls to BALL_OUT; never hoist above paddleY', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    clearEvents(w);

    const paddleY = w.paddleY;
    const paddleH = w.paddleH;
    // Center just below paddle underside, moving down
    w.ballX[0] = w.paddleX;
    w.ballY[0] = paddleY + paddleH + 1;
    w.ballVx[0] = 0;
    w.ballVy[0] = 360;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let sawOut = false;
    for (let s = 0; s < 120; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      // Must never climb back onto / through the paddle top
      expect(w.ballY[0]).toBeGreaterThanOrEqual(paddleY - BALL_RADIUS);
      const codes = eventCodes(w);
      expect(countCode(codes, EventCode.PADDLE_HIT)).toBeLessThanOrEqual(1);
      if (codes.includes(EventCode.BALL_OUT) || w.ballActive[0] === 0) {
        sawOut = true;
        break;
      }
    }
    expect(sawOut).toBe(true);
    expect(w.ballActive[0]).toBe(0);
  });

  it('ball inside unbreakable emits ≤1 BRICK_HIT per step (F-48)', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    loadTestGrid(w, [
      { x: 160, y: 150, w: 40, h: 40, hp: 99, unbreakable: true },
    ]);
    w.ballX[0] = 180;
    w.ballY[0] = 170;
    w.ballVx[0] = 120;
    w.ballVy[0] = -80;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    clearEvents(w);
    stepWorld(w, intent, FIXED_DT);
    expect(countCode(eventCodes(w), EventCode.BRICK_HIT)).toBeLessThanOrEqual(1);
  });

  it('miss after CCD contacts does not double-advance past speed*dt', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    loadTestGrid(w, [
      { x: 100, y: 100, w: 20, h: 200, hp: 1, unbreakable: true },
      { x: 240, y: 100, w: 20, h: 200, hp: 1, unbreakable: true },
    ]);

    w.ballX[0] = 180;
    w.ballY[0] = 300;
    w.ballVx[0] = 400;
    w.ballVy[0] = -200;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
    const x0 = w.ballX[0];
    const y0 = w.ballY[0];
    stepWorld(w, intent, FIXED_DT);
    const disp = Math.hypot(w.ballX[0] - x0, w.ballY[0] - y0);
    expect(disp).toBeLessThanOrEqual(speed * FIXED_DT + 2);
  });
});
