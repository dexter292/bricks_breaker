/**
 * E1b — verb teaching curve over the SHIPPED campaign assets (not fixtures).
 *
 * Each case asserts the lesson the level is supposed to teach actually happens:
 *   level-01 fundamentals (no explosive)  · level-03 sighting + "1 HP, not a clear"
 *   level-04 steel immunity               · level-05 chain
 *   level-06 explosive is not a steel solvent
 *
 * Cascade is driven through `applyBrickHpDamage` directly so the lesson is isolated
 * from CCD aim — same entry point the ball path uses.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  clearEvents,
  BrickFlags,
  EventCode,
  loadAndCompile,
} from '../src/core';
import { applyBrickHpDamage } from '../src/core/rules/brickDamage';
import { PLAYABLE_LEVEL_ORDER } from '../src/services/storage/catalog';
import type { LevelFileV1 } from '../src/core/levels/schema';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');

function readLevel(id: string): LevelFileV1 {
  return JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as LevelFileV1;
}

function world(id: string) {
  const raw = readLevel(id);
  const result = loadAndCompile(raw);
  if (!result.ok) {
    throw new Error(`${id} failed to compile: ${JSON.stringify(result.issues)}`);
  }
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  clearEvents(w);
  applyCompiledLevel(w, result.compiled);
  return w;
}

/**
 * Brick index at authoring (row, col), or -1 when the cell is empty.
 * Breaking a brick clears its lattice cell to -1, so resolve every index you
 * plan to assert on BEFORE detonating.
 */
function brickAt(w: ReturnType<typeof allocateWorld>, row: number, col: number): number {
  return w.cellToBrick[row * w.gridCols + col] ?? -1;
}

/** Resolve many cells to brick indices up-front. */
function indicesAt(
  w: ReturnType<typeof allocateWorld>,
  cells: readonly (readonly [number, number])[],
): number[] {
  return cells.map(([r, c]) => {
    const idx = brickAt(w, r, c);
    expect(idx, `(${r},${c}) holds a brick`).toBeGreaterThanOrEqual(0);
    return idx;
  });
}

function breakCount(w: ReturnType<typeof allocateWorld>): number {
  let n = 0;
  const count = w.evCount;
  const start = (w.evHead - count + w.evCap) % w.evCap;
  for (let i = 0; i < count; i++) {
    if (w.evCode[(start + i) % w.evCap] === EventCode.BRICK_BREAK) n++;
  }
  return n;
}

/** Break the brick at (row,col) via the ball damage path and run the cascade. */
function detonate(
  w: ReturnType<typeof allocateWorld>,
  row: number,
  col: number,
): number {
  const idx = brickAt(w, row, col);
  expect(idx).toBeGreaterThanOrEqual(0);
  expect(w.brickFlags[idx]! & BrickFlags.EXPLOSIVE).not.toBe(0);
  clearEvents(w);
  applyBrickHpDamage(
    w,
    idx,
    w.brickX[idx]! + w.brickW[idx]! * 0.5,
    w.brickY[idx]! + w.brickH[idx]! * 0.5,
    true,
  );
  expect(w.brickHp[idx]).toBe(0);
  return idx;
}

function explosiveCount(w: ReturnType<typeof allocateWorld>): number {
  let n = 0;
  for (let i = 0; i < w.brickCount; i++) {
    if ((w.brickFlags[i]! & BrickFlags.EXPLOSIVE) !== 0) n++;
  }
  return n;
}

