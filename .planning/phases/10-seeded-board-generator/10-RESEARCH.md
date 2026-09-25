# Phase 10: Seeded Board Generator - Research

**Researched:** 2026-09-25
**Domain:** Deterministic procedural level generation over an existing, pinned level schema
**Confidence:** HIGH (the phase is almost entirely in-repo; every load-bearing claim below was executed against the repo's own code this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Board character**
- **D-01: Left–right symmetric.** Generate the left half and mirror it. All five authored
  levels are symmetric, so generated boards sit in the same visual family as the campaign,
  and the space the generator can get wrong is halved.

**Geometry**
- **D-02: One fixed grid.** A single `cols/rows/brickW/brickH/gapX/gapY` set, proven once to
  fit 360×640. Difficulty changes only cell **content**, never the lattice.
  Rationale: `level-04`/`level-05` shipped 4 units too wide and no test caught it because
  bounds were only asserted for `level-03`. A fixed, proven grid removes that failure class
  from the generator entirely rather than re-proving it per difficulty.

**Safety**
- **D-03: Structurally incapable of failing the lint.** Constrain steel placement inside the
  algorithm — never enclose a breakable cell on all approachable sides — so
  `checkSolvability` passes *by construction*. The lint stays as an assertion over a wide
  seed sweep (a safety net), not as a filter the generator retries against.
  Rejected: generate-and-repair. It adds a loop whose termination must be proved, and a
  retry-on-new-seed variant would break the "same seed ⇒ same board" contract of N-GEN-01.

**Difficulty dials**
- **D-04: Fill density rises.** More occupied cells. This is the primary weight dial.
- **D-05: HP mix hardens.** Proportionally more hp2/hp3 over hp1 — raises total HP without
  making the board denser, preserving space for the ball to travel.
- **D-06: Steel count rises.** More `X` channelling the ball.
- **D-07: Explosive thins out.** *Lower* difficulty gets more `E`. Explosive is
  player-favourable — the 8-neighbour cascade clears work for you — so it is a gift that
  becomes rarer, not an obstacle that accumulates.
- **D-08: Monotonicity is owned by D-04 and D-05.** Steel contributes **zero** to authored
  weight (it is unbreakable, so it is neither a brick nor HP in `levelStatics` terms), and
  thinning explosive *removes* weight. So the density and HP dials must dominate hard enough
  that brick count and total HP are still non-decreasing across the whole difficulty range
  with the other two dials working against them. This is an explicit constraint on the
  parameter curves, and it must be asserted across the range, not spot-checked.

**Carried forward (already locked — do not re-litigate)**
- **E1b:** shipped verbs only — hp1/hp2/hp3, steel `X`, explosive `E`. No new brick type.
  `E` is `{ hp: 1, explosive: true }`; validate rejects `unbreakable + explosive`.
- **E2 / `levelStatics`:** authored weight means brick count and total HP. Steel excluded.
- **Playfield is 360×640**, and a bounds guard over the campaign already exists in
  `tests/balance.curve-e2.test.ts` — the generator needs the equivalent over its seed sweep.
- **Core is untouched.** Generation runs once per board, off the worklet, on the JS side.
  Nothing here may allocate on the simulation or render hot path.
- **Mid particle budget** (`particleCap` 128) is the ceiling cascades are FIFO-evicted
  against — the generator must not place explosive densely enough to make that the norm.

### Claude's Discretion
- The exact fixed grid values, and whether `cols` is even (clean mirror) or odd (mirrored
  around a centre column). Justify against the 360-wide fit.
- The difficulty scale itself — integer waves, a normalised 0..1, or both — and the shape of
  each dial's curve.
- Which RNG the generator uses. It must be seeded and pure; whether it reuses the core dual
  streams or takes a local PRNG is an implementation call, provided nothing in `src/core`
  changes and the same seed reproduces byte-identically across processes.
- Whether the generator emits a `LevelFileV1` object or a pre-compiled form, as long as the
  solvability lint and the existing validate path can both consume it.

### Deferred Ideas (OUT OF SCOPE)
- **Wave-to-difficulty mapping** → Phase 11. This phase owns the difficulty *input*, not the
  schedule that feeds it.
- **Date-to-seed derivation and the clock-change policy** → Phase 12.
- **Showing the player a preview or a seed code** → Phase 14, if wanted at all.
- **Motif/template library** — considered and set aside for D-01's symmetric generation. If
  generated boards later read as samey, a motif pass is the natural follow-up, and it can be
  layered on top of the symmetric generator rather than replacing it.
- **Generated boards joining the campaign** — out of scope; the campaign stays authored.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **N-GEN-01** | `generate(seed, difficulty)` is pure and returns a `LevelFileV1`; identical arguments produce byte-identical output across processes | §Q5 (integer-only PRNG + integer-only decisions), §Pattern 1, §Pitfall 2/3/6. Cross-process byte-identity **executed and confirmed** this session (identical SHA-256 over 4 200 boards across three separate `node` processes, including `--jitless`). |
| **N-GEN-02** | Every generated board passes `checkSolvability` with zero unreachable breakables and fits the 360×640 playfield, asserted over a seed/difficulty sweep | §Q1 (the reachability theorem + the steel invariant), §Q2 (mirror hazard, with an executed counterexample), §Q3 (the fixed grid arithmetic), §Validation Architecture. 105 000 boards swept with zero failures. |
| **N-GEN-03** | `difficulty` is monotone — higher values yield non-decreasing authored weight (brick count and total HP); generation uses only shipped verbs and respects the Mid particle budget | §Q4 (exact-count schedules ⇒ weight is seed-**independent**, so monotonicity is an integer property of the schedule, not a statistical one), §Q7 + §Particle budget arithmetic (explosive cluster cap 4). |
</phase_requirements>

---

## Summary

This phase has almost no external surface. There is no new dependency, no Expo API, no
network call and no new schema. What it needs is a *proof* and a *shape*: a placement rule
for steel that makes `checkSolvability` structurally unable to fail (D-03), and a difficulty
parameterisation whose authored weight is monotone by arithmetic rather than by luck (D-08).
Both are obtainable, and both were executed against the repo's real code during this research
rather than argued from first principles.

The decisive finding is a **separation of concerns that the phase's framing does not make
obvious**: `checkSolvability` floods from the bottom row through *empty **and** breakable*
cells (`isPassable` in `src/core/levels/solvability.ts:51-53`). Every non-steel cell is
passable regardless of what is in it. Therefore **reachability is a property of the steel
mask alone** — the density dial (D-04), the HP mix (D-05) and the explosive dial (D-07) are
*provably* solvability-neutral and cannot be the cause of a lint failure, no matter how they
are tuned. `docs/ops/LEVEL-VERBS-E1b.md` already states the special case of this for `E`; the
general statement is the load-bearing one for this phase. It collapses D-03 from "constrain
four dials" to "constrain one", and it means the correct invariant is *not* "no breakable is
enclosed" but the stronger, content-free **"every non-steel cell is 4-reachable from the
bottom row"** — an invariant that can be maintained incrementally as steel is placed, with a
one-line inductive proof and no retry loop.

The second decisive finding is that **exact counts beat probabilistic fill**. If the
generator draws *how many* hp1/hp2/hp3 bricks to place from an integer schedule (and merely
uses the seed to choose *which cells*), then `bricks` and `totalHp` become functions of
`difficulty` alone — completely seed-independent. Monotonicity stops being a statistical claim
needing a large sample and becomes an integer inequality over a 21-element table, and the
sweep test can assert the far stronger `statics(generate(s,d)) === SCHEDULE[d]` for every
seed. This also dissolves D-08's stated tension: **thinning explosive removes no weight at
all**, because `E` is `{hp:1}` and demoting `E`→`1` is weight-identical (verified: 0 of 63 000
boards changed brick count or HP under an E→1 demotion pass). D-08's premise that explosive
"works against" monotonicity holds only if `E` is carved out of *empty* cells; carve it out of
the hp1 population instead and the dial is free.

**Primary recommendation:** ship `generate(seed, difficulty)` as a new, boundary-registered
`src/levelgen/` module (core untouched); reuse `level-03`'s already-proven grid verbatim
(10×16, `originX` 2, `brickW` 32, `gapX` 4, `originY` 48, `brickH` 14, `gapY` 2); place
**mirrored steel pairs one at a time, accepting a pair only if the full-board "all non-steel
cells reachable" flood still holds**; then fill exact per-difficulty counts of `3/2/1/E` into
the surviving cells. Assert the contract with a fast-check-free deterministic sweep (105 000
boards run in 3.4 s; the full TS `validate`+`compile`+`checkSolvability` path over 8 400
boards runs in 352 ms) plus a ~100-board `runBot` winnability sample at ~20 ms/board.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `generate(seed, difficulty) → LevelFileV1` | **New `src/levelgen/` (JS cold path)** | — | Pure TypeScript, no platform seam, no worklet. Must not live in `src/core` (locked: "nothing in `src/core` changes"). |
| Seeded PRNG for generation | `src/levelgen/` (local copy) | — | `src/core/rng/mulberry32.ts` is a `'worklet'` function operating on a `Uint32Array` *World slot*; reusing it forces either a World or a core edit. Copy the 4-line algorithm locally. See §Q5. |
| Difficulty → parameter schedule | `src/levelgen/` | — | Pure integer table. Phase 11 owns wave→difficulty; this phase owns difficulty→board. |
| Validation + compile of a generated board | `src/core/levels` (**unchanged**) | `src/levelgen` calls it | `loadAndCompile(raw)` already accepts a plain object (`src/core/levels/load.ts:11`). No adapter needed. |
| Solvability assertion | `tests/` + `scripts/` | — | `checkSolvability` is already pure and exported from `src/core` (index line 88). The generator never calls it at runtime (D-03). |
| Handing a generated board to the sim | `app/` (Phase 11/14) | `runtime/` | `loadLevelById` is invoked from `app/_components/PlayingHost.tsx:282` in a `useMemo` — the cold path is already an app-tier concern. Generated ids are **not** `LevelId`, so `loadLevelById` is the wrong door; `loadAndCompile` is the right one. |
| Authored-weight measurement | `tests/helpers/balanceBot.ts` | — | `levelStatics` is the locked definition (E2). Must be extended to accept an object — see §Pitfall 1. |

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

`./CLAUDE.md` is a single `@AGENTS.md` include. `./AGENTS.md` reads in full:

> # Expo HAS CHANGED
> Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

| Directive | Applies to this phase? | Disposition |
|-----------|------------------------|-------------|
| Consult Expo SDK 57 versioned docs before writing code | **No Expo surface in this phase** | Verified by inspection: the deliverable is pure TypeScript. `src/levelgen/` must import nothing from `expo*`, `react`, `react-native`, or `@shopify/react-native-skia`. The only Expo-adjacent risk is the **Hermes** JS engine (see Assumption A1), which is a runtime-determinism question, not an API question. The planner should record the confirmation explicitly rather than silently skipping the directive. |
| `src/core` must stay pure TypeScript (LC-01/LC-06, enforced by `eslint.config.js` + `tests/core.purity.test.ts`) | Indirectly | The generator lives outside core; the same purity discipline should be applied to it voluntarily. |
| No `Math.random()`, `Date.now()`, `performance.now()` in `src/core` (D-13, ESLint `no-restricted-syntax`) | **Should be extended to `src/levelgen/`** | The rule is currently scoped to `files: ['src/core/**/*.{ts,tsx}']`. A generator that calls `Math.random()` or `Date.now()` silently destroys N-GEN-01 and **nothing in the repo would catch it**. Recommend copying that rule block for `src/levelgen/**` — see §Q5 and the Validation Architecture. |

**Project skills:** `.claude/skills/` and `.agents/skills/` — **neither exists** (verified: `ls` returns "No such file or directory" for both). `.claude/` contains only `launch.json`, `settings.local.json` and an empty `worktrees/`. No project skills to honour.

**Knowledge graph:** `.planning/graphs/graph.json` does not exist. No graph context was injected.

---

## Answers to the Planner's Questions

### Q1 — What steel placement rule makes `checkSolvability` pass by construction? *(Prove it.)*

**Read the flood-fill precisely.** `src/core/levels/solvability.ts:37-53` defines, verbatim:

```ts
const EMPTY = '.';

function isSteel(level: LevelFileV1, ch: string): boolean {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable === true;
}

function isBreakable(level: LevelFileV1, ch: string): boolean {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable !== true;
}

function isPassable(level: LevelFileV1, ch: string): boolean {
  return ch === EMPTY || isBreakable(level, ch);
}
```

[VERIFIED: src/core/levels/solvability.ts:37-53]

The seed and the spread are (lines 156-191, quoted verbatim in the relevant part):

```ts
  // Seed: open space below the grid enters any passable cell on the bottom row.
  const bottom = rows - 1;
  ...
      if (isPassable(level, bottomRow[c]!)) {
  ...
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;
```

[VERIFIED: src/core/levels/solvability.ts:156-174]

#### Lemma 1 (content-independence)

For any cell, `isPassable(ch)` is true **iff** `ch` is not steel. Proof: `isPassable` returns
true for `'.'`; for any other `ch` it returns `isBreakable(ch)`, which is true exactly when
`brickTypes[ch]` exists and `unbreakable !== true`. A char not in `brickTypes` is already
rejected by `validateLevel` (`src/core/levels/validate.ts:207-214`), so within a valid level
the only non-passable chars are those with `unbreakable === true`. ∎

**Consequence — the finding that reshapes the whole phase:** *the flood-fill's reachable set
depends on the steel mask and nothing else.* Density, HP mix and explosive placement cannot
affect it. `docs/ops/LEVEL-VERBS-E1b.md` states the `E` special case ("`E` is breakable, so
`isPassable` treats it exactly like empty — replacing `.` or a breakable with `E` **cannot**
make any brick unreachable"); Lemma 1 generalises it to every content dial.

#### The invariant

> **Invariant I.** Let `S ⊆ cells` be the set of steel cells. Run a 4-neighbour flood from
> every non-steel cell of the bottom row, spreading through non-steel cells. **I holds iff
> that flood reaches *every* non-steel cell in the grid.**

#### Theorem

> If **I** holds for the final steel mask, `checkSolvability(level).ok === true` for **every**
> assignment of `'.' / '1' / '2' / '3' / 'E'` to the non-steel cells.

*Proof.* By Lemma 1 the set `checkSolvability` floods is exactly the non-steel set, seeded
from the non-steel cells of the bottom row — identical to the flood in **I**. If that flood
covers all non-steel cells, then in particular it covers every breakable cell (breakables are
non-steel), so `unreachableBreakables` is empty and `ok` is true. The content assignment never
enters the argument. ∎

#### Why "weakest sufficient local rule on steel" does not exist — and the two rules that look sufficient but are not

The planner should not go looking for a cheap local predicate. Two plausible candidates fail:

1. **"At most one steel per column."** Insufficient. An 8-connected monotone staircase with
   exactly one steel per column spans wall to wall and cuts the board. On a 5-wide grid:
   `X..../.X.../..X../...X./....X` isolates the upper-right triangle from the bottom row.
2. **"No two steel cells are 4-adjacent."** Insufficient — and this one is worth pasting into
   the plan, because it is the intuitive rule and it is wrong. Executed against the real CI
   twin `scripts/lib/levelSolvability.mjs` this session:

```
--- DIAMOND: no two steel are 4-adjacent, yet (6,4) is enclosed --- ok=false unreachable=1 warn=0
   ..........
   ..........
   ..........
   ..........
   ..........
   ....X.....
   ...X1X....
   ....X.....
   ..........
```

[VERIFIED: executed against `scripts/lib/levelSolvability.mjs` (the R-16 twin of `src/core/levels/solvability.ts`), output pasted above]

The general characterisation is a Jordan-curve/connectivity-duality statement (a 4-connected
background is cut exactly when the 8-connected foreground forms a closed curve or a
wall-to-wall barrier). It is provable but fiddly to implement correctly, and the union-find
formulation that approximates it ("steel 8-graph is a forest touching the frame at most once")
is *stricter* than necessary — it forbids a 2×2 steel block, which encloses nothing.

#### The rule to implement: incremental invariant-preserving placement

```
steel := ∅                       # I holds trivially: no steel ⇒ every cell reachable
for each candidate cell pair (c, mirror(c)) in a seeded, fixed-length order:
    if |steel| == budget: break
    steel' := steel ∪ {c, mirror(c)}
    if invariantI(steel'): steel := steel'      # accept
    # else: silently leave both cells non-steel
```

This is **not** generate-and-repair, and the planner should say so explicitly in the plan
because D-03 names that rejection:

| D-03's objection | Why it does not apply |
|---|---|
| "adds a loop whose termination must be proved" | The loop is a single pass over a **fixed, finite** candidate list (≤ `rows × cols/2` = 80 entries). It cannot fail to terminate. There is no retry, no backtracking, no re-seeding. |
| "a retry-on-new-seed variant would break same-seed⇒same-board" | The seed is drawn once and never re-drawn. A rejected candidate is *dropped*, not retried with fresh randomness. |
| "repair" | Nothing is repaired. No cell is ever un-steeled after being accepted; no output is post-processed to fix a violation. |

Correctness is one line of induction: **I** holds before the first iteration (empty steel set ⇒
the flood from the bottom row covers the whole grid); every accepted step preserves **I** by
its own test; rejected steps leave the mask unchanged. Therefore **I** holds at the end, and by
the Theorem the board passes the lint for any content. The lint is then a genuine *safety net*
over a sweep, exactly as D-03 requires — the generator never calls it.

**Cost:** the invariant check is one `Uint8Array(160)` flood per candidate, ~160 ops. With a
steel budget of 7 pairs over 80 candidates the worst case is ~13 000 ops. Measured end-to-end
generation including this check: **0.033 ms per board**. Off the hot path, once per board.

**Steel budget shortfall is harmless.** If the candidate list is exhausted before the budget is
met, the board simply has less steel. Steel contributes **zero** authored weight (D-08), so the
weight schedule is untouched. Measured over 105 000 boards: **0 shortfalls** — but the design is
safe even if one occurs.

### Q2 — How does mirroring interact with the constraint? Does `cols` need to be odd or even?

**Yes, mirroring can absolutely create an enclosure the half-board never sees. Proven, not
asserted.** A left-wall-anchored staircase that reaches the centre seam is perfectly safe as a
half-board and catastrophic once mirrored — the mirror completes it into a wall-to-wall
barrier. Executed against the real lint this session:

```
--- LEFT HALF ONLY (right half empty) — staircase L-wall -> centre seam --- ok=true  unreachable=0
   X1111.....
   1X111.....
   11X11.....
   111X1.....
   1111X.....
   ..........   (rows 5..15 empty)

--- SAME HALF, MIRRORED to full board ---                                  ok=false unreachable=20
   X11111111X
   1X111111X1
   11X1111X11
   111X11X111
   1111XX1111
   ..........   (rows 5..15 empty)
```

[VERIFIED: executed against `scripts/lib/levelSolvability.mjs`, output pasted above — 20 unreachable breakables]

**The rule this forces:** apply the invariant check to the **mirrored full board after both
cells of the pair are set**, never to the half-board. Concretely, `steel' := steel ∪ {(r,c),
(r, cols-1-c)}` and then flood the whole `rows × cols` grid. This is what the prototype does,
and it is why 105 000 boards produced zero failures.

**`cols` should be even.** Reasons, in order of weight:

1. **Every count stays even, which keeps the weight schedule exact.** With even `cols` there is
   no centre column, so every placement is a clean pair and `bricks = 2 × halfCount` exactly.
   An odd `cols` introduces a centre column whose cells are their own mirror, so a centre
   placement adds 1 and an off-centre placement adds 2 — the schedule would have to track
   parity, and the "weight is seed-independent" property (§Q4) becomes harder to preserve.
2. **The centre seam is the riskiest place for steel.** With odd `cols`, a steel cell in the
   centre column is a single cell; with even `cols`, a steel pair at columns `cols/2-1` and
   `cols/2` is *orthogonally adjacent*, which is the sole source of corridor warnings on this
   grid (§Q3). Even `cols` makes the hazard visible and rule-able; odd `cols` hides it.
3. `level-03` and `level-06`, the two 10-wide boards, are the repo's precedent.

**Recommendation: `cols = 10`, half-width 5.**

### Q3 — What fixed grid best fits 360×640? *(Show the arithmetic.)*

**Recommendation: reuse `level-03`'s grid byte-for-byte.**

```
cols 10 · rows 16 · originX 2 · originY 48 · brickW 32 · brickH 14 · gapX 4 · gapY 2
```

[VERIFIED: assets/levels/level-03.json:5-14 — `"cols": 10, "rows": 16, "originX": 2, "originY": 48, "brickW": 32, "brickH": 14, "gapX": 4, "gapY": 2`]

The arithmetic, using the exact expression from `tests/balance.curve-e2.test.ts:59-60`
(`right = grid.originX + (grid.cols - 1) * (grid.brickW + grid.gapX) + grid.brickW`):

```
right  = 2 + (10-1) × (32+4) + 32 = 2 + 324 + 32 = 358 ≤ 360   ✓ (2 px slack)
bottom = 48 + (16-1) × (14+2) + 14 = 48 + 240 + 14 = 302 ≤ 640 ✓
originX = 2 ≥ 0 ✓   originY = 48 ≥ 0 ✓
```

Measured over all six shipped boards this session:

| level | cols×rows | cells | right | bottom | bricks | HP | steel | E | max 8-conn E cluster | every row mirrored? |
|---|---|---|---|---|---|---|---|---|---|---|
| level-01 | 7×5 | 35 | 346 | 162 | 32 | 55 | 3 | 0 | — | **no** (4/5 rows) |
| level-02 *(negative fixture)* | 7×5 | 35 | 346 | 162 | 16 | 31 | 15 | 0 | — | yes |
| level-03 | 10×16 | 160 | **358** | 302 | 94 | 173 | 10 | 2 | 1 | **no** (12/16) |
| level-04 | 9×8 | 72 | 358 | 201 | 48 | 64 | 5 | 2 | 1 | yes |
| level-05 | 9×10 | 90 | 358 | 225 | 55 | 94 | 4 | 4 | **4** | **no** (9/10) |
| level-06 | 10×12 | 120 | 358 | 234 | 68 | 132 | 12 | 4 | 2 | yes |

[VERIFIED: computed this session from `assets/levels/*.json` with the exact `right`/`bottom` expressions from `tests/balance.curve-e2.test.ts:59-60`]

**Three notes the planner needs from that table:**

- **The `level-04`/`level-05` bug is already fixed on disk.** Both now compute `right = 358`.
  The comment in `tests/balance.curve-e2.test.ts:53-55` is a historical note, not a live defect.
  D-02's rationale is still correct as a *design* rationale; the planner should not go hunting
  for a bug to fix.
- **CONTEXT's "all five authored levels are symmetric" is approximately, not strictly, true.**
  `level-01`, `level-03` and `level-05` each have rows that are not palindromes (e.g.
  `level-03` row 0 is `1.1.1.1.1.`). This does **not** change D-01 — a strictly mirrored
  generator is still in the campaign's visual family and is still the right call — but the plan
  should not assert "matches the campaign's symmetry" as a testable fact, because it is false.
- **`cols × rows = 160` is comfortably inside every cap.** `validateLevel` rejects
  `cols*rows > MAX_BRICKS` (`src/core/levels/validate.ts:106-114`), and
  `assignSpatialBrickCells` fails (forcing a broadphase fallback) when `cols*rows >
  world.cellToBrick.length` (`src/core/levels/spatial.ts:31`). `MAX_BRICKS = 256`
  [VERIFIED: src/core/constants.ts:50 — `export const MAX_BRICKS = 256;`] and `cellToBrick` is
  allocated as `new Int16Array(maxBricks)` [VERIFIED: src/core/allocate.ts:66]. 160 ≤ 256 ✓, and
  the densest board the recommended schedule produces is 128 bricks + 14 steel = 142 ≤ 256 ✓.
  **This was confirmed end-to-end**: over 150 boards, `applyCompiledLevel` left
  `gridCols === 10`, `gridRows === 16`, `latticePitchX === 36`, `latticePitchY === 16` — i.e.
  the lattice broadphase engaged, never the 1-row fallback.

#### Why not a different grid?

Exact-fit symmetric candidates (integer `brickW`, `right === 360 - originX`) computed this
session — there are only 14 for `cols ∈ 8..12`, `gapX ∈ {2,3,4}`:

| cols | gapX | originX | brickW | right | note |
|---|---|---|---|---|---|
| 8 | 4 | 2 | 41 | 358 | fewer columns ⇒ coarser difficulty granularity |
| 9 | 4 | 2 | 36 | 358 | odd — see Q2 |
| **10** | **4** | **2** | **32** | **358** | **`level-03`'s grid — already ships, already asserted** |
| 11 | 2 | 5 | 30 | 355 | odd |
| 12 | 4 | 2 | 26 | 358 | 12×16 = 192 cells, still < 256, but bricks get visually thin |

Choosing `level-03`'s grid is not merely convenient — it is the *only* option that is already
proven in production against the real broadphase, the real renderer and the real bounds test.
That is worth more than two pixels of extra width.

#### Corridor warnings: a free win

`MIN_BALL_CORRIDOR = 2 * (BALL_RADIUS + SEPARATION_EPS)`
[VERIFIED: src/core/levels/solvability.ts:13; `BALL_RADIUS = 6` at src/core/constants.ts:23,
`SEPARATION_EPS = 1e-4` at src/core/constants.ts:62] **= 12.0002**.

On the recommended grid, for two steel cells in the same row/column separated by `d` lattice
steps (`horizontalOpenWidth` / `verticalOpenWidth`, solvability.ts:59-78):

| separation | row open width | warns? | column open width | warns? |
|---|---|---|---|---|
| d = 1 (orthogonally adjacent) | `0×32 + 1×4 = 4` | **yes** | `0×14 + 1×2 = 2` | **yes** |
| d = 2 | `32 + 8 = 40` | no | `14 + 4 = 18` | no |
| d = 3 | 76 | no | 34 | no |

So **"no two steel cells are orthogonally adjacent" ⇒ zero corridor warnings**, on this grid.
Confirmed empirically over 63 000 boards: of the 29 614 boards with no orthogonally-adjacent
steel, **0** produced a corridor warning; all 33 386 boards that warned had at least one
orthogonally-adjacent steel pair.

Corridor warnings are **non-blocking** — `scripts/assert-level-solvability.mjs` prints them and
does not fail (`"Corridor warnings are printed but do not fail the gate."`), and the shipped
campaign carries 2–8 of them. So this is optional polish, not a requirement. But it costs one
extra predicate in the steel candidate filter and makes generated boards *cleaner than the
campaign*, which is a nice line in the phase summary. **Recommend adopting it** — with the
caveat from §Q1 that it is not a substitute for the invariant.

### Q4 — A defensible parameter curve for the four dials, with monotonicity shown

**Reframe the problem first.** D-08 assumes weight monotonicity is a statistical property that
must survive two dials pulling the wrong way. It does not have to be. Two moves make it an
integer identity:

**Move 1 — exact counts, not probabilities.** Do not roll a per-cell occupancy probability.
Compute the *number* of hp3, hp2, hp1 and E bricks per half-board from an integer schedule, then
use the seed only to choose *which* of the available cells receive them. Then:

```
bricks(seed, d)  = 2 × hb(d)                       — independent of seed
totalHp(seed, d) = 2 × (n1(d) + 2·n2(d) + 3·n3(d)) — independent of seed
```

Monotonicity is now a property of a 21-row integer table, checkable by inspection, and the
sweep test asserts the much stronger `statics(generate(s,d)) === SCHEDULE[d]` — an equality,
not an inequality. **Verified: 0 mismatches over 105 000 boards.**

**Move 2 — carve `E` out of the hp1 population, not out of empty cells.** `E` is
`{ "hp": 1, "explosive": true }` [VERIFIED: assets/levels/level-03.json:22 — `"E": { "hp": 1, "explosive": true }`].
`levelStatics` counts it as one brick with one HP, identically to `'1'`
[VERIFIED: tests/helpers/balanceBot.ts:179-191 — `bricks++; totalHp += def.hp; if (def.explosive === true) explosive++;`].
So **converting hp1 ↔ E changes neither brick count nor total HP**. Verified by running an
E→`1` demotion pass over 63 000 boards: *0 boards* changed `bricks` or `totalHp`.

> **Correction to D-08's premise (flag for the planner, and for user confirmation):** D-08
> states "thinning explosive *removes* weight." That is true only if `E` occupies cells that
> would otherwise be empty. If `E` is drawn from the hp1 budget, D-07 is **weight-neutral** and
> exerts no pressure on monotonicity at all. D-08's other half — "steel contributes zero
> weight" — is correct and is *also* why a steel budget shortfall is harmless.

With both moves, only D-04 (density) and D-05 (HP mix) touch weight, and both push the same
way. D-08's constraint is satisfied structurally.

**Move 3 — a running-max envelope, so the curves cannot dip.** Integer flooring (`Math.floor`)
in a rising curve can produce a one-step dip when two flooring boundaries interact. Rather than
hand-tune to avoid it, wrap each schedule in a cumulative maximum:

```ts
function envelope(fn: (d: number) => number): readonly number[] {
  const out: number[] = [];
  let m = -Infinity;
  for (let d = 0; d <= D_MAX; d++) { m = Math.max(m, fn(d)); out.push(m); }
  return out;
}
```

Monotonicity is then structural, not a property of well-chosen constants. A future tuner cannot
break it by editing a number.

**Concrete curve shapes (difficulty is an integer 0..20, `D_MAX = 20`).** All per-mille, all
integer-lerped (`a + Math.floor(((b - a) * d) / D_MAX)`), all wrapped in `envelope` except
explosive (which *must* fall):

| Dial | Source | 0 → 20 | Notes |
|---|---|---|---|
| Rows used | `envelope(d => 8 + floor(8d/20))` | 8 → 16 | Band is top-anchored (rows `0..rowsUsed-1`). |
| Fill density | `envelope(lerp 420 → 800 ‰)` | D-04 | Primary weight dial. |
| hp3 share | `envelope(lerp 0 → 340 ‰)` | D-05 | No hp3 at all at difficulty 0. |
| hp2 share | `envelope(lerp 180 → 380 ‰)` | D-05 | |
| Explosive share of hp1 | `lerp 260 → 40 ‰` (**falls**, no envelope) | D-07 | Weight-neutral by Move 2. |
| Steel per half | `envelope(d => floor(7d/20))` | 0 → 7 (0 → 14 full) | D-06. Shortfall harmless. |

The resulting schedule, computed this session:

| d | rowsUsed | **bricks** | **totalHp** | E | steel budget |
|---|---|---|---|---|---|
| 0 | 8 | 32 | 36 | 6 | 0 |
| 1 | 8 | 34 | 40 | 6 | 0 |
| 2 | 8 | 36 | 42 | 6 | 0 |
| 3 | 9 | 42 | 54 | 6 | 2 |
| 4 | 9 | 44 | 56 | 6 | 2 |
| 5 | 10 | 50 | 68 | 6 | 2 |
| 6 | 10 | 52 | 72 | 6 | 4 |
| 7 | 10 | 54 | 78 | 6 | 4 |
| 8 | 11 | 62 | 94 | 6 | 4 |
| 9 | 11 | 64 | 96 | 6 | 6 |
| 10 | 12 | 72 | 116 | 6 | 6 |
| 11 | 12 | 74 | 118 | 4 | 6 |
| 12 | 12 | 76 | 126 | 4 | 8 |
| 13 | 13 | 86 | 148 | 4 | 8 |
| 14 | 13 | 88 | 156 | 4 | 8 |
| 15 | 14 | 98 | 178 | 2 | 10 |
| 16 | 14 | 100 | 186 | 2 | 10 |
| 17 | 14 | 104 | 200 | 2 | 10 |
| 18 | 15 | 114 | 222 | 2 | 12 |
| 19 | 15 | 116 | 230 | 0 | 12 |
| 20 | 16 | 128 | 260 | 0 | 14 |

[VERIFIED: schedule computed and monotonicity asserted this session; `schedule monotone: true`]

**Calibration against the campaign** (E2 figures, `docs/ops/BALANCE-E2.md`): the campaign runs
32→94 bricks and 55→173 HP. The schedule brackets it — difficulty 0 matches `level-01`'s brick
count exactly (32) at lower HP (36 vs 55, because there is no hp3 at d=0), difficulty ~13
matches `level-03`'s 94-brick showpiece, and d=20 exceeds the hardest shipped board by ~36 %.
That is a sane endless ramp: the first generated wave is easier than the campaign finale, and
the top of the range goes beyond anything hand-authored.

These constants are **Claude's-discretion tuning**, not locked contract. The planner should
place them in one exported table so Phase 11 can re-tune the *feel* without touching the
*proof*. The tests must assert **monotonicity and exactness**, not the specific numbers —
otherwise every future tuning edit breaks the suite.

### Q5 — Which PRNG? Core streams or local? Float-precision hazards?

**Recommendation: a local mulberry32 in `src/levelgen/rng.ts`, not `src/core/rng`.**

`src/core/rng/mulberry32.ts` exports `nextU32(state: Uint32Array, i: number)` and
`nextFloat(...)`, both marked `'worklet'`, both operating on a **World-owned `Uint32Array`
slot** with a doc comment "Dual mulberry32 streams live on World slots (D-13). Never share
rngGameplay and rngCosmetic — pass the correct slot."
[VERIFIED: src/core/rng/mulberry32.ts:1-8]

Using it from the generator means either allocating a `Uint32Array` purely to satisfy the
signature (ugly but legal) or touching core (forbidden). The **algorithm** is four lines; copy
it. Copying is also what keeps `src/levelgen/` free of the `'worklet'` directive, which it must
be — this code never runs on the UI thread.

```ts
// src/levelgen/rng.ts — local mulberry32; NOT a worklet; same algorithm as src/core/rng.
export function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;   // u32 — no float
  };
}
```

**Do every decision in integer space. Never call `nextFloat`.** This is the single most
important determinism rule in the phase.

- `Math.imul`, `|0`, `>>>`, `^` are exactly specified over int32/uint32 — no engine latitude.
- `+ - * /` on doubles are IEEE-754 binary64 and identical across conforming engines.
- **`Math.pow` / `**` / `Math.sin` / `Math.cos` / `Math.exp` / `Math.log` are
  "implementation-approximated"** — the ECMAScript specification defines that term in §4.4.1
  [CITED: https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-implementation-approximated]
  and engines are documented to differ in the last bit on `Math.pow`. If a difficulty curve
  uses `d ** 1.5` to shape a ramp, a last-bit difference can cross a `Math.floor` boundary and
  change a brick count — i.e. change the whole board. **Forbid these functions in the
  generator.** Integer lerps (§Q4) have no such exposure.

**Uniform integer sampling — and the overflow trap.** Use rejection sampling for unbiased
`randBelow(n)`, but note the bug this research hit and burned ten minutes on:

```ts
export function below(rng: () => number, n: number): number {
  if (n <= 1) return 0;
  // DO NOT write `(4294967296 - (4294967296 % n)) >>> 0` — for power-of-two n the modulo is 0,
  // and 2**32 >>> 0 === 0, so `lim` becomes 0, `u < 0` is never true, and this loop hangs.
  const lim = 4294967296 - (4294967296 % n);
  for (;;) { const u = rng(); if (u < lim) return u % n; }
}
```

Fisher-Yates calls `below(rng, i + 1)`, which hits `n = 2, 4, 8, 16, …` on every shuffle — so
this bug is not theoretical, it is guaranteed. [VERIFIED: reproduced this session — the sweep
hung until `>>> 0` was removed.]

**Seed normalisation.** `generate` should accept `number | string` and normalise to a u32 with
integer-only FNV-1a, so Phase 12's date-derived seed needs no new machinery:

```ts
export function hashSeed(s: number | string): number {
  if (typeof s === 'number') return s >>> 0;
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
```

Mix the difficulty into the stream seed so that `generate(s, d)` and `generate(s, d+1)` are
independent draws rather than prefix-correlated:
`makeRng((Math.imul(seed, 0x9e3779b1) ^ Math.imul(d + 1, 0x85ebca6b)) | 0)`.

**Cross-process byte-identity — executed:**

```
run1   = 0ffbfdb79b6ad7a3ce99682ab457cf0d442cf7dc3ca0b33dc49be390750b9ea2
run2   = 0ffbfdb79b6ad7a3ce99682ab457cf0d442cf7dc3ca0b33dc49be390750b9ea2
jitless= 0ffbfdb79b6ad7a3ce99682ab457cf0d442cf7dc3ca0b33dc49be390750b9ea2
CROSS-PROCESS: IDENTICAL
```

SHA-256 over `JSON.stringify` of 200 seeds × 21 difficulties = 4 200 boards, in three separate
`node` v25.6.0 processes including one with the JIT disabled.
[VERIFIED: executed this session, output pasted above]

> **Hermes is NOT covered by that observation** — see Assumption **A1**. Node/V8 agreement is
> confirmed; Hermes agreement is inferred from spec conformance, not measured. The plan needs a
> cheap on-device falsification (§Validation Architecture, V-7).

### Q6 — How should the sweep test be structured? Is fast-check the right tool?

**No — a deterministic enumerated sweep is the right tool here, and fast-check is the wrong
one.** The repo does have fast-check (`fast-check` 4.10.2 and `@fast-check/vitest` 0.5.0 in
devDependencies; used by `tests/physics.tunneling.prop.test.ts` and
`tests/physics.golden-replay.test.ts`), so the reflex to reach for it is reasonable. It is
still wrong here, for three reasons:

1. **The input space is already small and fully enumerable in the interesting dimension.**
   Difficulty is 21 discrete values. Seeds are a u32 space, but the generator's behaviour is not
   "structured" in the way property-based shrinking helps with — a failing seed shrinks to
   nothing useful, because there is no smaller seed that is "more minimal."
2. **Reproducibility of the *test* matters as much as of the generator.** A fast-check run that
   fails on CI with a seed the developer cannot reproduce locally is exactly the debugging
   experience this phase exists to avoid. A `for (let s = 0; s < N; s++)` loop over a fixed
   contiguous seed range is byte-reproducible, and the failing seed prints as an integer you can
   paste straight into `generate(s, d)`.
3. **It is already fast enough to make N large.** Measured this session:

| Sweep | Boards | Wall time | Per board |
|---|---|---|---|
| `generate` + `scripts/lib/levelSolvability.mjs` (CI twin) | 105 000 (5 000 seeds × 21) | **3 429 ms** | 0.033 ms |
| `generate` + `validateLevel` + `loadAndCompile` + TS `checkSolvability` | 8 400 (400 seeds × 21) | **352 ms** | 0.042 ms |
| `runBot` headless play to WON | 15 | 272 ms | ~18 ms (7–44 ms) |

[VERIFIED: executed this session]

**Recommended structure — three tiers, with N as an exported constant:**

| Tier | What | N | Budget |
|---|---|---|---|
| **Sweep (vitest, always on)** | `validateLevel` ok · `loadAndCompile` ok · `checkSolvability().ok` · bounds arithmetic · `statics === SCHEDULE[d]` · mirror symmetry · row length · explosive cluster ≤ 4 | 1 000 seeds × 21 = **21 000 boards** | < 2 s |
| **Determinism (vitest)** | `JSON.stringify(generate(s,d))` equal on two calls; SHA-256 of a fixed 4 200-board corpus pinned as a golden string | 4 200 | < 200 ms |
| **Winnability (vitest, sampled)** | `runBot`-equivalent over a stratified sample (5 seeds × each of d ∈ {0,5,10,15,20}) asserting `WON` and `bricksRemaining === 0` | ~25–100 | 0.5–2 s |

Keep the golden SHA-256 pinned in the test file. It is the cheapest possible regression trap
for N-GEN-01: any accidental change to the PRNG, the candidate ordering or the schedule flips
one hex string and the test names exactly what broke.

For a CI gate that mirrors the repo's existing idiom, also add
`scripts/assert-generated-solvability.mjs` to the `npm test` chain alongside
`assert-level-solvability.mjs`, running the sweep through the **`.mjs` twin**. That keeps the
R-16 parity discipline honest: the generator is then proven safe under *both* implementations
of the lint, not just the TypeScript one. `scripts/lib/levelSolvability.mjs` already exports
`checkSolvability` (line 111), so the script is ~30 lines.

### Q7 — Can a board pass the lint but be miserable to play? Can `runBot` prove winnability?

**Yes to the risk, and yes to `runBot` — and it is much cheaper than the existing campaign bot
test suggests.**

The lint proves *reachability*, not *playability*. A board with one hp3 brick tucked behind a
steel rib is reachable and tedious. Two mitigations, in priority order:

1. **The bot sample.** `runBot` plays the real `stepRun` pipeline headlessly with a perfect
   paddle. Measured on prototype boards (paddle offset 12, `maxTicks = 420 s`):

```
d=0  seed=1 WON sim=108.3s wall=21ms   d=0  seed=2 WON sim=47.8s  wall=8ms
d=5  seed=1 WON sim=76.7s  wall=7ms    d=5  seed=3 WON sim=100.2s wall=13ms
d=10 seed=1 WON sim=92.6s  wall=14ms   d=10 seed=2 WON sim=110.3s wall=18ms
d=15 seed=3 WON sim=157.0s wall=20ms
d=20 seed=2 WON sim=223.3s wall=40ms   d=20 seed=3 WON sim=199.7s wall=44ms
```

   All 15 boards **WON** with `bricksRemaining === 0`. [VERIFIED: executed this session through
   `src/core`'s real `stepRun`/`applyCompiledLevel`.]

   **Tick budget:** `maxTicks = TICKS_PER_SECOND * 420` (420 simulated seconds) is right — the
   slowest prototype board needed 223 s of simulated time, so 420 s leaves ~1.9× headroom while
   still terminating a genuinely stuck board. At ~20 ms wall per board, a **100-board sample
   costs ~2 s**. Budget it at 30 s in the `it(...)` timeout, not the 300 s the campaign test
   uses. The bot cost scales with simulated clear time, so sample the *top* of the difficulty
   range more densely than the bottom.

   Note: the bot is a measuring instrument that never misses, so `WON` is a *necessary*, not
   sufficient, condition for a human-playable board
   [CITED: tests/helpers/balanceBot.ts:8-10 — "This is a measuring instrument, not a player model: it never misses on purpose, so its clear time is a *floor* on human duration"].
   Its real value here is catching a *structural* miss — a board where some brick is
   reachable-on-paper but practically unhittable.

2. **A "no lonely brick" shape constraint, if the bot ever flags one.** Not needed on the
   evidence so far (0/15 failures, 0/105 000 lint failures). Keep it in reserve rather than
   building it speculatively.

#### Particle budget (SC-5) — the arithmetic, and the one constraint it forces

The exact constants:

- `CHIP_SPARKS_AT_1 = 4`, `DESTROY_SPARKS_AT_1 = 12`, `PARTICLE_POOL_DEFAULT = 128`
  [VERIFIED: src/vfx/types.ts:7,11,12 — `export const PARTICLE_POOL_DEFAULT = 128;`,
  `export const CHIP_SPARKS_AT_1 = 4;`, `export const DESTROY_SPARKS_AT_1 = 12;`]
- Mid tier `particleCap: 128` [VERIFIED: src/runtime/resolveQualityTier.ts:23 —
  `mid: { particleCap: 128, trailMax: 4, glowScale: 1 },`]
- Explosive destroy burst is `intensity * 1.25` [VERIFIED: src/vfx/consumeEvents.ts:113-115],
  and `spawnBurst` uses `Math.round(base * opts.intensity)`
  [VERIFIED: src/vfx/particles.ts:66-67] ⇒ `round(12 × 1.25) = 15` sparks per explosive destroy.

A chain of `k` explosives detonating in one step emits `15k` destroy sparks plus the triggering
ball break (12) plus chip sparks for surviving damaged neighbours (4 each).

| k | explosive destroy sparks | + ball break | headroom under 128 |
|---|---|---|---|
| 2 | 30 | 42 | 86 chips-worth |
| **4** | **60** | **72** | **56 (14 chips)** |
| 6 | 90 | 102 | 26 (6 chips) |
| 8 | 120 | 132 | **over cap** |

**The campaign's own ceiling is 4** — `level-05`'s V-fuse is a 4-member 8-connected cluster
(verified in the §Q3 table, and described as such in `docs/ops/LEVEL-VERBS-E1b.md`:
"one hit anywhere on the fuse consumes all four"). Adopting **max 8-connected explosive cluster
= 4** therefore (a) stays inside the Mid budget with room for chips, (b) matches the hardest
thing already shipped, and (c) preserves the E1b "explosives chain" lesson.

**The unconstrained prototype produced clusters of 6**, so this is a real constraint the plan
must add, not a formality. The enforcement is a weight-free post-pass — demote the offending
`E` (and its mirror) to `'1'`:

```
max 8-connected E cluster BEFORE cap: 6
max 8-connected E cluster AFTER  cap: 4
boards whose bricks/HP changed from the E demotion: 0   (must be 0 — E and 1 are both hp:1)
solvability failures after cap: 0
```
[VERIFIED: executed over 63 000 boards this session, output pasted above]

Because E↔1 is weight-identical and both are breakable, the cap disturbs neither the weight
schedule nor the solvability invariant. Total `E` per board also falls 6 → 0 across the range,
consistent with D-07.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| — (none added) | — | — | This phase adds **zero** dependencies. |

Everything required already exists in-repo:

| Module | Path | Role in this phase |
|---|---|---|
| `LevelFileV1`, `BrickTypeDef`, `SCHEMA_VERSION` | `src/core/levels/schema.ts` | The output type. Unchanged. |
| `validateLevel` | `src/core/levels/validate.ts` | Structural gate the generated object must pass. |
| `loadAndCompile` | `src/core/levels/load.ts` | validate → migrate → compile; accepts a plain object. |
| `checkSolvability`, `MIN_BALL_CORRIDOR` | `src/core/levels/solvability.ts` | The safety-net assertion. Never called by the generator. |
| `checkSolvability` (CI twin) | `scripts/lib/levelSolvability.mjs` | The `.mjs` gate; must also be swept (R-16 discipline). |
| mulberry32 algorithm | `src/core/rng/mulberry32.ts` | **Copied**, not imported — see §Q5. |
| `levelStatics`, `runBot` | `tests/helpers/balanceBot.ts` | Weight definition + winnability. Needs an object-accepting variant — §Pitfall 1. |

### Supporting (test/tooling, already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 5.0.1 | Test runner | All sweeps and unit tests |
| `fast-check` / `@fast-check/vitest` | 4.10.2 / 0.5.0 | Property testing | **Not recommended here** — see §Q6 |
| `typescript` | ~6.0.3 | `npm run typecheck` | — |
| `eslint` + `eslint-plugin-boundaries` | ^9.39.5 / ^7.2.0 | Layer matrix | Needs a 6-line edit — see §Pitfall 5 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local mulberry32 copy | `src/core/rng/mulberry32.ts` | Requires fabricating a `Uint32Array` slot and inherits a `'worklet'` directive the generator must not have. Rejected. |
| New `src/levelgen/` element | `src/services/levels/generate.ts` | Zero eslint config change (`services → core` and `app → services` are both already allowed). But "services" means *platform seams* in this repo, and a deterministic generator is domain logic. Viable fallback if the planner prefers zero config churn. |
| Deterministic enumerated sweep | `fast-check` property test | Irreproducible CI failures, useless shrinking, and slower. Rejected — see §Q6. |
| Emitting a `CompiledLevel` | Emitting `LevelFileV1` | CONTEXT allows either. `LevelFileV1` is strictly better: it is what `checkSolvability`, `validateLevel` and `levelStatics` all consume directly, and it is JSON-serialisable so the determinism test can hash it. **Emit `LevelFileV1`.** |

**Installation:**

```bash
# No packages to install. This phase adds zero dependencies.
```

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.**

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Every module the phase depends on is already in `package.json` and already in use by shipped
code. No `npm install` step belongs in this plan; a plan that contains one has drifted from the
phase boundary.

---

## Architecture Patterns

### System Architecture Diagram

```
                       (seed, difficulty)                 Phase 11 supplies waveDifficulty
                               │                          Phase 12 supplies a date-derived seed
                               ▼
          ┌──────────────────────────────────────────┐
          │  hashSeed(seed) → u32   (FNV-1a, integer)│
          │  mix(u32, difficulty)   → PRNG stream    │
          └──────────────────┬───────────────────────┘
                             │  u32 stream (never a float)
                             ▼
          ┌──────────────────────────────────────────┐
          │  SCHEDULE[difficulty]  (integer table)   │   ← D-04/05/06/07
          │  rowsUsed · hb · n1 · n2 · n3 · nE · sb  │      envelope()-wrapped ⇒ monotone
          └──────────────────┬───────────────────────┘
                             │
             ┌───────────────┴────────────────┐
             ▼                                ▼
  ┌────────────────────────┐      ┌──────────────────────────────┐
  │ STAGE 1 · STEEL        │      │ (weights are already fixed   │
  │ shuffle half-cells     │      │  here — seed cannot change   │
  │ for each candidate:    │      │  bricks or totalHp)          │
  │   set (r,c) AND mirror │      └──────────────────────────────┘
  │   ├ invariant I holds? ─── yes ─► keep
  │   └ no ─► revert, drop candidate
  └───────────┬────────────┘
              │ steel mask (satisfies I ⇒ lint-safe for ANY content — Lemma 1)
              ▼
  ┌────────────────────────┐
  │ STAGE 2 · CONTENT      │   exact counts, mirrored placement
  │ choose hb cells        │   3 → 2 → E → 1, shuffled assignment
  └───────────┬────────────┘
              ▼
  ┌────────────────────────┐
  │ STAGE 3 · E-CLUSTER CAP│   demote E→'1' where 8-cluster > 4  (weight-neutral)
  └───────────┬────────────┘
              ▼
        LevelFileV1  ──────────────┬─────────────────────────────┐
                                   │                             │
                                   ▼                             ▼
                    loadAndCompile(raw)              checkSolvability(level)
                    (src/core, UNCHANGED)            (tests + CI gate ONLY —
                    validate → migrate → compile      the generator never calls it)
                                   │
                                   ▼
                    CompiledLevel → applyCompiledLevel → World
                    (app cold path, off the worklet — Phase 11/14)
```

The one-way arrow that matters: **`checkSolvability` sits on the *test* branch, not on the
generation branch.** If a plan task ever has `generate` calling `checkSolvability`, D-03 has
been violated.

### Recommended Project Structure

```
src/levelgen/                  # new, boundary-registered layer — core untouched
├── index.ts                   # export { generate }, export type { Difficulty }
├── generate.ts                # the three stages above
├── grid.ts                    # the frozen GRID constant + BRICK_TYPES template
├── schedule.ts                # SCHEDULE table + envelope(); the only tunable file
├── rng.ts                     # local mulberry32 + below() + hashSeed() — no 'worklet'
└── reachability.ts            # invariant I flood-fill (generator-internal, NOT the lint)

tests/
├── levelgen.sweep.test.ts     # 21 000-board contract sweep (N-GEN-02, N-GEN-03)
├── levelgen.determinism.test.ts  # golden SHA-256 + byte-identity (N-GEN-01)
├── levelgen.schedule.test.ts  # monotonicity + exactness of the integer table (N-GEN-03)
└── levelgen.winnability.test.ts  # sampled runBot (SC-2 quality backstop)

scripts/
└── assert-generated-solvability.mjs   # CI twin sweep, wired into `npm test`
```

### Pattern 1: Purity by construction — no ambient inputs, no shared mutable output

```ts
// src/levelgen/generate.ts
import { GRID, BRICK_TYPES_TEMPLATE } from './grid';

export function generate(seed: number | string, difficulty: number): LevelFileV1 {
  const d = clampDifficulty(difficulty);
  const rng = makeRng(mixSeed(hashSeed(seed), d));
  // ... stages 1-3 ...
  return {
    schemaVersion: 1,
    id: `gen-${u32.toString(16)}-${d}`,
    name: `Generated ${d}`,
    grid: { ...GRID },                    // fresh object — never hand out the frozen one
    brickTypes: { ...BRICK_TYPES_TEMPLATE,
      '1': { hp: 1 }, '2': { hp: 2 }, '3': { hp: 3 },
      E: { hp: 1, explosive: true }, X: { hp: 99, unbreakable: true } },
    cells,                                // freshly built string[]
  };
}
```

**When to use:** always. Three sub-rules the planner should turn into verification steps:

- **No ambient input.** `Math.random()`, `Date.now()`, `performance.now()`, `process.env`,
  module-level mutable state — all forbidden. Copy the `no-restricted-syntax` block from
  `eslint.config.js` (currently scoped to `src/core/**`) onto `src/levelgen/**`.
- **No aliasing on output.** Return a *fresh* `grid` and `brickTypes` object every call. If the
  generator hands out a shared constant and any caller mutates it, board N+1 differs from board
  N for the same arguments and N-GEN-01 is silently dead. (`validateLevel` copies into a
  null-prototype map for its *own* return value, but the raw object you emitted is still
  aliased.)
- **Declare all five brick types every time**, even when `nE === 0` at high difficulty.
  `validateLevel` permits unused `brickTypes` entries (it only checks that every cell char is
  *in* `brickTypes`, validate.ts:207-214), and a constant key set keeps the JSON byte-stable so
  the golden hash means something.

### Pattern 2: The invariant flood is the generator's own, not the lint

```ts
// src/levelgen/reachability.ts — operates on a steel bitmask, not on a LevelFileV1
export function allNonSteelReachable(steel: Uint8Array, cols: number, rows: number): boolean {
  const seen = new Uint8Array(rows * cols);
  const queue: number[] = [];
  let target = 0;
  for (let i = 0; i < steel.length; i++) if (!steel[i]) target++;
  for (let c = 0; c < cols; c++) {
    const i = (rows - 1) * cols + c;
    if (!steel[i]) { seen[i] = 1; queue.push(i); }
  }
  let head = 0, found = queue.length;
  while (head < queue.length) {
    const i = queue[head++]!, r = (i / cols) | 0, c = i - r * cols;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (seen[ni] || steel[ni]) continue;
      seen[ni] = 1; queue.push(ni); found++;
    }
  }
  return found === target;
}
```

**When to use:** stage 1 only, once per candidate steel pair.
**Deliberately stronger than the lint:** the lint only requires *breakables* to be reachable;
this requires *every* non-steel cell to be. That extra strength is what buys content-independence
(the Theorem in §Q1) — it is not accidental over-engineering, and the plan should say so, or a
future reader will "optimise" it back to the weaker form and destroy the proof.

### Pattern 3: Test against the real assets and the real pipeline, not fixtures

The repo's established idiom (`tests/levels.verb-curve-e1b.test.ts`,
`tests/balance.curve-e2.test.ts`, `tests/levels.solvability-parity.test.ts`) is to assert
against shipped artifacts through the real code path. The generator's equivalent: run every
swept board through `validateLevel` → `loadAndCompile` → `checkSolvability`, and a sample
through `applyCompiledLevel` + `stepRun`. Measured cost for the full TS path: **352 ms for
8 400 boards.** There is no budget argument for stubbing any of it.

### Anti-Patterns to Avoid

- **Calling `checkSolvability` inside `generate`.** Direct D-03 violation, and it inverts the
  dependency: the lint becomes load-bearing instead of a net. If it appears, the "by
  construction" claim is gone.
- **Rolling occupancy per cell with a probability.** Makes `bricks`/`totalHp` seed-dependent,
  which downgrades N-GEN-03 from an exact equality to a statistical claim over a sample and
  re-opens all of D-08's tension for no benefit.
- **Checking the invariant on the half-board.** Proven catastrophic in §Q2 — 20 unreachable
  breakables from a half-board that passes.
- **`Math.pow` / `**` / trig in the difficulty curves.** Implementation-approximated; a last-bit
  difference crossing a `Math.floor` changes the board. Use integer lerps.
- **Adding `gen-*` ids to the `LevelId` union.** `LevelId` is the *campaign* catalog
  (`src/core/levels/levelIds.ts`) and lives in core, which is locked. Generated boards reach the
  sim through `loadAndCompile(object)`, not `loadLevelById(id)`.
- **Persisting a generated board.** CONTEXT: boards "are derived from (seed, difficulty), never
  stored."
- **Putting the generator in an unregistered folder and assuming eslint covers it.** It does
  not — see §Pitfall 5, verified this session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking a generated board is structurally legal | A bespoke shape check | `validateLevel` (`src/core/levels/validate.ts`) | Already covers row length vs `cols`, `cells.length` vs `rows`, space chars, unknown chars, `MAX_BRICKS`, dangerous `brickTypes` keys, and `unbreakable + explosive`. Re-implementing it guarantees drift. |
| Checking reachability in the test | A second flood-fill | `checkSolvability` from `src/core` **and** `scripts/lib/levelSolvability.mjs` | Two implementations already exist and are parity-pinned by R-16. A third would need a third parity test. |
| Measuring authored weight | A new brick/HP counter | `levelStatics` (`tests/helpers/balanceBot.ts:172`) | E2 locked this as *the* definition, including "steel excluded". A second definition means the generator could be monotone under one and not the other. |
| Proving a board is beatable | A heuristic "looks fine" check | `runBot` (`tests/helpers/balanceBot.ts:108`) | Plays the real `stepRun`. ~20 ms/board. |
| A seeded PRNG | Anything novel | mulberry32 (4 lines, copied from `src/core/rng`) | Already the repo's PRNG; integer-only; trivially portable. |
| Unbiased `randBelow(n)` | `Math.floor(rand01() * n)` | u32 rejection sampling (§Q5) | Avoids float entirely — and see the `>>> 0` overflow trap. |
| Compiling to the sim | A custom packer | `loadAndCompile` → `applyCompiledLevel` | Handles `BrickFlags`, the lattice pitch and the spatial broadphase. Verified this session that generated boards keep the lattice path (`gridCols 10 / gridRows 16 / pitch 36 / 16`), not the 1-row fallback. |
| Enforcing monotonicity | Hand-tuned constants | `envelope()` cumulative max (§Q4) | Makes monotonicity structural, so a future tuner cannot break it with a number edit. |

**Key insight:** the schema, the validator, the lint, the CI twin, the weight definition and the
headless bot were *all* built in earlier phases and are all directly consumable by a plain
object. The generator's entire job is to emit an object those six things already agree about.
Any task in the plan that re-implements one of them is building a second source of truth for a
contract that already has one — which is precisely how `level-04`/`level-05` shipped clipped.

---

## Common Pitfalls

### Pitfall 1: `runBot` and `levelStatics` cannot see a generated board

**What goes wrong:** both helpers take a `levelId: string` and `readLevelFile(id)` from
`assets/levels/${id}.json` [VERIFIED: tests/helpers/balanceBot.ts:32-34 —
`return JSON.parse(readFileSync(join(levelsDir, \`${id}.json\`), 'utf8')) as LevelFileV1;`, and
line 112 `const compiled = loadAndCompile(readLevelFile(levelId));`, line 173
`const raw = readLevelFile(id);`]. A generated board has no file, so neither helper can be
called without writing a temp file — which would be non-deterministic, slow and filesystem-bound.
**Why it happens:** E2 only ever needed to measure shipped assets.
**How to avoid:** refactor both to an object-taking core with an id-taking wrapper, e.g.
`levelStaticsOf(raw: LevelFileV1, scoreHit: number)` with `levelStatics(id, scoreHit) =
levelStaticsOf(readLevelFile(id), scoreHit)`, and the same split for `runBot` /
`runBotOnLevel(raw, opts)`. This is a **test-helper** change (`tests/` is outside `src/core`),
so it does not touch the "core is untouched" lock — but it **will** re-run
`tests/balance.curve-e2.test.ts`, so the refactor must be behaviour-preserving and that test
must stay green. Make it its own plan task with that test named as the verification.
**Warning signs:** a plan task that writes a generated board to `assets/levels/` "just for the
test." That would also break `scripts/assert-level-solvability.mjs`, which sweeps
`assets/levels/*.json` and requires exactly `level-02.json` to fail.

### Pitfall 2: unbiased-modulo rejection sampling hangs on powers of two

**What goes wrong:** `const lim = (4294967296 - (4294967296 % n)) >>> 0;` — for power-of-two `n`
the modulo is 0, so `lim = 2**32 >>> 0 = 0`, and `while (u < lim)` never exits.
**Why it happens:** `>>> 0` is the reflex for "make this a u32", but `2**32` is exactly the value
it maps to 0.
**How to avoid:** drop the `>>> 0`; `lim` is a plain Number and the comparison works.
**Warning signs:** the suite hangs rather than fails. Fisher-Yates calls `below(rng, i+1)` with
`n = 2, 4, 8, 16…` on every shuffle, so this is a *guaranteed* hang, not a rare one.
[VERIFIED: reproduced and fixed this session — the first sweep run timed out at 120 s.]

### Pitfall 3: a shared `brickTypes` / `grid` object silently breaks N-GEN-01

**What goes wrong:** returning a module-level constant by reference. One caller mutating it
changes every subsequent board. Determinism dies with no error.
**How to avoid:** spread a fresh object per call (Pattern 1). Optionally `Object.freeze` the
template so a mutation throws in strict mode instead of corrupting silently.
**Warning signs:** the determinism test passes in isolation and fails when the sweep test runs
first, or vice versa — an ordering-dependent failure.

### Pitfall 4: mirroring after the invariant check

**What goes wrong:** build a safe half, mirror it, ship an unsolvable board. Proven in §Q2 with
20 unreachable breakables.
**How to avoid:** set both cells of the pair, *then* flood the full board.
**Warning signs:** the sweep fails on high-difficulty boards only (more steel ⇒ more chances to
span the seam). A sweep that only samples low difficulty would miss it entirely — another reason
to enumerate all 21 difficulties for every seed.

### Pitfall 5: an unregistered `src/` folder is silently exempt from the layer matrix

**What goes wrong:** `eslint.config.js` declares `boundaries/elements` for `core, runtime,
render, app, input, vfx, services` only, with `boundaries/dependencies` `default: 'disallow'`.
A file under a *new* folder matches no element. Probed this session:

- `src/levelgen/__probe.ts` importing `src/core/levels/schema` → **no error**
- `src/services/storage/__probe2.ts` importing `src/levelgen/__probe` → **no error**
- `src/runtime/__probe3.ts` importing `src/levelgen/__probe` → **no error**
- `src/runtime/__probe3.ts` importing `src/services/storage/catalog` → **error**:
  `There is no policy allowing dependencies from elements of type "runtime" to elements of type "services"`

[VERIFIED: executed `npx eslint` on all four probes this session; probe files removed, `git status --porcelain` clean]

So the rule *is* live, and the new folder *is* invisible to it (`boundaries/no-unknown-files`
and `boundaries/no-unknown-dependencies` are both `0` in
`eslint-plugin-boundaries`'s recommended config, which this repo spreads).
**Why it matters:** a generator that is exempt from the layer matrix could import `react-native`
or `runtime` with nothing to stop it — the exact failure mode ARCH-01 exists to prevent.
**How to avoid:** register it explicitly.

```js
// eslint.config.js — settings['boundaries/elements']
{ type: 'levelgen', pattern: 'src/levelgen/**' },

// rules['boundaries/dependencies'].policies — add:
{ from: { element: { type: 'levelgen' } },
  allow: { to: { element: { types: { anyOf: ['levelgen', 'core'] } } } } },
// and widen app + services to reach it:
//   app      → [..., 'levelgen']
//   services → [..., 'levelgen']
```

Also add a `docs/layer-contract.md` row (next free id is **LC-15**) so the crossing is locked in
prose as well as in config, matching how every other crossing is recorded.
**Warning signs:** a plan that creates `src/levelgen/` with no `eslint.config.js` task.

### Pitfall 6: floats in the difficulty curves

**What goes wrong:** `Math.pow`/`**`/trig are implementation-approximated
[CITED: https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-implementation-approximated];
a last-bit difference crossing a `Math.floor` boundary changes a count, which changes the board.
**How to avoid:** integer lerps only (§Q4). Add `Math.pow`, `Math.sin`, `Math.cos`, `Math.exp`,
`Math.log` and the `**` operator to a `no-restricted-syntax`/`no-restricted-properties` block for
`src/levelgen/**`.
**Warning signs:** none locally — this only manifests on a different engine, which is exactly
why the lint rule is worth more than a test here.

### Pitfall 7: the sweep test silently shrinks

**What goes wrong:** someone drops `N` from 1 000 to 20 to speed up a watch loop and never puts it
back. The "large sweep" in SC-2 quietly becomes "a handful of samples" — the precise thing the
success criterion forbids.
**How to avoid:** export `SWEEP_SEEDS` as a named constant and assert on it
(`expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000)`), and log the board count. At 0.04 ms/board
there is no performance argument for shrinking it.
**Warning signs:** a sweep test that finishes in under 100 ms.

### Pitfall 8: assuming the `level-04`/`level-05` bounds bug is still live

**What goes wrong:** a plan task to "fix the clipped levels." Both compute `right = 358` today.
**How to avoid:** the generator's obligation is to make the failure class *impossible going
forward*, which the fixed grid (D-02) plus a bounds assertion over the sweep already does.

---

## Code Examples

### Verified: the exact bounds expression the sweep must use

```ts
// Source: tests/balance.curve-e2.test.ts:56-68 (the campaign guard — mirror it exactly)
const LOGICAL_W = 360;
const LOGICAL_H = 640;
const { grid } = level;
const right  = grid.originX + (grid.cols - 1) * (grid.brickW + grid.gapX) + grid.brickW;
const bottom = grid.originY + (grid.rows - 1) * (grid.brickH + grid.gapY) + grid.brickH;
expect(grid.originX).toBeGreaterThanOrEqual(0);
expect(grid.originY).toBeGreaterThanOrEqual(0);
expect(right).toBeLessThanOrEqual(LOGICAL_W);
expect(bottom).toBeLessThanOrEqual(LOGICAL_H);
```

Use `LOGICAL_WIDTH` / `LOGICAL_HEIGHT` from `src/core/constants.ts:17,20` rather than local
literals, so a future playfield change propagates.

### Verified: the sweep skeleton (all values below appear in the verbatim quotes above)

```ts
import { describe, it, expect } from 'vitest';
import {
  validateLevel, loadAndCompile, checkSolvability,
  LOGICAL_WIDTH, LOGICAL_HEIGHT, SCORE_HIT,
} from '../src/core';
import { generate, D_MAX, SCHEDULE } from '../src/levelgen';
import { levelStaticsOf } from './helpers/balanceBot';

export const SWEEP_SEEDS = 1000;

describe('N-GEN-02 / N-GEN-03 — generated board contract sweep', () => {
  it(`holds over ${SWEEP_SEEDS * (D_MAX + 1)} boards`, () => {
    expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000);   // Pitfall 7
    for (let s = 0; s < SWEEP_SEEDS; s++) {
      for (let d = 0; d <= D_MAX; d++) {
        const L = generate(s, d);
        const v = validateLevel(L);
        expect(v.ok, `validate s=${s} d=${d}`).toBe(true);
        if (!v.ok) continue;

        expect(loadAndCompile(L).ok, `compile s=${s} d=${d}`).toBe(true);

        const sol = checkSolvability(v.value);
        expect(sol.unreachableBreakables, `reachability s=${s} d=${d}`).toEqual([]);

        const st = levelStaticsOf(v.value, SCORE_HIT);
        expect(st.bricks,  `bricks s=${s} d=${d}`).toBe(SCHEDULE[d].bricks);   // exact, not >=
        expect(st.totalHp, `hp s=${s} d=${d}`).toBe(SCHEDULE[d].totalHp);

        for (const row of L.cells) {
          expect(row.length).toBe(L.grid.cols);
          expect(row).toBe([...row].reverse().join(''));    // D-01 mirror
        }
      }
    }
  }, 30_000);
});
```

### Verified: `E` and `'1'` are weight-identical (the D-08 correction)

```ts
// Source: tests/helpers/balanceBot.ts:179-191 — quoted verbatim
for (const row of raw.cells) {
  for (const ch of row) {
    if (ch === '.') continue;
    const def = raw.brickTypes[ch];
    if (def == null) continue;
    if (def.unbreakable === true) { steel++; continue; }   // steel: zero weight (D-08 ✓)
    bricks++;
    totalHp += def.hp;                                     // E has hp 1, same as '1'
    if (def.explosive === true) explosive++;
  }
}
```

With `"E": { "hp": 1, "explosive": true }`, swapping `E ↔ '1'` moves `explosive` and nothing
else. Verified across 63 000 boards: 0 changed `bricks` or `totalHp`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bounds asserted for `level-03` only | Asserted for every `PLAYABLE_LEVEL_ORDER` entry | E2 (2026-09-25) | The generator must add the equivalent over its sweep, not rely on the campaign guard. |
| Difficulty = file-name order | Difficulty = `PLAYABLE_LEVEL_ORDER`, monotone in bricks and HP, pinned by test | E2 | `levelStatics` is the locked weight definition the generator must match. |
| `E` shipped but placed in zero levels | `E` on a teaching curve across `03`–`06` | E1b (2026-09-25) | Establishes the campaign's explosive ceilings the generator should respect: ≤ 4 per board, max 8-connected cluster 4. |
| Solvability lint only in TypeScript | Lint has a `.mjs` CI twin, parity-pinned (R-16) | Phase 4 | The generator sweep should run through **both** to keep the parity discipline meaningful. |

**Deprecated/outdated for this phase:**
- Nothing. The level schema is at `SCHEMA_VERSION = 1` [VERIFIED: src/core/levels/schema.ts:10 —
  `export const SCHEMA_VERSION = 1 as const;`] with a migrations directory in place
  (`src/core/levels/migrations/`), and this phase introduces **no schema change**.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | running the sweep + CI scripts | ✓ | v25.6.0 (`engines: ">=24 <25"` in package.json — see note) | — |
| vitest | all tests | ✓ | 5.0.1 | — |
| typescript | `npm run typecheck` | ✓ | ~6.0.3 | — |
| eslint + eslint-plugin-boundaries | layer registration | ✓ | ^9.39.5 / ^7.2.0 | — |
| fast-check | not used (see §Q6) | ✓ | 4.10.2 | n/a |
| Expo SDK / device build | **not required by this phase** | n/a | 57 | Hermes determinism probe (A1) can ride on any existing dev build |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

> **Note for the planner (not a blocker):** the installed Node is **v25.6.0** while
> `package.json` declares `"engines": { "node": ">=24 <25" }` and `.nvmrc` pins a version. This
> mismatch predates the phase and did not affect any measurement here (the whole suite ran
> green). Flag it, do not fix it in this phase.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` 5.0.1 (`environment: 'node'`) |
| Config file | `vitest.config.ts` (include: `src/core/**/*.test.ts`, `tests/**/*.test.ts`, `tests/**/*.test.tsx`) |
| Quick run command | `npx vitest run tests/levelgen.sweep.test.ts` |
| Full suite command | `npm test` (= `vitest run` + `assert-worklet-closures` + `assert-level-solvability` + `assert-eas-profiles` + `assert-brand-name`) |

New test files land in `tests/` and are picked up by the existing glob — no config change.
The new CI script must be appended to the `test` script chain in `package.json`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| **N-GEN-01** | `generate(s,d)` returns a `LevelFileV1`; two calls are `JSON.stringify`-identical | unit | `npx vitest run tests/levelgen.determinism.test.ts` | ❌ Wave 0 |
| **N-GEN-01** | A fixed 4 200-board corpus hashes to a pinned SHA-256 (cross-process byte-identity) | unit | `npx vitest run tests/levelgen.determinism.test.ts -t 'golden hash'` | ❌ Wave 0 |
| **N-GEN-01** | Generator reads no ambient state (`Math.random`/`Date.now`/`performance.now` banned in `src/levelgen/**`) | lint | `npx eslint src/levelgen` | ❌ Wave 0 (eslint rule) |
| **N-GEN-02** | Every swept board passes `validateLevel` and `loadAndCompile` | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **N-GEN-02** | `checkSolvability(level).unreachableBreakables` is `[]` for every swept board | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **N-GEN-02** | The `.mjs` CI twin agrees over the sweep (R-16 parity discipline) | integration | `node scripts/assert-generated-solvability.mjs` | ❌ Wave 0 |
| **N-GEN-02** | `right ≤ 360` and `bottom ≤ 640` using the `balance.curve-e2` expression | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **N-GEN-03** | `SCHEDULE[d].bricks` and `.totalHp` are non-decreasing over `0..D_MAX` | unit | `npx vitest run tests/levelgen.schedule.test.ts` | ❌ Wave 0 |
| **N-GEN-03** | `levelStaticsOf(generate(s,d))` **equals** `SCHEDULE[d]` for every swept `(s,d)` — weight is seed-independent | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **N-GEN-03** | Only `1/2/3/E/X/.` appear in `cells`; `brickTypes` matches the E1b definitions exactly | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **N-GEN-03** | Max 8-connected explosive cluster ≤ 4 on every swept board | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ Wave 0 |
| **SC-1** | `generate` is pure — no filesystem, no network, no clock | unit + lint | `npx vitest run tests/levelgen.determinism.test.ts` · `npx eslint src/levelgen` | ❌ Wave 0 |
| **SC-6** | Generation never runs on the worklet; `src/levelgen/**` contains no `'worklet'` directive and imports nothing from `runtime`/`render`/RN | lint | `npx eslint src/levelgen` · `node scripts/assert-worklet-closures.mjs` | ❌ Wave 0 (eslint element) |
| **SC-6 / "core untouched"** | `git diff --name-only <base> -- src/core` is empty | gate | `test -z "$(git diff --name-only origin/main...HEAD -- src/core)"` | ❌ Wave 0 |
| **Quality (SC-2 backstop)** | A stratified sample of generated boards is actually winnable | integration | `npx vitest run tests/levelgen.winnability.test.ts` | ❌ Wave 0 |
| **Regression** | The campaign contract is unchanged by the `balanceBot` refactor | unit | `npx vitest run tests/balance.curve-e2.test.ts` | ✅ exists |
| **Regression** | R-16 parity still holds | unit | `npx vitest run tests/levels.solvability-parity.test.ts` | ✅ exists |

### How each ROADMAP success criterion is observable

| SC | Criterion | Observable as |
|----|-----------|---------------|
| 1 | pure, byte-identical across processes | `JSON.stringify` equality on repeat calls **+** a pinned SHA-256 over a fixed corpus **+** an eslint ban on ambient inputs. Confirmed feasible: three `node` processes produced the identical digest. |
| 2 | passes `checkSolvability`, large sweep | `unreachableBreakables` is `[]` over ≥ 21 000 boards, through **both** lint implementations. Confirmed feasible: 105 000 boards, 0 failures, 3.4 s. |
| 3 | fits 360×640 | The `balance.curve-e2` bounds expression asserted per board. Trivially true for a frozen grid, but asserted per board so a future grid edit is caught. |
| 4 | difficulty is monotone in authored weight | Two assertions: the schedule table is monotone, **and** every generated board's `levelStatics` equals the schedule exactly. The second is what makes the first meaningful. |
| 5 | shipped verbs only + Mid particle budget | Char-set assertion + `brickTypes` deep-equality + max 8-connected `E` cluster ≤ 4 (⇒ peak explosive destroy sparks 60, +12 for the triggering break = 72 < `particleCap` 128). |
| 6 | nothing on the render/sim hot path | Three checks: `src/levelgen/**` contains no `'worklet'`; `assert-worklet-closures.mjs` stays green; **`git diff -- src/core` is empty**. The last is the strongest single proof that the hot path is untouched. |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/levelgen.*.test.ts` (target < 5 s)
- **Per wave merge:** `npx vitest run && npx tsc --noEmit && npx eslint src/levelgen`
- **Phase gate:** full `npm test` green (including the new
  `assert-generated-solvability.mjs`), plus `git diff --name-only -- src/core` empty, before
  `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/levelgen/` module skeleton (`index.ts`, `generate.ts`, `grid.ts`, `schedule.ts`, `rng.ts`, `reachability.ts`)
- [ ] `eslint.config.js` — register the `levelgen` boundaries element + policies, and copy the `no-restricted-syntax` ambient-input block (extended with `Math.pow`/`**`/trig)
- [ ] `docs/layer-contract.md` — add the **LC-15** row for `levelgen → core`
- [ ] `tests/helpers/balanceBot.ts` — object-accepting `levelStaticsOf` / `runBotOnLevel`, with `tests/balance.curve-e2.test.ts` unchanged and green
- [ ] `tests/levelgen.sweep.test.ts` — covers N-GEN-02, N-GEN-03, SC-3, SC-5
- [ ] `tests/levelgen.determinism.test.ts` — covers N-GEN-01, SC-1 (incl. the golden SHA-256)
- [ ] `tests/levelgen.schedule.test.ts` — covers N-GEN-03 monotonicity
- [ ] `tests/levelgen.winnability.test.ts` — SC-2 quality backstop via the bot
- [ ] `scripts/assert-generated-solvability.mjs` + a `package.json` `test` chain entry
- [ ] *(optional, recommended)* `docs/ops/BOARD-GENERATOR.md` — record the Lemma/Theorem, the schedule table, and the Hermes probe result, matching the `docs/ops/*` idiom

*(No framework install needed — vitest is already configured and the new files match the existing include globs.)*

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section is
included. The phase's attack surface is very small — no network, no user input, no
persistence — but two ASVS categories genuinely apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No identity in this phase. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | No privileged operation. |
| **V5 Input Validation** | **yes** | `difficulty` and `seed` are the only inputs. Clamp `difficulty` to `[0, D_MAX]` with `Math.max/min` on a `| 0`-coerced value (never trust a caller — Phase 11 will feed a wave counter that could overflow past `D_MAX`, and Phase 12 a date-derived value). Normalise `seed` through `hashSeed` so a non-integer, negative or `> 2^32` value cannot produce a `NaN` PRNG state. `validateLevel` is the fail-closed gate on the **output** and must be exercised over the whole sweep, not sampled. |
| V6 Cryptography | no | The PRNG is a *deterministic* generator, explicitly **not** a CSPRNG. Document that in the module header so nobody later reuses `src/levelgen/rng.ts` for a token or a nonce — that is the realistic misuse here, and a comment is the cheapest control. |
| V12 Files & Resources | marginal | The generator performs no filesystem I/O. Keep it that way: any `readFileSync` in `src/levelgen/**` would break both purity and portability to Hermes (no `node:fs` on device). |

### Known Threat Patterns for a pure TypeScript generator in a React Native app

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype pollution via a `brickTypes` key | Tampering | Already mitigated upstream: `validateLevel` rejects `__proto__` / `constructor` / `prototype` and builds on `Object.create(null)` [VERIFIED: src/core/levels/validate.ts:18,118-133]. The generator emits a fixed 5-key set, so it cannot introduce one — but the sweep running through `validateLevel` keeps that guarantee live. |
| Unbounded loop / DoS from a hostile difficulty value | Denial of Service | Clamp `difficulty`; every loop in the generator is over a fixed-length candidate list. No `while (!ok)` anywhere — this is also what D-03 demands. |
| Integer overflow producing `NaN` PRNG state | Tampering | All PRNG arithmetic stays in int32 via `Math.imul` / `| 0` / `>>> 0`. A `NaN` seed would propagate silently; `hashSeed` normalises first. Worth one unit test with `NaN`, `-1`, `1e20` and `''` as seeds. |
| Memory exhaustion from an oversized grid | Denial of Service | Grid is frozen and `cols*rows = 160 ≤ MAX_BRICKS 256`; `validateLevel` enforces the cap independently. |
| PRNG mistaken for a CSPRNG in a later phase | Information Disclosure | Module-header warning + a name that does not read as security (`makeRng`, not `secureRandom`). |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| **A1** | Hermes (the RN 0.86 / Expo 57 engine) produces byte-identical `generate` output to Node/V8. | §Q5, N-GEN-01 | **Medium-high.** Byte-identity was measured only in Node v25 across three processes; **no Hermes observation was made in this session** and none is available from the sources consulted. The reasoning is spec-based (int32 ops and IEEE-754 `+ - * /` are exactly specified) and the design deliberately avoids implementation-approximated `Math` functions, but that is an inference, not evidence. If wrong, the daily challenge (Phase 12) would hand different boards to device and CI. **Falsification (cheap, and the plan should include it):** add a `__DEV__`-only screen or log that hashes the same fixed corpus on device and compares against the pinned SHA-256. If the digests differ, the generator is not cross-engine deterministic and the cause is findable by bisecting the corpus. |
| **A2** | ECMAScript's §4.4.1 "implementation-approximated" covers `Math.pow`/`**`/trig, permitting last-bit divergence between engines. | §Q5, §Pitfall 6 | **Low.** The term and section exist [CITED: tc39.es §4.4.1] but neither the exact spec wording nor the MDN page could be retrieved this session (both fetches returned only a table of contents / no such statement). The *recommendation* — integer-only curves — is correct and free regardless of whether the divergence is real, so the risk is a slightly over-strict lint rule, not a defect. |
| **A3** | Difficulty is an integer `0..20`. | §Q4 | **Low, but it is a user-facing API decision.** CONTEXT explicitly leaves "the difficulty scale itself — integer waves, a normalised 0..1, or both" to Claude's discretion. Integer is recommended because it makes the schedule a literal table and monotonicity an inspectable integer property; a `0..1` float scale would reintroduce float sensitivity at the `Math.floor` boundary (Pitfall 6). If Phase 11 wants more than 21 waves, `D_MAX` is one constant — but the *number* of distinct boards is what changes, not the contract. Worth confirming with the user before locking. |
| **A4** | The specific dial constants (density 420→800‰, hp3 0→340‰, hp2 180→380‰, explosive 260→40‰, steel 0→7 per half) produce a good *feel*. | §Q4 | **Low technical / medium product.** They are calibrated only against the campaign's *authored weight* range and a perfect-bot clear time (47–223 s), not against human play. `docs/ops/BALANCE-E2.md` notes the owner playtest cohort was skipped, so there is no human baseline to calibrate against anyway. Treat these as a starting point Phase 11 re-tunes; ensure no test pins the literal numbers (Pitfall 7's sibling). |
| **A5** | Placing the generator in a new `src/levelgen/` layer (rather than `src/services/levels/`) is the right call. | §Architectural Responsibility Map | **Low.** Both work. `src/levelgen/` names the concept and forces the boundaries registration that closes a verified governance hole; `src/services/levels/` needs zero config change but files domain logic under a folder that otherwise means "platform seam". Planner's call. |
| **A6** | The corridor-warning elimination rule ("no orthogonally adjacent steel") is desirable. | §Q3 | **Very low.** Warnings are non-blocking and the campaign carries 2–8 of them. Adopting the rule is optional polish; skipping it changes nothing about SC-1..SC-6. |

---

## Open Questions

1. **Should `generate` accept `string | number` for `seed`, or `number` only?**
   - What we know: Phase 12 needs a date-derived seed; `hashSeed` handles both with integer-only FNV-1a at zero cost.
   - What's unclear: whether Phase 12 would rather own the date→u32 mapping itself (it is Phase 12's deferred decision per CONTEXT).
   - Recommendation: accept `number | string`, normalise internally, and document that Phase 12 may pass either. It costs 6 lines and avoids a signature change later.

2. **Does the difficulty band anchor at the top of the grid or the bottom?**
   - What we know: the prototype anchors at the top (rows `0..rowsUsed-1`), which matches every shipped level and keeps the lower playfield clear.
   - What's unclear: whether Phase 14's mode shell wants low-difficulty boards visually centred.
   - Recommendation: top-anchor. It is the campaign's look, it maximises the ball's travel space, and it is one constant to change later.

3. **Should the `.mjs` CI sweep duplicate the vitest sweep, or use a smaller N?**
   - What we know: the `.mjs` sweep runs at 0.033 ms/board, so 21 000 boards cost ~0.7 s — negligible in `npm test`.
   - What's unclear: whether the maintainer wants `npm test` to stay under a wall-clock target.
   - Recommendation: run the same N in both. The parity value comes from *both* implementations seeing the same corpus.

4. **How should a steel-budget shortfall be surfaced, if it ever occurs?**
   - What we know: 0 shortfalls in 105 000 boards; a shortfall is weight-safe by D-08.
   - What's unclear: whether silence is acceptable, or whether the sweep should assert `steel === budget`.
   - Recommendation: assert `steel <= budget` (always true) and additionally record the observed shortfall count in the sweep's `console.log`. Asserting strict equality would make a harmless, correct outcome fail the suite.

---

## Sources

### Primary (HIGH confidence — read or executed in-repo this session)

- `src/core/levels/solvability.ts` — `isPassable` / `isSteel` / `isBreakable` (37-53), flood seed + 4-neighbour set (156-174), `MIN_BALL_CORRIDOR` (13), corridor width formulas (59-78)
- `src/core/levels/schema.ts` — `SCHEMA_VERSION`, `LevelFileV1`, `BrickTypeDef`, `CompiledLevel`
- `src/core/levels/validate.ts` — dangerous keys (18), `MAX_BRICKS` gate (106-114), `unbreakable + explosive` rejection (158-166), unknown-char rejection (207-214)
- `src/core/levels/load.ts`, `compile.ts`, `spatial.ts` (`cellToBrick.length` gate, 31)
- `src/core/constants.ts` — `LOGICAL_WIDTH` 360, `LOGICAL_HEIGHT` 640, `BALL_RADIUS` 6, `SEPARATION_EPS` 1e-4, `MAX_BRICKS` 256
- `src/core/allocate.ts:66` — `cellToBrick = new Int16Array(maxBricks)`
- `src/core/rng/mulberry32.ts` — the algorithm and its World-slot signature
- `src/vfx/types.ts:7,11,12` · `src/vfx/particles.ts:66-67` · `src/vfx/consumeEvents.ts:113-115` · `src/runtime/resolveQualityTier.ts:22-24` — the exact particle arithmetic
- `tests/helpers/balanceBot.ts` — `levelStatics` (172-203), `runBot` (108-158), `readLevelFile` (32-34)
- `tests/balance.curve-e2.test.ts` — the bounds expression (56-68) and the monotone-weight guard
- `tests/levels.solvability-parity.test.ts` · `scripts/assert-level-solvability.mjs` · `scripts/lib/levelSolvability.mjs` — the R-16 twin discipline
- `assets/levels/level-01.json` … `level-06.json` — all six, with statics/bounds/symmetry/E-cluster recomputed
- `eslint.config.js` + four executed `npx eslint` boundary probes (probe files removed; tree verified clean)
- `docs/ops/LEVEL-VERBS-E1b.md` · `docs/ops/EXPLOSIVE-BRICKS.md` · `docs/ops/BALANCE-E2.md` · `docs/layer-contract.md`
- **Executed experiments** (scratchpad, not committed): mirror-enclosure counterexample; diamond counterexample; 105 000-board generator sweep; 8 400-board full-TS-pipeline sweep; 63 000-board E-cluster-cap and corridor-warning studies; 15-board `runBot` timing; 3-process SHA-256 determinism check

### Secondary (MEDIUM confidence)

- `tc39.es/ecma262` §4.4.1 "implementation-approximated" — section confirmed to exist; exact wording not retrievable via the available fetcher

### Tertiary (LOW confidence — marked for validation)

- WebSearch summary asserting V8 / JavaScriptCore / SpiderMonkey differ in the last bit on `Math.pow`. Not corroborated by a primary source this session (the MDN page does **not** state it). Recorded as **A2**; the recommendation it supports is free insurance either way.
- MDN `Math.pow` page — fetched, and found **not** to contain any implementation-variance statement. Recorded as a negative result rather than as support.

---

## Metadata

**Confidence breakdown:**

- **Standard stack: HIGH** — zero new dependencies; every module named was read in the repo this session and its role verified by execution.
- **Architecture: HIGH** — the reachability theorem is proved from the verbatim source of `isPassable`, and both plausible-but-wrong alternative rules were falsified by executing the real lint. The mirror hazard was demonstrated, not asserted.
- **Difficulty curves: HIGH (mechanism) / MEDIUM (constants)** — the monotonicity *mechanism* (exact counts + running-max envelope) is verified over 105 000 boards with 0 mismatches. The specific constants are a calibrated starting point (A4).
- **Pitfalls: HIGH** — Pitfalls 1, 2, 4, 5 and 8 were each reproduced or verified directly this session. Pitfall 6 rests on A2.
- **Cross-engine determinism: MEDIUM** — Node/V8 byte-identity measured across three processes; **Hermes unmeasured** (A1) and carried as an explicit on-device falsification task.

**Research date:** 2026-09-25
**Valid until:** 2026-10-25 (30 days — the contract surface is in-repo and stable; the only external claim, A2, does not change)
