---
phase: 11-endless-mode
plan: 09
subsystem: ui
tags: [react, react-native, endless-mode, results-overlay, vitest, testing-library]

# Dependency graph
requires:
  - phase: 11-endless-mode
    provides: "11-07's waveBuildFailedWave writer, the A-01 retry-in-place owner decision, and the two startEndlessRun failure returns it introduced"
  - phase: 11-endless-mode
    provides: "11-08's endless Results reader — the mode-branched handleRunEnded, the endless watermark refs, and the real-ResultOverlay harness in tests/ui/PlayingHost.endless-record.test.tsx"
provides:
  - "failEndlessStart(): a single helper both startEndlessRun failure returns route through, which flips the mode, republishes the ENDLESS watermarks, latches runEndedRef and raises the real Results overlay — so the owner-decided A-01 copy is reachable from EVERY entry path, including the fresh campaign mount that previously produced the rejected silent-noop"
  - "An atomic endless start: the run seed is snapshotted and restored on the failure path, and startEndlessRun writes no wave number at all — advanceToWave owns waveRef and pairs it with setWave"
  - "waveBuildFailureKind(failedWave): the Retry-time / mid-run boundary as ONE named, boundary-tested exported function, read by both the body copy and the run-scoped line suppression"
  - "Producer-side boundary contracts: the advanceToWave argument, the setWaveBuildFailedWave argument and applyChrome's waveRef.current + 1 are pinned TOGETHER, so a resume-at-wave-N change goes red at the writer"
  - "A __DEV__ wave-floor tripwire at the mid-run writer (honest in its own comment that no test in this repo can drive it red)"
affects: [11-10, 11-11, 14-title-routes, 13-achievements]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4), measured over the five files actually changed
# at their post-change size. The plan estimated 94000 over SIX files_modified —
# tests/ui/PlayingHost.endless-retry.test.tsx was listed but needed no edit (its
# harness was already sufficient; Task 1 added the pause-panel controls to the
# endless-record mock instead). Recorded unrounded; a flattering number corrupts
# every later projection.
actuals:
  tokens: 38663
  tasks: 3
  commits: 3
plan_head_before: 137c4b9a2c2941f65a8e0c5ad72bf274a68bbff9

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One named, boundary-tested discriminant function read by every consumer, instead of the same numeric comparison re-derived at each reader"
    - "Assert an invariant at BOTH ends — the reader by unit cases, every producer by a source contract that a plausible future edit cannot satisfy"
    - "Falsification by deletion: delete the fix, confirm the new cases go red for the right reason, restore"

key-files:
  created: []
  modified:
    - "app/_components/PlayingHost.tsx"
    - "src/runtime/overlays/ResultOverlay.tsx"
    - "tests/ui/PlayingHost.endless-record.test.tsx"
    - "tests/ui/PlayingHost.endless-host.test.ts"
    - "tests/ui/ResultOverlay.test.tsx"

key-decisions:
  - "One failure shape, not two: a readiness-gate failure now latches modeRef to endless for a run that never started (A-02, disclosed and accepted, exit route in 11-10). A second mode-preserving failure path was deliberately NOT added — two failure shapes is how the A-01 copy became unreachable from two thirds of its call sites in the first place"
  - "waveBuildFailedWave stays number | null on the props; the boundary is fenced by the exported waveBuildFailureKind rather than by reshaping the prop into a discriminated object, which would cascade through GameScreen, PlayingHost and three harnesses for an Info-severity finding"
  - "At Retry time the run-scoped Wave · and Score · lines are SUPPRESSED, while Best · and Best wave · still render — the two Best lines are telemetry watermarks, not values belonging to a run, so they are exactly the lines that stay meaningful when no run exists"
  - "The seed restore and the deleted waveRef assignment are asserted as SOURCE contracts and the test file says so, because they are not behaviourally observable today — nothing reads runSeedRef or waveRef again before the next startEndlessRun re-mints them. They exist so a Phase-14 resume-in-place cannot inherit a re-minted seed or a rewound wave"
  - "The __DEV__ wave-floor tripwire is documented as a runtime tripwire aimed at a future writer, NOT coverage, and explicitly does NOT resolve the flagged N-END-01 boundary assumption — no source artifact states the contract it guesses at"

