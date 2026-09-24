/**
 * N-PWR-01 / N-PWR-02 / N-PWR-04 — extra life, slow-ball, drop table + exclusion.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  pushEvent,
  stepWorld,
  hashWorld,
  SimPhase,
  EventCode,
  FIXED_DT,
  EffectType,
  PICKUP_TYPE_EXTRA_LIFE,
  PICKUP_TYPE_SLOW,
  PICKUP_TYPE_MULTIBALL,
  PICKUP_TYPE_EXPAND,
  MAX_LIVES,
  SLOW_DURATION_TICKS,
  SLOW_SPEED_SCALE,
  DROP_CUM_MULTIBALL,
  DROP_CUM_EXPAND,
  DROP_CUM_SLOW,
  DROP_CUM_FIREBALL,
  PICKUP_TYPE_FIREBALL,
} from '../src/core';
import { applyDropsFromBreaks, stepPickups } from '../src/core/rules/pickups';
import {
  applyOrRefreshSlow,
  applyOrRefreshExpand,
  stepEffects,
  ballSpeedScale,
  clearConflictingOffensiveEffects,
} from '../src/core/rules/effects';
import { nextFloat } from '../src/core/rng/mulberry32';

function playingWorld(seedGameplay = 1) {
  const w = allocateWorld();
  resetWorld(w, seedGameplay, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

/** Find a gameplay seed whose second drop-type float lands in [lo, hi). */
function seedForDropBand(lo: number, hi: number): number {
  for (let seed = 0; seed < 5000; seed++) {
    const rng = new Uint32Array([seed >>> 0]);
    const chance = nextFloat(rng, 0);
    if (chance >= 0.2) continue;
    const which = nextFloat(rng, 0);
    if (which >= lo && which < hi) return seed;
  }
  throw new Error(`no seed for band [${lo}, ${hi})`);
}

describe('N-PWR-01 extra life', () => {
  it('catch increments lives and clamps at MAX_LIVES', () => {
    const w = playingWorld(1);
    w.lives = 3;
    w.paddleX = 180;
    w.paddleY = 616;
    w.paddleW = 72;
    w.paddleH = 12;
    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupType[0] = PICKUP_TYPE_EXTRA_LIFE;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;

    stepPickups(w, 0);
    expect(w.lives).toBe(4);
    expect(w.pickupActive[0]).toBe(0);

    w.lives = MAX_LIVES;
    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupType[0] = PICKUP_TYPE_EXTRA_LIFE;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;
    stepPickups(w, 0);
    expect(w.lives).toBe(MAX_LIVES);
  });
});

describe('N-PWR-02 slow-ball', () => {
  it('apply/refresh sets untilTick; ballSpeedScale 0.5; expire restores 1', () => {
    const w = playingWorld();
    w.tick = 100;
    applyOrRefreshSlow(w);
    expect(w.effectCount).toBe(1);
    expect(w.effectType[0]).toBe(EffectType.SLOW);
    expect(w.effectUntilTick[0]).toBe(100 + SLOW_DURATION_TICKS);
    expect(ballSpeedScale(w)).toBe(SLOW_SPEED_SCALE);

    w.tick = 200;
    applyOrRefreshSlow(w);
    expect(w.effectCount).toBe(1);
    expect(w.effectUntilTick[0]).toBe(200 + SLOW_DURATION_TICKS);

    w.tick = w.effectUntilTick[0];
    stepEffects(w);
    expect(w.effectCount).toBe(0);
    expect(ballSpeedScale(w)).toBe(1);
  });

  it('slow halves displacement without mutating stored |v|; hashWorld stable', () => {
    const run = (withSlow: boolean) => {
      const w = allocateWorld();
      resetWorld(w, 1, 2);
      w.simPhase = SimPhase.PLAYING;
      w.ballActive[0] = 1;
      w.activeBallCount = 1;
      w.ballX[0] = 180;
      w.ballY[0] = 400;
      w.ballVx[0] = 0;
      w.ballVy[0] = -360;
      if (withSlow) {
        applyOrRefreshSlow(w);
      }
      const vy0 = w.ballVy[0];
      stepWorld(w, { paddleX: 180, launch: 0 }, FIXED_DT);
      return { y: w.ballY[0], vy: w.ballVy[0], vy0, h: hashWorld(w) };
    };

    const normal = run(false);
    const slow = run(true);
    expect(slow.vy).toBe(slow.vy0); // stored speed unchanged
    expect(slow.vy0).toBe(normal.vy0);
    // Slow moves ~half as far upward (y decreases less in magnitude)
    const normalDy = normal.y - 400;
    const slowDy = slow.y - 400;
    expect(Math.abs(slowDy)).toBeCloseTo(Math.abs(normalDy) * SLOW_SPEED_SCALE, 4);
    expect(run(true).h).toBe(run(true).h);
  });

  it('expand can coexist with slow; fireball slot is excluded when slow applied', () => {
    const w = playingWorld();
    w.tick = 10;
    applyOrRefreshExpand(w);
    // Simulate reserved fireball entry
    w.effectType[w.effectCount] = EffectType.FIREBALL;
    w.effectUntilTick[w.effectCount] = w.tick + 100;
    w.effectCount += 1;
    expect(w.effectCount).toBe(2);

    applyOrRefreshSlow(w);
    expect(ballSpeedScale(w)).toBe(SLOW_SPEED_SCALE);
    let hasFireball = false;
    let hasExpand = false;
    let hasSlow = false;
    for (let i = 0; i < w.effectCount; i++) {
      if (w.effectType[i] === EffectType.FIREBALL) hasFireball = true;
      if (w.effectType[i] === EffectType.EXPAND) hasExpand = true;
      if (w.effectType[i] === EffectType.SLOW) hasSlow = true;
    }
    expect(hasFireball).toBe(false);
    expect(hasExpand).toBe(true);
    expect(hasSlow).toBe(true);
  });
});

describe('N-PWR-04 drop table', () => {
  it('cumulative bands map to the four pickup types', () => {
    const bands: { lo: number; hi: number; type: number }[] = [
      { lo: 0, hi: DROP_CUM_MULTIBALL, type: PICKUP_TYPE_MULTIBALL },
      { lo: DROP_CUM_MULTIBALL, hi: DROP_CUM_EXPAND, type: PICKUP_TYPE_EXPAND },
      { lo: DROP_CUM_EXPAND, hi: DROP_CUM_SLOW, type: PICKUP_TYPE_SLOW },
      { lo: DROP_CUM_SLOW, hi: DROP_CUM_FIREBALL, type: PICKUP_TYPE_FIREBALL },
      { lo: DROP_CUM_FIREBALL, hi: 1, type: PICKUP_TYPE_EXTRA_LIFE },
    ];
    for (const b of bands) {
      const seed = seedForDropBand(b.lo, b.hi);
      const w = playingWorld(seed);
      pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 50, 60);
      applyDropsFromBreaks(w);
      expect(w.pickupCount).toBe(1);
      expect(w.pickupType[0]).toBe(b.type);
    }
  });

  it('clearConflictingOffensiveEffects keeps expand', () => {
    const w = playingWorld();
    applyOrRefreshExpand(w);
    applyOrRefreshSlow(w);
    clearConflictingOffensiveEffects(w, EffectType.FIREBALL);
    expect(ballSpeedScale(w)).toBe(1);
    expect(w.paddleW).toBe(108);
  });
});
