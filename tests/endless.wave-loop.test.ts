/**
 * Device-path regression: one full endless wave transition through the real `stepRun`
 * (N-END-01 / SC-1 / SC-4, plan 11-01).
 *
 * Vitest runs plain JS; if this fails, the endless board swap is broken in the play path.
 * If it passes but device sticks, suspect worklet/Metro divergence.
 *
 * The bot never misses on purpose (`tests/helpers/balanceBot.ts:8-9`), so every duration
 * recorded here is a *floor* on human duration, never a prediction of one.
 *
 * Deliberately NOT covered here: the multi-wave carry over many boards and the D-04
 * life-grant guard (plan 11-04), and the field-by-field carry/clear contract of
 * `applyWaveAdvance` in isolation (`tests/runtime.wave-advance.test.ts`). This file proves
 * the single end-to-end path: clear a generated board, get the next one, keep the run.
 */
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  dockBall,
  loadAndCompile,
  resetWorld,
  stepRun,
  FIXED_DT,
  SimPhase,
  type Intent,
  type World,
} from '../src/core';
import { generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
import { compileGeneratedLevel } from '../src/runtime/loadLevel';
import { applyWaveAdvance } from '../src/runtime/worldRequests';
import { TICKS_PER_SECOND, lowestLiveBall } from './helpers/balanceBot';

/** Ten simulated minutes per board — well past the d=20 worst case research measured. */
const MAX_TICKS = TICKS_PER_SECOND * 600;

/** Non-zero so the bot injects angle variety; offset 0 is the degenerate straight return. */
const PADDLE_OFFSET = 6;

const RUN_SEED = 0x11e5;

/**
 * The per-tick bot policy lifted from `balanceBot.ts:135-156`. `runBotOnLevel` cannot be
 * called directly here: it allocates a fresh world per level, which is exactly the thing a
 * wave transition must not do.
 */
function playBoard(w: World, maxTicks: number): number {
  let ticks = 0;
  let intent: Intent = { paddleX: w.paddleX, launch: 1 };

  while (ticks < maxTicks) {
    stepRun(w, intent, FIXED_DT);
    ticks++;

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

  return ticks;
}

describe('endless wave loop (N-END-01 / SC-1, 11-01)', () => {
  it('clears wave 1 and swaps wave 2 onto the live world with lives, score, combo and the gameplay RNG carried', () => {
    const w = allocateWorld();
    resetWorld(w, 0xace, 0xbeef);

    const wave1 = loadAndCompile(
      generate(seedForWave(RUN_SEED, 1), difficultyForWave(1)),
    );
    expect(wave1.ok, 'the wave 1 board must compile').toBe(true);
    if (!wave1.ok) return;
    applyCompiledLevel(w, wave1.compiled);
    dockBall(w);

    const wave1Ticks = playBoard(w, MAX_TICKS);
    expect(w.simPhase, 'the bot must clear wave 1 inside the tick budget').toBe(
      SimPhase.WON,
    );

    const livesBefore = w.lives;
    const scoreBefore = w.score;
    const comboBefore = w.combo;
    const rngGameplayBefore = w.rngGameplay[0];
    const rngCosmeticBefore = w.rngCosmetic[0];

    // The host path: a generated board reaches the world through the runtime wrapper,
    // because app/ may not import src/core (LC-04).
    const wave2 = compileGeneratedLevel(
      generate(seedForWave(RUN_SEED, 2), difficultyForWave(2)),
    );
    expect(wave2.ok, 'the wave 2 board must compile').toBe(true);
    if (!wave2.ok) return;

    const worldRef = w;
    applyWaveAdvance(w, wave2.compiled);

    expect(w, 'applyWaveAdvance must mutate the live World, never a clone').toBe(worldRef);
    expect(w.simPhase, 'the new board must start docked (D-03)').toBe(SimPhase.DOCKED);
    expect(w.lives, 'lives must carry across the wave boundary (SC-1)').toBe(livesBefore);
    expect(w.score, 'score must carry across the wave boundary (SC-1)').toBe(scoreBefore);
    expect(w.combo, 'combo must carry across the wave boundary (SC-1)').toBe(comboBefore);
    expect(
      w.rngGameplay[0],
      'the gameplay RNG stream must carry — a run is one deterministic stream (SC-4)',
    ).toBe(rngGameplayBefore);
    expect(
      w.rngCosmetic[0],
      'the cosmetic RNG stream must carry for the same reason (SC-4)',
    ).toBe(rngCosmeticBefore);
    expect(w.tick, 'every wave starts at serve speed, so tick restarts (D-06)').toBe(0);
    expect(w.effectCount, 'timed effects end with the wave (D-03)').toBe(0);
    expect(w.pickupCount, 'falling pickups end with the wave (D-03)').toBe(0);
    expect(w.activeBallCount, 'extra balls are dropped and the ball re-docks (D-03)').toBe(1);

    stepRun(w, { paddleX: w.paddleX, launch: 0 }, FIXED_DT);
    expect(
      w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST,
      'stepping the fresh board must not immediately end the run',
    ).toBe(false);

    const wave2Ticks = playBoard(w, MAX_TICKS);
    expect(w.simPhase, 'the bot must clear wave 2 inside the tick budget').toBe(
      SimPhase.WON,
    );
    expect(w.score, 'score keeps accumulating across waves (SC-1)').toBeGreaterThan(
      scoreBefore,
    );

    // Vitest suppresses console.log under this repo's reporter — measurements go to disk.
    writeFileSync(
      join(tmpdir(), 'gsd-11-01-wave-loop.json'),
      `${JSON.stringify(
        {
          runSeed: RUN_SEED,
          paddleOffset: PADDLE_OFFSET,
          wave1: {
            difficulty: difficultyForWave(1),
            seed: seedForWave(RUN_SEED, 1),
            ticks: wave1Ticks,
            seconds: Number((wave1Ticks / TICKS_PER_SECOND).toFixed(1)),
          },
          wave2: {
            difficulty: difficultyForWave(2),
            seed: seedForWave(RUN_SEED, 2),
            ticks: wave2Ticks,
            seconds: Number((wave2Ticks / TICKS_PER_SECOND).toFixed(1)),
          },
          note: 'Bot clear time is a floor on human duration (balanceBot.ts:8-9).',
        },
        null,
        2,
      )}\n`,
    );
  }, 120_000);
});
