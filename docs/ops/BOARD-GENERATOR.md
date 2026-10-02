# Seeded board generator (Phase 10)

**Status:** Implemented 2026-09-25
**Requirements:** N-GEN-01 (seeded generator) · N-GEN-02 (every board solvable) ·
N-GEN-03 (difficulty curve on authored weight)
**Consumers:** Phase 11 endless · Phase 12 daily
**Owner sign-off:** **not obtained.** Every number below comes from deterministic headless
measurement, not from human play. See *Limits* at the end — in particular, assumption **A1**
(Hermes byte-identity) is still unmeasured as of this document.

## Why this phase existed

Phases E1a/E1b shipped five authored levels. Endless (11) and daily (12) both need boards
nobody authored, and both need them to be *safe*: a generated board that cannot be cleared is
a dead run, and in daily mode a board that differs between device and CI is a broken
leaderboard.

The cheap version of this is generate-and-repair — place content at random, run the
solvability lint, retry if it fails. D-03 rejects that. A retry loop's worst case is unbounded
and its failure mode is a hang on the one seed nobody tested. This generator is instead
**structurally incapable** of producing an unsolvable board: it maintains the reachability
invariant itself, in one pass, and never asks the lint whether it succeeded. The sweep is the
proof, not the filter.

`generate(seed, difficulty) -> LevelFileV1` is the whole public surface, re-exported from
`src/levelgen/index.ts` (LC-16: Phases 11 and 12 may import the barrel and nothing deeper).

## The mechanism

### Lemma 1 — reachability depends on the steel mask and nothing else

`isPassable` in `src/core/levels/solvability.ts` returns true for an **empty** cell and for a
**breakable** cell alike; only steel blocks. So the flood's reachable set is a function of the
steel mask alone. Density, HP mix and explosive placement are provably solvability-neutral.

This is why D-03 turned out to be one constraint rather than four, and it is what makes the
whole approach work: content can be placed freely *after* the mask is fixed, with no risk of
undoing anything.

### Invariant I — every non-steel cell is 4-reachable from the bottom row

Note the strength: **every non-steel cell**, not merely every cell that currently holds a
brick. `src/levelgen/reachability.ts`'s `allNonSteelReachable` is deliberately stronger than
the lint, and that extra strength is the entire point — an unreachable *empty* cell becomes an
unreachable *brick* the moment stage 2 fills it.

This is the single most likely thing a future reader will try to "optimise" back to the weaker
form. `reachability.ts`'s header enumerates its three divergences from `solvability.ts` with
why each may not be relaxed.

### The Theorem

> If Invariant I holds for the final steel mask, `checkSolvability` reports zero unreachable
> breakables for **every** assignment of content to the non-steel cells.

Immediately from Lemma 1 plus I: the lint's reachable set is determined by the mask, I says
that set covers all non-steel cells, and every brick sits on a non-steel cell. Content is
irrelevant to the conclusion — which is why stage 2 needs no checking at all.

### The three stages

| Stage | What it does | Weight effect |
|---|---|---|
| 1 | Steel: walk a fixed candidate list, accept a mirrored **pair** only if I still holds for the full mask afterwards, else revert the pair | none (steel is unbreakable) |
| 2 | Content: fill non-steel cells to the exact counts in `SCHEDULE[d]` | *is* the weight |
| 3 | Cap the largest 8-connected explosive cluster at 4 by demoting `E` -> `1` in mirrored pairs | none (`E` and `1` are both hp 1) |

**This is not the generate-and-repair D-03 rejects.** One pass over a fixed candidate list.
Accept-or-drop, never retry, never re-seed. Nothing is ever un-steeled. A steel-budget
shortfall (candidate list exhausted before the dial is met) is a correct, harmless outcome,
because steel carries zero authored weight — measured at 0 shortfalls in 525 tracer boards.

### The two counterexamples that shaped stage 1

1. **The diamond.** Four steel cells arranged so that no two are 4-adjacent can still enclose
   the cell between them. A pairwise "no adjacent steel" rule does not imply reachability —
   which is why the invariant is a flood, not a local predicate.
2. **The mirror.** A half board can show **zero** unreachable cells and yield **20** once
   mirrored. Hence: I is checked on the **full** `rows x cols` mask, *after* both cells of a
   pair are set, and the pair is accepted or reverted together.

### What 10-03 measured, correcting the story above

