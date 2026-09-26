---
phase: 11-endless-mode
verified: 2026-09-26T05:47:35Z
status: gaps_found
score: 8/14 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/11-endless-mode/11-01-PLAN.md"
  - ".planning/phases/11-endless-mode/11-01-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-02-PLAN.md"
  - ".planning/phases/11-endless-mode/11-02-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-03-PLAN.md"
  - ".planning/phases/11-endless-mode/11-03-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-04-PLAN.md"
  - ".planning/phases/11-endless-mode/11-04-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-05-PLAN.md"
  - ".planning/phases/11-endless-mode/11-05-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-06-PLAN.md"
  - ".planning/phases/11-endless-mode/11-06-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-07-PLAN.md"
  - ".planning/phases/11-endless-mode/11-07-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-08-PLAN.md"
  - ".planning/phases/11-endless-mode/11-08-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/BOARD-GENERATOR.md"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/loadLevel.ts"
  - "src/runtime/overlays/ResultOverlay.tsx"
  - "src/runtime/useGameLoop.ts"
  - "src/runtime/worldRequests.ts"
  - "src/services/endless/index.ts"
  - "src/services/endless/ramp.ts"
  - "src/services/storage/asyncStorageStore.ts"
  - "src/services/storage/index.ts"
  - "src/services/storage/memoryStore.ts"
  - "src/services/storage/parseBlob.ts"
  - "src/services/storage/telemetry.ts"
  - "src/services/storage/types.ts"
covered_digest: "v1:sha256:9acb50bcbecbbf491ec619b474c47b283e3f8550900e3d782eeb02993c5e8704"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/5
  gaps_closed:
    - "The endless record is a record worth chasing — telemetry.endless.bestWave reflects a wave some single run actually reached (phase goal / N-END-02). Retry from the endless lose overlay now restarts at wave 1 and the next loss records wave 1; empirically driven through the real host."
    - "Endless records are stored separately from campaign progress; playing endless cannot unlock, lock, or alter a campaign level's best or stars (SC-3 / N-END-02). The mode branch now precedes evaluatePersonalBest, previousBestRef is never written by an endless run, and the endless Results overlay reads telemetry.endless."
  gaps_remaining: []
  regressions:
    - "startEndlessRun mutates runSeedRef and waveRef BEFORE its failure return (11-07 introduced the second early return at that site). From Pause -> Retry with a failing build the host is left half-applied: paused, on the wave-N board, runEndedRef latched true, and the resumed run is never recorded. Empirically reproduced."
    - "docs/ops/ENDLESS-MODE.md now asserts in bold that 'every path that discards a run records it first'. The __DEV__ Endless button discards a live endless run with recordRunEnd called zero times, so the round shipped a written invariant its own code does not hold."
