/**
 * The generator's own reachability invariant (D-03) — **not** the lint, and deliberately
 * stronger than it.
 *
 * The inverse of the cross-reference at `src/core/levels/solvability.ts:1-7`: that file is
 * the N-LVL-03 safety net that runs over *finished* levels in tests and CI. This file is
 * the predicate stage 1 of `generate` maintains while it places steel, so that the lint can
 * never have anything to report. `generate` must never call the lint (D-03) — that would
 * invert the dependency and turn a by-construction guarantee into generate-and-check.
 *
 * ## Invariant I
 *
 * Let `S` be the set of steel cells. Flood 4-connected from every non-steel cell of the
 * bottom row, spreading through non-steel cells. **I holds iff that flood reaches every
 * non-steel cell of the grid.**
 *
 * ## Why maintaining I makes the lint vacuous, for *any* content
 *
 * Lemma 1 (`solvability.ts:37-53`): `isPassable(ch)` is true for `'.'` and for every
 * breakable char, i.e. true iff `ch` is not steel — a char absent from `brickTypes` is
 * already rejected by `validateLevel`. So the set the lint floods is exactly the non-steel
 * set, seeded from the non-steel cells of the bottom row: the *same* flood as I. If I
 * holds, the flood covers every non-steel cell, hence every breakable cell, hence
 * `unreachableBreakables` is empty. The content assignment never enters the argument.
 *
 * That is why density, HP mix and explosive placement are provably solvability-neutral, and
 * why stage 2 and stage 3 of `generate` need no reachability reasoning at all.
 *
 * ## Three deliberate divergences from the lint — none of which may be relaxed
 *
 * 1. **The input is a steel bitmask, not a `LevelFileV1`.** Stage 1 runs before any level
 *    object exists; there is nothing to hand the lint even if we wanted to.
 * 2. **The success condition is *every non-steel cell* reachable**, which is strictly
 *    stronger than the lint's *every breakable* reachable. That extra strength is exactly
 *    what buys content-independence via Lemma 1: an empty cell that is unreachable today
 *    becomes an unreachable *brick* the moment stage 2 fills it. Weakening this to the
 *    lint's condition would destroy the proof, and it is the optimisation a future reader
 *    is most likely to attempt.
 * 3. **There is no corridor-width pass.** The lint's corridor squeeze is warn-only and
 *    depends on the lattice; the grid is fixed (D-02), so the span is constant and the
 *    generator's steel-adjacency rule handles it in stage 1 instead.
 *
 * The flood shape below is copied from `solvability.ts:151-191` on purpose — same
 * `Uint8Array` seen-set, same `number[]` queue with a `head` index and never `shift()`,
 * same `(i / cols) | 0` row decode, same 4-neighbour table, same bottom-row seeding — so
 * the two can be compared line by line and the only differences are the three above.
 */

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * Invariant I over a steel bitmask: `true` iff every non-steel cell is 4-reachable from the
 * non-steel cells of the bottom row.
 *
 * `steel` is row-major of length `rows * cols`; `1` means steel.
 */
export function allNonSteelReachable(steel: Uint8Array, cols: number, rows: number): boolean {
  let target = 0;
  for (let i = 0; i < steel.length; i++) {
    if (steel[i] === 0) target++;
  }

  const seen = new Uint8Array(rows * cols);
  const queue: number[] = [];

  // Seed: open space below the grid enters any non-steel cell on the bottom row.
  const bottom = rows - 1;
  if (bottom >= 0) {
    for (let c = 0; c < cols; c++) {
      const i = bottom * cols + c;
      if (steel[i] === 0) {
        seen[i] = 1;
        queue.push(i);
      }
    }
  }

  let head = 0;
  let found = queue.length;
  while (head < queue.length) {
    const i = queue[head++]!;
    const r = (i / cols) | 0;
    const c = i - r * cols;
    for (const [dr, dc] of NEIGHBORS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (seen[ni] === 1) continue;
      if (steel[ni] === 1) continue;
      seen[ni] = 1;
      queue.push(ni);
      found++;
    }
  }

  return found === target;
}
