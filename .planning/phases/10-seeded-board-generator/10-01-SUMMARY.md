---
phase: 10-seeded-board-generator
plan: 01
subsystem: testing
tags: [vitest, tdd, test-helpers, level-generation, balance-measurement]

# Dependency graph
requires:
  - phase: 09-post-mvp-and-telemetry
    provides: "tests/helpers/balanceBot.ts — the E2-locked authored-weight definition and the deterministic headless bot, both file-bound"
provides:
  - "levelStaticsOf(raw, scoreHit) — THE authored-weight definition, now measurable from a plain LevelFileV1 object (N-GEN-03)"
  - "runBotOnLevel(raw, opts, label) — the real stepRun bot loop, now playable from a plain LevelFileV1 object (N-GEN-02 quality backstop)"
  - "tests/helpers.balanceBot.test.ts — the equivalence proof that the split is behaviour-preserving"
  - "tests/levelgen.sweep.test.ts with SWEEP_SEEDS = 1000 exported, plus levelgen.schedule and levelgen.winnability scaffolds (12 it.todo landing sites)"
affects: [10-02 tracer, 10-03 sweep, 10-04 winnability, 11 dial re-tuning, 12 daily challenge]

# Actuals (#2632)
actuals:
  tokens: 4510
  tasks: 2
  commits: 3
plan_head_before: c33195284f6a14239cd75a25052683f147693dca

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "object-taking core + id-taking wrapper for file-bound test helpers"
    - "it.todo scaffolds that name the downstream validation task id they unblock"

key-files:
  created:
    - tests/helpers.balanceBot.test.ts
    - tests/levelgen.sweep.test.ts
    - tests/levelgen.schedule.test.ts
    - tests/levelgen.winnability.test.ts
  modified:
    - tests/helpers/balanceBot.ts

key-decisions:
  - "The authored-weight body lives once, in levelStaticsOf; levelStatics(id) is a one-line delegation. A second copy would let a generated board be monotone under one definition and not the other."
  - "runBotOnLevel takes a label used only in the compile-failure message, so a 21 000-board sweep names the failing artefact instead of throwing `undefined failed to compile`."
  - "Added tests/helpers.balanceBot.test.ts (not in the plan's files_modified) because task 1's <behavior> block asserts three contracts that had no test home; curve-e2 only covers the wrappers, not the cores."
  - "The RED phase declared levelStaticsOf/runBotOnLevel as not-implemented stubs so all three tests were discovered and failed on their own assertions — a missing-export link error is zero-test discovery and would have been INVALID_RED under #3770."
  - "Did NOT create .planning/WINDOWS.md: it does not exist in this repo, and creating it from a parallel worktree risks an add/add merge conflict with the sibling 10-00 executor. The 12 it.todo entries are tracked in 10-VALIDATION.md's per-task map and in ## Known Stubs below."

patterns-established:
  - "File-bound measuring instrument split: extract the body into an object-taking core, keep the id-taking wrapper byte-compatible, and cap readLevelFile occurrences so no parallel measurement path can appear."
  - "Scaffold test files import only what exists today — never a symbol a later wave creates — because an unresolved import fails the whole file rather than skipping a todo."

requirements-completed: [N-GEN-02, N-GEN-03]

coverage:
  - id: D1
    description: "levelStaticsOf(raw, scoreHit) measures authored weight from a plain LevelFileV1 object and agrees exactly with levelStatics(id, scoreHit) on every campaign level"
    requirement: "N-GEN-03"
    verification:
      - kind: unit
        ref: "tests/helpers.balanceBot.test.ts#levelStaticsOf(raw) deep-equals levelStatics(id) for every campaign level"
        status: pass
    human_judgment: false
  - id: D2
    description: "runBotOnLevel(raw, opts, label) plays a plain LevelFileV1 object through the real stepRun pipeline and replays identically to runBot(id)"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/helpers.balanceBot.test.ts#runBotOnLevel(raw) replays identically to runBot(id)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A board that fails to compile throws a message naming the supplied label, so a large sweep can identify the failing artefact"
    verification:
      - kind: unit
        ref: "tests/helpers.balanceBot.test.ts#names the supplied label when a board fails to compile"
        status: pass
    human_judgment: false
  - id: D4
    description: "tests/balance.curve-e2.test.ts is byte-unchanged and still green — the campaign bounds and monotone-weight contract survived the refactor"
    verification:
      - kind: unit
        ref: "npx vitest run tests/balance.curve-e2.test.ts (8 passed) + git diff --stat c331952..HEAD -- tests/balance.curve-e2.test.ts (empty)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nothing was written into assets/levels/, so scripts/assert-level-solvability.mjs still sees exactly the shipped corpus with level-02 the only failure"
    verification:
      - kind: integration
        ref: "npm test -> assert-level-solvability: OK (ship levels pass; level-02 fails)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The sweep, schedule and winnability scaffolds exist, are green, export SWEEP_SEEDS = 1000, and their 12 it.todo entries name every downstream validation task id"
    requirement: "N-GEN-02"
    verification:
      - kind: unit
        ref: "npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.schedule.test.ts tests/levelgen.winnability.test.ts (12 todo, exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 7 min
