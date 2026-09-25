// tests/vfx.brick-ghosts.test.ts — N-FX-01 brick ghost SoA (Wave 0 + Plan 01 wire)
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  pushEvent,
  clearEvents,
  EventCode,
} from '../src/core';
import {
  allocateVfx,
  GHOST_CAP_DEFAULT,
  PARTICLE_POOL_DEFAULT,
  IMPULSE_DESTROY,
} from '../src/vfx/types';
import {
  GHOST_CAP,
  GHOST_LIFE_MAX,
  spawnBrickGhost,
  stepBrickGhosts,
  ghostDrawFromLife,
} from '../src/vfx/brickGhosts';
import { consumeEventsForVfx } from '../src/vfx/consumeEvents';
import { stepVfx } from '../src/vfx/stepVfx';
import { countActiveParticles } from '../src/vfx/particles';

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

  it('consumeEventsForVfx: 1× BRICK_BREAK → 1 ghost; spawnBurst + shake still fire', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 0;
    world.brickFlags[0] = 0;
    world.brickX[0] = 40;
    world.brickY[0] = 80;
    world.brickW[0] = 32;
    world.brickH[0] = 14;
    clearEvents(world);

    const vfx = allocateVfx();
    pushEvent(world, EventCode.BRICK_BREAK, 1, 0, 56, 87);
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });

    expect(countActiveGhosts(vfx)).toBe(1);
    const slot = vfx.ghostActive.findIndex((a) => a !== 0);
    expect(vfx.ghostX[slot]).toBe(40);
    expect(vfx.ghostY[slot]).toBe(80);
    expect(vfx.ghostW[slot]).toBe(32);
    expect(vfx.ghostH[slot]).toBe(14);
    expect(countActiveParticles(vfx)).toBe(12);
    expect(vfx.shakeAmp).toBeCloseTo(IMPULSE_DESTROY, 5);
  });

  it('consumeEventsForVfx: 8× BRICK_BREAK cascade → 8 ghosts active', () => {
    const world = allocateWorld();
    world.brickCount = 8;
    clearEvents(world);
    for (let i = 0; i < 8; i++) {
      world.brickHp[i] = 0;
      world.brickFlags[i] = 0;
      world.brickX[i] = i * 10;
      world.brickY[i] = 50 + i;
      world.brickW[i] = 28;
      world.brickH[i] = 12;
      pushEvent(world, EventCode.BRICK_BREAK, 1, i, i * 10 + 14, 56);
    }

    const vfx = allocateVfx();
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });
    expect(countActiveGhosts(vfx)).toBe(8);
  });

  it('stepVfx over GHOST_LIFE_MAX → ghosts inactive', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 0;
    world.brickFlags[0] = 0;
    world.brickX[0] = 10;
    world.brickY[0] = 20;
    world.brickW[0] = 8;
    world.brickH[0] = 4;
    clearEvents(world);
    pushEvent(world, EventCode.BRICK_BREAK, 1, 0, 14, 22);

    const vfx = allocateVfx();
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });
    expect(countActiveGhosts(vfx)).toBe(1);

    const steps = Math.ceil(GHOST_LIFE_MAX / 0.02) + 2;
    for (let i = 0; i < steps; i++) {
      stepVfx(vfx, 0.02, 1);
    }
    expect(countActiveGhosts(vfx)).toBe(0);
  });

  it('ghostDrawFromLife: full life → scale 1 + alpha 1; half → shrink + fade', () => {
    const out = new Float32Array(2);
    ghostDrawFromLife(GHOST_LIFE_MAX, GHOST_LIFE_MAX, out);
    expect(out[0]).toBeCloseTo(1, 5);
    expect(out[1]).toBeCloseTo(1, 5);
    ghostDrawFromLife(GHOST_LIFE_MAX * 0.5, GHOST_LIFE_MAX, out);
    expect(out[0]).toBeCloseTo(0.85 + 0.15 * 0.5, 5);
    expect(out[1]).toBeCloseTo(0.5, 5);
    ghostDrawFromLife(0, GHOST_LIFE_MAX, out);
    expect(out[0]).toBeCloseTo(0.85, 5);
    expect(out[1]).toBe(0);
  });

  it('ghost draw prep does not mutate World brick/paddle SoA', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 0;
    world.brickX[0] = 40;
    world.brickY[0] = 80;
    world.brickW[0] = 32;
    world.brickH[0] = 14;
    const paddleW = world.paddleW;
    const paddleH = world.paddleH;
    const brickX = world.brickX[0];

    const vfx = allocateVfx();
    spawnBrickGhost(vfx, {
      x: brickX,
      y: 80,
      w: 32,
      h: 14,
      r: 1,
      g: 0,
      b: 0,
    });
    const slot = vfx.ghostActive.findIndex((a) => a !== 0);
    const out = new Float32Array(2);
    ghostDrawFromLife(
      vfx.ghostLife[slot],
      vfx.ghostLifeMax[slot],
      out,
    );
    const scale = out[0];
    const alpha = out[1];
    // Simulate recordSprites center-scale rect math (read-only)
    const gw = vfx.ghostW[slot];
    const gh = vfx.ghostH[slot];
    const cx = vfx.ghostX[slot] + gw * 0.5;
    const cy = vfx.ghostY[slot] + gh * 0.5;
    const dw = gw * scale;
    const dh = gh * scale;
    expect(dw).toBeGreaterThan(0);
    expect(dh).toBeGreaterThan(0);
    expect(alpha).toBeGreaterThan(0);
    expect(cx).toBeCloseTo(brickX + 16, 5);
    expect(cy).toBeCloseTo(87, 5);

    expect(world.paddleW).toBe(paddleW);
    expect(world.paddleH).toBe(paddleH);
    expect(world.brickX[0]).toBe(brickX);
    expect(world.brickHp[0]).toBe(0);
  });
});
