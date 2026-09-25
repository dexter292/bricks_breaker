/**
 * SC-1 / D-03 / D-06 — the field-by-field carry/clear contract of `applyWaveAdvance`.
 *
 * `tests/endless.wave-loop.test.ts` proves the wave transition works end-to-end; this file
 * proves *why* it works, one field at a time, so a failure names the field instead of
 * reporting an opaque "the run broke". The two halves are not interchangeable: an
 * integration test that happened to pass with `combo` silently reset would still be green.
 *
 * Analog: `tests/runtime.reset-request.test.ts` — the same on-disk `level-01` compile, the
 * same `expect(result.ok).toBe(true); if (!result.ok) return;` narrowing idiom, the same
 * dirty-by-hand-then-assert-each-field shape, and the same `stepRun`-after-apply smoke
 * case. The contract *inverts* there: `applyRetryWorldReset` zeroes lives/score/combo,
 * `applyWaveAdvance` must carry them.
 *
 * `applyWaveAdvance` is deep-imported because `src/runtime/worldRequests.ts` has no barrel
 * — the same reason the analog deep-imports it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyOrRefreshExpand,
  loadAndCompile,
  spawnMultiballFromPaddle,
  stepRun,
  EFFECT_TYPE_EXPAND,
  FIXED_DT,
  LOGICAL_WIDTH,
  PADDLE_WIDTH,
  PICKUP_TYPE_MULTIBALL,
  SimPhase,
} from '../src/core';
import { generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
import { compileGeneratedLevel } from '../src/runtime/loadLevel';
import {
  applyRetryWorldReset,
  applyWaveAdvance,
} from '../src/runtime/worldRequests';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const level01 = JSON.parse(
  readFileSync(join(root, 'assets/levels/level-01.json'), 'utf8'),
) as unknown;

/** A compiled generated board — the same path the host hands `applyWaveAdvance` (LC-02). */
function nextWaveBoard(wave: number) {
  return compileGeneratedLevel(
    generate(seedForWave(0x5eed, wave), difficultyForWave(wave)),
  );
}