completed: 2026-09-25
status: complete
---

# Phase 10 Plan 01: Measuring Instruments and Sweep Scaffolds Summary

**`levelStatics` and `runBot` split into object-taking cores (`levelStaticsOf` / `runBotOnLevel`) so a generated board with no file on disk can be weighed and played by the E2-locked instruments, plus three `it.todo` scaffolds carrying 12 named landing sites for waves 1-3.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-25T11:19:08Z
- **Completed:** 2026-09-25T11:26:20Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- **The authored-weight definition is stated exactly once and is now object-addressable.** `levelStaticsOf(raw, scoreHit)` holds the E2-locked body; `levelStatics(id, scoreHit)` is a one-line delegation. N-GEN-03 can now be asserted against *the* definition rather than a second copy that could drift.
- **The headless bot can play a board that was never written to disk.** `runBotOnLevel(raw, opts, label)` runs the real `stepRun` loop on a plain object, so N-GEN-02's quality backstop measures actual play rather than a heuristic. `label` names the artefact in the compile-failure throw, which is what makes a 21 000-board sweep failure actionable.
- **The refactor is proven behaviour-preserving, not merely type-compatible.** `tests/helpers.balanceBot.test.ts` pins that core and wrapper agree on weight for every campaign level and on `outcome`/`bricksRemaining`/`ticks` for a full bot run. `tests/balance.curve-e2.test.ts` is byte-unchanged and green.
- **`readLevelFile` survives at exactly three call sites** — its definition and the two wrapper delegations — so neither measurement core touches the filesystem and no parallel measurement path can appear.
- **Nothing was added to `assets/levels/`.** `assert-level-solvability` still reports "ship levels pass; level-02 fails", the exact corpus invariant T-10-06 protects.
- **Three scaffolds land 12 named todos**, each naming the validation task id it unblocks, so Nyquist sampling does not go dark between waves.

## Task Commits

1. **Task 1 (RED): failing equivalence test for the balanceBot object/id split** — `7e4d413` (test)
2. **Task 1 (GREEN): implement the balanceBot object-taking cores** — `2a8e650` (feat)
3. **Task 2: scaffold the levelgen sweep, schedule and winnability suites** — `e1a0f56` (test)

No REFACTOR commit: the extracted bodies moved wholesale and needed no cleanup, and the TDD contract commits REFACTOR only when changes are made.

_Base for the measured commit count: `c33195284f6a14239cd75a25052683f147693dca`._

## Files Created/Modified

- `tests/helpers/balanceBot.ts` — **modified.** `levelStaticsOf(raw, scoreHit)` and `runBotOnLevel(raw, opts, label)` are the new object-taking cores; `levelStatics(id, scoreHit)` and `runBot(id, opts)` are unchanged in signature and now delegate. `readLevelFile`, `TICKS_PER_SECOND`, `BotOptions`, `BotResult`, `BotOutcome` and `LevelStatics` are untouched.
- `tests/helpers.balanceBot.test.ts` — **created.** The equivalence proof for the split (3 tests).
- `tests/levelgen.sweep.test.ts` — **created.** Exports `SWEEP_SEEDS = 1000` (1 000 x 21 = 21 000 boards) with RESEARCH Pitfall 7 recorded at the constant. 8 todos: validate+compile (10-02-01/10-02-02), reachability (10-02-01), playfield bounds (10-02-03), mirror symmetry (D-01), exact weight vs schedule (10-03-02), charset/`brickTypes` (10-03-03), explosive cluster cap (10-03-04), and the R-16 `.mjs` parity block (10-02-04).
- `tests/levelgen.schedule.test.ts` — **created.** 3 todos: monotone `bricks`, monotone `totalHp`, half-board capacity. Header records why no test may pin the literal dial constants.
- `tests/levelgen.winnability.test.ts` — **created.** 1 todo: the stratified 30-board bot sample (10-04-01). Header records that the bot never misses, so `WON` is necessary but not sufficient for a human-playable board.

