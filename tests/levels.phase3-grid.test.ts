/**
 * D-20 / D-09 — level-01 via shared loadAndCompile + applyCompiledLevel pipeline.
 * Spatial cellToBrick must cover brick AABBs (gridRows > 1).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepWorld,
  BrickFlags,
  SimPhase,
  loadAndCompile,
  type Intent,
} from '../src/core';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');

function loadLevel01Compiled() {
  const raw = JSON.parse(
    readFileSync(join(levelsDir, 'level-01.json'), 'utf8'),
  ) as unknown;
  const result = loadAndCompile(raw);
  if (!result.ok) {
    throw new Error(`level-01 failed validate: ${JSON.stringify(result.issues)}`);
  }
  return result.compiled;
}

describe('phase3 hardcoded grid', () => {
  it('loads multi-HP breakables and at least one unbreakable', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    applyCompiledLevel(w, loadLevel01Compiled());

    expect(w.brickCount).toBeGreaterThanOrEqual(1);

    const breakableHp = new Set<number>();
    let unbreakableCount = 0;
    let hasHpAtLeast2 = false;

    for (let i = 0; i < w.brickCount; i++) {
      const flags = w.brickFlags[i];
      const hp = w.brickHp[i];
      if ((flags & BrickFlags.UNBREAKABLE) !== 0) {
        unbreakableCount += 1;
      } else if (hp > 0) {
        breakableHp.add(hp);
        if (hp >= 2) hasHpAtLeast2 = true;
      }
    }

    expect(unbreakableCount).toBeGreaterThanOrEqual(1);
    expect(hasHpAtLeast2).toBe(true);
    expect(breakableHp.size).toBeGreaterThanOrEqual(2);
  });

  it('applies spatial grid so gridRows matches level rows', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    applyCompiledLevel(w, loadLevel01Compiled());

    expect(w.gridRows).toBe(5);
    expect(w.gridCols).toBe(7);
    expect(w.brickCount).toBe(35);
  });

  it('does not tunnel through a mid-row brick from below at serve speed', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    applyCompiledLevel(w, loadLevel01Compiled());

    const bi = 17; // row 2, col 3 of 7×5
    expect(w.brickHp[bi]).toBeGreaterThan(0);
    const bx = w.brickX[bi] + w.brickW[bi] * 0.5;
    const by = w.brickY[bi];
    const r = w.ballRadius[0];

    w.ballX[0] = bx;
    w.ballY[0] = by + w.brickH[bi] + r + 40;
    w.ballVx[0] = 0;
    w.ballVy[0] = -360;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.simPhase = SimPhase.PLAYING;

    const intent: Intent = { paddleX: w.paddleX, launch: 0 };
    const dt = 1 / 120;
    let hit = false;
    for (let s = 0; s < 120; s++) {
      const hpBefore = w.brickHp[bi];
      const vyBefore = w.ballVy[0];
      stepWorld(w, intent, dt);
      if (w.brickHp[bi] < hpBefore || w.ballVy[0] > vyBefore) {
        hit = true;
        break;
      }
      if (w.ballY[0] + r < by) {
        break;
      }
    }

    expect(hit).toBe(true);
  });
});
