---
phase: 11-endless-mode
plan: 01
subsystem: gameplay
tags: [endless, levelgen, worklet, world-mutation, vitest, tdd]

# Dependency graph
requires:
  - phase: 10-seeded-board-generator
    provides: "generate(seed, difficulty), D_MAX, hashSeed/mixSeed, the levelgen barrel (LC-16)"
  - phase: 05-run-rules
    provides: "effect/pickup SoA, derivePaddleWidth, dockBall, anti-stall fields"
provides:
  - "src/services/endless/ — difficultyForWave + seedForWave behind a barrel (the endless wave policy)"
  - "applyWaveAdvance(World, CompiledLevel | null) — the mode-agnostic board-swap seam in src/runtime/worldRequests.ts"
  - "compileGeneratedLevel(LevelFileV1) — the LC-04/LC-02 wrapper that lets a host-generated board reach the compile pipeline"
  - "lowestLiveBall exported from tests/helpers/balanceBot.ts (D-07) — one bot policy, one definition"
  - "tests/endless.wave-loop.test.ts, tests/endless.ramp.test.ts, tests/runtime.wave-advance.test.ts"
affects: [11-03 useGameLoop wave request/apply, 11-04 multi-wave + determinism suites, 11-05 PlayingHost endless host, 11-06 ENDLESS-MODE ops doc, 12 daily challenge]

# Actuals (#2632)
actuals:
  tokens: 7231
  tasks: 3
  commits: 4
plan_head_before: 0a62fdbd594dbdf69b8a56e1376c363672eeee1f

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "src/services/endless/ — a pure policy module under services/, structurally modelled on src/levelgen/ (barrel-fronted, Node-testable, no I/O seam)"
    - "applyWaveAdvance: a hand-written carry/clear worklet, deliberately NOT resetWorld"
    - "Source-contract assertion inside a behaviour test to pin statement order that behaviour alone cannot see"

key-files:
  created:
    - src/services/endless/ramp.ts
    - src/services/endless/index.ts
    - tests/endless.wave-loop.test.ts
    - tests/endless.ramp.test.ts
    - tests/runtime.wave-advance.test.ts
  modified:
    - src/runtime/worldRequests.ts
    - src/runtime/loadLevel.ts
    - tests/helpers/balanceBot.ts

key-decisions:
  - "D-06 implemented: applyWaveAdvance sets world.tick = 0, so every wave starts at serve speed; the effect clear stays above the reset because effectUntilTick is absolute"
  - "D-07 implemented: lowestLiveBall is exported from tests/helpers/balanceBot.ts rather than duplicated into the multi-wave driver"
  - "The per-wave seed mixes the wave index, not the difficulty — difficulty saturates at D_MAX from wave 21, so mixing it would hand every post-clamp wave the same board"
  - "difficultyForWave clamps in its own body; generate's internal clamp is treated as a backstop, not the correctness argument"
  - "Test 2's 3-ball precondition uses spawnMultiballFromPaddle (the real spawn path), not hand-set ball SoA slots"
  - "The D-06 ordering is pinned twice: by behaviour (a far-future effect does not survive the boundary) and by a source-order contract inside the same test"

patterns-established:
  - "Endless policy barrel: nothing outside src/services/endless may deep-import ./ramp"
  - "A generated board reaches the world through compileGeneratedLevel, never through an app-tier core import"
  - "Wave-loop measurements are written with node:fs to os.tmpdir(), never console.log (vitest suppresses it under this repo's reporter)"

requirements-completed: [N-END-01, N-END-03]

