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
});
