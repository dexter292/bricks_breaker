/**
 * N-GEN-02 / N-GEN-03 / SC-3 / SC-5 — the generated-board contract sweep.
 *
 * Every property a generated board must hold is asserted here over a wide seed corpus,
 * never on a single hand-picked board. The generator is meant to be *structurally*
 * incapable of failing the solvability lint (D-03), so this file is the safety net that
 * proves the structure, not a filter the generator retries against.
 *
 * Analog: `tests/balance.curve-e2.test.ts` — its bounds guard is the shape the per-board
 * playfield check takes here, lifted from five authored levels to the whole corpus.
 * RESEARCH measured the cost directly: 8 400 boards through validate + compile +
 * checkSolvability in 352 ms, and 0.033 ms/board through the `.mjs` path, so the full
 * 21 000-board corpus is affordable inside `npm test`.
 *
 * Deliberately NOT covered here:
 *   - rng / seed-normalisation / grid bounds — `tests/levelgen.determinism.test.ts`
 *   - whether a board is actually *winnable* — `tests/levelgen.winnability.test.ts`
 *     (lint-clean is necessary, not sufficient)
 *   - schedule monotonicity in isolation — `tests/levelgen.schedule.test.ts`
 *   - the literal dial constants. They are calibrated against authored weight and bot
 *     clear time only; the E2 human playtest cohort was skipped, so there is no baseline
 *     to pin, and Phase 11 is expected to re-tune them.
 *
 * Task ids: the todo names carry the ids from `10-01-PLAN.md` task 2. `10-VALIDATION.md`
 * re-homed the same contracts onto `10-{plan}-{task}`, where the full-corpus sweep gate is
 * **10-03-01**; and the original 10-02-04 (a standalone `.mjs` CI twin) resolves to the
 * R-16 describe block below rather than a script, because a `.mjs` file cannot import
 * TypeScript and a second ESM `generate` would be a third algorithm needing a third parity
 * test. `npm test` runs `vitest run` first, so the gate stays in the full-suite chain.
 *
 * **Corpus width (plan 10-02 vs 10-03).** The live cases below run over `TRACER_SEEDS`
 * (25 seeds x 21 difficulties = 525 boards) — the tracer's end-to-end proof, cheap enough
 * to keep the watch loop usable. Plan 10-03 widens them to `SWEEP_SEEDS` and adds the floor
 * assertion against it; the assertions themselves do not change, only `corpus(n)`'s
 * argument.
 */
import { describe, it, expect } from 'vitest';
import {
  SCORE_HIT,
  checkSolvability,
  loadAndCompile,
  validateLevel,
  type LevelFileV1,
} from '../src/core';
import { D_MAX, GRID, SCHEDULE, generate } from '../src/levelgen';
import { levelStaticsOf } from './helpers/balanceBot';

/**
 * Boards per difficulty in the contract sweep. 1 000 x 21 difficulties = 21 000 boards.
 *
 * RESEARCH Pitfall 7: the failure mode is someone dropping this to 20 for a watch loop and
 * never putting it back, quietly turning SC-2's "large sweep" into "a handful of samples".
 * The named constant is half the guard; plan 10-03 adds the floor assertion against it
 * (`expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000)`). At 0.04 ms/board there is no
 * performance argument for shrinking it — a sweep that finishes in under 100 ms is the
 * warning sign.
 */
export const SWEEP_SEEDS = 1000;

/** Seeds in the plan-10-02 tracer corpus. 25 x 21 = 525 boards. */
export const TRACER_SEEDS = 25;

/**
 * Maximum 8-connected explosive cluster the generator may emit (SC-5). Asserted here
 * independently of the generator's own labelling; the arithmetic is in the test that uses
 * it and in `src/levelgen/generate.ts`'s stage 3.
 */
const EXPLOSIVE_CLUSTER_CAP = 4;

type Board = { readonly s: number; readonly d: number; readonly level: LevelFileV1 };

let memo: readonly Board[] | null = null;

/**
 * Built lazily inside each `it`, never at module scope: a throw at module scope fails the
 * whole *file* and discovers zero tests, which is indistinguishable from a suite that was
 * never written (#3770 INVALID_RED). Built once and shared across cases so the 525-board
 * generation cost is paid a single time.
 */
function corpus(): readonly Board[] {
  if (memo !== null) return memo;
  const boards: Board[] = [];
  for (let s = 0; s < TRACER_SEEDS; s++) {
    for (let d = 0; d <= D_MAX; d++) {
      boards.push({ s, d, level: generate(s, d) });
    }
  }
  memo = boards;
  return boards;
}

/**
 * Largest 8-connected cluster of `ch` on the board.
 *
 * Deliberately an independent implementation of the labelling `generate` does internally
 * (that one is not exported). A test that reused the generator's own labelling would prove
 * only that the generator agrees with itself — the point of this helper is that two
 * separately written labellings agree on the same boards.
 */
