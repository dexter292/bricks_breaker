# Endless mode (Phase 11)

**Status:** Implemented 2026-09-25
**Requirements:** N-END-01 (a run that keeps producing boards) · N-END-02 (endless records
stored separately from campaign progress) · N-END-03 (a seeded run is reproducible; wave
transitions cause no frame spike outside the Mid budget)
**Consumers:** Phase 12 daily (board-swap seam) · Phase 13 achievements · Phase 14 Title entry
**Owner sign-off:** **not obtained.** No human play calibrated anything in this document.
Every number below comes from deterministic headless measurement — the bot instrument at
`tests/helpers/balanceBot.ts`, or a Node microbenchmark — not from a player. See *Limits* at
the end; in particular the **device half of SC-5 is still unmeasured** as of this document.

## Why this document exists

Success criterion SC-2 is not satisfied by a correct `difficultyForWave`. It asks that
difficulty rise with wave number *"with the ramp written down rather than tuned by feel in
code"*. This file is the written-down ramp. It also records the one decision this phase made
that a later phase could plausibly reverse by accident (`world.tick`), the measurements that
justified it, and the scope of the replay claim SC-4 makes.

The policy itself lives in `src/services/endless/ramp.ts` — two pure integer functions, guarded
by `tests/endless.ramp.test.ts`. The board generator it feeds is Phase 10's, documented in
`docs/ops/BOARD-GENERATOR.md` and **frozen**: nothing in this phase changed `src/levelgen` or
`src/core` (`git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` is empty).

## The wave → difficulty ramp (SC-2)

One wave is one difficulty step. Wave 1 is difficulty 0; each subsequent wave adds one; the
walk clamps at the generator's `D_MAX = 20` and stays there (**D-01**, **D-02**).

| Wave | 1 | 2 | 3 | … | 19 | 20 | **21** | 22 | 23 | … |
|---|---|---|---|---|---|---|---|---|---|---|
| Difficulty | 0 | 1 | 2 | … | 18 | 19 | **20 = `D_MAX`** | 20 | 20 | 20 forever |

Degenerate input folds to the nearest end of the range rather than escaping it: wave 0, a
negative wave, a fractional wave or a non-finite wave all resolve inside `[0, D_MAX]`. The
property suite proves the clamp out to wave 10 000.

**`D_MAX` is read from `src/levelgen`, never restated here or in `ramp.ts`.** Restating it
would let the ramp clamp at a number the generator no longer honours; the clamp and the table
it indexes must move together or not at all. `generate` also clamps its own difficulty
argument — that is a backstop against a hostile caller, not this module's correctness
argument, which is why `difficultyForWave` clamps in its own body too.

### Why the ramp clamps rather than widening the difficulty range (D-01)

Waves past 21 could have been made harder by extending `SCHEDULE` beyond `d = 20`. They are
not, because a wider schedule reopens everything Phase 10 proved: the 21 000-board
monotonicity sweep, the algebraic monotonicity proof over authored weight, and the freshly
discharged on-device A1 fingerprint record. Endless difficulty past wave 21 comes from the
run getting long, not from a new dial.

### The per-wave seed

The board for wave *n* of a run is `generate(seedForWave(runSeed, n), difficultyForWave(n))`.
The run seed is hashed once and folded with the **wave index**:

```
seedForWave(runSeed, wave) = mixSeed(hashSeed(runSeed), wave | 0)
```

`hashSeed` normalises `number | string` and folds a non-finite number to 0, so hostile input
cannot reach the PRNG state through this call. `mixSeed`'s second factor is **odd**, and an
odd multiplier is injective mod 2³²: two distinct waves of one run therefore cannot collide
onto one seed. That is the no-repeat argument behind SC-4 — an algebraic property, not a
sampling observation. Measured confirmation: waves 1..60 of one run produce 60 distinct
per-wave seeds and 60 distinct board digests.