patterns-established:
  - "Pattern 1: a source contract must state in its own JSDoc what it does NOT prove. Both corrected contracts now say they pin statement placement and prove nothing about whether copy reaches a screen — the mechanism that let gap 3 ship green"
  - "Pattern 2: extract a source region, assert it non-empty FIRST, then assert its contents — an un-extracted region makes every pin below it vacuously green"
  - "Pattern 3: correct a defect-pinning test in place, never delete it; the per-file case count is the gate"

requirements-completed: []

coverage:
  - id: D1
    description: "A start that cannot build wave 1 puts `Wave 1 could not be built — tap Retry` on the REAL Results overlay from a fresh campaign mount — the entry path that previously did nothing and said nothing"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#renders the owner-decided tap-Retry copy on the REAL overlay (A-01, gap 3)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#satisfies BOTH overlay gates — mode is endless and result is lose (the two the verifier measured unsatisfied)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The remedy the copy points at is LIVE, not decorative — a Retry control is present and a press re-attempts the build"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#leaves a LIVE Retry control on screen, not a decorative one (A-01 retry-in-place)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The overlay raised by a failed start reads the ENDLESS watermarks — a campaign level best never appears as the endless Best"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#shows the ENDLESS watermarks, never the campaign level best the mount effect loaded"
        status: pass
    human_judgment: false
  - id: D4
    description: "A start that never began writes no run — recordRunEnd receives zero calls (T-11-02)"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#writes NO run — a start that never began must not reach telemetry (T-11-02)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Pause → Retry at wave 2 with a failing build records the in-flight run at the wave it REACHED, exactly once (measured pre-fix: 0 calls)"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#records the in-flight run at the wave it REACHED, exactly once (measured pre-fix: 0 calls)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The post-condition is ONE coherent state — run over, overlay up, pause panel gone, Retry the only live control (measured pre-fix: result null, uiPhase paused, nothing on screen)"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#leaves ONE coherent state: the run is over, the overlay is up, Retry is the only live control"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#the run that FOLLOWS a failed start is a real, recordable run (pre-fix: runEndedRef latched with no way to clear it)"
        status: pass
    human_judgment: false
  - id: D7
    description: "A failed start leaves NOTHING of the run identity changed — the seed is restored before the run ends and startEndlessRun writes no wave number"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#both startEndlessRun failure returns route through failEndlessStart, which raises the surface (A-01)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The Retry-time / mid-run distinction is one named, boundary-tested function — 'none' at null, 'mid' at 2, 'start' at 1, 0 and -1"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/ResultOverlay.test.tsx#waveBuildFailureKind (11-09, IN-01) — all five boundary cases"
        status: pass
    human_judgment: false
  - id: D9
    description: "A Retry-time failure renders no `Wave ·` and no `Score ·` line while both Best lines remain; a mid-run failure keeps all four; campaign is unaffected by any waveBuildFailedWave value"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/ResultOverlay.test.tsx#a Retry-time wave-build failure says tap Retry, never run saved (A-01, retry-in-place)"
        status: pass
      - kind: unit
        ref: "tests/ui/ResultOverlay.test.tsx#a mid-run wave-build failure replaces the body and keeps all four metric lines"
        status: pass
      - kind: unit
        ref: "tests/ui/ResultOverlay.test.tsx#the campaign overlay is unaffected by any waveBuildFailedWave value — the suppression is endless-only"
        status: pass
    human_judgment: false
  - id: D10
    description: "The boundary is asserted at both PRODUCERS, so a resume-at-wave-N change goes red at the writer instead of silently inverting the body copy the reader selects"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the two wave-build-failure writers still agree with the reader (IN-01)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the mid-run writer carries a __DEV__ wave-floor tripwire (IN-01)"
        status: pass
    human_judgment: false
  - id: D11
    description: "Backstop (NOT discharged): a UI-state test at a 7-digit score and a 4-digit wave shows no wrap and no clipping in the shipped 320px panel"
    verification: []
    human_judgment: true
    rationale: "jsdom computes no layout, so `no wrap and no clipping` cannot be OBSERVED here. The ≈28-monospace-character fit 11-UI-SPEC derives is the document's own computation, not a rendering; asserting the character budget would convert a backstop into a false `covered`. Carried forward to human verification, unchanged."

