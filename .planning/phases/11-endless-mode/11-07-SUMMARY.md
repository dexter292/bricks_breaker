---
phase: 11-endless-mode
plan: 07
subsystem: ui
tags: [react-native, endless-mode, run-boundary, telemetry, vitest, testing-library]

# Dependency graph
requires:
  - phase: 11-endless-mode (plans 01-06)
    provides: startEndlessRun, advanceToWave, the endless arm of recordRunEnd, mergeEndlessRecord, the __DEV__ endless entry
  - phase: 09-progress-store
    provides: runEndedRef as the single abandon funnel (T-09-10), RecordRunEndArgs as a discriminated union (D-11)
provides:
  - A mode-aware run boundary — every endless reset re-mints the seed, returns waveRef to 1, clears the advance guard, and records the in-flight run first
  - recordInFlightEndlessRun — the one in-flight endless abandon funnel, shared by onRetry and remountDevSession
  - A terminal wave-build-failure path — the guard is released, the run is recorded abandoned, the frame loop stops
  - waveBuildFailedWave — the wave that could not be built, for 11-08 to render
  - tests/ui/PlayingHost.endless-retry.test.tsx — the first test that drives an endless Retry at all
  - A decided A-01 — the Retry-time wave-build-failure contract copy, previously an open UI-SPEC row
affects: [11-08, 14-endless-production-chrome]

# Actuals (#2632) — estimateTokens scale (chars/4 over the files actually changed),
# not a harness token count. 183,192 chars across the six touched files.
actuals:
  tokens: 45798
  tasks: 4
  commits: 5
  plan_head_before: 1980520884c0e2b0b1243f1bd5a74413422619de

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Run-boundary resets route to one run-start function rather than duplicating a reset — startEndlessRun is the only site that owns seed/wave/mode/guard"
    - "Every run-boundary behaviour is proven by pressing a real control in the rendered host; source contracts pin statement placement and stand in for none of it"
    - "A failure that ends a run releases its in-flight guard BEFORE the cold-path record"

key-files:
  created:
    - tests/ui/PlayingHost.endless-retry.test.tsx
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-host.test.ts
    - tests/ui/PlayingHost.endless.test.ts
    - .planning/phases/11-endless-mode/11-UI-SPEC.md
    - .planning/phases/11-endless-mode/11-07-PLAN.md

key-decisions:
  - "A-01 decided retry-in-place: a Retry that cannot build wave 1 keeps the Results overlay on screen, replaces the body with `Wave 1 could not be built — tap Retry`, and leaves Retry live. `Wave 1` is a literal, never templated."
  - "The mid-run body `Wave {n} could not be built — run saved` is deliberately NOT reused at Retry time — there is no in-flight run to save, so it would state something untrue."
  - "genIssues is removed rather than bypassed: a generated board that fails to compile must never reach LevelErrorOverlay, which has no controls and suppresses showResult."
  - "The SC-1/SC-5 prohibitions on the wave-advance branch were rescoped to the SUCCESS path, not deleted — `a transition costs no gate churn` is a claim about a transition that happened."
  - "waveBuildFailedWave is written here and read in 11-08; the split is recorded as a tracked window rather than papered over."

patterns-established:
  - "Falsify before accepting: every new behaviour assertion was run against the pre-fix host and had to fail for the right reason"
  - "A source contract whose extracted region can come back empty must carry its own non-empty assertion"

requirements-completed: [N-END-01, N-END-02, N-END-03]

