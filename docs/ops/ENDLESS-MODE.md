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

## The run boundary and the record display (gap closure, 2026-09-26)

Phase 11 verification (`11-VERIFICATION.md`) recorded two gaps against the plans above. Both
are closed, and the behaviour that now ships is written here rather than left in the planning
artifacts, because this is where the next person picks the mode up.

### Every endless run boundary is a new run at wave 1

`startEndlessRun()` is the **only** site that owns a run's identity — the seed, the wave, the
mode and the wave-advance guard — and every reset now routes to it:

| Boundary | What happens |
|----------|--------------|
| Results `Retry` | The in-flight run is recorded first (a no-op when the run already ended), then a **new run**: `runSeedRef` re-minted, `waveRef := 1`, guard cleared, lives 3 / score 0 / combo 1 |
| Pause `Retry` during a live run | Same, and the in-flight run **is** recorded `abandoned` at the wave reached |
| Pause `Menu` | Records `abandoned`, then Title |
| `__DEV__` tier change (`remountDevSession`) | Records `abandoned`, then routes to `startEndlessRun()` |
| `__DEV__` `Endless` button (`onPress={startEndlessRun}`) | It stays mounted and tappable for the **whole** run, so a second press mid-run is a boundary. The in-flight run is recorded `abandoned` at the wave reached, then a **new run starts at wave 1** — because the funnel is the first statement of `startEndlessRun()` itself, not a call sitting at some of its callers |
| `Lv` (`toggleDevLevel`) | Records the in-flight run `abandoned` at the wave reached, then **exits endless**: `modeRef` / `mode` return to `'campaign'`, the `W{n}` readout disappears, `waveRef` and the wave-advance guard clear, and the next run is a **campaign** run recorded through the campaign arm (assumption **A-02**, owner decision of 2026-09-26) |
| A wave that will not compile | **Ends the run.** The advance guard is released, the run is recorded `abandoned` at the last successfully built wave, and the frame loop stops |
| `Cert WC` (`runCertWorstCase`) | A boundary **only through its tier half**, and only when the forced quality tier is not already `mid`: setting it fires the `__DEV__` tier-change row above, so the in-flight run is recorded `abandoned` at the wave it reached and a new run starts at wave 1 (measured 2026-09-26 from a live run at wave 2 — readout `W2` → `W1`, one `recordRunEnd` call carrying `{mode:'endless', wave:2, outcome:'abandoned'}`). On that branch the press **injects nothing** — the function returns at its `defer` branch before the injection — and, **Re-scoped 2026-09-26 (round 4)**, it now **arms nothing** either: before round 4 it deferred a worst-case injection that discharged either onto a later campaign `level-03` session that never pressed the button, or — when the run was already on `level-03` — onto the freshly restarted endless board. Both were measured, and both are now 0. **With the tier already `mid` it is no longer a run boundary at all.** Its other half used to force `level-03`; since `11-14` that half does not fire while the mode is endless, so the press leaves the run live — measured `W2` → `W2`, the level unchanged, `recordRunEnd` not called and no `setActive` call of any kind. On THAT branch it does still inject the worst-case load onto the live board (measured `injectCertWorstCase` 0 → 1), which is a hazard during a measurement but not a run boundary. **Extended 2026-09-26 (round 5):** the mode term is one of THREE — as shipped the level half fires only when the run has **not ended**, the mode is **campaign**, and the level is **not already `level-03`**. **Re-pointed 2026-09-28:** round 6 extracted those three terms into one pure predicate, `certLevelPlanFor` in `app/_components/certLevelPlan.ts`, returning `'force' | 'ready' | 'unreachable'`; the level half fires on `plan === 'force'`, which holds exactly when the three-term condition above held. The old inline expression no longer exists — `tests/ui/PlayingHost.endless-host.test.ts` pins `runEndedRef` and `modeRef` at ZERO occurrences inside `runCertWorstCase`, so a decision site that re-tests a term there goes red. The behaviour this clause describes is unchanged. So a press from a **mounted Results overlay** moves no level and starts no loop in campaign either. Measured in round 5 from a mounted campaign lose panel at `{score: 2400, lives: 0}` with the tier already Mid: the level-switch control still named `level-01`, `retry()` was not called, there were zero `setActive(true)` calls (and no trailing `setActive(false)`, because nothing was re-armed to stop), the panel stayed up still reading its own `2400`, and `injectCertWorstCase` was called once. **Corrected 2026-09-26 (round 6):** an earlier revision of this clause named the just-ended run as the DESTINATION of that load; that is withdrawn, and the superseded wording is described here rather than quoted (the verbatim original is in git at `6bb18bf`). The call applies nothing — it bumps a counter, `certRequest` (`src/runtime/useGameLoop.ts:787`), whose only consumer sits inside `onFrame` (`:440`); the frame callback is stopped on this branch and nothing clears the counter at a run boundary, so the worst-case load is **queued** and applies on the **first frame of the next run** that arms the loop, below the retry-reset block, onto the freshly reset world. It therefore contaminates the next run — see § Limits item 2 for what that costs an SC-5 reading. Pinned link by link in `tests/runtime.cert-request.test.ts`, which reads source and **cannot produce a frame**; nothing in this clause is a frame-level measurement. Case: `an ENDED campaign run is not re-armed: a press from the mounted lose panel with the tier already Mid moves no level and starts no loop`, in `tests/ui/PlayingHost.endless-retry.test.tsx` |

