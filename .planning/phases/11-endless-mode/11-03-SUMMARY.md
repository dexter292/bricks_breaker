---
phase: 11-endless-mode
plan: 03
subsystem: runtime
tags: [endless, reanimated, worklet, frame-loop, telemetry, shared-value]

# Dependency graph
requires:
  - phase: 11-endless-mode
    plan: 01
    provides: "applyWaveAdvance(World, CompiledLevel | null), clearCosmeticVfx, the D-06 world.tick = 0 decision"
  - phase: 09-run-telemetry-storage-v4
    provides: "RunStats, reduceRunTelemetry, publishRunStatsMirror / RunStatsMirror.ticksPlayed"
provides:
  - "GameLoopHandle.advanceWave() — the sanctioned JS→UI-runtime route for a wave advance (a bump-only cold path)"
  - "waveRequest / waveApplied — the fourth request/apply counter pair in useGameLoop"
  - "ticksBanked — cumulative simulated time across waves on the UI runtime, feeding RunStatsMirror.ticksPlayed"
affects: [11-04 multi-wave + determinism suites, 11-05 PlayingHost endless host (the WON intercept calls advanceWave), 12 daily challenge]

# Actuals (#2632)
actuals:
  tokens: 4205
  tasks: 2
  commits: 2
plan_head_before: a93138286be58f0ae06166d75da4e8f7969319f5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fourth RN→UI request/apply counter pair, placed by ORDERING rather than by grouping — its position above the simFrozen computation is the correctness argument, not a style choice"
    - "Segment accumulator banked on the runtime that owns the reset (UI), not in the app tier — race-free by construction where a JS-tier ref would depend on unordered useAnimatedReaction delivery"
    - "Headless arithmetic-contract test: reproduce the frame loop's substep tail against the pure functions rather than mocking a hook that cannot run in environment: 'node'"

key-files:
  created: []
  modified:
    - src/runtime/useGameLoop.ts
    - tests/runtime.wave-advance.test.ts

key-decisions:
  - "The counter pair is named waveRequest / waveApplied and the bank is ticksBanked — the pair follows the three existing pairs exactly; the bank is named for what it holds, not for the wave"
  - "The tick bank lives on the UI runtime as a useSharedValue, incremented inside the wave-advance block immediately before applyWaveAdvance, and zeroed in the resetRequest block alongside the counters"
  - "publishRunStatsMirror's third argument is a per-substep local `ticksPlayed = ticksBanked.value + w.tick` rather than an inline expression, so the acceptance grep still matches one line and the intent is named"
  - "Task 2's carry proof is 'the run total exceeds every brick the wave-2 board contained' rather than an arithmetic multiple of wave 1's count — a multiple assumes the two generated boards have comparable brick counts, which nothing guarantees"

patterns-established:
  - "A wave-advance apply block must never call resetRunStats, reassign runStatsSv.value or bump runStatsSeq — a wave is a new board, not a new run"
  - "Any future world.tick reset must be paired with a bank increment on the same runtime, in the same block, above the reset"

requirements-completed: [N-END-01, N-END-03]