**Why the fold input is the wave index and not the difficulty.** Difficulty saturates at
`D_MAX` from wave 21 onward. Folding difficulty into the seed would hand every post-clamp wave
the *same* board, forever — a clamp on the ramp turning silently into a clamp on the content.
Folding the wave index keeps the board moving while the difficulty stands still. A test drives
waves 21..25 specifically and asserts five distinct boards at one shared difficulty.

### No implementation-approximated `Math`

The ramp obeys the same rule as `src/levelgen/schedule.ts`: integer coercion and comparison
clamps only — no exponentiation, no trig/exp/log, no float remainder. A last-bit difference
between Node and Hermes crossing a rounding boundary would change a difficulty, a changed
difficulty changes the whole board, and SC-4's "same run seed replays the same wave sequence"
would then be false on device while staying true in the test suite.

## The `world.tick` decision (D-06)

**Decision: `applyWaveAdvance` sets `world.tick = 0`. Every wave starts at serve speed, the
same contract every campaign level has.**

This was not inherited by default. Carrying the tick was considered and rejected with a number.

The E2 speed ramp is a pure function of `world.tick`:
`floorSpeed = SERVE_SPEED × (1 + SPEED_RAMP_PER_SECOND × t)`, clamped at `MAX_BALL_SPEED` —
`360 × (1 + 0.01 t) ≥ 720` at **t = 100 s**. The measured d=20 median wave is 172.5 s and the
measured wave-1 (d=0) reference board took 103.5 bot-seconds, so **the cap is reached inside
wave 1**. Carrying the tick would pin every ball at 720 from roughly wave 3 onward, forever,
which makes the written-down difficulty ramp above cosmetic: the thing actually controlling
difficulty would be the clock, not the dial.

Measured over 30 waves at one run seed, in the endless prototype:

| `world.tick` policy | Total simulated time | Final score |
|---|---|---|
| **reset per wave (shipped)** | **4497.2 s** | **946 880** |
| carried | 3457.4 s (−23 %) | 791 190 |

The bot is *faster* with a capped ball because it never misses. A human would experience the
same change as brutally harder. The instrument disagrees with the player here, which is
exactly why this is a written decision rather than a default.

Resetting the tick has two consequences, and each is handled at a named place:

1. **Live effects would become near-permanent.** `effectUntilTick` is an *absolute* tick value
   (`const until = world.tick + durationTicks`), so zeroing `tick` under a live effect turns a
   10-second expand into one that lasts the rest of the run. `applyWaveAdvance` therefore
   **clears the effect SoA above the reset**, and the two lines are coupled by a comment. A
   later "simplification" that keeps effects across a wave resurrects this bug.
2. **`ticksPlayed` telemetry would truncate to the final wave.** `publishRunStatsMirror`
   publishes `w.tick` straight through. The cumulative time is therefore **banked on the UI
   runtime** — `ticksBanked` is a `useSharedValue`, incremented inside the wave-advance block
   immediately *above* `applyWaveAdvance`, and zeroed in the `resetRequest` block alongside the
   other per-run counters. It is banked on the runtime that owns the reset, not in the app
   tier: `world.tick` exists only on the UI runtime and is reset inside a worklet, so banking
   it in JS would depend on an ordering between two independent `useAnimatedReaction`s that
   Reanimated does not guarantee. Banking where the reset happens is race-free by construction.

   Measured, two waves at run seed `0x5eed`: `world.tick` reads 3 895 at the wave-1 clear and
   **0** immediately after the advance, 31 515 at the wave-2 clear and **0** after; published
   `ticksPlayed` is `3 895 + 31 515 = 35 410`, not 31 515. Published `bricksBroken` climbs
   32 → 66 across the swap, and 66 exceeds the 34 breakables the wave-2 board contained — a
   total that is unreachable if the counters zero at the boundary.

**Two things a later plan must not undo:** the wave block stays *above* `const simFrozen` in
`useGameLoop` (its position is the SC-5 argument), and the bank increment stays *above*
`applyWaveAdvance` inside that block (the advance zeroes `w.tick`).

## Measured behaviour

