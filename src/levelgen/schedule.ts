/**
 * The difficulty dial table (N-GEN-03 / D-04 / D-05 / D-06 / D-07 / D-08).
 *
 * An ordered table whose *ordering* is itself the contract, in the same sense as
 * `src/services/storage/catalog.ts`: `SCHEDULE[d]` is the exact per-difficulty content
 * budget every generated board realises, and the table is non-decreasing in authored
 * weight across `d = 0..D_MAX`. Its guard is `tests/levelgen.schedule.test.ts`.
 *
 * **These constants are tuning, not contract.** They were calibrated against authored
 * weight and bot clear time only — the E2 human playtest cohort was skipped — and Phase 11
 * is expected to re-tune them. No test in this phase may pin a literal dial value; tests
 * assert the derived *properties* (monotone `bricks`, monotone `totalHp`, capacity fits).
 *
 * ## Why exact counts instead of per-cell probabilities (D-04 / D-08)
 *
 * The seed chooses *which* cells receive content; this table chooses *how many*. That one
 * move makes authored weight seed-independent:
 *
 *   bricks(seed, d)  = 2 * hb(d)
 *   totalHp(seed, d) = 2 * (n1(d) + 2*n2(d) + 3*n3(d))
 *
 * so `tests/levelgen.sweep.test.ts` can assert an *equality* against this table rather than
 * a statistical inequality over samples.
 *
 * ## The monotonicity proof (this is the whole of D-08)
 *
 * `hb`, `n2` and `n3` are running maxima by construction (see the cumulative-max pass
 * below), so all three are non-decreasing in `d`. Substituting `n1 = hb - n2 - n3`:
 *
 *   totalHp = 2 * (n1 + 2*n2 + 3*n3)
 *           = 2 * ((hb - n2 - n3) + 2*n2 + 3*n3)
 *           = 2 * (hb + n2 + 2*n3)
 *
 * — a non-negative integer combination of three non-decreasing sequences, hence
 * non-decreasing. And `bricks = 2 * hb` is non-decreasing directly. Monotonicity is an
 * algebraic identity over the table, not an observation over a sample.
 *
 * ## The D-08 correction: the explosive dial is weight-NEUTRAL
 *
 * `nE` is carved out of the **hp1 budget**, not out of empty cells. The explosive type is
 * `{ hp: 1, explosive: true }` and the hp1 type is `{ hp: 1 }`, so an `E` and a `1` are
 * weight-identical: demoting one to the other changes neither `bricks` nor `totalHp`
 * (RESEARCH measured 0 of 63 000 boards changing weight under a full demotion pass). D-08
 * assumed thinning explosive *removed* weight; it does not, and `nE` therefore exerts no
 * pressure on monotonicity at all. The half of D-08 that is still correct: steel is
 * unbreakable and contributes zero authored weight, which is why a steel-budget shortfall
 * in stage 1 is harmless.
 *
 * ## No implementation-approximated Math
 *
 * Every curve is an integer per-mille lerp. `Math.pow`, `**`, and the trig/exp/log family
 * are implementation-approximated: a last-bit difference between Node and Hermes crossing a
 * `Math.floor` boundary changes a count, and a changed count changes the whole board. The
 * `src/levelgen/**` eslint block from plan 10-00 enforces this.
 */

import { GRID } from './grid';

/**
 * Difficulty is an integer `0..D_MAX` (locked discretion item). A literal table makes
 * monotonicity an inspectable integer property; a normalised float scale would reintroduce
 * exactly the `Math.floor` boundary sensitivity the integer-only rule exists to remove.
 * Phase 11 can lengthen the ladder by changing this one constant.
 */
export const D_MAX = 20;

/** The exact content budget for one difficulty. All counts are **per half board**. */
export type ScheduleEntry = {
  /** Top-anchored band height: content occupies rows `0..rowsUsed-1`. */
  readonly rowsUsed: number;
  /** Breakable cells per half board. */
  readonly hb: number;
  /** hp1 cells per half (the population `nE` is carved from). */
  readonly n1: number;
  /** hp2 cells per half. */
  readonly n2: number;
  /** hp3 cells per half. */
  readonly n3: number;
  /** Explosive cells per half — a subset of `n1`, weight-identical to it. */
  readonly nE: number;
  /** Steel pairs to attempt per half (D-06). A shortfall is harmless. */
  readonly steelPerHalf: number;
  /** Full-board breakable count: `2 * hb`. Non-decreasing in `d`. */
  readonly bricks: number;
  /** Full-board authored HP: `2 * (n1 + 2*n2 + 3*n3)`. Non-decreasing in `d`. */
  readonly totalHp: number;
};