coverage:
  - id: D1
    description: "The host can request a wave advance and the frame callback applies it on the live World on the same frame, with no setActive churn — the apply block is pinned above the simFrozen computation"
    requirement: "N-END-03"
    verification:
      - kind: other
        ref: "grep -n 'applyWaveAdvance\\|const simFrozen' src/runtime/useGameLoop.ts — call at 460, simFrozen at 483"
        status: pass
      - kind: other
        ref: "grep -n 'applyCertWorstCaseInject\\|applyWaveAdvance' src/runtime/useGameLoop.ts — cert block at 442 precedes the wave block at 460"
        status: pass
      - kind: other
        ref: "node scripts/assert-worklet-closures.mjs (121 files)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The wave advance does NOT zero the per-run counters — a multi-wave run reports the whole run"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "awk '/waveRequest.value !== waveApplied.value/,/^    }/' src/runtime/useGameLoop.ts | grep -vE '^\\s*(//|\\*|/\\*)' | grep -c 'resetRunStats' → 0"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#folds per-run counters across the board swap — a wave is not a run (N-END-01 / Pitfall 4)"
        status: pass
    human_judgment: false
  - id: D3
    description: "ticksPlayed published to JS is cumulative across waves even though world.tick restarts each wave (D-06 consequence 2)"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#publishes cumulative ticksPlayed even though world.tick restarts (D-06 consequence 2)"
        status: pass
      - kind: unit
        ref: "tests/runtime.wave-advance.test.ts#restarts world.tick at every advance while the bank keeps climbing (D-06)"
        status: pass
      - kind: other
        ref: "grep -n 'publishRunStatsMirror(runStatsOut.value, stats,' src/runtime/useGameLoop.ts — third argument is `ticksPlayed`, no longer bare `w.tick`"
        status: pass
    human_judgment: false
  - id: D4
    description: "A retry still zeroes everything a retry zeroed before, including the new tick bank"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "src/runtime/useGameLoop.ts:427 — `ticksBanked.value = 0;` inside the resetRequest block, alongside resetRunStats"
        status: pass
      - kind: unit
        ref: "npx vitest run (523 tests, incl. the existing retry/reset-request suites) — no regression"
        status: pass
    human_judgment: false
  - id: D5
    description: "advanceWave reaches the live World on a real device through the Reanimated bridge (the worklet/Metro half of the path)"
    requirement: "N-END-03"
    human_judgment: true
    rationale: "Vitest runs plain JS; the counter-pair route exists because in-place mutation of a held object does not propagate across the bridge, and only a device run exercises that. Deferred to 11-05's host wiring and the phase's device pass — the same standing caveat tests/endless.wave-loop.test.ts carries."

# Metrics
duration: 12min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 03: Wave Request/Apply and the Cumulative Tick Bank Summary

**`GameLoopHandle.advanceWave()` — a bump-only cold path whose frame-callback apply block sits above the `simFrozen` computation, so a board swap lands on the live `World` mid-frame with no `setActive` churn — plus `ticksBanked`, the UI-runtime accumulator that keeps `ticksPlayed` whole across the `world.tick = 0` that D-06 chose.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-25T14:26:00Z (approx)
- **Completed:** 2026-09-25T14:38:00Z
- **Tasks:** 2
- **Files modified:** 2 (0 created, 2 modified)

## Accomplishments

- **The fourth request/apply pair exists and is positioned by argument, not by habit.** `waveRequest` / `waveApplied` are declared with the three existing pairs at `useGameLoop.ts:338-339`; the apply block runs at `:456-471`, after the `accumResetRequest` block and **27 lines above** `const simFrozen` at `:483`. The advance sets `simPhase` to DOCKED before `simFrozen` is evaluated, so `simFrozen` reads false and substepping resumes on the same frame — the frame callback is never stopped or restarted and no `setActive` call is involved in a wave transition at all (SC-5 / N-END-03).
- **"A wave is not a run" is now structural.** The block copies the short `certRequest` shape, not the long `resetRequest` one. It never calls `resetRunStats`, never reassigns `runStatsSv.value` and never bumps `runStatsSeq`. A region gate (`awk` over the block, comments stripped, `grep -c resetRunStats` → `0`) pins that, and a behaviour test proves the consequence.
- **`ticksPlayed` survives the D-06 reset.** `ticksBanked` is a `useSharedValue` incremented by the outgoing wave's `w.tick` *immediately before* `applyWaveAdvance` — atomically with the reset, on the runtime that owns both — and added back at the publish call (`:503-504`). A two-wave bot run publishes **35 410** ticks, not the last wave's 31 515.
- **The bank is per-run state, so a retry still starts from zero.** `ticksBanked.value = 0;` sits inside the `resetRequest` block at `:427`, next to `resetRunStats`, with the comment extended to say why.
- **The whole contract is executable.** Three new tests drive two generated boards inside one run, reproducing the frame loop's substep tail verbatim (`reduceRunTelemetry` → `publishRunStatsMirror(mirror, stats, bank + w.tick)`) and the wave block's two ordered lines. Suite total went 520 → **523 tests, 91 files, 0 failed**.

