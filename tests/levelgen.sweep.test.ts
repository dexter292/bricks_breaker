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
 *   - rng / seed-normalisation / grid bounds, repeat-call identity, the Pitfall 3
 *     aliasing detector, difficulty clamping and the two corpus digests —
 *     `tests/levelgen.determinism.test.ts`. Plan 10-02 parked the T-10-09 / T-10-11 cases
 *     here only because that file was owned by a later plan; 10-03 moved them home, with
 *     the NaN and string-seed cases they were missing.
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
 * **Corpus width.** Plan 10-02 ran these cases over a 25-seed tracer corpus (525 boards) to
 * keep the watch loop usable; plan 10-03 widened them to the full `SWEEP_SEEDS` x 21 =
 * 21 000 boards SC-2 actually demands. The assertions did not change — only the loop bound
 * in `corpus()` and the floor assertion that now pins it.
 */
import { describe, it, expect } from 'vitest';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SCORE_HIT,
  checkSolvability,
  loadAndCompile,
  validateLevel,
  type LevelFileV1,
} from '../src/core';
import { checkSolvability as checkTs } from '../src/core/levels/solvability';
import { checkSolvability as checkMjs } from '../scripts/lib/levelSolvability.mjs';
import { BRICK_TYPES, D_MAX, GRID, SCHEDULE, generate } from '../src/levelgen';
import { levelStaticsOf } from './helpers/balanceBot';

/**
 * Boards per difficulty in the contract sweep. 1 000 x 21 difficulties = 21 000 boards.
 *
 * RESEARCH Pitfall 7: the failure mode is someone dropping this to 20 for a watch loop and
 * never putting it back, quietly turning SC-2's "large sweep" into "a handful of samples".
 * The named constant is half the guard; the other half is the floor assertion in the first
 * case below, which fails loudly rather than letting the evidence silently shrink. At 0.04
 * ms/board there is no performance argument for shrinking it — a sweep that finishes in
 * under 100 ms is the warning sign.
 */
export const SWEEP_SEEDS = 1000;

/** The floor `SWEEP_SEEDS` may never fall below without this suite failing (SC-2). */
const SWEEP_SEEDS_FLOOR = 1000;

/**
 * The only characters a generated board may contain (N-GEN-03 / SC-5): the empty marker
 * plus the five shipped E1b verbs. The whole point of the phase is that it introduces no
 * new brick type, so this set is the assertion, not a summary of one.
 */
const SHIPPED_CHARS: ReadonlySet<string> = new Set(['.', '1', '2', '3', 'E', 'X']);

/**
 * Maximum 8-connected explosive cluster the generator may emit (SC-5). Asserted here
 * independently of the generator's own labelling; the arithmetic is in the test that uses
 * it and in `src/levelgen/generate.ts`'s stage 3.
 */
const EXPLOSIVE_CLUSTER_CAP = 4;

/** Headroom, not a target: the measured full-pipeline cost is roughly a second. */
const SWEEP_TIMEOUT_MS = 30_000;

type Board = { readonly s: number; readonly d: number; readonly level: LevelFileV1 };

let memo: readonly Board[] | null = null;

/**
 * Built lazily inside each `it`, never at module scope: a throw at module scope fails the
 * whole *file* and discovers zero tests, which is indistinguishable from a suite that was
 * never written (#3770 INVALID_RED). Built once and shared across every case in this file,
 * including the R-16 parity block, so the 21 000-board generation cost is paid a single
 * time and every property is asserted against the *same* object.
 */
