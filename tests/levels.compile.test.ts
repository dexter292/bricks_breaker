/**
 * LVL-01 / LVL-03 — compileLevel + authored level assets (Plan 04-02).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BrickFlags } from '../src/core/types';
import { compileLevel } from '../src/core/levels/compile';
import { loadAndCompile } from '../src/core/levels/load';
import type { CompiledLevel, LevelFileV1 } from '../src/core/levels/schema';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'assets/levels');

function loadLevelJson(name: string): unknown {
  return JSON.parse(readFileSync(join(levelsDir, name), 'utf8')) as unknown;
}

function structuralFingerprint(compiled: CompiledLevel, cells: string[]): string {
  const steel: number[] = [];
  for (let i = 0; i < compiled.brickCount; i++) {
    if ((compiled.flags[i] & BrickFlags.UNBREAKABLE) !== 0) {
      steel.push(i);
    }
  }
  return `${cells.join('|')}#${steel.join(',')}`;
}

describe('levels.compile', () => {
  // 04-W0-03 / 04-W0-07
  it('compiles level-01 with brickCount 35, UNBREAKABLE, and multi-HP', () => {
    const raw = loadLevelJson('level-01.json');
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { compiled } = result;
    expect(compiled.brickCount).toBe(35);
    expect(compiled.gridCols).toBe(7);
    expect(compiled.gridRows).toBe(5);

    let unbreakable = 0;
    const breakableHp = new Set<number>();
    for (let i = 0; i < compiled.brickCount; i++) {
      if ((compiled.flags[i] & BrickFlags.UNBREAKABLE) !== 0) {
        unbreakable += 1;
      } else {
        breakableHp.add(compiled.hp[i]);
      }
    }
    expect(unbreakable).toBeGreaterThanOrEqual(1);
    expect(breakableHp.size).toBeGreaterThanOrEqual(2);
  });

  // 04-W0-05 / 04-W0-07
  it('level-01 vs level-02 structural fingerprint differs', () => {
    const raw01 = loadLevelJson('level-01.json') as LevelFileV1;
    const raw02 = loadLevelJson('level-02.json') as LevelFileV1;
    const r1 = loadAndCompile(raw01);
    const r2 = loadAndCompile(raw02);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    expect(r2.compiled.brickCount).toBeGreaterThan(0);
    let unbreakable02 = 0;
    for (let i = 0; i < r2.compiled.brickCount; i++) {
      if ((r2.compiled.flags[i] & BrickFlags.UNBREAKABLE) !== 0) {
        unbreakable02 += 1;
      }
    }
    expect(unbreakable02).toBeGreaterThanOrEqual(1);

    const fp1 = structuralFingerprint(r1.compiled, raw01.cells);
    const fp2 = structuralFingerprint(r2.compiled, raw02.cells);
    expect(fp1).not.toBe(fp2);
  });

  it('compile skips empty cells and packs positions from origin+gap', () => {
    const level: LevelFileV1 = {
      schemaVersion: 1,
      id: 'pack',
      name: 'Pack',
      grid: {
        cols: 3,
        rows: 2,
        originX: 10,
        originY: 20,
        brickW: 40,
        brickH: 16,
        gapX: 4,
        gapY: 2,
      },
      brickTypes: {
        '1': { hp: 1 },
        X: { hp: 99, unbreakable: true },
      },
      cells: ['1.X', '..1'],
    };
    const compiled = compileLevel(level);
    expect(compiled.brickCount).toBe(3);
    expect(compiled.x[0]).toBe(10);
    expect(compiled.y[0]).toBe(20);
    expect(compiled.x[1]).toBe(10 + 2 * (40 + 4));
    expect(compiled.y[1]).toBe(20);
    expect(compiled.flags[1] & BrickFlags.UNBREAKABLE).toBeTruthy();
    expect(compiled.x[2]).toBe(10 + 2 * (40 + 4));
    expect(compiled.y[2]).toBe(20 + 1 * (16 + 2));
    expect(compiled.flags[2]).toBe(0);
  });

  it('invalid raw still returns ok:false (regression)', () => {
    const result = loadAndCompile({ schemaVersion: 99 });
    expect(result.ok).toBe(false);
  });

  // 08-W0-01 — Plan 01 fills level-03 JSON + assertions
  it.todo('level-03 validates and compiles with UNBREAKABLE present');
  it.todo('level-03 fingerprint differs from level-01 and level-02');
  it.todo('level-03 cols*rows and brickCount ≤ MAX_BRICKS (256)');
});
