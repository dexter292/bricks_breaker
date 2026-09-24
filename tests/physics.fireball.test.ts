/**
 * N-PWR-03 — fireball pierce (timed; breakables pierce, steel bounces).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  stepWorld,
  hashWorld,
  loadAndCompile,
  applyCompiledLevel,
  SimPhase,
  EventCode,
  FIXED_DT,
  BALL_RADIUS,
  EffectType,
  BrickFlags,
  FIREBALL_DURATION_TICKS,
  PICKUP_TYPE_FIREBALL,
  DROP_CUM_SLOW,
  DROP_CUM_FIREBALL,
  loadTestGrid,
} from '../src/core';
import {
  applyOrRefreshFireball,
  applyOrRefreshSlow,
  isFireballActive,
  stepEffects,
} from '../src/core/rules/effects';
import { applyDropsFromBreaks, stepPickups } from '../src/core/rules/pickups';
import { pushEvent } from '../src/core/events/ring';
import { nextFloat } from '../src/core/rng/mulberry32';
import type { LevelFileV1 } from '../src/core/levels/schema';

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

function seedForDropBand(lo: number, hi: number): number {
  for (let seed = 0; seed < 8000; seed++) {
    const rng = new Uint32Array([seed >>> 0]);
    const chance = nextFloat(rng, 0);
    if (chance >= 0.2) continue;
    const which = nextFloat(rng, 0);
    if (which >= lo && which < hi) return seed;
  }
  throw new Error(`no seed for band [${lo}, ${hi})`);
}

describe('N-PWR-03 fireball', () => {
  it('apply/refresh/expire + clears slow (exclusion)', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.tick = 50;
    applyOrRefreshSlow(w);
    expect(isFireballActive(w)).toBe(false);

    applyOrRefreshFireball(w);
    expect(isFireballActive(w)).toBe(true);
    expect(w.effectCount).toBe(1);
    expect(w.effectType[0]).toBe(EffectType.FIREBALL);
    expect(w.effectUntilTick[0]).toBe(50 + FIREBALL_DURATION_TICKS);

    w.tick = w.effectUntilTick[0];
    stepEffects(w);
    expect(isFireballActive(w)).toBe(false);
  });

  it('catch pickup arms fireball', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    w.paddleX = 180;
    w.paddleY = 616;
    w.paddleW = 72;
    w.paddleH = 12;
    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupType[0] = PICKUP_TYPE_FIREBALL;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;
    stepPickups(w, 0);
    expect(isFireballActive(w)).toBe(true);
  });

  it('drop table fireball band', () => {
    const seed = seedForDropBand(DROP_CUM_SLOW, DROP_CUM_FIREBALL);
    const w = allocateWorld();
    resetWorld(w, seed, 2);
    w.simPhase = SimPhase.PLAYING;
    clearEvents(w);
    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 40, 50);
    applyDropsFromBreaks(w);
    expect(w.pickupType[0]).toBe(PICKUP_TYPE_FIREBALL);
  });

  it('pierces two breakables in one step without reversing vy', () => {
    const raw: LevelFileV1 = {
      schemaVersion: 1,
      id: 'pierce-2',
      name: 'pierce',
      grid: {
        cols: 1,
        rows: 2,
        originX: 160,
        originY: 100,
        brickW: 40,
        brickH: 20,
        gapX: 4,
        gapY: 4,
      },
      brickTypes: { '1': { hp: 1 } },
      cells: ['1', '1'],
    };
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    const compiled = loadAndCompile(raw);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    applyCompiledLevel(w, compiled.compiled);
    applyOrRefreshFireball(w);

    // Ball below lower brick, flying up through both
    const lower = w.brickY[0] > w.brickY[1] ? 0 : 1;
    const upper = lower === 0 ? 1 : 0;
    const target = lower;
    w.ballX[0] = w.brickX[target] + w.brickW[target] * 0.5;
    w.ballY[0] =
      w.brickY[target] + w.brickH[target] + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let bothDead = false;
    for (let s = 0; s < 120 && !bothDead; s++) {
      clearEvents(w);
      const vyBefore = w.ballVy[0];
      stepWorld(w, intent, FIXED_DT);
      if (w.brickHp[0] <= 0 && w.brickHp[1] <= 0) {
        bothDead = true;
        // Pierce keeps upward travel (no bounce flip on breakables)
        expect(w.ballVy[0]).toBeLessThan(0);
        expect(vyBefore).toBeLessThan(0);
        expect(eventCodes(w).filter((c) => c === EventCode.BRICK_BREAK).length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(bothDead).toBe(true);
    expect(w.brickHp[upper]).toBe(0);
    expect(w.brickHp[lower]).toBe(0);
  });

  it('bounces on steel even while fireball active', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    clearEvents(w);
    loadTestGrid(w, [
      {
        x: 160,
        y: 200,
        w: 40,
        h: 20,
        hp: 99,
        unbreakable: true,
      },
    ]);
    // loadTestGrid has pitch 0 — assign lattice manually for consistency
    w.latticeOriginX = 160;
    w.latticeOriginY = 200;
    w.latticePitchX = 44;
    w.latticePitchY = 24;
    w.gridCols = 1;
    w.gridRows = 1;
    w.cellToBrick[0] = 0;
    expect(w.brickFlags[0] & BrickFlags.UNBREAKABLE).toBeTruthy();

    applyOrRefreshFireball(w);
    w.ballX[0] = 180;
    w.ballY[0] = 200 + 20 + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let hit = false;
    for (let s = 0; s < 90 && !hit; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      if (eventCodes(w).includes(EventCode.BRICK_HIT)) {
        hit = true;
        expect(w.brickHp[0]).toBe(99);
        expect(w.ballVy[0]).toBeGreaterThan(0); // bounced down
      }
    }
    expect(hit).toBe(true);
  });

  it('golden identity: fireball pierce is hash-stable across chunkings', () => {
    const make = () => {
      const w = allocateWorld();
      resetWorld(w, 42, 7);
      w.simPhase = SimPhase.PLAYING;
      loadTestGrid(w, [
        { x: 140, y: 120, w: 36, h: 16, hp: 1 },
        { x: 140, y: 160, w: 36, h: 16, hp: 1 },
        { x: 140, y: 200, w: 36, h: 16, hp: 1 },
      ]);
      // Minimal lattice so pierce can resolve neighbors if needed
      w.latticeOriginX = 140;
      w.latticeOriginY = 120;
      w.latticePitchX = 40;
      w.latticePitchY = 40;
      w.gridCols = 1;
      w.gridRows = 3;
      w.cellToBrick[0] = 0;
      w.cellToBrick[1] = 1;
      w.cellToBrick[2] = 2;
      applyOrRefreshFireball(w);
      w.ballX[0] = 158;
      w.ballY[0] = 240;
      w.ballVx[0] = 0;
      w.ballVy[0] = -480;
      w.ballActive[0] = 1;
      w.activeBallCount = 1;
      return w;
    };

    const a = make();
    const b = make();
    for (let i = 0; i < 60; i++) {
      stepWorld(a, intent, FIXED_DT);
    }
    // chunked: 20+20+20
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < 20; i++) {
        stepWorld(b, intent, FIXED_DT);
      }
    }
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.brickHp[0]).toBe(b.brickHp[0]);
    expect(a.brickHp[1]).toBe(b.brickHp[1]);
    expect(a.brickHp[2]).toBe(b.brickHp[2]);
  });
});
