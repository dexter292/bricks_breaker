/**
 * N-BRK-01 — explosive brick AoE cascade (deterministic 8-neighbor).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepWorld,
  clearEvents,
  FIXED_DT,
  BALL_RADIUS,
  EventCode,
  BrickFlags,
  hashWorld,
  loadAndCompile,
  applyCompiledLevel,
} from '../src/core';
import { applyBrickHpDamage } from '../src/core/rules/brickDamage';
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

function breakCounts(world: ReturnType<typeof allocateWorld>): number {
  return eventCodes(world).filter((c) => c === EventCode.BRICK_BREAK).length;
}

/** 3×3 lattice; center E (explosive hp1); ring of "1" hp1; corners optional. */
function makeBlastLevel(opts?: {
  steelAt?: string;
}): LevelFileV1 {
  const brickTypes: LevelFileV1['brickTypes'] = {
    '1': { hp: 1 },
    E: { hp: 1, explosive: true },
  };
  if (opts?.steelAt === 'corner') {
    brickTypes.X = { hp: 99, unbreakable: true };
  }
  const cells =
    opts?.steelAt === 'corner'
      ? ['X11', '1E1', '111']
      : ['111', '1E1', '111'];
  return {
    schemaVersion: 1,
    id: 'test-explosive',
    name: 'Explosive fixture',
    grid: {
      cols: 3,
      rows: 3,
      originX: 40,
      originY: 80,
      brickW: 40,
      brickH: 20,
      gapX: 4,
      gapY: 4,
    },
    brickTypes,
    cells,
  };
}

function loadLevel(
  world: ReturnType<typeof allocateWorld>,
  raw: LevelFileV1,
): void {
  const result = loadAndCompile(raw);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  applyCompiledLevel(world, result.compiled);
}

describe('N-BRK-01 explosive bricks', () => {
  it('validate rejects unbreakable+explosive', () => {
    const raw = makeBlastLevel();
    raw.brickTypes.E = { hp: 1, explosive: true, unbreakable: true };
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((i) => i.message.includes('unbreakable and explosive')),
      ).toBe(true);
    }
  });

  it('compile sets BrickFlags.EXPLOSIVE', () => {
    const result = loadAndCompile(makeBlastLevel());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let found = false;
    for (let i = 0; i < result.compiled.brickCount; i++) {
      if ((result.compiled.flags[i] & BrickFlags.EXPLOSIVE) !== 0) {
        found = true;
        expect(result.compiled.flags[i] & BrickFlags.UNBREAKABLE).toBe(0);
      }
    }
    expect(found).toBe(true);
  });

  it('breaking center explosive clears all 8 neighbors in one step', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    clearEvents(w);
    loadLevel(w, makeBlastLevel());
    expect(w.brickCount).toBe(9);

    // Find explosive index
    let eIdx = -1;
    for (let i = 0; i < w.brickCount; i++) {
      if ((w.brickFlags[i] & BrickFlags.EXPLOSIVE) !== 0) {
        eIdx = i;
      }
    }
    expect(eIdx).toBeGreaterThanOrEqual(0);

    const ex = w.brickX[eIdx] + w.brickW[eIdx] * 0.5;
    const ey = w.brickY[eIdx] + w.brickH[eIdx];
    w.ballX[0] = ex;
    w.ballY[0] = ey + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let cleared = false;
    for (let s = 0; s < 90 && !cleared; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      if (w.brickHp[eIdx] <= 0) {
        cleared = true;
        // Center + 8 neighbors = 9 breaks in the cascade step
        expect(breakCounts(w)).toBe(9);
        for (let i = 0; i < w.brickCount; i++) {
          expect(w.brickHp[i]).toBe(0);
        }
      }
    }
    expect(cleared).toBe(true);
  });

  it('steel neighbor survives blast; chain is hash-stable across runs', () => {
    const raw = makeBlastLevel({ steelAt: 'corner' });
    const run = () => {
      const w = allocateWorld();
      resetWorld(w, 1, 2);
      clearEvents(w);
      loadLevel(w, raw);

      let eIdx = -1;
      let steelIdx = -1;
      for (let i = 0; i < w.brickCount; i++) {
        if ((w.brickFlags[i] & BrickFlags.EXPLOSIVE) !== 0) eIdx = i;
        if ((w.brickFlags[i] & BrickFlags.UNBREAKABLE) !== 0) steelIdx = i;
      }
      expect(eIdx).toBeGreaterThanOrEqual(0);
      expect(steelIdx).toBeGreaterThanOrEqual(0);

      const ex = w.brickX[eIdx] + w.brickW[eIdx] * 0.5;
      const ey = w.brickY[eIdx] + w.brickH[eIdx];
      w.ballX[0] = ex;
      w.ballY[0] = ey + BALL_RADIUS + 2;
      w.ballVx[0] = 0;
      w.ballVy[0] = -600;
      w.ballActive[0] = 1;
      w.activeBallCount = 1;

      for (let s = 0; s < 90; s++) {
        clearEvents(w);
        stepWorld(w, intent, FIXED_DT);
        if (w.brickHp[eIdx] <= 0) break;
      }
      expect(w.brickHp[eIdx]).toBe(0);
      expect(w.brickHp[steelIdx]).toBe(99);
      return hashWorld(w);
    };

    expect(run()).toBe(run());
  });

  it('adjacent explosive chain: two E bricks both break from one hit', () => {
    const raw: LevelFileV1 = {
      schemaVersion: 1,
      id: 'chain-e',
      name: 'chain',
      grid: {
        cols: 2,
        rows: 1,
        originX: 100,
        originY: 200,
        brickW: 40,
        brickH: 20,
        gapX: 4,
        gapY: 4,
      },
      brickTypes: { E: { hp: 1, explosive: true } },
      cells: ['EE'],
    };
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    clearEvents(w);
    loadLevel(w, raw);
    expect(w.brickCount).toBe(2);
    expect(w.cellToBrick[0]).toBe(0);
    expect(w.cellToBrick[1]).toBe(1);

    // Direct damage (same path as ball) — isolates cascade from CCD aim
    applyBrickHpDamage(w, 0, 120, 210, true);
    expect(w.brickHp[0]).toBe(0);
    expect(w.brickHp[1]).toBe(0);
    expect(breakCounts(w)).toBe(2);
  });
});
