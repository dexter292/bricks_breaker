// tests/physics.world-shape.test.ts — D-07 / D-08 / D-09 / NK-6
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  pushEvent,
  EventCode,
  stepWorld,
  FIXED_DT,
} from '../src/core';

describe('World SoA shape (D-07 / D-08 / D-09)', () => {
  it('reserves N balls with exactly one active', () => {
    const w = allocateWorld();
    expect(w.maxBalls).toBeGreaterThanOrEqual(2);
    expect(w.activeBallCount).toBe(1);
    expect(w.ballActive[0]).toBe(1);
    for (let i = 1; i < w.maxBalls; i++) {
      expect(w.ballActive[i]).toBe(0);
    }
    expect(Number.isFinite(w.ballX[0])).toBe(true);
    expect(Number.isFinite(w.ballVx[0])).toBe(true);
    expect(Math.hypot(w.ballVx[0], w.ballVy[0])).toBeLessThanOrEqual(720);
  });

  it('exposes stable scratchSweep/scratchVel across stepWorld (NJ-5 / NK-6)', () => {
    const w = allocateWorld();
    expect(w.scratchSweep).toBeDefined();
    expect(w.scratchVel).toBeDefined();
    expect(typeof w.scratchSweep.hit).toBe('boolean');
    expect(typeof w.scratchVel.vx).toBe('number');
    const sweep = w.scratchSweep;
    const vel = w.scratchVel;
    stepWorld(w, { paddleX: 180, launch: 0 }, FIXED_DT);
    stepWorld(w, { paddleX: 180, launch: 0 }, FIXED_DT);
    expect(w.scratchSweep).toBe(sweep);
    expect(w.scratchVel).toBe(vel);
  });

  it('exposes independently seedable dual RNG slots', () => {
    const w = allocateWorld();
    expect(w.rngGameplay).toBeInstanceOf(Uint32Array);
    expect(w.rngCosmetic).toBeInstanceOf(Uint32Array);
    expect(w.rngGameplay.length).toBe(1);
    expect(w.rngCosmetic.length).toBe(1);
    w.rngGameplay[0] = 111;
    w.rngCosmetic[0] = 222;
    expect(w.rngGameplay[0]).toBe(111);
    expect(w.rngCosmetic[0]).toBe(222);
    expect(w.rngGameplay[0]).not.toBe(w.rngCosmetic[0]);
  });

  it('reserves empty power-up effect slots (D-09)', () => {
    const w = allocateWorld();
    expect(w.effectCount).toBe(0);
    expect(w.maxEffects).toBeGreaterThanOrEqual(1);
    expect(w.effectType.length).toBe(w.maxEffects);
    expect(w.effectUntilTick.length).toBe(w.maxEffects);
  });

  it('sets evOverflow when ring is full (drop newest)', () => {
    const w = allocateWorld({ eventCap: 4 });
    expect(w.evCap).toBe(4);
    expect(w.evCount).toBe(0);
    expect(w.evOverflow).toBe(0);

    for (let i = 0; i < 4; i++) {
      pushEvent(w, EventCode.WALL_HIT, i, 0, 1, 2);
    }
    expect(w.evCount).toBe(4);
    expect(w.evOverflow).toBe(0);

    pushEvent(w, EventCode.PADDLE_HIT, 99, 0, 3, 4);
    expect(w.evOverflow).toBe(1);
    expect(w.evCount).toBe(4);
    expect(w.evCount).toBeLessThanOrEqual(w.evCap);
  });
});