The mirror counterexample is real but it is about **ordering**, and two different mutations
were being conflated under "checking the half board". Measured over 105 000 boards (5 000
seeds x 21 difficulties):

| Mutation | Adjacency rule | Steel dial | Boards with unreachable breakables |
|---|---|---|---|
| shipped generator | on | 7/half | **0** |
| invariant removed entirely | on | 7/half | **fails the 21 000 sweep** at `s=8 d=20` |
| I over a half-**width** mask | on | 7/half | 0 |
| I over a half-**width** mask | **off** | 7/half | 0 |
| I over a half-**width** mask | **off** | 20/half | 0 |
| I checked **before** the mirror is committed | on | 7/half | 0 |
| I checked **before** the mirror is committed | **off** | 7/half | **291** (first `s=0 d=13`) |
| I checked **before** the mirror is committed | **off** | 20/half | **16 610** |

Three things follow, and each one matters to anyone editing `generate.ts`:

**1. The half-width-mask check is SOUND — a theorem, not luck.** The half's flood seeds from
the half's bottom-row non-steel cells, all of which are full-board bottom-row non-steel cells,
and every 4-move inside the half is a legal full-board move; so the half's reachable set is a
**subset** of the full board's. Meanwhile the half's right edge is a wall where the full board
has an opening, so the half condition is strictly *harder* to satisfy. Half passes => full
passes, and mirror symmetry covers the right half. The 0s above are what soundness looks like.
**No sweep at any width can ever catch this mutation.** Do not go looking for a wider N.

**2. The pre-mirror ORDERING is the real defect** — 291 failures per 105 000 at ship settings
with the adjacency rule off, 16 610 at a tripled dial. The committed 21 000-board sweep is a
working guard on it, *conditionally*.

**3. `wouldTouchSteel` is the guard, NOT polish.** Because the rule rejects a pair at
`cols/2-1` / `cols/2` (on an even-width board such a pair is orthogonally adjacent to
*itself*), columns 4 and 5 carry steel on **0 of 105 000 boards**, against ~64 000 occurrences
per column with the rule off. That leaves a permanently open two-wide vertical corridor from
the top row to the bottom, which makes the two halves reachability-**independent** — a
left-half cell reaches the flood through the left half alone, so committing the right-half
mirror cannot change its answer. The steel-column histograms for pre-mirror-with-adjacency and
the shipped generator are byte-identical at both dial settings; that independence *is* the
data.

So the sweep is not what guards the mirror ordering. The adjacency rule is. **Anyone removing
`wouldTouchSteel` must re-run the ordering mutation first**, and should expect the sweep to go
red when they do. The code keeps the full-board ordering regardless: it is the form whose
soundness needs no symmetry argument, and it costs nothing.

## The dials

Four dials, all integer per-mille lerps in `src/levelgen/schedule.ts`. No `Math.pow`, `**`, or
the trig/exp/log family anywhere in `src/levelgen/**` — those are implementation-approximated,
and a last-bit difference between Node and Hermes crossing a `Math.floor` boundary changes a
count, and a changed count changes the whole board. The levelgen eslint block enforces it.

| Dial | What it moves |
|---|---|
| D-04 | density — rows used and total brick count |
| D-05 | HP mix — the hp1 / hp2 / hp3 split |
| D-06 | steel per half board |
| D-07 | explosive thinning (`nE` falls as `d` rises) |

**The D-08 correction: the explosive dial is weight-NEUTRAL, not weight-negative.** `nE` is
carved out of the **hp1 budget**, not out of empty cells. `E` is `{ hp: 1, explosive: true }`
and `1` is `{ hp: 1 }`, so demoting one to the other changes neither `bricks` nor `totalHp`
(measured: 0 of 63 000 boards changed weight under a full demotion pass). D-08 assumed
thinning explosive removed weight; it does not, so `nE` exerts no pressure on monotonicity at
all. The half of D-08 still correct: steel is unbreakable and contributes **zero** authored
weight, which is why a stage-1 shortfall is harmless — and it is also why stage 3 can demote
freely.

**Monotonicity is an algebraic identity, not an observation.** `hb`, `n2`, `n3` are running
maxima by construction, so all three are non-decreasing in `d`. With `n1 = hb - n2 - n3`:

