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
 * Nothing here may import `generate`, `SCHEDULE` or `D_MAX` yet — they land in plan 10-02,
 * and an unresolved import fails the whole file rather than skipping a todo.
 */
import { describe, it } from 'vitest';

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

describe('generated board contract sweep (N-GEN-02 / N-GEN-03)', () => {
  it.todo(
    'every board in the sweep passes validateLevel and loadAndCompile (10-02-01 / 10-02-02)',
  );

  it.todo(
    'checkSolvability reports zero unreachable breakables over the sweep (10-02-01)',
  );

  it.todo(
    'every board fits inside the 360x640 playfield (10-02-03)',
  );

  it.todo(
    'each board is left-right mirror symmetric (D-01)',
  );

  it.todo(
    'authored weight equals the schedule exactly for every (seed, difficulty) (10-03-02)',
  );

  it.todo(
    'cell charset and brickTypes deep-equal the declared alphabet on every board (10-03-03)',
  );

  it.todo(
    'no 8-connected explosive cluster exceeds the cap (10-03-04)',
  );
});

describe('solvability parity over the generated corpus (R-16, resolves 10-02-04)', () => {
  it.todo(
    'the scripts/lib .mjs twin agrees with the TS lib on the same SWEEP_SEEDS corpus (10-02-04)',
  );
});