**The record-first rule is enforced in exactly one place: the first statement of
`startEndlessRun()`.** That placement is the point, not an implementation detail. Enforced at the
callers instead, it covered two of five of them — and the two it missed included the `Endless`
button itself. Phase 14 promotes `startEndlessRun` to the production entry point, so an invariant
living inside that function survives the promotion while one living at today's `__DEV__` callers
would be deleted along with the dev row.

The campaign `retry()` is unreachable from an endless Retry. It refills lives against whatever
board is sitting in `compiledSv`, which mid-run is the **wave-N generated board** — so before
this change a Retry chain from wave K would let the next loss record wave K+1.

**Why the record is trustworthy now, in one sentence:** `telemetry.endless.bestWave` can only be
raised by a wave that some single continuous run actually reached, because every path that
discards a run records it first and every path that starts one returns to wave 1. That sentence
is the phase goal, and it was false until this round.

> **Correction, 2026-09-26.** The sentence above is left standing because this is the document
> where a superseded claim is kept visible next to its correction (the same treatment
> `docs/ops/BOARD-GENERATOR.md` § Limits item 2 received), not quietly rewritten as though it had
> always held. **Its first conjunct was FALSE as originally shipped.** The round that wrote it
> wired the abandon funnel at two of `startEndlessRun`'s five callers, and the verifier measured
> the consequence rather than inferring it: from a live run at wave 2, pressing the `__DEV__`
> `Endless` button returned the readout to `W1` with `recordRunEnd` called **zero** times, and
> `Lv` did the same while additionally filing the next loss under `{mode:'endless', wave:2}` for
> a campaign level. A reader picking the mode up would have trusted the bold sentence over the
> code. It became true on **2026-09-26**, when the funnel moved inside `startEndlessRun` and
> `toggleDevLevel` became an explicit exit — the two boundary rows added to the table above.

> **The `Cert WC` counterexample, considered and answered (2026-09-26).** The bolded sentence
> above is **not** superseded by the `Cert WC` row, and the reasoning is written down here so
> that the next reader finds it already worked through rather than rediscovering it. `11-REVIEW.md`
> **WR-07** read the control as a path that discards an endless run *without* recording it — a
> flat counterexample to the invariant. The verifier measured it instead of reasoning about it,
> and the honest version is narrower. With the forced tier **unset**, the control's tier half
> reaches the funnel and the run **is** recorded (one call, at the wave reached). With the tier
> already `mid`, the tier half no-ops and — before `11-14` — the level half ran alone: that
> branch did not *discard* a run, it **froze** one. `runEndedRef` stayed `false`, the wave, seed
> and score all stayed intact, and Pause → `Menu` still recorded the run `abandoned` at the wave
> it had reached. A frozen run is still a recordable run, so the invariant held even in the
> branch that looked like a counterexample. **After `11-14` the branch no longer exists to
> answer:** with the level half gated on the run mode the press leaves the run live and running
> (measured `W2` → `W2`, no `recordRunEnd`, no `setActive`), so there is nothing for this
> invariant to cover there at all. The sentence stands on its own terms in both branches.

