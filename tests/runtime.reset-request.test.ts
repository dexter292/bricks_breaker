/**
 * WP-1 / F-01 — pure UI-runtime reset helpers (no SharedValue).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  loadAndCompile,
  SimPhase,
  stepRun,
} from '../src/core';
import { allocateVfx } from '../src/vfx';
import {
  applyCertWorstCaseInject,
  applyRetryWorldReset,
  clearCosmeticVfx,
} from '../src/runtime/worldRequests';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const level01 = JSON.parse(
  readFileSync(join(root, 'assets/levels/level-01.json'), 'utf8'),
) as unknown;

describe('runtime worldRequests (F-01)', () => {
  it('T7.1/F-01: retry helper mutates the same World — tick drops after two resets', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    // Simulate play advancing tick on the live World reference (not a clone).
    world.tick = 120;
    const firstRef = world;
    applyRetryWorldReset(world, result.compiled);
    expect(world).toBe(firstRef);
    expect(world.tick).toBe(0);
    world.tick = 55;
    applyRetryWorldReset(world, result.compiled);
    expect(world.tick).toBe(0);
  });

  it('applyRetryWorldReset restores DOCKED + full HP + zero score/tick from LOST-like state', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    world.score = 999;
    world.combo = 5;
    world.tick = 400;
    world.lives = 1;
    world.simPhase = SimPhase.LOST;
    world.accumulator = 0.05;

    applyRetryWorldReset(world, result.compiled);

    expect(world.simPhase).toBe(SimPhase.DOCKED);
    expect(world.score).toBe(0);
    expect(world.combo).toBe(1); // resetWorld baseline combo
    expect(world.tick).toBe(0);
    expect(world.lives).toBe(3);
    expect(world.accumulator).toBe(0);
    let hpSum = 0;
    for (let i = 0; i < world.brickCount; i++) {
      hpSum += world.brickHp[i];
    }
    expect(hpSum).toBeGreaterThan(0);
  });

  it('applyCertWorstCaseInject yields ≥3 active balls and particles near cap', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    const vfx = allocateVfx({
      maxBalls: world.maxBalls,
      particleCap: 64,
      trailMax: 3,
      glowScale: 1,
    });

    applyCertWorstCaseInject(world, vfx, result.compiled);

    expect(world.activeBallCount).toBeGreaterThanOrEqual(3);
    expect(world.simPhase).toBe(SimPhase.PLAYING);
    expect(vfx.particleCount).toBeGreaterThanOrEqual(vfx.particleCap - 4);
    expect(vfx.shakeAmp).toBeGreaterThan(0);
  });

  it('clearCosmeticVfx zeros particles, trails, shake', () => {
    const world = allocateWorld();
    const vfx = allocateVfx({ particleCap: 32, trailMax: 3, maxBalls: 4 });
    vfx.particleCount = 10;
    vfx.active[0] = 1;
    vfx.trailHead[0] = 2;
    vfx.shakeAmp = 2;
    clearCosmeticVfx(vfx, world);
    expect(vfx.particleCount).toBe(0);
    expect(vfx.active[0]).toBe(0);
    expect(vfx.trailHead[0]).toBe(0);
    expect(vfx.shakeAmp).toBe(0);
  });

  it('retry reset then stepRun does not immediately re-enter LOST', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    world.simPhase = SimPhase.LOST;
    world.score = 50;
    applyRetryWorldReset(world, result.compiled);

    stepRun(world, { paddleX: world.paddleX, launch: 0 }, 1 / 120);
    expect(world.simPhase).toBe(SimPhase.DOCKED);
    expect(world.score).toBe(0);
  });
});
