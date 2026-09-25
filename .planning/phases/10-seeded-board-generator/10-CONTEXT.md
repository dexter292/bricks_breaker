# Phase 10: Seeded Board Generator - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

A board can be generated from a seed and a difficulty number, and is as safe to play as a
hand-authored one.

**Delivers (N-GEN-01, N-GEN-02, N-GEN-03):**
- `generate(seed, difficulty)` — pure, byte-identical output for identical arguments
- Every generated board passes `checkSolvability` and fits the 360×640 playfield
- `difficulty` is a single monotone input over authored weight (brick count + total HP)
- Shipped verbs only; Mid particle budget respected

**Does not deliver (this phase):**
- Endless wave loop (**Phase 11**), daily challenge (**Phase 12**)
- Any UI, mode select or preview (**Phase 14**)
- New brick types, new verbs, schema changes
- Persisting generated boards — they are derived from (seed, difficulty), never stored

</domain>

<decisions>
## Implementation Decisions

### Board character
- **D-01: Left–right symmetric.** Generate the left half and mirror it. All five authored
  levels are symmetric, so generated boards sit in the same visual family as the campaign,
  and the space the generator can get wrong is halved.

### Geometry
- **D-02: One fixed grid.** A single `cols/rows/brickW/brickH/gapX/gapY` set, proven once to
  fit 360×640. Difficulty changes only cell **content**, never the lattice.
  Rationale: `level-04`/`level-05` shipped 4 units too wide and no test caught it because
  bounds were only asserted for `level-03`. A fixed, proven grid removes that failure class
  from the generator entirely rather than re-proving it per difficulty.

### Safety
- **D-03: Structurally incapable of failing the lint.** Constrain steel placement inside the
  algorithm — never enclose a breakable cell on all approachable sides — so
  `checkSolvability` passes *by construction*. The lint stays as an assertion over a wide
  seed sweep (a safety net), not as a filter the generator retries against.
  Rejected: generate-and-repair. It adds a loop whose termination must be proved, and a
  retry-on-new-seed variant would break the "same seed ⇒ same board" contract of N-GEN-01.

### Difficulty dials
Difficulty turns four dials at once:
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

### Post-research corrections (2026-09-25, after 10-RESEARCH.md)

The decisions above stand. Two of the things I said *about* them were wrong, and the
planner must work from the corrected version:

- **D-08's premise is false.** I wrote that thinning explosive removes authored weight. It
  does not, provided `E` is carved out of the hp1 budget: `E` is `{ hp: 1, explosive: true }`
  and `1` is `{ hp: 1 }`, so demoting one to the other is weight-identical. Research
  confirmed it empirically — 0 of 63 000 boards changed weight under demotion. So the
  explosive dial is weight-**neutral**, not weight-negative, and monotonicity is easier than
  D-08 claimed. The density and HP dials still own it; the steel part of D-08 is still right
  (steel is unbreakable, so it contributes zero weight).

- **D-03 is one constraint, not four.** `isPassable` returns true for empty *and* breakable
  cells, so reachability depends on the **steel mask alone** — density, HP mix and explosive
  are provably solvability-neutral. The invariant to maintain is content-free: *every
  non-steel cell is 4-reachable from the bottom row*.

- **Mirroring is the dangerous step, not the placement.** Research falsified two plausible
  steel rules against the real lint, and showed a half-board with zero unreachables producing
  **20 unreachable breakables once mirrored**. The invariant must be checked on the **full**
  board after both cells of a mirrored pair are set — never on the half.

### Discretion now exercised (was Claude's call in this document)

- **Difficulty is an integer `0..20`.** Chosen so the dial schedule is a literal table and
  monotonicity is an inspectable integer property; a normalised float scale would reintroduce
  a `Math.floor` boundary sensitivity across engines. `D_MAX` is one constant if Phase 11
  wants a longer ladder.
- **`generate` accepts `number | string` for `seed`**, normalised internally, so Phase 12 can
  pass a date string without a signature change.
- **Boards are top-anchored** in the grid, matching every shipped level and keeping the lower
  playfield clear.

### Carried into the plan as a required task, not an assumption

