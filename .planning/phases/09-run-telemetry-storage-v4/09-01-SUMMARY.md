---
phase: 09-run-telemetry-storage-v4
plan: 01
subsystem: runtime
tags: [telemetry, event-ring, reanimated, worklet, union-find, vitest, zero-alloc]

# Dependency graph
requires:
  - phase: 09-00
    provides: tests/telemetry.reduce-run-events.test.ts — the 18 it.todo N-STAT-01 acceptance checklist this plan turns green
  - phase: post-mvp/E1b-explosive-bricks
    provides: BrickFlags.EXPLOSIVE + explodeAtCell's 8-neighbour lattice cascade — the adjacency rule largestCascade mirrors
  - phase: post-mvp/E2-balance
    provides: tests/helpers/balanceBot.ts — the headless stepRun harness the integration smoke mirrors
provides:
  - "src/runtime/runStats.ts — RunStats type + allocateRunStats/resetRunStats/cloneRunStats/reduceRunTelemetry"
  - "Read-only event-ring reducer producing every N-STAT-01 counter with zero per-call heap allocation"
  - "largestCascade computed by exact 8-neighbour grid-adjacency union-find, not substep co-occurrence"
  - "GameLoopHandle.runStats — a SharedValue<RunStats | null> the app layer reads at the run boundary with no new UI→JS hop"
  - "tests/telemetry.reduce-run-events.test.ts — 19 passing tests, zero it.todo remaining"
affects: [09-04 PlayingHost run-boundary wiring, 13-achievements largestCascade trigger, 14-stats-screen]

actuals:
  tokens: 7100
  tasks: 3
  commits: 3
plan_head_before: cfed57a9af34eab91a4d081ea501d63e4faab667

tech-stack:
  added: []
  patterns:
    - "Read-only ring reducer in src/runtime/ (peer of eventBridge.ts / publishChromeMirror.ts) — core and hashWorld untouched, LC-04 boundary respected"
    - "Module-level preallocated typed-array scratch referenced from inside a 'worklet' (the _sweepScratch idiom) for zero-allocation grouping on the 120Hz path"
    - "Union-find over lattice cells as the cascade-attribution primitive — reconstructs chain membership from an untagged event ring without a core change"
    - "Minimal fake-World unit fixture (only the fields the reducer reads, cast through `as unknown as World`) — exact, RNG-free assertions alongside a real-level headless smoke"

key-files:
  created:
    - src/runtime/runStats.ts
  modified:
    - src/runtime/useGameLoop.ts
    - tests/telemetry.reduce-run-events.test.ts
    - tests/ui/PlayingHost.next-bake.test.ts

key-decisions:
  - "largestCascade groups BRICK_BREAK events by 8-neighbour lattice adjacency (union-find over (col,row), Chebyshev distance <= 1) rather than substep co-occurrence: it feeds a Phase 13 achievement trigger, where overcounting fires an unearned unlock — the harmful direction. Substep co-occurrence overcounts during ordinary multiball play (up to 8 balls resolve per substep), not just in rare edge cases."
  - "Cascade cells are derived from brick POSITION (world.brickX/brickY via evB) rather than the event's evX/evY hit point that 09-RESEARCH.md suggested. brickX/brickY survive a break (only brickHp and cellToBrick are cleared), are already being read for the EXPLOSIVE flag check, and are exact where the hit point is an approximation — same cost, strictly better attribution."
  - "The non-lattice fallback (latticePitchX/Y <= 0, dense/legacy fixtures only) makes each unresolvable break its own singleton group. It can undercount, never merge unrelated breaks — the failure mode is biased away from the achievement-trigger risk."
  - "bestCombo is read from world.combo before the evCount early-return, so a substep that emits no events still records the peak (Pitfall 2). longestRally is accumulated separately from PADDLE_HIT/LIFE_LOST and never derived from combo (D-10)."
  - "cloneRunStats is deliberately NOT a worklet — it is only ever called from the JS-thread run boundary, where one allocation is free; keeping it off the worklet path avoids implying it is hot-path safe."
  - "Retry zeroes the RunStats object in place via resetRunStats rather than reassigning runStatsSv.value, because onFrame's local `stats` binding already captured the reference before the reset branch runs (D-01: every retry is a new run)."

