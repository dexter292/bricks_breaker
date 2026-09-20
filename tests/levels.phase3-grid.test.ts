/**
 * D-20 — hardcoded Phase 3 grid: multi-HP breakables + unbreakable.
 * Spatial cellToBrick must cover brick AABBs (not packed 1-row from loadTestGrid).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadPhase3Grid,
  stepWorld,
  BrickFlags,
  SimPhase,
  type Intent,
} from '../src/core';

describe('phase3 hardcoded grid', () => {
  it('loads multi-HP breakables and at least one unbreakable', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    loadPhase3Grid(w);

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

  it('keeps packed grid so stepWorld uses exhaustive brick scan (no tunnel)', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    loadPhase3Grid(w);

    // Packed loadTestGrid layout — triggers exhaustive path in stepWorld
    expect(w.gridRows).toBe(1);
    expect(w.brickCount).toBe(35);
  });

  it('does not tunnel through a mid-row brick from below at serve speed', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    loadPhase3Grid(w);

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
