/**
 * The one fixed lattice every generated board uses (D-02), and the fixed brick-type
 * template every generated board declares (E1b).
 *
 * D-02: a single proven grid; difficulty changes cell *content*, never the lattice.
 * These are level-03's already-shipped values — the only candidate already exercised
 * by the real broadphase, the renderer and the campaign bounds test. level-04 and
 * level-05 shipped 4 units too wide and no test caught it, because bounds were only
 * asserted for level-03; reusing the proven lattice removes that failure class from
 * the generator rather than re-proving it per difficulty.
 *
 * Fit against the 360x640 playfield (SC-3), recomputed by the campaign's own bounds
 * expression in tests/levelgen.determinism.test.ts:
 *   right  = originX + (cols - 1) * (brickW + gapX) + brickW = 2 + 9 * 36 + 32 = 358 <= 360
 *   bottom = originY + (rows - 1) * (brickH + gapY) + brickH = 48 + 15 * 16 + 14 = 302 <= 640
 *   cells  = cols * rows = 160 <= MAX_BRICKS 256
 *
 * `cols` is even (D-01): boards are left-right symmetric, so an even column count
 * makes every mirrored placement a clean pair and keeps brick and HP counts exact.
 * An odd centre column would be its own mirror and would have to be special-cased in
 * both the placement and the weight arithmetic.
 *
 * This module is a frozen template, not a return value. Pitfall 3: handing a caller
 * the module-level object by reference lets one mutation change every later board,
 * and determinism dies with no error — `generate` must spread a fresh object per
 * call. Freezing turns that mistake into a throw in strict mode.
 */

import type { BrickTypeDef } from '../core/levels/schema';

/** The single fixed lattice (D-02). Proven to fit 360x640; see header arithmetic. */
export const GRID = Object.freeze({
  cols: 10,
  rows: 16,
  originX: 2,
  originY: 48,
  brickW: 32,
  brickH: 14,
  gapX: 4,
  gapY: 2,
});

/**
 * The shipped verb set (E1b) — hp1/hp2/hp3, explosive `E`, steel `X`. No new brick
 * type. `E` is { hp: 1, explosive: true }, so demoting an `E` to a `1` is
 * weight-identical (the correction to D-08): explosive is a weight-neutral dial.
 *
 * All five keys are declared on every generated board even when a difficulty places
 * none of one — level-01 ships an unused `E` for the same reason. A constant key set
 * is what makes a golden JSON digest over the corpus meaningful; a key set that
 * varied with content would make every digest a function of two things at once.
 */
export const BRICK_TYPES: Readonly<Record<string, BrickTypeDef>> = Object.freeze({
  '1': Object.freeze({ hp: 1 }),
  '2': Object.freeze({ hp: 2 }),
  '3': Object.freeze({ hp: 3 }),
  E: Object.freeze({ hp: 1, explosive: true }),
  X: Object.freeze({ hp: 99, unbreakable: true }),
});
