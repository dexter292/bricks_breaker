/**
 * The seeded board generator (N-GEN-01 / D-01 / D-02 / D-03).
 *
 * JS cold path: this runs **once per board**, never on the simulation or render hot path,
 * so it carries no `'worklet'` directive and must never acquire one (CONTEXT constraint 3 /
 * LC-17). Its only inputs are `seed` and `difficulty`; there is no ambient input of any
 * kind, which the `src/levelgen/**` eslint block enforces.
 *
 * ## Three stages
 *
 * 1. **Steel** (D-06, D-03) — mirrored pairs accepted one at a time, each accepted only if
 *    invariant I still holds over the **full** board. See `./reachability`.
 * 2. **Content** (D-04, D-05, D-07) — exact counts read from `SCHEDULE[d]`; the seed only
 *    chooses *which* cells receive them, which is what makes authored weight
 *    seed-independent.
 * 3. **Explosive cluster cap** (SC-5) — a weight-free post-pass, added in task 2.
 *
 * ## `generate` never calls `validateLevel` or `checkSolvability`
 *
 * D-03 is a by-construction claim, and calling the lint from inside the generator would
 * invert it into generate-and-check: the safety property would then depend on a filter
 * rather than on the placement rule, and a filter has to be proven to terminate. The lint
 * sits on the test branch (`tests/levelgen.sweep.test.ts`) as a net over a large sweep,
 * exactly as D-03 requires.
 *
 * ## Why stage 1 is not the generate-and-repair D-03 rejects
 *
 * It is a **single pass over a fixed, finite candidate list** of at most `rows * cols/2`
 * entries. There is no retry, no backtracking, no re-seeding, and no accepted cell is ever
 * un-steeled. A rejected candidate is simply dropped. Correctness is one line of induction:
 * I holds before the first iteration (an empty steel set makes every cell reachable); every
 * accepted step tests I itself; rejected steps leave the mask unchanged.
 *
 * ## The mirror is the dangerous step, not the placement
 *
 * RESEARCH falsified two plausible local steel rules against the real lint, and produced a
 * half-board with **0** unreachable breakables that yielded **20** once mirrored. Both
 * cells of a pair are therefore set *before* the invariant is checked, the check runs over
 * the full `rows * cols` mask, and the pair is accepted or reverted together. Checking the
 * half-board is the documented catastrophic failure.
 *
 * ## No aliasing on output (RESEARCH Pitfall 3)
 *
 * Every call returns a fresh `grid` object, a freshly built `brickTypes`, and freshly built
 * `cells` strings. Handing out the frozen module constants by reference would let one
 * caller's mutation change board N+1 for the same arguments — N-GEN-01 would die silently,
 * with no error anywhere.
 */

import { SCHEMA_VERSION, type BrickTypeDef, type LevelFileV1 } from '../core/levels/schema';
import { GRID } from './grid';
import { allNonSteelReachable } from './reachability';
import { hashSeed, makeRng, mixSeed, shuffleInPlace } from './rng';
import { D_MAX, SCHEDULE } from './schedule';

const EMPTY = '.';
const HP1 = '1';
const HP2 = '2';
const HP3 = '3';
const EXPLOSIVE = 'E';
const STEEL = 'X';

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * True if setting cell `i` steel would put two steel cells orthogonally adjacent, counting
 * `other` (the not-yet-committed mirror of `i`) as steel.
 *
 * Polish from RESEARCH §Q3, **not** a substitute for the invariant: on this fixed lattice
 * this predicate alone eliminates every corridor warning, measured over 63 000 boards,
 * making generated boards cleaner than the campaign. It also rejects the centre seam
 * automatically — a pair at `cols/2 - 1` and `cols/2` is orthogonally adjacent to itself,
 * which is the single riskiest steel placement on an even-width board.
 */
function wouldTouchSteel(
  steel: Uint8Array,
  cols: number,
  rows: number,
  i: number,
  other: number,
): boolean {
  const r = (i / cols) | 0;
  const c = i - r * cols;
  for (const [dr, dc] of ORTHOGONAL) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const ni = nr * cols + nc;
    if (ni === other || steel[ni] === 1) return true;
  }
  return false;
}

/**
 * Produce the board for `(seed, difficulty)`. Pure: the same arguments always produce a
 * JSON-identical `LevelFileV1`, in this process and any other.
 */