/** Integer per-mille lerp from `a` at `d = 0` to `b` at `d = D_MAX`. */
function lerp(a: number, b: number, d: number): number {
  return a + Math.floor(((b - a) * d) / D_MAX);
}

/**
 * Wrap a dial in a cumulative maximum so it is non-decreasing **by construction**.
 *
 * Integer flooring in a rising curve can produce a one-step dip where two flooring
 * boundaries interact. Rather than hand-tune constants to avoid that, the envelope makes
 * monotonicity structural: a future tuner cannot break it by editing a number.
 */
export function envelope(fn: (d: number) => number): readonly number[] {
  const out: number[] = [];
  let m = -Infinity;
  for (let d = 0; d <= D_MAX; d++) {
    m = Math.max(m, fn(d));
    out.push(m);
  }
  return out;
}

/** Top-anchored band height, 8 -> 16 rows. */
const rowsUsedDial = envelope((d) => lerp(8, 16, d));

/** D-04 — fill density in per mille of the half-board band. The primary weight dial. */
const densityPerMille = envelope((d) => lerp(420, 800, d));

/** D-05 — hp3 share of the breakable budget. No hp3 at all at difficulty 0. */
const hp3PerMille = envelope((d) => lerp(0, 340, d));

/** D-05 — hp2 share of the breakable budget. */
const hp2PerMille = envelope((d) => lerp(180, 380, d));

/** D-06 — steel pairs attempted per half board. */
const steelPerHalfDial = envelope((d) => Math.floor((7 * d) / D_MAX));

/**
 * D-07 — explosive share of the hp1 population. **Falls** with difficulty and is
 * deliberately NOT envelope-wrapped: explosive is player-favourable, so it is a gift that
 * becomes rarer. Being weight-neutral (see header), a falling dial costs monotonicity
 * nothing.
 */
const explosivePerMille: readonly number[] = (() => {
  const out: number[] = [];
  for (let d = 0; d <= D_MAX; d++) out.push(lerp(260, 40, d));
  return out;
})();

/** Running maximum over a derived count, so the count itself is non-decreasing. */
function cumulativeMax(values: readonly number[]): readonly number[] {
  const out: number[] = [];
  let m = -Infinity;
  for (const v of values) {
    m = Math.max(m, v);
    out.push(m);
  }
  return out;
}

function buildSchedule(): readonly ScheduleEntry[] {
  const halfWidth = GRID.cols / 2;
  const rawHb: number[] = [];
  const rawN2: number[] = [];
  const rawN3: number[] = [];

  for (let d = 0; d <= D_MAX; d++) {
    const halfCells = rowsUsedDial[d]! * halfWidth;
    const hb = Math.floor((halfCells * densityPerMille[d]!) / 1000);
    rawHb.push(hb);
    rawN3.push(Math.floor((hb * hp3PerMille[d]!) / 1000));
    rawN2.push(Math.floor((hb * hp2PerMille[d]!) / 1000));
  }

  // The final cumulative-max pass: the *derived* counts, not just the dials, are running
  // maxima. This is what makes the identity in the header load-bearing.
  const hbSeries = cumulativeMax(rawHb);
  const n2Series = cumulativeMax(rawN2);
  const n3Series = cumulativeMax(rawN3);

  const entries: ScheduleEntry[] = [];
  for (let d = 0; d <= D_MAX; d++) {
    const hb = hbSeries[d]!;
    const n2 = n2Series[d]!;
    const n3 = n3Series[d]!;
    const n1 = hb - n2 - n3;
    const nE = Math.floor((n1 * explosivePerMille[d]!) / 1000);
    entries.push(
      Object.freeze({
        rowsUsed: rowsUsedDial[d]!,
        hb,
        n1,
        n2,
        n3,
        nE,
        steelPerHalf: steelPerHalfDial[d]!,
        bricks: 2 * hb,
        totalHp: 2 * (n1 + 2 * n2 + 3 * n3),
      }),
    );
  }
  return Object.freeze(entries);
}

/**
 * The dial table, indexed by difficulty `0..D_MAX`. Frozen: it is a template read by
 * `generate`, never a value handed to a caller.
 */
export const SCHEDULE: readonly ScheduleEntry[] = buildSchedule();