A generated board that fails to compile deliberately does **not** route to `LevelErrorOverlay`.
That overlay has no controls, and `GameScreen` suppresses `showResult` while `levelError` is
non-null, so the old route left a live simulation behind a modal with two dead buttons. The
failure is reported as Results body copy instead, and `Retry` stays live.

### The Results overlay reads the record the player just set

`telemetry.endless` previously had **no reader anywhere** in `app/` or `src/` — the record an
endless player set was the one number never shown to them. The endless Results overlay is now
that reader, and the only one this phase ships.

| Field | Campaign source | Endless source |
|-------|-----------------|----------------|
| `Best · {n}` | `previousBestRef` ← `getBestForLevel(levelId)` | a **separate** watermark ref ← `getSnapshot().telemetry.endless.bestScore` |
| `Best wave · {n}` | not rendered | a **separate** watermark ref ← `getSnapshot().telemetry.endless.bestWave` |
| `New Record` | `score > campaignPB`, strict | `score > bestScore` **or** `wave > bestWave`, both strict |
| Post-run write-back | `previousBestRef := best` on a record | the endless refs only — `previousBestRef` is **never** written by an endless run |
| Stars / `Next` | rendered when earned | never rendered (SC-1: an endless run never ends on a cleared board) |

**The mode branch happens before the comparison, not after.** That ordering is the fix, not an
implementation detail: `handleRunEnded` used to compute `evaluatePersonalBest(runScore,
previousBestRef.current)` first and branch on mode second, and that single ordering produced all
three symptoms at once — the campaign per-level best displayed as the endless `Best`, `New
Record` firing against an unrelated campaign score, and the endless score written back into
`previousBestRef`, which the next run start then re-published as the campaign best.

Displayed values are **post-merge**, read from the blob `recordRunEnd` returns synchronously —
not from a second, racing `getSnapshot()`. Both record lines render in the same weight and
colour under one shared badge: **which of the two is *the* record is deliberately not decided
here** (see § Limits item 4).

### Flagged assumptions from this round

Recorded here rather than left only in the planning artifacts, so an open question is visible
where work gets picked up.

- **A-01 — a Retry that cannot build wave 1. DECIDED 2026-09-26 (owner):** `retry-in-place`. The
  Results overlay stays on screen, the body becomes `Wave 1 could not be built — tap Retry`, and
  `Retry` stays live so a second press re-mints a different seed. `Wave 1` is contract copy and
  is **not** templated — a Retry-time failure is always at wave 1. The mid-run body
  `Wave {n} could not be built — run saved` is deliberately not reused there: at Retry time
  there is no in-flight run to save, so it would state something untrue.
