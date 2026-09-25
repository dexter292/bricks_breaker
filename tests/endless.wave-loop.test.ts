/**
 * Device-path regression: the endless wave loop through the real `stepRun`
 * (N-END-01 / SC-1 / SC-4, plans 11-01 and 11-04).
 *
 * Vitest runs plain JS; if this fails, the endless board swap is broken in the play path.
 * If it passes but device sticks, suspect worklet/Metro divergence.
 *
 * The bot never misses on purpose (`tests/helpers/balanceBot.ts:8-9`), so every duration
 * recorded here is a *floor* on human duration, never a prediction of one. Nothing in this
 * file asserts a clear-time bound: Phase 10 refused to pin one because pinning a ceiling
 * pins the dial constants by proxy, and this phase inherits that refusal. Timing numbers
 * belong in `docs/ops/ENDLESS-MODE.md`.
 *
 * What lives here, in two halves:
 *   1. plan 11-01's tracer — one transition, end to end, the proof the seam works at all.
 *   2. plan 11-04's multi-wave cases — SC-1's two real claims: an endless run *keeps going*
 *      (12 boards, carried score/combo/lives, folded counters) and it *ends only at zero
 *      lives* (`LOST` is the sole terminating phase, never `WON`, never a tick-budget
 *      timeout). Plus the D-04 guard: no wave boundary grants a life, and in a run where
 *      a life is actually caught, lives never pass `MAX_LIVES`.
 *
 * Deliberately NOT covered here: the field-by-field carry/clear contract of
 * `applyWaveAdvance` in isolation (`tests/runtime.wave-advance.test.ts`) and the SC-4
 * replay property (`tests/endless.determinism.test.ts`).
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  dockBall,
  loadAndCompile,
  resetWorld,
  stepRun,
  FIXED_DT,
  MAX_LIVES,
  SimPhase,
  type Intent,
  type LevelFileV1,
  type World,
} from '../src/core';
import { D_MAX, generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
import { compileGeneratedLevel } from '../src/runtime/loadLevel';
import { applyWaveAdvance } from '../src/runtime/worldRequests';
import { allocateRunStats, reduceRunTelemetry } from '../src/runtime/runStats';
import { TICKS_PER_SECOND, lowestLiveBall } from './helpers/balanceBot';

/** Ten simulated minutes per board — well past the d=20 worst case research measured. */
const MAX_TICKS = TICKS_PER_SECOND * 600;

/**
 * Fifteen simulated minutes per board for the multi-wave driver. Research's 500-seed d=20
 * scan put p99 at 656.8 s and the pathological max at 1 495 s (at a *different* offset);
 * the slowest board any run in this file actually hits is 329.6 s, so this is ~2.7x
 * headroom. It is a stuck-wave trap, not a performance claim: a wave that exhausts it
 * fails Test 1, which is exactly what should happen.
 */
const MAX_TICKS_PER_BOARD = TICKS_PER_SECOND * 900;

/** Non-zero so the bot injects angle variety; offset 0 is the degenerate straight return. */
const PADDLE_OFFSET = 6;

/**
 * A deliberately hopeless paddle policy for the ending-condition case. 120 world units is
 * well past `PADDLE_WIDTH` (72), so the paddle is never under the ball and every serve is
 * dropped. The case asserts the terminating *phase*, never a duration.
 */
const LOSING_PADDLE_OFFSET = 120;

const RUN_SEED = 0x11e5;

/** The reference run length. Research measured 30 waves with zero stuck waves. */
const REFERENCE_WAVES = 12;

/** The same gameplay/cosmetic seed pair `runBotOnLevel` uses, so runs are comparable. */
const GAMEPLAY_SEED = 0xace;
const COSMETIC_SEED = 0xbeef;

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
    resetWorld(w, GAMEPLAY_SEED, COSMETIC_SEED);

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

// ---------------------------------------------------------------------------------------
// plan 11-04 — the multi-wave run. Everything below drives many boards through one World.
// ---------------------------------------------------------------------------------------