## Task Commits

1. **Task 1: `waveRequest`/`waveApplied`, the apply block, `advanceWave`, and the tick bank** — `5f8c841` (`feat(11-03)`)
2. **Task 2: cross-wave counter fold and tick-bank monotonicity** — `ec6dc92` (`test(11-03)`)

## TDD Gate Compliance

The plan's frontmatter is `type: execute`, not `type: tdd`, so the plan-level RED/GREEN/REFACTOR gate sequence does not apply. Per-task:

| Task | `tdd` | Behaviour-adding? | Gate |
|---|---|---|---|
| 1 | absent | No (`tdd="true"` is false) | Not applicable — committed as `feat(11-03)` |
| 2 | `true` | No — `<files>` is `tests/runtime.wave-advance.test.ts` only, i.e. no non-test source file | Not applicable — committed as `test(11-03)` |

This matches the precedent 11-01 set for its test-only tasks. A RED commit for Task 2 would also have been theatre: its three tests assert an arithmetic contract over `applyWaveAdvance`, `reduceRunTelemetry` and `publishRunStatsMirror`, all of which already existed from 11-01 and Phase 9, so they were green the moment they were written. The `useGameLoop` block they describe is not reachable from `environment: 'node'` at all (see "Decisions Made").

## Files Created/Modified