Research assumption **A1** — that Hermes produces byte-identical output to Node — is
**unmeasured**. Byte-identity was verified across Node processes only. If it is false, Phase
12's daily challenge would hand different boards to device and CI, which is the exact failure
the daily mode cannot tolerate. The plan must include the cheap on-device falsification
(hash a fixed corpus on device, compare against a pinned digest), not carry it as an
assumption.

### Carried forward (already locked — do not re-litigate)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` § "Phase 10: Seeded Board Generator" — goal + 6 success criteria
- `.planning/REQUIREMENTS.md` § "v1.2 Requirements" → N-GEN-01, N-GEN-02, N-GEN-03

### The contract a generated board must satisfy
- `src/core/levels/schema.ts` — `LevelFileV1`, `BrickTypeDef`, `SCHEMA_VERSION`
- `src/core/levels/validate.ts` — structural validation; rejects `unbreakable + explosive`
- `src/core/levels/solvability.ts` — `checkSolvability`, `MIN_BALL_CORRIDOR`; flood-fill from
  below through empty **and breakable** cells, steel blocks
- `scripts/lib/levelSolvability.mjs` + `scripts/assert-level-solvability.mjs` — the CI twin
  that must stay in sync (R-16 parity test)

### What "as safe as hand-authored" means in practice
- `assets/levels/level-01.json` … `level-06.json` — the five ship boards and the `level-02`
  negative fixture; note every ship board is symmetric
- `tests/balance.curve-e2.test.ts` — the playfield bounds guard and the monotone-weight
  guard the generator needs equivalents of
- `tests/helpers/balanceBot.ts` — `levelStatics` (the authored-weight definition) and the
  headless bot that can prove a generated board is actually winnable
- `docs/ops/LEVEL-VERBS-E1b.md` — the shipped verb set and why `level-01` carries no `E`
- `docs/ops/BALANCE-E2.md` — how difficulty was measured, and the curve the campaign uses
- `docs/ops/EXPLOSIVE-BRICKS.md` — cascade rules and the Mid particle budget

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `checkSolvability` is already pure and takes a `LevelFileV1` — the generator can assert
  against it directly in tests with no adapter.
- `levelStatics(id, scoreHit)` in `tests/helpers/balanceBot.ts` computes brick count, total
  HP, steel and explosive counts from a level file. The monotonicity assertion should reuse
  its definition rather than inventing a second notion of weight.
- `runBot()` in the same helper can play a generated board headlessly to prove winnability —
  a stronger claim than "the lint passed".
- `src/core/rng/` — the existing seeded streams, if a core-free PRNG is not preferred.

### Established Patterns
- Levels are plain JSON matching `LevelFileV1`; `loadAndCompile` is the single entry point
  from raw object to `CompiledLevel`.
- Assert scripts wired into `npm test` are this repo's idiom for contract guards; the
  solvability gate already runs there.
- Tests in this repo assert against **real assets** where possible (`levels.verb-curve-e1b`),
  not synthetic fixtures — a generated-board sweep fits that idiom.

### Integration Points
- Phase 11 (endless) will call `generate(seed, waveDifficulty)` per wave; Phase 12 (daily)
  will call it with a date-derived seed. Both need the purity guarantee, so the signature
  and determinism contract are the real deliverable, not the aesthetics.
- `PLAYABLE_LEVEL_ORDER` and the campaign are untouched — generated boards never enter the
  campaign catalog.

</code_context>

<specifics>
## Specific Ideas

- The symmetry decision is partly a bug-surface decision, not only an aesthetic one: half the
  board is a mirror, so half the placement logic cannot independently be wrong.
- D-07 inverts the obvious reading of "explosive is a hazard". In this game it is help, and
  the campaign teaches it that way (E1b) — so the generator must not treat it as difficulty.

</specifics>

<deferred>
## Deferred Ideas

- **Wave-to-difficulty mapping** → Phase 11. This phase owns the difficulty *input*, not the
  schedule that feeds it.
- **Date-to-seed derivation and the clock-change policy** → Phase 12.
- **Showing the player a preview or a seed code** → Phase 14, if wanted at all.
- **Motif/template library** — considered and set aside for D-01's symmetric generation. If
  generated boards later read as samey, a motif pass is the natural follow-up, and it can be
  layered on top of the symmetric generator rather than replacing it.
- **Generated boards joining the campaign** — out of scope; the campaign stays authored.

</deferred>
