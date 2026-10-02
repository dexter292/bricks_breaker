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
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
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
  type Intent,
} from '../src/core';
import { generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
import { compileGeneratedLevel } from '../src/runtime/loadLevel';
import {
  createRunStatsMirror,
  publishRunStatsMirror,
} from '../src/runtime/publishRunStatsMirror';
import { allocateRunStats, reduceRunTelemetry } from '../src/runtime/runStats';
import {
  applyRetryWorldReset,
  applyWaveAdvance,
} from '../src/runtime/worldRequests';
import { TICKS_PER_SECOND, lowestLiveBall } from './helpers/balanceBot';

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

/**
 * The arithmetic contract the `useGameLoop` wave block implements (plan 11-03).
 *
 * This is deliberately a headless test against the pure functions, not against the React
 * hook: `useGameLoop` cannot run under `environment: 'node'`, and mocking Reanimated would
 * prove nothing about the block's arithmetic. What IS pinned here is exactly what the block
 * does with numbers — counters fold into ONE `RunStats` across a board swap (N-END-01 /
 * RESEARCH Pitfall 4), and the tick bank plus the live `world.tick` is monotone across the
 * `world.tick = 0` that D-06 chose.
 *
 * The driver below reproduces the frame loop's substep tail verbatim
 * (`src/runtime/useGameLoop.ts` — `reduceRunTelemetry` then `publishRunStatsMirror` with
 * `ticksBanked.value + w.tick`) and the wave block's two ordered lines (bank `w.tick`, THEN
 * `applyWaveAdvance`). If the hook ever stops matching this shape, the block is wrong.
 */

/** Ten simulated minutes per board — the budget `tests/endless.wave-loop.test.ts` uses. */
const MAX_TICKS_PER_BOARD = TICKS_PER_SECOND * 600;

/** Non-zero so the bot injects angle variety; offset 0 is the degenerate straight return. */
const PADDLE_OFFSET = 6;

type WaveSnapshot = {
  /** `stepRun` calls spent clearing this board. */
  ticks: number;
  /** `world.tick` at the moment this board was cleared (before the advance). */
  worldTick: number;
  /** `world.tick` immediately AFTER the advance that followed this board (D-06). */
  worldTickAfterAdvance: number;
  /**
   * Breakable bricks on the board this advance swapped IN — the ceiling on what that
   * single board can ever contribute to `bricksBroken`.
   */
  nextBoardBreakables: number;
  /** `RunStatsMirror.bricksBroken` as JS would have read it at the end of this board. */
  bricksBroken: number;
  /** `RunStatsMirror.ticksPlayed` as JS would have read it at the end of this board. */
  ticksPlayed: number;
};

type EndlessRunTrace = { waves: WaveSnapshot[]; banked: number };

/**
 * Play `waveCount` generated boards inside ONE run, advancing between them exactly the way
 * the frame callback's wave block does. The per-tick bot policy is lifted from
 * `tests/helpers/balanceBot.ts:135-156`; `runBotOnLevel` cannot be used because it allocates
 * a fresh world per level, which is the one thing a wave transition must never do.
 */
function driveEndlessRun(waveCount: number): EndlessRunTrace {
  const first = nextWaveBoard(1);
  expect(first.ok, 'the wave 1 board must compile').toBe(true);
  if (!first.ok) throw new Error('wave 1 board did not compile');

  const w = allocateWorld();
  applyRetryWorldReset(w, first.compiled);

  // One RunStats and one mirror for the whole run — the hook allocates these once too.
  const stats = allocateRunStats();
  const mirror = createRunStatsMirror();
  let ticksBanked = 0;
  const waves: WaveSnapshot[] = [];

  for (let wave = 1; wave <= waveCount; wave++) {
    let ticks = 0;
    let intent: Intent = { paddleX: w.paddleX, launch: 1 };

    while (ticks < MAX_TICKS_PER_BOARD) {
      stepRun(w, intent, FIXED_DT);
      ticks++;
      // The frame loop's substep tail, in its order.
      reduceRunTelemetry(w, stats);
      publishRunStatsMirror(mirror, stats, ticksBanked + w.tick);

      if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;

      if (w.simPhase === SimPhase.DOCKED) {
        // Serve (cold start and after every life loss).
        intent = { paddleX: w.paddleX, launch: 1 };
        continue;
      }

      const b = lowestLiveBall(w);
      intent = {
        paddleX: b >= 0 ? w.ballX[b] + PADDLE_OFFSET : w.paddleX,
        launch: 0,
      };
    }

    expect(w.simPhase, `the bot must clear wave ${wave} inside the tick budget`).toBe(
      SimPhase.WON,
    );

    const worldTick = w.tick;
    const bricksBroken = mirror.bricksBroken;
    const ticksPlayed = mirror.ticksPlayed;

    const next = nextWaveBoard(wave + 1);
    expect(next.ok, `the wave ${wave + 1} board must compile`).toBe(true);
    if (!next.ok) throw new Error(`wave ${wave + 1} board did not compile`);

    // The wave block's two ordered lines: bank BEFORE the advance zeroes `world.tick`.
    ticksBanked += w.tick;
    applyWaveAdvance(w, next.compiled);

    // Breakable = hp > 0 && hp < 99, the same rule `balanceBot.bricksRemaining` uses.
    let nextBoardBreakables = 0;
    for (let i = 0; i < w.brickCount; i++) {
      const hp = w.brickHp[i];
      if (hp > 0 && hp < 99) nextBoardBreakables++;
    }

    waves.push({
      ticks,
      worldTick,
      worldTickAfterAdvance: w.tick,
      nextBoardBreakables,
      bricksBroken,
      ticksPlayed,
    });
  }

  return { waves, banked: ticksBanked };
}

describe('per-run counters and the tick bank across a wave boundary (11-03)', () => {
  let run: EndlessRunTrace;

  beforeAll(() => {
    run = driveEndlessRun(2);

    // Vitest suppresses console.log under this repo's reporter — measurements go to disk,
    // and to os.tmpdir() rather than the repo so `git status --porcelain` stays clean.
    writeFileSync(
      join(tmpdir(), 'gsd-11-03-tick-bank.json'),
      `${JSON.stringify(
        {
          runSeed: '0x5eed (nextWaveBoard)',
          paddleOffset: PADDLE_OFFSET,
          waves: run.waves,
          bankedAfterTwoWaves: run.banked,
          note: 'Bot clear time is a floor on human duration (balanceBot.ts:8-9).',
        },
        null,
        2,
      )}\n`,
    );
  }, 300_000);

  it('folds per-run counters across the board swap — a wave is not a run (N-END-01 / Pitfall 4)', () => {
    const [w1, w2] = run.waves;
    expect(w1, 'precondition: wave 1 was traced').toBeDefined();
    expect(w2, 'precondition: wave 2 was traced').toBeDefined();
    if (!w1 || !w2) return;

    expect(
      w1.bricksBroken,
      'precondition: wave 1 must actually have broken bricks to carry',
    ).toBeGreaterThan(0);
    expect(
      w2.bricksBroken,
      'wave 2 must report the whole run, not the last board — the wave block must not zero the counters (N-END-01)',
    ).toBeGreaterThan(w1.bricksBroken);
    // The load-bearing form: wave 2's published total exceeds every brick wave 2's own
    // board contained, so it CANNOT be explained by wave 2 alone. Zero the counters at
    // the boundary and this is unreachable by construction.
    expect(
      w2.bricksBroken,
      `the run total (${w2.bricksBroken}) must exceed everything the wave 2 board could contribute (${w1.nextBoardBreakables} breakables) — proof the wave 1 count carried`,
    ).toBeGreaterThan(w1.nextBoardBreakables);
  });

  it('publishes cumulative ticksPlayed even though world.tick restarts (D-06 consequence 2)', () => {
    const [w1, w2] = run.waves;
    if (!w1 || !w2) throw new Error('trace missing');

    expect(
      w1.ticksPlayed,
      'wave 1 has no bank yet, so ticksPlayed is just its own simulated time',
    ).toBe(w1.worldTick);
    expect(
      w2.ticksPlayed,
      'wave 2 must publish more simulated time than wave 1, not restart it (D-06)',
    ).toBeGreaterThan(w1.ticksPlayed);
    expect(
      w2.ticksPlayed,
      'and it must be exactly bank + live tick — the sum of both waves (D-06)',
    ).toBe(w1.worldTick + w2.worldTick);

    // The two waves' step counts are the independent measure: `world.tick` is incremented
    // by stepRun itself, so agreeing with the driver's own count is a real cross-check.
    const stepSum = w1.ticks + w2.ticks;
    expect(
      Math.abs(w2.ticksPlayed - stepSum),
      `published ticksPlayed (${w2.ticksPlayed}) must track the driver's own step count (${stepSum})`,
    ).toBeLessThanOrEqual(2);
  });

  it('restarts world.tick at every advance while the bank keeps climbing (D-06)', () => {
    const [w1, w2] = run.waves;
    if (!w1 || !w2) throw new Error('trace missing');

    expect(
      w1.worldTickAfterAdvance,
      'wave 1 → 2: every wave genuinely restarts at serve speed (D-06)',
    ).toBe(0);
    expect(
      w2.worldTickAfterAdvance,
      'wave 2 → 3: the reset is per advance, not a first-advance special case (D-06)',
    ).toBe(0);
    expect(
      run.banked,
      'the bank holds every completed wave, so the run total survives both resets',
    ).toBe(w1.worldTick + w2.worldTick);
    expect(run.banked, 'precondition: the bank is non-trivial').toBeGreaterThan(0);
  });
});