# Metrics
duration: 10 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 09: Atomic + Visible Endless-Start Failure Summary

**A failed endless start now ENDS the run and says so on the real Results overlay from every entry path — `failEndlessStart()` flips the mode and raises the surface, the seed is snapshotted and restored, `waveRef` is written only by `advanceToWave`, and the Retry-time/mid-run boundary is one named `waveBuildFailureKind` asserted at both producers and the reader.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-26T07:17:06Z
- **Completed:** 2026-09-26T07:27:30Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- **Gap 3 closed with rendered evidence.** The owner-decided A-01 copy was implemented, documented and unit-tested in the previous round, yet unreachable from two of three `startEndlessRun` call sites: the failure returns wrote the copy while `modeRef`/`mode` were still `'campaign'` and `result` was still `null`, so `ResultOverlay` nulled the prop and `GameScreen` never mounted the overlay. `failEndlessStart()` flips the mode, republishes the endless watermarks over the campaign level best the mount-time `getBestForLevel` effect loaded, latches `runEndedRef` and sets `result` — and five behaviour cases drive the REAL host, the REAL `GameScreen` prop contract and the REAL overlay from a fresh campaign mount, asserting on rendered text inside the `result-slot` subtree.
- **Gap 2 closed at the same seam.** Pause → Retry at wave 2 with a forced compile failure now records `{ mode: 'endless', wave: 2, outcome: 'abandoned' }` exactly once (the verifier measured **0**), leaves `result === 'lose'` with the pause panel gone (measured pre-fix: `result = null`, `uiPhase = 'paused'`, nothing on screen), and the run that FOLLOWS is a real, recordable run.
- **The build attempt is atomic.** `const prevSeed` is snapshotted before the mint and restored as the first statement of the failure branch; `waveRef.current = 1` is deleted from `startEndlessRun` entirely, because `advanceToWave` already assigns it on success paired with `setWave` — the second, unpaired assignment above a failure return is what let the ref and the HUD diverge and turned a run at wave 30 into a run at wave 2.
- **IN-01 fenced at three points, not one.** `waveBuildFailureKind` is exported, boundary-tested at `null`/`2`/`1`/`0`/`-1`, and read by BOTH the body copy and the run-scoped line suppression. The two writers are pinned together — `advanceToWave(1)` in `startEndlessRun`, `setWaveBuildFailedWave(1)` in `failEndlessStart`, `waveRef.current + 1` in `applyChrome` — so a resume-at-wave-N change cannot satisfy all three.
- **IN-05 corrected.** At Retry time there is no in-flight run, so `Wave ·` and `Score ·` are suppressed instead of showing the previous run's numbers under failure copy with nothing marking them stale. `Best ·` and `Best wave ·` stay — they are watermarks, not run values.
- **All three mandatory falsification checks were RUN, not asserted.** Each is recorded with its observed result below.

## Task Commits

1. **Task 1 (tracer): End-to-end — a failed endless start reaches the screen from a fresh mount** — `d71b57c` (feat)
2. **Task 2: The failed start is atomic — nothing of the run identity survives it** — `dab30ad` (fix)
3. **Task 3: Name the Retry-time boundary, assert it at both writers, stop describing a run that does not exist** — `343a900` (refactor)

**Tracer feedback gate:** Task 1's `<verify>` chain was re-run end-to-end after its commit and passed (`tests/ui/PlayingHost.endless-record.test.tsx` 14/14, `typecheck` 0, `lint` 0) before any expansion task began. `human_verify_mode` is `end-of-phase` and the tracer carries only `<automated>` verification, so no checkpoint was synthesized.