- **A-02 — the other `__DEV__` row controls after endless is entered. DECIDED 2026-09-26
  (owner).** *The problem, as it stood:* `modeRef` was written only to `'endless'` and never
  back, so once endless was entered the compiled-push gate effect early-returned for the rest of
  the mount — `Lv`, the tier button and `Cert WC` baked, flipped `fxReady`, and never reached
  `setActive(true)`, leaving a stopped frame loop behind a live HUD.
  **The decision taken:** `Lv` **exits endless back to campaign**. `toggleDevLevel` records the
  in-flight run `abandoned` at the wave it reached, then returns `modeRef` / `mode` to
  `'campaign'`, clears `waveRef` and the wave-advance guard, and switches the level; the next run
  is a campaign run recorded through the campaign arm.
  **The two options rejected:** *disable the controls while endless is live* (it hides a
  one-way trap behind a greyed-out button rather than removing it, and the dev row is where the
  mode is exercised from), and *defer the whole question to Phase 14* (the trap is live now, and
  Phase 14 deletes the dev row — deferring would mean the mode ships its whole `__DEV__` life
  with it).
  **The consequence that matters beyond this control:** `toggleDevLevel` is now the **first and
  only** writer returning `modeRef` to `'campaign'`, so the compiled-push gate effect is live
  again for the rest of the mount instead of dead after the first endless entry. A source
  contract asserts that writer count is exactly one, so a second writer forces this claim to be
  rewritten rather than silently invalidated.
  **What is NOT resolved by this decision:** the tier button and `Cert WC` are unchanged and are
  not re-specified. The SC-5 discharge procedure in item 2 therefore keeps a do-not-press note,
  **narrowed** to those two.
- **A-03 — the per-run seed can collide inside one millisecond. RECORDED, not fixed.**
  `runSeedRef.current = Date.now() >>> 0` is re-minted by the same expression at every run start,
  so two run starts inside one millisecond draw the same board sequence. A new seed policy would
  be a Phase-10-adjacent determinism decision, and the property is unchanged from the shipped
  behaviour. It cannot inflate `bestWave` — each run still records its own wave.
- **A-04 — the brick-dimension mismatch (WR-01). DECIDED 2026-09-26 (owner): accepted debt.**
  Recorded in full as § Limits item **7**; the `ENDLESS_BRICK_DIMS` fix lands in Phase 14. No
  code in this round touches the bake path.
- **A-05 — SC-5 remains the standing human-verification item.** No automated step in this repo
  measures a frame on hardware, and none of this round's work claims to. § Limits item 2 stays
  **OPEN**.

---

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