```
totalHp = 2 * (n1 + 2*n2 + 3*n3)
        = 2 * ((hb - n2 - n3) + 2*n2 + 3*n3)
        = 2 * (hb + n2 + 2*n3)
```

— a non-negative integer combination of three non-decreasing sequences. And `bricks = 2 * hb`
is non-decreasing directly. A future tuner cannot break monotonicity by editing a number.

Authored weight itself is **not** redefined here: `levelStaticsOf` in
`tests/helpers/balanceBot.ts` is the single source of truth (E2-locked). A second copy would
let a board be monotone under one definition and not the other.

### The schedule

`nE` is **per half board**; the full-board explosive count is twice it.

| d | rowsUsed | bricks | totalHp | nE (half) | steelPerHalf |
|---|---|---|---|---|---|
| 0 | 8 | 32 | 36 | 3 | 0 |
| 1 | 8 | 34 | 40 | 3 | 0 |
| 2 | 8 | 36 | 42 | 3 | 0 |
| 3 | 9 | 42 | 54 | 3 | 1 |
| 4 | 9 | 44 | 56 | 3 | 1 |
| 5 | 10 | 50 | 68 | 3 | 1 |
| 6 | 10 | 52 | 72 | 3 | 2 |
| 7 | 10 | 54 | 78 | 3 | 2 |
| 8 | 11 | 62 | 94 | 3 | 2 |
| 9 | 11 | 64 | 96 | 3 | 3 |
| 10 | 12 | 72 | 116 | 3 | 3 |
| 11 | 12 | 74 | 118 | 2 | 3 |
| 12 | 12 | 76 | 126 | 2 | 4 |
| 13 | 13 | 86 | 148 | 2 | 4 |
| 14 | 13 | 88 | 156 | 2 | 4 |
| 15 | 14 | 98 | 178 | 1 | 5 |
| 16 | 14 | 100 | 186 | 1 | 5 |
| 17 | 14 | 104 | 200 | 1 | 5 |
| 18 | 15 | 114 | 222 | 1 | 6 |
| 19 | 15 | 116 | 230 | 0 | 6 |
| 20 | 16 | 128 | 260 | 0 | 7 |

Calibration against the campaign: `d = 0` matches `level-01`'s 32 bricks, `d ~ 13` matches
`level-03`'s 94-brick showpiece, `d = 20` exceeds the hardest shipped board by ~36 %.

**These constants are tuning, not contract.** No test pins a literal dial value; the tests
assert the derived properties (monotone `bricks`, monotone `totalHp`, capacity fits,
`n1 >= nE >= 0`). Phase 11 may re-tune them freely. What is **not** free to change is
candidate ordering, the PRNG, or the stage sequence — see *Determinism*.

## The particle budget (SC-5)

Stage 3 caps the maximum 8-connected explosive cluster at **4**. The arithmetic, against
`docs/ops/EXPLOSIVE-BRICKS.md`:

```
explosive destroy   ~15 sparks  (12 @ 1.0 x 1.25 intensity)
4-chain             4 x 15  =  60
triggering break         +  12
                          -------
peak                        72   against Mid particleCap 128
```

Mid is the marketing/Cert baseline and cascades FIFO-evict over cap, so staying under it means
a chain renders as authored rather than as a truncated stub. 4 is also the campaign's own
ceiling, so the generator is not introducing a cascade size the shipped levels never produce.

Stage 3 demotes the **last-in-scan-order** member of the first oversized cluster in a fixed
row-major labelling, plus its mirror. Two consequences: it consumes no rng draw (so it cannot
shift the stream for anything downstream), and it preserves both symmetry and weight.

## Determinism

The pinned corpus, from `src/levelgen/fingerprint.ts`:

| Field | Value |
|---|---|
| `CORPUS_SEEDS` | **200** |
| `D_MAX` | **20** (so `d` runs `0..20`, 21 values) |
| Boards | **4 200** |
| Nesting order | `s` **outer** `0..CORPUS_SEEDS-1`, `d` **inner** `0..D_MAX` |
| Element | `JSON.stringify(generate(s, d))` |
| SHA-256 input | those 4 200 strings concatenated with no separator |
| **SHA-256** | `9e3748c89bc4d15f0c7c9e61b79d70f2ba58c327651ca81077dc7adf9572c4ea` |
| **u32 fingerprint** | `0x2e8f6c23` = `781151267` |
| u32 algorithm | FNV-1a over `charCodeAt`, offset `2166136261`, prime `16777619`, `Math.imul(h, prime) >>> 0` per char, folded continuously across the whole corpus (not per board) |