function corpus(): readonly Board[] {
  if (memo !== null) return memo;
  const boards: Board[] = [];
  for (let s = 0; s < SWEEP_SEEDS; s++) {
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

/** Count of `ch` over the whole board. */
function countChar(level: LevelFileV1, ch: string): number {
  let n = 0;
  for (const row of level.cells) {
    for (let c = 0; c < row.length; c++) if (row[c] === ch) n++;
  }
  return n;
}

describe('generated board contract sweep (N-GEN-02 / N-GEN-03)', () => {
  it(
    'generates the full SWEEP_SEEDS x (D_MAX + 1) corpus and cannot silently shrink (10-03-01)',
    () => {
      // RESEARCH Pitfall 7. The constant alone is not a guard — a watch-loop edit that
      // drops it to 20 has to fail the suite, not merely make it fast.
      expect(
        SWEEP_SEEDS,
        'SC-2 demands a large sweep, not a handful of samples',
      ).toBeGreaterThanOrEqual(SWEEP_SEEDS_FLOOR);
      expect(corpus()).toHaveLength(SWEEP_SEEDS * (D_MAX + 1));
      console.log(`[sweep] boards exercised: ${corpus().length}`);
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'every board in the sweep passes validateLevel and loadAndCompile (10-02-01 / 10-02-02)',
    () => {
      for (const { s, d, level } of corpus()) {
        const v = validateLevel(level);
        expect(v.ok, `s=${s} d=${d}: ${v.ok ? '' : JSON.stringify(v.issues)}`).toBe(true);
        expect(loadAndCompile(level).ok, `s=${s} d=${d}`).toBe(true);
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'checkSolvability reports zero unreachable breakables over the sweep (10-02-01)',
    () => {
      for (const { s, d, level } of corpus()) {
        const result = checkSolvability(level);
        // The empty-array form names the offending cells when it fails; `ok` alone says
        // only that something, somewhere, is walled off.
        expect(result.unreachableBreakables, `s=${s} d=${d}`).toEqual([]);
        expect(result.ok, `s=${s} d=${d}`).toBe(true);
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'every board fits inside the 360x640 playfield (10-02-03)',
    () => {
      // The campaign's own bounds expression (tests/balance.curve-e2.test.ts), against the
      // core constants rather than local literals so a future playfield change propagates
      // here instead of being re-typed. level-04 and level-05 shipped 4 units wide because
      // the guard existed in exactly one place; both compute a right edge of 358 today, so
      // there is no live bug to chase — the obligation is to make the failure class
      // impossible going forward, per board rather than per authored file.
      for (const { s, d, level } of corpus()) {
        const g = level.grid;
        const right = g.originX + (g.cols - 1) * (g.brickW + g.gapX) + g.brickW;
        const bottom = g.originY + (g.rows - 1) * (g.brickH + g.gapY) + g.brickH;
        expect(g.originX, `s=${s} d=${d} left edge`).toBeGreaterThanOrEqual(0);
        expect(g.originY, `s=${s} d=${d} top edge`).toBeGreaterThanOrEqual(0);
        expect(right, `s=${s} d=${d} right edge`).toBeLessThanOrEqual(LOGICAL_WIDTH);
        expect(bottom, `s=${s} d=${d} bottom edge`).toBeLessThanOrEqual(LOGICAL_HEIGHT);
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'each board is left-right mirror symmetric (D-01)',
    () => {
      for (const { s, d, level } of corpus()) {
        expect(level.cells, `s=${s} d=${d}`).toHaveLength(GRID.rows);
        for (let r = 0; r < level.cells.length; r++) {
          const row = level.cells[r]!;
          expect(row.length, `s=${s} d=${d} r=${r}`).toBe(GRID.cols);
          expect(row.split('').reverse().join(''), `s=${s} d=${d} r=${r}`).toBe(row);
        }
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'authored weight equals the schedule exactly for every (seed, difficulty) (10-03-02)',
    () => {
      for (const { s, d, level } of corpus()) {
        const stats = levelStaticsOf(level, SCORE_HIT);
        const entry = SCHEDULE[d]!;
        expect(stats.bricks, `s=${s} d=${d}`).toBe(entry.bricks);
        expect(stats.totalHp, `s=${s} d=${d}`).toBe(entry.totalHp);
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'cell charset and brickTypes deep-equal the declared alphabet on every board (10-03-03)',
    () => {
      // N-GEN-03: the phase introduces no new brick type. Both halves matter — a board
      // could declare the five E1b keys and still emit a sixth character into `cells`
      // (validateLevel would catch that one), or emit only shipped characters while
      // quietly redefining what a `3` costs (validateLevel would not).
      for (const { s, d, level } of corpus()) {
        expect(level.brickTypes, `s=${s} d=${d} brickTypes`).toEqual(BRICK_TYPES);
        for (let r = 0; r < level.cells.length; r++) {
          const row = level.cells[r]!;
          for (let c = 0; c < row.length; c++) {
            expect(
              SHIPPED_CHARS.has(row[c]!),
              `s=${s} d=${d} r=${r} c=${c} char=${JSON.stringify(row[c])}`,
            ).toBe(true);
          }
        }
      }
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'steel never exceeds the scheduled budget, and a shortfall is tolerated (D-06 / D-08)',
    () => {
      // Never strict equality. Stage 1 walks a fixed candidate list once and drops any pair
      // that would break the reachability invariant, so exhausting the list before the
      // budget is met is a correct, weight-safe outcome: steel is unbreakable and carries
      // zero authored weight, so a shortfall cannot move `bricks` or `totalHp`. Asserting
      // equality would fail the suite on a harmless result.
      let shortfalls = 0;
      let shortfallCells = 0;
      for (const { s, d, level } of corpus()) {
        const budget = 2 * SCHEDULE[d]!.steelPerHalf;
        const steel = countChar(level, 'X');
        expect(steel, `s=${s} d=${d} steel budget`).toBeLessThanOrEqual(budget);
        expect(steel % 2, `s=${s} d=${d} steel must be placed in mirrored pairs`).toBe(0);
        if (steel < budget) {
          shortfalls++;
          shortfallCells += budget - steel;
        }
      }
      // Informational, not a gate: a silent drift in placement pressure (a tighter
      // adjacency rule, a denser band) shows up here as a rising number long before it
      // shows up as a failure anywhere.
      console.log(
        `[sweep] boards: ${corpus().length}; steel-budget shortfalls: ${shortfalls} board(s), ${shortfallCells} cell(s)`,
      );
    },
    SWEEP_TIMEOUT_MS,
  );

  it(
    'no 8-connected explosive cluster exceeds the cap (10-03-04)',
    () => {
      // SC-5: an explosive destroy emits round(DESTROY_SPARKS_AT_1 * 1.25) = 15 sparks, so a
      // chain of 4 emits 60, plus 12 for the triggering ball break is 72 against the Mid tier
      // particleCap of 128 — with room left for chip sparks on surviving neighbours. A chain
      // of 8 would emit 132 and blow the cap. 4 is also the campaign's own ceiling
      // (level-05's V-fuse). The unconstrained generator produced clusters of 6, so this is a
      // real constraint, not a formality.
      for (const { s, d, level } of corpus()) {
        expect(maxCluster(level, 'E'), `s=${s} d=${d}`).toBeLessThanOrEqual(EXPLOSIVE_CLUSTER_CAP);
      }
    },
    SWEEP_TIMEOUT_MS,
  );
});

/**
 * R-16 twin parity over the **generated** distribution (resolves 10-02-04).
 *
 * Why this lives in vitest rather than in a new `scripts/assert-generated-solvability.mjs`:
 * a `.mjs` script cannot import TypeScript (the `scripts/lib/*.mjs` header rule, and Node's
 * ESM resolver rejects this repo's extensionless relative imports under type-stripping), so
 * a standalone gate would need either a second `generate` written in ESM — a third
 * algorithm needing a third parity test, which RESEARCH's "Don't Hand-Roll" table warns
 * against — or a checked-in board corpus that goes stale the instant Phase 11 re-tunes
 * `SCHEDULE`, whose staleness would itself need a guard.
 * `tests/levels.solvability-parity.test.ts:10-25` already proves a `.ts` test can import the
 * twin directly, so both implementations can see the live `generate` output in-process with
 * no fixture. `npm test` runs `vitest run` first, so the gate stays in the full-suite chain
 * either way.
 *
 * What this adds over `tests/levels.solvability-parity.test.ts`: that file pins the two
 * implementations against the **six shipped assets**. This one extends the same evidence to
 * the generated distribution — 21 000 boards the authored corpus never reaches.
 *
 * `checkTs` is deep-imported from `src/core/levels/solvability` rather than aliased off the
 * `../src/core` barrel above on purpose: parity is a claim about two *implementations*, so
 * each side is named by its own module, exactly as the shipped-asset parity test does.
 */
describe('solvability parity over the generated corpus (R-16, resolves 10-02-04)', () => {
  it(
    'the scripts/lib .mjs twin agrees with the TS lib on the same SWEEP_SEEDS corpus (10-02-04)',
    () => {
      const boards = corpus();
      expect(boards).toHaveLength(SWEEP_SEEDS * (D_MAX + 1));
      for (const { s, d, level } of boards) {
        expect(checkMjs(level).ok, `s=${s} d=${d} mjs/ts ok parity`).toBe(checkTs(level).ok);
      }
    },
    SWEEP_TIMEOUT_MS,
  );
});