coverage:
  - id: D1
    description: "The wave → difficulty ramp: wave 1 is difficulty 0, one step per wave, clamped at D_MAX out to wave 10 000, integer and in range for degenerate input"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/endless.ramp.test.ts#walks 0 upward one step per wave until it reaches the ceiling (D-02)"
        status: pass
      - kind: unit
        ref: "tests/endless.ramp.test.ts#clamps at D_MAX for every wave from the ceiling out to wave 10000 (D-01)"
        status: pass
      - kind: unit
        ref: "tests/endless.ramp.test.ts#never leaves [0, D_MAX] and never returns a non-integer, including degenerate input"
        status: pass
    human_judgment: false
  - id: D2
    description: "The per-wave seed: 60 distinct u32 seeds and 60 distinct generated boards over 60 consecutive waves of one run; two run seeds separate at wave 1; a non-finite run seed normalises"
    requirement: "N-END-03"
    verification:
      - kind: unit
        ref: "tests/endless.ramp.test.ts#yields a distinct u32 seed for every one of 60 consecutive waves of one run"
        status: pass
      - kind: unit
        ref: "tests/endless.ramp.test.ts#yields a distinct board for every one of 60 consecutive waves of one run"
        status: pass
      - kind: unit
        ref: "tests/endless.ramp.test.ts#separates two runs at wave 1, so every run is not the same sequence"
        status: pass
      - kind: unit
        ref: "tests/endless.ramp.test.ts#normalises a non-finite run seed instead of propagating NaN"
        status: pass
    human_judgment: false
  - id: D3
    description: "applyWaveAdvance carries lives, score, combo and both RNG streams while clearing effects, pickups, extra balls, stall accounting, tick and accumulator, leaving the world DOCKED"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#carries lives, score, combo and the gameplay RNG stream across the boundary (SC-1 / SC-4)"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#clears effects, pickups, extra balls, stall and time (D-03 / D-06)"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#restores the paddle to its derived width and keeps it inside the field (D-03)"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#rebuilds the brick lattice from the new board (SC-1)"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#mutates the live World object rather than a clone"
        status: pass
    human_judgment: false
  - id: D4
    description: "The D-06 tick-reset ordering: a far-future absolute effectUntilTick does not survive a wave boundary, and the effect clear is pinned above the tick reset in source"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#never lets an effect survive the tick reset — the clear stays above it (D-06)"
        status: pass
      - kind: other
        ref: "sed -n '/export function applyWaveAdvance/,/^}/p' src/runtime/worldRequests.ts | grep -vE '^\\s*(//|\\*|/\\*)' | grep -n 'effectCount = 0\\|world.tick = 0'"
        status: pass
    human_judgment: false
  - id: D5
    description: "One full wave transition end-to-end through the real stepRun: a bot clears a generated wave-1 board, the wave-2 board is swapped onto the live world, the run continues and clears wave 2"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/endless.wave-loop.test.ts#clears wave 1 and swaps wave 2 onto the live world with lives, score, combo and the gameplay RNG carried"
        status: pass
    human_judgment: false
  - id: D6
    description: "The phase freeze holds: src/core/** and src/levelgen/** are byte-unchanged, and the new worklet passes the closure guard"
    verification:
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/core src/levelgen (empty)"
        status: pass
      - kind: other
        ref: "node scripts/assert-worklet-closures.mjs"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 01: Endless Wave Policy and Board-Swap Seam Summary

**A pure integer wave→difficulty ramp plus a per-wave seed behind `src/services/endless`, and `applyWaveAdvance` — a mode-agnostic board swap that carries lives/score/combo/RNG while clearing effects, pickups, extra balls and tick — proven end-to-end by a bot clearing two generated boards inside one run through the real `stepRun`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-25T13:52:00Z (approx — first commit 13:57:27Z)
- **Completed:** 2026-09-25T14:06:43Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- **The load-bearing mechanism of Phase 11 exists and is proven.** A bot clears a generated wave-1 board (103.5 bot-seconds), `applyWaveAdvance` swaps wave 2 onto the same live `World`, and the bot clears that too (117.1 bot-seconds) — with lives, score, combo and both RNG streams carried across the boundary and effects, pickups, extra balls, stall accounting and `tick` cleared.
- **D-06 is implemented, not deferred.** `world.tick = 0` each wave, so every board starts at serve speed rather than pinned at `MAX_BALL_SPEED`. Its load-bearing consequence — the effect SoA must be cleared *above* the tick reset, because `effectUntilTick` is an absolute tick — is pinned by both a behaviour test and a source-order contract.
- **The seam is mode-agnostic.** `applyWaveAdvance(World, CompiledLevel | null)` knows nothing about waves, seeds or difficulty, so Phase 12's daily challenge reuses it verbatim. The endless-specific policy lives entirely in `src/services/endless`.
- **The ramp pins properties, not dials.** `tests/endless.ramp.test.ts` walks every wave 1..10 000 and asserts starts-at-0, one-step-per-wave, clamps-at-`D_MAX`, integer-only, 60 distinct seeds and 60 distinct boards — and asserts no literal dial constant anywhere, exactly as `tests/levelgen.schedule.test.ts` does.
- **The phase freeze held.** `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` is empty; `D_MAX` is read through the levelgen barrel and never restated.

## Task Commits

1. **Task 1 (tracer, TDD RED): failing wave-loop integration test + seam stubs** — `e890dda` (test)
2. **Task 1 (tracer, TDD GREEN): ramp, applyWaveAdvance, compileGeneratedLevel** — `66c8a82` (feat)
3. **Task 2: property suite for the wave ramp and the per-wave seed** — `2c912b1` (test)
4. **Task 3: field-by-field carry/clear contract for applyWaveAdvance** — `0cc779a` (test)