The u32 exists because Hermes has no crypto built-in; it is the value plan 10-05's on-device
probe compares against. `corpusFingerprint` imports no platform built-in of any kind. It is a
**determinism fingerprint, not a security digest** — do not repurpose it.

Agreement was verified across four processes at the pinning commit — two `vitest`/vite runs
and two esbuild-bundled `node` runs (one `--jitless`). Two different *module pipelines*
agreeing rules out a transform-level artefact as well as a JIT-level one.

**RESEARCH §Q5 quotes a different SHA-256 (`0ffbfdb7...`). That number is stale, not a
regression** — it hashed a prototype predating the shipped candidate ordering and stage 3.
What §Q5 established is that four-way cross-process agreement is *achievable*; which digest it
lands on is a property of the generator that actually shipped.

**A digest mismatch is never "just update the number."** Only three things can cause one —
changed candidate ordering, a changed PRNG, or a changed stage sequence — and every one of
them rewrites **every board for every existing seed**. That retroactively invalidates any
daily-challenge history keyed on a seed, and it makes plan 10-05's recorded on-device value
stale at the same moment. Regenerating is a deliberate act with a migration attached, not a
test fix.

## What is proven, and by what

| Claim | Evidence |
|---|---|
| Validates and compiles on the real core pipeline | 21 000 boards, `tests/levelgen.sweep.test.ts` |
| Zero unreachable breakables | 21 000 boards vs `checkSolvability`, both the TS and the `.mjs` implementation (R-16 parity) |
| Mirror symmetric, correct row width, in playfield bounds, shipped charset only | 21 000 boards |
| Authored weight equals `SCHEDULE[d]` **exactly** | 21 000 boards — an equality, not a statistical bound |
| No 8-connected `E` cluster > 4 | 21 000 boards |
| Byte-identical across processes | 4 processes, 2 module pipelines, 4 200-board corpus |
| Difficulty clamped; output never aliases module state | `tests/levelgen.determinism.test.ts` (T-10-09 / T-10-11) |
| **Actually clearable** | 30-board stratified bot sample, `tests/levelgen.winnability.test.ts` |

The last row is the only one that runs a generated board through `applyCompiledLevel` and
`stepRun`. The lint proves a brick is *reachable on paper*; the bot is what catches a brick
that is reachable on paper and practically unhittable.

### Measured bot clear times

Plan 10-04 scanned 840 boards (40 seeds x all 21 difficulties) through the headless bot at
`paddleOffset: 12`. **0 non-wins** — every board cleared with `bricksRemaining === 0`. Clear
time, in simulated seconds:

| | p50 | p95 | p99 | worst |
|---|---|---|---|---|
| all 840 | 108 | 259 | 416 | **1495** (`s=33 d=20`) |

Per-difficulty medians run 56 s at `d = 0` to 197 s at `d = 20`; per-difficulty maxima are far
noisier (616 s at `d = 15`, 1024 s at `d = 16`, 1495 s at `d = 20`), because clear time depends
heavily on bounce-angle luck. That tail is discussed under *Limits*.

## Limits

This section is why this document exists rather than a code comment. Everything above is real;
these are the things that are **not** established, stated plainly so a later phase does not
mistake an inference for a fact.

**1. A1 — Hermes byte-identity — is measured on a SIMULATOR, never on physical hardware.**

*This heading read "is UNMEASURED" until 2026-09-29, directly above the block that discharges
it — the phase-10 security audit's Finding 6. The error was in the safe direction, understating
what had been proven, but a reader skimming headings got the opposite of the truth. The heading
now names the residual that is genuinely open rather than the one that was closed.*

The original risk: byte-identity was verified across Node processes only (four of them, two
module pipelines — but all V8), and the generator had never been run on Hermes. If A1 were
false, Phase 12's daily challenge would hand **different boards to device and CI**, which is
precisely the failure daily mode cannot tolerate: two players would compare scores on boards
that were never the same board. Plan 10-05's `__DEV__` on-device probe discharges it by
computing the u32 fingerprint on device and comparing.

**What is still open** is narrow and is stated in the block's own last line: the reading was
taken on the iOS **simulator**, which runs the same Hermes engine but not on the same silicon.
A physical-device run has not been observed either way.

