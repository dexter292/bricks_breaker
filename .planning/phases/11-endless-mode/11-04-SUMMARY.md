---
phase: 11-endless-mode
plan: 04
subsystem: testing
tags: [endless, determinism, vitest, headless-bot, sc-1, sc-4, scope-honesty]

# Dependency graph
requires:
  - phase: 11-endless-mode
    provides: "plan 11-01's difficultyForWave / seedForWave, applyWaveAdvance, compileGeneratedLevel, the exported lowestLiveBall, and the tracer wave-loop test this plan generalises"
  - phase: 10-seeded-board-generator
    provides: "generate(seed, difficulty) and D_MAX behind the levelgen barrel"
  - phase: 09-run-telemetry-storage-v4
    provides: "allocateRunStats / reduceRunTelemetry — the per-run counter fold a wave must not restart"
provides:
  - "tests/endless.wave-loop.test.ts — the multi-wave SC-1 suite: 12 boards advance, score/combo/lives carry, LOST is the only terminating phase, the D-01 clamp still varies boards, counters fold across the swap, and the two-part D-04 life guard"
  - "tests/endless.determinism.test.ts — the SC-4 replay property, scoped to a fixed input policy in Node, with the device limitation written into the file that makes the claim"
  - "driveEndlessRun / replayEndlessRun — file-local multi-board drivers over the production seam (generate -> compileGeneratedLevel -> applyWaveAdvance)"
  - "The 12-wave reference table (difficulty, ticks, lives, score) that docs/ops/ENDLESS-MODE.md consumes in plan 11-06"
affects: [11-05 PlayingHost endless host, 11-06 ENDLESS-MODE ops doc, 12 daily challenge]

# Actuals (#2632)
actuals:
  tokens: 7908
  tasks: 2
  commits: 2
plan_head_before: 7c0df4b58f6391344f2cbfc8b05bca0153483455

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "File-local multi-board run driver: a test fixture that plays many generated boards on ONE World through the shipped seam, returning a per-wave record with before/after pairs at each boundary"
    - "Two-part decision guard: a load-bearing invariant (6a) plus a cheap cap check (6b) whose own precondition asserts the cap was actually exercised"
    - "Scope-refusal header as a deliverable: the determinism file states the provable claim and the device limitation, and an acceptance criterion greps for it"

key-files:
  created:
    - tests/endless.determinism.test.ts
  modified:
    - tests/endless.wave-loop.test.ts

key-decisions:
  - "The run driver is DUPLICATED into tests/endless.determinism.test.ts rather than lifted to tests/helpers/ — importing it from the wave-loop test file would re-register that file's suites inside the determinism file, and the fixture serves two test files, not the shipped code"
  - "Test 3's losing policy is paddle offset 120 (PADDLE_WIDTH is 72), chosen by measurement over {30, 40, 60, 80, 120, 200, 400, -400}: 30 and 40 still clear all 12 waves, 60 and above reliably lose. The case asserts the terminating PHASE, never a duration"
  - "6b is exercised, not assumed: in the 12-wave reference run lives first rise above 3 at wave 8 and reach exactly MAX_LIVES = 5 at wave 10, so the cap assertion is standing on a real life gain"
  - "maxLivesSeen is sampled every TICK, not only at wave boundaries, so a transient overshoot of MAX_LIVES inside a wave cannot hide between samples"
  - "Test 3 (determinism) asserts the seed divergence is a genuine HASH difference inside the shared boundary range, not merely a different run length — a length-only divergence is a weaker claim and would have passed the naive form"
  - "Two 12-wave runs kept at the measured configuration (11-RESEARCH § Q7); no wave count was reduced, because the whole file runs in ~0.7 s"
  - "The multi-wave tick budget is 900 simulated seconds per board (the tracer's own 600 s budget is left untouched) — a stuck-wave trap with ~2.7x headroom over the slowest board any run here hits"

patterns-established:
  - "A multi-wave endless driver never calls runBotOnLevel — that helper allocates a fresh world per level, which is precisely what a wave transition must not do; the per-tick policy is lifted from balanceBot.ts:135-156 instead"
  - "Endless determinism is asserted as A-equals-B self-consistency and A-differs-from-B divergence. No literal hash or digest is pinned: levelgen.determinism pins one only because it guards a frozen corpus"
  - "Board digests in endless tests are sha256(JSON.stringify(board)).slice(0,16) — a change detector, explicitly not a security digest"

