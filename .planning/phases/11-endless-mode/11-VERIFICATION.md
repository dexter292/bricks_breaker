---
phase: 11-endless-mode
verified: 2026-09-26T18:15:00Z
status: gaps_found
score: 20/23 must-haves verified
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
  - ".planning/phases/11-endless-mode/11-09-PLAN.md"
  - ".planning/phases/11-endless-mode/11-09-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-10-PLAN.md"
  - ".planning/phases/11-endless-mode/11-10-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-11-PLAN.md"
  - ".planning/phases/11-endless-mode/11-11-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-12-PLAN.md"
  - ".planning/phases/11-endless-mode/11-12-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-13-PLAN.md"
  - ".planning/phases/11-endless-mode/11-13-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-14-PLAN.md"
  - ".planning/phases/11-endless-mode/11-14-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/overlays/ResultOverlay.tsx"
  - "tests/ui/PlayingHost.endless-host.test.ts"
  - "tests/ui/PlayingHost.endless-record.test.tsx"
  - "tests/ui/PlayingHost.endless-retry.test.tsx"
  - "tests/ui/ResultOverlay.test.tsx"
covered_digest: "v1:sha256:8de4fe89a6a3403530da0228fb1d31a513f836eae939ce0854fef0a352ac82a2"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/18
  gaps_closed:
    - >-
      Round-2 gap 1 — "The host's `best` prop is never a campaign number at ANY moment in
      an endless run's lifetime" (WR-04, display half). CLOSED, and closed by the
      instrument the round-2 report demanded rather than by another source count. The
      `getBestForLevel` preload effect now gates BOTH publications on
      `modeRef.current !== 'endless'` (PlayingHost.tsx:477, :487) while leaving
      `previousBestRef.current = b` unconditional (:469, :485) so the campaign PB cache
      stays warm; `toggleDevLevel` republishes it synchronously on the endless exit
      (:1548). Verified by MUTATION, not by reading: deleting the success-arm guard turns
      `'a campaign per-level best that resolves LATE never reaches the rendered endless
      Best ·'` RED with the mounted slot reading `Best · 7777`. Independently re-driven in
      this process — with the endless Results overlay mounted at `Best · 2400`, landing the
      held campaign read leaves the slot and `host-best` at 2400 (measured round 2: 7777).
      The WR-04 source contract is re-pointed at `setResultBest` call sites
      (endless-host.test.ts:329-464), enumerates eight named mode-scoped regions, asserts
      guard-precedes-publication ordering, and states in its own comment that it proves the
      write rule and NOT the render.
    - >-
      Round-2 gap 3, the WAVE half — "no branch regenerates a board, calls advanceWave() or
      moves the wave number after the run boundary has fired". CLOSED. The endless WON
      branch now consults the shared latch first (`if (runEndedRef.current) { return; }`,
      PlayingHost.tsx:976) and RETURNS rather than falling through; `failEndlessStart`
      clears `waveAdvanceInFlightRef` so all three ended-run states share one
      post-condition. Verified by MUTATION: deleting the latch turns SIX cases red across
      two files, including the walk case and the failed-START copy case. Re-driven here:
      LOST at W2 then one straggler WON leaves `advanceWave` at its pre-boundary count and
      builds no board.
    - >-
      Round-2 gap 2, the GLOW-ATLAS half — the two false mechanisms in the SC-5 discharge
      procedure. CLOSED and closed well. The re-bake claim is WITHDRAWN under a dated
      amendment that leaves the superseded text visible, states the measured call count
      (1 before / 1 after), names `loadKey` as brick width and height alone and the bake
      deps as carrying no tier term, and explicitly tells the operator NOT to discard a
      reading for that reason (ENDLESS-MODE.md:455-470). The `Cert WC` bullet is split by
      `tierOverride` branch. `Cert WC` has a boundary-table row (:261) and the record-first
      sentence has the counterexample reasoning written down beside it (:291-300).
      11-11-SUMMARY.md's unperformed "verified against source" claim is corrected in place
      with the original left standing.
    - >-
      Round-2 advisory 1 — the vacuous `'leaves a LIVE Retry control on screen'` case.
      CLOSED. It now asserts `compileCalls` strictly increases across the press
      (endless-record.test.tsx:1090-1099), which a dead handler cannot cause.
    - >-
      Round-2 advisory 3 / the `Cert WC` freeze — CLOSED as a code change.
      `runCertWorstCase`'s level half carries a mode term (PlayingHost.tsx:1676) so the
      control can no longer leave a live endless run behind a stopped frame loop. Verified
      by MUTATION: removing the mode term turns both new `Cert WC` cases red. Re-driven:
      tier already Mid → run still live at W2, level unchanged, zero `recordRunEnd`, zero
      `setActive(false)`.
  gaps_remaining:
    - >-
      The ENDED-run post-condition is closed at the WAVE but not at the CHROME. 11-13's
      latch sits at PlayingHost.tsx:976, BELOW the five unconditional chrome writes at
      :936-940, so a post-boundary mirror still rewrites the finished run's score, lives,
      combo and sim phase — and those are the same props `GameScreen` hands the mounted
      `ResultOverlay`. See gap 1.
    - >-
      One mechanism claim in the SC-5 discharge procedure is still false for one of the two
      branches it then enumerates, and 11-14 introduced a new, undocumented hazard on that
      same branch. See gap 2.
  regressions:
    - >-
      NEW this round and introduced BY the round: `runCertWorstCase` now strands its
      one-shot deferral. With the level half gated, an endless press with the tier not
      already Mid still sets `defer = true` (the tier half) and latches
      `certPendingRef.current = true`, but the consumer effect requires
      `levelId === 'level-03'`, which nothing in endless can now supply. Measured end to
      end in this process: endless at W2 → press `Cert WC` (tier Auto) → 0 injections, run
      correctly recorded `{mode:'endless', wave:2, outcome:'abandoned'}` and restarted at
      W1 → then walk `Lv` through `PLAYABLE_LEVEL_ORDER` → ONE `injectCertWorstCase` call
      lands on the campaign `level-03` session that never pressed the button. `__DEV__` /
      `CERT_HARNESS` only, and the ops document's standing "restart the app and take the
      reading again" instruction happens to clear it — which is why it is folded into
      gap 2 rather than raised as its own blocker.