Plan 11-04 drove a **12-wave reference run** on one `World` through the shipped seam
(`generate` → `compileGeneratedLevel` → `applyWaveAdvance`) with the headless bot. Run seed
`0x11e5`, paddle offset **6**, `resetWorld(w, 0xace, 0xbeef)`. Lives, score and combo are read
at each wave boundary *before* the advance; `Bricks` is the cumulative run fold, not a per-wave
count; the board digest is `sha256(JSON.stringify(board)).slice(0, 16)`, a change detector and
explicitly not a security digest.

| Wave | Difficulty | Ticks | Bot seconds | Lives | Score | Combo | Bricks (run total) | Board digest |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 12 422 | 103.5 | 3 | 8 540 | 3 | 32 | `b52104d69989c62c` |
| 2 | 1 | 15 556 | 129.6 | 3 | 12 960 | 2 | 66 | `bdd847afe62d203f` |
| 3 | 2 | 15 834 | 131.9 | 3 | 20 120 | 2 | 102 | `3666ba951b2062bc` |
| 4 | 3 | 7 615 | 63.5 | 3 | 39 650 | 4 | 144 | `9114fea258d5525d` |
| 5 | 4 | 28 471 | 237.3 | 3 | 47 370 | 2 | 188 | `499ae1aa5d1ae588` |
| 6 | 5 | 25 004 | 208.4 | 3 | 57 250 | 2 | 238 | `4e75e4928c967262` |
| 7 | 6 | 22 214 | 185.1 | 3 | 63 050 | 2 | 290 | `775f933c719b5814` |
| 8 | 7 | 30 384 | 253.2 | **4** | 69 600 | 2 | 344 | `dc55953ab825bf23` |
| 9 | 8 | 9 982 | 83.2 | 4 | 84 190 | 2 | 406 | `8bea4eb546f2099d` |
| 10 | 9 | 12 190 | 101.6 | **5** | 119 820 | 2 | 470 | `129387f563374165` |
| 11 | 10 | 6 233 | 51.9 | 5 | 137 390 | 2 | 542 | `cdf9006929189d0b` |
| 12 | 11 | 11 656 | 97.1 | 5 | 153 620 | 3 | 616 | `e80c8e3eec410c9a` |

Totals: **197 461 ticks ≈ 1 645 s (27.4 min)** of flawless play, final score **153 620**, final
lives **5**.

**These are floors on human duration, not predictions.** The bot tracks the lowest live ball
and never misses on purpose (`tests/helpers/balanceBot.ts:8-9`), so its clear time is a floor
and its lives-remaining is always maximal. No test asserts any duration in this table; pinning
a clear-time ceiling would pin the generator's dial constants by proxy, which Phase 10
deliberately refused to do. The table exists for this document.

Two facts worth carrying out of it, because a later phase could break them without noticing:

- **No wave boundary grants a life** (**D-04**). Lives immediately after each
  `applyWaveAdvance` equal lives immediately before it. The extra lives at waves 8 and 10 above
  are caught power-ups inside a wave, not a per-N-waves bonus. A per-N-waves grant is the one
  change that would make a competent player's run *literally* endless in wall-clock terms: in
  the 30-wave prototype a perfect bot reached `MAX_LIVES = 5` by wave 6 and never dropped
  below it again. The cap plus the 8 % drop rate is what keeps a long run bounded.
- **The run ends only at zero lives.** A deliberately hopeless paddle policy drives the run to
  `LOST` at exactly zero lives — never `WON`, never a tick-budget timeout.

### Frame cost of a transition, headless

| Measurement | Value |
|---|---|
| `generate(seed, 20)` alone, Node, 2 000 warm iterations | 0.0306 ms |
| `generate` + validate + compile, Node | 0.0362 ms |
| Implied Hermes / Node ratio (from the Phase 10 on-device corpus run) | 15.5× |
| **Hermes estimate, generate + compile, one board** | **≈ 0.56 ms** |