> **Device digest: OPEN — recorded 2026-09-25. SC-5's device half is UNMEASURED.**
> **What is unmeasured:** that an endless **wave transition** produces **no frame spike outside
> the Mid budget** on real hardware. The Mid cert budget is p50 ≤ 16.7 ms and p95 ≤ 20 ms per
> frame. Everything measured so far proves only that the glow-bake / audio-preload cold path is
> not *entered* at a transition — a source-level argument (plan 11-05's D-14 re-key of `loadKey`
> onto brick dimensions alone) plus a jsdom observation. **Nothing here measures a frame on a
> phone.** The ≈ 0.56 ms generate+compile figure remains a Node microbenchmark scaled by the
> 15.5× Hermes ratio, and that ratio itself came from an iOS **simulator** run, not a device.
> **Discharge procedure:** launch a dev build; arm the perf overlay; press the `Endless` button
> in the `__DEV__` dev row on the playing HUD (alongside Lv / tier / Cert WC / Crash); play
> **waves 1 through 5**; watch each transition specifically — the moment the last brick of a
> board breaks and the next board appears.
> **Do not press the tier button or `Cert WC` during the reading.** Both are still hazardous,
> for reasons **re-measured against the shipped source on 2026-09-26**, after the code change
> described in the `Cert WC` bullet below:
> - **the tier button** (`cycleDevTier`) changes `tierOverride`, which fires `remountDevSession`;
>   its endless branch routes straight to `startEndlessRun()`, so the run you are measuring is
>   recorded `abandoned` and **restarted at wave 1**. That is reason enough on its own: the run
>   under measurement is gone and a fresh wave-1 run is in front of you.
> - **`Cert WC`** (`runCertWorstCase`) is hazardous on **both** of its branches, but the
>   injection claim this bullet used to open with unconditionally is true of only ONE of them,
>   and this is the branch it is true of: **when the forced tier is ALREADY `mid`** the press
>   **injects the worst-case ball, particle and shake load onto the board under measurement** —
>   measured `injectCertWorstCase` 0 → 1, with the run still live — and that injection alone
>   disqualifies any frame time captured across it, because it is a deliberately pathological
>   frame rather than a wave transition. **When the tier is NOT already `mid` the function
>   returns at its `defer` branch before the injection and injects NOTHING** (measured
>   `injectCertWorstCase` 0 → 0). The reading is disqualified on that branch too, but for the
>   different reason the first sub-bullet below already gives — the run under measurement was
>   recorded `abandoned` and restarted at wave 1, so there is no longer a run to measure. Its
>   two halves behave differently from each other, and both were measured on 2026-09-26:
>   - **the tier half**, when the tier is **not already `mid`**, sets it to `mid`, which is the
>     tier button's path above: the run is recorded `abandoned` at the wave it had reached and
>     **restarted at wave 1** (measured from a live run at wave 2: readout `W2` → `W1`,
>     `recordRunEnd` called once with `{mode:'endless', wave:2, outcome:'abandoned'}`).
>     - **Re-scoped 2026-09-26 (round 4).** Before this round that branch also left an **armed
>       one-shot** behind it. The press injected nothing, as above — but it still deferred a
>       worst-case injection, and where that injection eventually landed depended on where the
>       session already was, which is why it had to be measured on both sub-branches rather than
>       reasoned about. Starting **below `level-03`**: 0 injections at the press, and then
>       **exactly one on a later campaign session that never pressed the button**, fired by
>       walking the `Lv` control forward to `level-03`. Starting **already on `level-03`** —
>       **corrected 2026-09-26 (round 5):** `level-03` is the `CERT_HARNESS` mount level
>       (`app/_components/GameHost.tsx:196`,
>       `levelId={CERT_HARNESS ? 'level-03' : activeLevelId}`) and the **last** of the five
>       entries in `PLAYABLE_LEVEL_ORDER` (`src/services/storage/catalog.ts:14-19`). What ships
>       as the default is `level-01` (`app/_components/GameHost.tsx:68`,
>       `const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01')`), so an
>       operator following the discharge procedure above — a dev build, explicitly **not** a
>       `CERT_HARNESS` build — starts on `level-01` and is **four `Lv` presses** away from
>       `level-03`. That makes this the RARE sub-branch, not the common one; the round-4
>       revision of this clause claimed the opposite, and reading the shipped source
>       contradicts it. It remains a sub-branch no earlier round measured:
>       the restarted endless run satisfied the deferral's own preconditions itself and took the
>       injection, one, onto the fresh wave-1 board. Since this round **an endless press arms no
>       deferral at all** — including on that second sub-branch, where one could have discharged —
>       this branch now leaves nothing behind on either: measured **0 injections at the press and
>       0 across the whole `Lv` walk**. The operator does not have to think about it. It is
>       recorded here because the previous revision of this block would have had to warn about it.
>   - **the tier half is a no-op when the tier is already `mid`**, and — new on 2026-09-26 — the
>     **level half no longer fires at all while the mode is endless**. Measured from a live run
>     at wave 2 on `level-01` with the tier already Mid: the readout stayed at `W2`, the dev
>     row's level-switch control still named `level-01`, `recordRunEnd` was **not** called (the
>     run did not end), and the frame loop was
>     **not** stopped (no `setActive` call of any kind). The run survives the press — but it
>     survives it carrying the injected worst-case load, which is why the control stays in this
>     warning.
>     - **Extended 2026-09-26 (round 5).** The mode term above is only ONE of the level half's
>       terms; `11-17` added a second. As shipped, the level half fires **only when all three of
>       these hold: the run has NOT ended, the mode is campaign, and the level is not already
>       `level-03`** — `runCertWorstCase` in `app/_components/PlayingHost.tsx` opens that branch
>       on `plan === 'force'`, where `plan` comes from the pure predicate `certLevelPlanFor`
>       in `app/_components/certLevelPlan.ts` (**re-pointed 2026-09-28**). Round 6 extracted
>       the three terms into that one predicate and deleted the inline expression this line
>       used to quote; `'force'` holds exactly when it held, so the operator consequence below
>       is unchanged.
>       What that adds for an operator: **a `Cert WC` press from a MOUNTED Results overlay moves
>       no level and starts no loop** — in campaign as well as in endless. Measured in round 5
>       from a mounted campaign **lose** panel at `{score: 2400, lives: 0}` with the tier already
>       Mid: the dev row's level-switch control still named `level-01`, `retry()` was **not**
>       called, there were **zero** `setActive(true)` calls (and no trailing `setActive(false)`
>       either, because nothing was re-armed to stop), the Results panel stayed up still reading
>       the run's own `2400`, and `injectCertWorstCase` was called **once** — with `defer` false
>       the press reaches the injector. The case that took
>       that measurement is `an ENDED campaign run is not re-armed: a press from the mounted lose
>       panel with the tier already Mid moves no level and starts no loop`, in
>       `tests/ui/PlayingHost.endless-retry.test.tsx`. The round-4 sentence above stands as
>       written: it is NARROWER than the shipped condition, not wrong about it.
>     - **Corrected 2026-09-26 (round 6) — where that load actually goes, and what it costs the
>       reading.** The round-5 revision above closed with a clause naming the just-ended run as
>       the DESTINATION of the injected load. That clause is **withdrawn**. It is described here
>       rather than quoted, because this correction pins it at zero occurrences in this file and
>       the verbatim original stays in git at `6bb18bf`. It was never measurable by the
>       instrument it was attached to: `injectCertWorstCase` is a stub in the host test that took
>       the count, so the count could only ever show that the host reached the injector.
>       **THE MECHANISM.** `injectCertWorstCase` applies nothing. It bumps a counter,
>       `certRequest` (`src/runtime/useGameLoop.ts:787`). The one and only consumer of that
>       counter sits inside `onFrame` (`src/runtime/useGameLoop.ts:440`); the frame callback is
>       registered stopped (`useFrameCallback(onFrame, false)`) and is not running on this
>       branch; and **nothing anywhere clears `certRequest` at a run boundary** — not a retry,
>       not a level change, not a mode change. So the worst-case load is **QUEUED**, and it
>       applies on the **first frame of the next run** that arms the loop, below the retry-reset
>       block, onto the freshly reset world.
>       **WHAT THIS MEANS FOR THE READING — the half that matters for SC-5.** A `Cert WC` press
>       from a mounted Results panel **contaminates the next run**, and a `Retry` from that same
>       panel IS that next run: the reset it performs runs ABOVE the injection on the same frame,
>       so the fresh board starts life carrying the pathological load. Any frame-budget number
>       taken from that run is measuring a deliberately worst-case frame rather than a wave
>       transition. **The reading must be restarted.** That is not a new instruction — it is the
>       existing `restart the app and take the reading again` below, and round 6 makes it
>       **load-bearing rather than precautionary**. It applies to a press on EITHER branch: the
>       ended-run branch with the tier already `mid` queues a load, and — from round-6 gap 1 —
>       the ended-run branch with the tier still Auto arms nothing but still restarts the session
>       through the tier half, which is a run boundary in its own right. `Cert WC` consequently
>       stays in the do-not-press set for TWO distinct reasons now, not one.
>       **THE INSTRUMENT, AND ITS LIMITS.** Every link above is pinned at source in
>       `tests/runtime.cert-request.test.ts` — five assertions, one per link, each stating its
>       measured base and what a failure means. That file **reads source and cannot produce a
>       frame**: `onFrame` is a Reanimated worklet and no automated step in this repo can drive
>       one. Nothing stated here is a frame-level measurement and it must not be cited as one.
>       The frame-level reading is precisely the one SC-5 is still waiting on a device for.
>
> **Why the level half was gated** (background, not an instruction): while the mode is endless
> the compiled-push gate effect early-returns, so a forced `level-03` board could never be
> pushed and `setActive(true)` was never reached from it. The only thing the level half produced
> was a **stopped frame loop behind a live HUD**, with nothing recorded. `11-14` gated it on the
> run mode (owner decision, 2026-09-26).
>
> **Amendment, 2026-09-26 — a glow-atlas mechanism claim in this block is WITHDRAWN.** An
> earlier revision of these two bullets told the reader that forcing a new quality budget causes
> the glow sprite atlas to be created again, and that a frame time captured across the press was
> therefore measuring that work rather than a wave transition. Both halves of that claim are
> false and the reader must **not** discard a reading for that reason. As measured this round,
> the `bakeGlowSprites(brickW, brickH)` call count across a tier press is **one before the press
> and one after** — unchanged. The atlas is keyed on `loadKey`, which is the compiled brick
> **width and height alone**, and the bake effect's dependency array
> (`[audio, haptics, glowAtlasSv, loadResult, loadKey]`) **carries no tier term at all**. Only a
> level whose bricks are a *different size* can cause the atlas to be built again; **no quality
> tier ever does.** That keying is plan **11-05's D-14 re-key**, and this is precisely the point
> of it — see § Limits item 7, which states the same fact about the stretched halo. The tier
> button and `Cert WC` remain in the do-not-press set for the reasons given above, which are
> real; the glow-atlas reason never was.
>
> If either is pressed, **restart the app and take the reading again** — the numbers from that
> point on are not a wave-transition measurement.
>
> **`Lv` came OUT of this warning on 2026-09-26** and must not be put back without a reason.
> Assumption **A-02** was decided that day: `toggleDevLevel` now records the in-flight run and
> **exits endless**, returning `modeRef` to `'campaign'`, so it no longer leaves a stopped frame
> loop behind a live HUD. It is an explicit, visible exit rather than a silent trap — pressing it
> ends the endless run, and the reading simply resumes by pressing `Endless` again from wave 1.
> (Amended 2026-09-26: originally this note named `Lv`, the tier button and `Cert WC` together,
> on the premise that `modeRef` never returned to `'campaign'`; A-02's resolution removes `Lv`
> from the set and nothing else.)
> **Failure signatures — what the reader is looking for:**
> (a) a **visible black playfield** at a transition;
> (b) an **audio hiccup** at a transition;
> (c) an **`[audio] preload soft-fail`** line in the log mid-run;
> (d) a **frame-time spike outside the Mid budget** at a transition (p50 above 16.7 ms, or p95
> above 20 ms).
> **Expected and ACCEPTED — not a fifth failure signature.** Every brick on every endless wave
> draws a **stretched glow halo** (§ Limits item 7): the atlas is baked from the campaign level's
> brick dimensions while generated boards use a smaller lattice, so each halo is squashed by
> 0.77x horizontally and 0.85x vertically. It is visible, it is known, and the owner accepted it
> on 2026-09-26 with the fix scheduled for Phase 14. **Do not write it up as a new defect, and do
> not discard, postpone or fail the reading over it.** Expect to see it, recognise it, and carry
> on to the frame-time numbers — which are what this reading is for. The failure signatures above
> remain exactly four.
> Any one of those means the bake or preload cold path is still re-firing per wave and plan
> 11-05's re-key did not hold in practice. That is a **gap-closure signal — a code fix, not a
> documentation edit.**
> **To discharge:** replace this block with a dated `Device digest: MEASURED <date> — SC-5
> DISCHARGED` block carrying the raw reading (device and OS, wave range played, whether any
> stall was observed at a transition, and the perf-overlay frame times across a transition),
> exactly as assumption **A1** was discharged in `docs/ops/BOARD-GENERATOR.md` § Limits item 1.
> **"No device available" is a valid outcome:** this block stays OPEN and the tracking line
> stays. Do **not** write a passing reading that was not taken.
> Tracked in `.planning/STATE.md` § Pending Todos.

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