No REFACTOR commit — the GREEN implementation landed in its final shape and no cleanup was identified.

## TDD Gate Compliance

| Gate | Commit | Evidence |
|---|---|---|
| RED | `e890dda` | `npx vitest run tests/endless.wave-loop.test.ts --reporter=tap` exit 1, target test failed on `the new board must start docked (D-03): expected 2 to be +0`. `gsd-tools check tdd-red-evidence` verdict **RED_EVIDENCE_OK** (`reason: target_test_failed`). |
| GREEN | `66c8a82` | Same command exit 0, 1 passed. |
| REFACTOR | — | Not needed (optional gate). |

Tasks 2 and 3 are test-only tasks (`<files>` contains no non-test source file), so the behaviour-adding predicate is false for them and the RED gate does not apply; both are committed as `test(11-01)`.

**RED evidence note (tooling):** `check tdd-red-evidence` parses a node:test-shaped TAP summary. Vitest's TAP reporter emits the `not ok` lines but no `# tests / # pass / # fail` summary lines, so the persisted record's `output` is the vitest TAP leaf lines with those three counts appended mechanically from the same output. The counts are transcribed, not asserted by hand.

## Files Created/Modified

- `src/services/endless/ramp.ts` (new) — `difficultyForWave` (1-based wave, one step per wave, clamped into `[0, D_MAX]`) and `seedForWave` (`mixSeed(hashSeed(runSeed), wave)`), both pure and integer-only, with a `schedule.ts`-style contract header naming N-END-01 / N-END-03 / D-01 / D-02, its guard test, and the no-approximated-Math rule.
- `src/services/endless/index.ts` (new) — the barrel; the only surface anything outside this directory may import.
- `src/runtime/worldRequests.ts` — added `applyWaveAdvance`, placed directly after `applyRetryWorldReset`, `'worklet'` first statement, body order: clear effects → `derivePaddleWidth` → clear pickups → `applyCompiledLevel` → `dockBall` → `simPhase = 0 // SimPhase.DOCKED` → stall zero → `tick = 0` → `accumulator = 0`.
- `src/runtime/loadLevel.ts` — added `compileGeneratedLevel(raw: LevelFileV1): LoadLevelResult`, a two-line body over `loadAndCompile`, reusing the existing result shape; `LevelFileV1` added to the `../core` import and re-export.
- `tests/helpers/balanceBot.ts` — `lowestLiveBall` is now exported (D-07); nothing else changed.
- `tests/endless.wave-loop.test.ts` (new) — one `describe`, one `it`: the end-to-end path, with the per-tick bot policy lifted from `balanceBot.ts:135-156` (a multi-wave driver cannot call `runBotOnLevel`, which allocates a fresh world per level).
- `tests/endless.ramp.test.ts` (new) — 7 property tests over the ramp and the seed.
- `tests/runtime.wave-advance.test.ts` (new) — 7 field-by-field contract tests over `applyWaveAdvance`.

## Measurements

Written by the wave-loop test with `node:fs` (vitest suppresses `console.log` under this repo's reporter) to **`os.tmpdir()/gsd-11-01-wave-loop.json`** — outside the repo, so `git status --porcelain` stays clean:

| Wave | Difficulty | Seed | Bot clear time |
|---|---|---|---|
| 1 | 0 | 1029900419 | **103.5 s** (12 422 ticks) |
| 2 | 1 | 2809643796 | **117.1 s** (14 054 ticks) |

Run seed `0x11e5`, paddle offset 6. **These are floors on human duration, not predictions** — the bot never misses on purpose (`tests/helpers/balanceBot.ts:8-9`). They sit right on Phase 10's measured p50 of 108 s, which is the expected place for a d=0/d=1 board under a clean driver.

## Decisions Made

- **Test 2's 3-ball precondition uses `spawnMultiballFromPaddle`** (the plan allowed either that or hand-set ball SoA slots). Reason: it is the real spawn path, so the test exercises the same ball-pool state a live run produces, and the precondition is asserted (`activeBallCount === 3`) before the advance so the case cannot pass vacuously.
- **`rngCosmetic` is asserted alongside `rngGameplay`.** The plan's behaviour list names the gameplay stream; the plan's `must_haves` names both. Both are asserted in both test files — a re-seeded cosmetic stream would break SC-4's replay argument just as quietly.
- **The D-06 ordering gets a source contract, not only a behaviour assertion.** A behaviour test cannot distinguish "cleared then reset" from "reset then cleared" when the clear zeroes the count either way; the thing that regresses is statement order. `tests/runtime.wave-advance.test.ts` reads `src/runtime/worldRequests.ts` and asserts `world.effectCount = 0;` appears above `world.tick = 0;`, which is the assertion that actually stops the simplification the plan feared.
- **`lowestLiveBall` exported rather than duplicated** (D-07, as the plan decided).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] `compileGeneratedLevel` would have shipped entirely unexercised**