/** One board's worth of the run, recorded on both sides of the `applyWaveAdvance` call. */
type WaveRecord = {
  wave: number;
  difficulty: number;
  boardSeed: number;
  boardDigest: string;
  ticks: number;
  /** The phase the board ended in — `WON`, `LOST`, or `PLAYING` if the budget ran out. */
  endPhase: number;
  livesBeforeAdvance: number;
  /** `null` on the wave that ended the run: there is no boundary after it. */
  livesAfterAdvance: number | null;
  scoreBeforeAdvance: number;
  scoreAfterAdvance: number | null;
  comboBeforeAdvance: number;
  comboAfterAdvance: number | null;
  /** Cumulative for the whole run so far, never per wave (Pitfall 4: a wave is not a run). */
  bricksBrokenTotal: number;
};

type EndlessRun = {
  world: World;
  waves: WaveRecord[];
  /** The phase the run itself ended in — the thing SC-1's ending condition is about. */
  endPhase: number;
  startingLives: number;
  /** Sampled every tick, not only at boundaries, so a transient overshoot cannot hide. */
  maxLivesSeen: number;
  /** The wave on which lives first rose above `startingLives`, or -1 if they never did. */
  firstLifeGainWave: number;
  finalScore: number;
};

/** A stable content id for a generated board. Not a security digest; a change detector. */
function boardDigest(raw: LevelFileV1): string {
  return createHash('sha256').update(JSON.stringify(raw)).digest('hex').slice(0, 16);
}

/**
 * Drive an endless run across many boards on ONE `World`.
 *
 * File-local on purpose: this is a test fixture, not a helper anything ships against. The
 * loop body is `balanceBot.ts:135-156`; the between-waves step is the production seam
 * (`generate` -> `compileGeneratedLevel` -> `applyWaveAdvance`), the same call the frame
 * loop makes, so this exercises the shipped path rather than a parallel one.
 */
function driveEndlessRun(options: {
  runSeed: number;
  maxWaves: number;
  paddleOffset: number;
  tickBudget?: number;
}): EndlessRun {
  const { runSeed, maxWaves, paddleOffset } = options;
  const tickBudget = options.tickBudget ?? MAX_TICKS_PER_BOARD;

  let board = generate(seedForWave(runSeed, 1), difficultyForWave(1));
  const first = loadAndCompile(board);
  if (!first.ok) {
    throw new Error(`wave 1 board did not compile: ${JSON.stringify(first.issues)}`);
  }

  const w = allocateWorld();
  resetWorld(w, GAMEPLAY_SEED, COSMETIC_SEED);
  applyCompiledLevel(w, first.compiled);
  dockBall(w);

  // One RunStats for the whole run — a wave is a board swap, not a new run (Pitfall 4).
  const stats = allocateRunStats();
  const startingLives = w.lives;
  let maxLivesSeen = w.lives;
  let firstLifeGainWave = -1;
  const waves: WaveRecord[] = [];

  for (let wave = 1; wave <= maxWaves; wave++) {
    let ticks = 0;
    let intent: Intent = { paddleX: w.paddleX, launch: 1 };

    while (ticks < tickBudget) {
      stepRun(w, intent, FIXED_DT);
      ticks++;
      reduceRunTelemetry(w, stats);

      if (w.lives > maxLivesSeen) {
        maxLivesSeen = w.lives;
        if (firstLifeGainWave < 0 && w.lives > startingLives) firstLifeGainWave = wave;
      }

      if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;

      if (w.simPhase === SimPhase.DOCKED) {
        // Serve (cold start and after every life loss).
        intent = { paddleX: w.paddleX, launch: 1 };
        continue;
      }

      const b = lowestLiveBall(w);
      intent = {
        paddleX: b >= 0 ? w.ballX[b] + paddleOffset : w.paddleX,
        launch: 0,
      };
    }

    const endPhase = w.simPhase;
    const livesBeforeAdvance = w.lives;
    const scoreBeforeAdvance = w.score;
    const comboBeforeAdvance = w.combo;
    const common = {
      wave,
      difficulty: difficultyForWave(wave),
      boardSeed: seedForWave(runSeed, wave),
      boardDigest: boardDigest(board),
      ticks,
      endPhase,
      livesBeforeAdvance,
      scoreBeforeAdvance,
      comboBeforeAdvance,
      bricksBrokenTotal: stats.bricksBroken,
    };

    if (endPhase !== SimPhase.WON) {
      // The run is over (or the budget blew): there is no boundary after this board.
      waves.push({
        ...common,
        livesAfterAdvance: null,
        scoreAfterAdvance: null,
        comboAfterAdvance: null,
      });
      break;
    }

    board = generate(seedForWave(runSeed, wave + 1), difficultyForWave(wave + 1));
    const next = compileGeneratedLevel(board);
    if (!next.ok) {
      throw new Error(
        `wave ${wave + 1} board did not compile: ${JSON.stringify(next.issues)}`,
      );
    }
    applyWaveAdvance(w, next.compiled);

    waves.push({
      ...common,
      livesAfterAdvance: w.lives,
      scoreAfterAdvance: w.score,
      comboAfterAdvance: w.combo,
    });
  }

  const last = waves[waves.length - 1];
  return {
    world: w,
    waves,
    endPhase: last ? last.endPhase : w.simPhase,
    startingLives,
    maxLivesSeen,
    firstLifeGainWave,
    finalScore: w.score,
  };
}

