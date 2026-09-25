/**
 * Endless-run determinism — SC-4 / N-END-03.
 *
 * SCOPE, stated before anything else, because this is the claim most easily over-read.
 *
 * **What this file proves:** *given a run seed, the initial world seeds and a fixed input
 * policy, an endless run replays to the same wave with the same score and the same
 * `hashWorld` at every wave boundary.* That is a determinism property of the simulation,
 * measured headlessly in Node, and nothing more.
 *
 * **What it does NOT prove, and what the game does NOT ship: a device endless run is not
 * replayable.** The obstacle is not the RNG — it is the input stream. On device the intent
 * is read per substep from `paddleTarget.value`, and the number of substeps per frame
 * depends on wall-clock frame timing through the accumulator and the `MAX_SUBSTEPS` cap.
 * Nothing records the per-tick intent sequence, and adding such a recorder is a feature
 * this phase does not have. No test here may be cited as evidence of replay, and no UI may
 * offer one on the strength of this file.
 *
 * Separately and **unconditionally**: the *board sequence* alone, independent of play, is
 * reproducible from the run seed. That is the part Phase 12's daily challenge inherits,
 * and it is the last case below.
 *
 * Determinism is also Node-verified, not Hermes-verified: `hashWorld` is FNV-1a over float
 * bit patterns and is same-process stable, not a cross-device bit lock
 * (`tests/physics.golden-replay.test.ts:1-9`). The on-device question is assumption A1 of
 * Phase 10 and is discharged by its device probe, not by this file.
 *
 * **No literal hash or digest is pinned anywhere here.** `tests/levelgen.determinism.test.ts`
 * pins one only because it guards a *frozen* 4 200-board corpus; an endless sequence is not
 * frozen, and a pinned value would become a tuning tripwire rather than a determinism one.
 * Every case below is A-equals-B self-consistency, or A-differs-from-B divergence.
 *
 * The run driver is a deliberate near-duplicate of the one in
 * `tests/endless.wave-loop.test.ts`: importing it would mean importing a *test* file, which
 * re-registers that file's suites here. Lifting it to `tests/helpers/` was rejected because
 * it is a fixture for two files, not a shipped instrument.
 */
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  dockBall,
  hashWorld,
  loadAndCompile,
  resetWorld,
  stepRun,
  FIXED_DT,
  SimPhase,
  type Intent,
  type LevelFileV1,
  type World,
} from '../src/core';
import { generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
import { compileGeneratedLevel } from '../src/runtime/loadLevel';
import { applyWaveAdvance } from '../src/runtime/worldRequests';
import { TICKS_PER_SECOND, lowestLiveBall } from './helpers/balanceBot';

/** Fifteen simulated minutes per board — the same stuck-wave trap the SC-1 suite uses. */
const MAX_TICKS_PER_BOARD = TICKS_PER_SECOND * 900;

/** The fixed input policy. "Fixed" is half of what SC-4 is scoped to. */
const PADDLE_OFFSET = 6;

/** The run seed research measured 12 boundary-identical waves at. */
const RUN_SEED = 777;

/** A neighbouring run seed — close enough that a broken mix would still collide. */
const OTHER_RUN_SEED = 778;

/** Twelve waves at two runs is the measured configuration (11-RESEARCH § Q7). */
const REFERENCE_WAVES = 12;

/** The board-sequence horizon plan 11-01 already pinned for seeds and boards. */
const BOARD_SEQUENCE_WAVES = 60;

const GAMEPLAY_SEED = 0xace;
const COSMETIC_SEED = 0xbeef;

/** One wave boundary's worth of evidence. */
type Boundary = {
  wave: number;
  /** `hashWorld` taken on the cleared board, before the swap — the SC-4 checkpoint. */
  hashAfterClear: number;
  hashAfterAdvance: number;
  rngGameplayBefore: number;
  rngGameplayAfter: number;
  rngCosmeticBefore: number;
  rngCosmeticAfter: number;
  score: number;
  lives: number;
};

type ReplayTrace = {
  world: World;
  boundaries: Boundary[];
  finalScore: number;
  finalLives: number;
};

/** A stable content id for a generated board. Not a security digest; a change detector. */
function boardDigest(raw: LevelFileV1): string {
  return createHash('sha256').update(JSON.stringify(raw)).digest('hex').slice(0, 16);
}

/**
 * Hash first, then field by field, so a failure names the diverging field instead of
 * reporting an opaque hash mismatch. Ported in shape from
 * `tests/physics.golden-replay.test.ts:61-73`, with both RNG streams added: a re-seeded
 * cosmetic stream would break the replay argument just as quietly as a gameplay one.
 */
function assertWorldIdentity(a: World, b: World): void {
  expect(hashWorld(a), 'the two runs must hash identically').toBe(hashWorld(b));
  expect(a.tick, 'tick diverged').toBe(b.tick);
  expect(a.simPhase, 'simPhase diverged').toBe(b.simPhase);
  expect(a.lives, 'lives diverged').toBe(b.lives);
  expect(a.score, 'score diverged').toBe(b.score);
  expect(a.combo, 'combo diverged').toBe(b.combo);
  expect(a.activeBallCount, 'activeBallCount diverged').toBe(b.activeBallCount);
  expect(a.ballX[0], 'ballX[0] diverged').toBe(b.ballX[0]);
  expect(a.ballY[0], 'ballY[0] diverged').toBe(b.ballY[0]);
  expect(a.ballVx[0], 'ballVx[0] diverged').toBe(b.ballVx[0]);
  expect(a.ballVy[0], 'ballVy[0] diverged').toBe(b.ballVy[0]);
  expect(a.paddleX, 'paddleX diverged').toBe(b.paddleX);
  expect(
    Array.from(a.brickHp.subarray(0, a.brickCount)),
    'the brick lattice diverged',
  ).toEqual(Array.from(b.brickHp.subarray(0, b.brickCount)));
  expect(a.rngGameplay[0], 'the gameplay RNG stream diverged').toBe(b.rngGameplay[0]);
  expect(a.rngCosmetic[0], 'the cosmetic RNG stream diverged').toBe(b.rngCosmetic[0]);
}

/**
 * Play `waveCount` generated boards on ONE `World` under a fixed input policy, recording
 * the SC-4 evidence at every boundary. See the header for why this is a duplicate rather
 * than an import.
 */
function replayEndlessRun(runSeed: number, waveCount: number): ReplayTrace {
  const first = loadAndCompile(generate(seedForWave(runSeed, 1), difficultyForWave(1)));
  if (!first.ok) {
    throw new Error(`wave 1 board did not compile: ${JSON.stringify(first.issues)}`);
  }

  const w = allocateWorld();
  resetWorld(w, GAMEPLAY_SEED, COSMETIC_SEED);
  applyCompiledLevel(w, first.compiled);
  dockBall(w);

  const boundaries: Boundary[] = [];

  for (let wave = 1; wave <= waveCount; wave++) {
    let ticks = 0;
    let intent: Intent = { paddleX: w.paddleX, launch: 1 };

    while (ticks < MAX_TICKS_PER_BOARD) {
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

    if (w.simPhase !== SimPhase.WON) break;

    const hashAfterClear = hashWorld(w);
    const rngGameplayBefore = w.rngGameplay[0];
    const rngCosmeticBefore = w.rngCosmetic[0];
    const score = w.score;
    const lives = w.lives;

    const next = compileGeneratedLevel(
      generate(seedForWave(runSeed, wave + 1), difficultyForWave(wave + 1)),
    );
    if (!next.ok) {
      throw new Error(
        `wave ${wave + 1} board did not compile: ${JSON.stringify(next.issues)}`,
      );
    }
    applyWaveAdvance(w, next.compiled);

    boundaries.push({
      wave,
      hashAfterClear,
      hashAfterAdvance: hashWorld(w),
      rngGameplayBefore,
      rngGameplayAfter: w.rngGameplay[0],
      rngCosmeticBefore,
      rngCosmeticAfter: w.rngCosmetic[0],
      score,
      lives,
    });
  }

  return { world: w, boundaries, finalScore: w.score, finalLives: w.lives };
}

describe('endless run determinism (SC-4 / N-END-03, 11-04)', () => {
  let runA: ReplayTrace;
  let runB: ReplayTrace;
  let runOther: ReplayTrace;

  beforeAll(() => {
    runA = replayEndlessRun(RUN_SEED, REFERENCE_WAVES);
    runB = replayEndlessRun(RUN_SEED, REFERENCE_WAVES);
    runOther = replayEndlessRun(OTHER_RUN_SEED, REFERENCE_WAVES);
  }, 600_000);

  it('replays to an identical world hash at every wave boundary (SC-4 / N-END-03)', () => {
    expect(
      runA.boundaries.length,
      'precondition: the reference run must reach every boundary it claims',
    ).toBe(REFERENCE_WAVES);
    expect(
      runB.boundaries.length,
      'the second run must reach the same number of boundaries',
    ).toBe(runA.boundaries.length);

    for (let i = 0; i < runA.boundaries.length; i++) {
      const a = runA.boundaries[i];
      const b = runB.boundaries[i];
      expect(a, `precondition: run A recorded boundary ${i + 1}`).toBeDefined();
      expect(b, `precondition: run B recorded boundary ${i + 1}`).toBeDefined();
      if (!a || !b) return;
      expect(
        b.hashAfterClear,
        `the cleared-board hash diverged at wave ${a.wave} — the run is not replayable`,
      ).toBe(a.hashAfterClear);
      expect(
        b.hashAfterAdvance,
        `the post-swap hash diverged at wave ${a.wave} — the board swap is not replayable`,
      ).toBe(a.hashAfterAdvance);
    }

    // Field-by-field, so a future divergence names itself rather than reporting a number.
    assertWorldIdentity(runA.world, runB.world);
  });

  it('replays to an identical final score, lives and wave count (SC-4)', () => {
    expect(runB.finalScore, 'the two runs must finish on the same score').toBe(
      runA.finalScore,
    );
    expect(runB.finalLives, 'the two runs must finish on the same lives').toBe(
      runA.finalLives,
    );
    expect(runB.boundaries.length, 'the two runs must finish on the same wave').toBe(
      runA.boundaries.length,
    );

    // Guard against a vacuous pass: two runs that both scored nothing would also match.
    expect(
      runA.finalScore,
      'precondition: the reference run must actually have scored',
    ).toBeGreaterThan(0);
  });

  it('produces a different hash sequence for a different run seed — the seed is load-bearing (SC-4)', () => {
    expect(
      runOther.boundaries.length,
      'precondition: the second seed must produce at least one boundary',
    ).toBeGreaterThan(0);

    const shared = Math.min(runA.boundaries.length, runOther.boundaries.length);
    let firstDivergentWave = -1;
    for (let i = 0; i < shared; i++) {
      if (runA.boundaries[i]?.hashAfterClear !== runOther.boundaries[i]?.hashAfterClear) {
        firstDivergentWave = i + 1;
        break;
      }
    }
    if (firstDivergentWave < 0 && runOther.boundaries.length !== runA.boundaries.length) {
      // A run that ends on a different wave has already diverged, by definition.
      firstDivergentWave = shared + 1;
    }

    expect(
      firstDivergentWave,
      'two run seeds produced the same hash at every boundary — the run seed is inert',
    ).toBeGreaterThan(0);
    expect(
      firstDivergentWave,
      'the seeds only differed in run LENGTH — that is a weaker claim than a hash divergence',
    ).toBeLessThanOrEqual(shared);
  });

  it('leaves both RNG streams untouched at every boundary — one run is one stream (SC-4)', () => {
    expect(
      runA.boundaries.length,
      'precondition: there are boundaries to check',
    ).toBe(REFERENCE_WAVES);

    for (const b of runA.boundaries) {
      expect(
        b.rngGameplayAfter,
        `the wave ${b.wave} boundary re-seeded the gameplay RNG — drops stop replaying`,
      ).toBe(b.rngGameplayBefore);
      expect(
        b.rngCosmeticAfter,
        `the wave ${b.wave} boundary re-seeded the cosmetic RNG — it is hashed, so replay breaks`,
      ).toBe(b.rngCosmeticBefore);
    }
  });

  it('reproduces the board sequence from the run seed alone, independent of play (SC-4)', () => {
    // The unconditional half of SC-4 — no world, no bot, no input policy. This is the
    // property Phase 12's daily challenge inherits.
    const first: string[] = [];
    const second: string[] = [];
    for (let wave = 1; wave <= BOARD_SEQUENCE_WAVES; wave++) {
      first.push(boardDigest(generate(seedForWave(RUN_SEED, wave), difficultyForWave(wave))));
    }
    for (let wave = 1; wave <= BOARD_SEQUENCE_WAVES; wave++) {
      second.push(
        boardDigest(generate(seedForWave(RUN_SEED, wave), difficultyForWave(wave))),
      );
    }

    for (let wave = 1; wave <= BOARD_SEQUENCE_WAVES; wave++) {
      expect(
        second[wave - 1],
        `the board at wave ${wave} is not reproducible from the run seed`,
      ).toBe(first[wave - 1]);
    }

    const seen = new Map<string, number>();
    for (let wave = 1; wave <= BOARD_SEQUENCE_WAVES; wave++) {
      const digest = first[wave - 1];
      expect(
        seen.has(digest ?? ''),
        `wave ${wave} repeats the board from wave ${seen.get(digest ?? '') ?? -1}`,
      ).toBe(false);
      seen.set(digest ?? '', wave);
    }
    expect(
      new Set(first).size,
      `${BOARD_SEQUENCE_WAVES} consecutive waves must yield that many distinct boards`,
    ).toBe(BOARD_SEQUENCE_WAVES);
  });
});