patterns-established:
  - "Pattern: per-substep read-only telemetry drain — slot a reducer 4th in the useGameLoop substep chain (after consumeEventsForVfx / appendEventsForAudio / updateFlashFromEvents) while the ring is still live, before the next stepRun clears it"
  - "Pattern: expose accumulated UI-thread state to the app layer as a SharedValue on GameLoopHandle and read it synchronously at a discrete boundary — never add a per-frame scheduleOnRN hop (LC-07)"

requirements-completed: [N-STAT-01]

coverage:
  - id: D1
    description: "reduceRunTelemetry derives bricksBroken and bestCombo from the event ring / world.combo, cumulative across substeps and never re-derived from event sequencing"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#bestCombo tracks a running max of world.combo, never re-derived from events"
        status: pass
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#bricksBroken counts one per BRICK_BREAK event, cumulative across calls"
        status: pass
    human_judgment: false
  - id: D2
    description: "POWERUP_CATCH routes evA to exactly one of the five per-pickup-type counters (D-07)"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#POWERUP_CATCH with evA=PickupType.MULTIBALL increments pickupMultiball only"
        status: pass
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#POWERUP_CATCH with evA=PickupType.FIREBALL increments pickupFireball only"
        status: pass
    human_judgment: false
  - id: D3
    description: "livesLost counts LIFE_LOST events (never a livesRemaining diff), and longestRally is a survival streak kept distinct from bestCombo (D-10, Pitfall 3)"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#livesLost counts LIFE_LOST events, not (3 - livesRemaining) endpoint diff"
        status: pass
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#longestRally is the running max of rallyCurrent, distinct from bestCombo (D-10 — must not collapse the two)"
        status: pass
    human_judgment: false
  - id: D4
    description: "largestCascade groups breaks by 8-neighbour lattice adjacency; non-adjacent breaks in one substep do NOT merge, non-explosive groups never count, and the non-lattice fallback undercounts rather than merging (D-08)"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#two non-adjacent BRICK_BREAK events in the same substep land in separate groups and must NOT merge into one cascade (the overcount plan-check rejected — largestCascade is a Phase 13 achievement trigger, so overcounting is the harmful direction)"
        status: pass
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#largestCascade only updates from a group containing at least one EXPLOSIVE-flagged brick, and takes that whole group size"
        status: pass
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#a break with no resolvable lattice cell (pitchX/pitchY <= 0, dense/legacy fixture only) forms its own singleton group — it can undercount but can never merge into an unrelated group"
        status: pass
    human_judgment: false
  - id: D5
    description: "The reducer is strictly read-only — it writes no world.* field and never clears the event ring"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/telemetry.reduce-run-events.test.ts#never writes to any world.* field (read-only contract, same as consumeEventsForVfx)"
        status: pass
      - kind: other
        ref: "git diff --stat -- src/core (empty)"
        status: pass
    human_judgment: false
  - id: D6
    description: "useGameLoop allocates runStatsSv lazily, drains it once per substep, zeroes it in place on retry, and exposes it as GameLoopHandle.runStats without adding a JS-thread hop"
    requirement: N-STAT-01
    verification:
      - kind: integration
        ref: "tests/telemetry.reduce-run-events.test.ts#driving a real level fixture through stepRun + reduceRunTelemetry produces bricksBroken <= level brickCount and non-negative counters"
        status: pass
      - kind: other
        ref: "grep -c 'runOnJS|scheduleOnRN' src/runtime/useGameLoop.ts == 4 (unchanged from baseline)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.next-bake.test.ts + tests/ui/PlayingHost.bake-gate.test.ts (6 passed)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Counters accumulate correctly against a real device run (on-device feel: retry genuinely restarting counters, cascade numbers matching what a player sees explode)"
    verification: []
    human_judgment: true
    rationale: "The reducer is proven deterministically against fixtures and a headless level run, but the SharedValue accumulation on the Reanimated UI thread and the retry reset only exist on a real frame loop — no test in this plan mounts the actual game loop on a device. Plan 04 wires the run boundary; device confirmation belongs to that plan's verification."