gaps:
  - truth: >-
      An endless run that has ENDED leaves a single coherent state: after the run boundary
      has fired, nothing the loop produces moves the run's own numbers — not the wave, and
      not the score, lives or combo the Results overlay is displaying (11-13 must_have
      truth 2, "`applyChrome` has ONE latch and every run-boundary branch consults it";
      the post-condition half of 11-09 must_have truth 2, "the post-condition is a single
      coherent state"; carried from round-2 gap 3)
    status: partial
    reason: >-
      The half round 2 specified is genuinely done and I proved it by mutation rather than
      by reading: `if (runEndedRef.current) { return; }` is the first statement of the
      endless WON branch (PlayingHost.tsx:976), it returns rather than falling through,
      `failEndlessStart` clears `waveAdvanceInFlightRef`, and deleting the latch turns SIX
      behaviour/contract cases red across two files. Every item in round 2's gap-3
      `missing[]` was executed. The truth still does not hold, because the latch guards
      the BRANCH and the run's numbers are written ABOVE it.
      `applyChrome` opens with five unconditional writes — `setSimPhaseNum(mirror.phase)`,
      `setLives`, `setScore`, `setCombo`, `setStallTier` (:936-940) — and only then tests
      the mode and the latch. `score`, `lives` and `best` are the same host state
      `GameScreen` hands the real `ResultOverlay` (`src/runtime/GameScreen.tsx:188-197`),
      so a straggler mirror repaints a finished run's panel.
      MEASURED in this process, on the real host through this repo's own
      `PlayingHost.endless-record` harness with the real `ResultOverlay` mounted (scratch
      probe, since deleted; working tree left clean):
      recorded `{"mode":"endless","wave":2,"score":2400,"outcome":"lose"}`;
      overlay after the loss `Lose / Out of lives / Wave · 2 / Score · 2400 / Best · 2400 /
      Best wave · 2 / New Record`; then ONE straggler `WON` mirror at
      `{lives: 3, score: 9999}` gives `Lose / Out of lives / Wave · 2 / Score · 9999 /
      Best · 2400 / Best wave · 2 / New Record`, with the host props at
      `{score: 9999, lives: 3}`. A player is shown a 9999 sitting above a `Best · 2400` and
      a `New Record` badge, for a run filed at 2400, under an "Out of lives" heading with
      three lives.
      This is exactly the harm class 11-13's own source comment names as what it closes —
      "a self-contradicting overlay" — and it is one of the three harms round-2 gap 3
      enumerated. So this is not new scope: it is the same carried-forward truth, closed at
      one producer and open at another.
      SEVERITY, scoped honestly and to the same standard round 2 applied: nothing false
      reaches telemetry. `recordRunEnd` stays at 1 across the straggler, `advanceWave` does
      not fire, no board is rebuilt, and `isNewRecord` / `best` / `bestWave` are set at
      `handleRunEnded` and are untouched by `applyChrome`. The RECORD is right; the run's
      final score beneath it is wrong. Reachability is the same producer 11-13 accepted as
      real when it fixed the wave walk — a straggler frame in the stop window — and
      `11-REVIEW.md` CR-01 is correct in saying that if it is real enough to walk the wave
      it is real enough to rewrite the score. I verified CR-01's claim independently before
      accepting it; the review's line numbers and its measured figures both hold.
      NOT ENDLESS-ONLY, stated so the fix is scoped once: the same five writes precede the
      campaign WON and LOST branches too, so a campaign Results panel has the identical
      exposure. The chrome-write hoist closes both.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 934-940: `applyChrome` writes `setSimPhaseNum`, `setLives`, `setScore`,
          `setCombo`, `setStallTier` from the mirror before any latch or mode test. The
          11-13 latch at :976 is inside the endless WON branch and therefore cannot reach
          them. `runEndedRef` is the function's single latch in intent, but the state the
          boundary owns is written above it.
      - path: "src/runtime/GameScreen.tsx"
        issue: >-
          Lines 188-197: `ResultOverlay` reads the LIVE `score` / `lives` host state rather
          than a boundary snapshot, so the overlay has no defence of its own against a
          post-boundary chrome write.
      - path: "tests/ui/PlayingHost.endless-retry.test.tsx"
        issue: >-
          The three new gap-3 drives (:884, :922, :969) deliver the post-boundary straggler
          carrying the SAME score as the boundary mirror
          (`deliverPhase(SIM.LOST, { lives: 0, score: 2400 })` then
          `deliverPhase(SIM.WON, { score: 2400 })`), so every assertion is about the wave
          readout, `advanceWave`, `boardFingerprint()` and `recordRunEnd`. They prove what
          they claim and are mutation-killed, but they are structurally incapable of seeing
          the chrome half. This is the same blind-spot shape as round 2's `previousBestRef`
          contract: the instrument was pointed one symbol away from the defect.
    missing:
      - >-
        Hoist the latch above the chrome writes so an ended run's numbers are frozen:
        make `if (runEndedRef.current) { return; }` the FIRST statement of `applyChrome`
        (:935), ahead of `setSimPhaseNum`. Safe against lock-out, and this was checked
        rather than assumed: every path that begins or resumes a run clears `runEndedRef`
        before re-arming the loop — `startEndlessRun`'s success path, `onRetry`'s campaign
        branch (:1396), `remountDevSession`'s campaign branch (:1602's block),
        `toggleDevLevel`'s exit (:1553) — `failEndlessStart` is terminal by design, and
        `handleMenuPress` unmounts the host.
      - >-
        If the HUD behind the overlay is wanted live for some reason, the alternative is a
        `resultScore` / `resultLives` pair snapshotted at the boundary and handed to
        `ResultOverlay` in place of the live chrome. Pick one; do not leave the overlay
        reading mutable state.
      - >-
        Give the straggler a DISTINGUISHABLE payload in the three existing gap-3 drives so
        the chrome half is measurable at all:
        `deliverPhase(SIM.LOST, { lives: 0, score: 2400 })` then
        `deliverPhase(SIM.WON, { lives: 3, score: 9999 })`, asserting
        `hostProps.current?.score` is 2400 and `lives` is 0. Measured pre-fix: 9999 and 3.
      - >-
        Add the RENDERED sibling in `tests/ui/PlayingHost.endless-record.test.tsx`, where
        the real `ResultOverlay` is mounted in `result-slot`: after the same two mirrors,
        assert the slot still contains `Score · 2400` and does not contain `9999`. Measured
        pre-fix: the slot goes `Score · 2400` → `Score · 9999` while still reading
        `Best · 2400` and `New Record`. A source contract must not stand in for this one —
        the prop-tier assertion and the render are both wanted, for the reason 11-12 gives
        in its own contract comment.
      - >-
        Extend the `applyChrome` source contract added by 11-13 so it covers the function
        PREAMBLE as well as the branches: assert that no `set*(mirror.` write occurs before
        the first `runEndedRef` reference. The existing contract counts branches, and every
        branch passes it today while the defect sits above all of them.
  - truth: >-
      docs/ops/ENDLESS-MODE.md states only mechanisms the shipped code implements, and the
      SC-5 discharge procedure never tells a human operator something false and never omits
      a real hazard (11-14 must_have truths 2 and 4; the 11-12/11-13/11-14 prohibition
      "MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md that the shipped code does
      not hold"; carried from round-2 gap 2)
    status: partial
    reason: >-
      Most of this truth is delivered, and the part that is delivered is the part that
      mattered most. Both round-2 false mechanisms are gone: the glow-atlas re-bake claim
      is withdrawn under a dated amendment that keeps the superseded text visible, states
      the measured call count, names `loadKey` and the bake deps, and explicitly instructs
      the operator NOT to discard a reading for that reason (:455-470); the `Cert WC`
      bullet is split by `tierOverride`; the boundary table gains a `Cert WC` row (:261);
      the record-first sentence carries its counterexample reasoning (:291-300); and
      11-11-SUMMARY's unperformed verification is corrected beside itself rather than
      silently repaired. I re-measured the glow-atlas facts and they hold.
      Two things in the same block are still not true of the shipped code, and both are on
      the SAME branch — the one an operator who has been cycling the tier will hit.
      (1) ENDLESS-MODE.md:433-435 opens the `Cert WC` bullet unconditionally: "still
      **injects the worst-case ball, particle and shake load onto the board under
      measurement**, which alone disqualifies any frame time captured across it". MEASURED
      on the real host: with the tier already Mid the press does inject —
      `injectCertWorstCase` calls 0 → 1, run still live, nothing recorded. With the tier
      NOT already Mid — the branch the very next sub-bullet describes — `defer` is set and
      the function returns at :1684 BEFORE `injectCertWorstCase()`: measured 0 injections.
      The sentence is false for half the control it describes, in the one block this
      document exists to make trustworthy. It is the same defect shape as the withdrawn
      re-bake claim, one branch narrower.
      (2) The hazard that IS on that branch is undocumented, and 11-14 created it. With the
      level half gated, the tier half still sets `defer = true`, so
      `certPendingRef.current = true` latches (:1683) while the consumer effect's
      `levelId === 'level-03'` precondition is now unreachable from endless. MEASURED end
      to end: endless at W2, tier Auto → press `Cert WC` → 0 injections, run recorded
      `{mode:'endless', wave:2, outcome:'abandoned'}` and restarted at W1 (all correct) →
      then walking `Lv` through `PLAYABLE_LEVEL_ORDER` (`level-01 → 04 → 05 → 06 →
      level-03`) fires ONE `injectCertWorstCase` on a campaign session that never pressed
      the button. Round-3 code review WR-01 reports this; I reproduced it rather than
      adopting it.
      SEVERITY, and why this is `partial` rather than the blocker round 2 raised: the
      OPERATOR ACTION is unchanged and conservative either way — "do not press it, and if
      you do, restart the app and take the reading again" (:474-475) is correct on both
      branches, and the restart is what clears the stranded one-shot. `runCertWorstCase`
      is `__DEV__` / `CERT_HARNESS` only, so no player can reach it, and Phase 14 deletes
      the dev row. It is raised as a gap and not an advisory for one reason: this document
      asserting a mechanism the code does not implement is the specific failure this phase
      has now written into three consecutive plans as a prohibition, and the whole point of
      round 2's finding was that the next reader trusts the prose over the code.
    artifacts:
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Lines 433-435, the `Cert WC` lead-in inside § Limits item 2: the injection claim
          is unconditional and is false on the tier-not-already-Mid branch (measured 0
          injections). The bullet then correctly splits by branch immediately below it,
          which makes the lead-in the only unscoped sentence in an otherwise re-measured
          block.
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Lines 436-447 and the boundary-table row at :261 describe the tier-not-Mid branch
          as a clean record-and-restart. It is that, and it also leaves an armed one-shot
          behind. Neither location says so.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 1676-1687: `runCertWorstCase` arms `certPendingRef.current = true` on a
          `defer` whose preconditions 11-14's own mode gate made unreachable while endless.
          The gate removed the trigger but not the latch.
    missing:
      - >-
        Prefer the CODE fix over the documentation fix, because it deletes the hazard
        instead of describing it: do not arm a deferral whose preconditions cannot be met.
        `if (defer) { certPendingRef.current = modeRef.current !== 'endless'; return; }`,
        with a line comment saying why (line comments only in that function — see its own
        note at :1641-1645). Then add a case to the existing
        `'PlayingHost — Cert WC carries a mode term'` describe: press `Cert WC` in endless
        with the tier unset, walk `Lv` to `level-03`, assert `injectCertWorstCase` is never
        called. Measured pre-fix: exactly one call, on walk step 4.
      - >-
        Scope the injection sentence at ENDLESS-MODE.md:433-435 to the branch it is true
        of. Suggested shape, matching what was measured: the press injects the worst-case
        load only when the tier is ALREADY `mid` (measured: `injectCertWorstCase` 0 → 1,
        the run stays live); when the tier is not already Mid the function returns at its
        `defer` branch and injects NOTHING — the reading is disqualified on that branch
        because the run under measurement was recorded `abandoned` and restarted at wave 1,
        not because of the injection.
      - >-
        Keep the do-not-press warning and the "restart the app and take the reading again"
        instruction exactly as they stand. Both reasons that survive are real, and the
        restart is also what clears the stranded one-shot if the code fix is deferred.
      - >-
        If the code fix is NOT taken, the stranded one-shot must be written into both the
        § Limits item 2 bullet and the `Cert WC` boundary-table row, because an operator
        who presses it and does not restart will take a later campaign reading across an
        injection they did not ask for.
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05) and
      ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from
      round 2.
  - truth: "A permanent endless record surface, and electing which of bestScore / bestWave is THE record"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 SC-1/SC-2. ENDLESS-MODE.md § Limits item 4 records it, and 11-08
      deliberately ships the endless Results overlay as the only endless-record reader
      without electing a primary record (A-08). Carried forward unchanged from round 2.
  - truth: "Endless bricks draw an unstretched glow halo (ENDLESS_BRICK_DIMS / A-04)"
    addressed_in: "Phase 14"
    evidence: >-
      Owner-decided accepted debt of 2026-09-26, recorded in ENDLESS-MODE.md § Flagged
      assumptions A-04 and § Limits item 7 with the measured 0.77x / 0.85x stretch.
      Re-verified untouched this round: `loadKey` is still brick dimensions alone and the
      bake effect deps are unchanged, confirmed while measuring gap 2's withdrawn re-bake
      claim. Carried forward.