- **Found during:** Task 1 (tracer)
- **Issue:** The plan's action for `tests/endless.wave-loop.test.ts` says to compile both boards with `loadAndCompile`, and `compileGeneratedLevel` is not referenced by any acceptance criterion in this plan. Written that way, a new exported function would have entered the codebase with zero coverage and would first be exercised by plan 11-05's host wiring — i.e. a defect in it would surface in a UI plan, not here.
- **Fix:** Wave 1 is compiled with `loadAndCompile` exactly as the plan specifies; wave 2 — the board that actually goes through `applyWaveAdvance`, and the one the host will generate — is compiled with `compileGeneratedLevel`. `tests/runtime.wave-advance.test.ts` also uses it for its generated second board, which the plan's Task 3 action already describes as "the same path the host takes".
- **Files modified:** `tests/endless.wave-loop.test.ts`, `tests/runtime.wave-advance.test.ts`
- **Verification:** Both suites pass; the wrapper is now on the executed path of two test files.
- **Committed in:** `e890dda` (RED) / `0cc779a`

---

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** No scope change — the same functions, the same tests, one import swapped so a new export is covered by the plan that created it.

## Issues Encountered

- **`check tdd-red-evidence` cannot read vitest's TAP directly.** Its classifier expects node:test summary lines (`# tests / # pass / # fail`), which vitest's TAP reporter does not emit; without them the record classifies as `zero_tests_discovered`. Resolved by appending those three counts, computed mechanically from the leaf `ok` / `not ok` lines of the very same run, to the record's `output`. Worth knowing for every future TDD plan in this repo — see the note under TDD Gate Compliance.
- **Pre-existing working-tree churn.** `.planning/STATE.md` and `.planning/config.json` were already modified and `.planning/milestone.lock` / `.planning/state.json` already untracked when this plan started (orchestrator-owned files). Task 3's `git status --porcelain` criterion is satisfied for everything this plan touched: no source or test file is left uncommitted and no throwaway measurement file exists in the repo.

## Known Stubs

None. Every stub introduced in the RED commit was replaced in the GREEN commit; no `TODO`, `FIXME` or placeholder text remains in any file this plan touched.

## Verification

| Check | Result |
|---|---|
| `npm test` (vitest + 4 assert scripts) | exit 0 |
| `npx vitest run` | **90 files / 501 tests passed, 0 failed, 0 todo** (baseline was 87 / 486) |
| `npm run lint` | exit 0, no `warning` and no `error` lines |
| `npm run typecheck` | exit 0 |
| `node scripts/assert-worklet-closures.mjs` | `Worklet closure guard OK (121 files)` |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | empty (phase freeze holds) |
| `ls src/services/endless/{ramp,index}.ts` | both present |

All per-task acceptance criteria were re-run after the final commit: the `'worklet'` count is 1, the effect clear precedes the tick reset, `resetWorld` appears 0 times in the function body, the carried fields appear 0 times, the ramp imports the levelgen barrel exactly once with no deep import, and the integer-only grep returns 0.

## User Setup Required

None — no external service configuration, no packages installed. (RESEARCH's package-legitimacy audit records that this phase installs nothing; T-11-SC holds.)

## Next Phase Readiness

**Ready for wave 2 of this phase.** Both wave-2 plans consume this one:

- **11-03** wires `applyWaveAdvance` into `useGameLoop` as a `waveRequest`/`waveApplied` counter pair and banks cumulative simulated time on the UI runtime (the D-06 telemetry consequence this plan deliberately left to it). The apply block belongs above the `simFrozen` computation at `useGameLoop.ts:435`.
- **11-04** expands `tests/endless.wave-loop.test.ts` to the multi-wave SC-1 case and adds the SC-4 determinism suite. Note for it: the D-04 guard's load-bearing half is "lives after each advance equal lives before it" — this plan asserts that for one boundary only.

No blockers. One thing 11-03 and 11-05 must not undo: `applyWaveAdvance` takes only `(World, CompiledLevel | null)`. Adding a wave number or a seed to its signature would make Phase 12's reuse a fork.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-25*