- **`src/runtime/useGameLoop.ts`** (+67 lines)
  - `:72` — `applyWaveAdvance` added to the `./worldRequests` import.
  - `:200-208` — `advanceWave: () => void;` on `GameLoopHandle`, with the doc shape every sibling method carries: names N-END-01, states that the next board must already be in `compiled`, and names the caller (the host's `SimPhase.WON` intercept on the RN JS thread — a discrete cold path, never per frame, never from a worklet).
  - `:338-350` — `waveRequest`, `waveApplied`, and `ticksBanked` with a doc comment naming D-06 and explaining that it exists because `world.tick` restarts every wave.
  - `:425-427` — the `resetRequest` block now zeroes `ticksBanked`, comment extended to say the bank is per-run state.
  - `:450-471` — the wave apply block, with the SC-5 ordering comment above it and the N-END-01 / Pitfall 4 comment inside it.
  - `:503-504` — `const ticksPlayed = ticksBanked.value + w.tick;` feeding `publishRunStatsMirror`.
  - `:660-662` — `waveRequest`, `waveApplied`, `ticksBanked` added to the `onFrame` dependency array.
  - `:791-801` — the `advanceWave` `useCallback`, body is the bump wrapped in the `react-hooks/immutability` escape comment, copying `retry` verbatim in shape.
  - `:813` — `advanceWave` in the returned object literal.
- **`tests/runtime.wave-advance.test.ts`** (+229 lines) — a second `describe`, `per-run counters and the tick bank across a wave boundary (11-03)`, with a `driveEndlessRun(waveCount)` helper and three tests. The 11-01 `describe` and its source-order contract are untouched.

## Measurements

Written by the test with `node:fs` to **`os.tmpdir()/gsd-11-03-tick-bank.json`** — outside the repo, so `git status --porcelain` stays clean. Seeds: `nextWaveBoard` run seed `0x5eed`, paddle offset 6, world seeds the `applyRetryWorldReset` defaults.

| Wave | Board breakables (next board) | Bot ticks | `world.tick` at clear | `world.tick` after advance | Published `bricksBroken` | Published `ticksPlayed` |
|---|---|---|---|---|---|---|
| 1 | 34 | 3 895 (32.5 s) | 3 895 | **0** | 32 | 3 895 |
| 2 | 36 | 31 515 (262.6 s) | 31 515 | **0** | **66** | **35 410** |

**Bank after two waves: 35 410 ticks (295.1 simulated seconds).** The two numbers that matter:

- `bricksBroken` climbs 32 → 66 across a board swap, and 66 exceeds the 34 breakables the wave-2 board contained — a total that is **unreachable** if the counters zero at the boundary.
- `ticksPlayed` is exactly `3 895 + 31 515 = 35 410`, not 31 515. Without the bank, a JS-side reader would see the run shrink at every wave.

These are bot clear times, so they are **floors on human duration, not predictions** (`tests/helpers/balanceBot.ts:8-9`). Wave 2's 262.6 s is a d=1 board that happened to be slow for this bot policy; it sits well inside the 600 s per-board budget the test uses, and the whole drive is deterministic.

## Decisions Made

- **The bank is a `useSharedValue` on the UI runtime, not a ref in the app tier** (decided in the plan, implemented as specified). `runWallClockMsRef` in `PlayingHost` is the right *shape* and the wrong *tier*: wall-clock segments open and close on React state transitions JS already owns, but `world.tick` exists only on the UI runtime and is reset inside a worklet. Banking it in JS would require the final pre-reset `runStatsSeq` `runOnJS` to be delivered before the `chromeSeq` `runOnJS` that triggers the advance — an ordering between two independent `useAnimatedReaction`s that Reanimated does not guarantee. Banking where the reset happens is race-free by construction.
- **`publishRunStatsMirror`'s third argument is a named per-substep local, not an inline expression.** `const ticksPlayed = ticksBanked.value + w.tick;` keeps the call on one line (so the acceptance grep still matches), keeps it under a sane width, and names the quantity. A number local costs nothing on the hot path.
- **Task 2's carry proof asserts "the run total exceeds every brick the wave-2 board contained", not an arithmetic multiple.** The first draft asserted `bricksBroken(w2) >= bricksBroken(w1) * 2`, which passed at 66 ≥ 64 — by a margin of two, and on an assumption (that two generated boards have comparable brick counts) that nothing in the generator guarantees. The shipped form counts the wave-2 board's breakables after the swap (`hp > 0 && hp < 99`, the `balanceBot.bricksRemaining` rule) and asserts the published total exceeds it. That is exactly the "a 25-wave run reports the whole run" claim, and a per-wave counter reset makes it unreachable by construction.
- **Task 2 is a headless test against the pure functions, as the plan specified.** `useGameLoop` cannot run under `environment: 'node'` and mocking Reanimated would prove nothing about the block's arithmetic. What the test pins is the shape the block implements; the driver reproduces the frame loop's substep tail and the block's two ordered lines line-for-line, so a divergence in the hook shows up as a divergence from this driver.
- **Three shared values were added to the `onFrame` dependency array** (`waveRequest`, `waveApplied`, `ticksBanked`), matching how the three existing pairs are listed. Required by `react-hooks/exhaustive-deps`; see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `onFrame` dependency array was incomplete after the new shared values**

- **Found during:** Task 1
- **Issue:** `npm run lint` emitted `react-hooks/exhaustive-deps` — *"React Hook useCallback has missing dependencies: 'ticksBanked', 'waveApplied', and 'waveRequest.value'"*. The plan's acceptance criterion requires lint to print no `warning` lines, so this blocked the task.
- **Fix:** Added `waveRequest`, `waveApplied` and `ticksBanked` to the `onFrame` dependency array, in the same position and order the three existing counter pairs occupy (`useGameLoop.ts:660-662`). SharedValue identities are stable, so this does not re-register the frame callback.
- **Files modified:** `src/runtime/useGameLoop.ts`
- **Verification:** `npm run lint` exits 0 with no `warning` and no `error` lines.
- **Committed in:** `5f8c841`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** None on scope or behaviour — three names added to an existing dependency array the plan did not enumerate.

## Authentication Gates

None.

## Issues Encountered

- **Pre-existing working-tree churn (carried from 11-01/11-02).** `.planning/config.json` is modified and `.planning/milestone.lock` / `.planning/state.json` are untracked; all three are orchestrator-owned and predate this plan. Task 2's `git status --porcelain` criterion is satisfied for everything this plan touched: no source or test file is left uncommitted and no measurement file was written inside the repo.
- **Wave 2's bot clear time (262.6 s) is 44% of the per-board tick budget.** The drive is fully deterministic (fixed generator seeds, `applyRetryWorldReset` default world seeds), so it reproduces exactly — but a future physics or ramp change that slows the bot could push a board past 600 s and turn this into a `TIMEOUT`-shaped failure with the message *"the bot must clear wave N inside the tick budget"*. Worth recognising rather than debugging from scratch. Noted for 11-04, which drives many more boards.

## Known Stubs

None. No `TODO`, `FIXME` or placeholder value was introduced in either file.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema change. T-11-08 / T-11-09 / T-11-10 from the plan's register are all mitigated as written (the counter-pair route, the above-`simFrozen` position pinned by a line-number gate, and the bank incremented before the reset pinned by Task 2).

## Verification

| Check | Result |
|---|---|
| `npm test` (vitest + 4 assert scripts) | exit 0 |
| `npx vitest run` | **91 files / 523 tests passed, 0 failed** (baseline 91 / 520) |
| `npx vitest run tests/runtime.wave-advance.test.ts` | exit 0, **10 passed** (7 from 11-01 + 3 here) |
| `npm run lint` | exit 0, no `warning` and no `error` lines |
| `npm run typecheck` | exit 0 |
| `node scripts/assert-worklet-closures.mjs` | `Worklet closure guard OK (121 files)` |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | empty (phase freeze holds) |
| Ordering gate: `applyWaveAdvance` (460) < `const simFrozen` (483) | pass |
| Ordering gate: `applyCertWorstCaseInject` (70/442) < `applyWaveAdvance` (72/460) | pass |
| Region gate: `resetRunStats` inside the wave block, comments stripped | `0` |
| `grep -c 'advanceWave' src/runtime/useGameLoop.ts` | `3` (handle type, callback, returned literal) |
| `grep -n 'publishRunStatsMirror(runStatsOut.value, stats,'` | third argument is `ticksPlayed` |
| `git status --porcelain` (source/test) | clean — only pre-existing `.planning/` churn remains |

## User Setup Required

None — no external service configuration, no packages installed (T-11-SC holds; this phase installs nothing).

## Next Phase Readiness

**Ready for the rest of phase 11.**

- **11-05** is the direct consumer: its `SimPhase.WON` intercept in `PlayingHost.applyChrome` must write the next compiled board into `compiled` **before** calling `advanceWave()`. The frame callback applies whatever `compiled.value` holds at the moment the request is noticed; a bump ahead of the write re-applies the *current* board.
- **11-04** should not need to touch `useGameLoop` at all — the arithmetic it asserts is pinned here headlessly, and its multi-wave driver can lift `driveEndlessRun` from `tests/runtime.wave-advance.test.ts`.
- Two things later plans must not undo: the wave block stays **above** `const simFrozen` (its position is the SC-5 argument), and the bank increment stays **above** `applyWaveAdvance` inside the block (the advance zeroes `w.tick`).

No blockers.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-25*

## Self-Check: PASSED

Both modified artifacts exist on disk (`src/runtime/useGameLoop.ts`, `tests/runtime.wave-advance.test.ts`) and both task commits (`5f8c841`, `ec6dc92`) are present in `git log --oneline --all`. All Task 1 and Task 2 acceptance criteria were re-run after the final task commit; every one passes (see Verification).
