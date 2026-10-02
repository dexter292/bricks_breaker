/**
 * N-END-01 / N-END-03 — the wave ramp steps, clamps and never repeats a board (SC-2 / SC-4).
 *
 * Two pure integer functions carry the whole endless policy: `difficultyForWave` decides
 * how hard wave N is, `seedForWave` decides which board it is. Everything downstream — the
 * host, the determinism suite, Phase 12's daily challenge — is built on the assumption that
 * both are total, integer and collision-free, so that assumption is asserted here rather
 * than sampled.
 *
 * Analog: `tests/levelgen.schedule.test.ts` — the same loop-the-whole-range shape and the
 * same `expect(value, 'why')` second-argument convention, walked over wave index instead of
 * difficulty index; and `tests/levelgen.determinism.test.ts:52`'s `new Set(...).size`
 * uniqueness idiom for the distinct-seed and distinct-board cases.
 *
 * **No assertion in this file pins a literal dial constant.** It asserts derived properties
 * — starts at 0, one step per wave, clamps at `D_MAX`, integer-only, distinct seeds,
 * distinct boards — for the same reason `levelgen.schedule.test.ts` does: the dials were
 * calibrated against bot clear time with no human cohort behind them, and a test that
 * pinned one would fail the moment it is legitimately re-tuned. `D_MAX` is read from the
 * generator barrel, never restated.
 *
 * Deliberately NOT covered here: whether a *generated board* actually realises its
 * difficulty. That is exact-weight equality in `tests/levelgen.sweep.test.ts`, a Phase 10
 * asset, and it stays there — this file is about the policy alone.
 */
import { describe, it, expect } from 'vitest';
import { D_MAX, generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';

/** The wave at which the walk first reaches the ceiling: wave 1 is difficulty 0. */
const CLAMP_WAVE = D_MAX + 1;

/** Far past any reachable wave — the clamp must hold without a bound anybody tuned. */
const FAR_WAVE = 10000;

/** One run's worth of waves for the uniqueness cases (VALIDATION's SC-4 row asks for >= 60). */
const UNIQUE_WAVES = 60;

describe('difficultyForWave (SC-2 / N-END-01, 11-01)', () => {
  it('walks 0 upward one step per wave until it reaches the ceiling (D-02)', () => {
    for (let wave = 1; wave <= CLAMP_WAVE; wave++) {
      expect(
        difficultyForWave(wave),
        `wave ${wave} must be exactly one difficulty step above wave ${wave - 1}`,
      ).toBe(wave - 1);
    }
  });

  it('clamps at D_MAX for every wave from the ceiling out to wave 10000 (D-01)', () => {
    for (let wave = CLAMP_WAVE; wave <= FAR_WAVE; wave++) {
      expect(
        difficultyForWave(wave),
        `wave ${wave} must stay clamped at the generator ceiling`,
      ).toBe(D_MAX);
    }
  });

  it('never leaves [0, D_MAX] and never returns a non-integer, including degenerate input', () => {
    const degenerate = [0, -1, -7, -10000, 1.5, 20.9, Number.NaN, Number.POSITIVE_INFINITY];
    for (const wave of degenerate) {
      const d = difficultyForWave(wave);
      expect(Number.isInteger(d), `wave ${wave} must yield an integer, got ${d}`).toBe(true);
      expect(d, `wave ${wave} lower bound`).toBeGreaterThanOrEqual(0);
      expect(d, `wave ${wave} upper bound`).toBeLessThanOrEqual(D_MAX);
    }
    for (let wave = 1; wave <= FAR_WAVE; wave++) {
      const d = difficultyForWave(wave);
      expect(Number.isInteger(d), `wave ${wave} must yield an integer, got ${d}`).toBe(true);
      expect(d, `wave ${wave} lower bound`).toBeGreaterThanOrEqual(0);
      expect(d, `wave ${wave} upper bound`).toBeLessThanOrEqual(D_MAX);
    }
  });
});

describe('seedForWave (SC-4 / N-END-03, 11-01)', () => {
  it('yields a distinct u32 seed for every one of 60 consecutive waves of one run', () => {
    const runSeed = 0xc0ffee;
    const seeds: number[] = [];
    for (let wave = 1; wave <= UNIQUE_WAVES; wave++) {
      const seed = seedForWave(runSeed, wave);
      expect(Number.isInteger(seed), `wave ${wave} seed must be an integer, got ${seed}`).toBe(
        true,
      );
      expect(seed, `wave ${wave} seed lower bound`).toBeGreaterThanOrEqual(0);
      expect(seed, `wave ${wave} seed must be a u32`).toBeLessThan(4294967296);
      seeds.push(seed);
    }
    expect(
      new Set(seeds).size,
      `${UNIQUE_WAVES} consecutive waves must not reuse a seed`,
    ).toBe(UNIQUE_WAVES);
  });

  it('yields a distinct board for every one of 60 consecutive waves of one run', () => {
    const runSeed = 0xc0ffee;
    const digests = new Set<string>();
    for (let wave = 1; wave <= UNIQUE_WAVES; wave++) {
      const board = generate(seedForWave(runSeed, wave), difficultyForWave(wave));
      const before = digests.size;
      digests.add(JSON.stringify(board));
      expect(
        digests.size,
        `wave ${wave} produced a board already seen at an earlier wave`,
      ).toBe(before + 1);
    }
    expect(digests.size, `${UNIQUE_WAVES} waves must produce ${UNIQUE_WAVES} boards`).toBe(
      UNIQUE_WAVES,
    );
  });

  it('separates two runs at wave 1, so every run is not the same sequence', () => {
    const a = seedForWave(0xace, 1);
    const b = seedForWave(0xbeef, 1);
    expect(b, 'two different run seeds must not open on the same board').not.toBe(a);
    expect(
      seedForWave('2026-09-25', 1),
      'a string run seed must also separate from a numeric one',
    ).not.toBe(a);
  });

  it('normalises a non-finite run seed instead of propagating NaN', () => {
    for (const runSeed of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const seed = seedForWave(runSeed, 3);
      expect(Number.isInteger(seed), `run seed ${runSeed} must yield an integer seed`).toBe(
        true,
      );
      expect(seed, `run seed ${runSeed} lower bound`).toBeGreaterThanOrEqual(0);
      expect(seed, `run seed ${runSeed} must be a u32`).toBeLessThan(4294967296);
    }
  });
});