coverage:
  - id: D1
    description: "An endless Retry is a NEW run: the seed is re-minted, waveRef returns to 1, the advance guard is cleared, and lives/score/combo reset — the campaign retry() is never called against the wave-N generated board"
    requirement: N-END-01
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#Retry from the endless Results overlay restarts at wave 1, not on the wave-N board (gap 1)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#the Retry re-mints the run seed, so the new wave 1 is a different board (N-END-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "telemetry.endless.bestWave reflects a wave one single run actually reached — a chain of Retries from wave K records wave 1 on the next loss"
    requirement: N-END-02
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#the loss after a Retry records wave 1 — a Retry chain cannot raise bestWave (N-END-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every reset reachable during a live endless run — a DEV tier change, Pause then Retry, Pause then Menu — records the in-flight run as abandoned at the wave reached before the reset, and cannot double-record"
    requirement: N-END-01
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a DEV tier change during a live endless run records it before restarting (gap 1)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#Pause then Retry records the in-flight run, then restarts at wave 1 (UI-SPEC run boundaries)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#Pause then Menu keeps its existing abandon funnel, unchanged (T-09-10)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#Menu after the run already ended records nothing extra — the funnel cannot double-record"
        status: pass
    human_judgment: false
  - id: D4
    description: "The __DEV__ wave readout carries an accessibilityLabel naming the wave, and the visible text is unchanged (11-UI-SPEC E5 populated)"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#the dev-row wave readout carries a screen-reader label naming the wave (11-UI-SPEC)"
        status: pass
    human_judgment: false
  - id: D5
    description: "advanceToWave(n) returning false ends the run: the guard is released, the run is recorded abandoned at wave n-1, and the frame loop is stopped (WR-04 / the SC-1 latched-guard break)"
    requirement: N-END-01
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a wave that cannot be built ENDS the run, records it, and releases the guard (WR-04)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the failed wave build ends the run and releases the guard, inside the endless branch (WR-04 / SC-1)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A generated board that fails to compile never reaches LevelErrorOverlay — levelError derives from the catalog load alone, so the Results controls stay reachable"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a wave that cannot be built ENDS the run, records it, and releases the guard (WR-04)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#a generated-board compile failure is loud and never falls through to run end (Pitfall 6, as superseded)"
        status: pass
    human_judgment: false
  - id: D7
    description: "A Retry that cannot build wave 1 keeps the Results overlay up with Retry live, and a second press recovers into a fresh wave-1 run (A-01 behaviour half)"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a Retry that cannot build wave 1 keeps the overlay up with Retry live, and a second press recovers (A-01, retry-in-place)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The Retry-time wave-build-failure BODY COPY — `Wave 1 could not be built — tap Retry` — actually rendered to the player"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#both startEndlessRun failure returns record the wave-1 build failure and leave the overlay alone (A-01)"
        status: pass
    human_judgment: true
    rationale: "NOT SHIPPED BY THIS PLAN. waveBuildFailedWave is written here and read in 11-08, so no rendering of this string exists yet — the contract above pins only that the value is produced and that the overlay is left alone. The string itself is recorded in 11-UI-SPEC § Endless copy. 11-08 owes the rendering test; do not read the passing contract as evidence the copy reached a screen."

# Metrics
duration: 1h 16m
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 07: Mode-aware endless run boundary Summary

**Every endless run boundary — Results Retry, Pause Retry, Pause Menu, a DEV tier change, and a wave that will not compile — now records the in-flight run and restarts at wave 1 on a fresh seed, so `telemetry.endless.bestWave` can only be raised by a wave one continuous run actually reached.**

## Performance

- **Duration:** ~1h 16m across two executor sessions (a checkpoint split Tasks 1-2 from Tasks 3-4)
- **Started:** 2026-09-26T03:40:00Z
- **Completed:** 2026-09-26T04:56:00Z
- **Tasks:** 4
- **Files modified:** 6 (1 created)

## Accomplishments

- **Gap 1 is closed.** `onRetry` and `remountDevSession` are mode-aware: in endless they record the in-flight run through one funnel and route to `startEndlessRun()`, which is the only site that owns the seed, the wave, the mode and the advance guard. The campaign `retry()` — which refills lives against whatever board is sitting in `compiledSv` — is now unreachable from an endless Retry.
- **The record is worth chasing again.** A loss after a Retry records `wave: 1`, not an inflated number. The phase goal's own words are now true of the number that reaches AsyncStorage.
- **No endless reset silently discards a run.** Five reset paths, five driven test cases, each pressing a real control and asserting on what `recordRunEnd` actually received.
- **A wave that cannot be built is terminal, not a trap.** The advance guard is released (an un-cleared guard swallows every later WON — an SC-1 break), the run is recorded `abandoned` at the last successfully built wave, and the frame loop stops. `LevelErrorOverlay` is out of this path entirely: it has no controls, and `GameScreen` suppresses `showResult` whenever `levelError` is non-null, so the old route left a live sim behind a modal with two dead buttons.
- **A-01 is decided, not assumed.** The owner chose `retry-in-place` and supplied the contract copy. The UI-SPEC row that read `⚠ unresolved — planner must treat as assumption` now reads `✅ covered`.
- **The first test that drives an endless Retry at all.** `11-VERIFICATION.md` recorded that no test drove Retry in endless; `tests/ui/PlayingHost.endless-retry.test.tsx` is 10 cases that do.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): End-to-end — an endless Retry is a NEW run at wave 1** — `7498897` (fix)
2. **Task 2: remountDevSession and the pause controls route through the same funnel; the wave readout gets a screen-reader label** — `388445e` (fix)
3. **Task 3 (checkpoint:decision): Decide the Retry-time wave-build-failure behaviour** — `bc37157` (docs)
4. **Task 4: A failed wave build ends the run and releases the advance guard** — `14f1eea` (fix), plus `9415e13` (test) closing the decision's own coverage gap

