# Phase 11: Endless Mode - Research

**Researched:** 2026-09-25
**Domain:** Run-loop extension (wave chaining over a seeded generator), game balance measurement, mode-scoped persistence
**Confidence:** HIGH for the measured findings and the code seams; MEDIUM for on-device frame cost (one ratio-scaled estimate, not a device probe)

## Summary

This phase adds no new subsystem. Every ingredient already exists and is tested: `generate(seed, difficulty)` is closed and proven, `applyCompiledLevel` already swaps a board into a live `World`, `dockBall`/`processDocked` is the serve path taken after every life loss, and `mode: 'endless'` already exists in the v4 telemetry blob. Phase 11 is **one new worklet function, one new request counter, one mode branch in the WON handler, and a mode gate in `recordRunEnd`** — plus a written-down ramp. A headless prototype built during this research ran 30 waves end to end through the real `stepRun` pipeline with **zero changes to `src/core`**, and replayed byte-identically on a second run.

**The open question is settled, and the answer is "do not re-tune."** A 500-seed scan at difficulty 20 specifically found **0 non-wins** and a clear-time distribution of p50 172.5 s / p95 446.2 s / worst 1495.3 s. But the tail is **not a property of the board**: replaying the eight slowest d=20 boards under seven different paddle offsets collapsed `s=33` from **1495.3 s to 83.0 s** — an 18× spread on the *same board*, changing only the bot's trajectory. Six of the eight worst boards clear in under 200 s at some offset. The 1495 s figure is an artefact of one deterministic bot trajectory re-entering a limit cycle, not evidence of an unclearable board. Re-tuning `SCHEDULE` cannot remove it, because per-difficulty medians barely move with `d` (125.8 s at d=12 against 179.1 s at d=20, +42 %) while the per-difficulty *maxima* are non-monotone in `d` at all (d=17 peaks at **2735.3 s**, worse than d=20's 1495.3 s). Cutting the dials would buy a ~34 % median reduction and leave the tail exactly where it is, at the cost of re-running Phase 10's monotonicity proof and 21 000-board sweep.

**There is no softlock.** 1 900 measured board plays produced zero non-wins; every generated board carries breakables by construction; the run ends on lives via `applyLivesFromBallCount`, which is untouched by this phase. A player who cannot clear wave 21 loses by missing, which is a legitimate ending condition for an endless mode.

**Primary recommendation:** Implement the wave advance as a new `applyWaveAdvance` worklet in `src/runtime/worldRequests.ts` driven by a new request/apply counter pair in `useGameLoop`, intercept `SimPhase.WON` in `PlayingHost`'s existing `applyChrome` reaction, reset `world.tick` at each wave boundary (and bank `ticksPlayed` in the app tier), generate lazily at the transition on the JS thread, store the endless record inside `TelemetryBlob` (not at blob top level), and gate the campaign writes inside `recordRunEnd` on `mode === 'campaign'`. Leave `src/levelgen/` byte-unchanged.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Wave → difficulty ramp**

- **D-01: Difficulty clamps at 20; the seed changes every wave.** Waves 1→21 walk
  `difficulty 0..20` one step per wave; wave 21 onward stays at 20 with a fresh seed, so
  boards keep changing without the difficulty contract growing. Chosen over extending
  `D_MAX` specifically because that would re-open Phase 10 — a wider `SCHEDULE` needs its
  monotonicity proof and its 21 000-board sweep redone.
- **D-02: One wave is one difficulty step** (not a slower 2–3 wave ramp). With Phase 10's
  measured p50 of 108 s per board, a slower ramp puts the interesting difficulty an hour into
  a session.

**Wave transitions**

- **D-03: Timed effects and multiball end with the wave; the ball re-docks.** Expand, slow and
  fireball expire, extra balls are dropped, and the new board starts from the existing
  dock-and-tap serve path. Lives, score and combo carry (roadmap SC-1).
  Rationale: a ball in flight across a board swap is an awkward state — position, velocity and
  brick lattice all change at once — and the dock path already exists and is tested.

**Lives**

- **D-04: No new life mechanic.** Endless uses the campaign rules unchanged — lives start at 3,
  the 8 % extra-life drop is the only source, and `MAX_LIVES = 5` still caps it. A per-N-waves
  life grant was considered and rejected: it is a new, uncalibrated mechanic, and the cap is
  what stops a long run becoming unlosable.

**Entry point**

- **D-05: A temporary `__DEV__` button**, alongside the existing Lv / Auto high / Cert WC /
  Crash dev buttons on the HUD. Phase 14 replaces it with the real Title entry and this one is
  deleted then. It must not appear in a production build.

### Claude's Discretion

- How the per-wave seed is derived from the run seed and wave index. It must be pure and
  deterministic so SC-4 holds (same run seed + same inputs ⇒ same wave sequence), and it must
  not reuse one seed across waves.
- The shape of the endless record in storage, within Phase 9's existing v4
  `(mode, levelId)` telemetry keying — `mode: 'endless'` already exists.
- What the HUD shows for wave number, and where.
- Whether board N+1 is generated eagerly during wave N or on transition, provided SC-5 holds.

### Deferred Ideas (OUT OF SCOPE)

- **Title entry, mode select and any real shell chrome** → Phase 14. D-05's dev button is
  explicitly temporary and must be deleted there.
- **Daily challenge** → Phase 12, which reuses this phase's board-swap seam.
- **Achievements over endless play** → Phase 13.
- **Which record is "the" record** (best wave vs best score) as a display decision → Phase 14.
  This phase stores both, per N-END-02.
- **Extending `generate`'s difficulty range** → not planned; D-01 exists to avoid it.

### Additional scope fences from CONTEXT

- `src/levelgen/` — **Closed; do not modify.**
- `src/core/**` — **must not change.**
- `PLAYABLE_LEVEL_ORDER` is campaign-only and must stay that way (SC-3).
- Storage writes are async and non-blocking: synchronous memory merge, `void` persist.
- Nothing may allocate on the simulation or render hot path. Generation is a JS cold path.
- Keep the board-swap seam separable from the endless-specific ramp — Phase 12 reuses it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **N-END-01** | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | §Architecture Pattern 1 (`applyWaveAdvance`) + §Pattern 2 (WON intercept). Prototyped headlessly: 30 waves, lives/score/combo carried, 0 stuck waves. `applyLivesFromBallCount` already owns the zero-lives terminal and is untouched. |
| **N-END-02** | Endless records (best wave, best score) stored separately — endless play cannot alter campaign unlocks, bests or stars | §Pattern 5 (endless record inside `TelemetryBlob`) + §Pitfall 1 (`recordRunEnd` currently writes `bestByLevel`/`bestScore`/`unlocked` for **every** mode — this is the SC-3 hazard and needs a mode gate). |
| **N-END-03** | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | §Q7 (measured: identical run seed ⇒ identical `hashWorld` at every wave boundary, 12 waves, zero core changes) + §Q8 (generate+compile ≈ 0.036 ms Node, ≈ 0.56 ms Hermes-scaled, and it runs on the **JS** thread, not the UI runtime — §Pitfall 2 is the real SC-5 risk). |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

`./CLAUDE.md` is a one-line `@AGENTS.md` include. `./AGENTS.md` reads, in full:

> # Expo HAS CHANGED
> Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

**[VERIFIED: ./AGENTS.md:1-3]**

Directive for the planner:

- **Any task whose `<files>` introduces or changes an `expo-*` / `expo` import MUST consult `https://docs.expo.dev/versions/v57.0.0/` first**, and say so in the task.
- Based on the seams identified below, **this phase is expected to add no Expo API surface at all**. The dev button is a `react-native` `Pressable` (the established pattern — `app/_components/PlayingHost.tsx` `devLevelSwitch`), storage goes through the already-pinned `@react-native-async-storage/async-storage@2.2.0` seam, and the wave loop is core/runtime/levelgen only. Same disposition as plan 10-04, which recorded "No Expo API is reachable from this plan's files" by inspection rather than assumption.
- If a plan *does* reach for an Expo API, the versioned-doc read is a hard precondition, not a nicety.

No `.claude/skills/` or `.agents/skills/` directory exists in this repo — **confirmed by inspection**, not assumed. `.claude/` contains only GSD settings. [VERIFIED: filesystem listing this session]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wave → difficulty ramp (D-01/D-02) | `src/services/endless/` (new) | — | Pure integer function of wave index. Needs `D_MAX` from the levelgen barrel; `services → levelgen` is an allowed crossing (LC-16) and `runtime → levelgen` is **not**. Node-testable with no React. |
| Per-wave seed derivation | `src/services/endless/` (new) | — | Same reasoning; pure, uses `hashSeed`/`mixSeed` from the levelgen barrel. |
| Board generation | `src/levelgen/` (closed) | — | Already exists. Called from the app/services tier only (LC-16). |
| Compile a generated board to `CompiledLevel` | `src/runtime/loadLevel.ts` | — | `loadAndCompile` lives in `src/core`; `app/` may not import `core`. `runtime → core` is LC-02. One thin wrapper keeps app clean. |
| **Board swap on a live world** (the seam Phase 12 reuses) | `src/runtime/worldRequests.ts` | `src/core` (read-only: `applyCompiledLevel`, `dockBall`, `derivePaddleWidth`) | This is where `applyRetryWorldReset` and `applyCertWorstCaseInject` already live. Mode-agnostic by design. |
| Request plumbing (JS → UI runtime) | `src/runtime/useGameLoop.ts` | — | The `resetRequest`/`resetApplied` counter pattern is established and is the only sanctioned way to mutate the live `World` from JS. |
| WON interception / wave counter / run boundary | `app/_components/PlayingHost.tsx` | — | `applyChrome` is already the single place that reacts to `SimPhase.WON`. Run boundaries and `recordRunEnd` already live here. |
| Endless record persistence | `src/services/storage/` | — | The v4 blob, its parser and both store implementations live here. |
| Dev entry button (D-05) | `app/_components/PlayingHost.tsx` | — | `devLevelSwitch` is the established `__DEV__` row. |

**Nothing goes in `src/core`.** Every core function the wave advance needs is already exported from `src/core/index.ts`: `applyCompiledLevel` (:78), `dockBall` (:102), `derivePaddleWidth` (:111), `SimPhase` (:14), `hashWorld` (:5). [VERIFIED: src/core/index.ts:5,14,78,102,111]

---

# THE OPEN QUESTION, SETTLED

Everything in this section was **measured in this session** with the repo's own harness (`tests/helpers/balanceBot.ts` `runBotOnLevel`, `paddleOffset: 12`, the same instrument plan 10-04 used), through the real `loadAndCompile` → `applyCompiledLevel` → `stepRun` pipeline. The scratch test files were deleted; `git status --porcelain` is empty.

## Q1 — What is the clear-time distribution at difficulty 20 *specifically*?

**500 seeds, `d = 20`, budget 3 000 simulated seconds.** [VERIFIED: bot scan this session, 500 boards, 0 non-wins]