describe('multi-wave endless run (N-END-01 / SC-1, 11-04)', () => {
  let run: EndlessRun;

  beforeAll(() => {
    run = driveEndlessRun({
      runSeed: RUN_SEED,
      maxWaves: REFERENCE_WAVES,
      paddleOffset: PADDLE_OFFSET,
    });

    // Vitest suppresses console.log under this repo's reporter — measurements go to disk,
    // and to os.tmpdir() rather than the repo so `git status --porcelain` stays clean.
    // This table is the input to docs/ops/ENDLESS-MODE.md (plan 11-06).
    writeFileSync(
      join(tmpdir(), 'gsd-11-04-wave-loop.json'),
      `${JSON.stringify(
        {
          runSeed: RUN_SEED,
          paddleOffset: PADDLE_OFFSET,
          gameplaySeed: GAMEPLAY_SEED,
          cosmeticSeed: COSMETIC_SEED,
          startingLives: run.startingLives,
          maxLivesSeen: run.maxLivesSeen,
          firstLifeGainWave: run.firstLifeGainWave,
          finalScore: run.finalScore,
          waves: run.waves.map((r) => ({
            ...r,
            seconds: Number((r.ticks / TICKS_PER_SECOND).toFixed(1)),
          })),
          note: 'Bot clear time is a floor on human duration (balanceBot.ts:8-9).',
        },
        null,
        2,
      )}\n`,
    );
  }, 600_000);

  it('advances board after board and never ends on a cleared wave (SC-1 / N-END-01)', () => {
    expect(run.waves.length, 'the run must reach every wave it was asked for').toBe(
      REFERENCE_WAVES,
    );
    for (const r of run.waves) {
      expect(r.endPhase, `wave ${r.wave} must end in WON, not LOST and not a timeout`).toBe(
        SimPhase.WON,
      );
      expect(
        r.ticks,
        `wave ${r.wave} must clear inside the tick budget — a stuck wave is a broken run`,
      ).toBeLessThan(MAX_TICKS_PER_BOARD);
    }
    expect(
      run.world.simPhase,
      'a cleared final wave leaves the run docked on the next board, never ended (SC-1)',
    ).toBe(SimPhase.DOCKED);
  });

  it('carries score and combo across every boundary rather than restarting them (SC-1)', () => {
    let previousScore = -1;
    for (const r of run.waves) {
      expect(
        r.scoreBeforeAdvance,
        `score must never fall — wave ${r.wave}`,
      ).toBeGreaterThanOrEqual(previousScore);
      previousScore = r.scoreBeforeAdvance;

      expect(
        r.scoreAfterAdvance,
        `the boundary itself must not touch score — wave ${r.wave}`,
      ).toBe(r.scoreBeforeAdvance);
      expect(
        r.comboAfterAdvance,
        `the boundary itself must not reset combo to 1 — wave ${r.wave}`,
      ).toBe(r.comboBeforeAdvance);
    }

    const firstWave = run.waves[0];
    const lastWave = run.waves[run.waves.length - 1];
    expect(firstWave, 'precondition: the run recorded a first wave').toBeDefined();
    expect(lastWave, 'precondition: the run recorded a last wave').toBeDefined();
    if (!firstWave || !lastWave) return;
    expect(
      lastWave.scoreBeforeAdvance,
      'twelve waves of play must be worth more than one — the run accumulates (SC-1)',
    ).toBeGreaterThan(firstWave.scoreBeforeAdvance);
  });

  it('reaches the difficulty clamp at wave 21 and still varies the board after it (D-01)', () => {
    expect(
      difficultyForWave(20),
      'wave 20 is one step below the ceiling — the clamp must not arrive early',
    ).toBeLessThan(D_MAX);
    for (let wave = 21; wave <= 25; wave++) {
      expect(difficultyForWave(wave), `wave ${wave} sits on the clamp (D-01)`).toBe(D_MAX);
    }

    const digests: string[] = [];
    for (let wave = 21; wave <= 25; wave++) {
      digests.push(
        boardDigest(generate(seedForWave(RUN_SEED, wave), difficultyForWave(wave))),
      );
    }
    expect(
      new Set(digests).size,
      'post-clamp waves share a difficulty but must not share a board (D-01)',
    ).toBe(digests.length);
  });

  it('folds per-run counters across every board swap — a wave is not a run (N-END-01)', () => {
    const firstWave = run.waves[0];
    const lastWave = run.waves[run.waves.length - 1];
    expect(firstWave, 'precondition: the run recorded a first wave').toBeDefined();
    expect(lastWave, 'precondition: the run recorded a last wave').toBeDefined();
    if (!firstWave || !lastWave) return;

    expect(
      firstWave.bricksBrokenTotal,
      'precondition: wave 1 actually broke bricks',
    ).toBeGreaterThan(0);
    expect(
      lastWave.bricksBrokenTotal,
      'bricksBroken folds across the whole run, it does not restart per wave',
    ).toBeGreaterThan(firstWave.bricksBrokenTotal);
  });

  it('grants no life at a wave boundary — the guard a per-N-waves bonus would break (D-04)', () => {
    // THE load-bearing half of D-04. D-04 decided to build no life mechanic at all, and a
    // decision to build nothing leaves no artefact; this assertion is the only thing that
    // would catch a later phase quietly adding a per-wave grant.
    for (const r of run.waves) {
      expect(
        r.livesAfterAdvance,
        `the wave ${r.wave} boundary must leave lives exactly as it found them (D-04)`,
      ).toBe(r.livesBeforeAdvance);
    }
  });

  it('never exceeds MAX_LIVES in a run that actually gains a life (D-04)', () => {
    // The cheap half, and worthless unless exercised: if no extra-life pickup is ever
    // caught, the cap is never approached and the assertion below passes for reasons that
    // have nothing to do with D-04. So the gain is asserted FIRST.
    expect(
      run.firstLifeGainWave,
      'precondition: an extra life must actually be caught, or the cap is untested',
    ).toBeGreaterThan(0);
    expect(
      run.maxLivesSeen,
      'precondition: lives must actually have risen above the starting count',
    ).toBeGreaterThan(run.startingLives);

    expect(
      run.maxLivesSeen,
      'the extra-life pickup must never carry a run past the cap (D-04 / N-PWR-01)',
    ).toBeLessThanOrEqual(MAX_LIVES);
  });
});

describe('endless run ending condition (SC-1, 11-04)', () => {
  it('ends at zero lives and nowhere else — LOST is the only terminating phase', () => {
    const run = driveEndlessRun({
      runSeed: RUN_SEED,
      maxWaves: REFERENCE_WAVES,
      paddleOffset: LOSING_PADDLE_OFFSET,
    });

    const last = run.waves[run.waves.length - 1];
    expect(last, 'precondition: the losing run recorded at least one wave').toBeDefined();
    if (!last) return;

    expect(
      last.endPhase,
      'a run driven into the floor must end LOST — never WON, never a tick-budget timeout',
    ).toBe(SimPhase.LOST);
    expect(run.world.lives, 'LOST means the lives ran out, nothing else (SC-1)').toBe(0);
    expect(
      run.waves.length,
      'the run stops at the losing wave instead of advancing past it',
    ).toBeLessThan(REFERENCE_WAVES + 1);
    expect(
      last.livesAfterAdvance,
      'there is no boundary after the wave that ended the run',
    ).toBeNull();
  }, 600_000);
});