advisory:
  - finding: >-
      `toggleDevLevel` republishes the OUTGOING level's campaign best as the INCOMING
      level's `Best`. `setLevelId(next)` runs at the top of the function; the new
      `setResultBest(previousBestRef.current)` at :1548 reads a cache that still holds
      `getBestForLevel(levelId)` for the level being LEFT, and the preload effect's re-run
      for the new level is asynchronous — which is the whole premise of the 11-12 fix.
      The value published is mode-correct and level-wrong.
    category: architectural
    reason: >-
      Structurally confirmed (setLevelId precedes the publication by ~36 lines inside one
      synchronous callback) and raised by 11-REVIEW WR-03. Advisory, not a gap: it is
      campaign-to-campaign, it touches no success criterion, `best` reaches only
      `ResultOverlay`, and `toggleDevLevel` sets `result` to `null` in the same commit, so
      nothing renders it today. It is latent for precisely the reason WR-04 was latent
      before 11-11, and Phase 14's mid-run record surface is what makes it visible. The
      new test cannot see it by construction: the harness mock is
      `getBestForLevel: (id) => getBestForLevelImpl(id)` where every implementation ignores
      `id` and returns one module-level `campaignBest`
      (endless-record.test.tsx:339-341, :376). Durable fix: a per-level cache
      (`bestByLevelRef.current[levelId] = b` in the preload effect; publish
      `bestByLevelRef.current[next]` in `toggleDevLevel`) and a mock that honours its
      argument.
    evidence_status: "structural only — no deterministic failing artifact, since nothing renders the value today"
  - finding: >-
      Two new lint warnings, both introduced this round, both in test code:
      `Array type using 'ReadonlyArray<T>' is forbidden. Use 'readonly T[]' instead`
      at tests/ui/PlayingHost.endless-host.test.ts:367 and :372.
    category: other
    reason: >-
      Measured in this process: `npx eslint` on the four changed source/test files reports
      0 errors and exactly 2 warnings. `eslint --fix` on that file, or
      `const endlessOnly: readonly (readonly [string, string])[]`. Cosmetic; raised because
      the round otherwise leaves the changed set at zero warnings.
    evidence_status: "measured (eslint), non-blocking by severity"
  - finding: >-
      `runCertWorstCase` now carries a formatting constraint imposed by a test regex — it
      documents at :1641-1645 that it may use `//` comments only, because `codeOnly()` in
      tests/ui/PlayingHost.endless-host.test.ts:28-30 strips line comments but not block
      comments, so a `/** */` note could satisfy or falsify a structural contract with
      prose.
    category: architectural
    reason: >-
      A real hazard, correctly identified and honestly disclosed at the call site. But the
      remedy puts the burden on every future author of that function rather than on the
      instrument. Strip block comments in `codeOnly()` as well, then delete the constraint.
      Raised by 11-REVIEW IN-02; confirmed at source. Non-blocking.
    evidence_status: "structural only — no failure exists today"
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready
      without a frame spike that breaks the Mid budget
    test: >-
      Launch a dev build; arm the perf overlay; press the `Endless` button in the `__DEV__`
      dev row on the playing HUD; play waves 1 through 5; watch each transition
      specifically — the moment the last brick of a board breaks and the next board
      appears. Do not press the tier button or `Cert WC` during the reading. `Lv` is safe
      as of 2026-09-26 (it is now an explicit exit that ends the run visibly). Two
      corrections to carry into the procedure as ENDLESS-MODE.md stands today: the
      glow-atlas re-bake reason is correctly WITHDRAWN there as of this round — do not
      discard a reading for it; but the `Cert WC` bullet's opening "still injects the
      worst-case load" is true only when the forced tier is ALREADY Mid (gap 2), and on the
      other branch the press leaves an armed one-shot that fires on a later `level-03`
      campaign session — so if you press `Cert WC` at all, restart the app before taking
      any further reading, campaign or endless.
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no
      `[audio] preload soft-fail` line in the log mid-run; frame times stay inside the Mid
      budget across each transition (p50 <= 16.7 ms, p95 <= 20 ms). The stretched glow halo
      on every brick is EXPECTED and ACCEPTED (A-04) — not a fifth failure signature.
    why_human: >-
      No automated step in this repo can produce a frame on hardware. Everything proven so
      far shows only that the bake/audio-preload COLD PATH IS NOT ENTERED at a transition —
      a source-level argument plus a jsdom observation. The 0.56 ms generate+compile figure
      is a Node microbenchmark scaled by a 15.5x Hermes ratio that itself came from a
      simulator, not a device. "No device available" is a valid outcome: leave the OPEN
      block in docs/ops/ENDLESS-MODE.md § Limits item 2 exactly as it stands, and leave
      N-END-03 unchecked.