requirements-completed: [N-END-01, N-END-03]

coverage:
  - id: D1
    description: "A 12-wave endless run advances board after board, every wave ends WON inside its tick budget, and a cleared final wave leaves the run DOCKED on the next board rather than ended (SC-1)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#advances board after board and never ends on a cleared wave (SC-1 / N-END-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Score and combo are carried across every wave boundary: score never falls, the boundary itself touches neither value, and 12 waves are worth more than 1 (SC-1)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#carries score and combo across every boundary rather than restarting them (SC-1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "LOST is the only run-ending phase — a run driven with a hopeless paddle policy reaches zero lives and terminates LOST, never WON and never a tick-budget timeout (SC-1)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#ends at zero lives and nowhere else — LOST is the only terminating phase"
        status: pass
    human_judgment: false
  - id: D4
    description: "The difficulty clamp lands at wave 21 (wave 20 is still below D_MAX) and waves 21..25 share a difficulty but still produce five distinct boards (D-01)"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/endless.wave-loop.test.ts#reaches the difficulty clamp at wave 21 and still varies the board after it (D-01)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Per-run counters fold across the board swap — bricksBroken after 12 waves exceeds the count after wave 1, i.e. a wave is not a run"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#folds per-run counters across every board swap — a wave is not a run (N-END-01)"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-04's life guard, both halves: no wave boundary grants a life (the assertion a per-N-waves bonus would break), and in a run that actually catches an extra life, lives never exceed MAX_LIVES"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#grants no life at a wave boundary — the guard a per-N-waves bonus would break (D-04)"
        status: pass
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#never exceeds MAX_LIVES in a run that actually gains a life (D-04)"
        status: pass
    human_judgment: false
  - id: D7
    description: "SC-4 headless replay: two 12-wave runs at the same run seed, world seeds and input policy hash identically at all 12 boundaries (before and after each swap) and finish on the same score, lives and wave; a different run seed diverges at wave 1"
    requirement: "N-END-03"
    verification:
      - kind: integration
        ref: "tests/endless.determinism.test.ts#replays to an identical world hash at every wave boundary (SC-4 / N-END-03)"
        status: pass
      - kind: integration
        ref: "tests/endless.determinism.test.ts#replays to an identical final score, lives and wave count (SC-4)"
        status: pass
      - kind: integration
        ref: "tests/endless.determinism.test.ts#produces a different hash sequence for a different run seed — the seed is load-bearing (SC-4)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The seed inventory holds: applyWaveAdvance leaves rngGameplay[0] and rngCosmetic[0] untouched at every boundary of a 12-wave run, which is what makes the whole run one deterministic stream"
    requirement: "N-END-03"
    verification:
      - kind: integration
        ref: "tests/endless.determinism.test.ts#leaves both RNG streams untouched at every boundary — one run is one stream (SC-4)"
        status: pass
    human_judgment: false
  - id: D9
    description: "The board sequence alone is reproducible from the run seed, independent of play: waves 1..60 derive identically twice, with 60 distinct digests — the property Phase 12's daily challenge inherits"
    requirement: "N-END-03"
    verification:
      - kind: unit
        ref: "tests/endless.determinism.test.ts#reproduces the board sequence from the run seed alone, independent of play (SC-4)"
        status: pass
    human_judgment: false
  - id: D10
    description: "The SC-4 scope limit is written into the file that makes the claim — a device endless run is NOT replayable, and the header says why (no per-tick intent recorder exists)"
    requirement: "N-END-03"
    verification:
      - kind: other
        ref: "sed -n '1,40p' tests/endless.determinism.test.ts | grep -ci 'device' -> 5"
        status: pass
    human_judgment: false
  - id: D11
    description: "The phase freeze holds and no measurement artefact leaked: src/core/** and src/levelgen/** are byte-unchanged and all measurement output goes to os.tmpdir() through node:fs"
    verification:
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/core src/levelgen (empty)"
        status: pass
      - kind: other
        ref: "grep -vE '^\\s*(//|\\*|/\\*)' tests/endless.{wave-loop,determinism}.test.ts | grep -c 'console.log' -> 0"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 04: Multi-Wave SC-1 and SC-4 Determinism Suites Summary

