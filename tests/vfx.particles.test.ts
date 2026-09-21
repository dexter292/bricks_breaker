// tests/vfx.particles.test.ts — FX-02 pooled neon sparks
import { describe, it, expect } from 'vitest';
import {
  allocateVfx,
  PARTICLE_POOL_DEFAULT,
  PARTICLE_POOL_HARD_MAX,
  CHIP_SPARKS_AT_1,
  DESTROY_SPARKS_AT_1,
} from '../src/vfx/types';
import { spawnBurst, stepParticles, countActiveParticles } from '../src/vfx/particles';
import { stepVfx } from '../src/vfx/stepVfx';

/** Deterministic cosmetic RNG — never Math.random / gameplay stream. */
function makeRng(seed = 0x12345678): { next: () => number; state: Uint32Array } {
  const state = new Uint32Array([seed >>> 0]);
  return {
    state,
    next: () => {
      state[0] = (state[0] + 0x6d2b79f5) | 0;
      let t = state[0];
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

describe('vfx particles (FX-02)', () => {
  it('spawn chip count at intensity 1.0 is 4', () => {
    const vfx = allocateVfx();
    const rng = makeRng();
    spawnBurst(vfx, {
      kind: 'chip',
      x: 10,
      y: 20,
      rgb: { r: 1, g: 0.2, b: 0.4 },
      intensity: 1.0,
      rng: rng.next,
    });
    expect(countActiveParticles(vfx)).toBe(CHIP_SPARKS_AT_1);
    expect(CHIP_SPARKS_AT_1).toBe(4);
  });

  it('spawn destroy count at intensity 1.0 is 12', () => {
    const vfx = allocateVfx();
    const rng = makeRng();
    spawnBurst(vfx, {
      kind: 'destroy',
      x: 10,
      y: 20,
      rgb: { r: 1, g: 0.2, b: 0.4 },
      intensity: 1.0,
      rng: rng.next,
    });
    expect(countActiveParticles(vfx)).toBe(DESTROY_SPARKS_AT_1);
    expect(DESTROY_SPARKS_AT_1).toBe(12);
  });

  it('hard cap 128 with oldest-eviction; never exceeds 192', () => {
    expect(PARTICLE_POOL_DEFAULT).toBe(128);
    expect(PARTICLE_POOL_HARD_MAX).toBe(192);

    const vfx = allocateVfx({ particleCap: PARTICLE_POOL_HARD_MAX });
    const rng = makeRng();

    // Fill beyond hard max via many destroy bursts
    for (let i = 0; i < 30; i++) {
      spawnBurst(vfx, {
        kind: 'destroy',
        x: i,
        y: i,
        rgb: { r: 1, g: 0, b: 0 },
        intensity: 1.0,
        rng: rng.next,
      });
    }

    expect(countActiveParticles(vfx)).toBeLessThanOrEqual(PARTICLE_POOL_HARD_MAX);
    expect(vfx.px.length).toBe(PARTICLE_POOL_HARD_MAX);
    expect(vfx.particleCount).toBeLessThanOrEqual(PARTICLE_POOL_HARD_MAX);
  });

  it('spawn counts scale with round(base × intensity)', () => {
    const vfx = allocateVfx();
    const rng = makeRng(99);
    spawnBurst(vfx, {
      kind: 'chip',
      x: 0,
      y: 0,
      rgb: { r: 1, g: 1, b: 1 },
      intensity: 0.2,
      rng: rng.next,
    });
    expect(countActiveParticles(vfx)).toBe(Math.max(0, Math.round(4 * 0.2)));

    const vfx2 = allocateVfx();
    spawnBurst(vfx2, {
      kind: 'destroy',
      x: 0,
      y: 0,
      rgb: { r: 1, g: 1, b: 1 },
      intensity: 0.2,
      rng: makeRng(7).next,
    });
    expect(countActiveParticles(vfx2)).toBe(Math.max(0, Math.round(12 * 0.2)));
  });

  it('stepParticles decays life; stepVfx composes particle + shake steps', () => {
    const vfx = allocateVfx();
    spawnBurst(vfx, {
      kind: 'chip',
      x: 0,
      y: 0,
      rgb: { r: 1, g: 0, b: 0 },
      intensity: 1.0,
      rng: makeRng().next,
    });
    const before = countActiveParticles(vfx);
    expect(before).toBe(4);

    // Advance past chip lifetime upper bound (0.16s)
    for (let i = 0; i < 20; i++) {
      stepParticles(vfx, 0.02);
    }
    expect(countActiveParticles(vfx)).toBe(0);

    spawnBurst(vfx, {
      kind: 'chip',
      x: 1,
      y: 1,
      rgb: { r: 0, g: 1, b: 0 },
      intensity: 1.0,
      rng: makeRng(3).next,
    });
    vfx.shakeAmp = 1.0;
    stepVfx(vfx, 0.02, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(0.85, 5);
    expect(countActiveParticles(vfx)).toBeGreaterThan(0);
  });

  it('default pool active ≤128', () => {
    const vfx = allocateVfx(); // default cap 128
    expect(vfx.particleCap).toBe(PARTICLE_POOL_DEFAULT);
    const rng = makeRng();
    for (let i = 0; i < 40; i++) {
      spawnBurst(vfx, {
        kind: 'destroy',
        x: i,
        y: i,
        rgb: { r: 0.5, g: 0.5, b: 0.5 },
        intensity: 1.0,
        rng: rng.next,
      });
    }
    expect(countActiveParticles(vfx)).toBeLessThanOrEqual(PARTICLE_POOL_DEFAULT);
  });

  // 08-TIER — Plan 02 fills quality-tier caps API
  it.todo('allocateVfx respects particleCap from caps');
  it.todo('trailMax from caps clamps trailLength result ≥2');
  it.todo('glowScale 0 is distinguishable from 1 in caps');
});