human_verification:
  - test: >-
      E1 overflow (backstop, carried by 11-09 and re-carried by 11-12): render the endless
      Results panel at a 7-digit score and a 4-digit wave on a real 320px-wide panel and
      look at the metric rows and the `Best ·` / `Best wave ·` pair.
    expected: "No wrap and no clipping on any of the six contract lines or the two CTAs."
    why_human: >-
      jsdom computes no layout, so no test this repo can run observes wrap or clipping. The
      ~28-monospace-character fit 11-UI-SPEC derives is that document's own arithmetic, not
      a rendering; asserting the character budget would convert a backstop into a false
      `covered`. 11-09 marks this `verification: backstop`, and 11-11 and 11-12 both
      explicitly decline to discharge it. Abstained rather than inferred.
  - test: >-
      E3 overflow (backstop, carried by 11-11 and re-carried by 11-13): render the HUD
      strip during an endless run at a 7-digit score and a 3-digit combo, on the shipped
      48px row.
    expected: "The 48px HUD row neither wraps nor clips; score, combo and lives all readable."
    why_human: "Same reason as E1 — no layout engine in the test environment. Abstained."
---

# Phase 11: Endless Mode Verification Report

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T18:15:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure round 3 (plans 11-12, 11-13, 11-14). This report REPLACES the round-2 report; its gap list is superseded.

## Goal Achievement

**The round-2 verdict was "neither inflation nor loss — but the record can be *wrong on screen*."
The wrong-record-on-screen harm is closed. A narrower sibling of it is not: the record is right,
and the run's own score above it can still be rewritten after the run is over.**

*Gap 1 is genuinely closed, and closed with the instrument round 2 demanded.* `resultBest` now has
exactly one mode-aware publication rule. The `getBestForLevel` preload effect gates both of its
publications on `modeRef.current !== 'endless'` while leaving the campaign PB cache assignment
unconditional, and `toggleDevLevel` republishes that warm cache synchronously on the endless exit
so the endless watermark cannot stand in as a campaign record during the gap. I did not take this
from the SUMMARY: I deleted the success-arm guard and watched the closing behaviour case go RED
with the mounted slot reading `Best · 7777`, then restored it and re-drove the same scenario in my
own process — the endless overlay opens at `Best · 2400` and stays there when the held campaign
read lands. The WR-04 source contract that was blind to this is re-pointed at `setResultBest` call
sites, enumerates eight named mode-scoped regions, asserts guard-precedes-publication ordering,
and opens by saying in its own words that it proves the write rule and not the render. That is the
correction round 2 asked for, made in the right order.

*Gap 3's wave half is closed and is the most heavily pinned change in the round.* Deleting the
one-line latch turns six cases red across two files, including the four-pair walk and the
failed-START copy case. Re-driven here: a straggler WON after a LOST builds no board, does not
call `advanceWave`, and does not move the readout. `failEndlessStart` now clears the advance
guard, so all three ended-run states share one post-condition.

*What is still true instead, and it is the same truth one producer over.* `applyChrome` writes the
run's five chrome values from the mirror BEFORE it consults anything — mode, phase or latch. The
latch 11-13 added is the first statement of the endless WON *branch*, at line 976; the writes are
at 936-940. `score` and `lives` are the very props `GameScreen` hands the mounted `ResultOverlay`.
I verified 11-REVIEW's CR-01 against the source before accepting it and then measured it myself:
a run banked at `{wave: 2, score: 2400, outcome: "lose"}` opens its overlay at `Score · 2400 /
Best · 2400 / New Record`, and one straggler mirror turns that into `Score · 9999` above the same
`Best · 2400` and the same `New Record` badge — under an "Out of lives" heading, with lives back
at 3. 11-13's own source comment names "a self-contradicting overlay" as the defect it closes, and
round-2 gap 3 listed it as one of the three harms. The record is right; the number the player reads
next to it is not. Under "a record worth chasing" that is the same class of harm round 2 blocked
on, one field narrower — so it blocks again, and the fix is one hoisted statement.