# Metrics
duration: 8 min
completed: 2026-09-25
status: complete
---

# Phase 9 Plan 01: Run Telemetry Reducer Summary

**Zero-allocation read-only event-ring reducer producing every N-STAT-01 counter, with `largestCascade` resolved by 8-neighbour lattice union-find instead of substep co-occurrence, drained once per substep from `useGameLoop` with no new UI→JS hop.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-25T07:19:06Z
- **Completed:** 2026-09-25T07:27:19Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `src/runtime/runStats.ts` derives `bricksBroken`, the five per-pickup-type counts, `livesLost`, `rallyCurrent`/`longestRally` and `largestCascade` from the live event ring, plus `bestCombo` straight off `world.combo` — with no writes to any `world.*` field and no `clearEvents` call.
- `largestCascade` uses exact grid-adjacency grouping: a union-find over broken bricks' `(col, row)` lattice cells with Chebyshev distance ≤ 1, the same adjacency rule `explodeAtCell` itself applies. Two unrelated breaks landing in one substep stay in separate groups.
- Zero per-call heap allocation: seven module-level typed-array scratch buffers sized to `EVENT_RING_CAPACITY` (128), mutated in place from inside the worklet — the `_sweepScratch` idiom.
- `useGameLoop` allocates `runStatsSv` lazily on the first frame, calls `reduceRunTelemetry(w, stats)` fourth in the substep drain while the ring is still live, zeroes counters in place on retry (D-01), and returns `runStats` on `GameLoopHandle`. The `runOnJS`/`scheduleOnRN` count is byte-for-byte unchanged from baseline.
- All 18 Wave-0 `it.todo` stubs replaced by 19 real tests, including the non-adjacent non-merge regression case that motivated the grid-adjacency revision.

## Task Commits

1. **Task 1: runStats.ts — RunStats contract + grid-adjacency cascade reducer** — `5529ae5` (feat)
2. **Task 2: Wire runStatsSv into useGameLoop.ts** — `2455ded` (feat)
3. **Task 3: Fill tests/telemetry.reduce-run-events.test.ts to GREEN** — `24cabf7` (test)

## Files Created/Modified

- `src/runtime/runStats.ts` *(created, 287 lines)* — `RunStats` type plus `allocateRunStats` / `resetRunStats` / `cloneRunStats` / `reduceRunTelemetry`; module-level cascade scratch; all worklet-marked except `cloneRunStats`.
- `src/runtime/useGameLoop.ts` — lazy `runStatsSv` allocation, per-substep `reduceRunTelemetry` call, in-place reset on retry, `runStats` on `GameLoopHandle` and in the returned object, `runStatsSv` added to the `onFrame` dependency array.
- `tests/telemetry.reduce-run-events.test.ts` — 19 passing tests over a minimal fake `World` plus a headless `level-01` smoke; zero `it.todo` remaining.
- `tests/ui/PlayingHost.next-bake.test.ts` — defensive `runStats: { value: null }` / `world: { value: null }` added to the hand-written `useGameLoop` mock.

## Decisions Made

