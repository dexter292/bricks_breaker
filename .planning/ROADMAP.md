# Roadmap: Pulse Paddle — v1.2 Retention & Replayability

**Milestone:** v1.2
**Started:** 2026-09-25
**Previous:** v1.1 post-MVP — see [`MILESTONES.md`](./MILESTONES.md)

## Overview

The game currently ends when the fifth level ends. Everything shipped through v1.1 is a
finite campaign: five authored boards, a linear unlock chain, one personal best. A player
who clears it has no reason to open the app again, and the project has no way to find out
whether they would.

v1.2 makes the game outlast its authored content, using only verbs that already ship and
without adding a backend. The spine is a seeded board generator: the same component feeds
an endless mode that escalates forever and a daily challenge that hands every player the
same board on the same date. Underneath both sits a run-telemetry layer, because
achievements, statistics and any future balance decision all need counters that do not
exist yet — v1.1's E2 balance pass had to build a throwaway bot precisely because nothing
in the app records what actually happens during a run.

Generation is the risk. A procedurally built board must be deterministic for a given seed,
must survive the N-LVL-03 solvability lint that authored levels are held to, and must stay
inside the Mid-tier frame budget the ceiling cert was measured against. It gets its own
phase, before anything depends on it.

## Phases

**Phase Numbering:**

- Integer phases (9, 10, 11): Planned milestone work
- Decimal phases (10.1, 10.2): Urgent insertions (marked with INSERTED)

Numbering continues from v1.0's phases 1–8. v1.1 used letters (A1…E2) outside the registry.

- [x] **Phase 9: Run Telemetry & Storage v4** - Every run records what happened, persisted through a lossless v3→v4 migration
- [x] **Phase 10: Seeded Board Generator** - Deterministic (seed, difficulty) → playable board that passes the solvability lint
- [ ] **Phase 11: Endless Mode** - A run that never runs out of board, escalating until the player misses
- [ ] **Phase 12: Daily Challenge** - One shared board per local date, with a streak worth keeping
- [ ] **Phase 13: Achievements** - Local, deterministic unlocks earned from telemetry
- [ ] **Phase 14: Meta Shell — Mode Select, Stats & Achievements** - The new modes and records become reachable and readable

## Phase Details

### Phase 9: Run Telemetry & Storage v4

**Goal**: The app records what happens during a run, so achievements, statistics and future balance work read real numbers instead of a throwaway bot
**Depends on**: Nothing (builds on shipped v1.1)
**Requirements**: N-STAT-01, N-STAT-02
**Success Criteria** (what must be TRUE):

  1. A completed run contributes deterministic counters — bricks broken, best combo, power-ups caught, lives lost, ticks played, outcome — derived from the existing event ring, not from ad-hoc call sites sprinkled through the UI
  2. Counters are aggregated lifetime and per level id, and survive an app kill
  3. `ProgressBlob` v3 migrates to v4 without losing a single existing best score, star, or unlocked level; a v3 fixture round-trips through migration in a test
  4. Corrupt or partial v4 data degrades to defaults rather than throwing, matching the existing parse contract
  5. `hashWorld` and core simulation are untouched — telemetry reads events, it does not participate in the sim

**Plans:** 5 plans (waves 0-3)
Plans:

- [x] 09-00-PLAN.md — Wave-0 it.todo test scaffolds for N-STAT-01/N-STAT-02 + v3 fixture builder
- [x] 09-01-PLAN.md — Runtime event-ring reducer (src/runtime/runStats.ts) wired into useGameLoop.ts
- [x] 09-02-PLAN.md — ProgressBlob v4 schema, fail-soft parse, extended migrate chain, telemetry merge helpers
- [x] 09-03-PLAN.md — memoryStore.ts / asyncStorageStore.ts extended to the v4 recordRunEnd contract
- [x] 09-04-PLAN.md — PlayingHost.tsx wiring (win/lose/abandon) + SC-5 verification + manual QA checkpoint

**UI hint**: no

### Phase 10: Seeded Board Generator

**Goal**: A board can be generated from a seed and a difficulty number, and is as safe to play as a hand-authored one
**Depends on**: Nothing
**Requirements**: N-GEN-01, N-GEN-02, N-GEN-03
**Success Criteria** (what must be TRUE):

  1. `generate(seed, difficulty)` returns a `LevelFileV1` and is pure — the same arguments produce byte-identical output across processes
  2. Every generated board passes `checkSolvability` with zero unreachable breakables, asserted over a large sweep of seeds and difficulties, not a handful of samples
  3. Every generated board fits the 360×640 playfield — the bug that shipped in `level-04`/`level-05` cannot recur through the generator
  4. Difficulty is a single monotone input: higher values produce boards with non-decreasing authored weight (brick count and total HP), verified across the range
  5. Generation uses only shipped verbs (multi-HP, steel, explosive) and respects the Mid-tier particle budget — no new brick type is introduced here
  6. Generating a board allocates nothing on the render or simulation hot path; it runs once per board, off the worklet

**Plans:** 6 plans in 5 waves
Plans:

