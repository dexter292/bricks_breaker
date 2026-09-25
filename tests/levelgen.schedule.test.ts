/**
 * N-GEN-03 — the difficulty schedule is monotone and physically placeable.
 *
 * Difficulty turns four dials at once (D-04 density, D-05 HP mix, D-06 steel, D-07
 * explosive), and only two of them add authored weight. Steel is unbreakable, so it
 * contributes zero bricks and zero HP in `levelStatics` terms; explosive is weight-neutral
 * because `E` is `{ hp: 1, explosive: true }` and `1` is `{ hp: 1 }`, so demoting one to
 * the other cannot change the weight (CONTEXT's post-research correction to D-08 — research
 * confirmed it empirically, 0 of 63 000 boards changed weight under demotion). Density and
 * HP mix therefore own monotonicity outright, and it must be asserted **across the whole
 * `0..D_MAX` range**, not spot-checked at the ends.
 *
 * Analog: `tests/balance.curve-e2.test.ts`'s monotone-weight guard over
 * `PLAYABLE_LEVEL_ORDER` — the same non-decreasing `bricks` / `totalHp` pair, and the same
 * "must not have fewer bricks than" / "must not have less HP than" message wording, walked
 * over integer difficulty instead of the five shipped campaign slots.
 *
 * **No test in this phase may pin the literal dial constants.** The density, HP, explosive
 * and steel per-mille curves are calibrated against authored weight and bot clear time
 * only — the E2 human playtest cohort was skipped, so there is no human baseline behind
 * them — and Phase 11 is expected to re-tune them. Asserting a *derived* property
 * (monotone `bricks`, monotone `totalHp`, capacity fits) is the contract; asserting a
 * constant would pin a number nobody has justified and would fail the moment it is tuned.
 *
 * Deliberately NOT covered here: whether a *generated board* actually realises the
 * schedule — that is exact-weight equality in `tests/levelgen.sweep.test.ts` (10-03-02).
 * This file is about the table alone.
 */
import { describe, it, expect } from 'vitest';
import { D_MAX, GRID, SCHEDULE } from '../src/levelgen';

describe('difficulty schedule monotonicity (N-GEN-03, 10-03-01)', () => {
  it('covers exactly the difficulty range 0..D_MAX', () => {
    expect(SCHEDULE).toHaveLength(D_MAX + 1);
  });

  it('bricks is non-decreasing across the full 0..D_MAX range (10-03-01)', () => {
    for (let d = 1; d <= D_MAX; d++) {
      const prev = SCHEDULE[d - 1]!;
      const cur = SCHEDULE[d]!;
      expect(
        cur.bricks,
        `difficulty ${d} must not have fewer bricks than difficulty ${d - 1}`,
      ).toBeGreaterThanOrEqual(prev.bricks);
    }
  });

  it('totalHp is non-decreasing across the full 0..D_MAX range (10-03-01)', () => {
    for (let d = 1; d <= D_MAX; d++) {
      const prev = SCHEDULE[d - 1]!;
      const cur = SCHEDULE[d]!;
      expect(
        cur.totalHp,
        `difficulty ${d} must not have less HP than difficulty ${d - 1}`,
      ).toBeGreaterThanOrEqual(prev.totalHp);
    }
  });

  it('every difficulty fits the half board: brick half-count + steel budget <= rowsUsed * cols / 2 (10-03-01)', () => {
    for (let d = 0; d <= D_MAX; d++) {
      const entry = SCHEDULE[d]!;
      const halfCells = entry.rowsUsed * (GRID.cols / 2);
      // Stage 2 places exactly `hb` breakables into the cells stage 1 did not steel, so a
      // schedule that overcommits the band would silently under-fill the board and break
      // the exact-weight equality the sweep asserts.
      expect(halfCells, `difficulty ${d} half board must fit hb + steel`).toBeGreaterThanOrEqual(
        entry.hb + entry.steelPerHalf,
      );
      expect(entry.rowsUsed, `difficulty ${d} band must fit the grid`).toBeLessThanOrEqual(
        GRID.rows,
      );
    }
  });

  it('the explosive budget is carved from a non-negative hp1 population (n1 >= nE >= 0)', () => {
    for (let d = 0; d <= D_MAX; d++) {
      const entry = SCHEDULE[d]!;
      expect(entry.nE, `difficulty ${d} explosive count`).toBeGreaterThanOrEqual(0);
      expect(entry.n1, `difficulty ${d} hp1 population must cover the explosive carve-out`).toBeGreaterThanOrEqual(
        entry.nE,
      );
      // The identity that makes the header's monotonicity proof load-bearing.
      expect(entry.n1 + entry.n2 + entry.n3, `difficulty ${d} counts must sum to hb`).toBe(
        entry.hb,
      );
      expect(entry.bricks, `difficulty ${d} bricks`).toBe(2 * entry.hb);
      expect(entry.totalHp, `difficulty ${d} totalHp`).toBe(
        2 * (entry.n1 + 2 * entry.n2 + 3 * entry.n3),
      );
    }
  });
});