**Measured:** `git rev-list --count 1980520..HEAD` = **5** at SUMMARY write. The plan-metadata commit follows this file.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — `recordInFlightEndlessRun` (the one in-flight abandon funnel); `startEndlessRun` relocated above `onRetry` so the dependency array is not a temporal-dead-zone `ReferenceError`; mode branches in `onRetry` and `remountDevSession`; `accessibilityLabel` on the dev wave readout; `genIssues` removed and `levelError` reduced to the catalog load; `waveBuildFailedWave` added and cleared in all five reset paths; the terminal failure branch in `applyChrome`'s endless WON path.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — **new.** The render harness plus result/pause controls, and 10 cases driving every endless run boundary.
- `tests/ui/PlayingHost.endless-host.test.ts` — the Pitfall 6 contract rewritten against `waveBuildFailedWave`; two new contracts (the terminal failure branch, the A-01 implementation); two new source contracts for the `onRetry` / `remountDevSession` routings.
- `tests/ui/PlayingHost.endless.test.ts` — the SC-1/SC-5 prohibitions rescoped to the wave-advance SUCCESS path.
- `.planning/phases/11-endless-mode/11-UI-SPEC.md` — E2 `error` resolved; the Retry-time failure body added to § Endless copy; ledger 20/2 → 21/1.
- `.planning/phases/11-endless-mode/11-07-PLAN.md` — A-01 recorded DECIDED with the rejected options and their reasons.

## Decisions Made

**A-01 — `retry-in-place` (owner, 2026-09-26).** When `startEndlessRun()` cannot build wave 1 from a Retry press, the Results overlay stays on screen, the body becomes `Wave 1 could not be built — tap Retry` (em-dash U+2014), and `Retry` stays live so a second press re-mints a different seed. `Wave 1` is contract copy and must not be templated — a Retry-time failure is always at wave 1.

Rejected, with reasons recorded so the question is not re-opened: `reuse-midrun-copy` would say `run saved` when there is no in-flight run to save — the exact false claim the UI-SPEC flagged the row for; `silent-noop` would leave a dead-looking Retry button, the failure shape the verification report called out for `LevelErrorOverlay`, and would break the E2 `loading` contract.

**Rescoping rather than deleting a contract.** Two existing source contracts asserted that the endless wave-advance branch contains no `setActive(` and no `handleRunEnded(`. Task 4 adds both — on the failure path, where 11-UI-SPEC *requires* them. Asserting their absence over the whole branch would have forbidden the fix rather than protected SC-1/SC-5, so the prohibitions moved to the extracted SUCCESS path, where "a wave transition costs no gate churn" is the claim they actually make. Both kept a non-empty-region assertion so they cannot pass vacuously.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two SC-1/SC-5 source contracts forbade the Task 4 fix**

- **Found during:** Task 4
- **Issue:** `tests/ui/PlayingHost.endless.test.ts` asserted `.not.toMatch(/setActive\s*\(/)` and `.not.toMatch(/handleRunEnded\s*\(/)` over the *whole* endless wave-advance branch. Task 4's contract-mandated failure `else` adds both, so the full suite went red on two pre-existing contracts.
- **Fix:** Added a `waveSuccessPath` extraction (the consequent of `if (advanceToWave(...))`, terminated at its `else`) and retargeted the two prohibitions there, with the reasoning recorded at the extraction site. Added a non-empty assertion to each so a future fall-through design cannot make them vacuous, and kept the `setLevelId` prohibition across the whole branch, where it still holds unconditionally.
- **Files modified:** `tests/ui/PlayingHost.endless.test.ts`
- **Verification:** `npx vitest run` — 96 files / 573 tests, 0 failing.
- **Committed in:** `14f1eea`

**2. [Rule 3 - Blocking] `ValidationIssue` import left unused by the `genIssues` removal**

- **Found during:** Task 4
- **Issue:** Removing `genIssues` left `type ValidationIssue` imported and unused in `PlayingHost.tsx`, which `npm run lint` flags.
- **Fix:** Dropped the import.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm run typecheck` and `npm run lint` both exit 0 with no output.
- **Committed in:** `14f1eea`

**3. [Rule 1 - Bug] The guard-release assertion in the new forced-failure test was vacuous**

- **Found during:** Task 4, while falsifying the new test against the pre-fix host
- **Issue:** The plan's suggested probe — deliver DOCKED, then WON — cannot see a latched guard. `applyChrome` releases `waveAdvanceInFlightRef` on *any* phase that is neither WON nor LOST, so the interleaved DOCKED released it by the ordinary path and the assertion passed with the explicit release deleted. Confirmed empirically: removing `waveAdvanceInFlightRef.current = false` from the failure branch left all 9 tests green.
- **Fix:** Replaced the DOCKED with a bare repeat WON — which is also the realistic shape, since Pitfall 5 is precisely that the WON mirror can arrive twice — and asserted that the branch is re-entered (a further compile is attempted) while no wave swap is ever requested. The re-attempt is deterministic: same seed, same wave, same board, same failure.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`
- **Verification:** Re-falsified — with the explicit release removed the test now fails `expected 2 to be greater than 2`; restored, it passes.
- **Committed in:** `14f1eea`