describe('E1b verb curve — shipped campaign', () => {
  it('every playable level still compiles', () => {
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const result = loadAndCompile(readLevel(id));
      expect(result.ok, `${id} must compile`).toBe(true);
    }
  });

  it('slot 1 (level-01) stays fundamentals-only — no explosive', () => {
    expect(explosiveCount(world('level-01'))).toBe(0);
  });

  it('slots 2-5 each teach explosive and declare E as hp1 + explosive', () => {
    for (const id of ['level-03', 'level-04', 'level-05', 'level-06'] as const) {
      const raw = readLevel(id);
      expect(raw.brickTypes.E, `${id} declares E`).toEqual({
        hp: 1,
        explosive: true,
      });
      expect(explosiveCount(world(id)), `${id} places E`).toBeGreaterThan(0);
    }
  });

  it('level-03 sighting: one E clears its whole soft hp1 pocket', () => {
    const w = world('level-03');
    const pocket = [
      [0, 4],
      [1, 3],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ] as const;
    const idx = indicesAt(w, pocket);
    detonate(w, 1, 4);
    // E itself + 6 live hp1 neighbours (row0c4, row1c3/c5, row2c3/c4/c5)
    expect(breakCount(w)).toBe(7);
    pocket.forEach(([r, c], i) => {
      expect(w.brickHp[idx[i]!], `(${r},${c}) cleared`).toBe(0);
    });
  });

  it('level-03 armour beat: blast chips multi-HP neighbours, kills none', () => {
    const w = world('level-03');
    const neighbours = [
      [7, 1],
      [7, 2],
      [7, 3],
      [8, 1],
      [8, 3],
      [9, 1],
      [9, 2],
      [9, 3],
    ] as const;
    const idx = indicesAt(w, neighbours);
    const before = idx.map((i) => w.brickHp[i]!);
    detonate(w, 8, 2);

    // Only the explosive dies — the lesson is "1 HP, not an instant clear".
    expect(breakCount(w)).toBe(1);
    neighbours.forEach(([r, c], i) => {
      const hp = w.brickHp[idx[i]!]!;
      expect(hp, `(${r},${c}) survives`).toBeGreaterThan(0);
      expect(hp, `(${r},${c}) chipped`).toBe(before[i]! - 1);
    });
  });

  it('level-04: blast ignores the steel rib it flanks', () => {
    const w = world('level-04');
    const steel = [
      [2, 3],
      [2, 4],
      [2, 5],
    ] as const;
    const steelIdx = indicesAt(w, steel);
    const softIdx = brickAt(w, 1, 2);
    detonate(w, 2, 2);
    steel.forEach(([r, c], i) => {
      expect(w.brickFlags[steelIdx[i]!]! & BrickFlags.UNBREAKABLE).not.toBe(0);
      expect(w.brickHp[steelIdx[i]!], `steel (${r},${c}) untouched`).toBe(99);
    });
    // The soft 2 beside it did take the hit.
    expect(w.brickHp[softIdx]).toBe(1);
  });

  it('level-05: one hit cascades through all four fuse explosives', () => {
    const w = world('level-05');
    const fuse = [
      [5, 3],
      [5, 5],
      [6, 4],
      [7, 5],
    ] as const;
    const fuseIdx = indicesAt(w, fuse);
    fuse.forEach(([r, c], i) => {
      expect(
        w.brickFlags[fuseIdx[i]!]! & BrickFlags.EXPLOSIVE,
        `(${r},${c}) is E`,
      ).not.toBe(0);
    });
    detonate(w, 5, 3);
    fuse.forEach(([r, c], i) => {
      expect(w.brickHp[fuseIdx[i]!], `fuse (${r},${c}) consumed`).toBe(0);
    });
    // A chain, not a single pop.
    expect(breakCount(w)).toBeGreaterThan(4);
  });

  it('level-06: paired E chain each other but never open the vault steel', () => {
    const w = world('level-06');
    for (const [a, b, steelRow] of [
      [
        [3, 4],
        [3, 5],
        2,
      ],
      [
        [6, 4],
        [6, 5],
        5,
      ],
    ] as const) {
      const fresh = world('level-06');
      const partner = brickAt(fresh, b[0]!, b[1]!);
      const vault = indicesAt(fresh, [
        [steelRow, 4],
        [steelRow, 5],
      ]);
      detonate(fresh, a[0]!, a[1]!);
      expect(fresh.brickHp[partner], 'pair chains').toBe(0);
      [4, 5].forEach((col, i) => {
        expect(fresh.brickFlags[vault[i]!]! & BrickFlags.UNBREAKABLE).not.toBe(0);
        expect(fresh.brickHp[vault[i]!], `vault (${steelRow},${col}) holds`).toBe(99);
      });
    }
    expect(explosiveCount(w)).toBe(4);
  });
});