> **Device digest: MEASURED 2026-09-25 — A1 DISCHARGED.**
> **On-device u32 fingerprint:** `0x2e8f6c23` = `781151267` — **matches the Node pin exactly.**
> Expected: `0x2e8f6c23` = `781151267`
> Observed on: iPhone 17 simulator, iOS 26.5, Hermes via Expo SDK 57 dev client,
> `EXPO_PUBLIC_LEVELGEN_PROBE=1`. 4 200 boards in 1 331 ms.
> Raw line: `[levelgen] corpus fingerprint u32=0x2e8f6c23 seeds=200 boards=4200 ms=1331`

Determinism is therefore no longer scoped to V8: the same corpus hashes identically under
Hermes and under four V8 processes across two module pipelines. Phase 12's daily challenge
can rely on device and CI producing the same board for the same date.

One honest limit on that claim: this was the iOS **simulator**, which runs the same Hermes
build as a device but on x86/arm host hardware. The arithmetic is integer-only by design and
the ECMAScript-specified `+ - * /` are exact, so a physical-device difference would be
surprising — but it has not been observed either way, and a physical run is close to free
whenever one is next in front of someone.

### Device probe procedure

The probe is `app/_components/GameHost.tsx`'s one-shot mount effect, double-gated on the
`LEVELGEN_PROBE` devflag **and** `__DEV__`. Unarmed builds compute nothing.

1. Arm it on a dev build of the branch:

   ```bash
   EXPO_PUBLIC_LEVELGEN_PROBE=1 npx expo start
   ```

   `EXPO_PUBLIC_*` flags are inlined at bundle time, so the variable must be set for the
   bundler process — not exported inside the app. Restart Metro if it was already running.

2. Open the app on a physical device or simulator and read the Metro / device console for the
   line tagged `[levelgen]`:

   ```
   [levelgen] corpus fingerprint u32=0xXXXXXXXX seeds=200 boards=4200 ms=NNN (expected 0x2e8f6c23 …)
   ```

   It fires once at shell mount, before Title renders anything interesting. The corpus is
   4 200 boards, so expect a visible pause — roughly 140 ms on Node and plausibly several
   times that on a low-end device.

3. Compare the printed `u32` against the pinned value below. The comparison is against the
   **u32**, never the SHA-256: Hermes ships no `node:crypto` and no `Buffer`, which is the
   whole reason `corpusFingerprint` exists as shared source rather than test code.

| Pin | Value |
|-----|-------|
| u32 fingerprint (compare this) | `0x2e8f6c23` = `781151267` |
| Corpus | `CORPUS_SEEDS = 200` seeds x `d` in `0..20` = 4 200 boards, `s` outer, `d` inner |
| SHA-256 (Node side only — Hermes cannot compute it) | `9e3748c89bc4d15f0c7c9e61b79d70f2ba58c327651ca81077dc7adf9572c4ea` |

**Outcome A — the values match.** Assumption A1 is discharged. Replace the PENDING line and
the blank above with the observed value and the date, and note the device and OS version. The
determinism claims in this document then cover Hermes as well as V8, and Phase 12's daily
challenge is unblocked.

**Outcome B — the values differ.** The generator is **not** cross-engine deterministic. This
blocks Phase 12's daily challenge; it is not something to work around by having the device
trust its own value, because then device and CI are handing players different boards under the
same seed. Find the cause by bisecting the corpus rather than by reading the generator:

1. Halve `CORPUS_SEEDS` — call `corpusFingerprint(100)`, then `corpusFingerprint(50)`, and so
   on — running each on both engines until the smallest diverging seed range is isolated.
   The fold is sequential over `s` outer, so a prefix that agrees means the divergence is in
   the seeds after it.
2. Narrow to a single board by generating `s`/`d` pairs directly in that range.
3. Compare that one board's `JSON.stringify(generate(s, d))` byte-for-byte between engines.
   The diff names the operation that differs — the most likely candidates are float
   formatting in `JSON.stringify`, property enumeration order, or an `Math.imul`/`>>> 0`
   assumption that does not hold.
4. Report the finding. Do **not** re-pin the digests to the device's value; both pins describe
   one generator, and a mismatch means the generator itself needs an engine-portable fix.