*The paragraph immediately below is **SUPERSEDED as of 2026-09-26** as to its scope. It is kept
verbatim, because this section exists so a later phase can see both what was believed and what
corrected it. Read it together with the supersession note that follows it.*

**6. Endless records are firewalled from campaign progress, and that is a type property now.**
`recordRunEnd` takes a discriminated union whose endless arm has **no** `levelId`, so TypeScript
narrowing forces the runtime mode gate to exist (**D-11**); the endless record lives inside
`TelemetryBlob`, and `LevelId` was deliberately **not** widened to admit an endless value
(**D-12**). This closed a real pre-existing defect: both stores previously called
`applyLevelBest(...)` unconditionally and `unlockAfterClearPure(...)` on any win, with no
reference to the mode — an endless win would have written a campaign best and unlocked a
campaign level. What is *not* established is anything about cross-device or cloud sync of those
records; there is none, and nothing here designs for one.

> **SUPERSEDED 2026-09-26 — the firewall claim was true of the STORAGE layer only.**
> Corrected by: § *The run boundary and the record display* above, and `11-VERIFICATION.md` gap 2.
> **What was wrong.** Everything the paragraph above claims is still true, and the type property
> genuinely holds — but it was written as though it covered "endless records" generally, and it
> covered the write path alone. The **display** path breached the same firewall in both
> directions: `handleRunEnded` compared an endless run against `previousBestRef`
> (`store.getBestForLevel(levelId)`, a campaign per-level best) *before* branching on mode, so an
> endless run showed a campaign number as its `Best`, fired `New Record` against an unrelated
> campaign score, and wrote its own score back into that campaign ref, where the next run start
> re-published it. Nothing persisted, so the narrowest reading of SC-3 survived; its plain
> meaning did not.
> **What holds now.** The firewall covers the display path too: per-mode watermark refs
> (`endlessBestScoreRef` / `endlessBestWaveRef`, seeded from `telemetry.endless`) selected
> **before** the personal-best comparison, and **no** endless write-back to `previousBestRef` at
> all. Pinned by `tests/ui/PlayingHost.endless-record.test.tsx`, including a probe that seeds a
> distinct campaign best and requires it to be absent from the rendered overlay.
> **Still not established,** unchanged: anything about cross-device or cloud sync of these
> records. There is none, and nothing here designs for one.

