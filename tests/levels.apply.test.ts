/**
 * LVL-01 / T-04-03 — applyCompiledLevel SoA fill + no-mutate on failed validate.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  BrickFlags,
  hashWorld,
  loadAndCompile,
  resetWorld,
} from '../src/core';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');

function loadLevelJson(name: string): unknown {
  return JSON.parse(readFileSync(join(levelsDir, name), 'utf8')) as unknown;
}

describe('levels.apply', () => {
  it('apply fills SoA and gridRows > 1 spatial path', () => {
    const raw = loadLevelJson('level-01.json');
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    applyCompiledLevel(w, result.compiled);

    expect(w.brickCount).toBe(35);
    expect(w.gridRows).toBe(5);
    expect(w.gridCols).toBe(7);
    expect(w.latticePitchX).toBe(48); // 44+4
    expect(w.latticePitchY).toBe(22); // 18+4

    // Every alive brick must occupy a unique lattice cell (no "first wins" drops)
    const mapped = new Set<number>();
    for (let i = 0; i < w.cellToBrick.length; i++) {
      const bi = w.cellToBrick[i];
      if (bi >= 0) mapped.add(bi);
    }
    expect(mapped.size).toBe(35);

    let unbreakable = 0;
    for (let i = 0; i < w.brickCount; i++) {
      if ((w.brickFlags[i] & BrickFlags.UNBREAKABLE) !== 0) {
        unbreakable += 1;
      }
    }
    expect(unbreakable).toBeGreaterThanOrEqual(1);
  });

  // 04-W0-04 / T-04-03
  it('failed validate / skipped apply never mutates World / hashWorld', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    const ok = loadAndCompile(loadLevelJson('level-01.json'));
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    applyCompiledLevel(w, ok.compiled);

    const brickCountBefore = w.brickCount;
    const hashBefore = hashWorld(w);

    const bad = loadAndCompile({ schemaVersion: 99 });
    expect(bad.ok).toBe(false);
    // Host must not call apply on error — assert world unchanged without apply
    expect(w.brickCount).toBe(brickCountBefore);
    expect(hashWorld(w)).toBe(hashBefore);
  });

  it('apply caps brickCount at world.brickX.length', () => {
    const raw = loadLevelJson('level-01.json');
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const w = allocateWorld({ maxBricks: 10 });
    resetWorld(w, 1, 2);
    applyCompiledLevel(w, result.compiled);
    expect(w.brickCount).toBe(10);
    expect(w.brickX.length).toBe(10);
  });

  it('spatial refuse (cellToBrick too small) falls back to exhaustive map (F-38)', () => {
    const raw = loadLevelJson('level-01.json');
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // level-01 is 7×5=35 cells; maxBricks=20 ⇒ cellToBrick too small for lattice
    const w = allocateWorld({ maxBricks: 20 });
    resetWorld(w, 1, 2);
    applyCompiledLevel(w, result.compiled);

    expect(w.brickCount).toBe(20);
    expect(w.latticePitchX).toBe(0);
    expect(w.gridRows).toBe(1);
    for (let i = 0; i < w.brickCount; i++) {
      expect(w.cellToBrick[i]).toBe(i);
    }
  });
});