## Decisions Made

- **The RED phase used not-implemented stubs rather than absent exports.** Importing a non-existent named export makes vitest fail the whole *file* at collection — zero tests discovered — which #3770 classifies as `INVALID_RED` and which would not have authorized GREEN. Declaring `levelStaticsOf` / `runBotOnLevel` as stubs returning obviously-wrong values made all three tests run and fail on their own assertions. Verdict `RED_EVIDENCE_OK` via `gsd-tools check tdd-red-evidence`.
- **Todo names carry the plan's task ids, with `10-VALIDATION.md`'s re-homed ids noted in the sweep header.** The plan names 10-02-03/10-02-04/10-03-03/10-03-04; the re-homed validation map folds most of those into 10-03-01. Rather than guess a mapping, both schemes are recorded in the file header, including the resolution that the original 10-02-04 `.mjs` CI twin is an in-process R-16 `describe` block, not a standalone script.
- **No floor assertion on `SWEEP_SEEDS` yet.** The plan and threat T-10-08 assign it to 10-03; task 2 exports the named constant and records why it matters.
- **`.planning/WINDOWS.md` was deliberately not created** — see Issues Encountered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `tests/helpers.balanceBot.test.ts`, a file not listed in `files_modified`**

- **Found during:** Task 1 (balanceBot split)
- **Issue:** Task 1 is `tdd="true"` and its `<behavior>` block states three contracts — core/wrapper weight equality, core/wrapper bot-run equality, and the labelled compile-failure throw. The plan's `<files>` for that task names only `tests/helpers/balanceBot.ts`, so the RED test had no home and none of the three contracts would have been asserted by anything. `tests/balance.curve-e2.test.ts` exercises the *wrappers* only; it cannot detect a core that diverges from its wrapper, which is precisely the regression this refactor could introduce.
- **Fix:** Created `tests/helpers.balanceBot.test.ts` with exactly the three `<behavior>` assertions and a header naming what it deliberately does not cover.
- **Files modified:** `tests/helpers.balanceBot.test.ts` (new)
- **Verification:** 3 tests, green. Task 2's acceptance criterion "at least 85 test files" still holds at 86. Task 1's `readLevelFile` cap, the empty `curve-e2` diff and the empty `assets/levels` status are all unaffected.
- **Committed in:** `7e4d413` (RED) and `2a8e650` (GREEN)

**2. [Rule 3 - Blocking] Corrected a stale worktree base before any edit**

- **Found during:** Pre-execution base check
- **Issue:** The harness forked this worktree from `main` (`8788caa`, a GitHub merge commit) rather than from the orchestrator's `gsd/phase-10-board-generator` HEAD (`64a0b0c`). The worktree was missing all 8 phase-10 commits including `10-01-PLAN.md` itself. `git merge --ff-only` was impossible because `8788caa` carries one commit not on the phase branch.
- **Fix:** Verified the divergence is content-free before acting — `8788caa`'s tree hash (`3633607a…`) is byte-identical to the merge base `f814dae`'s, and the branch carried zero commits of mine — so a plain `git merge 64a0b0c` was provably lossless. The post-merge tree hash (`95364b34…`) equals `64a0b0c`'s exactly. No `reset --hard`, `clean`, `update-ref` or `stash` was used.
- **Files modified:** none (merge commit `c331952`, which is the base for the commit count above)
- **Verification:** `git rev-parse HEAD^{tree}` == `git rev-parse 64a0b0c^{tree}`
- **Committed in:** `c331952` (base sync, not plan work)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** No scope creep. The added test file asserts contracts the plan already demanded and nothing more; the base correction was a prerequisite for reading the plan at all.

## Known Stubs

The three scaffold files are **intentional** Wave 0 deliverables, not accidental stubs. Each `it.todo` names the plan task that fills it; 10-VALIDATION.md's per-task map is the tracking system of record, and 10-05-02 is the phase gate that closes them.