gaps:
  - truth: >-
      No in-flight endless run is silently discarded: every path that discards a run records
      it first (11-07 must_have truth 3; asserted as fact in docs/ops/ENDLESS-MODE.md
      § The run boundary and the record display)
    status: failed
    reason: >-
      Verified empirically against the real host through the 11-07 harness, not adopted from
      the review. `onRetry` and `remountDevSession` were made mode-aware and both now call
      `recordInFlightEndlessRun()` — those two are genuinely closed. But the funnel was wired
      at the CALLERS instead of inside `startEndlessRun`, so the two run-boundary controls
      that reach `startEndlessRun` directly were missed. Driving a live run to wave 2 and
      pressing the `__DEV__` `Endless` button returns the readout to `W1` with `recordRunEnd`
      called ZERO times — the in-flight run vanishes from telemetry. This is verbatim the
      defect gap 1 raised against `remountDevSession`, left open on a sibling path, and the
      ops document now states the opposite invariant in bold. It is data LOSS, not
      inflation — `bestWave` cannot be raised by it — but "a record worth chasing" is not
      served by a record that can silently drop the run that set it, and `startEndlessRun`
      is the function Phase 14 promotes to the production endless entry point, so the
      omission outlives the dev row.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `startEndlessRun` (1094-1156) never calls `recordInFlightEndlessRun()`. The
          `Endless` Pressable at 1488-1497 binds `onPress={startEndlessRun}` and the dev row
          stays mounted and tappable for the whole run (`GameScreen.tsx` renders
          `devLevelSwitch` above the overlays), so a second press mid-run re-mints
          `runSeedRef`, sets `waveRef.current = 1` and clears `runEndedRef` with no record
          written. Measured: from wave 2, readout goes `W2` -> `W1`, `recordRunEnd` calls = 0.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `toggleDevLevel` (1260-1292) is the third un-mode-aware copy of the run-boundary
          reset — the same omission list (`waveRef`, `runSeedRef`, `waveAdvanceInFlightRef`,
          `modeRef`, no `recordInFlightEndlessRun`). Measured: pressing `Lv` at wave 2 leaves
          `mode = 'endless'`, readout `W2`, `recordRunEnd` calls = 0, and a subsequent loss
          records `{mode:'endless', wave:2}` for what is nominally a campaign level. It also
          clears `runEndedRef` for an already-recorded run, un-latching the double-record
          guard. Phase 14 deletes this control, and the ops document discloses the surrounding
          `modeRef` latch as A-02 (OPEN, owner decision owed) — so this artifact is the
          lower-priority half of the gap, listed so the planner can scope it deliberately
          rather than rediscover it.
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Line 265-266 asserts "`telemetry.endless.bestWave` can only be raised by a wave that
          some single continuous run actually reached, because every path that discards a run
          records it first and every path that starts one returns to wave 1." The first
          conjunct is false as shipped. The § Run boundaries table above it also omits both
          the `__DEV__` `Endless` button and `toggleDevLevel` as boundaries.
    missing:
      - "Move the `recordInFlightEndlessRun()` call INSIDE `startEndlessRun`, as its first statement, and drop the now-redundant calls from `onRetry` (1173) and `remountDevSession` (1313). The funnel already no-ops in campaign and for an already-ended run, so this is safe for all five callers and puts the invariant where the ops document claims it lives."
      - "Declare `recordInFlightEndlessRun` above `startEndlessRun` and add it to the dependency array — the TDZ note at 1088-1092 applies to it exactly as it does to `startEndlessRun` itself."
      - "Decide A-02 and route `toggleDevLevel` accordingly: either record the in-flight run and make it an explicit EXIT from endless (`modeRef.current = 'campaign'; setMode('campaign'); waveRef.current = 1; setWave(1); waveAdvanceInFlightRef.current = false;` — which is also the minimal discharge of A-02 and would un-break the SC-5 discharge procedure's do-not-press note), or disable the control while `modeRef.current === 'endless'`."
      - "A behaviour test that presses the `__DEV__` `Endless` button mid-run and asserts `recordRunEnd` received `{mode:'endless', wave: <the wave reached>, outcome:'abandoned'}` before the readout returns to W1. `tests/ui/PlayingHost.endless-retry.test.tsx` already has the harness and the wave readout helper; no test in it presses `Start an endless run` a second time."
      - "Correct docs/ops/ENDLESS-MODE.md § The run boundary and the record display: add the `__DEV__` `Endless` button and `toggleDevLevel` as rows in the boundary table, and do not restate the 'every path records first' invariant until the code holds it."
  - truth: >-
      A run-boundary reset in endless either starts a NEW run (seed re-minted, wave 1, guard
      cleared, lives/score/combo reset) or leaves the run untouched — never a half-applied
      run identity (11-07 must_have truths 1 and 4; 11-UI-SPEC § Run boundaries, rows 1-2)
    status: failed
    reason: >-
      Reproduced empirically by driving the real host: endless run to wave 2, Pause, force
      `compileGeneratedLevel` to fail, press the Pause panel `Retry`. `startEndlessRun`
      performs two irreversible writes — `runSeedRef.current = Date.now() >>> 0` (1115) and
      `waveRef.current = 1` (1116) — and only then calls `advanceToWave(1)`; the failure
      return at 1117-1121 sits ABOVE every statement that would make those writes coherent
      (`setResult(null)`, `runEndedRef.current = false`, `retry()`, `setActive(true)`,
      `setWave`). Measured post-condition: `result = null`, `uiPhase = 'paused'`, wave
      readout `W2`, board unchanged from wave 2 = true, `waveBuildFailedWave = 1` with no
      surface to render it. Three consequences, all measured: (1) the run is UNRECORDABLE —
      `recordInFlightEndlessRun` already latched `runEndedRef = true`, so resuming and losing
      produced `recordRunEnd` calls = 0 and a Results overlay carrying the previous run's
      metrics; (2) the run REWINDS — `waveRef` is 1 while the wave-N board is in play, so the
      next WON calls `advanceToWave(2)`, restarting the difficulty ramp and seed walk (a run
      at wave 30 silently becomes a run at wave 2); (3) `waveRef` and the `wave` HUD state
      diverge. This cannot inflate `bestWave`, so the phase-goal truth survives — but it is a
      silent, durable loss of exactly the deep run the record exists to capture.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `startEndlessRun` 1115-1122: run-identity mutation precedes the failure return.
          `waveRef.current = 1` at 1116 is additionally redundant — `advanceToWave` already
          assigns `waveRef.current = nextWave` and calls `setWave(nextWave)` on success
          (901-902), and that is the only assignment that keeps the ref and the HUD state in
          step.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          The first early return at 1107-1110 (`!levelReady || levelError != null || !fxReady`)
          has the same shape — it returns without restoring anything — but is benign today
          because it precedes both writes. Any fix must keep it that way.
    missing:
      - "Snapshot and restore the seed around the build attempt so a failed start leaves NOTHING changed: `const prevSeed = runSeedRef.current; runSeedRef.current = Date.now() >>> 0; if (!advanceToWave(1)) { runSeedRef.current = prevSeed; ...fail...; return; }`"
      - "Delete `waveRef.current = 1` at 1116 — `advanceToWave(1)` already performs it on success, and keeping it is what lets the ref and the HUD diverge on failure."
      - "Decide and implement what 'the run already ended but did not restart' means, because `recordInFlightEndlessRun` has already latched `runEndedRef` by the time the failure return fires. The least surprising resolution is to force the Results overlay up (`setResult('lose'); setActive(false);`) so the only live control is the `Retry` the decided copy points at — which also gives gap 3's copy a surface on this path."
      - "A behaviour test for Pause -> Retry with a forced compile failure asserting the post-condition is either a clean wave-1 run or an untouched paused run — and specifically that the run which follows IS recorded. `tests/ui/PlayingHost.endless-retry.test.tsx` already forces compile failures via `failCompileFrom`; add an `onResume` driver (call the captured `onResume` prop — the GameScreen mock renders no Resume control today)."
  - truth: >-
      A start that cannot build wave 1 presents the owner-decided copy
      `Wave 1 could not be built — tap Retry` with `Retry` live — never a silent no-op, which
      the owner explicitly REJECTED at 11-07's checkpoint:decision on 2026-09-26 (A-01,
      retry-in-place; 11-UI-SPEC § Endless copy)
    status: failed
    reason: >-
      The decision is recorded faithfully in the plan, the UI-SPEC and
      docs/ops/ENDLESS-MODE.md § A-01, and the copy is implemented and unit-tested. It is
      nonetheless unreachable from two of the three `startEndlessRun` call sites, so the
      shipped behaviour on the first-entry path IS the rejected option. Two independent gates
      cause it: `setWaveBuildFailedWave(1)` fires at 1108 and 1118, BEFORE
      `modeRef.current = 'endless'` / `setMode('endless')` at 1123-1124, and
      `ResultOverlay.tsx:105` reads `const failedWave = isEndless ? waveBuildFailedWave : null;`
      while `GameScreen.tsx:117` mounts the overlay only when `result != null`. So the copy
      renders only when the caller was ALREADY in endless AND a Results overlay was ALREADY
      on screen — the Results-`Retry` path alone. Measured on a fresh mount with a forced
      compile failure: pressing `Start an endless run` leaves `result = null`,
      `mode = 'campaign'`, `waveBuildFailedWave = 1` and no wave readout. The button does
      nothing and says nothing. The `remountDevSession` / Pause-`Retry` path is silent for the
      same reason (see gap 2). This is a decision-honouring failure, not merely a copy bug:
      the phase's own record says the owner rejected `silent-noop`, and `silent-noop` is what
      the only entry point into the mode does.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `startEndlessRun` 1107-1110 and 1117-1122: both failure returns set
          `waveBuildFailedWave` while `modeRef`/`mode` are still `'campaign'` and `result` is
          still `null`, so neither of the two conditions the overlay needs is satisfied.
      - path: "src/runtime/overlays/ResultOverlay.tsx"
        issue: >-
          Line 105 nulls `waveBuildFailedWave` outside endless. Correct as a component
          contract; it is the caller that must flip the mode and raise the overlay first.
      - path: "tests/ui/PlayingHost.endless-host.test.ts"
        issue: >-
          Lines ~310-332 assert that BOTH early returns call `setWaveBuildFailedWave(1)`, and
          `tests/ui/PlayingHost.endless-record.test.tsx:598` renders the copy — but only from
          the one path where it can reach the screen. The contract reads as proven while two
          thirds of it is unreachable; the source-contract test is what let that through.
    missing:
      - "Flip the mode and raise a surface BEFORE the readiness/build gate, so the failure has somewhere to render regardless of entry point — e.g. a `failEndlessStart()` helper that does `modeRef.current = 'endless'; setMode('endless'); setWaveBuildFailedWave(1); setResult('lose'); setActive(false);` and is called from both early returns."
      - "Zero or suppress the run-scoped lines on a Retry-time failure. `failedWave <= 1` means there is no run for `Wave · {n}` and `Score · {n}` to describe, yet `tests/ui/PlayingHost.endless-record.test.tsx` currently pins `Wave · 7` beside `waveBuildFailedWave: 1` as expected — the previous run's metrics rendered under failure copy with nothing marking them as stale."
      - "A behaviour test for FIRST ENTRY with a forced compile failure that asserts the decided copy is on screen and a `Retry` control is live — driven through the real host and the real overlay, not through the host's props. `tests/ui/PlayingHost.endless-record.test.tsx` mounts the real ResultOverlay and already has `failCompileFrom`; the missing case is failing the very first `compileGeneratedLevel` call."
      - "Re-check the `waveBuildFailedWave` value-only discriminant after the fix (IN-01): `1` means Retry-time and `>= 2` means mid-run, an invariant held only by `startEndlessRun` restarting at wave 1. Either make it explicit (`{ at: 'start' } | { at: 'mid'; wave: number } | null`) or add a `__DEV__` assertion at the writer."
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05; the
      Pressable at PlayingHost.tsx:1488-1497 carries a comment saying Phase 14 deletes it),
      and ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from
      the previous verification.
  - truth: "A permanent endless record surface, and electing which of bestScore / bestWave is THE record"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 SC-1/SC-2 ('Title offers ... endless ... as distinct entries'; 'A statistics
      screen renders the lifetime and per-level telemetry'). ENDLESS-MODE.md § Limits item 4
      records it, and 11-08 deliberately ships the endless Results overlay as the only
      endless-record reader without electing a primary record (A-08).
  - truth: "Endless bricks draw an unstretched glow halo (ENDLESS_BRICK_DIMS / A-04 / the planning docs' WR-01)"
    addressed_in: "Phase 14"
    evidence: >-
      Owner-decided accepted debt on 2026-09-26, recorded in docs/ops/ENDLESS-MODE.md
      § Flagged assumptions A-04 and § Limits item 7 with the measured 0.77x horizontal /
      0.85x vertical stretch, and named in the SC-5 discharge procedure as expected and
      accepted so the device reading is neither discarded nor re-reported. The bake path is
      intentionally untouched by this round.
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready
      without a frame spike that breaks the Mid budget
    test: >-
      Launch a dev build; arm the perf overlay; press the `Endless` button in the `__DEV__`
      dev row on the playing HUD; play waves 1 through 5; watch each transition specifically —
      the moment the last brick of a board breaks and the next board appears. Do not press
      `Lv`, the tier button or `Cert WC` during the reading (A-02: the `modeRef` latch leaves
      the frame loop stopped behind a live HUD after any of them).
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no
      `[audio] preload soft-fail` line in the log mid-run; frame times stay inside the Mid
      budget across each transition (p50 <= 16.7 ms, p95 <= 20 ms). The stretched glow halo on
      every brick is EXPECTED and ACCEPTED (A-04) — not a fifth failure signature.
    why_human: >-
      No automated step in this repo can produce a frame on hardware. Everything proven so far
      shows only that the bake/audio-preload COLD PATH IS NOT ENTERED at a transition — a
      source-level argument plus a jsdom observation. The 0.56 ms generate+compile figure is a
      Node microbenchmark scaled by a 15.5x Hermes ratio that itself came from a simulator,
      not a device. "No device available" is a valid outcome: leave the OPEN block in
      docs/ops/ENDLESS-MODE.md § Limits item 2 exactly as it stands.
---

# Phase 11: Endless Mode Verification Report

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T05:47:35Z
**Status:** gaps_found
**Re-verification:** Yes — after the 11-07 / 11-08 gap-closure round

## Goal Achievement

**Both recorded gaps are genuinely closed, and I confirmed each by driving the real host
rather than by reading the summaries.** An endless Retry now restarts at wave 1 and the next
loss records wave 1, so the Retry chain that inflated `telemetry.endless.bestWave` is dead. I
audited every `retry()` call site and no path remains that refills the world's lives without
also resetting the wave — the inflation mechanism is structurally gone, not merely patched at
one caller. Gap 2 is the cleaner of the two: the mode branch now precedes
`evaluatePersonalBest`, the endless arm cannot syntactically reach it, the watermark refs are
separate and seeded at mount, the displayed record comes off the synchronous `recordRunEnd`
return, and `previousBestRef` is never written by an endless run.

**What did not close is the CLASS of defect gap 1 named.** Gap 1's root-cause sentence was
"the run-boundary resets were never made mode-aware". Two of five copies were fixed by hand;
the funnel was wired at the callers instead of inside `startEndlessRun`, so the two controls
that reach `startEndlessRun` directly still discard a live run without recording it — and
`docs/ops/ENDLESS-MODE.md` now asserts in bold that they cannot. Separately, 11-07's own new
early return in `startEndlessRun` runs after two irreversible writes, producing a half-applied
run that is both unrecordable and rewound. And the copy the owner explicitly chose over
`silent-noop` cannot reach the screen from the only path that enters the mode.

The defects that remain cause data LOSS rather than record INFLATION, which is why the
phase-goal truth flips to VERIFIED while three plan-level truths fail. That distinction matters
for the next round's framing: the record can no longer be cheated, but it can still silently
swallow the run that set it.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC-1 — Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ VERIFIED | Regression check. `applyWaveAdvance` (`src/runtime/worldRequests.ts:61-96`) and the host WON intercept (`PlayingHost.tsx:916-946`) are unchanged in substance; the intercept still precedes the campaign WON branch and returns in every path. `tests/endless.wave-loop.test.ts` and `tests/runtime.wave-advance.test.ts` drive a real `World` through the real core across multiple waves — both pass in this run. |
| 2 | SC-2 — Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel in code | ✓ VERIFIED | Regression check. `difficultyForWave` (`src/services/endless/ramp.ts:57-66`) untouched this round; `D_MAX` still imported from the `src/levelgen` barrel, not restated. Prose ramp table at `docs/ops/ENDLESS-MODE.md:26-45`. `tests/endless.ramp.test.ts` passes. |
| 3 | SC-3 — Endless records stored separately from campaign progress; playing endless cannot unlock, lock, or alter a campaign level's best or stars | ✓ VERIFIED (was ✗ FAILED) | Storage half unchanged and still structural (discriminated `RecordRunEndArgs`, both stores gated, `sanitizeTelemetry` isolates the sub-object). UI half now closed and behaviourally proven: `handleRunEnded` (695-800) branches on `modeRef.current` FIRST; `evaluatePersonalBest` appears only inside the campaign arm (771-774); `previousBestRef` has exactly two writers, both campaign (456/786). `tests/ui/PlayingHost.endless-record.test.tsx` drives a real endless loss with `campaignBest = 100` and asserts the host's `best` prop is the ENDLESS watermark during the overlay, then `100` again after a Retry — a read-back probe that would fail against the pre-fix host. I traced `best` through `GameScreen.tsx:193` and confirmed `ResultOverlay` is its only consumer. |
| 4 | SC-4 — A seeded endless run is reproducible end to end; the same seed and inputs replay to the same wave | ✓ VERIFIED | Regression check. `tests/endless.determinism.test.ts` passes unchanged; `applyWaveAdvance` and the RNG streams are untouched this round. Scoping (headless, fixed-input policy) still stated in writing at `ENDLESS-MODE.md` § Limits item 1 rather than overclaimed. |
| 5 | SC-5 — Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Structural half holds and is unchanged: the wave block sits above the `simFrozen` computation in the frame callback, no `setActive` call occurs in a transition, and `loadKey` is brick dimensions only so the bake/preload cold path is not re-entered. Device frame reading NOT TAKEN — no automated step in this repo produces a frame on hardware. Routed to human verification with its discharge procedure. Scope-fenced: `N-END-03` is intentionally left unchecked in REQUIREMENTS.md for exactly this reason. |
| 6 | Phase goal / N-END-02 — the endless record is worth chasing: `telemetry.endless.bestWave` reflects a wave some single run actually reached | ✓ VERIFIED (was ✗ FAILED) | Behaviourally driven, not inferred. Real host to wave 2, loss recorded `{wave:2}`, press `Retry` → readout `W1`, next loss records `{mode:'endless', wave:1, score:10}`. A Retry chain therefore cannot raise `bestWave`. I additionally audited every `retry()` call site — the gate effect (early-returns in endless), `onRetry`'s campaign branch, `remountDevSession`'s campaign branch and `startEndlessRun` (which resets the wave) — and no path remains that refills world lives while carrying the wave forward. The three remaining defects (truths 7-9) all UNDER-record; none can inflate. |
| 7 | 11-07 — a run-boundary reset in endless either starts a NEW run or leaves the run untouched; never a half-applied run identity | ✗ FAILED | Reproduced: Pause → Retry at wave 2 with a forced compile failure leaves `result = null`, `uiPhase = 'paused'`, readout `W2`, board unchanged, `runEndedRef` latched, `waveRef` silently 1. The resumed run's loss produced `recordRunEnd` calls = **0**. See gap 2. |
| 8 | 11-07 — no in-flight endless run is silently discarded; every path that discards a run records it first | ✗ FAILED | Reproduced: from wave 2, pressing the `__DEV__` `Endless` button returns the readout to `W1` with `recordRunEnd` called **zero** times. `toggleDevLevel` is a third un-mode-aware copy with the same omission list. `docs/ops/ENDLESS-MODE.md:265-266` asserts the opposite in bold. See gap 1. |
| 9 | 11-07 / A-01 — a start that cannot build wave 1 presents the owner-decided `tap Retry` copy with Retry live, never a silent no-op | ✗ FAILED | Reproduced on a fresh mount with a forced compile failure: pressing `Start an endless run` leaves `result = null`, `mode = 'campaign'`, `waveBuildFailedWave = 1`, no wave readout, nothing on screen. `setWaveBuildFailedWave(1)` fires before the mode flip and `ResultOverlay.tsx:105` nulls the prop outside endless. The shipped first-entry behaviour is the option the owner explicitly rejected. See gap 3. |
| 10 | 11-07 — `advanceToWave(n)` returning false ends the run: guard cleared, run recorded `abandoned` at wave n-1, loop stopped, `LevelErrorOverlay` NOT rendered | ✓ VERIFIED | `applyChrome` 916-946 read directly: `waveAdvanceInFlightRef.current = false` precedes the record, `handleRunEnded(..., 'abandoned', ...)` fires under the `runEndedRef` gate, then `setResult('lose'); setActive(false)`. The generated-board failure never touches `levelError`, so `showResult` is not suppressed. Behaviourally exercised by the named test `a wave that cannot be built ENDS the run, records it, and releases the guard (WR-04)` — passes, and it fails compiles PERSISTENTLY so a latched guard would be caught. |
| 11 | 11-08 — the endless Results overlay reads its record from `telemetry.endless`, post-merge; New Record is strict in BOTH watermarks; Win / All clear / stars / Next are unreachable in endless | ✓ VERIFIED | `ResultOverlay.tsx:92-149` forces `isWin = kind === 'win' && !isEndless`, so stars and `Next` cannot render in endless regardless of caller. `handleRunEnded` 727-757 reads `blob.telemetry.endless` off the synchronous `recordRunEnd` return. Behaviourally exercised across `tests/ui/PlayingHost.endless-record.test.tsx`, `ResultOverlay.test.tsx` and `GameScreen.test.tsx`: equality-keeps-the-record, score-alone, wave-alone, line order, and the `campaignBest = 0` falsification case that would go green for the wrong reason at the default. All pass. |
| 12 | 11-08 — the ops record states the WR-01 brick-dimension mismatch as accepted debt with its measured stretch factors and Phase 14 as the fix site, and the SC-5 discharge procedure names the stretched halo as expected and accepted | ✓ VERIFIED | Read directly. `docs/ops/ENDLESS-MODE.md` § Flagged assumptions A-04 records the owner decision of 2026-09-26 pointing at § Limits item 7; the SC-5 OPEN block carries an "Expected and ACCEPTED — not a fifth failure signature" paragraph with the 0.77x / 0.85x factors and an explicit instruction not to discard or fail the reading over it. The OPEN block itself is intact, still names the budget and four failure signatures, and still refuses a fabricated pass. |
| 13 | 11-07 backstop — a UI-state test at a 7-digit score and a 3-digit combo shows the 48px HUD row neither wrapping nor clipping | ⚠️ insufficient_spec | `verification: backstop`. No held-out or property-based test exists: grepped `tests/ui/` for 7-digit values, overflow, wrap and clipping assertions — zero hits. Presence and wiring do not qualify as evidence for a backstop truth. Abstained; routed to human. |
| 14 | 11-08 backstop — a UI-state test at a 7-digit score and a 4-digit wave shows no wrap and no clipping in the shipped 320px panel | ⚠️ insufficient_spec | `verification: backstop`. Same grep, same result. `ResultOverlay.test.tsx` asserts content and line order at small values only; nothing exercises the panel at extreme widths. Abstained; routed to human. |

**Score:** 8/14 truths verified (1 present, behavior-unverified; 2 abstained as insufficient_spec)

Roadmap Success Criteria sub-score: **4/5 verified, 1 behavior-unverified** (SC-1, SC-2, SC-3,
SC-4 verified; SC-5 device-gated). The three failures are all plan-level truths from 11-07 and
the owner decision it carried.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | A production entry point into endless | Phase 14 | Phase 14 SC-1: "Title offers campaign, endless and daily as distinct entries". The `__DEV__`-only entry is sanctioned Phase 11 scope (D-05); the Pressable at 1483-1497 carries a comment saying Phase 14 deletes it. Carried unchanged from the previous verification. |
| 2 | A permanent endless record surface; electing a primary record | Phase 14 | Phase 14 SC-1/SC-2. `ENDLESS-MODE.md` § Limits item 4; 11-08 deliberately declines to elect one (A-08). |
| 3 | `ENDLESS_BRICK_DIMS` / the stretched glow halo | Phase 14 | Owner-decided accepted debt 2026-09-26, recorded at § Flagged assumptions A-04 and § Limits item 7 with measured stretch factors. Bake path intentionally untouched. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/PlayingHost.tsx` | Mode-aware run boundaries, in-flight abandon funnel, per-mode watermark refs | ⚠️ PARTIAL | 1594 lines. `recordInFlightEndlessRun` (1001-1030) exists and is correct; `onRetry` (1157) and `remountDevSession` (1304) both route through it into `startEndlessRun`. But `startEndlessRun` itself neither records (gap 1) nor unwinds its own writes on failure (gap 2), `toggleDevLevel` (1260) is a third un-mode-aware copy, and both failure returns fire before the mode flip (gap 3). |
| `src/runtime/overlays/ResultOverlay.tsx` | Mode-aware overlay: endless record lines, wave-build-failure copy, no campaign chrome | ✓ VERIFIED | 309 lines. `isWin` forced false in endless so stars/`Next` cannot render; six lines in the contract order; one badge with one static style. Imported and rendered by `GameScreen.tsx:189-199`. |
| `src/runtime/GameScreen.tsx` | `mode` / `wave` / `bestWave` / `waveBuildFailedWave` threaded to the overlay | ✓ VERIFIED | Props declared 31-41, forwarded 193-195. `best` reaches `ResultOverlay` and nothing else — confirmed by grep. |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | The behaviour test gap 1 lacked — Retry driven through the real host | ✓ VERIFIED | 11 cases, real `generate` / `compileGeneratedLevel` / ramp, a forced-compile-failure injector that fails persistently (so a latched guard is distinguishable from a released one), and assertions on what `recordRunEnd` actually received. I reused this harness for my own probes; it is honest and substantive. Its blind spot is that no case presses `Start an endless run` twice or drives `onResume`. |
| `tests/ui/PlayingHost.endless-record.test.tsx` | The display half, driven through the real host and the real overlay | ✓ VERIFIED | Drives the real `ResultOverlay`; the `campaignBest = 0` and `campaignBest = 100` falsification notes are load-bearing, not decorative. One case (`a Retry-time wave-build failure...`) pins stale run metrics beside failure copy as expected — see IN-05. |
| `docs/ops/ENDLESS-MODE.md` | Run-boundary contract, record display contract, A-01…A-05, SC-5 OPEN block, § Limits item 7 | ⚠️ PARTIAL | The record-display half, the A-04 debt entry and the SC-5 OPEN block are accurate and unusually honest. The run-boundary half overstates: its boundary table omits the `__DEV__` `Endless` button and `toggleDevLevel`, and line 265-266 asserts an invariant the code does not hold. |
| Phase test suites (11 files, 95 tests) | Wave loop, ramp, determinism, firewall, host, overlay | ✓ VERIFIED | 11 files / 95 tests, all pass in 1.35 s (measured this run). `npm run typecheck` exit 0, `npm run lint` exit 0, `src/core` + `src/levelgen` diff = 0 lines since `b99607b`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `onRetry` endless branch | `startEndlessRun` | `modeRef.current === 'endless'` guard at 1172-1176 | ✓ WIRED | Behaviourally confirmed: Retry at wave 2 → readout `W1`, board fingerprint changes, next loss records wave 1. |
| `remountDevSession` endless branch | `recordInFlightEndlessRun` → `startEndlessRun` | Same guard at 1312-1316 | ✓ WIRED | Named test `a DEV tier change during a live endless run records it before restarting` passes. |
| `recordInFlightEndlessRun` | `handleRunEnded` → `store.recordRunEnd` endless arm | Shared `runEndedRef` gate | ✓ WIRED | Measured: the Pause→Retry probe shows `{mode:'endless', wave:2, outcome:'abandoned'}` reaching the store. |
| `__DEV__` `Endless` Pressable | `recordInFlightEndlessRun` | — | ✗ NOT_WIRED | `onPress={startEndlessRun}` (1492) and `startEndlessRun` never calls the funnel. Measured: `recordRunEnd` calls = 0 on a mid-run press. Gap 1. |
| `toggleDevLevel` | any endless run-boundary handling | — | ✗ NOT_WIRED | Mode-blind. Measured: mode stays `endless`, wave stays `W2`, nothing recorded. Gap 1, second artifact. |
| `startEndlessRun` failure return | `ResultOverlay` wave-build-failure copy | `setWaveBuildFailedWave(1)` → `mode` → `result != null` | ✗ NOT_WIRED (2 of 3 call sites) | The prop is set before the mode flip and the overlay needs both `isEndless` and `result != null`. Measured: first entry and Pause→Retry both render nothing. Gap 3. |
| `handleRunEnded` endless arm | `blob.telemetry.endless` → `Best` / `Best wave` | Synchronous `recordRunEnd` return | ✓ WIRED | 727-757 read directly; behaviourally pinned by the post-merge display test. |
| `store.getSnapshot()` | `endlessBestScoreRef` / `endlessBestWaveRef` | Mount-time seed effect, depends on `store` alone | ✓ WIRED | 483-499. Correctly NOT keyed on `levelId` — the endless record is one global pair. Fails soft to 0. |
| `previousBestRef` | endless code paths | — | ✓ FIREWALLED | Exactly two writers (456, 786), both campaign. Verified by grep of every occurrence. |
| `setResultBest(previousBestRef.current)` | endless run-start display state | Line 1132 | ⚠️ PARTIAL | A campaign number IS published into the host's `best` prop for the duration of an endless run. Latent today — `best` reaches only `ResultOverlay`, which is unmounted while a run is live, and `handleRunEnded` always overwrites `resultBest` before `setResult` raises it. See WR-04 below. |
| Compiled-push gate effect | suppressed during endless | `modeRef.current` read at 654-656 | ⚠️ PARTIAL | Suppression works; `modeRef` still has no writer back to `'campaign'` (only 279 and 1123, and 279 mirrors a state never set back). Recorded honestly as A-02 OPEN in the ops doc with a do-not-press note on the SC-5 procedure. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Endless Results `Best ·` | `resultBest` | `blob.telemetry.endless.bestScore`, post-merge, via `recordRunEnd`'s synchronous return | Yes | ✓ FLOWING (was ✗ DISCONNECTED) |
| Endless Results `Best wave ·` | `resultBestWave` | `blob.telemetry.endless.bestWave`, post-merge | Yes | ✓ FLOWING (new reader — `telemetry.endless` was write-only across the whole codebase) |
| Endless Results `Wave ·` | `resultWave` | `waveRef.current` at the run boundary | Yes | ✓ FLOWING |
| `New Record` badge | `isNewRecord` | `runScore > endlessBestScoreRef \|\| runWave > endlessBestWaveRef`, both strict | Yes | ✓ FLOWING |
| Endless Results body on a build failure | `waveBuildFailedWave` | `setWaveBuildFailedWave` at 1108 / 1118 / 933 | Only from 933 (mid-run) | ⚠️ STATIC — the two `startEndlessRun` writers cannot reach the overlay (gap 3) |
| Host `best` prop during a live endless run | `resultBest` | `previousBestRef.current` at 1132 — a CAMPAIGN level best | No — wrong source for the mode | ⚠️ HOLLOW (latent; unmounted overlay, always overwritten before display) |
| Dev-row wave readout `W{n}` | `wave` state | `setWave(nextWave)` inside `advanceToWave` on successful compile | Yes | ✓ FLOWING — except after gap 2's half-applied start, where `waveRef` and `wave` diverge |

### Behavioral Spot-Checks

All probes below drove the REAL `PlayingHost` through the 11-07 harness (real `generate`, real
`compileGeneratedLevel`, real ramp, real `ResultOverlay` where noted), with
`compileGeneratedLevel` forced to fail from an opt-in call index. The probe file was removed
after the run; the working tree is clean.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 11 suites pass | `npx vitest run` on the 11 phase test files | 11 files / 95 tests passed, 1.35 s | ✓ PASS |
| Types clean | `npm run typecheck` | exit 0 | ✓ PASS |
| Lint clean | `npm run lint` | exit 0 | ✓ PASS |
| `src/core` / `src/levelgen` freeze held | `git diff --stat b99607b..HEAD -- src/core src/levelgen \| wc -l` | 0 | ✓ PASS |
| Retry from the endless lose overlay restarts at wave 1 | Probe P5: real host → wave 2 → LOST → press `Retry` | readout `W1`; next loss records `{mode:'endless', wave:1, score:10}` | ✓ PASS — gap 1 (prior round) closed |
| A Retry chain cannot raise `bestWave` | Probe P5, as above | Recorded wave is 1, not 3 | ✓ PASS |
| Pause → Retry with a failing build leaves a coherent state | Probe P1: wave 2 → Pause → force compile failure → `Pause panel Retry` | `result=null`, `uiPhase=paused`, readout `W2`, board unchanged=true, `waveBuildFailedWave=1` unrendered | ✗ FAIL — gap 2 |
| The run resumed after that failure is recorded | Probe P1b: call `onResume`, WON, LOST | `recordRunEnd` calls = **0**; overlay shows the previous run's metrics | ✗ FAIL — gap 2 |
| The `__DEV__` `Endless` button records the in-flight run | Probe P2: wave 2 → press `Start an endless run` | readout `W2` → `W1`; `recordRunEnd` calls = **0** | ✗ FAIL — gap 1 |
| First entry with a failing build shows the decided copy | Probe P3: fresh mount → force compile failure → press `Start an endless run` | `result=null`, `mode='campaign'`, `waveBuildFailedWave=1`, no readout, nothing on screen | ✗ FAIL — gap 3 |
| `Lv` during a live endless run | Probe P4: wave 2 → press `Switch level, current level-01` | mode stays `endless`, readout stays `W2`, `recordRunEnd` calls = 0; a later loss records `{mode:'endless', wave:2}` for a campaign level | ✗ FAIL — gap 1, second artifact |
| `Lv` then Pause/Resume revives the loop on stale state | Probe P6 | `setActive` calls `[false, true]`; mode still `endless`, readout `W2` | ℹ️ CONFIRMED — `onResume` is a live route back into the A-02 dead-loop state |
| Wave-transition frame time on device | not runnable in this repo | — | ? SKIP — routed to human verification |
| HUD / panel at 7-digit score, 4-digit wave | no such test exists (grepped) | — | ? SKIP — backstop truths 13-14, abstained |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repo and neither the plans nor the summaries
declare a probe path. Step 7c: SKIPPED (no probes declared or discoverable). The behavioural
spot-checks above are the substitute and were executed in this verifier's own process.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| N-END-01 | 11-01, 11-03, 11-04, 11-05, 11-06, 11-07 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ SATISFIED | Truth 1 (sim layer, real behavioural tests) and truth 10 (the compile-failure path now releases the advance guard, closing the SC-1 break the previous round flagged). Remains `[x]` in REQUIREMENTS.md. |
| N-END-02 | 11-02, 11-05, 11-06, 11-07, 11-08 | Endless records (best wave, best score) stored separately — endless play cannot alter campaign unlocks, bests or stars | ⚠️ SATISFIED WITH RESERVATION | The requirement as WORDED is satisfied: separation is structural (truth 3) and the record can no longer be inflated (truth 6), both behaviourally proven. The `[x]` on line 178 is now defensible where it was not last round. The reservation is that a record which cannot be cheated can still be silently DROPPED (truths 7-8), which the requirement text does not cover but the phase goal's "worth chasing" arguably does. Recommend leaving `[x]` and closing gaps 1-2 under the phase goal rather than reverting the box. |
| N-END-03 | 11-01, 11-03, 11-04, 11-05, 11-06, 11-07, 11-08 | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ⚠️ NEEDS HUMAN | Reproducibility half SATISFIED (truth 4). Frame-budget half UNMEASURED and correctly disclosed. **The unchecked `[ ]` on line 179 is CORRECT, not an omission** — confirmed against the scope fence. The dated caveat sub-bullet beneath it names which half is unproven and points at the OPEN block and STATE.md. |

No orphaned requirements: REQUIREMENTS.md maps exactly N-END-01/02/03 to this phase, and all
three appear in the frontmatter of both gap-closure plans as well as the original six.

### Prohibitions (judgment-tier — NON-AUTHORITATIVE, human review recommended)

All four declared prohibitions are `verification: judgment` with `status: resolved`. This was an
autonomous verification, so what follows is an LLM-judge verdict, not a human resolution. Each
is flagged `unverified-prohibition — human review recommended`; none is recorded as a silent
pass.

| # | Plan | Prohibition | Judge verdict | Flag |
|---|------|-------------|---------------|------|
| 1 | 11-07 | MUST NOT let an endless record be raised by wave depth, score or lives the player did not earn inside one continuous run | **Holds.** Every `retry()` call site audited; no path refills world lives while carrying the wave. Probe P5 confirms the Retry chain records wave 1. | ⚠️ unverified-prohibition |
| 2 | 11-07 | MUST NOT render the `__DEV__` endless entry, the wave readout, or any dev-row affordance in a production build | **Holds.** The whole `devLevelSwitch` block is gated on `typeof __DEV__ !== 'undefined' && __DEV__` (1452-1453) and the wave readout sits inside it behind a further `mode === 'endless'` gate. | ⚠️ unverified-prohibition |
| 3 | 11-08 | MUST NOT display a record belonging to one mode as the player record of another mode | **Partial — flagged prominently.** The DISPLAY half holds on every reachable overlay render (traced `best` to its single consumer; the endless arm overwrites `resultBest` before raising the overlay). But `setResultBest(previousBestRef.current)` at 1132 publishes a campaign number into the host's `best` prop for the life of an endless run (WR-04), and `toggleDevLevel` lets a campaign-level run be recorded as an endless run (gap 1). Neither is user-visible today; both make the statement true only by accident of mount timing. | 🛑 unverified-prohibition — review first |
| 4 | 11-08 | MUST NOT write a passing device reading for SC-5 that was not actually taken | **Holds.** Read the OPEN block directly: still OPEN, still names the budget and four failure signatures, still admits the simulator-derived Hermes ratio, still says "Do not write a passing reading that was not taken". A-05 restates it. | ⚠️ unverified-prohibition |

### Anti-Patterns Found

No `TBD`, `FIXME` or `XXX` markers exist in any file this round modified — the debt-marker gate
passes cleanly. No `TODO`, `HACK` or `PLACEHOLDER` either.

All findings below sit in files git-modified since the previous `verified:` timestamp
(2026-09-25T15:48:00Z), so the re-verification evidence gate is satisfied unconditionally and
none is downgraded to advisory. Every blocker below additionally carries a reproduced
measurement, not a reading.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/_components/PlayingHost.tsx` | 1094 | `startEndlessRun` does not call `recordInFlightEndlessRun` | 🛑 Blocker | In-flight run discarded with zero records on a mid-run `Endless` press. Measured. Gap 1. |
| `app/_components/PlayingHost.tsx` | 1115-1122 | Run-identity mutation precedes the failure return | 🛑 Blocker | Half-applied run: unrecordable, rewound, ref/state divergence. Measured. Gap 2. |
| `app/_components/PlayingHost.tsx` | 1107-1110, 1117-1122 | Failure copy set before the mode flip | 🛑 Blocker | The owner's `retry-in-place` decision is not honoured on the only path into the mode; shipped behaviour is the rejected `silent-noop`. Measured. Gap 3. |
| `app/_components/PlayingHost.tsx` | 1260-1292 | `toggleDevLevel` — third un-mode-aware run-boundary reset | ⚠️ Warning | No record, stale mode/wave, `runEndedRef` un-latched for a recorded run. `__DEV__`-only and deleted by Phase 14; the durable half is A-02, disclosed OPEN. Gap 1, second artifact. |
| `app/_components/PlayingHost.tsx` | 1132 | `setResultBest(previousBestRef.current)` in the endless start path (WR-04) | ⚠️ Warning | Publishes a campaign per-level best as the endless `best` prop for the life of a run. Latent — `best` reaches only `ResultOverlay`, unmounted while a run is live, and `handleRunEnded` always overwrites first. Confirmed latent by tracing `best` through `GameScreen.tsx:193`. `tests/ui/PlayingHost.endless-record.test.tsx:550-573` pins it as expected via a read-back probe; the probe's INTENT (prove `previousBestRef` was not poisoned) is sound and stronger than its current assertion. One-line fix: publish `endlessBestScoreRef.current` / `endlessBestWaveRef.current` and assert the endless watermark instead. |
| `app/_components/PlayingHost.tsx` | 654-656, 279, 1123 | `modeRef` has no writer back to `'campaign'` (A-02) | ⚠️ Warning | Compiled-push gate effect dead for the mount after first endless entry; `Lv` / tier / `Cert WC` leave a stopped loop behind a live HUD, and `onResume` (1063-1078) is a live route back into it. Measured (probe P6: `setActive` `[false, true]` on stale state). Disclosed honestly as an OPEN owner decision with a do-not-press note on the SC-5 procedure — which is why it is a warning, not a gap. |
| `docs/ops/ENDLESS-MODE.md` | 265-266 | Asserts an invariant the code does not hold | ⚠️ Warning | "every path that discards a run records it first" is false (gap 1). A reader picking the mode up would trust it. Its boundary table also omits two live boundaries. |
| `app/_components/PlayingHost.tsx` | 1107-1122; `ResultOverlay.tsx` 142-149 | Retry-time failure renders the previous run's metrics beside the failure copy (IN-05) | ℹ️ Info | Neither failure return clears `resultWave` / `resultBest` / `resultBestWave`, so the one reachable failure path shows `Wave · {previous run}` under `Wave 1 could not be built`. `tests/ui/PlayingHost.endless-record.test.tsx` bakes this in by asserting `Wave · 7` beside `waveBuildFailedWave: 1`. |
| `src/runtime/overlays/ResultOverlay.tsx` | 106-113 | `waveBuildFailedWave` discriminates Retry-time from mid-run by VALUE (`1` vs `>= 2`) (IN-01) | ℹ️ Info | I traced every writer and confirmed the invariant holds today: `waveRef` starts at 1, is assigned `1` in `startEndlessRun`, and otherwise only `waveRef.current + 1` after a successful compile. It is unfenced, and 11-UI-SPEC explicitly contemplates the resume-at-wave-N alternative that would break it silently. |
| `tests/ui/PlayingHost.endless-host.test.ts` | ~335 | Source-contract regex captures a ~225-line region, not the effect it names (IN-02) | ℹ️ Info | The lazy capture starts at the FIRST `useEffect(() => {` in the file, spanning five effects. Passes for the right reason only because no earlier effect contains the search strings. |
| `tests/ui/ResultOverlay.test.tsx` | 232-268 | Badge-style equality assertion satisfied by construction (IN-03) | ℹ️ Info | `isNewRecord` is a single boolean with one static badge style, so the two classes cannot differ for any input. Reads as protection against electing a primary record; can only catch badge count. |
| `app/_components/PlayingHost.tsx` | throughout (e.g. 203-235, 695-720, 988-1010, 1080-1106) | Planning narrative embedded in production source (IN-06) | ℹ️ Info | 1594 lines, a large fraction narrating diff history ("Gap 2 was precisely the opposite order", "11-08 wired the READER"). The durable record already lives in `11-UI-SPEC.md` and `docs/ops/ENDLESS-MODE.md`. Notable, not blocking — and the invariant statements among them are genuinely load-bearing and should survive any trim. |

### Human Verification Required

Status is `gaps_found`, so these do not gate the round — they carry forward and must not be
lost. Items 1-3 are the flagged judgment-tier prohibitions summarised above; items 4-6 are
verification items in their own right.

#### 1. SC-5 device frame reading (endless wave transition)

Recorded in full in the `behavior_unverified_items` frontmatter block above, which is emitted
regardless of overall status precisely so a `gaps_found` round cannot swallow it. Unchanged
from the previous verification apart from the A-04 accepted-halo note now being part of the
written procedure. "No device available" remains a valid outcome.

#### 2. Backstop truth 13 — HUD row at a 7-digit score and a 3-digit combo

**Test:** Render `HudStrip` in a UI-state test (or on device) at `score = 9,999,999` and
`combo = 999` and inspect the 48px row.
**Expected:** No wrap, no clipping, no overlap of the Stall chrome.
**Why human:** `verification: backstop` — the truth is non-inferable from presence and wiring,
and no held-out or property-based test exists (grepped `tests/ui/` for 7-digit values, overflow,
wrap and clipping: zero hits). I abstained rather than infer a pass.

#### 3. Backstop truth 14 — Results panel at a 7-digit score and a 4-digit wave

**Test:** Render the endless `ResultOverlay` at `score = 9,999,999`, `wave = 1000`,
`bestWave = 9999` in the shipped 320px panel.
**Expected:** Six metric lines, no wrap, no clipping, badge and both CTAs still reachable.
**Why human:** Same — `verification: backstop`, no exercising test. `ResultOverlay.test.tsx`
asserts content and line order at small values only.

#### 4. Prohibition 3 — decide whether the latent cross-mode `best` publication is acceptable

**Test:** Owner judgement on WR-04. `setResultBest(previousBestRef.current)` at line 1132 makes
the host's `best` prop a campaign number for the whole duration of an endless run. It is
unobservable today only because `ResultOverlay` is unmounted while a run is live. Phase 14's
production endless chrome (any mid-run `Best` surface) turns it into a rendered campaign number.
**Expected:** Either fold the one-line fix into the next round (publish
`endlessBestScoreRef.current` and update the read-back probe to assert the ENDLESS watermark —
a strictly stronger statement of the same property), or record it as accepted debt with a
Phase 14 pointer alongside A-04.
**Why human:** It is a prohibition resolved by judgment, and the trade-off is "latent today vs
load-bearing in Phase 14" — a scope call, not a derivable fact.

#### 5. A-02 — the owner decision the ops document says is owed

**Test:** Decide what the other `__DEV__` row controls do once endless is entered: disable them,
exit endless back to campaign, or document the row as one-way. `docs/ops/ENDLESS-MODE.md`
§ Flagged assumptions A-02 states the decision is owed and the SC-5 discharge procedure carries a
do-not-press note until it is taken.
**Expected:** A recorded decision. Note that the `modeRef.current = 'campaign'` option is also
the minimal fix for gap 1's second artifact and would remove the do-not-press caveat from the
SC-5 reading.
**Why human:** Explicitly an owner decision; the UI-SPEC declines to say what those controls
should do.

#### 6. Confirm the N-END-02 checkbox disposition

**Test:** Owner review of the reservation recorded in the Requirements Coverage table — whether
`[x]` on N-END-02 should stand while gaps 1-2 (silent run loss) are open.
**Expected:** A decision. My reading is that `[x]` stands, because the requirement's wording is
about separation and the record can no longer be inflated; the loss defects belong to the phase
goal, which is what gaps 1-2 are filed against.
**Why human:** It reverses a call the previous verification made in the other direction, and
requirement-box state is an owner-visible commitment.

### Gaps Summary

**What the round actually achieved, stated plainly:** both gaps closed, and I proved it by
driving the host rather than by reading the summaries. The Retry chain that inflated `bestWave`
is dead and cannot be revived through any surviving `retry()` call site. The mode firewall now
extends from storage into the UI with the branch in the right place and the comparison basis
never shared. `telemetry.endless` finally has a reader. The ops document's Limits section and
its A-01…A-05 block are more honest than most verification reports, and the SC-5 OPEN block
survived a round that had every incentive to quietly close it. Types, lint and 95 phase tests
are green, and the `src/core` / `src/levelgen` freeze held at zero diff lines.

**Three gaps remain, and they share one diagnosis: the fix was applied at the call sites
instead of at the function they all call.**

**Gap 1 — the funnel is one level too high.** `recordInFlightEndlessRun` is correct, and
`onRetry` and `remountDevSession` both use it correctly. But the invariant belongs inside
`startEndlessRun`, because that is what "a new run starts" means. Wiring it at two of five
callers left the `__DEV__` `Endless` button and `toggleDevLevel` discarding live runs with
`recordRunEnd` called zero times — measured, not inferred — while `docs/ops/ENDLESS-MODE.md`
asserts in bold that no such path exists. Moving one call inside `startEndlessRun` and deleting
two redundant ones closes the durable half. It matters beyond the dev row because
`startEndlessRun` is the function Phase 14 promotes to the production entry point.

**Gap 2 — 11-07's own new early return is not atomic.** The second failure return was added
this round, below two irreversible writes. The result is the worst state in the host: paused, on
a board whose wave number the ref no longer agrees with, with `runEndedRef` latched so the run
the player then resumes and finishes can never be recorded. Measured end to end. A seed snapshot
and deleting one redundant assignment fix the mechanism; the open question the fix must also
answer is what "already ended but did not restart" should look like on screen — which is the
same question gap 3 asks.

**Gap 3 — the decision is recorded but not honoured.** This is the finding I want the next
round to take most seriously, because it is the one a green test suite actively conceals. At
11-07's `checkpoint:decision` the owner chose `retry-in-place` and explicitly rejected
`silent-noop`. The copy exists, is contract-fixed, is unit-tested, and is written into the
UI-SPEC and the ops doc. It is also unreachable from the only path that enters the mode — so
what ships on first entry IS `silent-noop`. A source-contract test asserting that both early
returns call `setWaveBuildFailedWave(1)` is what let it through: it proved the write, never the
render. When a decision is recorded, verifying that the decided behaviour is REACHABLE from
every path that can trigger it belongs in the plan, not just that the decided value is set.

**On the record's trustworthiness, since that is the phase goal's own wording:** it can no
longer be cheated — that is a real, proven improvement over last round. It can still be silently
dropped. Inflation and loss are not symmetric harms, which is why truth 6 flips to VERIFIED
while truths 7 and 8 fail, and the next round should frame itself as "no run is lost" rather
than re-litigating "no run is inflated".

**Two warnings worth carrying into the closure plan rather than deferring:** WR-04 (line 1132)
is a one-line change that makes the test probe strictly stronger, and A-02 is an owner decision
whose likely resolution (`modeRef` back to `'campaign'`) is also gap 1's second-artifact fix and
would remove a caveat from the SC-5 device procedure. Both are cheap now and expensive in
Phase 14.

---

_Verified: 2026-09-26T05:47:35Z_
_Verifier: Claude (gsd-verifier)_