## Falsification Checks (all three run)

| Task | Probe | Observed result |
|---|---|---|
| 1 | Delete the single line `setResult('lose');` from `failEndlessStart` | **4 of the 5 new cases FAILED** (copy absent, Retry control absent, `result` not `'lose'`, watermark lines absent). The fifth (`recordRunEnd` = 0) legitimately still passed — it is not gated on the overlay. Line restored, suite green. |
| 2 | Remove `runSeedRef.current = prevSeed;` | **The source-contract case FAILED and all 17 behaviour cases still PASSED** — exactly the expected asymmetry, and the honest evidence that the restore is a structural guarantee for Phase 14 rather than a behaviour this round can observe. Line restored. |
| 3 | Change `startEndlessRun`'s `advanceToWave(1)` to `advanceToWave(2)` (the resume-at-wave-N change in miniature) | **Test 5 `the two wave-build-failure writers still agree with the reader (IN-01)` FAILED**, along with 7 behaviour cases. The producing end of the invariant is genuinely asserted. Argument restored. |

## Defect-Pinning Tests Corrected (never deleted)

Two existing tests pinned defects as expected and went red under this plan's changes. Both were **rewritten in place** to preserve the property they actually make, and the per-file case count rose in both:

| Test | File | Was | Now |
|---|---|---|---|
| `both startEndlessRun failure returns …(A-01)` | `tests/ui/PlayingHost.endless-host.test.ts` | Required `setWaveBuildFailedWave(1)` twice in the preamble and required the preamble NOT to call `setResult` — i.e. it pinned the unreachable state gap 3 measured | Pins the shipping contract: two `failEndlessStart()` routes, no failure write in `startEndlessRun`, the success-path clear present, no `waveRef.current = 1`, the seed snapshot/restore ordered before the fail, and the helper's mode-before-result ordering plus the `runEndedRef` latch |
| `a Retry-time wave-build failure says tap Retry…` | `tests/ui/ResultOverlay.test.tsx` | Asserted `Wave · 7` — the PREVIOUS run's wave — as EXPECTED beside `waveBuildFailedWave: 1` (IN-05) | Asserts `Wave · 7` and `Score · 2400` are both ABSENT and `Best · 5000` / `Best wave · 12` present, with the reason stated inline |

Both corrected cases now also state in their JSDoc **what they do not prove** — that they pin statement placement and prove nothing about whether any copy reaches a screen. That omission is precisely the mechanism the verifier identified as letting gap 3 ship green.

**Case counts (baseline → now, none decreased):** `ResultOverlay.test.tsx` 14 → 20 · `PlayingHost.endless-host.test.ts` 14 → 16 · `PlayingHost.endless-record.test.tsx` 9 → 17.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — added `failEndlessStart()` above `startEndlessRun` (TDZ-safe); routed both failure returns through it; snapshot/restore of `runSeedRef`; deleted `waveRef.current = 1`; added the `ENDLESS_WAVE_FLOOR` constant and the `__DEV__` floor tripwire at the mid-run `setWaveBuildFailedWave` writer
- `src/runtime/overlays/ResultOverlay.tsx` — exported `waveBuildFailureKind`; body copy and run-scoped metric lines both derive from its return value; the value-discriminant explanation moved out of the prop JSDoc into the function's own, with the missing "this rests on restart-at-wave-1" sentence added
- `tests/ui/PlayingHost.endless-record.test.tsx` — pause-panel controls in the `GameScreen` mock, a `mountOnly()` helper, and two new `describe` blocks (5 fresh-mount cases, 3 Pause→Retry cases)
- `tests/ui/PlayingHost.endless-host.test.ts` — the A-01 contract corrected in place; new producer-side `describe` for Tests 5 and 6, each region asserted non-empty before anything is asserted about its contents
- `tests/ui/ResultOverlay.test.tsx` — a `waveBuildFailureKind` boundary `describe` (5 cases), the IN-05 case corrected in place, and a campaign non-leak case