**Two properties a single transition could never prove: an endless run that keeps going — 12 generated boards on one `World`, score/combo/lives carried, `LOST` the only ending, and a two-part D-04 life guard whose cap is actually exercised — and an endless run that replays, asserted as A-equals-B self-consistency with the device limitation written into the file that makes the claim.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-25T14:38:00Z (approx)
- **Completed:** 2026-09-25T14:49:41Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)
- **Suite delta:** 91 files / 523 tests → **92 files / 535 tests**, 0 failed, 0 skipped

## Accomplishments

- **SC-1's "keeps going" is now a property, not an anecdote.** `driveEndlessRun` plays 12 generated boards on one `World` through the shipped seam (`generate` → `compileGeneratedLevel` → `applyWaveAdvance`), and the suite asserts every wave ends `WON` inside its budget, that a cleared final wave leaves the run `DOCKED` on the *next* board rather than ended, that score never falls and the boundary itself touches neither score nor combo, and that `bricksBroken` folds across the whole run instead of restarting per wave.
- **SC-1's ending condition is pinned from the other side.** A deliberately hopeless paddle policy (offset 120 against a 72-unit paddle) drives the run into the floor: it ends `LOST` at exactly zero lives, never `WON`, never a tick-budget timeout, and the run stops at the losing wave instead of advancing past it.
- **D-04's guard is two tests, and the SUMMARY says which one is load-bearing.** 6a — lives immediately after each `applyWaveAdvance` equal lives immediately before it — is the assertion a later per-N-waves grant would break on its first firing. 6b is the cap, and it is *exercised*: the reference run first gains a life at **wave 8** and reaches exactly `MAX_LIVES = 5` at **wave 10**, and the case asserts that gain happened *before* it asserts the cap.
- **SC-4 is proven and scoped in the same file.** Two 12-wave runs at seed 777 hash identically at all 12 boundaries (both before and after each swap) and finish on the same score, lives and wave; seed 778 diverges at wave 1; `applyWaveAdvance` leaves both RNG streams untouched at every boundary; and the board sequence for waves 1..60 reproduces from the run seed alone with 60 distinct digests.
- **The over-claim is refused in writing.** The determinism header spends 25 lines on scope: the provable claim verbatim, then *a device endless run is not replayable* and why — intent is read per substep from `paddleTarget.value`, substep count depends on wall-clock frame timing through the accumulator and `MAX_SUBSTEPS`, and nothing records the per-tick intent sequence. This closes threat **T-11-12** (repudiation via over-claimed SC-4 scope).

## Task Commits

1. **Task 1: multi-wave run loop — SC-1's "advances" and "ends only at zero lives"** — `d19f8e3` (test)
2. **Task 2: determinism suite for a seeded endless run, scoped honestly** — `eed7a21` (test)

## TDD Gate Compliance

Both tasks are **test-only**: each task's `<files>` list contains no non-test source file, and the two commits together change exactly `tests/endless.wave-loop.test.ts` and `tests/endless.determinism.test.ts`. The behaviour-adding predicate (`tdd="true"` **AND** a `<behavior>` block **AND** non-test source files in `<files>`) is therefore false for both, so the RED-commit contract does not apply and both land as `test(11-04)`.

No product behaviour was added by this plan. `git diff --name-only 7c0df4b..HEAD -- src` is empty.

(For the record, and consistent with 11-01/11-02/11-03: `gsd-tools check tdd-red-evidence` still cannot classify a vitest run — it expects flat node:test TAP with `# tests` / `# pass` / `# fail` summary lines and unindented `not ok N - ...`, while vitest nests describes and omits the counts. No transcription helper was added to the repo.)

## Files Created/Modified

- **`tests/endless.wave-loop.test.ts`** (modified, +394/−10) — header rewritten to say what each half covers and to carry the bot-honesty caveat and the no-clear-time-ceiling refusal. 11-01's tracer case is byte-unchanged apart from the two `resetWorld` literals becoming the new `GAMEPLAY_SEED` / `COSMETIC_SEED` constants. Added: `WaveRecord` / `EndlessRun` types, `boardDigest`, the file-local `driveEndlessRun`, a 6-test `describe` over the 12-wave reference run (driven once in `beforeAll`), and a 1-test `describe` for the losing run. **8 tests total.**
- **`tests/endless.determinism.test.ts`** (new, 350 lines) — the scope header, `boardDigest`, `assertWorldIdentity` ported in shape from `physics.golden-replay.test.ts:61-73` (hash first, then 14 named fields including both RNG streams and the brick lattice), the near-duplicate `replayEndlessRun` driver, and **5 tests**.