**7. The endless glow atlas is baked at the wrong brick size — accepted debt, fix in Phase 14.**
Recorded, not fixed, by owner decision of **2026-09-26** (`11-VERIFICATION.md` § Anti-Patterns
Found, **WR-01**; § Human Verification Required item 2 is the scope question it was routed as).

**The mismatch, as measured rather than as an impression.** The atlas is baked from the active
*campaign* level's compiled brick dimensions — `bakeGlowSprites(brickW, brickH)` reads
`loadResult.compiled.w[0]` / `.h[0]` (`app/_components/PlayingHost.tsx`, the bake effect), which
for `level-01` is **44x18**. Every *generated* board draws on the fixed **32x14** lattice
(`src/levelgen/grid.ts:32-41`). A 44x18 brick bakes a **52x26** halo; drawn onto a 32x14 brick
that halo is squashed into **40x22** — a non-uniform **0.77x horizontal / 0.85x vertical** stretch
on every brick of every wave.

**Why it is being carried rather than fixed.** It breaks no success criterion. SC-5 is about the
bake firing **once per run** rather than per wave, and it still does: plan 11-05 re-keyed
`loadKey` onto brick dimensions alone, and every generated board sits on the one fixed lattice, so
the atlas identity never changes mid-run. The defect is purely cosmetic and it is visible only on
the `__DEV__` path endless is reachable from today, which Phase 14 deletes anyway.

**Where the fix lands.** Phase 14, alongside the production endless chrome — an `ENDLESS_BRICK_DIMS`
constant that the bake keys off in endless mode instead of the campaign level's compiled
dimensions. **Nothing in this round changes the bake path**, deliberately: the 11-08 plan carries a
`grep` fence on the `bakeGlowSprites(brickW, brickH)` call precisely so this stays a recording.

**Consequence for the SC-5 reading.** Whoever takes the device reading in item 2 will see the
stretched halo. Item 2's discharge procedure says so explicitly, so that it is neither written up
as a fresh defect nor treated as a reason to discard the reading.
