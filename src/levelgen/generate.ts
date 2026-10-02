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
 * the full `rows * cols` mask, and the pair is accepted or reverted together.
 *
 * **Which "half-board check" is the catastrophic one — measured in plan 10-03, because the
 * earlier wording here conflated two different mutations.** Committing `a`, checking, and
 * only then committing the mirror `b` is the unsound ordering: over 105 000 boards with the
 * adjacency rule below removed it produces **291** boards carrying unreachable breakables
 * (up to 126 on one board, first at `s=0 d=13`), rising to **16 610** if the steel dial is
 * tripled. Running `allNonSteelReachable` over a *half-width* mask is a different thing and
 * is **not** unsound: the half's flood is a subset of the full board's flood (same bottom-row
 * seeds, every half-move is a legal full-board move) and the half's right edge is a wall
 * where the full board has an opening, so the half condition is at least as strong. It was
 * mutation-tested at 105 000 boards, with and without the adjacency rule and at a tripled
 * steel dial, and never failed. The code keeps the full-board form anyway — it is the one
 * whose soundness needs no symmetry argument — but do not expect a sweep to defend it.
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
 * **Load-bearing. Do not delete this as "polish".** It began as RESEARCH §Q3 cosmetics — on
 * this fixed lattice the predicate alone eliminates every corridor warning, measured over
 * 63 000 boards, making generated boards cleaner than the campaign — but plan 10-03
 * measured what it is actually doing, and it is more than that.
 *
 * It rejects the centre seam automatically: a pair at `cols/2 - 1` and `cols/2` is
 * orthogonally adjacent to itself. Columns 4 and 5 therefore carry steel on **0 of 105 000**
 * boards (with the rule removed: ~64 000 occurrences per column), which leaves a permanently
 * open two-wide vertical corridor from the top row down to the bottom row. With that corridor
 * present the two halves are reachability-independent, so every cell reaches the flood
 * through its own half and committing the mirror can never change the other half's answer.
 * That is *why* the ordering above is currently unfalsifiable: remove this predicate and the
 * pre-mirror ordering immediately produces 291 unreachable boards per 105 000.
 *
 * It is still **not** a substitute for the invariant — the invariant is what makes D-03 a
 * theorem — but anyone removing this rule must re-run the mirror-ordering mutation first.
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
 * Maximum 8-connected explosive cluster a generated board may carry (SC-5).
 *
 * The arithmetic that fixes the number: an explosive destroy emits
 * `round(DESTROY_SPARKS_AT_1 * 1.25) = round(12 * 1.25) = 15` sparks, so a chain of 4 emits
 * 60, plus 12 for the triggering ball break is **72** against the Mid tier `particleCap` of
 * **128** — leaving 56, i.e. room for 14 chip sparks on surviving damaged neighbours. A
 * chain of 8 would emit 132 and blow the cap outright. 4 is also the campaign's own
 * ceiling: `level-05`'s V-fuse is a 4-member 8-connected cluster, so the generator stays
 * inside what E1b already shipped and teaches. RESEARCH measured clusters of **6** on the
 * unconstrained generator, so this is a real constraint, not a formality.
 */
const EXPLOSIVE_CLUSTER_CAP = 4;

/** Row-major 8-neighbour offsets. Explosive cascade is 8-connected (N-BRK-01). */
const DIAGONALS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

/**
 * Stage 3 — demote explosives until no 8-connected cluster exceeds `EXPLOSIVE_CLUSTER_CAP`.
 *
 * Weight-free: the explosive type and the hp1 type are **both `hp: 1`**, so a demotion moves
 * the explosive count and nothing else. `levelStatics` counts an `E` as one brick with one
 * HP identically to a `1` (RESEARCH: 0 of 63 000 boards changed `bricks` or `totalHp` under
 * a full demotion pass), so the exact-weight equality against `SCHEDULE[d]` survives.
 *
 * Reachability also survives untouched: by Lemma 1 the flood depends on the steel mask
 * alone, and `E` and `1` are both breakable, hence both passable.
 *
 * Symmetry survives because each demotion demotes the cell **and its mirror** (D-01).
 *
 * Determinism and termination: clusters are labelled in a fixed row-major scan order and
 * the victim is the cluster's last member in that order, so no random draw enters; and each
 * pass strictly reduces the number of explosive cells, which is finite and non-negative.
 */
function capExplosiveClusters(cells: string[][], cols: number, rows: number): void {
  for (;;) {
    const oversized = findOversizedExplosiveCluster(cells, cols, rows);
    if (oversized === null) break;
    // Demote the last member in scan order, plus its mirror. `cols` is even (D-01), so no
    // cell is its own mirror and the pair is always two distinct cells.
    const i = oversized;
    const r = (i / cols) | 0;
    const c = i - r * cols;
    cells[r]![c] = HP1;
    cells[r]![cols - 1 - c] = HP1;
  }
}

/**
 * Index of the last-in-scan-order member of the first 8-connected explosive cluster that
 * exceeds the cap, or `null` if every cluster fits.
 */
function findOversizedExplosiveCluster(
  cells: string[][],
  cols: number,
  rows: number,
): number | null {
  const seen = new Uint8Array(rows * cols);
  for (let r0 = 0; r0 < rows; r0++) {
    for (let c0 = 0; c0 < cols; c0++) {
      const i0 = r0 * cols + c0;
      if (seen[i0] === 1 || cells[r0]![c0] !== EXPLOSIVE) continue;
      const members: number[] = [i0];
      seen[i0] = 1;
      for (let head = 0; head < members.length; head++) {
        const i = members[head]!;
        const r = (i / cols) | 0;
        const c = i - r * cols;
        for (const [dr, dc] of DIAGONALS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const ni = nr * cols + nc;
          if (seen[ni] === 1 || cells[nr]![nc] !== EXPLOSIVE) continue;
          seen[ni] = 1;
          members.push(ni);
        }
      }
      if (members.length > EXPLOSIVE_CLUSTER_CAP) {
        let last = members[0]!;
        for (const m of members) if (m > last) last = m;
        return last;
      }
    }
  }
  return null;
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

    // Set BOTH cells, then check the FULL board — the ordering whose soundness needs no
    // symmetry argument. See the header: at ship settings this is indistinguishable from
    // checking before committing `b`, and the thing making it so is `wouldTouchSteel`.
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

  // ---- Stage 3: explosive cluster cap (SC-5) ------------------------------------------
  capExplosiveClusters(cells, cols, rows);

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