*The documentation round is the strongest work in the phase, and it stops one sentence short.*
Both round-2 false mechanisms are gone, withdrawn under a dated amendment that leaves the
superseded text visible and tells the operator explicitly not to discard a reading for the reason
it once gave. `Cert WC` has a boundary-table row, the record-first sentence carries its
counterexample reasoning, and 11-11-SUMMARY's unperformed "verified against source" is corrected
beside itself rather than repaired away. But the `Cert WC` bullet still opens with an
unconditional injection claim that I measured to be false on one of the two branches it then
enumerates — and on that same branch 11-14's own mode gate created a new hazard the document does
not mention: an armed one-shot that fires `injectCertWorstCase` on a later campaign `level-03`
session. I measured that end to end rather than adopting the review's report of it. The operator's
instruction is unchanged and conservative either way, which is why this is the smaller of the two
gaps — but a prohibition this phase has now written into three consecutive plans is not satisfied
by "mostly true."

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC-1 / N-END-01) Clearing a board advances to the next generated one in the same run; lives, score and combo carry; the run ends only at zero lives | ✓ VERIFIED | `applyChrome:941-975` intercepts endless WON ahead of every run-end branch and returns; `endless.wave-loop.test.ts` + `PlayingHost.endless-run.test.tsx` pass in the clean 633-test suite. Reservation: the converse's chrome half is truth 16 |
| 2 | (SC-2) Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel | ✓ VERIFIED | `src/services/endless/ramp.ts` + `tests/endless.ramp.test.ts`; `ENDLESS-MODE.md` § The wave → difficulty ramp documents it including the clamp rationale (D-01). Untouched this round |
| 3 | (SC-3 / N-END-02, storage) Endless records stored separately; `previousBestRef` is never written by an endless run; campaign bests, stars and unlocks untouched | ✓ VERIFIED | `PlayingHost.tsx:721-812` — the mode branch precedes `evaluatePersonalBest`; `previousBestRef.current = best` exists only in the campaign arm (:812); the endless `recordRunEnd` arm is a union member with no `levelId`, so the campaign write is unreachable, not merely skipped |
| 4 | (SC-4 / N-END-03, headless half) A seeded endless run is reproducible end to end | ✓ VERIFIED | `tests/endless.determinism.test.ts` + `tests/levelgen.determinism.test.ts` pass; § Limits item 1 correctly scopes the claim to a fixed input policy and refuses the device-replay reading |
| 5 | (SC-5 / N-END-03, device half) Wave transitions do not stall the loop — no frame spike outside the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Device-gated and scope-fenced by all three round-3 plans. § Limits item 2 stays OPEN; N-END-03's unchecked box is CORRECT. See `behavior_unverified_items` |
| 6 | (11-12 / gap 1) `resultBest` has exactly ONE mode-aware publication rule, and a campaign best that resolves late never reaches the rendered endless `Best ·` | ✓ VERIFIED | Guards at `PlayingHost.tsx:477` and `:487`. MUTATION-KILLED: removing the success guard turns the closing behaviour case RED at `Best · 7777`. Independently re-driven: overlay mounted at `Best · 2400`, held campaign read landed, slot and `host-best` both stay 2400 |
| 7 | (11-12) The campaign per-level best cache stays warm while endless is live, so the campaign `Best` is correct the moment the player exits, with no storage round trip | ✓ VERIFIED | `previousBestRef.current = b` / `= 0` remain unconditional at `:469` / `:485`; the `setResultBest` contract asserts the assignment count equals the publication count, so a guarded cache write would be red |
| 8 | (11-12 / IN-03) Leaving endless through `Lv` republishes the campaign best synchronously | ✓ VERIFIED | `toggleDevLevel:1548`. The test holds the next storage read PENDING across the press, so only the synchronous path can satisfy it |
| 9 | (11-12) The WR-04 contract targets `setResultBest` — the symbol that reaches the screen — and states in its own comment what counting call sites does NOT prove | ✓ VERIFIED | `endless-host.test.ts:329-464`: eight named regions, non-empty-first anchors, per-region source whitelists, guard-precedes-publication ordering, and an opening comment naming the behaviour case that proves the render |
| 10 | (11-12) The A-01 retry-in-place liveness case asserts something the press CAUSES | ✓ VERIFIED | `endless-record.test.tsx:1090-1099` asserts `compileCalls` strictly increases across the press. Round-2 advisory 1 closed |
| 11 | (11-12) `N-END-02`'s checkbox is correct rather than optimistic — unchecked while the leak was open, re-ticked on round-3 rendered evidence | ✓ VERIFIED | Commits `55d29a4` (revert to `[ ]`) then `aeafc45` (re-tick); `.planning/REQUIREMENTS.md:178` is `[x]` with a dated round-3 closure note naming the driven render and its falsifier |
| 12 | (11-13 / gap 3, wave half) After the run boundary has fired, no branch regenerates a board, calls `advanceWave()` or moves the wave number | ✓ VERIFIED | `PlayingHost.tsx:976`. MUTATION-KILLED: deleting the latch turns 6 cases red across `endless-retry` and `endless-host`. Re-driven: straggler WON after LOST leaves `advanceWave` at its pre-boundary count and the board unchanged |
| 13 | (11-13) The endless WON branch RETURNS rather than falling through to the campaign WON branch | ✓ VERIFIED | `return;` at `:977`, with the SC-1 reasoning in the source comment; the campaign WON branch below is unreachable from an endless WON |
| 14 | (11-13) All three ended-run states — LOST, mid-run wave-build failure, failed START — leave the same post-condition including the wave-advance guard | ✓ VERIFIED | `failEndlessStart` now sets `runEndedRef.current = true` AND `waveAdvanceInFlightRef.current = false` alongside `setResult('lose')`; the other two already did |
| 15 | (11-13) A failed START keeps the owner-decided Retry-time copy — a later WON cannot rewrite `waveBuildFailedWave` 1 → 2, and `Wave · 0` is never rendered | ✓ VERIFIED | Case `'a failed START stays ended — one WON mirror cannot rewrite the decided tap-Retry copy (gap 3, case c)'`; mutation-killed by M2 |
| 16 | (11-13 truth 2 / 11-09 truth 2 / carried gap 3) An ENDED endless run leaves a single coherent state — the latch covers the CHROME, not only the branch | ✗ FAILED | `applyChrome:936-940` writes score/lives/combo/phase/stallTier above the latch at `:976`; `ResultOverlay` reads those live props. MEASURED: overlay goes `Score · 2400` → `Score · 9999` above `Best · 2400` and `New Record`, for a run banked at 2400. See gap 1 |
| 17 | (11-14 truths 2+4 / carried gap 2) ENDLESS-MODE.md states only mechanisms the shipped code implements; the SC-5 procedure omits no real hazard | ✗ FAILED | `:433-435` claims `Cert WC` injects the worst-case load unconditionally; MEASURED 0 injections on the tier-not-Mid branch (1 on the tier-Mid branch). And 11-14 stranded a one-shot on that branch which fires later on campaign `level-03` — undocumented. See gap 2 |
| 18 | (11-14 truth 1) `runCertWorstCase` carries a mode term; it can no longer strand a live endless run behind a stopped frame loop | ✓ VERIFIED | `PlayingHost.tsx:1676`. MUTATION-KILLED: removing the mode term turns both `Cert WC` cases red. Re-driven with tier already Mid — run live at W2, level unchanged, `recordRunEnd` 0, no `setActive(false)`. (The stranded FLAG is a different defect — truth 17) |
| 19 | (11-14 truth 3) The glow atlas's keying is stated explicitly where the false mechanism stood, so the error cannot be re-derived | ✓ VERIFIED | `ENDLESS-MODE.md:455-470` — measured call count 1 → 1, `loadKey` named as brick width and height alone, bake deps quoted, D-14 cited, § Limits item 7 cross-referenced. Re-measured at source this round |
| 20 | (11-14 truth 5) The run-boundary table lists EVERY control that can end, freeze or restart an endless run, `Cert WC` included | ✓ VERIFIED | `:261` — a full two-branch row with measured figures for each branch |
| 21 | (11-14 truth 6) The bolded record-first sentence is re-checked against the `Cert WC` row with the reasoning written down beside it | ✓ VERIFIED | `:291-300` — the counterexample is named, narrowed and answered (freeze, not discard; `runEndedRef` false so Pause → Menu still records) |
| 22 | (11-14 truth 7) 11-11-SUMMARY's claim that the glow-atlas mechanism was verified against source is corrected in place, not silently repaired | ✓ VERIFIED | `11-11-SUMMARY.md` gains a dated CORRECTION in both `key-decisions` and the deviations body; the original text is left standing and unedited, and the reusable failure is named |
| 23 | (11-14 truth 8) The SC-5 OPEN block survives intact — still OPEN, still naming the Mid budget and its four failure signatures, still refusing an untaken reading | ✓ VERIFIED | § Limits item 2 still OPEN; N-END-03 still `[ ]`; `git diff a20ad36..HEAD -- src/core src/levelgen` is EMPTY |
| 24 | (Backstop) E1 — 320px Results panel at a 7-digit score / 4-digit wave shows no wrap and no clipping | ? insufficient_spec | `verification: backstop`. jsdom computes no layout; the ~28-character fit is 11-UI-SPEC's arithmetic, not a rendering. Abstained → human |
| 25 | (Backstop) E3 — 48px HUD row at a 7-digit score / 3-digit combo shows no wrap and no clipping | ? insufficient_spec | Same. Abstained → human |