## Decisions Made

See `key-decisions` in the frontmatter — five, all carried into STATE.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 2's source contract (b) was scoped to the failure preamble rather than the whole `startEndlessRun` body**

- **Found during:** Task 2
- **Issue:** The plan's contract (b) reads "`startEndlessRun`'s body contains no `setWaveBuildFailedWave` call". Taken literally over the whole body, satisfying it would have required deleting `setWaveBuildFailedWave(null)` from the COMMITTED path. That clear is load-bearing: without it, a successful Retry after any wave-build failure starts a real run whose eventual loss still renders `Wave 1 could not be built — tap Retry` instead of `Out of lives`, because the stale value survives into the new run. The same applies after a mid-run failure. Deleting it would have introduced a user-visible copy defect in order to satisfy a contract whose evident intent is "the helper owns the FAILURE write".
- **Fix:** The contract is expressed more precisely and more strongly than the literal wording: the body contains `setWaveBuildFailedWave(` exactly ONCE, that one call is `setWaveBuildFailedWave(null)`, it appears AFTER the commit anchor, and the preamble contains none. This pins both halves — no duplicated failure write, and the success path must clear.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** Suite green; Task 2's falsification probe confirmed the case is not vacuous. Task 1's acceptance criterion (which is already scoped to "both early returns") is satisfied verbatim.
- **Committed in:** `dab30ad`

**2. [Rule 3 - Blocking] `ENDLESS_WAVE_FLOOR` introduced as a named module constant**