- [x] 10-00-PLAN.md — Register `src/levelgen` in the eslint layer matrix + LC-15/16/17; integer PRNG and the one fixed lattice (wave 0)
- [x] 10-01-PLAN.md — Object-taking `levelStaticsOf` / `runBotOnLevel`; sweep, schedule and winnability scaffolds (wave 0)
- [x] 10-02-PLAN.md — TRACER: `generate(seed, difficulty)` end-to-end through validate/compile/solvability, plus the explosive cluster cap (wave 1)
- [x] 10-03-PLAN.md — 21 000-board contract sweep with R-16 twin parity; engine-portable corpus fingerprint and both pinned digests (wave 2)
- [x] 10-04-PLAN.md — Bot winnability backstop and `docs/ops/BOARD-GENERATOR.md` (wave 3)
- [x] 10-05-PLAN.md — Hermes A1 device probe and the phase gate (`src/core` untouched, full suite green) (wave 4)

**UI hint**: no

### Phase 11: Endless Mode

**Goal**: A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Depends on**: Phase 10, Phase 9
**Requirements**: N-END-01, N-END-02, N-END-03
**Success Criteria** (what must be TRUE):

  1. Clearing a board advances to the next generated one within the same run — lives, score and combo carry over; the run ends only when lives reach zero
  2. Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel in code
  3. Endless records (best wave, best score) are stored separately from campaign progress; playing endless cannot unlock, lock, or alter a campaign level's best or stars
  4. A seeded endless run is reproducible end to end — the same seed and inputs replay to the same wave
  5. Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget

**Plans:** 18/18 plans executed — 16 executed (6 original waves 1-4; 2 gap-closure round 1; 3 gap-closure round 2; 3 gap-closure round 3; 2 gap-closure round 4); 2 gap-closure round-5 plans pending (waves 7-8)

Plans:
**Wave 1**

