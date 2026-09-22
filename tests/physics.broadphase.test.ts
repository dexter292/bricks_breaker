/**
 * F-47 / NF-10 / NJ-2 — broadphase uniqueness + lattice CCD path (behavior).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  collectBrickCandidatesInto,
  assignSpatialBrickCells,
  stepWorld,
  clearEvents,
  FIXED_DT,
  BALL_RADIUS,
  MAX_BALL_SPEED,
  SimPhase,
} from '../src/core';

function collectVisits(
  world: ReturnType<typeof allocateWorld>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): number[] {
  const n = collectBrickCandidatesInto(
    world,
    x0,
    y0,
    x1,
    y1,
    radius,
    world.brickCandidateScratch,
  );
  const visits: number[] = [];
  for (let i = 0; i < n; i++) {
    visits.push(world.brickCandidateScratch[i]!);
  }
  return visits;
}

describe('physics broadphase (F-47 / NJ-2)', () => {
  function setupGrid(cols: number, rows: number) {
    const w = allocateWorld();
    w.gridCols = cols;
    w.gridRows = rows;
    w.latticeOriginX = 0;
    w.latticeOriginY = 0;
    w.latticePitchX = 40;
    w.latticePitchY = 20;
    for (let i = 0; i < w.cellToBrick.length; i++) {
      w.cellToBrick[i] = -1;
    }
    return w;
  }

  it('vertical duplicate (same col, two rows) visits brick exactly once', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[0 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 1] = 0;
    w.brickCount = 1;

    const visits = collectVisits(w, 40, 0, 80, 40, 8);
    expect(visits).toEqual([0]);
  });

  it('horizontal duplicate (same row, two cols) visits brick exactly once', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[1 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 2] = 0;
    w.brickCount = 1;

    const visits = collectVisits(w, 40, 20, 120, 40, 8);
    expect(visits).toEqual([0]);
  });

  it('2×2 block visits brick exactly once', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[1 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 2] = 0;
    w.cellToBrick[2 * 4 + 1] = 0;
    w.cellToBrick[2 * 4 + 2] = 0;
    w.brickCount = 1;

    const visits = collectVisits(w, 40, 20, 120, 60, 8);
    expect(visits).toEqual([0]);
  });

  it('single-cell brick still visits', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[2 * 4 + 2] = 3;
    w.brickCount = 4;

    const visits = collectVisits(w, 80, 40, 120, 60, 4);
    expect(visits).toEqual([3]);
  });

  it('collectBrickCandidatesInto writes unique indices', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[1 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 2] = 0;
    w.cellToBrick[2 * 4 + 1] = 0;
    w.cellToBrick[2 * 4 + 2] = 0;
    w.brickCount = 1;
    const n = collectBrickCandidatesInto(
      w,
      40,
      20,
      120,
      60,
      8,
      w.brickCandidateScratch,
    );
    expect(n).toBe(1);
    expect(w.brickCandidateScratch[0]).toBe(0);
  });

  it('assignSpatialBrickCells fails on unmapped live brick or cell collision (NJ-2)', () => {
    const w = allocateWorld();
    w.brickCount = 2;
    w.brickHp[0] = 1;
    w.brickHp[1] = 1;
    w.brickX[0] = 0;
    w.brickY[0] = 0;
    w.brickX[1] = 1000; // outside 2×2 lattice
    w.brickY[1] = 1000;
    expect(assignSpatialBrickCells(w, 2, 2, 0, 0, 40, 20)).toBe(false);

    w.brickX[1] = 0;
    w.brickY[1] = 0; // same cell as brick 0
    expect(assignSpatialBrickCells(w, 2, 2, 0, 0, 40, 20)).toBe(false);
  });

  /**
   * Distinguishes lattice-only CCD from flat fallback (NJ-2):
   * Brick in SoA but absent from cellToBrick must NOT be hittable when lattice is on.
   */
  it('lattice CCD ignores bricks missing from cellToBrick (no flat fallback)', () => {
    const w = allocateWorld();
    w.simPhase = SimPhase.PLAYING;
    w.brickCount = 2;
    // Brick 0 mapped; brick 1 solid but unmapped
    w.brickX[0] = 40;
    w.brickY[0] = 40;
    w.brickW[0] = 36;
    w.brickH[0] = 16;
    w.brickHp[0] = 1;
    w.brickX[1] = 200;
    w.brickY[1] = 200;
    w.brickW[1] = 36;
    w.brickH[1] = 16;
    w.brickHp[1] = 9;
    w.gridCols = 8;
    w.gridRows = 8;
    w.latticeOriginX = 0;
    w.latticeOriginY = 0;
    w.latticePitchX = 40;
    w.latticePitchY = 20;
    for (let i = 0; i < w.cellToBrick.length; i++) {
      w.cellToBrick[i] = -1;
    }
    w.cellToBrick[2 * 8 + 1] = 0; // brick 0 at approx (40,40)

    // Aim straight at unmapped brick 1
    w.ballX[0] = 218;
    w.ballY[0] = 200 + 16 + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -MAX_BALL_SPEED;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.paddleY = 600;

    const hp1 = w.brickHp[1];
    for (let s = 0; s < 40; s++) {
      clearEvents(w);
      stepWorld(w, { paddleX: 180, launch: 0 }, FIXED_DT);
    }
    // Lattice-only: never damaged the unmapped brick
    expect(w.brickHp[1]).toBe(hp1);
  });

  it('stepWorld lattice gate does not require candCount > 0 (NJ-2 source contract)', () => {
    // Negative contract: the buggy `useLattice && candCount > 0` must stay gone.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/core/step.ts'),
      'utf8',
    );
    expect(src).toContain('collectBrickCandidatesInto');
    expect(src).not.toMatch(/useLattice\s*&&\s*candCount\s*>\s*0/);
  });
});
