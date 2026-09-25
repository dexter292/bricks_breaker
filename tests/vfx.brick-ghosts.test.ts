// tests/vfx.brick-ghosts.test.ts — N-FX-01 brick ghost SoA (Wave 0)
import { describe, it, expect } from 'vitest';
import {
  allocateVfx,
  GHOST_CAP_DEFAULT,
  PARTICLE_POOL_DEFAULT,
} from '../src/vfx/types';
import {
  GHOST_CAP,
  GHOST_LIFE_MAX,
  spawnBrickGhost,
  stepBrickGhosts,
} from '../src/vfx/brickGhosts';

function countActiveGhosts(vfx: ReturnType<typeof allocateVfx>): number {
  let n = 0;
  for (let i = 0; i < vfx.ghostCap; i++) {
    if (vfx.ghostActive[i] !== 0) n += 1;
  }
  return n;
}

describe('vfx brick ghosts (N-FX-01 Wave 0)', () => {
  it('allocateVfx allocates ghost SoA at cap 16; paddleSquashT idle', () => {
    const vfx = allocateVfx();
    expect(vfx.ghostCap).toBe(16);
    expect(GHOST_CAP_DEFAULT).toBe(16);
    expect(GHOST_CAP).toBe(16);
    expect(vfx.ghostX.length).toBe(16);
    expect(vfx.ghostY.length).toBe(16);
    expect(vfx.ghostW.length).toBe(16);
    expect(vfx.ghostH.length).toBe(16);
    expect(vfx.ghostR.length).toBe(16);
    expect(vfx.ghostG.length).toBe(16);
    expect(vfx.ghostB.length).toBe(16);
    expect(vfx.ghostLife.length).toBe(16);
    expect(vfx.ghostLifeMax.length).toBe(16);
    expect(vfx.ghostActive.length).toBe(16);
    expect(vfx.paddleSquashT).toBe(0);
    expect(PARTICLE_POOL_DEFAULT).toBe(128);
    expect(vfx.particleCap).toBe(128);
  });

  it('spawnBrickGhost ×1 → one active; life ≈ lifeMax; geom/rgb copied', () => {
    const vfx = allocateVfx();
    spawnBrickGhost(vfx, {
      x: 10,
      y: 20,
      w: 30,
      h: 12,
      r: 0.9,
      g: 0.2,
      b: 0.1,
    });
    expect(countActiveGhosts(vfx)).toBe(1);
    const slot = vfx.ghostActive.findIndex((a) => a !== 0);
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(vfx.ghostX[slot]).toBe(10);
    expect(vfx.ghostY[slot]).toBe(20);
    expect(vfx.ghostW[slot]).toBe(30);
    expect(vfx.ghostH[slot]).toBe(12);
    expect(vfx.ghostR[slot]).toBeCloseTo(0.9, 5);
    expect(vfx.ghostG[slot]).toBeCloseTo(0.2, 5);
    expect(vfx.ghostB[slot]).toBeCloseTo(0.1, 5);
    expect(vfx.ghostLifeMax[slot]).toBeCloseTo(GHOST_LIFE_MAX, 5);
    expect(vfx.ghostLife[slot]).toBeCloseTo(GHOST_LIFE_MAX, 5);
  });

  it('spawnBrickGhost ×8 (cascade) → 8 active (≤ cap)', () => {
    const vfx = allocateVfx();
    for (let i = 0; i < 8; i++) {
      spawnBrickGhost(vfx, {
        x: i,
        y: i * 2,
        w: 8,
        h: 4,
        r: 1,
        g: 0,
        b: 0,
      });
    }
    expect(countActiveGhosts(vfx)).toBe(8);
    expect(countActiveGhosts(vfx)).toBeLessThanOrEqual(vfx.ghostCap);
  });

  it('stepBrickGhosts over lifeMax → all inactive', () => {
    const vfx = allocateVfx();
    spawnBrickGhost(vfx, {
      x: 0,
      y: 0,
      w: 8,
      h: 4,
      r: 1,
      g: 1,
      b: 1,
    });
    expect(countActiveGhosts(vfx)).toBe(1);
    const steps = Math.ceil(GHOST_LIFE_MAX / 0.02) + 2;
    for (let i = 0; i < steps; i++) {
      stepBrickGhosts(vfx, 0.02);
    }
    expect(countActiveGhosts(vfx)).toBe(0);
  });

  it.todo(
    'consumeEventsForVfx: each BRICK_BREAK spawns a ghost (incl. cascade members)',
  );
  it.todo('recordSprites draws ghosts under ball; flat fill only');
});