export function generate(seed: number | string, difficulty: number): LevelFileV1 {
  // Clamp first — never trust the caller. Phase 11 feeds a wave counter that runs past
  // D_MAX and Phase 12 feeds a date-derived value; an unclamped index would read past the
  // table (T-10-09).
  const d = Math.max(0, Math.min(D_MAX, difficulty | 0));
  const u32 = hashSeed(seed);
  const rng = makeRng(mixSeed(u32, d));

  const entry = SCHEDULE[d]!;
  const cols = GRID.cols;
  const rows = GRID.rows;
  const half = cols / 2;
  const rowsUsed = entry.rowsUsed;

  // ---- Stage 1: steel (D-06, D-03) ----------------------------------------------------
  const steel = new Uint8Array(rows * cols);

  // Candidates encode a half-board cell as `r * half + c`.
  const candidates: number[] = [];
  for (let r = 0; r < rowsUsed; r++) {
    for (let c = 0; c < half; c++) candidates.push(r * half + c);
  }
  shuffleInPlace(candidates, rng);

  let placed = 0;
  for (let k = 0; k < candidates.length && placed < entry.steelPerHalf; k++) {
    const code = candidates[k]!;
    const r = (code / half) | 0;
    const c = code - r * half;
    const a = r * cols + c;
    const b = r * cols + (cols - 1 - c);

    if (steel[a] === 1 || steel[b] === 1) continue;
    if (wouldTouchSteel(steel, cols, rows, a, b)) continue;
    if (wouldTouchSteel(steel, cols, rows, b, a)) continue;

    // Set BOTH cells, then check the FULL board. Never the half.
    steel[a] = 1;
    steel[b] = 1;
    if (allNonSteelReachable(steel, cols, rows)) {
      placed++;
    } else {
      steel[a] = 0;
      steel[b] = 0;
    }
  }
  // A budget shortfall is acceptable and silent: steel is unbreakable, so it carries zero
  // authored weight and the schedule is untouched (the half of D-08 that is correct).

  // ---- Stage 2: content (D-04, D-05, D-07) --------------------------------------------
  const cells: string[][] = [];
  for (let r = 0; r < rows; r++) cells.push(new Array<string>(cols).fill(EMPTY));
  for (let i = 0; i < steel.length; i++) {
    if (steel[i] === 1) {
      const r = (i / cols) | 0;
      cells[r]![i - r * cols] = STEEL;
    }
  }

  const open: number[] = [];
  for (let r = 0; r < rowsUsed; r++) {
    for (let c = 0; c < half; c++) {
      if (steel[r * cols + c] === 0) open.push(r * half + c);
    }
  }
  shuffleInPlace(open, rng);

  // The counts come from the table and the seed only chooses which cells receive them, so
  // `bricks` and `totalHp` are seed-independent — which is what lets the sweep assert an
  // equality against SCHEDULE[d] rather than an inequality over samples. Never roll a
  // per-cell occupancy probability.
  const take = Math.min(entry.hb, open.length);
  const hp3End = entry.n3;
  const hp2End = hp3End + entry.n2;
  const explosiveEnd = hp2End + entry.nE;
  for (let k = 0; k < take; k++) {
    const code = open[k]!;
    const r = (code / half) | 0;
    const c = code - r * half;
    const ch = k < hp3End ? HP3 : k < hp2End ? HP2 : k < explosiveEnd ? EXPLOSIVE : HP1;
    cells[r]![c] = ch;
    cells[r]![cols - 1 - c] = ch;
  }

  // ---- Emit (fresh objects every call — RESEARCH Pitfall 3) ---------------------------
  const brickTypes: Record<string, BrickTypeDef> = {
    // All five E1b keys are declared on every board even when a difficulty places none of
    // one, so the emitted JSON has a constant key set and a golden digest over the corpus
    // measures content rather than content-and-shape. `validateLevel` permits unused keys.
    '1': { hp: 1 },
    '2': { hp: 2 },
    '3': { hp: 3 },
    E: { hp: 1, explosive: true },
    X: { hp: 99, unbreakable: true },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    id: `gen-${u32.toString(16)}-${d}`,
    name: `Generated ${d}`,
    grid: { ...GRID },
    brickTypes,
    cells: cells.map((row) => row.join('')),
  };
}