**Score:** 20/23 truths verified (1 present, behavior-unverified; backstop truths 24-25 route to
human and are excluded from the denominator).

Counted: verified = 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23 → 20.
Failed = 16, 17. Behavior-unverified = 5. Human / insufficient_spec = 24, 25.
Round-2 score was 12/18; the denominator grew because round 3's three plans authored new truths
across their `must_haves`, merged here with the five roadmap Success Criteria.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Production endless entry point | Phase 14 | Phase 14 SC-1 'Title offers campaign, endless and daily as distinct entries'; the `__DEV__` Pressable carries a delete-in-14 comment |
| 2 | Permanent endless record surface; electing a primary record | Phase 14 | Phase 14 SC-1/SC-2; § Limits item 4; 11-08 A-08 deliberately refuses to elect |
| 3 | `ENDLESS_BRICK_DIMS` / the stretched glow halo | Phase 14 | Owner-accepted debt 2026-09-26; § Limits item 7 with the measured 0.77x / 0.85x stretch. Re-verified untouched: `loadKey` and the bake deps unchanged |

### Advisory (New Scope, Unevidenced or Non-Blocking)

| # | Finding | Category | Why Advisory |
|---|---------|----------|--------------|
| 1 | `toggleDevLevel` publishes the OUTGOING level's campaign best as the INCOMING level's `Best` (11-REVIEW WR-03) | architectural | Structurally confirmed. Campaign-to-campaign, touches no SC, and `result` is `null` in the same commit so nothing renders it today. Latent for the same reason WR-04 was; Phase 14's record surface makes it visible. The test mock ignores its `id` argument, so no case can see it |
| 2 | Two new lint warnings, both in test code (`ReadonlyArray<T>` at endless-host.test.ts:367, :372) | other | Measured: 0 errors / 2 warnings on the changed set. Cosmetic |
| 3 | `runCertWorstCase` carries a comment-style constraint imposed by a test regex (11-REVIEW IN-02) | architectural | Real hazard, honestly disclosed at the call site, but the burden belongs on the instrument (`codeOnly()`) rather than on every future author |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/PlayingHost.tsx` | One mode-aware `resultBest` publication rule; the shared latch on every boundary; `Cert WC` mode term | ⚠️ PARTIAL | 1859 lines. Gap-1 rule complete and mutation-pinned; gap-3 wave half complete and mutation-pinned; `Cert WC` mode term complete and mutation-pinned. Two residuals: the chrome writes at :936-940 sit above the latch (gap 1), and `certPendingRef` is armed on an unreachable deferral at :1683 (gap 2) |
| `docs/ops/ENDLESS-MODE.md` | Only mechanisms the code implements; `Cert WC` in the boundary table; SC-5 block OPEN | ⚠️ PARTIAL | 581 lines. The glow-atlas withdrawal, the branch split, the boundary row and the record-first reasoning are all delivered and re-measured. One unscoped injection sentence at :433-435 and one undocumented hazard (gap 2) |
| `tests/ui/PlayingHost.endless-host.test.ts` | Source contracts, self-labelled as such, targeting the causing symbol | ✓ VERIFIED | The `setResultBest` contract (:329-464) is the correction round 2 asked for: eight named regions, non-empty-first anchors, per-region source whitelists, ordering assertion, and an opening statement of what it does not prove. The older `previousBestRef` contract is KEPT rather than replaced |
| `tests/ui/PlayingHost.endless-record.test.tsx` | Real `ResultOverlay` in `result-slot`; the gap-1 driven render | ✓ VERIFIED | 23 cases. The gap-1 closer arms the deferral BEFORE the mount so the preload effect's own promise is the held one, asserts both the rendered slot and the `host-best` prop channel, and is mutation-killed |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | Behaviour cases for every run boundary and every ended-run state | ⚠️ PARTIAL | 26 cases; mutation-killed on both the latch and the `Cert WC` mode term. Blind to the chrome half by construction — all three gap-3 drives give the straggler the SAME score as the boundary mirror (gap 1) |
| `src/runtime/overlays/ResultOverlay.tsx` | `waveBuildFailureKind` boundary; endless copy; live Retry | ✓ VERIFIED | Untouched this round; 20 cases still pass |
| `src/runtime/GameScreen.tsx` | Hands the overlay the run's numbers | ⚠️ NOTED | Untouched this round. Passes LIVE `score` / `lives` to `ResultOverlay` (:188-197), which is the second half of gap 1's exposure |
| `.planning/REQUIREMENTS.md` | Checkboxes that match the evidence | ✓ VERIFIED | N-END-01 `[x]`, N-END-02 `[x]` with a dated round-3 closure note naming its falsifier, N-END-03 `[ ]` — correct, the device half is unmeasured |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `store.getBestForLevel(levelId)` | the host `best` prop | the preload effect, now mode-gated | ✓ WIRED | Publication gated at :477 / :487; cache assignment left unconditional at :469 / :485. Mutation-killed |
| `previousBestRef` | the campaign `Best` after an endless exit | `toggleDevLevel:1548`, synchronous | ✓ WIRED | Proven with the next storage read held pending, so only the synchronous path can satisfy it |
| every `setResultBest(` call site | the WR-04 source contract | eight named mode-scoped regions | ✓ WIRED | Re-pointed at the causing symbol; the round-2 contract's blind spot is gone |
| `runEndedRef` | every `applyChrome` run-boundary BRANCH | the shared latch | ✓ WIRED | Endless WON, campaign WON, campaign LOST and the mid-run build failure all consult it |
| `runEndedRef` | the run's own CHROME (`score` / `lives` / `combo` / phase) | — | ✗ NOT_WIRED | The five writes at :936-940 precede every latch and mode test in the function. This is gap 1 |
| host `score` / `lives` state | the mounted endless `ResultOverlay` | `GameScreen:188-197` | ⚠️ PARTIAL | Wired and flowing, but from MUTABLE live chrome rather than a boundary snapshot, so an ended run's panel repaints |
| `runCertWorstCase` level half | `setLevelId` → the preload effect | the mode gate | ✓ WIRED (severed by design) | The trigger end of the round-2 gap-1 defect is shut; mutation-killed |
| `runCertWorstCase` `defer` | `certPendingRef` → the deferred-inject effect | `levelId === 'level-03' && tierOverride === 'mid'` | ✗ NOT_WIRED while endless | The flag arms on a precondition 11-14 made unreachable, and discharges later on an unrelated campaign session. Folded into gap 2 |
| `ENDLESS-MODE.md` § boundary table | the shipped run-boundary set | documentation ↔ code | ✓ WIRED | Every control that can end, freeze or restart a run now has a row, `Cert WC` included |
| `ENDLESS-MODE.md` § Limits item 2 | the SC-5 human operator | the discharge procedure | ⚠️ PARTIAL | The withdrawn glow-atlas reason is correct and clearly flagged; one injection sentence is unscoped and one hazard is unmentioned (gap 2) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ResultOverlay (endless `Best ·`) | `best` ← `resultBest` | `endlessBestScoreRef` / merged `recordRunEnd` blob | Yes | ✓ FLOWING — the second, campaign writer is gone. Re-measured: stays 2400 with a late 7777 campaign read landing on the mounted overlay |
| ResultOverlay (endless `Best wave ·`) | `bestWave` ← `resultBestWave` | `endlessBestWaveRef` ← merged blob | Yes | ✓ FLOWING |
| ResultOverlay (`Wave ·`) | `wave` ← `resultWave` | `waveRef` snapshot at `handleRunEnded` | Yes | ✓ FLOWING — frozen at the boundary, and the latch now keeps the readout behind it frozen too |
| ResultOverlay (`Score ·`) | `score` (live host chrome) | `applyChrome:938`, every mirror | Yes | ⚠️ HOLLOW after the boundary — a straggler rewrites it; measured 2400 → 9999 above an unchanged `Best · 2400` and `New Record` (gap 1) |
| ResultOverlay (body copy) | `waveBuildFailedWave` | `failEndlessStart` (1) / `applyChrome` (`waveRef+1`) | Yes | ✓ FLOWING — the latch stops a post-end WON rewriting 1 → 2; round-2's `Wave · 0` regression is closed |
| dev-row `W{n}` readout | `wave` state | `advanceToWave` | Yes | ✓ FLOWING — no longer walks on an ended run |
| `telemetry.endless.bestWave` / `bestScore` | merged watermark | `store.recordRunEnd` endless arm, `Math.max` fold | Yes | ✓ FLOWING — and re-measured unreachable from any post-boundary mirror (`recordRunEnd` stays at 1) |

### Behavioral Spot-Checks

All run in THIS process against the real `PlayingHost`, through its own chrome bridge, with real
`generate`, real `compileGeneratedLevel` and the real `ResultOverlay` mounted where noted. A
scratch probe file was created in `tests/ui/`, executed, and REMOVED; `git status` confirms no
source or test file is modified.

| # | Behavior | Result | Status |
|---|----------|--------|--------|
| P1 | Full workspace suite, run ONCE | `97 files / 633 tests, 633 passed` | ✓ PASS |
| P2 | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| P3 | `npx eslint` on the 4 changed source/test files | 0 errors, 2 warnings (both new, both `ReadonlyArray<T>`) | ⚠️ advisory 2 |
| P4 | `git diff a20ad36..HEAD -- src/core src/levelgen` | empty | ✓ PASS — the freeze holds |
| P5 | **CR-01 drive** — endless LOST at W2 score 2400, then ONE straggler `WON {lives:3, score:9999}` | recorded `{"mode":"endless","wave":2,"score":2400,"outcome":"lose"}`; slot `Score · 2400 … Best · 2400 … New Record` → `Score · 9999 … Best · 2400 … New Record`; props `{score:9999, lives:3}`; `recordRunEnd` 1, `advanceWave` unchanged | ✗ FAIL (gap 1) — and the `advanceWave`/board half PASSES, confirming 11-13 |
| M1 | **Mutation** — delete `if (modeRef.current !== 'endless')` on the preload success arm | `'a campaign per-level best that resolves LATE never reaches the rendered endless Best ·'` FAILS (slot `Best · 7777`); 1 failed / 22 passed | ✓ KILLED — gap-1 fix is genuinely pinned |
| M2 | **Mutation** — delete `if (runEndedRef.current) { return; }` from the endless WON branch | 6 failed / 61 passed across `endless-retry` + `endless-host`: the latch contract, the WR-04 ended-run case, the LOST case, the WALK case, the mid-run-failure case, the failed-START copy case | ✓ KILLED — gap-3 wave half is heavily pinned |
| M3 | **Mutation** — delete `modeRef.current !== 'endless' &&` from `runCertWorstCase` | 2 failed / 42 passed — both `Cert WC` cases | ✓ KILLED |
| P6 | `Cert WC` during a live endless run, tier **Auto** | `inject 0`; `recordRunEnd` `[{mode:'endless', wave:2, outcome:'abandoned'}]`; readout → W1; tier button reads `Mid` | ✗ FAIL vs the doc's unconditional injection claim (gap 2) |
| P7 | …then walk `Lv` through `PLAYABLE_LEVEL_ORDER` on the ensuing CAMPAIGN session | `level-01 → 04 → 05 → 06 → level-03`; `injectCertWorstCase` fires ONCE, at `level-03`, on a run that never pressed the button | ✗ FAIL (gap 2) — the stranded one-shot, reproduced |
| P8 | `Cert WC` during a live endless run, tier **already Mid** | `inject 1`, `recordRunEnd` 0, mode still `endless`, level unchanged | ✓ PASS — 11-14's freeze fix holds; the doc's injection claim is true HERE and only here |
| P9 | Debt-marker gate over all 6 changed source/doc/test files | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` → zero hits | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repository and no plan declares one. Step 7c:
SKIPPED (no project probes). The behavioural spot-check table above is the substitute, and every
row in it was executed in this process rather than read from a SUMMARY or a review.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| N-END-01 | 11-13, 11-14 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ SATISFIED (with reservation) | `applyChrome:941-975` intercepts endless WON ahead of every run-end branch; the ENDED-run converse is now closed at the wave (M2). Reservation: the chrome half of the same post-condition is open (gap 1). The requirement text is about the run not ending early, and that holds; `[x]` is correct |
| N-END-02 | 11-12 | Endless records stored separately — endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED | Both halves now closed. Storage firewall verified and not regressed (truth 3); the DISPLAY leak round 2 blocked on is closed by a single mode-aware publication rule and pinned by a driven render (truth 6, M1). Round 2's routed owner reservation is discharged by evidence rather than by decision, and the box was correctly unticked and re-ticked (truth 11) |
| N-END-03 | 11-14 | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ⚠️ PARTIAL — correctly unchecked | Reproducibility half proven headlessly. Frame half device-gated and UNMEASURED; § Limits item 2 stays OPEN and the `[ ]` in REQUIREMENTS.md is CORRECT, not an omission. Gap 2 concerns the INSTRUMENT the operator uses, not the reading |

No orphaned requirements: `grep "N-END-0" .planning/REQUIREMENTS.md` maps exactly N-END-01/02/03,
and all three appear across round-3 plan frontmatter (11-12 → N-END-02; 11-13 → N-END-01;
11-14 → N-END-01, N-END-03).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` across all 6 changed files | — | NONE FOUND. Debt-marker gate passes cleanly |
| `app/_components/PlayingHost.tsx` | 936-940 | Mutable state written above the guard that is supposed to own it | 🛑 Blocker | Gap 1 — an ended run's Results panel repaints from a straggler mirror |
| `app/_components/PlayingHost.tsx` | 1683 | One-shot flag armed on a precondition made unreachable in the same change | 🛑 Blocker | Gap 2 (code half) — a deferred injection discharges on an unrelated later session |
| `docs/ops/ENDLESS-MODE.md` | 433-435 | Documentation asserting a mechanism unconditionally that holds on one branch only | 🛑 Blocker | Gap 2 (doc half) — inside the human discharge procedure |
| `app/_components/PlayingHost.tsx` | 1548 | Cross-level state publication from a per-mount cache | ⚠️ Warning | Advisory 1 — latent today, visible after Phase 14 |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | 884-1022 | Drives whose payload cannot distinguish the property from its neighbour | ⚠️ Warning | Why gap 1 survived this round; included in gap 1's `missing[]` |
| `tests/ui/PlayingHost.endless-host.test.ts` | 367, 372 | Lint warnings introduced this round | ℹ️ Info | Advisory 2 |
| `app/_components/PlayingHost.tsx` | 1641-1645 | Source formatting constrained by a test's parser | ℹ️ Info | Advisory 3 |

**Re-verification evidence gate (#3304):** all three blockers are evidenced by named, reproducible
measurements executed in this process (P5 and mutation M2 for gap 1; P6/P7/P8 for gap 2), and both
flagged files — `app/_components/PlayingHost.tsx` and `docs/ops/ENDLESS-MODE.md` — were
git-modified in this round. Gap 1 is additionally a CARRIED-FORWARD gap (round-2 gap 3's
"single coherent state" / "self-contradicting overlay"), so it blocks unconditionally. Gap 2 is
likewise carried forward (round-2 gap 2, the same document and the same § Limits item 2). Neither
rests on unevidenced new scope, so neither is downgraded to advisory. The three advisories above
ARE new scope and none carries a deterministic failure, so they are recorded and not counted.

### Human Verification Required

#### 1. E1 Results-panel overflow (backstop)

**Test:** Render the endless Results panel at a 7-digit score and a 4-digit wave on a real
320px-wide panel; look at the six contract lines and the two CTAs.
**Expected:** No wrap, no clipping.
**Why human:** jsdom computes no layout. The ~28-monospace-character fit is 11-UI-SPEC's own
arithmetic, not a rendering; asserting it would convert a backstop into a false `covered`.
11-09 marks it `verification: backstop`, and 11-11 and 11-12 both explicitly decline to discharge it.

#### 2. E3 HUD-row overflow (backstop)

**Test:** Render the HUD strip during an endless run at a 7-digit score and a 3-digit combo on the
shipped 48px row.
**Expected:** No wrap, no clipping; score, combo and lives all readable.
**Why human:** Same — no layout engine in any test this repo can run.

#### 3. SC-5 / N-END-03 device reading (standing item)

See `behavior_unverified_items` for the full discharge procedure. Two corrections to carry into it
against the document as it stands today: the glow-atlas reason is now correctly WITHDRAWN there —
do not discard a reading for it; but if you press `Cert WC` at all, restart the app before taking
any further reading of either mode, because on the tier-not-already-Mid branch the press leaves an
armed one-shot that fires on a later campaign `level-03` session (gap 2). The standing
"restart the app and take the reading again" instruction already covers this.

Round 2's fourth human item — the owner decision on N-END-02's `[x]` — is DISCHARGED and removed.
The display leak it was reserved against is closed and pinned by a driven render, and 11-12
correctly unticked the box while the leak was open and re-ticked it on that evidence.

### Gaps Summary

Two gaps. Both are the *last field* of a truth that is otherwise closed, and both are cheap.

**Gap 1 — the latch is one statement too low.** `applyChrome` was redesigned around "one latch,
every boundary", and 11-13 delivered exactly that at the branch tier: six cases die when the latch
is removed, the endless WON branch returns rather than falling through, and all three ended-run
states now share a post-condition. But the function's first five statements write the run's score,
lives, combo, stall tier and sim phase from the mirror unconditionally, and those are the props
`GameScreen` hands the mounted `ResultOverlay`. A run banked at 2400 can be shown as 9999 above
its own `Best · 2400` and a `New Record` badge. This is the same harm round-2 gap 3 named
("a self-contradicting overlay") and the same harm 11-13's own source comment claims to close, so
it is the carried gap rather than new scope. The fix is to hoist `if (runEndedRef.current)
{ return; }` to the first statement of `applyChrome` — checked for lock-out, and safe: every path
that begins or resumes a run clears the latch before re-arming the loop. The tests need one change
each: give the straggler a different score from the boundary mirror. That single payload change is
what turns three green cases into the red ones that would have caught this.

**Gap 2 — the document caught up with the code, and then the code moved.** The round-2 false
mechanisms are gone, and the withdrawal is exemplary: dated, superseding rather than erasing, with
the measured call count and the real bake key stated so the error cannot be re-derived, plus the
SUMMARY that claimed an unperformed verification corrected beside itself. What is left is one
unscoped sentence — `Cert WC` "still injects the worst-case load", measured true on the
tier-already-Mid branch and false (0 injections) on the other — and one hazard 11-14's own mode
gate created and did not write down: the level half is gated but the `defer` bookkeeping is not,
so `certPendingRef` arms on a precondition endless can no longer supply and discharges later on a
campaign `level-03` session. Both are on the same branch. Prefer the code fix
(`certPendingRef.current = modeRef.current !== 'endless'`) over the documentation fix, because it
deletes the hazard instead of describing it; then scope the injection sentence to the branch it is
true of. Keep the do-not-press warning and the restart instruction untouched — both surviving
reasons are real, and the restart is what clears the one-shot if the code fix is deferred.

**What is NOT a gap, stated so the next planner does not re-open it:** the endless `Best ·`
display leak (closed, mutation-pinned, and re-driven with the overlay mounted — this was round 2's
headline gap), the campaign PB cache staying warm, the synchronous republication on the endless
exit, the `setResultBest` contract re-point, the A-01 liveness assertion, the abandon funnel, the
atomic failed start, the Retry-chain inflation, the write-side mode firewall, the ended-run WAVE
walk (closed, six-case mutation kill), the `Cert WC` freeze (closed), the glow-atlas withdrawal
and its SUMMARY correction, the `Cert WC` boundary-table row, the record-first counterexample
reasoning, the `src/core` / `src/levelgen` freeze (empty diff), the SC-5 OPEN block and
N-END-03's unchecked box (both correct), and the `ENDLESS_BRICK_DIMS` halo (Phase 14,
owner-accepted, bake path re-verified untouched).

---

_Verified: 2026-09-26T18:15:00Z_
_Verifier: Claude (gsd-verifier)_