**2. No human play calibrated the dial constants.** They were calibrated against authored
weight and perfect-bot clear time only. The E2 human playtest cohort (A3) was **skipped by the
owner**, so there is no human baseline anywhere in the chain — not for this phase and not for
the E2 curve it inherits its weight definition from. Phase 11 is expected to re-tune them, and
no test pins a literal value precisely so that re-tune is cheap.

*The paragraph immediately below is **SUPERSEDED as of 2026-09-25**. It is kept verbatim,
because this section exists so a later phase can see both what was believed and what corrected
it. Read it together with the supersession note that follows it.*

The 840-board scan gives Phase 11 one concrete thing to look at: at the top of the range a
*perfect* bot needs 1495 simulated seconds on the worst board and 416 s at the p99. Since bot
time is a **floor** on human time, boards at that tail are plausibly unfinishable by a real
player. This is a balance observation, not a defect, and it is deliberately not asserted
anywhere — pinning a clear-time ceiling would pin the dial constants by proxy.

> **SUPERSEDED 2026-09-25 — the "plausibly unfinishable" inference does not hold.**
> Corrected by: `docs/ops/ENDLESS-MODE.md` § *The settled open question* (Phase 11), which
> carries the full measurement.
> **What was measured.** A 500-seed scan at difficulty 20 *specifically*: **0 non-wins**
> (p50 172.5 s, p95 446.2 s, p99 656.8 s, worst 1495.3 s). There is no unclearable board.
> Replaying the 8 slowest d=20 boards across 7 paddle offsets collapsed `s=33` from
> **1495.3 s to 83.0 s** — an **18×** spread on the byte-identical lattice; changing only the
> gameplay RNG seed did the same. Per-difficulty maxima are **non-monotone** in `d`: **d=17
> peaks at 2735.3 s**, worse than d=20 on a materially lighter board, so "the top of the range
> is the hard part" is untrue as well.
> **Conclusion, in one line:** the tail is a **trajectory** property, not a board property, so
> the inference above does not hold — and `SCHEDULE` was deliberately **not** re-tuned
> (a re-tune buys ~34 % off the median, re-rolls the tail rather than removing it, and would
> invalidate the 21 000-board sweep, the monotonicity proof and the A1 device record above).
> The paragraph above therefore stands as a record of what Phase 10 believed, not as guidance.

**3. The bot proves clearability, not enjoyment.** It tracks the lowest live ball and never
misses on purpose, so its clear time is a floor on human duration and its lives-remaining is
always maximal. `WON` is a **necessary, not sufficient** condition for a human-playable board:
a board the bot cannot clear is definitely broken, but a board the bot clears may still be
tedious or unfair. Board *feel* remains a judgement call (`10-VALIDATION.md`, Manual-Only
Verifications). Do not promote `tests/levelgen.winnability.test.ts` into a proxy for it.

Relatedly, the winnability sample is **30 boards**, not the full corpus — a bot run is seconds
of simulated play against the 0.04 ms a lint check costs. The 21 000-board claims are the lint;
the clearability claim is a sample.

**4. `scripts/assert-generated-solvability.mjs` deliberately does not exist.** RESEARCH
proposed it, for genuine R-16 parity reasons. It was not built, and that omission is a
decision, not an oversight:

- A `.mjs` script cannot import TypeScript, so it would need a **second ESM implementation of
  `generate`** — a third algorithm, needing a third parity test to prove it matches the other
  two. The parity burden grows faster than the assurance.
- The parity it was meant to buy is already bought: `tests/levelgen.sweep.test.ts` imports
  `checkSolvability` from **both** `src/core/levels/solvability.ts` and
  `scripts/lib/levelSolvability.mjs` and asserts they agree on all 21 000 boards, in-process.
- `npm test` runs `vitest run` first, so the gate is already in the full-suite chain.

A later contributor who notices the asymmetry with `assert-level-solvability.mjs` (which does
exist, for *shipped assets*) should read this before "fixing" it. The reasoning is also in
`10-VALIDATION.md` §Decision and in the sweep file's own `describe` comment.

**5. Generation cost on device is unmeasured.** Board generation is pure JS off the worklet
and runs once per board, so it cannot touch the simulation or render hot path by construction.
But the wall-clock cost of a single `generate` call on a low-end device has not been measured —
only in Node, where 21 000 boards take 8.4 s (~0.4 ms each). Phase 11 should confirm that a
mid-run `generate` does not produce a visible hitch.