- **Found during:** Task 3
- **Issue:** The plan says the tripwire fires "when `waveRef.current` is below the wave floor" but names no floor symbol; a bare `< 1` would have left the tripwire unable to say what it is checking, and would have reintroduced exactly the unfenced numeric literal IN-01 is about.
- **Fix:** Added `const ENDLESS_WAVE_FLOOR = 1;` at module scope with a JSDoc stating explicitly that it is NOT a resolved boundary contract and that the N-END-01 boundary probe row stays flagged. Test 6 pins the constant's existence.
- **Files modified:** `app/_components/PlayingHost.tsx`, `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** `typecheck` 0, `lint` 0, suite green.
- **Committed in:** `343a900`

**3. [Rule 3 - Blocking] The `__DEV__` tripwire is nested rather than a single compound condition**

- **Found during:** Task 3
- **Issue:** Written as one `if (typeof __DEV__ !== 'undefined' && __DEV__ && waveRef.current < ENDLESS_WAVE_FLOOR)`, prettier wraps it across three lines and the repo's `typeof __DEV__ !== 'undefined' && __DEV__` idiom no longer appears contiguously — Test 6's idiom assertion failed against it.
- **Fix:** Nested the floor check inside the guard, so the guard idiom is byte-identical to every other `__DEV__` site in the file (the same form `tests/ui/PlayingHost.endless.test.ts`'s `DEV_GUARD` regex counts). Loosening the test's regex was rejected: the point of the assertion is that the shipped idiom is the repo's, not that some spelling of it exists.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** suite green including `tests/ui/PlayingHost.endless.test.ts`'s untouched guard-count contract.
- **Committed in:** `343a900`

---

**Total deviations:** 3 auto-fixed (1 bug prevented, 2 blocking).
**Impact on plan:** No scope change. Deviation 1 strengthens a contract the plan's literal wording would have weakened into a defect; 2 and 3 are mechanical consequences of the plan's own "name the boundary" and "use the repo's full idiom" instructions.

## Issues Encountered

- **The tree was transiently red between the Task 1 and Task 2 commits.** Task 1's source change necessarily falsifies the defect-pinning A-01 contract in `tests/ui/PlayingHost.endless-host.test.ts`, which Task 2 corrects. This is the plan's deliberate sequencing — Task 1's `<verify>` chain excludes that file — and it is disclosed here rather than hidden. `d71b57c` alone does not pass `tests/ui/PlayingHost.endless-host.test.ts`; `dab30ad` onward does. Anyone bisecting through this range should bisect to `dab30ad` or later.

## Scope Fences Honoured

- **SC-5 / the frame-timing half of N-END-03 is NOT claimed.** No automated step in this repo can produce a frame on hardware. `N-END-03` remains `[ ]` in `.planning/REQUIREMENTS.md` and `docs/ops/ENDLESS-MODE.md` § Limits item 2 is untouched. `requirements.mark-complete` was deliberately NOT run for this plan: `N-END-01` and `N-END-02` were already `[x]` before it started, and the only unchecked ID in the plan's `requirements` array is `N-END-03`, whose unchecked box is CORRECT. Running the verb would have been the untaken-reading failure the phase's own prohibitions forbid. `requirements-completed` is therefore `[]` — nothing changed state.
- `N-END-02` untouched at `[x]`. `ENDLESS_BRICK_DIMS` / `bakeGlowSprites(brickW, brickH)` untouched. No production endless entry point, no permanent endless record surface, no election of a primary record. `src/core` and `src/levelgen` have a zero-line diff.

## Flagged Assumptions (still flagged, none resolved)

The five spec-less-probe edge rows in this plan's `must_haves.assumptions` remain **flagged and unresolved**. Task 3's tripwire explicitly does NOT resolve the N-END-01 boundary row — its own comment says so, and the row's premise (no source artifact states the contract) is unchanged by this plan.

## Verification

Plan-level chain, all green:

- `npx vitest run tests/ui/PlayingHost.endless-record.test.tsx tests/ui/PlayingHost.endless-retry.test.tsx tests/ui/PlayingHost.endless-host.test.ts tests/ui/ResultOverlay.test.tsx tests/ui/GameScreen.test.tsx tests/ui/PlayingHost.endless.test.ts tests/ui/PlayingHost.bake-gate.test.ts` → **7 files, 79 tests passed**
- Full suite: `npx vitest run` → **97 files, 609 tests passed**
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- No test file lost a case; the two corrected cases were rewritten in place.
- The `if (advanceToWave(waveRef.current + 1)) {` anchor is byte-identical, so `tests/ui/PlayingHost.endless.test.ts`'s `waveSuccessPath` extraction and `__DEV__` guard-count contract pass untouched.

## Known Stubs

None. The five changed files were scanned for hardcoded empty values, placeholder copy, `TODO`/`FIXME`, and skipped tests — zero hits.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change. The plan's `<threat_model>` mitigations for `T-11-02` (the `runEndedRef` latch) and `T-11-03` (republishing the endless watermarks) are both implemented and behaviourally asserted (coverage `D4` and `D3`). `T-11-04` is unchanged and still disclosed as A-02 with its exit route in 11-10. `T-11-05` is untouched — no task went near the `devLevelSwitch` markup.

## Next Phase Readiness

- **Ready for 11-10**, which moves `recordInFlightEndlessRun()` inside `startEndlessRun` (11-VERIFICATION gap 1) and owes A-02 its exit route. `failEndlessStart`'s `runEndedRef.current = true` latch was added specifically so that move cannot produce a phantom `{ wave: 1, score: 0, abandoned }` record for a start that never began — its JSDoc says so, so the line survives a later reader.
- **Carried open, unchanged:** the SC-5 device reading (human-gated, procedure in `docs/ops/ENDLESS-MODE.md` § Limits item 2), the E1 320px-panel overflow backstop (`D11` above), and the five flagged edge-probe rows.
- **Not closed by this plan:** 11-VERIFICATION gap 1 (`startEndlessRun` and `toggleDevLevel` discarding an in-flight run without recording it) and the bold ops-doc claim that contradicts it. That is 11-10's scope by design.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

All five modified source/test files and the SUMMARY exist on disk. All four commits
(`d71b57c`, `dab30ad`, `343a900`, `b0f3a0c`) are present in `git log --oneline --all`.
`commits: 3` in the frontmatter is MEASURED —
`git rev-list --count 137c4b9..HEAD` at SUMMARY-write time returned 3 (the three task
commits; this docs commit lands after the count, per the ledger contract).
