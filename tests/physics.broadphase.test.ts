/**
 * F-47 / NF-10 — forEachBrickCandidate visits each brick once even when mapped to ≥2 cells.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  forEachBrickCandidate,
  collectBrickCandidatesInto,
} from '../src/core';

function collectVisits(
  world: ReturnType<typeof allocateWorld>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): number[] {
  const visits: number[] = [];
  forEachBrickCandidate(world, x0, y0, x1, y1, radius, (bi) => {
    visits.push(bi);
  });
  return visits;
}

describe('physics broadphase (F-47)', () => {
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
    // Brick 0 occupies (r0,c1) and (r1,c1)
    w.cellToBrick[0 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 1] = 0;
    w.brickCount = 1;

    // Window covering both cells (legacy field mode via pitch — use lattice)
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

  it('collectBrickCandidatesInto matches forEach visits (NF-10)', () => {
    const w = setupGrid(4, 4);
    w.cellToBrick[1 * 4 + 1] = 0;
    w.cellToBrick[1 * 4 + 2] = 0;
    w.cellToBrick[2 * 4 + 1] = 0;
    w.cellToBrick[2 * 4 + 2] = 0;
    w.brickCount = 1;
    const n = collectBrickCandidatesInto(w, 40, 20, 120, 60, 8, w.brickCandidateScratch);
    expect(n).toBe(1);
    expect(w.brickCandidateScratch[0]).toBe(0);
  });

  it('stepWorld CCD path imports collectBrickCandidatesInto (NF-10)', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/core/step.ts'),
      'utf8',
    );
    expect(src).toContain('collectBrickCandidatesInto');
    expect(src).toContain('brickCandidateScratch');
  });
});
