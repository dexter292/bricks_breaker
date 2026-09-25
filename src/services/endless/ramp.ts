/**
 * The endless wave policy (N-END-01 / N-END-03 / D-01 / D-02).
 *
 * Two pure integer functions answer the only two questions a wave asks: how hard is this
 * board, and which board is it. Their guard is `tests/endless.ramp.test.ts`.
 *
 * ## What is contract and what is borrowed
 *
 * The wave -> difficulty map **is** contract: SC-2 requires the ramp be written down, and
 * `docs/ops/ENDLESS-MODE.md` carries the same table in prose. Wave 1 is difficulty 0, each
 * wave steps one (D-02), and the walk clamps at the ceiling (D-01).
 *
 * `D_MAX` itself is **not** ours. It belongs to the frozen `src/levelgen` tree and is read
 * through its barrel, never restated here. Restating it would let the ramp clamp at a
 * number the generator no longer honours — the clamp and the table it indexes must move
 * together or not at all.
 *
 * ## Why the clamp lives in this body
 *
 * `generate` clamps its own difficulty argument (`src/levelgen/generate.ts:227`). That is a
 * backstop against a hostile caller, not this module's correctness argument: a policy that
 * emitted difficulty 400 and relied on somebody else to notice would be wrong even while
 * producing right answers. `difficultyForWave` clamps in its own body and the property
 * suite proves it out to wave 10 000.
 *
 * ## Why the seed mixes the wave, not the difficulty
 *
 * Difficulty saturates at `D_MAX` from wave 21 on (D-01). Mixing difficulty into the seed
 * would therefore hand every post-clamp wave the *same* board, forever — a clamp on the
 * ramp turning silently into a clamp on the content. Mixing the wave index keeps the board
 * moving while the difficulty stands still, which is exactly what D-01 chose.
 *
 * `mixSeed`'s second factor is odd, so it is injective mod 2^32 in its argument: two
 * distinct waves of one run cannot collide onto one seed. That is the no-repeat argument
 * behind SC-4, not a sampling observation.
 *
 * ## No implementation-approximated Math
 *
 * Same rule as `src/levelgen/schedule.ts:50-55`, for the same reason and with the same
 * teeth. Integer coercion and comparison clamps only: no exponentiation, no trig/exp/log,
 * no float remainder. A last-bit difference between Node and Hermes crossing a rounding
 * boundary would change a difficulty, and a changed difficulty changes the whole board —
 * which would make SC-4's "same run seed replays the same wave sequence" false on device
 * while staying true in the test suite.
 *
 * SECURITY: the run seed is a difficulty input, not a secret, and `mixSeed`/`hashSeed` are
 * not a CSPRNG (`src/levelgen/rng.ts:15-18`). Nothing here may be used to protect anything.
 */

import { D_MAX, hashSeed, mixSeed } from '../../levelgen';

/**
 * The difficulty for a 1-based wave index: wave 1 is 0, one step per wave (D-02), clamped
 * into `[0, D_MAX]` (D-01). Degenerate input (0, negative, fractional, non-finite) folds to
 * the nearest end of the range rather than escaping it.
 */
export function difficultyForWave(wave: number): number {
  const step = (wave | 0) - 1;
  if (step < 0) {
    return 0;
  }
  if (step > D_MAX) {
    return D_MAX;
  }
  return step;
}

/**
 * The board seed for one wave of one run: an unsigned 32-bit integer, pure in
 * `(runSeed, wave)`. `hashSeed` already normalises `number | string` and folds a non-finite
 * number to 0, so hostile input cannot reach the PRNG state through here.
 */
export function seedForWave(runSeed: number | string, wave: number): number {
  return mixSeed(hashSeed(runSeed), wave | 0);
}