## Measurements

### The 12-wave reference run — input to `docs/ops/ENDLESS-MODE.md` (plan 11-06)

Run seed `0x11e5`, paddle offset **6**, `resetWorld(w, 0xace, 0xbeef)`. Lives/score/combo are read at the wave boundary, *before* the advance; `bricks` is the cumulative run fold, not a per-wave count. Written by the test with `node:fs` to **`os.tmpdir()/gsd-11-04-wave-loop.json`** — outside the repo, so `git status --porcelain` stays clean.

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

Totals: **197 461 ticks ≈ 1 645 s (27.4 min)** of flawless play, final score **153 620**, final lives **5**.

**These are floors on human duration, not predictions** — the bot never misses on purpose (`tests/helpers/balanceBot.ts:8-9`). No test in either file asserts any of these durations; they exist for the ops doc.

### D-04 exercise evidence (the 6b precondition)

| Fact | Value |
|---|---|
| Starting lives | 3 |
| **Wave at which lives first exceeded 3** | **8** |
| Wave at which lives reached the cap | 10 |
| Max lives seen (sampled every tick) | **5** = `MAX_LIVES` |

The cap is genuinely approached and then held for the remaining three waves, so 6b's cap assertion is standing on a real extra-life catch rather than on a run that never gained one.

### Losing-policy calibration (Test 3)

Measured over `{30, 40, 60, 80, 120, 200, 400, −400}` at two run seeds, 12-wave budget:

| Offset | 30 | 40 | **60** | 80 | **120** | 200 | 400 | −400 |
|---|---|---|---|---|---|---|---|---|
| Outcome | clears 12 | clears 12 | LOST w1 | LOST w1 | **LOST w1** | LOST w1 | LOST w1 | LOST w1 |

**120** was chosen: comfortably past the 60-unit cliff (so it is not sitting on a boundary) and legible against `PADDLE_WIDTH = 72`.

### Determinism configuration

Run seeds **777** (reference, ×2 runs) and **778** (divergence), 12 waves each, `resetWorld(w, 0xace, 0xbeef)`, paddle offset 6. Divergence between 777 and 778 occurs at **boundary 1** — a genuine hash difference inside the shared range, verified by temporarily inverting the assertion during development. No wave count was reduced: the whole determinism file (three 12-wave runs plus 120 board generations) runs in **~0.7 s**.

## Decisions Made

- **The driver is duplicated, not lifted to `tests/helpers/`.** The plan allowed either. Importing `driveEndlessRun` from `tests/endless.wave-loop.test.ts` would execute that file's `describe`/`it` registrations inside the determinism file, duplicating eight suites; and the fixture is a two-file test artefact, not an instrument anything ships against, so `tests/helpers/` (which holds `balanceBot`, a measurement instrument used by many files) is the wrong home. The determinism copy is deliberately *trimmed* — it records boundary hashes and RNG pairs and drops the telemetry fold, which SC-4 does not need.
- **Sample `maxLivesSeen` every tick, not at boundaries.** A boundary-only sample cannot see a transient `lives > MAX_LIVES` inside a wave, which is exactly the failure mode the cap guards. The per-tick compare costs nothing next to `stepRun`.
- **Strengthen the seed-divergence case beyond the plan's wording.** The plan asks that a different run seed "differs at at least one boundary". A run that merely *ended earlier* would satisfy that literally while proving much less, so the case additionally asserts the divergence index lies inside the shared boundary range — i.e. it is a real hash difference.
- **Hash both sides of every boundary.** The plan's Test 1 asks for `hashWorld` at each boundary; the suite records `hashAfterClear` (the research checkpoint) *and* `hashAfterAdvance`, so a non-deterministic board swap cannot hide behind a deterministic clear.
- **A separate, larger tick budget for the multi-wave driver.** 11-01's tracer keeps its 600 s constant untouched; the driver uses 900 s, with the reasoning written at the constant (p99 at d=20 is 656.8 s per research; the slowest board any run here hits is 329.6 s).

## Deviations from Plan

None - plan executed exactly as written. The three items under "Decisions Made" that go beyond the plan's literal wording (per-tick lives sampling, the strengthened divergence assertion, hashing both sides of each boundary) are strictly-stronger assertions within the plan's stated behaviours, not scope changes.