function maxCluster(level: LevelFileV1, ch: string): number {
  const { cols, rows } = level.grid;
  const seen = new Uint8Array(rows * cols);
  let best = 0;
  for (let r0 = 0; r0 < rows; r0++) {
    for (let c0 = 0; c0 < cols; c0++) {
      const i0 = r0 * cols + c0;
      if (seen[i0] === 1 || level.cells[r0]![c0] !== ch) continue;
      const stack = [i0];
      seen[i0] = 1;
      let size = 0;
      while (stack.length > 0) {
        const i = stack.pop()!;
        size++;
        const r = (i / cols) | 0;
        const c = i - r * cols;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
            const ni = nr * cols + nc;
            if (seen[ni] === 1 || level.cells[nr]![nc] !== ch) continue;
            seen[ni] = 1;
            stack.push(ni);
          }
        }
      }
      if (size > best) best = size;
    }
  }
  return best;
}

describe('generated board contract sweep (N-GEN-02 / N-GEN-03)', () => {
  it('generates the full tracer corpus of TRACER_SEEDS x (D_MAX + 1) boards', () => {
    expect(corpus()).toHaveLength(TRACER_SEEDS * (D_MAX + 1));
    expect(corpus().length).toBeGreaterThanOrEqual(525);
  });

  it('every board in the sweep passes validateLevel and loadAndCompile (10-02-01 / 10-02-02)', () => {
    for (const { s, d, level } of corpus()) {
      const v = validateLevel(level);
      expect(v.ok, `s=${s} d=${d}: ${v.ok ? '' : JSON.stringify(v.issues)}`).toBe(true);
      expect(loadAndCompile(level).ok, `s=${s} d=${d}`).toBe(true);
    }
  });

  it('checkSolvability reports zero unreachable breakables over the sweep (10-02-01)', () => {
    for (const { s, d, level } of corpus()) {
      const result = checkSolvability(level);
      expect(result.unreachableBreakables, `s=${s} d=${d}`).toEqual([]);
      expect(result.ok, `s=${s} d=${d}`).toBe(true);
    }
  });

  it.todo('every board fits inside the 360x640 playfield (10-02-03)');

  it('each board is left-right mirror symmetric (D-01)', () => {
    for (const { s, d, level } of corpus()) {
      expect(level.cells, `s=${s} d=${d}`).toHaveLength(GRID.rows);
      for (let r = 0; r < level.cells.length; r++) {
        const row = level.cells[r]!;
        expect(row.length, `s=${s} d=${d} r=${r}`).toBe(GRID.cols);
        expect(row.split('').reverse().join(''), `s=${s} d=${d} r=${r}`).toBe(row);
      }
    }
  });

  it('authored weight equals the schedule exactly for every (seed, difficulty) (10-03-02)', () => {
    for (const { s, d, level } of corpus()) {
      const stats = levelStaticsOf(level, SCORE_HIT);
      const entry = SCHEDULE[d]!;
      expect(stats.bricks, `s=${s} d=${d}`).toBe(entry.bricks);
      expect(stats.totalHp, `s=${s} d=${d}`).toBe(entry.totalHp);
    }
  });

  it.todo('cell charset and brickTypes deep-equal the declared alphabet on every board (10-03-03)');

  it('no 8-connected explosive cluster exceeds the cap (10-03-04)', () => {
    // SC-5: an explosive destroy emits round(DESTROY_SPARKS_AT_1 * 1.25) = 15 sparks, so a
    // chain of 4 emits 60, plus 12 for the triggering ball break is 72 against the Mid tier
    // particleCap of 128 — with room left for chip sparks on surviving neighbours. A chain
    // of 8 would emit 132 and blow the cap. 4 is also the campaign's own ceiling
    // (level-05's V-fuse). The unconstrained generator produced clusters of 6, so this is a
    // real constraint, not a formality.
    for (const { s, d, level } of corpus()) {
      expect(maxCluster(level, 'E'), `s=${s} d=${d}`).toBeLessThanOrEqual(EXPLOSIVE_CLUSTER_CAP);
    }
  });
});

describe('tracer determinism and input hardening (T-10-09 / T-10-11)', () => {
  it('returns JSON-identical output for repeated calls and never aliases its own output', () => {
    const a = generate(7, 3);
    const b = generate(7, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));

    // T-10-11: a caller mutating the returned grid/brickTypes must not reach board N+1.
    a.grid.cols = 999;
    a.brickTypes['1'] = { hp: 42 };
    const c = generate(7, 3);
    expect(JSON.stringify(c)).toBe(JSON.stringify(b));
    expect(b.grid.cols).toBe(GRID.cols);
  });

  it('clamps difficulty to [0, D_MAX] rather than trusting the caller (T-10-09)', () => {
    expect(JSON.stringify(generate(1, -5))).toBe(JSON.stringify(generate(1, 0)));
    expect(JSON.stringify(generate(1, 999))).toBe(JSON.stringify(generate(1, D_MAX)));
  });
});

describe('solvability parity over the generated corpus (R-16, resolves 10-02-04)', () => {
  it.todo(
    'the scripts/lib .mjs twin agrees with the TS lib on the same SWEEP_SEEDS corpus (10-02-04)',
  );
});
