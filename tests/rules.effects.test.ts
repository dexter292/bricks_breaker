/**
 * PWR-02 — paddle expand effect (refresh stackPolicy, derive width, expire).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  resolvePaddleEnglish,
} from '../src/core';
import {
  applyOrRefreshExpand,
  stepEffects,
  derivePaddleWidth,
} from '../src/core/rules/effects';

function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  return w;
}

describe('effect rules (PWR-02 expand)', () => {
  it('expand sets paddleW = 72 * 1.5 and effectUntilTick = tick + 1200', () => {
    const w = playingWorld();
    w.tick = 100;
    expect(w.paddleW).toBe(72);

    applyOrRefreshExpand(w);

    expect(w.paddleW).toBe(108);
    expect(w.effectCount).toBe(1);
    expect(w.effectType[0]).toBe(1);
    expect(w.effectUntilTick[0]).toBe(1300);
  });

  it('second expand refreshes effectUntilTick without stacking width past 1.5×', () => {
    const w = playingWorld();
    w.tick = 50;
    applyOrRefreshExpand(w);
    expect(w.paddleW).toBe(108);
    expect(w.effectUntilTick[0]).toBe(1250);

    w.tick = 200;
    applyOrRefreshExpand(w);

    expect(w.paddleW).toBe(108);
    expect(w.paddleW).not.toBe(162);
    expect(w.effectCount).toBe(1);
    expect(w.effectUntilTick[0]).toBe(1400);
  });

  it('expire restores paddleW = 72 and clamps paddleX in field', () => {
    const w = playingWorld();
    w.tick = 0;
    applyOrRefreshExpand(w);
    expect(w.paddleW).toBe(108);

    // Push paddle near left wall while expanded
    w.paddleX = 10;
    derivePaddleWidth(w);
    expect(w.paddleW).toBe(108);
    expect(w.paddleX).toBe(54); // half of 108

    w.tick = 1200;
    stepEffects(w);

    expect(w.paddleW).toBe(72);
    expect(w.effectCount).toBe(0);
    // half of 72 = 36; clamp so paddle stays in field
    expect(w.paddleX).toBeGreaterThanOrEqual(36);
    expect(w.paddleX).toBeLessThanOrEqual(360 - 36);
  });

  it('resolvePaddleEnglish uses current paddleW half-width while expanded', () => {
    const w = playingWorld();
    applyOrRefreshExpand(w);
    const half = w.paddleW * 0.5;
    expect(half).toBe(54);

    const paddleCx = 180;
    const ballAtRightEdge = paddleCx + half;
    const out = resolvePaddleEnglish(ballAtRightEdge, paddleCx, half, 0, 400);

    // t=+1 with expanded half should still hit clamp angle (same as base half at edge)
    const clampRad = (62 * Math.PI) / 180;
    const angle = Math.atan2(out.vx, -out.vy);
    expect(angle).toBeCloseTo(clampRad, 3);

    // Relative mapping: same t with base half produces same angle
    const baseHalf = 36;
    const outBase = resolvePaddleEnglish(
      paddleCx + baseHalf,
      paddleCx,
      baseHalf,
      0,
      400,
    );
    expect(out.vx).toBeCloseTo(outBase.vx, 5);
    expect(out.vy).toBeCloseTo(outBase.vy, 5);
  });
});