| File | Todos | Resolved by |
|---|---|---|
| `tests/levelgen.sweep.test.ts` | 8 | 10-02 (tracer), 10-03 (full corpus sweep + R-16 parity) |
| `tests/levelgen.schedule.test.ts` | 3 | 10-03-01 (monotonicity, capacity) |
| `tests/levelgen.winnability.test.ts` | 1 | 10-04-01 (stratified bot sample) |

No stub exists in shipped source: `src/` is untouched by this plan.

## Issues Encountered

- **`gsd-tools check tdd-red-evidence` reads node:test TAP, vitest does not emit it.** The validator parses `# tests / # pass / # fail` summary lines and unindented `not ok N - <name>` entries. Vitest's default `--reporter=tap` nests and indents; neither reporter emits the summary lines. Resolved by capturing `--reporter=tap-flat` output and appending summary lines *computed from that run's own `ok`/`not ok` lines* (3 discovered / 0 pass / 3 fail) — a transcription into the parser's dialect, with no invented counts. Verdict: `RED_EVIDENCE_OK`. Worth noting for the next TDD plan in this repo, which will hit the same seam.
- **The broken-windows ledger was not populated.** `.planning/WINDOWS.md` does not exist in this repo, and `gsd-tools windows append` creates it. Creating a shared new file under `.planning/` from a parallel worktree risks an add/add merge conflict with the sibling 10-00 executor, which the disjoint-file-set contract exists to prevent. Ledger population is documented as best-effort and non-blocking; the equivalent information is in `## Known Stubs` above and in 10-VALIDATION.md. If the orchestrator wants the ledger, it should be seeded once on the phase branch rather than from inside a worktree.
- **Expo:** AGENTS.md pins Expo SDK 57 and requires consulting the versioned docs before writing code that touches Expo APIs. Confirmed by inspection rather than assumed: this plan touches only `tests/`, imports only `src/core`, `src/services/storage/catalog` and `vitest`, and calls no Expo API. No doc lookup was required.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run tests/balance.curve-e2.test.ts tests/levels.verb-curve-e1b.test.ts tests/levels.solvability-parity.test.ts` | 3 files / 18 tests passed |
| `npx vitest run tests/levelgen.{sweep,schedule,winnability}.test.ts` | exit 0, 12 todo, 0 failed |
| `npx vitest run` (full) | **86 files / 454 passed / 12 todo / 0 failed** (baseline was 82 files / 451 tests) |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npm test` (full gate incl. the 4 assert scripts) | exit 0; `assert-level-solvability: OK (ship levels pass; level-02 fails)` |
| `git status --porcelain assets/levels` | empty |
| `git diff --name-only c331952..HEAD -- src/core` | empty |
| `git diff --stat c331952..HEAD -- tests/balance.curve-e2.test.ts` | empty |
| `grep -c levelStaticsOf tests/helpers/balanceBot.ts` | 3 (>= 2 required) |
| `grep -c runBotOnLevel tests/helpers/balanceBot.ts` | 3 (>= 2 required) |
| `grep -n readLevelFile tests/helpers/balanceBot.ts` | 3 lines (<= 3 required) |
| `grep -c "from '../src/levelgen'" tests/levelgen.sweep.test.ts` | 0 |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Wave 1 (plan 10-02, the tracer) is unblocked.** `runBotOnLevel` and `levelStaticsOf` accept a plain `LevelFileV1`, so `generate`'s output can be validated, compiled, weighed and played the moment it exists — with no temp file and no new entry under `assets/levels/`.
- **`SWEEP_SEEDS` is exported and ready for 10-03's floor assertion** (`expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000)`), which is the half of the T-10-08 mitigation this plan deliberately left to 10-03.
- **Concern for 10-02/10-03 authors:** the three scaffolds must not import `generate`, `SCHEDULE` or `D_MAX` until those symbols land, or the whole file fails rather than skipping its todos. Each header records this.
- **Concern for the validation step:** the plan's task ids (10-02-03, 10-02-04, 10-03-03, 10-03-04) and 10-VALIDATION.md's re-homed map disagree. Both are recorded in the sweep header, but someone should pick one scheme before 10-05-02's phase gate audits todo coverage.

## Self-Check: PASSED

All 5 key files verified present on disk. All 4 commits verified reachable from HEAD
(`7e4d413`, `2a8e650`, `e1a0f56`, `389fdd7`), base `c331952`. Full gate re-run green.

---
*Phase: 10-seeded-board-generator*
*Completed: 2026-09-25*
