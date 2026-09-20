/**
 * PWR-01 — multi-ball spawn from paddle (min(2, freeSlots), fixed angles).
 */
import { describe, it, expect } from 'vitest';
import { allocateWorld, resetWorld } from '../src/core';
import { MIN_VERTICAL_RATIO, SERVE_SPEED } from '../src/core/constants';
import { spawnMultiballFromPaddle } from '../src/core/rules/multiball';

function worldWithActiveBalls(count: number) {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  // Dense active prefix
  for (let i = 0; i < w.maxBalls; i++) {
    w.ballActive[i] = 0;
    w.ballVx[i] = 0;
    w.ballVy[i] = 0;
  }
  for (let i = 0; i < count; i++) {
    w.ballActive[i] = 1;
    w.ballX[i] = w.paddleX;
    w.ballY[i] = w.paddleY - 20;
    w.ballVx[i] = 10 + i; // distinctive per-ball
    w.ballVy[i] = -200 - i;
    w.ballRadius[i] = 6;
  }
  w.activeBallCount = count;
  return w;
}

describe('multiball rules (PWR-01)', () => {
  it('spawns min(2, freeSlots) from paddle with ±18° and ±36° offsets', () => {
    const w = worldWithActiveBalls(1);
    const origVx = w.ballVx[0];
    const origVy = w.ballVy[0];

    spawnMultiballFromPaddle(w);

    expect(w.activeBallCount).toBe(3);
    expect(w.ballActive[1]).toBe(1);
    expect(w.ballActive[2]).toBe(1);

    // Existing ball unchanged
    expect(w.ballVx[0]).toBe(origVx);
    expect(w.ballVy[0]).toBe(origVy);

    // Angles from vertical: slot 1 odd → −18°, slot 2 even → +36°
    const speed = SERVE_SPEED;
    const a18 = (18 * Math.PI) / 180;
    const a36 = (36 * Math.PI) / 180;
    expect(w.ballVx[1]).toBeCloseTo(speed * Math.sin(-a18), 5);
    expect(w.ballVy[1]).toBeCloseTo(-speed * Math.cos(-a18), 5);
    expect(w.ballVx[2]).toBeCloseTo(speed * Math.sin(a36), 5);
    expect(w.ballVy[2]).toBeCloseTo(-speed * Math.cos(a36), 5);
  });

  it('existing ball velocities are preserved', () => {
    const w = worldWithActiveBalls(1);
    w.ballVx[0] = 123.45;
    w.ballVy[0] = -321.09;
    spawnMultiballFromPaddle(w);
    expect(w.ballVx[0]).toBe(123.45);
    expect(w.ballVy[0]).toBe(-321.09);
  });

  it('never exceeds maxBalls; never replaces active balls', () => {
    const w7 = worldWithActiveBalls(7);
    const keepVx = w7.ballVx[6];
    const keepVy = w7.ballVy[6];
    spawnMultiballFromPaddle(w7);
    expect(w7.activeBallCount).toBe(8);
    expect(w7.ballActive[7]).toBe(1);
    expect(w7.ballVx[6]).toBe(keepVx);
    expect(w7.ballVy[6]).toBe(keepVy);

    const w8 = worldWithActiveBalls(8);
    const before = Array.from({ length: 8 }, (_, i) => ({
      vx: w8.ballVx[i],
      vy: w8.ballVy[i],
      active: w8.ballActive[i],
    }));
    spawnMultiballFromPaddle(w8);
    expect(w8.activeBallCount).toBe(8);
    for (let i = 0; i < 8; i++) {
      expect(w8.ballVx[i]).toBe(before[i].vx);
      expect(w8.ballVy[i]).toBe(before[i].vy);
      expect(w8.ballActive[i]).toBe(before[i].active);
    }
  });

  it('spawn speeds are finite and |vy|/speed >= MIN_VERTICAL_RATIO', () => {
    const w = worldWithActiveBalls(1);
    spawnMultiballFromPaddle(w);
    for (const i of [1, 2]) {
      const vx = w.ballVx[i];
      const vy = w.ballVy[i];
      expect(Number.isFinite(vx)).toBe(true);
      expect(Number.isFinite(vy)).toBe(true);
      const speed = Math.hypot(vx, vy);
      expect(speed).toBeCloseTo(SERVE_SPEED, 5);
      expect(Math.abs(vy) / speed).toBeGreaterThanOrEqual(MIN_VERTICAL_RATIO - 1e-9);
    }
  });
});