**4. [Rule 2 - Missing Critical] The Task 3 decision shipped with no test of its own**

- **Found during:** Task 4 close-out, while classifying coverage
- **Issue:** Task 4 step 4 implemented `retry-in-place` in `startEndlessRun`'s two failure returns, and nothing exercised that path. The plan's own verification section requires that no run-boundary behaviour rest on a source-text match alone.
- **Fix:** Added a behaviour case (the overlay stays, Retry stays live, nothing is recorded, and a second press recovers into a fresh wave-1 run) and a source contract pinning that both failure returns report the wave-1 failure and neither clears the Results chrome.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`, `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** Falsified — dropping either write fails the contract with `expected 1 to be 2`.
- **Committed in:** `9415e13`

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing critical)
**Impact on plan:** No scope creep. Two were mechanical consequences of the planned `genIssues` removal; two were honesty repairs to this plan's own new tests, found by falsifying them rather than by trusting a green run.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `waveBuildFailedWave` is written but never read | `app/_components/PlayingHost.tsx` | 209 | Deliberate plan split. The value is produced by this plan's run-ending branch; the reader — the wave-build-failure body copy — is plan 11-08's Task 2. The declaration carries a scoped `eslint-disable-next-line @typescript-eslint/no-unused-vars` with the reason and a delete-me-in-11-08 note, which is the only reason `npm run lint` is silent. Recorded in `.planning/WINDOWS.md`. |

## Issues Encountered

**The plan's own guard-release probe could not see the bug it was written for.** Documented as deviation 3 above. The general lesson is recorded as a pattern: a "the guard was released" assertion has to reach the branch with no intervening phase that releases the guard by the ordinary path, or it measures nothing. Both new behaviour assertions in this plan were run against the pre-fix host and had to fail for the right reason before being accepted.

**Nothing else.** No authentication gates, no package installs, no architectural decisions beyond the one the checkpoint routed to the owner.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run` (whole workspace) | **96 files / 573 tests, 0 failing** (baseline was 95/558 + the 15 cases this plan adds) |
| `npx vitest run tests/ui` | 15 files / 67 tests, 0 failing |
| `npm run typecheck` | exit 0, no output |
| `npm run lint` | exit 0, no output |
| `git diff --name-only 1980520..HEAD -- src/core src/levelgen` | empty — the Phase 10 freeze holds |
| A Retry chain cannot raise `bestWave` | proven by the post-Retry `recordRunEnd` assertion (`wave: 1`) |
| No run-boundary behaviour rests on a source match alone | all five reset rows have a driving case; plus the wave-build failure and the Retry-time failure |

## Scope Fences Honoured

- **No production endless entry point.** Every edit sits inside the existing `__DEV__` guard or in mode-gated host logic. Phase 14 still owns the real entry.
- **SC-5 is not claimed.** No task here measured a frame on hardware. It remains the standing human-verification item in `.planning/STATE.md` § Pending Todos and `docs/ops/ENDLESS-MODE.md` § Limits item 2.
- **`src/core` and `src/levelgen` untouched** across all five commits.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 11-08** (the display half of the mode firewall). It inherits two concrete obligations from this plan:

1. **Read `waveBuildFailedWave`** and render `Wave 1 could not be built — tap Retry` at Retry time and `Wave {n} could not be built — run saved` mid-run, then delete the `eslint-disable` at `PlayingHost.tsx:209` and resolve the window in `.planning/WINDOWS.md`.
2. **Own the rendering test for that copy.** Coverage entry D8 is `human_judgment: true` precisely because no rendering of the string exists yet.

**Caveat on `requirements-completed`.** `N-END-03` is copied verbatim from the plan frontmatter, but only its reproducibility half is discharged here (the per-run seed re-mint). Its frame-timing half is the device-gated SC-5 reading and stays open — see A-05/A-07 and the ops doc.

**Still open from the phase, unchanged by this plan:** A-02 (the other `__DEV__` row controls after endless is entered — the permanent `modeRef` latch, WR-02; owner decision owed), A-03 (same-millisecond seed collision, recorded not fixed), A-04 (stretched glow halos, accepted debt for Phase 14).

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `tests/ui/PlayingHost.endless-retry.test.tsx` — present on disk
- `.planning/phases/11-endless-mode/11-07-SUMMARY.md` — present on disk
- `app/_components/PlayingHost.tsx` — present on disk
- All six commits found in `git log`: `7498897`, `388445e`, `bc37157`, `14f1eea`, `9415e13`, `319fc1e`