- [x] 11-01-PLAN.md — Wave ramp, per-wave seed, the mode-agnostic board-swap seam, and an end-to-end tracer transition (wave 1)
- [x] 11-02-PLAN.md — Endless record inside the telemetry blob, and the campaign-write firewall in both stores (wave 1)
- [x] 11-07-PLAN.md — Gap 1: mode-aware run boundaries — Retry and the dev-session remount restart at wave 1, the in-flight abandon funnel, and a terminal wave-build failure (gap closure, wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-03-PLAN.md — `useGameLoop` wave request/apply pair, `advanceWave`, and the cumulative tick bank (wave 2)
- [x] 11-04-PLAN.md — Multi-wave SC-1 integration and the SC-4 determinism suite (wave 2)
- [x] 11-08-PLAN.md — Gap 2: the endless record display contract — per-mode watermark refs, the endless Results variant, and the ops-record amendment (gap closure, wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-05-PLAN.md — Bake-key re-key, `PlayingHost` endless wiring, and the temporary `__DEV__` entry (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 11-06-PLAN.md — `ENDLESS-MODE.md`, the `BOARD-GENERATOR.md` §Limits amendment, and the device SC-5 assumption (wave 4)

**Gap closure round 2** *(no run is lost — the three remaining gaps are data LOSS, not record inflation)*

- [x] 11-09-PLAN.md — Gaps 2+3: `failEndlessStart()` gives a failed start a surface on every entry path, the seed attempt becomes atomic, and the Retry-time boundary gets a named, tested discriminant (gap wave 1)
- [x] 11-10-PLAN.md — Gap 1: the abandon funnel moves inside `startEndlessRun`, and `Lv` becomes an explicit exit from endless (A-02, owner-decided) (gap wave 2)
- [x] 11-11-PLAN.md — WR-04 publishes the endless watermark as `best`, the ops record is corrected to match the shipped code, and the round is gated against the frozen core (gap wave 3)

**Gap closure round 3** *(neither inflation nor loss is true any more — the third harm is that the record can be WRONG ON SCREEN)*

- [x] 11-12-PLAN.md — Gap 1: `resultBest` gets one mode-aware publication point, the endless exit republishes the campaign best, the WR-04 contract is re-pointed at `setResultBest`, and `N-END-02` is reverted then re-ticked on round-3 evidence (gap wave 1)
- [x] 11-13-PLAN.md — Gap 3: the endless WON branch consults the shared `runEndedRef` latch and returns, all three ended-run states get one post-condition, and three behaviour cases pin that an ended run stays ended (gap wave 2)
- [x] 11-14-PLAN.md — Gaps 1+2 shared: `runCertWorstCase` gets a mode term (owner decision), then the SC-5 discharge procedure loses its two false mechanisms, the boundary table gains `Cert WC`, and 11-11-SUMMARY's overstated verification claim is corrected beside itself (gap wave 3)

**Gap closure round 4** *(each of three rounds closed the half that was specified and left its neighbour open — round 4 is planned against that pattern: every branch enumerated, both sides of every new condition driven)*

- [x] 11-15-PLAN.md — Gap 1: the `runEndedRef` latch is hoisted to the FIRST statement of `applyChrome`, above the five chrome writes it was meant to own; the three gap-3 drives get a distinguishable straggler payload, the campaign panel gets its own driven case, and the source contract covers the function preamble (wave 5)
- [x] 11-16-PLAN.md — Gap 2: `runCertWorstCase` stops arming a deferral it cannot discharge (both endless sub-branches measured), the campaign cert harness keeps firing, and `ENDLESS-MODE.md` scopes the `Cert WC` injection claim to the branch it is true of in both operator-facing locations (wave 6)

**Gap closure round 5** *(round 4's fix was right and its own safety property was false on a path its enumeration did not cover — round 5 replaces assertion with derivation: two re-runnable greps, eight classified members, and counts that red when a ninth appears)*

- [x] 11-17-PLAN.md — The one remaining gap: `runCertWorstCase`'s level half is guarded on the run-ended latch so an ENDED run cannot be re-armed behind its own Results overlay; the WR-02 `Best ·` twin closes with it and its blind harness mock is repaired; the re-arm enumeration becomes two greps and a contract, and the vacuous `applyChrome` latch assertion (A2) is repaired to the guard shape (wave 7)
- [x] 11-18-PLAN.md — A1: `ENDLESS-MODE.md` stops calling `level-03` the shipped default and both operator-facing statements of the `Cert WC` level half carry both terms of its condition; `11-15-SUMMARY.md`'s over-stated safety claim is corrected beside the table that is right; N-END-01 and N-END-02 are re-ticked on their own evidence gate while N-END-03 stays unchecked (wave 8)

**UI hint**: yes

### Phase 12: Daily Challenge

**Goal**: Every player gets the same board on the same day, once, and has a streak they would be annoyed to lose
**Depends on**: Phase 10, Phase 9
**Requirements**: N-DAILY-01, N-DAILY-02, N-DAILY-03
**Success Criteria** (what must be TRUE):

  1. The board is derived from the local calendar date alone — same date, same board, on any device, with no network call
  2. The day's result (score, stars or wave, completed or not) is recorded once per date, and re-opening the app on the same date shows that result rather than regenerating a fresh attempt
  3. A streak counter increases on consecutive played dates and resets on a gap, computed from stored dates rather than an incrementing counter that a crash could corrupt
  4. Device clock changes are handled by an explicit, written policy — the behaviour on a backwards clock jump is a decision recorded in the phase, not an accident
  5. Daily results never touch campaign progress or endless records

**Plans:** TBD
**UI hint**: yes

### Phase 13: Achievements

**Goal**: The game notices what the player did and tells them, entirely offline
**Depends on**: Phase 9
**Requirements**: N-ACH-01, N-ACH-02, N-ACH-03
**Success Criteria** (what must be TRUE):

  1. Achievements are declared as data — id, description, and a pure predicate over the telemetry snapshot — so adding one does not mean editing game code
  2. Evaluation is deterministic and idempotent: re-evaluating an unlocked achievement does not re-fire it, and evaluating the same snapshot twice yields the same set
  3. Unlocks persist across app kills and survive the storage migration contract
  4. An unlock is surfaced to the player at a point that does not interrupt a live rally
  5. The catalog covers the shipped verbs and all three modes (campaign, endless, daily), not just score thresholds

**Plans:** TBD
**UI hint**: yes

### Phase 14: Meta Shell — Mode Select, Stats & Achievements

**Goal**: The new modes and the player's record are reachable and legible from the shell
**Depends on**: Phase 9, Phase 11, Phase 12, Phase 13
**Requirements**: N-STAT-03, N-UI-01, N-UI-02
**Success Criteria** (what must be TRUE):

  1. Title offers campaign, endless and daily as distinct entries, with the daily entry showing whether today has been played
  2. A statistics screen renders the lifetime and per-level telemetry from Phase 9 without recomputing it on every frame
  3. An achievements screen shows locked and unlocked entries with their descriptions, and locked entries do not spoil the condition where that would ruin the surprise
  4. New screens respect the existing shell contract: safe-area insets, dark palette, no ads/shop/login chrome, and `PlayingHost` still unmounts when not playing
  5. Navigation between modes cannot leave a run mounted in the background consuming frame time

**Plans:** TBD
**UI hint**: yes

## Carried Debt

Inherited from the previous milestone and deliberately **not** scoped into this one.
These are owner or device gated and stay open regardless of v1.2 progress. Listed so they
stay visible, not because v1.2 will close them. Full context in [`MILESTONES.md`](./MILESTONES.md).

| Item | Owner action needed |
|------|---------------------|
| §5d ceiling cert on a ramp build | Instruments on physical iPhone 16 Pro, capture past t=100s |
| ASC uniqueness for "Pulse Paddle" | App Store Connect console check before listing |
| N-OPS-01 Sentry DSN | `./scripts/set-sentry-dsn.sh`, then dashboard verify |
| Owner sign-off on E2 curve + ramp feel | Play it and accept or reject |
| Human playtest cohort | Nothing in v1.1 or v1.2 has been validated by a real player |
| R-10 floor tier / R-12 tier resolver | Floor device + owner pick |

**v1.2 adds frame cost** (generation, more persisted state, more screens) on top of a
ceiling cert that is already stale. Phase 10's budget criterion is the guard, but it is not
a substitute for §5d.