| n | min | p50 | p75 | p90 | p95 | p99 | max | mean |
|---|---|---|---|---|---|---|---|---|
| 500 | 78.8 s | **172.5 s** | 239.7 s | 337.7 s | 446.2 s | 656.8 s | **1495.3 s** (`s=33`) | 209.1 s |

Tail mass, as counts out of 500:

| over 300 s | over 420 s | over 600 s | over 900 s |
|---|---|---|---|
| 69 (13.8 %) | 26 (5.2 %) | 7 (1.4 %) | **3 (0.6 %)** |

**Non-wins: 0 of 500.** Every board reached `bricksRemaining === 0`.

The d=20-specific p50 (172.5 s) is materially higher than the 840-board *pooled* p50 Phase 10 recorded (108 s), which is expected — the pool averaged over `d = 0..20`. The important number is that the **typical** difficulty-20 board is a ~3-minute board for a perfect bot, and only 0.6 % of seeds exceed 15 minutes.

## Q2 — Is the wall real? Can a perfect bot clear a difficulty-20 board reliably?

**Yes, reliably — and the tail is a bot-trajectory artefact, not a board property.** This is the decisive measurement.

The eight slowest d=20 boards from the 500-seed scan were replayed at seven paddle offsets (offset changes only the bot's return angle — the board is byte-identical) and at five different gameplay RNG seed pairs. Clear time in simulated seconds; `12` is the shipped measurement offset: [VERIFIED: bot scan this session]

| board | off 0 | off 4 | off 8 | **off 12** | off 16 | off 20 | off 24 | best | spread |
|---|---|---|---|---|---|---|---|---|---|
| `s=33` | 342.6 | 284.7 | 230.7 | **1495.3** | 160.8 | 117.9 | **83.0** | 83.0 | **18.0×** |
| `s=318` | 200.0 | 321.8 | 254.5 | **1088.7** | 140.3 | **96.6** | 840.9 | 96.6 | 11.3× |
| `s=107` | 433.5 | 165.5 | 275.1 | **927.7** | 155.7 | 151.8 | **143.3** | 143.3 | 6.5× |
| `s=207` | 259.8 | **83.9** | 107.8 | **676.2** | 805.0 | 191.3 | 170.7 | 83.9 | 9.6× |
| `s=298` | 144.5 | 283.1 | **102.0** | **656.8** | 174.8 | 221.2 | 594.1 | 102.0 | 6.4× |
| `s=397` | 145.2 | 251.8 | 220.1 | **651.2** | 92.2 | **83.8** | 108.6 | 83.8 | 7.8× |
| `s=370` | 323.7 | 522.5 | 740.4 | **644.9** | **216.6** | 362.9 | 483.3 | 216.6 | 3.4× |
| `s=481` | 796.0 | 922.5 | 593.6 | **598.6** | 395.6 | **266.4** | 270.0 | 266.4 | 3.5× |

Changing **only** the gameplay RNG seed (drop timings, multiball angles) at the shipped offset 12, same board:

| board | 0xace/0xbeef | 1/2 | 12345/999 | 0xdead/0xbeef | 7/7 |
|---|---|---|---|---|---|
| `s=33` | **1495.3** | 539.1 | 242.8 | 471.5 | **178.6** |
| `s=107` | **927.7** | **175.4** | 376.7 | 354.9 | 181.2 |
| `s=318` | **1088.7** | 306.8 | **178.8** | 334.8 | 218.8 |

Three conclusions, each load-bearing for the plan:

1. **The 1495 s worst case is one trajectory's limit cycle, not a hard board.** The same 128-brick lattice clears in 83 s when the paddle returns the ball 12 world units further right. A human, whose return angle varies constantly, is sampling across this whole row, not sitting on one cell of it.
2. **A residual board-difficulty component exists and is small.** `s=370` (best 216.6 s) and `s=481` (best 266.4 s) are genuinely slow under every trajectory. That is the honest upper bound on "hard board" at d=20 — roughly 4 minutes, not 25.
3. **Bot time is a floor on human time only for a *fixed* policy.** The instrument's own doc comment says so (`tests/helpers/balanceBot.ts:8-9`: *"it never misses on purpose, so its clear time is a floor on human duration"*). What this measurement adds is that the floor is policy-dependent by an order of magnitude, so a single-policy tail number must not be read as a human-time lower bound. Phase 10 recorded the finding as deliberately unasserted and handed it over; this is the follow-up it was waiting for.

## Q3 — If re-tuning is warranted, what changes and what does it cost?

**Re-tuning is not warranted.** The evidence is a per-difficulty scan, 200 seeds at each of `d = 12..20`, same budget: [VERIFIED: bot scan this session, 1 800 boards, 0 non-wins at every difficulty]

| d | bricks | totalHp | p50 | p90 | p95 | p99 | **max** | >300 s | >600 s |
|---|---|---|---|---|---|---|---|---|---|
| 12 | 76 | 126 | 125.8 | 207.9 | 251.8 | 432.6 | 504.4 | 4 | 0 |
| 13 | 86 | 148 | 117.9 | 222.6 | 241.8 | 337.9 | 342.8 | 4 | 0 |
| 14 | 88 | 156 | 118.0 | 198.6 | 223.9 | 313.4 | 343.7 | 2 | 0 |
| 15 | 98 | 178 | 142.1 | 266.6 | 342.4 | 446.2 | 616.3 | 14 | 1 |
| 16 | 100 | 186 | 140.7 | 266.4 | 336.8 | 585.1 | 1023.9 | 15 | 1 |
| 17 | 104 | 200 | 147.8 | 264.2 | 311.6 | 527.4 | **2735.3** | 11 | 1 |
| 18 | 114 | 222 | 148.2 | 288.4 | 333.9 | 427.3 | 730.0 | 16 | 1 |
| 19 | 116 | 230 | 159.0 | 300.9 | 373.6 | 477.3 | 598.7 | 20 | 0 |
| 20 | 128 | 260 | 179.1 | 317.5 | 453.4 | 927.7 | 1495.3 | 28 | 2 |

(`bricks` / `totalHp` quoted verbatim from `docs/ops/BOARD-GENERATOR.md` §The schedule, rows `| 12 |`…`| 20 |`.)

Read the two curves against each other:

- **The median is weakly coupled to the dial.** Brick count rises 68 % from d=12 to d=20 (76 → 128) and total HP rises 106 % (126 → 260); p50 rises **42 %** (125.8 → 179.1 s). Dial changes move the median sub-linearly.
- **The maximum is not coupled to the dial at all.** d=17 (104 bricks) produces a **2735.3 s** worst case — 1.8× worse than d=20's 1495.3 s, on a materially lighter board. The maximum is non-monotone in `d` across the whole top of the range (616 → 1024 → 2735 → 730 → 599 → 1495). A dial that provably controls authored weight monotonically (Phase 10's algebraic identity) does **not** control the clear-time tail, because the tail is generated by trajectory dynamics, not by weight.

**Therefore the cost/benefit of a re-tune is:**

| | Benefit | Cost |
|---|---|---|
| Halve the top-of-range dials so d=20 lands near today's d=13 | p50 **179 s → ~118 s** (−34 %) | Every board for every existing seed is rewritten; the pinned SHA-256 `9e3748c8…` and u32 `0x2e8f6c23` both change; plan 10-05's on-device A1 record goes stale the same instant; Phase 10's 21 000-board sweep and monotonicity proof must be re-run; and the d=13 max is 342.8 s — but the *neighbouring* d=15/16/17 maxima are 616/1024/2735 s, so the tail is not actually reduced, it is re-rolled. |

The generator's own doc anticipates exactly this trade: *"A digest mismatch is never 'just update the number.' … That retroactively invalidates any daily-challenge history keyed on a seed, and it makes plan 10-05's recorded on-device value stale at the same moment."* (`docs/ops/BOARD-GENERATOR.md` §Determinism). [CITED: docs/ops/BOARD-GENERATOR.md §Determinism]

**Recommendation: leave `src/levelgen/schedule.ts` byte-unchanged.** A 34 % median reduction that does not touch the tail is not worth invalidating a discharged device measurement and a 21 000-board proof. If a future phase wants shorter waves, the cheap lever is `SPEED_RAMP_PER_SECOND` or a wave-scoped effect — both outside levelgen and outside Phase 10's proofs.

## Q4 — Is an unclearable wall an acceptable ending condition, and is there any softlock?

The premise is false — there is no wall (Q2). But the softlock question deserves its own answer, because it is the one that would actually be a defect.

**There is no state in which the player can neither clear nor lose.** Four independent reasons, each checkable:

1. **Every generated board carries breakables.** `SCHEDULE[d].hb ≥ 1` at every `d` (the table's smallest row is `d=0` at 32 full-board bricks). `applyWinCheck` reports `WON` when `countBreakableAlive(world) === 0`, and steel never blocks it: *"If playing and no breakables remain → WON (steel never blocks)"* [VERIFIED: src/core/rules/win.ts:18-28].
2. **Every breakable is reachable by theorem, not by filter.** Phase 10's Invariant I is checked over the full mask for every accepted steel pair, and the Theorem says *"If Invariant I holds for the final steel mask, `checkSolvability` reports zero unreachable breakables for **every** assignment of content"* [CITED: docs/ops/BOARD-GENERATOR.md §The Theorem]. Asserted over 21 000 boards.
3. **Measured: 0 non-wins in 1 900 board plays this session** (500 at d=20 + 1 800 at d=12..20 — note the d=20 rows overlap), plus 230 waves played inside the endless prototype, plus Phase 10's own 840. No board ever failed to clear under any budget tried.
4. **The ball cannot be permanently trapped.** `stepAntiStall` escalates deterministically (tier 2 at 1 200 idle ticks applies ×1.08 speed, tier 3 at 1 440 adds an 8° angle nudge), and `applySpeedRamp` raises a speed floor every tick. Neither depends on the board.

**The run ends on lives, and that path is untouched by this phase.** `applyLivesFromBallCount` decrements only when `activeBallCount === 0`, and at zero sets `SimPhase.LOST` and pushes `EventCode.LOSE` [VERIFIED: src/core/rules/lives.ts:11-72]. Endless changes nothing about it. So the positive case stands on its own even if a future dial change reintroduces a hard board: **a player who cannot clear wave 21 loses by missing, not by stalling.**

One thing that *would* create a soft-unlosable run and must not be introduced: **a per-N-waves life grant.** D-04 already rejects it. The measured reason it matters: in the prototype, a perfect bot reached `MAX_LIVES = 5` by wave 6 and sat there for the remaining 24 waves without ever dropping below it. The 8 % extra-life drop plus a cap is what keeps a long run bounded; an uncapped grant would make a competent player's run literally endless in wall-clock terms.

---

## Q5 — How does a board swap mid-run work in practice?

### What `applyRetryWorldReset` does today, and why it cannot be reused

```ts
// src/runtime/worldRequests.ts:27-42 (verbatim)
export function applyRetryWorldReset(
  world: World,
  level: CompiledLevel | null,
  seedGameplay?: number,
  seedCosmetic?: number,
): void {
  'worklet';
  const sg = seedGameplay === undefined ? 0xc0ffee01 : seedGameplay;
  const sc = seedCosmetic === undefined ? 0xbadc0de2 : seedCosmetic;
  resetWorld(world, sg, sc);
  if (level != null) {
    applyCompiledLevel(world, level);
  }
  dockBall(world);
}
```

It calls `resetWorld`, which sets `world.lives = 3; world.simPhase = SimPhase.DOCKED; world.score = 0; world.combo = 1;` and `world.tick = 0` and re-seeds **both** RNG streams [VERIFIED: src/core/reset.ts:44-47,79-81]. That destroys exactly the three things SC-1 requires be carried. **`retry()` must never be called on a wave transition.**

### The new worklet — prototyped and measured

This exact shape ran 30 waves end to end in this session with zero core changes:

```ts
// PROPOSED: src/runtime/worldRequests.ts — mode-agnostic, Phase 12 reuses it verbatim.
export function applyWaveAdvance(world: World, level: CompiledLevel | null): void {
  'worklet';
  // D-03: timed effects end with the wave.
  const maxE = world.maxEffects;
  for (let i = 0; i < maxE; i++) { world.effectType[i] = 0; world.effectUntilTick[i] = 0; }
  world.effectCount = 0;
  derivePaddleWidth(world);            // restores paddleW to 72 and re-clamps paddleX
  // D-03: falling pickups do not cross the boundary.
  const maxP = world.maxPickups;
  for (let i = 0; i < maxP; i++) {
    world.pickupActive[i] = 0; world.pickupType[i] = 0;
    world.pickupX[i] = 0; world.pickupY[i] = 0;
  }
  world.pickupCount = 0;
  // New lattice. lives / score / combo / rngGameplay deliberately untouched (SC-1).
  if (level != null) { applyCompiledLevel(world, level); }
  // D-03: extra balls dropped, ball re-docks on the existing serve path.
  dockBall(world);
  world.simPhase = 0;                  // SimPhase.DOCKED — inline literal, worklet rule
  world.stallIdleTicks = 0;
  world.stallTier = 0;
  world.tick = 0;                      // see Pitfall 3 before changing this
  world.accumulator = 0;
}
```

**What `applyCompiledLevel` already handles for you:** it clears the whole `cellToBrick` map to `-1` and `brickDamagedThisStep` to `0` before writing, caps `n` at `world.brickX.length`, and rebuilds the lattice broadphase via `assignSpatialBrickCells` with an exhaustive fallback [VERIFIED: src/core/levels/apply.ts:24-71]. So the brick side of the swap needs nothing extra.

**What it does *not* touch, which is why the function above exists:** effects, pickups, balls, paddle width, `simPhase`, stall counters, `tick`, `accumulator`, score, lives, combo, RNG. Everything in that list is either deliberately carried (score/lives/combo/RNG) or explicitly cleared above (everything else).

**`world.simPhase = 0` must be an inline literal.** `worldRequests.ts` establishes this: *"Worklet rule: never close over module exports (SEED_*, IMPULSE_*, SimPhase.*). Inline numeric literals inside `'worklet'` bodies"* [VERIFIED: src/runtime/worldRequests.ts:5-6], and `applyCertWorstCaseInject` does exactly that (`world.simPhase = 1; // PLAYING`). `SimPhase.DOCKED: 0` [VERIFIED: src/core/types.ts:29-34, verbatim: `DOCKED: 0, PLAYING: 1, WON: 2, LOST: 3`]. The repo has a `scripts/assert-worklet-closures.mjs` gate in `npm test` that will catch a violation.

### Wiring it through `useGameLoop`

Follow the `resetRequest` / `resetApplied` pattern exactly — it is the only sanctioned JS→UI-runtime mutation route (`// RN→UI request counters (F-01): JS only bumps; frame callback applies on live World.` [VERIFIED: src/runtime/useGameLoop.ts:319]):

1. Add `const waveRequest = useSharedValue(0);` and `const waveApplied = useSharedValue(0);`
2. In `onFrame`, immediately after the `resetRequest` block (before the `simFrozen` computation at line 435), add:
   ```ts
   if (waveRequest.value !== waveApplied.value) {
     waveApplied.value = waveRequest.value;
     applyWaveAdvance(w, compiled.value);
     clearCosmeticVfx(vfx, w);
     resetAudioBatch(batch);
     launchFlag.value = 0;
     paddleTarget.value = w.paddleX;
   }
   ```
   Do **not** call `resetRunStats` here — counters are per-*run*, not per-wave (see Pitfall 4).
3. Export `advanceWave: () => void` on `GameLoopHandle`, bumping `waveRequest`.

**Why this needs no `setActive` churn at all:** the request block runs *before* `const simFrozen = w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST;` (line 435-437). A wave advance applied in the request block sets `simPhase` to `DOCKED`, so `simFrozen` is already false when it is computed, and substepping resumes **on the same frame**. The frame callback never has to be stopped or restarted. [VERIFIED: src/runtime/useGameLoop.ts:388-446 — request blocks at 388-421, `simFrozen` at 435-437, substep loop at 439-474]

## Q6 — Where does `SimPhase.WON` currently take the run, and what is the minimal intercept?

There is exactly one place, and it is already the right shape:

```ts
// app/_components/PlayingHost.tsx:616-632 (applyChrome, verbatim)
      if (mirror.phase === SIM.WON) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'win', mirror.lives, snapshotRunStats());
        }
        setResult('win');
        setActive(false);
      } else if (mirror.phase === SIM.LOST) {
```

`applyChrome` is `runOnJS`'d from a `useAnimatedReaction` on `chromeSeq` — so it runs on the **RN JS thread**, not the UI runtime. That is what makes this the correct place to call `generate()`.

**The minimal intercept** — one branch, ahead of the existing one:

```ts
if (mirror.phase === SIM.WON && mode === 'endless') {
  if (!waveAdvanceInFlightRef.current) {
    waveAdvanceInFlightRef.current = true;
    const nextWave = waveRef.current + 1;
    const raw = generate(seedForWave(runSeedRef.current, nextWave), difficultyForWave(nextWave));
    const compiled = compileGeneratedLevel(raw);      // runtime wrapper over loadAndCompile
    if (compiled.ok) {
      compiledSv.value = compiled.compiled;
      waveRef.current = nextWave;
      setWave(nextWave);                              // HUD only
      advanceWave();                                  // bumps waveRequest
    } // else: fail loudly — LevelErrorOverlay, do not silently end the run
  }
  return;                                             // never reaches handleRunEnded
}
```

`waveAdvanceInFlightRef` must be cleared when the mirror next reports `DOCKED`/`PLAYING` — the WON mirror value can be delivered more than once before the advance lands, and `runEndedRef` is the existing precedent for exactly this idempotency concern.

**In endless there is no run-ending `WON`.** The run ends only on `LOST`, which keeps the existing branch untouched. That is precisely roadmap SC-1's "the run ends only when lives reach zero".

**The abandon funnel already handles the third exit.** `handleMenuPress` records `'abandoned'` through the same `runEndedRef`, described in the source as *"THE single abandon funnel (T-09-10) … whichever boundary fires first wins"* [VERIFIED: app/_components/PlayingHost.tsx:646-652]. Endless needs the same funnel with its own record write — do not add a fourth detection site.

## Q7 — SC-4 reproducibility: what exactly must be seeded, and is end-to-end replay achievable?

**Measured answer: yes, achievable with zero core changes — as a determinism property, not as a user-facing replay feature.** Scope SC-4 to what was actually proven.

### What was measured

Two independent 12-wave endless runs at the same run seed (777), the same bot policy, the same `resetWorld(w, 0xace, 0xbeef)` gameplay/cosmetic seeds, through the real `stepRun`: [VERIFIED: endless prototype this session]

| Check | Result |
|---|---|
| `hashWorld` identical at **every** wave boundary (12 of 12) | **true** |
| Final score identical | **true** |
| A different run seed (778) produces a different hash sequence | **true** |
| 60 consecutive waves → distinct per-wave seeds | **60 / 60** |
| 60 consecutive waves → distinct generated board ids | **60 / 60** |

`hashWorld` covers `score`, `combo`, `lives`, `rngGameplay[0]` and `tick` [VERIFIED: src/core/hash.ts:94-95,106,110-111], so this is a check over all run-carried state, not just the brick lattice.

### The seed inventory — what must be fixed for a replay

There are exactly **three** seed inputs, and the gameplay RNG is *not* an obstacle:

| Input | Where it lives | Carried across waves? |
|---|---|---|
| Run seed → per-wave board seeds | New, app/services tier | Board seed derived per wave; run seed fixed |
| `world.rngGameplay[0]` (drops, extra-life rolls) | `World`, seeded once by `resetWorld` | **Yes — `applyWaveAdvance` must not re-seed it.** It is a single `Uint32Array` slot advanced by `nextU32`; carrying it forward is what makes the whole run one deterministic stream. |
| `world.rngCosmetic[0]` (VFX only) | `World` | Same; irrelevant to gameplay but hashed, so leave it alone. |

`generate` clamps its own difficulty — the comment names Phase 11 by name: *"Phase 11 feeds a wave counter that runs past `D_MAX` … an unclamped index would read past the table"*, implemented as `const d = Math.max(0, Math.min(D_MAX, difficulty | 0));` [VERIFIED: src/levelgen/generate.ts:223-227]. So an off-by-one in the ramp degrades to "stays at 20", never to a crash. Do not rely on that as the ramp's correctness argument; do rely on it as a backstop.

### The honest limit — state this in the plan, do not overclaim

**A *device* endless run is not replayable, and this phase should not pretend otherwise.** The reason is not the RNG; it is the input stream. On device the intent is read per substep from `paddleTarget.value`, and the number of substeps per frame depends on wall-clock frame timing through the accumulator and `MAX_SUBSTEPS` cap. Nothing records the per-tick intent sequence, and adding such a recorder is a feature this phase does not have.

**Scope SC-4 as:** *given a run seed, the initial world seeds, and a fixed input policy, an endless run replays to the same wave with the same score and the same world hash at every boundary* — provable headlessly and already proven above. The board **sequence** alone (independent of play) is reproducible unconditionally from the run seed, and that is the part Phase 12's daily challenge actually inherits.

## Q8 — SC-5 frame budget: Hermes risk, and eager vs lazy generation

### Measured cost

| Measurement | Value | Provenance |
|---|---|---|
| `generate(seed, 20)` alone, Node | **0.0306 ms** | [VERIFIED: 2 000 warm iterations this session] |
| `generate` + `loadAndCompile` (validate + compile), Node | **0.0362 ms** | [VERIFIED: 2 000 warm iterations this session] |
| `loadAndCompile` alone (the delta) | 0.0056 ms | derived from the two above |
| 4 200-board corpus fingerprint, Node, this machine | **85.7 ms** | [VERIFIED: `corpusFingerprint(200)` this session; returned `0x2e8f6c23`, matching the pin] |
| 4 200-board corpus fingerprint, **Hermes, iPhone 17 simulator** | **1 331 ms** | [CITED: docs/ops/BOARD-GENERATOR.md §Limits, raw line `[levelgen] corpus fingerprint u32=0x2e8f6c23 seeds=200 boards=4200 ms=1331`] |
| Implied Hermes / Node ratio | **15.5×** | derived |
| **Hermes estimate, generate + compile, one board** | **≈ 0.56 ms** | derived: 0.0362 × 15.5 |

Against the frame budget: `FIXED_DT = 1 / 120` [VERIFIED: src/core/constants.ts:8] gives an 8.33 ms substep budget and the Mid tier cert target is 16.7 ms/frame. **0.56 ms is ~7 % of one 120 Hz substep and ~3 % of a 60 Hz frame.** Even at a 10× pessimism margin over the ratio it stays inside a 60 Hz frame.

**And it does not spend that budget on the frame at all.** The call happens inside `applyChrome`, which is `runOnJS`'d — it executes on the **RN JS thread**, while `useFrameCallback` runs `stepRun` and `recordFrame` on the **Reanimated UI runtime**. A 0.56 ms JS-thread call cannot preempt the UI runtime's frame. `src/levelgen` is structurally barred from the worklet world by LC-17 and its own eslint block [VERIFIED: docs/layer-contract.md:30, eslint.config.js:81-96,330-335].

### Recommendation: **lazy** generation at the transition

Generate on the WON intercept. Eager pre-generation during wave N buys nothing measurable (0.56 ms off the JS thread), adds a cache to invalidate, and adds a second code path Phase 12 would have to reason about. Simple wins.

**The residual assumption:** the 15.5× ratio comes from an iOS *simulator* run, which `BOARD-GENERATOR.md` §Limits already flags — *"this was the iOS **simulator**, which runs the same Hermes build as a device but on x86/arm host hardware"*. A low-end Android device could be slower than 15.5×. This is tagged `[ASSUMED]` in the log below and is exactly what the device-side SC-5 check in §Validation Architecture is for; it is a confirmation checkpoint, not a blocker, because the budget headroom is ~30×.

### The real SC-5 risk is not generation — see Pitfall 2

## Q9 — What shape should the endless record take in the v4 blob?

### The two facts that decide it

1. **`mode: 'endless'` already exists** — `export type GameMode = 'campaign' | 'endless' | 'daily';` with the comment *"v4 is mode-aware from the start so Phases 11/12 add a mode value instead of forcing a v5 and a v6 migration"* [VERIFIED: src/services/storage/types.ts:40-44].
2. **`TelemetryAggregate` has no best-score and no wave concept.** Its max-style fields are exactly `bestComboEver`, `longestRallyEver`, `largestCascadeEver` [VERIFIED: src/services/storage/types.ts:59-84]. So `byMode.endless[...]` gives you runs/bricks/ticks for free but **cannot** express N-END-02's "best wave, best score". A new field is required.

### Recommended shape — inside `TelemetryBlob`, not at blob top level

```ts
// src/services/storage/types.ts — add to TelemetryBlob
export type EndlessRecord = {
  /** Highest wave number reached in any single run (running max). */
  bestWave: number;
  /** Highest score in any single endless run (running max) — NOT blob.bestScore. */
  bestScore: number;
};

export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: { campaign: …; endless: …; daily: … };
  recentRuns: RunLogEntry[];
  endless: EndlessRecord;          // NEW
};
```

**Why inside `telemetry` and not at the top of `ProgressBlob`** — this is the SC-3 argument, and it is already written into the parser:

> *"Validate `telemetry` INDEPENDENTLY of its sibling progress fields (Pitfall 4 / roadmap SC-4): any structural failure here degrades telemetry alone to defaults and must never make the enclosing blob read as `corrupt`."*
> [VERIFIED: src/services/storage/parseBlob.ts:388-392]

A corrupt or malformed endless record therefore degrades the endless record and nothing else. Campaign bests, stars and unlocks are structurally out of reach. Put the same field at `ProgressBlob` top level and it participates in the top-level gating, where a bad value can make the *whole* blob read corrupt and take campaign progress down with it. That is the precise failure SC-3 forbids.

**No version bump.** `v` stays `4`. An existing v4 blob simply lacks `telemetry.endless`, and `sanitizeTelemetry` builds its output from scratch and will default it — the same forward-compatibility the telemetry sub-blob was designed for. `v3ToV4` needs no edit at all because it already calls `defaultTelemetryBlob()` [VERIFIED: src/services/storage/migrateProgress.ts:41-50]. The planner must still add: a field in `defaultTelemetryBlob()`, a `sanitizeEndlessRecord` called from `sanitizeTelemetry`, a merge in `mergeTelemetryBlobs` (running max on both fields), and clone coverage in `cloneTelemetryBlob`.

**What the run-end write looks like.** Reuse the existing `recordRunEnd` funnel with `mode: 'endless'` and a constant `levelId` key (e.g. `'endless'`) so `byMode.endless['endless']` accumulates runs/bricks/ticks as Phase 13 will want — **plus the mode gate from Pitfall 1**, without which this exact call corrupts campaign state.

---

## Standard Stack

### Core — everything already in the repo

| Module | Version / path | Purpose | Why standard |
|---|---|---|---|
| `src/levelgen` barrel | in-repo, closed | `generate(seed, difficulty)`, `D_MAX`, `hashSeed`, `mixSeed` | LC-16 names it *"the only surface Phase 11/12 may import"*. Proven over 21 000 boards; A1 discharged on Hermes. |
| `src/core` (read-only) | in-repo | `applyCompiledLevel`, `dockBall`, `derivePaddleWidth`, `loadAndCompile`, `hashWorld`, `SimPhase` | All already exported from `src/core/index.ts`. CONTEXT forbids modifying `src/core`. |
| `src/runtime/worldRequests.ts` | in-repo | Home of the new `applyWaveAdvance` | Where `applyRetryWorldReset` / `applyCertWorstCaseInject` already live; worklet-safe conventions documented in its header. |
| `src/services/storage` | in-repo | v4 blob, both stores, parser, migration | `mode: 'endless'` already present; telemetry sub-blob already isolation-tested. |
| `tests/helpers/balanceBot.ts` | in-repo | `runBotOnLevel`, `levelStaticsOf` | The E2-locked measuring instrument; this phase's headless proofs ride it. |
| Vitest | `5.0.1` | Test runner | [VERIFIED: package.json devDependencies] Already the only runner; `npm test` chains it plus four assert scripts. |
| Expo SDK | `~57.0.24` | Host | Pinned. **No new Expo API expected in this phase.** |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| New `applyWaveAdvance` worklet | Reuse `applyRetryWorldReset` with extra params | Rejected: it calls `resetWorld`, which zeroes `lives`/`score`/`combo`/`tick` and re-seeds both RNG streams — the exact opposite of SC-1. Parameterising it to *not* reset would make one function mean two things and would put a branch on the retry path. |
| Endless record in `TelemetryBlob` | Top-level `ProgressBlob.endless` | Rejected: loses the parser's telemetry-isolation property, so a corrupt endless record could make the whole blob read corrupt and lose campaign progress. Directly contrary to SC-3. |
| Endless record in `TelemetryBlob` | Separate AsyncStorage key `@nbb/endless/v1` | Rejected: a second key means a second parse/migrate/merge/flush chain and a second corruption story, for a two-number record. The v4 blob was explicitly designed mode-aware to avoid this. |
| Lazy generation at transition | Eager generation during wave N | Rejected on measurement: 0.56 ms Hermes-estimated, off the UI runtime. Eager adds a cache, an invalidation rule and a second path for Phase 12 to reason about, for no measurable gain. |
| Reset `world.tick` per wave | Carry `tick` across waves | Carrying pins the ball at `MAX_BALL_SPEED` from ~wave 3 forever (see Pitfall 3). Reset is recommended, with `ticksPlayed` banked in the app tier. |
| Leave `SCHEDULE` alone | Re-tune the top of the dial range | Rejected on measurement — see Q3. |

**Installation:** none. **Zero packages are added by this phase.**

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** Every module it needs is already in-repo or already in `package.json`. No `npm install` appears anywhere in the recommended plan.

If a plan task does propose a package, the gate applies in full: run `gsd-tools query package-legitimacy check --ecosystem npm <pkg>`, `npm view <pkg> version`, `npm view <pkg> scripts.postinstall`, and — because this is an Expo project — pin via `npx expo install`, never bare `npm install`. That pinning rule is an established project decision (*"Pinned AsyncStorage exactly 2.2.0 via npx expo install"*, *"Pin expo-device via npx expo install only"* — `.planning/STATE.md` Accumulated Context).

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

---

## Architecture Patterns

### System Architecture Diagram

```
                      ┌──────────────── RN JS thread (cold path) ────────────────┐
                      │                                                           │
  __DEV__ "Endless"   │   PlayingHost                                             │
  button press  ──────┼──► startEndless()                                         │
                      │      runSeed = Date.now() >>> 0   (endless only — never    │
                      │      wave    = 1                   in levelgen)            │
                      │         │                                                  │
                      │         ▼                                                  │
                      │   difficultyForWave(wave) ──┐                              │
                      │   seedForWave(runSeed,wave)─┴─► generate(seed, d)          │
                      │                                    │  (src/levelgen, pure) │
                      │                                    ▼                       │
                      │                        compileGeneratedLevel(raw)          │
                      │                        (src/runtime → core loadAndCompile) │
                      │                                    │                       │
                      │                                    ▼                       │
                      │                        compiledSv.value = compiled         │
                      │                        advanceWave()  ── bumps waveRequest │
                      └────────────────────────────────────┬──────────────────────┘
                                                            │ SharedValue
                      ┌─────────────── Reanimated UI runtime ▼ (frame path) ───────┐
                      │  useGameLoop.onFrame                                        │
                      │    ├─ resetRequest  ≠ resetApplied  → applyRetryWorldReset  │
                      │    ├─ waveRequest   ≠ waveApplied   → applyWaveAdvance ◄────┤ NEW
                      │    │      clears effects+pickups, applyCompiledLevel,       │
                      │    │      dockBall, simPhase=DOCKED, tick=0                 │
                      │    │      CARRIES lives / score / combo / rngGameplay       │
                      │    ├─ simFrozen = (WON || LOST)   ← now false again         │
                      │    ├─ while(accumulator) stepRun ──► DOCKED → PLAYING       │
                      │    │        applyWinCheck → WON when no breakables left     │
                      │    │        applyLivesFromBallCount → LOST at zero lives    │
                      │    └─ publishChromeMirror(phase,lives,score,combo,stall)    │
                      │                    │ chromeSeq++                             │
                      └────────────────────┼────────────────────────────────────────┘
                                            │ useAnimatedReaction + runOnJS
                      ┌────────────────────▼──── RN JS thread ─────────────────────┐
                      │  applyChrome(mirror)                                        │
                      │    if WON  && mode==='endless' → advance to wave+1 ─────────┼──► (loop back to top)
                      │    if LOST                     → recordRunEnd(mode) ────────┼──► ProgressStore
                      │    if menu                     → recordRunEnd('abandoned')  │      .telemetry.endless
                      └─────────────────────────────────────────────────────────────┘        { bestWave, bestScore }
```

Trace of the primary use case: dev button → generate wave 1 → UI runtime plays it → `applyWinCheck` sets `WON` → chrome mirror crosses to JS → `applyChrome` generates wave 2 and bumps `waveRequest` → the next UI frame applies the advance before it computes `simFrozen`, so play resumes without the frame loop ever stopping → repeat until `applyLivesFromBallCount` sets `LOST` → single `recordRunEnd` write.

### Recommended Project Structure

```
src/services/endless/           # NEW — pure, Node-testable, no React
├── ramp.ts                     # difficultyForWave, seedForWave, the written-down table
└── index.ts                    # barrel

src/runtime/
├── worldRequests.ts            # + applyWaveAdvance  (THE board-swap seam; Phase 12 reuses)
├── useGameLoop.ts              # + waveRequest/waveApplied + advanceWave on the handle
└── loadLevel.ts                # + compileGeneratedLevel(raw: LevelFileV1)

app/_components/
└── PlayingHost.tsx             # + mode prop, WON intercept, wave state, endless record write,
                                #   __DEV__ "Endless" button (D-05, deleted in Phase 14)

src/services/storage/
├── types.ts                    # + EndlessRecord on TelemetryBlob + default
├── telemetry.ts                # + endless merge (running max) + clone coverage
├── parseBlob.ts                # + sanitizeEndlessRecord, called from sanitizeTelemetry
├── memoryStore.ts              # mode gate in recordRunEnd
└── asyncStorageStore.ts        # mode gate in recordRunEnd

docs/ops/
└── ENDLESS-MODE.md             # NEW — the written-down ramp (SC-2) + these measurements
```

### Pattern 1: The board-swap seam is mode-agnostic

`applyWaveAdvance(world, compiled)` takes a compiled board and nothing else — no wave number, no seed, no mode. The endless-specific part (`difficultyForWave`, `seedForWave`) lives in `src/services/endless/ramp.ts` and never touches the world. Phase 12's daily challenge supplies a date-derived seed to the same swap. CONTEXT's integration note asks for exactly this separation.

### Pattern 2: Request/apply counters for every JS→UI-runtime mutation

Never mutate `world.value` from JS — Reanimated hands JS a crossing-time clone, and in-place mutation does not propagate. The repo learned this the hard way and documented it: *"Reanimated does not propagate in-place mutation of a held object across the bridge, so `runStats.value.bricksBroken` on the JS thread returns a stale value (device UAT: a run that broke bricks persisted 0)"* [VERIFIED: src/runtime/useGameLoop.ts:174-181]. The counter pair is the fix and there are already three of them (`reset`, `cert`, `accumReset`).

### Pattern 3: The ramp is data, not code

SC-2 requires the ramp be "written down rather than tuned by feel in code". Recommended form:

```ts
// src/services/endless/ramp.ts
/**
 * Wave -> difficulty (D-01 / D-02). Wave is 1-based.
 *
 *   wave   1  2  3 …  20  21  22  23 …
 *   d      0  1  2 …  19  20  20  20 …
 *
 * One wave is one difficulty step until the clamp; from wave 21 the difficulty is
 * fixed at D_MAX and only the seed changes. D-01 chose the clamp over widening D_MAX
 * because a wider SCHEDULE reopens Phase 10's monotonicity proof and 21 000-board sweep.
 */
export function difficultyForWave(wave: number): number {
  const d = (wave | 0) - 1;
  return d < 0 ? 0 : d > D_MAX ? D_MAX : d;
}
```

plus the same table in `docs/ops/ENDLESS-MODE.md` next to the measurements above. A test should assert the *properties* (starts at 0, +1 per wave, clamps at `D_MAX`, never exceeds it for any wave up to e.g. 10 000) rather than pin a literal array — the same discipline `tests/levelgen.schedule.test.ts` uses, and for the same reason: *"No test in this phase may pin a literal dial value"* [VERIFIED: src/levelgen/schedule.ts:9-12].

### Pattern 4: Per-wave seed derivation

```ts
export function seedForWave(runSeed: number | string, wave: number): number {
  return mixSeed(hashSeed(runSeed), wave);
}
```

Both helpers come from the levelgen barrel. Within one run `hashSeed(runSeed)` is constant and `mixSeed`'s difficulty half is `Math.imul((wave | 0) + 1, MIX_DIFFICULTY)` with an **odd** constant, so it is injective mod 2³² in `wave` — no two waves of a run can collide [VERIFIED: src/levelgen/rng.ts:99-108, verbatim: `const b = Math.imul((difficulty | 0) + 1, MIX_DIFFICULTY);` and the header *"Both constants are odd, so each half is injective mod 2^32"*]. **Measured: 60 waves → 60 distinct seeds, 60 distinct board ids.**

Do **not** use `wave` directly as the `generate` seed: `generate` internally computes `mixSeed(hashSeed(seed), d)`, and since `d = wave - 1` is itself a function of the wave, seed and difficulty would move together in lockstep across runs — every player would see the identical board sequence. The run seed is what makes runs differ.

### Pattern 5: Endless record write, and the campaign firewall

See Q9 for the shape, Pitfall 1 for the gate. One rule for the plan: **the endless write must never touch `blob.bestByLevel`, `blob.unlocked`, or `blob.bestScore`.** The first two are named by SC-3 outright; `blob.bestScore` is the Title rollup and belongs to Phase 14's display decision, which CONTEXT explicitly defers.

### Anti-Patterns to Avoid

- **Calling `retry()` to change boards.** It runs `resetWorld` and destroys lives/score/combo. Use the new `waveRequest`.
- **Adding a `LevelId` for generated boards.** `LevelId` is a five-member union of campaign ids [VERIFIED: src/core/levels/levelIds.ts:8-13] and is the key type for `bestByLevel` and `unlocked`. Widening it to admit `'endless'` opens every campaign-progress code path to endless values. Use a separate telemetry key string instead.
- **Putting `Date.now()` anywhere inside `src/levelgen`.** eslint blocks it by rule; the run seed is generated in the app tier and passed in.
- **Re-seeding `rngGameplay` on a wave advance.** Kills SC-4 determinism and resets the drop stream every wave.
- **Extending `D_MAX`.** D-01 exists specifically to avoid it, and Q3 shows it would buy nothing.
- **Asserting a clear-time ceiling in a test.** Phase 10 refused to, for a stated reason: *"pinning a clear-time ceiling would pin the dial constants by proxy"*. The Q1–Q3 numbers belong in `docs/ops/ENDLESS-MODE.md`, not in an `expect()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Swapping a brick lattice on a live world | A custom brick-array writer | `applyCompiledLevel` | Already clears `cellToBrick`/`brickDamagedThisStep`, caps at capacity (F-38), and rebuilds the lattice broadphase with an exhaustive fallback. Re-implementing it reintroduces the silent-truncate bug F-38 fixed. |
| Dropping extra balls and re-docking | Manual `ballActive` loop | `dockBall` | Deactivates every slot then docks index 0 with `activeBallCount = 1`, matching the gap `resetWorld` uses. D-03's stated reason for reusing it is that it is already tested. |
| Restoring paddle width after clearing expand | `world.paddleW = 72` | `derivePaddleWidth` | Also re-clamps `paddleX` into the field for the new width. Setting the width alone can leave the paddle out of bounds. |
| A PRNG for per-wave seeds | `Math.random`, a new hash | `hashSeed` + `mixSeed` from the levelgen barrel | Integer-only, engine-portable, and already proven byte-identical on Hermes (A1). A new mixer needs its own portability proof. |
| Cross-engine determinism checking | A new digest | `corpusFingerprint` | Exists precisely because Hermes has no crypto; already has a pinned expected value and a documented bisection procedure. |
| A headless multi-wave test driver | A new bot | `runBotOnLevel` / the loop in §Validation | `runBotOnLevel` takes a **level object**, not a path — added in 10-01 exactly so generated boards with no file can be played. |
| Telemetry merge semantics | Ad-hoc max/sum | `mergeTelemetryBlobs` conventions | Sum-vs-max is a documented contract (`*Ever` fields take a running max). Endless `bestWave`/`bestScore` are max-fields; follow the pattern. |
| Run-boundary detection | A new WON/LOST watcher | The existing `runEndedRef` funnel in `applyChrome` + `handleMenuPress` | T-09-10 deliberately collapsed win/lose/abandon to one funnel so a run cannot be recorded twice. A fourth site reintroduces double-counting. |

**Key insight:** this phase's whole value is in *not* building anything. The one genuinely new function is ~20 lines of field clearing, and its correctness argument is "which fields does `resetWorld` touch that we must not". Everything else is wiring already-proven parts together.

---

## Common Pitfalls

### Pitfall 1 — `recordRunEnd` writes campaign state for **every** mode (this is the SC-3 defect)

**What goes wrong:** calling `recordRunEnd({ mode: 'endless', levelId: <anything>, … })` writes `bestByLevel[levelId]`, raises `blob.bestScore`, and on a win calls `unlockAfterClear` — silently altering campaign bests, stars and unlocks from an endless run.

**Why it happens:** `mode` is currently used for *one* thing only — the `byMode` key inside `mergeRunIntoTelemetry`. Nothing gates the campaign writes on it:

```ts
// src/services/storage/memoryStore.ts:102-120 (verbatim, ungated)
      const starsFromWin =
        args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
      const merged = mergeLevelBest(
        blob.bestByLevel[args.levelId],
        args.score,
        starsFromWin,
      );
      applyLevelBest(args.levelId, merged);
      …
      if (args.outcome === 'win') {
        blob.unlocked = unlockAfterClearPure(blob.unlocked, args.levelId);
```

and `applyLevelBest` also does `if (next.score > blob.bestScore) { blob.bestScore = next.score; }` [VERIFIED: src/services/storage/memoryStore.ts:67-73]. `asyncStorageStore.ts:380-405` is the same code. Both are `[VERIFIED: src/services/storage/memoryStore.ts:93-122]` / `[VERIFIED: src/services/storage/asyncStorageStore.ts:364-405]`.

**How to avoid:** gate the three campaign writes on `args.mode === 'campaign'` in **both** stores, so SC-3 is structural rather than a caller convention. Prefer making the argument a discriminated union on `mode` so a campaign-only `levelId: LevelId` cannot be supplied for endless at all.

**Warning signs:** a test that plays endless and then finds `blob.unlocked.length > 1` or a changed `bestByLevel`. Make that test exist — it is SC-3's direct verification.

### Pitfall 2 — the bake/preload cold path re-fires per wave and stops the frame loop (the real SC-5 risk)

**What goes wrong:** the wave transition triggers a full glow re-bake plus an audio preload race, with `setActive(false)` in the middle of it. That is a multi-hundred-millisecond stall, not a frame spike — three orders of magnitude worse than the 0.56 ms of generation everyone is watching.

**Why it happens:** `fxReady` is `bakedKey === loadKey`, and

```ts
// app/_components/PlayingHost.tsx:279-281 (verbatim)
  const loadKey = loadResult.ok
    ? `${levelId}:${loadResult.compiled.brickCount}:${loadResult.compiled.w[0]}x${loadResult.compiled.h[0]}`
    : `err:${levelId}`;
```

`brickCount` **changes every wave** as difficulty ramps (32 bricks at d=0 → 128 at d=20). So a naive endless implementation that routes generated boards through this `loadResult`/`loadKey` path flips `loadKey` on every wave, which flips `fxReady` false, which runs the bake effect: `setActiveRef.current(false)` → `bakeGlowSprites(...)` → `setBakedKey` → `await Promise.race([audio.preload(), 2500 ms timeout])` [VERIFIED: app/_components/PlayingHost.tsx:416-470].

**How to avoid:** `bakeGlowSprites(brickW, brickH)` depends on **nothing but those two numbers** [VERIFIED: src/render/textures/bakeGlowSprites.ts:95-108]. Key the bake on `${brickW}x${brickH}` alone. Every generated board uses the one fixed lattice — `brickW: 32, brickH: 14` [VERIFIED: src/levelgen/grid.ts:32-41, verbatim: `cols: 10, rows: 16, originX: 2, originY: 48, brickW: 32, brickH: 14, gapX: 4, gapY: 2`] — so the atlas is identical for **every wave at every difficulty**, and a correctly-keyed bake fires exactly once per endless run. (It is also a strict improvement for campaign: two levels with the same brick dimensions currently re-bake an identical atlas for no reason.)

Better still: keep the wave advance entirely off the `loadResult` path. Push the compiled board straight into `compiledSv` and bump `waveRequest` — never touch `levelId`, never re-derive `loadKey`.

**Warning signs:** a visible black playfield or an audio hiccup at a wave boundary; `[audio] preload soft-fail` in the log mid-run; `setActive(false)` appearing in a wave-transition trace.

### Pitfall 3 — `world.tick` policy silently decides the real difficulty curve

**What goes wrong:** carrying `tick` across waves pins every ball from ~wave 3 onward at the hard speed cap, forever — making the wave→difficulty ramp (D-02) *not* the thing that actually controls difficulty. Resetting `tick` fixes that but truncates run telemetry.

**Why it happens:** the E2 speed ramp is a pure function of `world.tick`:

```ts
// src/core/rules/speedRamp.ts:22-35 (verbatim)
  const ratePerSecond = 0.01; // SPEED_RAMP_PER_SECOND
  const serveSpeed = 360; // SERVE_SPEED
  const maxSpeed = 720; // MAX_BALL_SPEED
  const ticksPerSecond = 120; // 1 / FIXED_DT
  …
  const elapsed = world.tick / ticksPerSecond;
  let floorSpeed = serveSpeed * (1 + ratePerSecond * elapsed);
  if (floorSpeed > maxSpeed) { floorSpeed = maxSpeed; }
```

matching `constants.ts` exactly (`SPEED_RAMP_PER_SECOND = 0.01`, `SERVE_SPEED = 360`, `MAX_BALL_SPEED = 720`, `FIXED_DT = 1 / 120` [VERIFIED: src/core/constants.ts:8,32,71,81]). `360 × (1 + 0.01 t) ≥ 720` at **t = 100 s** — and the constant's own comment says so: *"clamped to MAX_BALL_SPEED (so the cap is reached at t = 100s)"*. The measured d=20 median wave is 172.5 s, so the cap is reached **inside wave 1**; carrying `tick` means every subsequent wave starts and stays at 720.

Measured consequence, same run seed, 30 waves: [VERIFIED: endless prototype this session]

| tick policy | total simulated time | final score |
|---|---|---|
| reset per wave | 4 497.2 s | 946 880 |
| carried | **3 457.4 s** (−23 %) | 791 190 |

The bot is *faster* with a capped ball because it never misses; a human would experience the same change as brutally harder. The instrument disagrees with the player here, which is exactly why this must be a written decision and not a default.

**How to avoid:** reset `world.tick = 0` in `applyWaveAdvance`, so each wave starts at serve speed — the same contract every campaign level has. Then handle the two consequences:

1. **`ticksPlayed` telemetry truncates to the final wave.** `publishRunStatsMirror` publishes `w.tick` straight through as `ticksPlayed` (`/** Simulated time (`world.tick`) … */` [VERIFIED: src/runtime/publishRunStatsMirror.ts:33-34], called as `publishRunStatsMirror(runStatsOut.value, stats, w.tick)` [VERIFIED: src/runtime/useGameLoop.ts:454]). Bank it per wave in the app tier at the advance boundary — `PlayingHost` already does exactly this for wall-clock via `runWallClockMsRef` / `wallClockActiveRef` [VERIFIED: app/_components/PlayingHost.tsx:237-247], so the pattern is in the file already.
2. **Resetting `tick` while any effect is still live would make that effect near-permanent**, because `effectUntilTick` is an absolute tick value (`const until = world.tick + durationTicks;` [VERIFIED: src/core/rules/effects.ts:110-123]). `applyWaveAdvance` clears all effects before resetting `tick`, which closes this — but the two steps are coupled and the ordering must be commented, or a later "simplification" that keeps effects across a wave will resurrect it as a 10-second expand that lasts the rest of the run.

**Warning signs:** a run whose recorded `ticksPlayed` is implausibly small; a paddle that stays expanded for many waves; a ball that never feels slow after wave 2.

### Pitfall 4 — per-run counters must not reset per wave

**What goes wrong:** copying the `resetRequest` block wholesale into the wave-advance block would call `resetRunStats(s)`, zeroing `bricksBroken`, `bestCombo`, `livesLost`, `longestRally`, `largestCascade` at every wave boundary — so a 25-wave run reports the last wave's counters.

**Why it happens:** `resetRunStats` sits in the reset block with the comment *"D-01: every retry is a new run — zero counters in place"* [VERIFIED: src/runtime/useGameLoop.ts:398-407]. A wave is **not** a new run. Endless is the first feature in the repo where "new board" and "new run" are different events.

**How to avoid:** omit `resetRunStats` from the wave-advance block. Add a test asserting `bricksBroken` after two waves exceeds `bricksBroken` after one.

### Pitfall 5 — the WON mirror can be delivered more than once before the advance lands

**What goes wrong:** double-advance — skipping a wave, or generating two boards and racing them into `compiledSv`.

**Why it happens:** `applyChrome` is driven by `chromeSeq` and runs on the JS thread; the UI runtime keeps publishing while the JS-side advance is in flight. The repo already guards the equivalent case for run-end with `runEndedRef`.

**How to avoid:** a `waveAdvanceInFlightRef`, cleared when the mirror next reports a non-WON phase. Same shape as `runEndedRef`, and it must be a **ref**, not state — state would be stale inside the memoised callback.

### Pitfall 6 — a compile failure mid-run must fail loudly, not end the run silently

**What goes wrong:** `compileGeneratedLevel` returns `{ ok: false }`, the code falls through, and the player's 40-minute run ends with no explanation.

**Why it happens:** every board is solvable and compilable by theorem *and* by a 21 000-board sweep, so this branch will essentially never fire — which is exactly why it will be written carelessly.

**How to avoid:** route it to the existing `LevelErrorOverlay` path (`loadResult.ok === false` already has a UI) and `console.error` the issues under `__DEV__`, exactly as the level path does. Never `return` into the run-end branch.

### Pitfall 7 — a fresh run seed per run, and never from inside `levelgen`

**What goes wrong:** every endless run produces the identical board sequence, or the eslint gate rejects the phase.

**Why it happens:** `src/levelgen/**` bans `Date.now()` and `performance.now()` by explicit `no-restricted-syntax` rules — *"no wall-clock in levelgen/ — a board must depend on (seed, difficulty) alone"* [VERIFIED: eslint.config.js:99-124]. The run seed must therefore be minted in the app tier and passed in.

**How to avoid:** `runSeedRef.current = Date.now() >>> 0` at run start in `PlayingHost`, and expose an override so the headless SC-4 test can pin it. A fixed seed would also make every run identical, which fails the "keeps producing boards" part of the phase goal.

---

## Code Examples

### Compile a generated board without `app/` importing `core`

```ts
// src/runtime/loadLevel.ts — ADD. runtime → core is LC-02; app → runtime is LC-04.
// app/ may import the levelgen barrel (LC-16) but NOT src/core, so this wrapper is
// what lets PlayingHost hand a generated LevelFileV1 to the compile pipeline.
import { loadAndCompile, type LevelFileV1 } from '../core';

export function compileGeneratedLevel(raw: LevelFileV1): LoadLevelResult {
  return loadAndCompile(raw);
}
```

`loadAndCompile` is exported from `src/core/index.ts:96`; `LevelFileV1` from `:80-85`. `loadLevel.ts` already re-exports `CompiledLevel`/`ValidationIssue`, so the result type is unchanged.

### The headless endless driver (the SC-1 / SC-4 test)

Verbatim from the prototype that ran this session — 30 waves, 0 stuck waves, zero `src/core` changes:

```ts
import {
  allocateWorld, resetWorld, stepRun, applyCompiledLevel, dockBall,
  derivePaddleWidth, loadAndCompile, hashWorld, SimPhase, FIXED_DT,
} from '../src/core';
import { generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';

const w = allocateWorld();
resetWorld(w, 0xace, 0xbeef);
advance(w, 1);                                  // seed wave 1

for (let wave = 1; wave <= maxWaves; wave++) {
  let intent = { paddleX: w.paddleX, launch: 1 };
  for (let t = 0; t < budget; t++) {
    stepRun(w, intent, FIXED_DT);
    if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;
    if (w.simPhase === SimPhase.DOCKED) { intent = { paddleX: w.paddleX, launch: 1 }; continue; }
    const b = lowestLiveBall(w);
    intent = { paddleX: b >= 0 ? w.ballX[b]! + PADDLE_OFFSET : w.paddleX, launch: 0 };
  }
  hashes.push(hashWorld(w));                    // SC-4 checkpoint
  if (w.simPhase === SimPhase.LOST) break;      // the ONLY run-ending phase
  expect(w.simPhase).toBe(SimPhase.WON);        // no stuck wave
  advance(w, wave + 1);
}
```

`allocateWorld` `:1`, `resetWorld` `:2`, `stepRun` `:4`, `hashWorld` `:5`, `SimPhase` `:14`, `FIXED_DT` `:18`, `applyCompiledLevel` `:78`, `dockBall` `:102`, `derivePaddleWidth` `:111`, `loadAndCompile` `:96` — all already exported [VERIFIED: src/core/index.ts]. The `lowestLiveBall` helper is private to `tests/helpers/balanceBot.ts`; either export it or inline the four-line scan as the prototype did.

### The measured prototype's wave-by-wave output (run seed 1234, tick reset)

```
w1  d0   50.6s L3 S8340   | w2  d1   97.4s L4 S14980  | w3  d2   44.9s L4 S31620
w4  d3   66.3s L4 S41480  | w5  d4  133.4s L4 S50530  | w6  d5   43.2s L5 S78380
…
w20 d19 106.6s L5 S434270 | w21 d20 153.8s L5 S457680 | w22 d20 303.8s L5 S475160
…
w30 d20 172.7s L5 S946880
```

Reading it: lives climb 3→5 via the 8 % extra-life drop and hit the `MAX_LIVES = 5` cap by wave 6; score carries monotonically; the difficulty ramp reaches its clamp at wave 21 exactly as D-01 specifies; post-clamp waves vary 105–407 s purely from seed. Total for 30 waves: **4 497 s (75 min) of flawless play.** Across eight run seeds at 25 waves each: 3 102–4 241 s (52–71 min). [VERIFIED: endless prototype this session]

---

## Runtime State Inventory

Not a rename/refactor/migration phase — this is additive feature work. Included anyway for the two categories that genuinely apply:

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | `@nbb/progress/v4` blob gains `telemetry.endless`. **No migration needed** — `v` stays 4; `sanitizeTelemetry` rebuilds its output from scratch, so an existing v4 blob missing the field gets the default. `v3ToV4` already calls `defaultTelemetryBlob()`. | Code edit only (add field + sanitizer + merge + clone). Add a test that an old-shape v4 string parses with `telemetry.endless` defaulted and **campaign fields intact**. |
| Live service config | None — this app has no external service configuration. Verified: no n8n, Datadog, Cloudflare or similar in the repo. | none |
| OS-registered state | None — no scheduled task, daemon or OS registration is involved. | none |
| Secrets/env vars | One **new** build-time flag if the dev button is env-gated. Existing precedent: `EXPO_PUBLIC_PERF_OVERLAY`, `EXPO_PUBLIC_CERT`, `EXPO_PUBLIC_SOAK`, `EXPO_PUBLIC_LEVELGEN_PROBE` in `src/devflags.ts`. **D-05 says `__DEV__`-gated, which needs no new flag at all** — prefer that. | none, if D-05 is followed literally |
| Build artifacts | None. No package added, no native module, no generated asset. | none |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| A wave = a new run (campaign semantics) | A wave is a board swap **inside** a run | this phase | `resetRunStats` must not fire per wave (Pitfall 4); `world.tick` policy becomes a real decision (Pitfall 3) |
| `mode` is a telemetry label only | `mode` gates campaign writes | this phase | Makes SC-3 structural; the v4 blob's mode-awareness finally earns its keep |
| Clear-time tail read as a board property | Tail measured as a **trajectory** property | this phase | Removes the stated justification for a `SCHEDULE` re-tune; Phase 10 stays closed |
| Bake keyed on `levelId:brickCount:WxH` | Bake keyed on brick dimensions alone | recommended this phase | Prevents a per-wave cold-path stall; also removes redundant campaign re-bakes |

**Deprecated/outdated in the inherited material:**

- **The pooled 840-board figures (p50 108 s / p95 259 s / p99 416 s)** are now superseded *for endless purposes* by the d=20-specific 500-seed scan (p50 172.5 s / p95 446.2 s). The old figures are not wrong — they pooled `d = 0..20`, which is the right population for the generator and the wrong one for a mode that clamps at 20.
- **"Boards at that tail are plausibly unfinishable by a real player"** (`BOARD-GENERATOR.md` §Limits item 2) should be annotated, not deleted: the tail is now measured as trajectory-dependent by up to 18× on a single board. The plan should update that section rather than leave a superseded inference in the ops record — it is the exact claim a future phase would otherwise act on.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node | test suite, headless proofs | ✓ | v24.x (`engines: ">=24 <25"`) | — |
| Vitest | all headless verification | ✓ | 5.0.1 | — |
| `tests/helpers/balanceBot.ts` | SC-1/SC-2/SC-4 headless proofs | ✓ | in-repo | — |
| `src/levelgen` (closed) | board generation | ✓ | in-repo, A1 discharged | — |
| iOS simulator + Expo dev client | SC-5 frame-budget check, D-05 button UAT | ✗ (not reachable from this session) | — | **None for SC-5** — it is inherently a device/simulator measurement |
| Physical device | the residual A1 caveat and a true Mid-tier budget reading | ✗ | — | Simulator is the documented stand-in; `BOARD-GENERATOR.md` §Limits already records the simulator-vs-device caveat |

**Missing dependencies with no fallback:**

- **SC-5 ("wave transitions do not stall the loop … Mid budget")** cannot be proven headlessly. The plan must carry a device/simulator verification task using the existing `CERT_HARNESS` / `PERF_OVERLAY` p50/p95 instrumentation across at least one wave transition. This is a known, expected, non-blocking gate of the same kind Phase 10's A1 probe was.

**Missing dependencies with fallback:** none.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 5.0.1 |
| Config file | `vitest.config.ts` — `environment: 'node'`, include `src/core/**/*.test.ts`, `tests/**/*.test.ts`, `tests/**/*.test.tsx` |
| Quick run command | `npx vitest run tests/endless.<name>.test.ts` |
| Full suite command | `npm test` (`vitest run` + `assert-worklet-closures` + `assert-level-solvability` + `assert-eas-profiles` + `assert-brand-name`) |
| Baseline to preserve | 87 files / 486 tests passing, **0 todo**, `npm run lint` **0 warnings repo-wide**, `npm run typecheck` exit 0 |

One operational note the planner should inherit: **Vitest suppresses `console.log` under this repo's reporter config.** Plans 10-02/03/04 all hit it. Any measurement output must be written with `node:fs` to the scratchpad, and any such throwaway test must be deleted before the plan's verification block runs `git status --porcelain`.

### Phase Requirements → Test Map

| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| SC-1 / N-END-01 | Clearing a board advances to the next; lives, score, combo carry | integration | `npx vitest run tests/endless.wave-loop.test.ts` | ❌ Wave 0 |
| SC-1 | The run ends **only** at zero lives — a cleared board never ends an endless run | integration | same file | ❌ Wave 0 |
| SC-1 | `applyWaveAdvance` clears effects, pickups, extra balls; leaves `lives`/`score`/`combo`/`rngGameplay` untouched; `simPhase === DOCKED` | unit | `npx vitest run tests/runtime.wave-advance.test.ts` | ❌ Wave 0 |
| SC-2 / N-END-01 | `difficultyForWave` is 0-based-minus-one, +1 per wave, clamps at `D_MAX`, never exceeds it for wave ≤ 10 000 | unit | `npx vitest run tests/endless.ramp.test.ts` | ❌ Wave 0 |
| SC-2 | The ramp is written down — `docs/ops/ENDLESS-MODE.md` exists and carries the wave→difficulty table and these measurements | other (grep) | `grep -c "wave" docs/ops/ENDLESS-MODE.md` | ❌ Wave 0 |
| SC-3 / N-END-02 | An endless run does **not** change `bestByLevel`, `unlocked`, or `bestScore` | unit | `npx vitest run tests/storage.endless-firewall.test.ts` | ❌ Wave 0 |
| SC-3 / N-END-02 | `telemetry.endless.bestWave` / `.bestScore` take running maxima and survive a parse round-trip; a corrupt endless record degrades **telemetry only** | unit | `npx vitest run tests/storage.progress-v4.test.ts` (extend) | ✅ exists |
| SC-4 / N-END-03 | Same run seed + same policy ⇒ identical `hashWorld` at every wave boundary and identical final score; a different run seed diverges | integration | `npx vitest run tests/endless.determinism.test.ts` | ❌ Wave 0 |
| SC-4 | `seedForWave` yields distinct seeds and distinct board ids over ≥ 60 consecutive waves | unit | `npx vitest run tests/endless.ramp.test.ts` | ❌ Wave 0 |
| SC-5 / N-END-03 | Generated board reaches the world without re-running the glow bake — the bake key is invariant across waves | unit | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts` (extend) | ✅ exists |
| SC-5 / N-END-03 | **No frame spike outside the Mid budget across a wave transition** | **manual / device** | — | **device-only** |
| D-05 | The endless entry button renders under `__DEV__` and is absent otherwise | unit | `npx vitest run tests/ui/PlayingHost.*.test.ts` | ✅ exists (pattern) |
| repo-wide | `src/core/**` and `src/levelgen/**` are byte-unchanged | other | `git diff --name-only <phase-base>..HEAD -- src/core src/levelgen` → empty | n/a |

### What can be proven headlessly vs. what needs a device

| SC | Headless? | Why |
|---|---|---|
| **SC-1** | **Fully headless** | Proven in this session's prototype: 30 waves through the real `stepRun`, lives/score/combo carried, 0 stuck waves. |
| **SC-2** | **Fully headless** | Pure integer function plus a doc grep. |
| **SC-3** | **Fully headless** | Both stores are plain TypeScript; `createMemoryProgressStore` needs no native module. |
| **SC-4** | **Headless, with a scoped claim** | The determinism property is provable in Node exactly as measured. A *device* run is not replayable (no per-tick intent recorder) — the plan must state the scope rather than imply user-facing replay. |
| **SC-5** | **Split** | The *generation* half is headless (0.036 ms Node measured; ~0.56 ms Hermes-scaled, on the JS thread). The *frame-budget* half is inherently a device/simulator measurement. |

### Sampling Rate

- **Per task commit:** `npx vitest run` on the file(s) the task touched, plus `npm run lint` and `npm run typecheck` (the repo baseline is 0 warnings; 10-04 treated introducing one as a regression).
- **Per wave merge:** `npm test` — the full chain including the four assert scripts. `scripts/assert-worklet-closures.mjs` is the gate that catches a `SimPhase.DOCKED` module reference inside the new worklet.
- **Phase gate:** `npm test` green, `git status --porcelain` empty, `git diff --name-only <base>..HEAD -- src/core src/levelgen` empty, plus the device SC-5 reading recorded in `docs/ops/ENDLESS-MODE.md`.

### Wave 0 Gaps

- [ ] `tests/endless.ramp.test.ts` — covers SC-2, SC-4 (seed uniqueness)
- [ ] `tests/runtime.wave-advance.test.ts` — covers SC-1 (the field-by-field carry/clear contract)
- [ ] `tests/endless.wave-loop.test.ts` — covers SC-1, N-END-01 (multi-wave integration through real `stepRun`)
- [ ] `tests/endless.determinism.test.ts` — covers SC-4, N-END-03
- [ ] `tests/storage.endless-firewall.test.ts` — covers SC-3, N-END-02
- [ ] `docs/ops/ENDLESS-MODE.md` — covers SC-2's "written down" clause; also the landing site for the device SC-5 reading and for the Q1–Q3 measurements
- [ ] Framework install: **none needed** — Vitest 5.0.1 is already the runner

No new fixtures or shared conftest-equivalents are required: `tests/helpers/balanceBot.ts` already supplies `runBotOnLevel` for object-form levels, which is the one helper the integration tests need.

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section is required. This is an **offline, single-player, no-backend, no-account** mobile game; most ASVS categories are vacuous here, and saying so explicitly is the point.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | No accounts. `src/services/platform/noopAccounts.ts` is a deliberate no-op seam. |
| V3 Session Management | no | No sessions, no network. |
| V4 Access Control | no | No multi-user surface; all data is device-local. |
| V5 Input Validation | **yes** | Two surfaces. (a) The persisted blob: `parseProgressResult` / `sanitizeTelemetry` already validate every field and degrade to defaults — the new `EndlessRecord` **must** get the same treatment (`safeCounter`-style non-negative-integer coercion), never `JSON.parse` trust. (b) `generate`'s seed: already hardened — *"A non-finite number normalises to 0 rather than propagating NaN into the PRNG state"* [VERIFIED: src/levelgen/rng.ts:78-97]. |
| V6 Cryptography | no (but read the warning) | **Nothing here is cryptography.** `src/levelgen/rng.ts` carries an explicit `SECURITY:` block — *"this is a deterministic generator and explicitly NOT a CSPRNG … Never reuse it for a token, nonce, key or session id"* [VERIFIED: src/levelgen/rng.ts:15-18], and `fingerprint.ts` an equivalent one — *"a determinism fingerprint, not a security digest … trivially forgeable"* [VERIFIED: src/levelgen/fingerprint.ts:20-25]. The run seed is a difficulty input, not a secret. Do not let "seeded" drift into "secure" in any plan wording. |
| V7 Error Handling / Logging | partial | Dev-only `console.*` under `__DEV__` guards; nothing user-identifying. The compile-failure path (Pitfall 6) must log issues, not swallow them. |
| V8 Data Protection | partial | The endless record is a local high score. No PII. AsyncStorage (not SecureStore) is correct and is an existing decision. |
| V11 Business Logic | **yes** | The endless record is a self-reported local best with no server validation. That is *by design* for an offline game; the plan should simply not describe it as tamper-proof. Phase 13 achievements read the same data with the same property. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Corrupt/hand-edited progress blob destroys campaign progress via the new endless field | Tampering / DoS | Put `EndlessRecord` **inside** `telemetry`, whose parser degrades independently (Q9). Sanitize with the existing `safeCounter` idiom. |
| Endless run silently mutates campaign unlocks/bests | Tampering | The `mode === 'campaign'` gate in both stores (Pitfall 1), plus a direct SC-3 test. |
| Unbounded growth in the persisted blob from long endless runs | DoS (storage) | `recentRuns` is already bounded at `RECENT_RUNS_BOUND = 50`; the endless record is two scalars. No new unbounded collection may be introduced. |
| Seed treated as a secret / used for anything security-relevant | Info disclosure | Both `SECURITY:` blocks above are already in-source; do not weaken them. |
| Unbounded loop from a malformed wave index | DoS | `generate` clamps internally (`Math.max(0, Math.min(D_MAX, difficulty | 0))`), and `below()`'s rejection sampler has a documented infinite-loop trap already fixed and commented. Keep `difficultyForWave` integer-only. |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The Hermes/Node ratio of **15.5×**, derived from the 4 200-board corpus (Hermes 1 331 ms vs Node 85.7 ms measured here), transfers to `generate` + `loadAndCompile` on a low-end **Android** device | Q8 | Low. Even a 10× pessimism margin leaves ~5.6 ms, inside a 60 Hz frame, and the call is on the JS thread not the UI runtime. Confirmed or refuted by the device SC-5 check. |
| A2 | Re-keying the glow bake on `${brickW}x${brickH}` alone does not regress any campaign visual | Pitfall 2 | Low. `bakeGlowSprites(brickW, brickH)` provably reads nothing else [VERIFIED: src/render/textures/bakeGlowSprites.ts:95-108], but the *effect* also drives `fxReady` gating and the audio preload race — the interaction, not the bake, is what needs the existing `tests/ui/PlayingHost.next-bake.test.ts` extended. |
| A3 | Resetting `world.tick` per wave is the better **human** experience than carrying it | Pitfall 3 | Medium. The direction is well-founded (carrying pins the ball at the 720 cap from ~wave 3 forever, derived from source constants) but the *player* judgement has no human calibration — the E2 playtest cohort was skipped, and `BOARD-GENERATOR.md` §Limits item 2 says there is no human baseline anywhere in this chain. Cheap to reverse: one line in `applyWaveAdvance`. |
| A4 | Keying `byMode.endless` on a single constant string (e.g. `'endless'`) is the right granularity for Phase 13 achievements | Q9 | Low. Phase 13 reads this data and may want per-wave-band buckets. Changing the key later means an aggregate merge, not a migration. |
| A5 | A perfect bot's ~172 s median at d=20 corresponds to a tolerable human wave length | Q1 | Medium. Bot time is a floor for a *fixed* policy (Q2 shows policy changes it by up to 18×). No human has played a generated board at any difficulty. This is the same uncalibrated-tuning gap Phase 10 recorded, not a new one — and it is the strongest argument for a human playtest before Phase 14 ships endless publicly. |
| A6 | This phase adds no Expo API surface, so no `v57.0.0` doc lookup is required | Project Constraints | Low, and self-detecting: if a plan task imports `expo-*`, the AGENTS.md directive fires. |

---

## Open Questions

1. **Should the wave counter or the score be "the" record on the HUD?**
   - What we know: N-END-02 requires **both** be stored; CONTEXT explicitly defers the display choice to Phase 14.
   - What's unclear: nothing blocking — this phase stores both and shows the wave number somewhere (Claude's discretion per CONTEXT).
   - Recommendation: show `Wave N` in the HUD strip next to the existing lives/score/combo fields; store both records; make no display commitment.

2. **Does `docs/ops/BOARD-GENERATOR.md` §Limits item 2 get amended by this phase?**
   - What we know: its claim ("boards at that tail are plausibly unfinishable by a real player") is the inference this research was sent to test, and the trajectory measurement materially qualifies it.
   - What's unclear: whether amending a closed phase's ops doc is in scope.
   - Recommendation: **amend it** — add a cross-reference to `docs/ops/ENDLESS-MODE.md` with the 18× trajectory spread. Leaving a superseded inference in an ops record is precisely what the `## Limits` convention exists to prevent, and a future phase would otherwise act on it.

3. **Is a human playtest of endless a gate for this phase or for Phase 14?**
   - What we know: no human has played a generated board (E2 cohort skipped, A3 skipped by owner). Assumption A5 rests on it.
   - What's unclear: owner appetite.
   - Recommendation: **Phase 14's gate, not this one.** D-05 keeps endless behind a `__DEV__` button, so nothing ships to a player this phase. Flag it in the summary's Next Phase Readiness rather than blocking here.

4. **What run seed does the dev button use, and should it be overridable?**
   - What we know: `Date.now() >>> 0` in the app tier; `levelgen` cannot mint it.
   - What's unclear: whether a fixed-seed dev affordance is wanted for manual repro.
   - Recommendation: default to wall clock, accept an optional override prop so the headless SC-4 test and any manual repro can pin it. Zero cost.

---

## Sources

### Primary (HIGH confidence)

- **This session's measurements** via `tests/helpers/balanceBot.ts` `runBotOnLevel` through the real `loadAndCompile` → `applyCompiledLevel` → `stepRun` pipeline: 500 boards at d=20; 1 800 boards across d=12..20; 8 worst-board × 7-offset × 5-seed replays; a 30-wave + 25-wave × 8-run endless prototype; determinism double-run; `generate`/`loadAndCompile`/`corpusFingerprint` timing. Scratch tests deleted; `git status --porcelain` empty.
- **Repo source read this session** (every `[VERIFIED: path:lines]` tag above): `src/levelgen/{index,generate,schedule,rng,grid,fingerprint}.ts`, `src/core/{stepRun,reset,types,hash,index,constants}.ts`, `src/core/rules/{win,serve,lives,effects,scoring,speedRamp,stall}.ts`, `src/core/levels/{apply,levelIds}.ts`, `src/runtime/{useGameLoop,loadLevel,worldRequests,runStats,publishRunStatsMirror}.ts`, `src/render/textures/bakeGlowSprites.ts`, `app/_components/{PlayingHost,GameHost}.tsx`, `src/services/storage/{types,telemetry,memoryStore,asyncStorageStore,parseBlob,migrateProgress,catalog,index}.ts`, `src/devflags.ts`, `eslint.config.js`, `vitest.config.ts`, `package.json`, `tests/helpers/balanceBot.ts`, `tests/levelgen.winnability.test.ts`.
- `docs/ops/BOARD-GENERATOR.md` — theorem, dials, 21-row schedule, both digests, the discharged A1 record, `## Limits`.
- `docs/layer-contract.md` — LC-02/04/15/16/17.
- `.planning/phases/10-seeded-board-generator/10-04-SUMMARY.md` — the 840-board scan and why the tail was left unasserted.
- `.planning/phases/11-endless-mode/11-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json`.

### Secondary (MEDIUM confidence)

- The Hermes device figure (1 331 ms / 4 200 boards) is a **recorded** measurement from plan 10-05, not re-run here; it is cited from `docs/ops/BOARD-GENERATOR.md` §Limits, including its own iOS-simulator caveat.

### Tertiary (LOW confidence)

- None. **No web search was performed and none was needed** — every question in this phase is answerable from the repository and from measurement, and no external package, API or framework version is in play. `brave_search`, `exa_search` and `firecrawl` are all `false` in `.planning/config.json`; the built-in `WebSearch` was deliberately not used rather than used to manufacture citations for claims the codebase already answers.

---

## Metadata

**Confidence breakdown:**

- **The open question (Q1–Q4): HIGH.** 2 300+ board plays this session, including a decisive controlled experiment (same board, seven trajectories) that explains the tail rather than merely re-measuring it. 0 non-wins anywhere.
- **Standard stack: HIGH.** Nothing is added; every module cited was read this session at the line level.
- **Architecture / the seams (Q5, Q6): HIGH.** The wave advance was prototyped end to end against the real pipeline, not designed on paper. The WON intercept and the request-counter ordering were verified by reading `useGameLoop.onFrame` line by line.
- **Determinism (Q7): HIGH** for the headless claim (measured), **HIGH** for the negative claim that device replay is out of scope (structural — no per-tick intent recorder exists).
- **Frame budget (Q8): MEDIUM.** Node cost measured directly; Hermes cost is a ratio-scaled estimate anchored on a real recorded device number. ~30× headroom makes the estimate robust, but a device reading is the honest close (A1).
- **Storage (Q9): HIGH.** The parser's telemetry-isolation guarantee and the ungated campaign writes in both stores were read verbatim.
- **Pitfalls: HIGH** for 1, 2, 3, 4, 7 (each grounded in a quoted line of source); **MEDIUM** for 5 and 6 (reasoned from the existing `runEndedRef` and `LevelErrorOverlay` precedents rather than observed failing).

**Research date:** 2026-09-25
**Valid until:** 2026-10-25 (30 days). The findings are anchored to in-repo code and in-repo measurement, so they expire only if `src/levelgen/schedule.ts`, `src/core/rules/speedRamp.ts`, or `src/services/storage/` changes. **If `SCHEDULE` is ever re-tuned, every clear-time number in this document is void** and the Q1–Q3 scans must be re-run.