Against an 8.33 ms substep (`FIXED_DT = 1/120`) and a 16.7 ms Mid-tier frame, 0.56 ms is ~7 %
of a substep and ~3 % of a frame — and it is not even spent on the frame, because the call runs
on the RN JS thread inside a `runOnJS`'d chrome handler while `stepRun` runs on the Reanimated
UI runtime. Generation was never the SC-5 risk. **The real risk was the glow-bake / audio-preload
cold path**: `loadKey` embedded `compiled.brickCount`, which moves every wave as difficulty ramps
(32 bricks at d=0 to 128 at d=20), so every board swap would have flipped `fxReady` false and
re-entered `setActive(false)` → `bakeGlowSprites` → an awaited audio preload with a 2 500 ms
race — three orders of magnitude worse than the generation everyone was watching. Plan 11-05
re-keyed `loadKey` on the brick dimensions alone (**D-14**), which is the only thing the atlas
depends on, so the bake fires once per endless run. That is also a strict campaign improvement.

## The settled open question

Phase 10 handed this phase an open balance question and an inference drawn from it: that boards
at the clear-time tail were *plausibly unfinishable by a real player*. Phase 11 research settled
it with a controlled experiment, and the answer was **neither re-tune nor accept the wall,
because the premise was wrong**.

1. **There is no unclearable board.** A 500-seed scan at difficulty 20 *specifically* found
   **0 non-wins** — p50 **172.5 s**, p95 446.2 s, p99 656.8 s, worst **1495.3 s** (`s=33`). Only
   0.6 % of seeds exceed 15 minutes for a perfect bot.
2. **The tail is a trajectory property, not a board property.** Replaying the 8 slowest d=20
   boards across 7 paddle offsets collapsed `s=33` from **1495.3 s to 83.0 s** — an **18×**
   spread on the byte-identical lattice. Changing only the gameplay RNG seed did the same
   (1495.3 s → 178.6 s). A human, whose return angle varies constantly, samples across that
   whole row rather than sitting on one cell of it. The residual genuine board-difficulty
   component is small: the hardest board under *every* trajectory tried still clears in ~4
   minutes, not 25.
3. **Per-difficulty maxima are non-monotone in `d`.** Across d=15..20 the maxima run
   616 → 1024 → **2735.3** → 730 → 599 → 1495 s. **d=17 peaks at 2735.3 s, worse than d=20 on a
   materially lighter board.** So "the top of the range is the hard part" is also untrue. The
   dial provably controls authored weight monotonically; it does not control the clear-time
   tail, because the tail is generated by trajectory dynamics.
4. **A re-tune is a bad trade.** Halving the top-of-range dials buys roughly **34 %** off the
   median (179 s → ~118 s) and **re-rolls the tail rather than removing it** — while rewriting
   every board for every existing seed, invalidating Phase 10's pinned SHA-256 and u32 digests,
   making plan 10-05's on-device A1 record stale the same instant, and forcing a re-run of the
   21 000-board sweep and the monotonicity proof.

**`SCHEDULE` was therefore deliberately NOT re-tuned, and `src/levelgen` is byte-unchanged by
this phase.** If a future phase wants shorter waves, the cheap levers are
`SPEED_RAMP_PER_SECOND` or a wave-scoped effect — both outside levelgen and outside Phase 10's
proofs.

**No softlock exists.** 1 900 board plays this phase with zero non-wins (plus Phase 10's 840 and
230 prototype waves), plus the reachability Theorem asserted over 21 000 boards, plus
`applyLivesFromBallCount` untouched, plus `stepAntiStall`'s deterministic escalation. A player
who cannot clear wave 21 **loses by missing**, which is the intended ending condition.

This supersedes `docs/ops/BOARD-GENERATOR.md` § Limits item 2's second paragraph. That paragraph
is preserved there, marked superseded, with a dated note pointing back at this document — see
the amendment under that item.

## Limits

This section is why this document exists rather than a code comment. Everything above is real;
these are the things that are **not** established, stated plainly so a later phase does not
mistake an inference for a fact.