## Authentication Gates

None — no external service, no credentials, no packages installed. (T-11-SC holds: `npm ls --depth=0` is unchanged; RESEARCH's package-legitimacy audit records this phase installs nothing.)

## Issues Encountered

- **`check tdd-red-evidence` still cannot read vitest output** — unchanged from 11-01/11-02/11-03 and irrelevant here, since both tasks are test-only and the RED gate does not apply. No transcription helper was committed.
- **Pre-existing working-tree churn.** `.planning/config.json` was already modified and `.planning/milestone.lock` / `.planning/state.json` already untracked when this plan started (orchestrator-owned files, same condition 11-01 recorded). Nothing this plan touched is left uncommitted, and no measurement artefact exists anywhere in the repo.

## Known Stubs

None. No `TODO`, `FIXME`, placeholder text, skipped test or `it.todo` exists in either file; every test added asserts real behaviour and all 13 of them pass.

## Threat Flags

None. This plan adds no network endpoint, auth path, file-access pattern or schema change. Both mitigations assigned to it are discharged:

| Threat | Disposition | Evidence |
|---|---|---|
| T-11-12 (over-claimed SC-4 scope) | mitigate | The determinism header states the provable claim and the device limitation; `sed -n '1,40p' … \| grep -ci device` → 5 |
| T-11-13 (working-tree pollution) | mitigate | All measurement output goes to `os.tmpdir()` via `node:fs`; `git status --porcelain` shows nothing this plan touched |

## Verification

| Check | Result |
|---|---|
| `npx vitest run tests/endless.wave-loop.test.ts` | exit 0, **8 passed**, 0 failed |
| `npx vitest run tests/endless.determinism.test.ts` | exit 0, **5 passed**, 0 failed, 0 skipped |
| `npx vitest run` (whole suite) | **92 files / 535 tests passed**, 0 failed (baseline 91 / 523) |
| `npm test` (vitest + 4 assert scripts) | exit 0 |
| `npm run lint` | exit 0, no `warning` and no `error` lines |
| `npm run typecheck` | exit 0 |
| `git status --porcelain` | nothing from this plan (only pre-existing `.planning/` churn) |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | empty — the phase freeze holds |

Per-task acceptance criteria, re-run after the final commit:

| Criterion | Result |
|---|---|
| `grep -c 'MAX_LIVES' tests/endless.wave-loop.test.ts` ≥ 1 | **4** |
| `grep -cE 'toBeLessThan\(.*(seconds\|1495\|2735)' tests/endless.wave-loop.test.ts` = 0 | **0** |
| `grep -c 'applyWaveAdvance' tests/endless.wave-loop.test.ts` ≥ 1 | **7** |
| `console.log` outside comments, wave-loop | **0** |
| `grep -cE "toBe\(0x[0-9a-fA-F]{6,}\)\|toBe\([0-9]{7,}\)" tests/endless.determinism.test.ts` = 0 | **0** |
| `sed -n '1,40p' … \| grep -ci 'device'` ≥ 1 | **5** |
| `grep -c 'rngGameplay' tests/endless.determinism.test.ts` ≥ 1 | **8** |
| `console.log` outside comments, determinism | **0** |
| 6b's life-gain precondition holds and the SUMMARY names the wave | **wave 8** (cap reached wave 10) |

## User Setup Required

None.

## Next Phase Readiness

**Ready for 11-05 (PlayingHost endless host) and 11-06 (the ops doc).**

- **11-06** should take its Limits section straight from this file: the 12-wave reference table above is the measured input, and the SC-4 scope paragraph (device runs are not replayable, and why) must be repeated there — that repetition is T-11-12's second mitigation and the plan already assigns it.
- **11-05** must not change `applyWaveAdvance`'s signature. Both suites here drive `(World, CompiledLevel | null)` directly; a wave number or seed added to it would fork Phase 12's reuse and would be caught by these files only as a compile error, not as a clear message.
- **A note for anyone tempted to add a replay feature:** the determinism header is the contract. Recording the per-tick intent stream is the missing piece, and it is a feature, not a fix.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-25*

## Self-Check: PASSED

Both artifacts exist on disk (`tests/endless.determinism.test.ts` created, `tests/endless.wave-loop.test.ts` modified) and both commits (`d19f8e3`, `eed7a21`) are present in `git log`.