describe('applyWaveAdvance (SC-1 / D-03 / D-06, 11-01)', () => {
  it('carries lives, score, combo and the gameplay RNG stream across the boundary (SC-1 / SC-4)', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    world.lives = 4;
    world.score = 12345;
    world.combo = 7;
    world.rngGameplay[0] = 0x1234abcd;
    world.rngCosmetic[0] = 0x0fedcba9;

    applyWaveAdvance(world, result.compiled);

    expect(world.lives, 'a wave boundary must not touch lives (SC-1)').toBe(4);
    expect(world.score, 'a wave boundary must not touch score (SC-1)').toBe(12345);
    expect(world.combo, 'a wave boundary must not touch combo (SC-1)').toBe(7);
    expect(
      world.rngGameplay[0],
      'a run is one gameplay RNG stream — the boundary must not re-seed it (SC-4)',
    ).toBe(0x1234abcd);
    expect(
      world.rngCosmetic[0],
      'a run is one cosmetic RNG stream — the boundary must not re-seed it (SC-4)',
    ).toBe(0x0fedcba9);
  });

  it('clears effects, pickups, extra balls, stall and time (D-03 / D-06)', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);

    // Live effect, live pickup, and 3 balls in flight — the messiest legal mid-run state.
    world.tick = 9000;
    applyOrRefreshExpand(world);
    world.pickupActive[0] = 1;
    world.pickupType[0] = PICKUP_TYPE_MULTIBALL;
    world.pickupX[0] = 100;
    world.pickupY[0] = 200;
    world.pickupCount = 1;
    spawnMultiballFromPaddle(world);
    world.stallIdleTicks = 500;
    world.stallTier = 2;
    world.accumulator = 0.004;

    expect(world.effectCount, 'precondition: an effect is live before the advance').toBe(1);
    expect(world.pickupCount, 'precondition: a pickup is live before the advance').toBe(1);
    expect(
      world.activeBallCount,
      'precondition: 3 balls are in flight before the advance',
    ).toBe(3);

    applyWaveAdvance(world, result.compiled);

    expect(world.effectCount, 'timed effects end with the wave (D-03)').toBe(0);
    expect(world.pickupCount, 'falling pickups end with the wave (D-03)').toBe(0);
    expect(world.pickupActive[0], 'the pickup SoA slot must be released too').toBe(0);
    expect(world.activeBallCount, 'extra balls are dropped; the ball re-docks (D-03)').toBe(1);
    expect(world.stallIdleTicks, 'anti-stall accounting is per board').toBe(0);
    expect(world.stallTier, 'anti-stall tier is per board').toBe(0);
    expect(world.tick, 'every wave starts at serve speed (D-06)').toBe(0);
    expect(world.accumulator, 'the substep accumulator does not cross a board swap').toBe(0);
    expect(world.simPhase, 'the new board starts docked (D-03)').toBe(SimPhase.DOCKED);
  });

  it('restores the paddle to its derived width and keeps it inside the field (D-03)', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    applyOrRefreshExpand(world);
    expect(
      world.paddleW,
      'precondition: expand must actually have widened the paddle',
    ).toBeGreaterThan(PADDLE_WIDTH);
    world.paddleX = LOGICAL_WIDTH - 1;

    applyWaveAdvance(world, result.compiled);

    expect(world.paddleW, 'expand expires with the wave, so width returns to base').toBe(
      PADDLE_WIDTH,
    );
    expect(world.paddleX, 'paddleX must be re-clamped into the field').toBeLessThanOrEqual(
      LOGICAL_WIDTH - world.paddleW * 0.5,
    );
    expect(world.paddleX, 'paddleX must be re-clamped into the field').toBeGreaterThanOrEqual(
      world.paddleW * 0.5,
    );
  });

  it('never lets an effect survive the tick reset — the clear stays above it (D-06)', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    // An absolute until-tick far beyond anything the next board will reach. If the tick
    // reset ran *above* the effect clear, this 10-second expand would become permanent.
    world.tick = 9000;
    world.effectType[0] = EFFECT_TYPE_EXPAND;
    world.effectUntilTick[0] = 1000000;
    world.effectCount = 1;

    applyWaveAdvance(world, result.compiled);
    stepRun(world, { paddleX: world.paddleX, launch: 0 }, FIXED_DT);

    expect(world.effectCount, 'a far-future effect must not survive the boundary').toBe(0);
    expect(world.effectUntilTick[0], 'its absolute until-tick must be zeroed too').toBe(0);
    expect(world.paddleW, 'and the paddle must not still be expanded').toBe(PADDLE_WIDTH);

    // Source contract: behaviour alone cannot see statement order, and the ordering is the
    // thing a later "simplification" would break. Pin it at the source.
    const src = readFileSync(join(root, 'src/runtime/worldRequests.ts'), 'utf8');
    const body = src.slice(src.indexOf('export function applyWaveAdvance'));
    const clearAt = body.indexOf('world.effectCount = 0;');
    const resetAt = body.indexOf('world.tick = 0;');
    expect(clearAt, 'applyWaveAdvance must clear the effect SoA').toBeGreaterThan(-1);
    expect(resetAt, 'applyWaveAdvance must reset the tick').toBeGreaterThan(-1);
    expect(
      clearAt,
      'the effect clear must appear above the tick reset — effectUntilTick is absolute',
    ).toBeLessThan(resetAt);
  });

  it('rebuilds the brick lattice from the new board (SC-1)', () => {
    const first = loadAndCompile(level01);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = nextWaveBoard(2);
    expect(second.ok, 'the generated wave 2 board must compile').toBe(true);
    if (!second.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, first.compiled);
    const firstCount = world.brickCount;

    applyWaveAdvance(world, second.compiled);

    expect(world.brickCount, 'the lattice must hold the new board').toBe(
      second.compiled.brickCount,
    );
    expect(world.gridCols, 'the grid must be the new board grid').toBe(
      second.compiled.gridCols,
    );
    expect(world.simPhase, 'the new board starts docked').toBe(SimPhase.DOCKED);
    let hpSum = 0;
    for (let i = 0; i < world.brickCount; i++) {
      hpSum += world.brickHp[i];
    }
    expect(hpSum, 'the new board must arrive at full HP').toBeGreaterThan(0);
    expect(firstCount, 'precondition: the first board had bricks to replace').toBeGreaterThan(
      0,
    );
  });

  it('mutates the live World object rather than a clone', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    const firstRef = world;
    world.tick = 777;

    applyWaveAdvance(world, result.compiled);

    expect(world, 'the reference handed in is the reference mutated').toBe(firstRef);
    expect(world.tick, 'and the mutation landed on it').toBe(0);
  });

  it('wave advance then stepRun does not immediately re-enter WON or LOST', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    world.simPhase = SimPhase.WON;
    world.score = 500;

    applyWaveAdvance(world, result.compiled);
    stepRun(world, { paddleX: world.paddleX, launch: 0 }, FIXED_DT);

    expect(world.simPhase, 'the fresh board must be playable, not terminal').toBe(
      SimPhase.DOCKED,
    );
    expect(world.score, 'and the run score is still the run score').toBe(500);
  });
});