**1. SC-4's replay claim is headless and policy-fixed.** The provable claim, verbatim: *given a
run seed, the initial world seeds and a fixed input policy, an endless run replays to the same
wave with the same score and the same world hash at every boundary.* That is proven — two
12-wave runs at seed 777 hash identically at all 12 boundaries (both before and after each
swap) and finish on the same score, lives and wave, while seed 778 diverges at wave 1.

**A device endless run is NOT replayable, and nothing here should be read as claiming it is.**
The obstacle is not the RNG; it is the input stream. On device the intent is read *per substep*
from `paddleTarget.value`, and the number of substeps per frame depends on wall-clock frame
timing through the accumulator and the `MAX_SUBSTEPS` cap. **No per-tick intent recorder
exists.** Do not describe any of this as a user-facing replay feature: recording the per-tick
intent stream is a *feature* this phase does not have, not a *fix* for something broken.

Separately and unconditionally: **the board sequence alone is reproducible from the run seed**,
independent of play — waves 1..60 derive identically twice with 60 distinct digests. That is
the part Phase 12's daily challenge inherits, and it does not depend on the input policy at all.

**2. SC-5's device half is UNMEASURED.** The generation half is discharged: the cost is a Node
measurement scaled by a Hermes ratio (≈ 0.56 ms), and plan 11-05 proved structurally and in
jsdom that the bake/preload cold path is not *entered* at a wave transition. What no automated
step in this repo can produce is a frame on hardware. The open assumption block below records
it, and the discharge procedure with it.

> **Device digest: PLACEHOLDER — to be filled by plan 11-06 Task 3.**
> This block is formatted like the discharged-assumption block at
> `docs/ops/BOARD-GENERATOR.md` § Limits item 1, and Task 3 of this plan replaces it with a
> dated OPEN assumption carrying the unmeasured property, the discharge procedure and the
> failure signatures. If you are reading this line in a committed document, the block was
> never filled — treat SC-5's device half as unmeasured and unrecorded.

**3. No human play calibrated anything in this document.** Not the ramp, not the tick decision,
not the durations. The E2 human playtest cohort (A3) was skipped by the owner, so there is no
human baseline anywhere in the chain this phase inherits from either. Every number here is a
deterministic headless measurement at a fixed bot policy, and the measurement in § *The settled
open question* shows that a single-policy clear time varies by an order of magnitude with the
policy — so a bot number must not be read as a human-time prediction in either direction.

**4. HUD placement is temporary.** The wave indicator ships this phase as a `W{n}` readout in
the `__DEV__` dev row, next to the `Endless` entry button (**D-05** / **D-13**). Both are
development affordances. The production placement of the wave indicator, the production entry
point into endless, and the "which record *is* the record — best wave or best score" display
decision are all **Phase 14's** (Meta Shell), which deletes the `__DEV__` entry.

**5. The run seed is not a secret.** It is a difficulty input. `hashSeed` / `mixSeed` come from
`src/levelgen/rng.ts`, which carries an explicit note that it is a deterministic generator and
**not** a CSPRNG — its entire contract is that its output is predictable from the seed. Nothing
in this phase weakens that and nothing here may be reused for a token, nonce, key or session id.
Endless does not need seed secrecy; a player who reads their own run seed learns which boards
they are about to play, which is not a property this mode protects.

**6. Endless records are firewalled from campaign progress, and that is a type property now.**
`recordRunEnd` takes a discriminated union whose endless arm has **no** `levelId`, so TypeScript
narrowing forces the runtime mode gate to exist (**D-11**); the endless record lives inside
`TelemetryBlob`, and `LevelId` was deliberately **not** widened to admit an endless value
(**D-12**). This closed a real pre-existing defect: both stores previously called
`applyLevelBest(...)` unconditionally and `unlockAfterClearPure(...)` on any win, with no
reference to the mode — an endless win would have written a campaign best and unlocked a
campaign level. What is *not* established is anything about cross-device or cloud sync of those
records; there is none, and nothing here designs for one.
