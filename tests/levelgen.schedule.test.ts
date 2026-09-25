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
 * `PLAYABLE_LEVEL_ORDER` — the same non-decreasing `bricks` / `totalHp` pair, walked over
 * integer difficulty instead of the five shipped campaign slots.
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
 *
 * Nothing here may import `generate`, `SCHEDULE` or `D_MAX` yet — they land in plan 10-02,
 * and an unresolved import fails the whole file rather than skipping a todo.
 */
import { describe, it } from 'vitest';

describe('difficulty schedule monotonicity (N-GEN-03, 10-03-01)', () => {
  it.todo(
    'bricks is non-decreasing across the full 0..D_MAX range (10-03-01)',
  );

  it.todo(
    'totalHp is non-decreasing across the full 0..D_MAX range (10-03-01)',
  );

  it.todo(
    'every difficulty fits the half board: brick half-count + steel budget <= rowsUsed * cols / 2 (10-03-01)',
  );
});