- **Grid-adjacency over the substep heuristic** (locked in the plan, confirmed in implementation). `largestCascade` feeds a Phase 13 achievement trigger, so overcounting is the harmful direction; the cheap heuristic overcounts during ordinary multiball play. Cost is negligible — `breakCount` is 0 or 1 in the overwhelming common case and bounded at 128.
- **Brick position, not hit point, for lattice cells.** `world.brickX/brickY` survive a break and are already read for the `EXPLOSIVE` flag check, so they are exact at zero extra cost where `evX`/`evY` are approximate. This is a deliberate improvement on 09-RESEARCH.md's suggestion.
- **Singleton fallback for unresolvable cells.** A break with `latticePitchX/Y <= 0` or an out-of-grid cell unions with nothing, so it forms a group of 1 — undercounting rather than merging unrelated breaks.
- **`cloneRunStats` intentionally not a worklet** — JS-boundary-only, so one allocation is free and the absence of the directive documents that it is not hot-path safe.
- **In-place retry reset.** `resetRunStats(s)` mutates the object `onFrame`'s local `stats` binding already captured; reassigning `runStatsSv.value` would leave that binding pointing at a stale object for the rest of the frame.

## Deviations from Plan

None — plan executed exactly as written.

One cosmetic wording adjustment was made inside Task 2 to satisfy the plan's own acceptance criterion: the new `GameLoopHandle.runStats` doc comment originally read "no extra scheduleOnRN hop (LC-07)", which pushed the `grep -c "runOnJS\|scheduleOnRN"` count from the baseline 4 to 5 even though no call was added. The comment now reads "no extra UI→JS hop (LC-07)" and the count matches baseline exactly. This is a comment-only change, not a behavioural deviation.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. No scope creep.

## Issues Encountered

- **Stale worktree base.** The worktree was forked 79 commits behind the orchestrator's `main` (`cfed57a`), predating the C1/C2/D1/D2/E1b/E2 work the 403-test baseline assumes. The branch had zero local commits and a clean tree, so it was corrected with a non-destructive `git merge --ff-only cfed57a` before any edit. No reset, clean, or stash was used.
- **Two `@typescript-eslint/array-type` warnings** in the new test file (`ReadonlyArray<T>` instead of `readonly T[]`). ESLint still exited 0, but the phase baseline is warning-free, so both were rewritten to the preferred form before the Task 3 commit.

## Verification Results

| Gate | Result |
|---|---|
| `npx vitest run tests/telemetry.reduce-run-events.test.ts` | 19 passed, 0 todo |
| `npm test` (full suite) | exit 0 — 80 files passed, 1 skipped; **422 passed**, 14 todo |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, zero warnings |
| `node scripts/assert-worklet-closures.mjs` | OK (110 files) |
| `git diff --stat -- src/core` | empty — core untouched |
| `grep -c "runOnJS\|scheduleOnRN" src/runtime/useGameLoop.ts` | 4 — unchanged from baseline |

Baseline was 79 files / 403 tests passing with 32 `it.todo`. This plan converted 18 of those todos into 19 passing tests (403 + 19 = 422; 32 − 18 = 14 todo remaining, all owned by Plan 09-02's `tests/storage.progress-v4.test.ts`).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `GameLoopHandle.runStats` is live and populated; **Plan 09-04** can read a run-boundary snapshot via `cloneRunStats(handle.runStats.value)` with no new JS-thread hop. `world.tick` remains the authoritative "ticks played" source (Pitfall 2) — deliberately not a `RunStats` field.
- The `RunStats` field names are the shape Plan 09-02's v4 `ProgressBlob` telemetry sub-object should mirror; the two plans ran in parallel on disjoint files, so a field-name reconciliation is worth a glance when 09-03/09-04 join them.
- `REQUIREMENTS.md` was deliberately left untouched to avoid a merge conflict with the sibling worktree; N-STAT-01 is complete and can be marked by the orchestrator during the post-wave sync.
- No blockers.

## Self-Check: PASSED

- `src/runtime/runStats.ts` — FOUND on disk
- `src/runtime/useGameLoop.ts` — FOUND on disk
- `tests/telemetry.reduce-run-events.test.ts` — FOUND on disk
- `.planning/phases/09-run-telemetry-storage-v4/09-01-SUMMARY.md` — FOUND on disk
- Commits `5529ae5`, `2455ded`, `24cabf7` — all present in `git log`
- Working tree clean after the final commit; no unexpected file deletions in any commit

---
*Phase: 09-run-telemetry-storage-v4*
*Completed: 2026-09-25*
