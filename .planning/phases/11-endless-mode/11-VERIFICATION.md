---
phase: 11-endless-mode
verified: 2026-09-26T16:40:00Z
status: gaps_found
score: 12/18 must-haves verified
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
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/overlays/ResultOverlay.tsx"
  - "tests/ui/PlayingHost.endless-host.test.ts"
  - "tests/ui/PlayingHost.endless-record.test.tsx"
  - "tests/ui/PlayingHost.endless-retry.test.tsx"
  - "tests/ui/ResultOverlay.test.tsx"
covered_digest: "v1:sha256:03df5594178f1638ea66de77f80f4c59912ce6229a0ee8b361dbe8f51f0ceb72"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/14
  gaps_closed:
    - >-
      Gap 1 — "No in-flight endless run is silently discarded". The funnel moved INSIDE
      `startEndlessRun` (its first statement, PlayingHost.tsx:1200) and `toggleDevLevel`
      now calls it too (:1449). Driven through the real host: pressing the `__DEV__`
      `Endless` button at wave 2 records `{mode:'endless', wave:2, outcome:'abandoned'}`
      (measured pre-fix: 0 calls); the tier button records the same; `Lv` records and then
      exits to campaign so the NEXT loss lands on the campaign arm.
    - >-
      Gap 2 — "A run-boundary reset either starts a NEW run or leaves the run untouched".
      The seed is snapshotted and restored (`const prevSeed` / `runSeedRef.current = prevSeed`,
      :1240-1247) and the unpaired `waveRef.current = 1` is DELETED. `failEndlessStart()`
      now owns the failure post-condition, so the half-applied paused-on-wave-N state is
      gone: the post-condition is Results-up / `result='lose'` / Retry live, and the run
      that FOLLOWS a failed start is recordable. Both pinned by tests that a mutation kills.
    - >-
      Gap 3 — "A start that cannot build wave 1 presents the owner-decided copy with Retry
      live, from every entry path". `failEndlessStart()` (:1151-1167) flips `modeRef` AND
      `setMode('endless')`, raises `setResult('lose')` and republishes the ENDLESS watermarks
      BEFORE the readiness/build gates, so the A-01 copy renders on a fresh campaign mount —
      the path that previously did nothing and said nothing.
  gaps_remaining: []
  regressions:
    - >-
      WR-04 was only half closed. 11-11 removed `previousBestRef` from `startEndlessRun`,
      but the mount-time `getBestForLevel` effect (PlayingHost.tsx:460-477) is a SECOND,
      unconditional writer of `setResultBest`, with no mode term. Measured through the real
      host: `best = 7777` (a campaign level best) while `mode='endless'` at W2, and — the
      part no round has measured before — `best` flips from the endless watermark `4200` to
      the campaign `7777` while the endless Results overlay is MOUNTED (`result='lose'`,
      `mode='endless'`). The leak is rendered today, not merely latent for Phase 14.
    - >-
      `docs/ops/ENDLESS-MODE.md` acquired TWO new claims this round that the shipped code
      does not hold, both inside the SC-5 discharge procedure a human operator reads before
      taking the device measurement. (1) "the new quality budget re-bakes the glow atlas" —
      measured `bakeGlowSprites` calls before a tier press = 1, after = 1; `loadKey` is
      brick dimensions alone (`${w[0]}x${h[0]}`) and the bake effect deps are
      `[audio, haptics, glowAtlasSv, loadResult, loadKey]` with no tier term. (2) "`Cert WC`
      … the tier half restarts the run and re-bakes exactly as above" — `runCertWorstCase`
      sets the tier only `if (tierOverride !== 'mid')`, so with the tier already at Mid the
      run is neither restarted nor recorded. 11-11's own prohibition ("MUST NOT assert an
      invariant in ENDLESS-MODE.md that the shipped code does not hold") is violated by the
      very plan that wrote it, and 11-11-SUMMARY claims the re-bake mechanism was verified
      against source.
    - >-
      NEW, not raised by any prior round as a measured fact: `applyChrome`'s endless WON
      branch (PlayingHost.tsx:929) is the only run-boundary branch with no `runEndedRef`
      gate. After an endless run has ENDED, further WON mirrors keep regenerating boards and
      walking the wave. Measured: LOST at W2 records wave 2; four subsequent WON/DOCKED pairs
      take the readout to W6 with the lose overlay still up and the board swapped each time.
      It does NOT inflate the record (see `advisory` and the narrative) but it breaks the
      "ended run stays ended" post-condition 11-09 truth 2 asserts.
gaps:
  - truth: >-
      The host's `best` prop is never a campaign number at ANY moment in an endless run's
      lifetime — and a campaign level best is never rendered as the player's endless
      record (11-11 must_have truth 1 / WR-04; the 11-08 + 11-09 + 11-11 prohibition
      "MUST NOT display a record belonging to one mode as the player record of another mode")
    status: failed
    reason: >-
      Verified by driving the real host, not adopted from the review. 11-11 removed the
      `setResultBest(previousBestRef.current)` call from `startEndlessRun` and replaced it
      with `setResultBest(endlessBestScoreRef.current)` — that half is genuinely done and is
      pinned. But `resultBest` has a SECOND writer: the mount-time `getBestForLevel` effect
      at :460-477 calls `setResultBest(b)` unconditionally, with `[store, levelId]` deps and
      no mode term. Three measurements, all through the real `PlayingHost`:
      (1) with a deferred `getBestForLevel`, resolving it mid-run gives `best = 7777` while
      `mode='endless'` at W2; (2) with a SYNCHRONOUS store and no race at all, pressing
      `Cert WC` during a live endless run changes `levelId`, re-runs the effect, and gives
      `best = 5555` while `mode='endless'` at W2; (3) the rendered case — with the endless
      Results overlay MOUNTED after a loss (`result='lose'`, `mode='endless'`,
      `Best · 4200` from the endless watermark), resolving the mount read flips the prop to
      `7777`, and `best` is exactly what `ResultOverlay` renders as the endless `Best · {n}`
      line (`best={resultBest}` at :1743; `ResultOverlay.tsx:190`). So the overlay shows a
      campaign per-level best as the player's endless record. The window for (3) is narrow —
      the storage read must land after the run-end write — but the writer is unconditional,
      and the truth as authored says "at ANY moment", which (1) and (2) falsify with no race
      at all. The structural reason it survived: the WR-04 source contract in
      `tests/ui/PlayingHost.endless-host.test.ts:229` counts `previousBestRef.current =`
      ASSIGNMENTS and explicitly whitelists the `getBestForLevel` mount effect as one of
      "the two campaign-only regions" — it cannot see a campaign value being PUBLISHED from
      that region into a prop the endless overlay reads.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 460-477, the `getBestForLevel` effect: `previousBestRef.current = b;
          setResultBest(b);` (and the `.catch` twin at :470-472) run with no `modeRef` guard
          and re-run on every `levelId` change. The first assignment is correct — it is the
          campaign PB cache. The second is a cross-mode publication into the host's `best`
          prop.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `runCertWorstCase` (:1569-1588) calls `setLevelId('level-03')` while `modeRef` is
          still `'endless'`, which is the deterministic (race-free) trigger for the effect
          above. It is also the only remaining A-02-class control with no mode term at all.
      - path: "tests/ui/PlayingHost.endless-host.test.ts"
        issue: >-
          The WR-04 contract at :229-283 is written against the wrong symbol. It proves
          `previousBestRef` is assigned in exactly two regions and that `startEndlessRun`
          never mentions it — both true, both insufficient. No contract governs
          `setResultBest`, which is the prop writer that actually reaches the overlay.
    missing:
      - >-
        Give `resultBest` a single mode-aware publication point. Minimal shape: guard the
        mount effect's publication — `previousBestRef.current = b; if (modeRef.current !==
        'endless') { setResultBest(b); }` — keeping the ref assignment unconditional so the
        campaign PB cache stays warm for a later campaign run. Apply the same guard to the
        `.catch` arm at :470-472.
      - >-
        Add the symmetric republication when endless is EXITED, so the campaign `Best` is
        correct after `toggleDevLevel` returns to campaign: `setResultBest(previousBestRef.current)`
        inside `toggleDevLevel` alongside the existing `modeRef.current = 'campaign'` write
        (:1476). Without it, guarding the effect leaves a stale endless watermark as the
        campaign best until the next `levelId` change resolves.
      - >-
        Re-point the WR-04 source contract at the real writer: enumerate every
        `setResultBest(` call site in `PlayingHost.tsx` and assert each one is either inside
        an endless-only region (publishing `endlessBestScoreRef`) or inside a campaign-only
        region (publishing `previousBestRef`) — a call site in neither is the defect. Keep
        the existing `previousBestRef` assignment contract; it is not wrong, only blind.
      - >-
        A BEHAVIOUR test, not a source contract, because a source contract is what let this
        through twice. `tests/ui/PlayingHost.endless-record.test.tsx` already mounts the real
        `ResultOverlay` in `result-slot`; make `getBestForLevel` return a deferred promise,
        drive an endless run to a loss so `Best · {endless watermark}` is on screen, then
        resolve the promise with a distinctive campaign number and assert that number is
        NOT in the slot. Measured pre-fix: `Best ·` goes 4200 → 7777.
      - >-
        Decide whether `runCertWorstCase` needs a mode term at all, or whether the
        `setLevelId` half should be gated while endless. This overlaps gap 2's `Cert WC`
        finding — scope them together.
  - truth: >-
      docs/ops/ENDLESS-MODE.md states only invariants the shipped code holds (11-11 must_have
      truth 3; 11-11 prohibition "MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md
      that the shipped code does not hold")
    status: failed
    reason: >-
      The half of this truth that concerns the run-boundary table is genuinely delivered:
      the `__DEV__` `Endless` button and `Lv` are now rows, the bolded "every path that
      discards a run records it first" sentence is now true of the code for every path in
      that table, and the superseded claim is kept visible next to a dated correction rather
      than rewritten. But the same round ADDED two new false mechanisms, both inside § Limits
      item 2 — the SC-5 discharge procedure, which is the one block in this document a human
      operator reads before taking a measurement, and therefore the worst place to be wrong.
      (1) ":413 — the tier button … the new quality budget **re-bakes the glow atlas**."
      Measured: `bakeGlowSprites` call count is 1 before a tier press and 1 after. Confirmed
      at source: `loadKey` is `` `${loadResult.compiled.w[0]}x${loadResult.compiled.h[0]}` ``
      (:419-421) — brick dimensions alone, the deliberate 11-05 D-14 re-key — and the bake
      effect's deps are `[audio, haptics, glowAtlasSv, loadResult, loadKey]` (:656). There is
      no tier term in either. The operator is told to discard a reading for a reason that does
      not exist, and is given a false mental model of the one cold path the whole SC-5 reading
      exists to prove is not entered.
      (2) ":418 — `Cert WC` … The tier half restarts the run and re-bakes exactly as above."
      `runCertWorstCase` sets the tier only `if (tierOverride !== 'mid')` (:1580). Measured
      with the tier already at Mid and a live endless run at W2: `recordRunEnd` calls = 0,
      mode still `'endless'`, readout still `W2`, `result` still `null`, and the trailing
      `setActive` calls are `[…, false, false]` — the run is not restarted, not recorded and
      not ended; it is FROZEN behind a live HUD with the frame loop stopped. That is a real
      hazard and worth warning about, but not the one the document describes.
      11-11-SUMMARY.md states the re-bake mechanism was verified against source. It was not.
      A document that overstates the code is exactly how this phase's round-1 gap survived a
      review, which is why this is a gap and not an advisory.
    artifacts:
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Lines 411-416, the tier-button bullet in the SC-5 discharge procedure: the
          "re-bakes the glow atlas" claim is false. The rest of the bullet (the tier change
          fires `remountDevSession`, whose endless branch routes to `startEndlessRun()`, so
          the run is recorded abandoned and restarted at wave 1) is TRUE and measured —
          `{mode:'endless', wave:2, outcome:'abandoned'}` then `W1`. Only the bake sentence
          needs to go.
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Lines 417-423, the `Cert WC` bullet: "The tier half restarts the run and re-bakes
          exactly as above" is conditional on `tierOverride !== 'mid'` and false otherwise.
          The bullet's SECOND half — the level half is swallowed because the compiled-push
          gate early-returns while endless — is TRUE and measured. The bullet needs the
          conditional made explicit and the worse branch (tier already Mid → nothing records,
          nothing restarts, the loop stops) stated, because that is the branch an operator
          who has been cycling the tier will actually hit.
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          § The run boundary and the record display, the boundary table at :249-257, omits
          `Cert WC`. Every other control that can end, freeze or restart an endless run now
          has a row. `Cert WC` can restart-and-record it (tier ≠ Mid) or freeze it unrecorded
          (tier = Mid), and a boundary missing from this table is, by the document's own
          stated purpose, a boundary nobody knows exists.
    missing:
      - >-
        Delete the "re-bakes the glow atlas" sentence from the tier-button bullet
        (ENDLESS-MODE.md:413-415) and the "and re-bakes exactly as above" clause from the
        `Cert WC` bullet (:418). Keep the do-not-press warning — the reasons that survive
        (run restarted at wave 1; run frozen with the loop stopped) are sufficient on their
        own.
      - >-
        State the bake key explicitly where the re-bake claim used to be, so the next reader
        cannot re-derive the same error: the glow atlas is keyed on brick dimensions alone
        (`loadKey`), so only a level whose bricks are a different size re-bakes — the quality
        tier never does. That is 11-05's D-14 decision and it is the point of the re-key.
      - >-
        Split the `Cert WC` bullet by `tierOverride`: with the tier NOT already Mid the run is
        recorded `abandoned` and restarted at wave 1 (via `remountDevSession` →
        `startEndlessRun`); with the tier ALREADY Mid nothing is recorded, nothing restarts,
        `modeRef` stays `'endless'` and the frame loop stops behind a live HUD. Measured
        both ways.
      - >-
        Add a `Cert WC` row to the § run-boundary table with the same two-branch split, and
        re-check the bolded "every path that discards a run records it first" sentence
        against it. As measured the sentence survives — the tier-Mid branch FREEZES the run
        rather than discarding it, and the run stays recordable through Pause → Menu because
        `runEndedRef` is still false — but that reasoning must be written down beside the
        claim, or the next reader will find the same counterexample and not know it was
        considered.
      - >-
        Correct 11-11-SUMMARY.md's claim that the re-bake mechanism was verified against
        source, or annotate it. The SUMMARY asserting a verification that did not happen is
        the reusable failure here, independent of the doc text.
  - truth: >-
      An endless run that has ENDED stays ended: no branch regenerates a board, calls
      advanceWave() or moves the wave number after the run boundary has fired (the
      post-condition half of 11-09 must_have truth 2, "the post-condition is a single
      coherent state"; SC-1's "the run ends only when lives reach zero")
    status: failed
    reason: >-
      `applyChrome`'s endless WON branch (PlayingHost.tsx:929) gates on `modeRef.current`
      and `waveAdvanceInFlightRef` only. Every sibling run-boundary branch in the same
      function — campaign WON (:983), LOST (:990), the mid-run wave-build failure (:962) —
      consults `runEndedRef`; this one does not. Structure confirmed by reading; behaviour
      measured through the host's own chrome bridge: an endless run LOST at W2 records
      `{wave:2}` and raises the lose overlay, then ONE further WON mirror moves the readout
      to W3 with `advanceWave` called once and the compiled board changed; four more
      WON/DOCKED pairs take it to W6, all with the lose overlay still up and `recordRunEnd`
      still at 1. On the mid-run build-failure path the same hole reopens a run the branch
      itself just ended: failure at wave 3 records wave 2 and leaves the overlay reading
      "Wave 3 could not be built — run saved", after which a succeeding WON moves the
      readout to W3 while that copy is still on screen. After a FAILED START it corrupts
      the decided copy: `failEndlessStart` leaves `waveBuildFailedWave = 1` (body: "Wave 1
      could not be built — tap Retry", run-scoped lines suppressed), and one WON mirror
      rewrites it to 2 — so the body becomes the mid-run "Wave 2 could not be built — run
      saved" and `showRunLines` un-suppresses, rendering `Wave · 0` for a run that never
      began. That is precisely the class 11-09's IN-05 suppression exists to prevent.
      WHAT IT DOES NOT DO, and this matters for severity: it cannot inflate the record.
      Measured — after walking an ended run to W7, pressing `Menu` records nothing
      (`runEndedRef` latched), and pressing `Retry` resets to W1 so the next loss records
      wave 1. Every path that clears `runEndedRef` either routes through `advanceToWave(1)`
      or exits to campaign, so no inflated wave can reach telemetry. It is an incoherent
      ENDED state, a burned seed walk and a self-contradicting overlay — not a false record.
      Reachability is also bounded and should be scoped honestly: `chromeSeq` bumps only when
      the mirror changes (`useGameLoop.ts:604-619`), and both ended states leave the sim in a
      terminal phase with `setActive(false)` already called, so an in-app producer needs a
      straggler frame in the stop window. The branch is nevertheless the one asymmetry left
      in a function whose entire design is "one latch, every boundary", and Phase 14 promotes
      this code path.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Line 929: `if (modeRef.current === 'endless' && mirror.phase === SIM.WON)` — no
          `runEndedRef.current` term, unlike :962, :983 and :990 in the same function. The
          inner `if (!waveAdvanceInFlightRef.current)` guards concurrency, not run lifetime.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `failEndlessStart` (:1151-1167) does not clear `waveAdvanceInFlightRef`, so a
          failed start inherits whatever the previous run left there. Benign today because
          the branch above is reachable regardless, but it is the third ended-run state and
          it should have the same well-defined shape as the other two.
      - path: "tests/ui/PlayingHost.endless-retry.test.tsx"
        issue: >-
          `a wave that cannot be built ENDS the run, records it, and releases the guard
          (WR-04)` (:762) asserts the guard is RELEASED — deliberately, to prove the branch
          is not latched forever — and stops there. No case delivers a WON mirror after any
          run-end branch, which is why the asymmetry at :929 has never been exercised.
    missing:
      - >-
        Add `runEndedRef.current` to the endless WON branch condition at :929 — either
        `if (modeRef.current === 'endless' && mirror.phase === SIM.WON) { if
        (runEndedRef.current) { return; } … }` or fold it into the outer test. Returning
        (rather than falling through) is required: falling through would hand an endless WON
        to the campaign WON branch at :983, which is the SC-1 violation the branch exists to
        prevent.
      - >-
        Clear `waveAdvanceInFlightRef.current = false` inside `failEndlessStart` so all three
        ended-run states (LOST, wave-build failure, failed start) have the same post-condition.
      - >-
        Three behaviour cases in `tests/ui/PlayingHost.endless-retry.test.tsx`, which already
        has `deliverPhase`, `boardFingerprint` and the wave-readout helpers:
        (a) LOST at wave 2, then a WON mirror — assert the readout stays W2, `advanceWave`
        is not called, and the board fingerprint is unchanged (measured pre-fix: W3,
        1 call, board changed);
        (b) a mid-run wave-build failure, then a WON mirror that would succeed — assert the
        readout does not move while the "Wave 3 could not be built" copy is on screen;
        (c) a failed START, then a WON mirror — assert the `waveBuildFailedWave` prop stays
        1 so the body stays "Wave 1 could not be built — tap Retry" and the run-scoped lines
        stay suppressed (measured pre-fix: the prop becomes 2 and `Wave · 0` renders).
      - >-
        Add a source contract asserting that every run-boundary branch inside `applyChrome`
        references `runEndedRef` — the same shape as the existing "exactly one writer returns
        modeRef to campaign" contract. One branch silently lacking the shared latch is the
        defect, and a count-based contract is what catches the next one.
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05; the
      Pressable at PlayingHost.tsx:1694-1701 carries a comment saying Phase 14 deletes it),
      and ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged.
  - truth: "A permanent endless record surface, and electing which of bestScore / bestWave is THE record"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 SC-1/SC-2 ('Title offers … endless … as distinct entries'; 'A statistics
      screen renders the lifetime and per-level telemetry'). ENDLESS-MODE.md § Limits item 4
      records it, and 11-08 deliberately ships the endless Results overlay as the only
      endless-record reader without electing a primary record (A-08). Carried forward.
  - truth: "Endless bricks draw an unstretched glow halo (ENDLESS_BRICK_DIMS / A-04)"
    addressed_in: "Phase 14"
    evidence: >-
      Owner-decided accepted debt on 2026-09-26, recorded in docs/ops/ENDLESS-MODE.md
      § Flagged assumptions A-04 and § Limits item 7 with the measured 0.77x horizontal /
      0.85x vertical stretch, and named in the SC-5 discharge procedure as expected and
      accepted. Verified untouched this round: `loadKey` is still brick dimensions alone and
      the bake effect is unchanged. Carried forward.
advisory:
  - finding: >-
      One new test is vacuous by construction: `'leaves a LIVE Retry control on screen, not
      a decorative one (A-01 retry-in-place)'`
      (tests/ui/PlayingHost.endless-record.test.tsx:871). It presses Retry and then asserts
      the failure copy is still present — but the copy was already present before the press,
      so the assertion cannot distinguish a live control from a dead one.
    category: other
    reason: >-
      Confirmed by MUTATION, not by reading: with `onPress={undefined}` on the endless Retry
      Pressable (ResultOverlay.tsx:214) that test still passes. NOT a gap, and here I
      disagree with 11-REVIEW's framing — the same mutation is KILLED by two other cases in
      the same file (`'a Retry that cannot build wave 1 renders the decided tap-Retry body
      (A-01, D8)'` and `'the run that FOLLOWS a failed start is a real, recordable run'`),
      so the liveness property is genuinely covered; only this one test's assertion is empty.
      Resolution: either assert something the press causes (a second `compileGeneratedLevel`
      call, a re-minted seed, a new board fingerprint) or delete the case as redundant. It
      is new-scope with no deterministic failure, so it is advisory.
  - finding: >-
      Four claimed-behavioural properties in this round are held by SOURCE CONTRACTS alone —
      notably the failed-start seed restore / no-wave-write pair (11-09 truth 3) and the
      phantom `{wave:1, score:0, abandoned}` latch.
    category: other
    reason: >-
      Partly unavoidable and partly disclosed: 11-09 states in the source comment at
      PlayingHost.tsx:1234-1243 that the seed restore is not behaviourally observable,
      because nothing reads `runSeedRef` or `waveRef` again before the next
      `startEndlessRun` re-mints them, and the contract test says so rather than dressing
      itself up as behaviour. I confirmed that reasoning independently and could not
      construct an observation either. The phantom-latch half IS behaviourally measurable and
      I measured it: after a failed start, and after a further WON mirror, `recordRunEnd`
      calls = 0 — the prohibition holds. Advisory rather than a gap because the honest
      disclosure is present and the unobservability is real; the durable fix is to give the
      restored seed a consumer (the resume-in-place option 11-UI-SPEC contemplates) rather
      than to write a test that cannot see it.
  - finding: >-
      `runCertWorstCase` is the last `__DEV__` control with no mode term at all, and with the
      tier already at Mid it leaves a live endless run frozen: loop stopped, HUD live,
      `modeRef` still `'endless'`, nothing recorded.
    category: architectural
    reason: >-
      Measured (recordRunEnd calls = 0, mode `'endless'`, readout `W2`, result `null`,
      trailing `setActive(false)`). It is NOT record loss — `runEndedRef` is still false, so
      Pause → Menu still records the run at the wave it reached — which is why it does not
      falsify the bolded record-first invariant. It is the residue of A-02, which the owner
      resolved for `Lv` only and explicitly left open for the tier button and `Cert WC`. The
      documentation half is a gap (gap 2); the code half is raised here so the owner can
      scope it deliberately against Phase 14's deletion of the dev row rather than have a
      planner rediscover it.
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready
      without a frame spike that breaks the Mid budget
    test: >-
      Launch a dev build; arm the perf overlay; press the `Endless` button in the `__DEV__`
      dev row on the playing HUD; play waves 1 through 5; watch each transition specifically —
      the moment the last brick of a board breaks and the next board appears. Do not press
      the tier button or `Cert WC` during the reading (the tier button records the run
      abandoned and restarts it at wave 1; `Cert WC` either does the same or freezes the run
      with the frame loop stopped, depending on the current tier). `Lv` is safe as of
      2026-09-26 — it is now an explicit exit that ends the run visibly. NOTE: the ops
      document's claim that either control re-bakes the glow atlas is FALSE (gap 2) — the
      atlas is keyed on brick dimensions alone — so do not discard a reading for that reason.
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
      docs/ops/ENDLESS-MODE.md § Limits item 2 exactly as it stands, and leave N-END-03
      unchecked.
human_verification:
  - test: >-
      E1 overflow (backstop, carried by 11-09): render the endless Results panel at a
      7-digit score and a 4-digit wave on a real 320px-wide panel and look at the metric
      rows and the `Best ·` / `Best wave ·` pair.
    expected: "No wrap and no clipping on any of the six contract lines or the two CTAs."
    why_human: >-
      jsdom computes no layout, so no test this repo can run observes wrap or clipping. The
      ~28-monospace-character fit 11-UI-SPEC derives is that document's own arithmetic, not a
      rendering; asserting the character budget would convert a backstop into a false
      `covered`. 11-09 marks this `verification: backstop` and 11-11 explicitly declines to
      discharge it. Abstained rather than inferred.
  - test: >-
      E3 overflow (backstop, carried by 11-11): render the HUD strip during an endless run at
      a 7-digit score and a 3-digit combo, on the shipped 48px row.
    expected: "The 48px HUD row neither wraps nor clips; score, combo and lives all readable."
    why_human: "Same reason as E1 — no layout engine in the test environment. Abstained."
  - test: >-
      Owner decision requested — N-END-02's `[x]` in REQUIREMENTS.md. The STORAGE firewall is
      structurally verified and did not regress: `previousBestRef.current = best` exists only
      in `handleRunEnded`'s campaign arm, the endless arm is a discriminated-union member with
      no `levelId` so the campaign write is unreachable rather than merely skipped, and the
      mode branch precedes `evaluatePersonalBest`. But gap 1 shows the DISPLAY side of the
      same firewall leaking in the other direction — a campaign level best rendered as the
      endless `Best`.
    expected: >-
      Owner confirms N-END-02 stays `[x]` (the requirement text is about storage, and storage
      is clean), or elects to unc heck it until the display leak closes.
    why_human: >-
      The orchestrator's scope fence says N-END-02 stays `[x]` by owner decision of
      2026-09-26 and instructs me to record a reservation rather than flip the box. This is
      that reservation, routed rather than acted on. I did not change REQUIREMENTS.md.
---

# Phase 11: Endless Mode Verification Report

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T16:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure round 2 (plans 11-09, 11-10, 11-11). This report REPLACES the round-1 report; its gap list is superseded.

## Goal Achievement

**The verdict on the goal, in the round-1 verifier's own asymmetry frame: neither inflation
nor loss is now true. A third harm is — the record can be *wrong on screen*.**

*Inflation — a number nobody earned — is structurally dead, and I proved it rather than
assuming it.* I drove the real host to an ended run, then exploited the one branch that still
walks the wave after a run boundary (gap 3) to push the readout from W2 to W7 on a run that was
already recorded. Then I tried to get that number into telemetry two ways. `Menu` recorded
nothing (`runEndedRef` latched). `Retry` reset to W1 and the next loss recorded `wave: 1`. Every
path that clears `runEndedRef` either routes through `advanceToWave(1)` or exits to campaign, so
there is no path from an unearned wave to `telemetry.endless.bestWave`. The round-1 Retry chain
is dead, the write-side firewall holds, and the bolded sentence in `ENDLESS-MODE.md` — "bestWave
can only be raised by a wave that some single continuous run actually reached" — is, as far as I
can drive it, true.

*Loss — a run nothing recorded — is closed at every boundary the phase owns.* The funnel is
where the ops document says it is: the first statement of `startEndlessRun` (`PlayingHost.tsx:1200`),
so all five of its callers inherit it instead of two of them being wired by hand. Measured, not
read: the `__DEV__` `Endless` button mid-run records `{mode:'endless', wave:2, outcome:'abandoned'}`
(pre-fix: zero calls); the tier button records then restarts at W1; `Lv` records then exits to
campaign and hands the next loss to the campaign arm. One residue survives and it is a freeze
rather than a loss — `Cert WC` with the tier already at Mid leaves a live run with the loop
stopped and nothing recorded, but `runEndedRef` is still false so Pause → Menu still records it
at the wave reached. That is why it is advisory and a documentation gap, not a record gap.

*What is now true instead: a campaign number can be shown to the player as their endless
record.* `startEndlessRun` no longer publishes `previousBestRef` — that half of WR-04 is real —
but `resultBest` has a second, unconditional writer in the mount-time `getBestForLevel` effect,
and 11-11's contract test counts `previousBestRef` assignments, so it structurally cannot see it.
I measured the consequence on a MOUNTED endless Results overlay: `Best ·` goes from `4200` (the
endless watermark) to `7777` (a campaign level best). This is not inflation of the endless record
and not loss of it — it is the wrong record, displayed. Under "a record worth chasing" that is
its own harm: a player cannot chase a number that is not theirs.

*And the document a future maintainer will trust now overstates the code in two places.* Both
are inside the SC-5 discharge procedure — the block a human reads immediately before taking the
device measurement this phase cannot take itself. I measured both and neither holds. This is
the mechanism that let round 1's gap survive a review, and 11-11's own prohibition forbids it,
so it is a gap rather than a note.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (Round-1 regression) Retry from the endless lose overlay restarts at wave 1; a Retry chain cannot raise `bestWave` | ✓ VERIFIED | `PlayingHost.endless-retry.test.tsx:528` passes in the clean suite; independently measured — after an ended run walked to W7, `Retry` → W1 and the next loss recorded `{mode:'endless', wave:1, outcome:'lose'}` |
| 2 | (Round-1 regression / SC-3 / N-END-02) `previousBestRef` is never written by an endless run; campaign bests, stars and unlocks are untouched by endless play | ✓ VERIFIED | `PlayingHost.tsx:721-778` — mode branch precedes `evaluatePersonalBest`; `previousBestRef.current = best` exists only in the campaign arm (:796); the endless `recordRunEnd` arm is a union member with no `levelId`, so the campaign write is unreachable, not merely skipped |
| 3 | (SC-1 / N-END-01) Clearing a board advances to the next generated one in the same run; lives, score and combo carry; the run ends only at zero lives | ✓ VERIFIED | `applyChrome:929-945` intercepts endless WON before every run-end branch and returns; `endless.wave-loop.test.ts` + `PlayingHost.endless-run.test.tsx` pass. Reservation: truth 17 shows the converse ("an ended run stays ended") does not hold |
| 4 | (SC-2) Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel | ✓ VERIFIED | `src/services/endless/ramp.ts` + `tests/endless.ramp.test.ts` pass; `ENDLESS-MODE.md` § The wave → difficulty ramp documents it including the clamp rationale (D-01) |
| 5 | (SC-4 / N-END-03, headless half) A seeded endless run is reproducible end to end | ✓ VERIFIED | `tests/endless.determinism.test.ts` + `tests/levelgen.determinism.test.ts` pass; `ENDLESS-MODE.md` § Limits item 1 correctly scopes the claim to a fixed input policy and explicitly refuses the device-replay reading |
| 6 | (SC-5 / N-END-03, device half) Wave transitions do not stall the loop — no frame spike outside the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Device-gated and scope-fenced. No automated step here produces a frame on hardware. § Limits item 2 stays OPEN; N-END-03's unchecked box is CORRECT. See `behavior_unverified_items` |
| 7 | (Gap 1) The abandon funnel lives inside `startEndlessRun`, so all five callers record the run they replace | ✓ VERIFIED | `PlayingHost.tsx:1200` — first statement, above the readiness gate. Measured: `Endless` button at W2 → `{wave:2, abandoned}`; tier button at W2 → `{wave:2, abandoned}` then W1 |
| 8 | (Gap 1 / A-02) `Lv` is an explicit EXIT from endless: records first, then mode returns to campaign and the next loss lands on the campaign arm | ✓ VERIFIED | `toggleDevLevel:1443-1495` — `recordInFlightEndlessRun()` first, then `modeRef.current = 'campaign'`, `waveRef.current = 1`, guard cleared. Four behaviour cases at `endless-retry.test.tsx:892-1000` pass |
| 9 | (Gap 2) A failed endless start leaves a single coherent state — run over, Results overlay up, `Retry` the only live control | ✓ VERIFIED | `failEndlessStart:1151-1167`. Behaviourally proven: the case `'the run that FOLLOWS a failed start is a real, recordable run'` KILLS a `onPress={undefined}` mutant, so it exercises the live control, not just the copy |
| 10 | (Gap 2) A failed endless start leaves nothing of the run identity changed — seed restored, no wave written | ✓ VERIFIED | `PlayingHost.tsx:1240-1247` — `const prevSeed` / `runSeedRef.current = prevSeed` on the failure arm; the unpaired `waveRef.current = 1` is deleted. Source-contract only, and honestly disclosed as such at :1234-1243; I independently confirmed no observation exists (see `advisory`) |
| 11 | (Gap 3) The owner-decided copy `Wave 1 could not be built — tap Retry` reaches the real overlay with `Retry` live from EVERY entry path | ✓ VERIFIED | `failEndlessStart` flips `modeRef` AND `setMode`, raises `setResult('lose')` and republishes the endless watermarks BEFORE the gates. `'a Retry that cannot build wave 1 renders the decided tap-Retry body (A-01, D8)'` kills the dead-control mutant |
| 12 | (IN-01) The Retry-time / mid-run distinction is a named, boundary-tested function asserted at both producers | ✓ VERIFIED | `waveBuildFailureKind` exported at `ResultOverlay.tsx:61`, consumed twice (body copy at :140, `showRunLines` at :151); `__DEV__` floor tripwire at the mid-run writer (`PlayingHost.tsx:947-960`) |
| 13 | (11-11) The test that pinned the WR-04 defect is corrected to assert the ENDLESS watermark rather than deleted; the case count does not fall | ✓ VERIFIED | `endless-record.test.tsx` now 20 cases, `endless-host.test.ts` 21, `endless-retry.test.tsx` 17, `ResultOverlay.test.tsx` 20; the round added 261 lines to `endless-retry` alone and deleted no case |
| 14 | (11-11) A-02 is recorded as DECIDED with its implementation; the SC-5 do-not-press note is NARROWED, not deleted | ✓ VERIFIED | `ENDLESS-MODE.md` § A-02 records the decision, the two rejected options and the consequence; § Limits item 2 keeps the note narrowed to the tier button and `Cert WC` with a dated amendment. (The note's *mechanism* is wrong — truth 16) |
| 15 | (11-11) The SC-5 OPEN block survives intact, and `src/core` / `src/levelgen` are untouched by the whole round | ✓ VERIFIED | § Limits item 2 still OPEN, still naming the Mid budget and its four failure signatures, still recording the stretched halo as accepted. `git diff 33123b2..HEAD -- src/core src/levelgen` is EMPTY |
| 16 | (11-11 truth 3) `docs/ops/ENDLESS-MODE.md` states only invariants the shipped code holds | ✗ FAILED | Two new false claims, both measured: the tier button does not re-bake (`bakeGlowSprites` calls 1 → 1; `loadKey` is brick dims alone), and `Cert WC`'s tier half is conditional on `tierOverride !== 'mid'` (measured with tier Mid: 0 records, no restart). See gap 2 |
| 17 | (NEW) An endless run that has ENDED stays ended — no branch regenerates a board or moves the wave after the run boundary | ✗ FAILED | `applyChrome:929` is the only run-boundary branch with no `runEndedRef` gate. Measured: LOST at W2 → one WON mirror → W3, `advanceWave` ×1, board changed; four more pairs → W6. Cannot inflate the record (proven). See gap 3 |
| 18 | (11-11 truth 1 / WR-04) The host's `best` prop is never a campaign number at ANY moment in an endless run's lifetime | ✗ FAILED | Measured three ways, including RENDERED: with the endless Results overlay mounted, `Best ·` flips 4200 → 7777 (a campaign level best) when the mount-time read lands. See gap 1 |
| 19 | (Backstop) E1 — 320px Results panel at a 7-digit score / 4-digit wave shows no wrap and no clipping | ? insufficient_spec | `verification: backstop`. jsdom computes no layout; the ~28-character fit is 11-UI-SPEC's arithmetic, not a rendering. Abstained → human |
| 20 | (Backstop) E3 — 48px HUD row at a 7-digit score / 3-digit combo shows no wrap and no clipping | ? insufficient_spec | Same. Abstained → human |

**Score:** 12/18 truths verified (backstop truths 19-20 route to human and are excluded from the
denominator alongside them; 1 present, behavior-unverified)

Counted: verified = 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15 → 14 items collapse to 12
must-haves after merging the two 11-11 documentation truths (14 + 15) into one and the two
round-1 regressions into the roadmap SCs they restate. Failed = 16, 17, 18. Behavior-unverified = 6.
Human/insufficient_spec = 19, 20 plus the N-END-02 owner reservation.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Production endless entry point | Phase 14 | Phase 14 SC-1 'Title offers campaign, endless and daily as distinct entries'; the `__DEV__` Pressable at `PlayingHost.tsx:1694` carries a delete-in-14 comment |
| 2 | Permanent endless record surface; electing a primary record | Phase 14 | Phase 14 SC-1/SC-2; `ENDLESS-MODE.md` § Limits item 4; 11-08 A-08 deliberately refuses to elect |
| 3 | `ENDLESS_BRICK_DIMS` / the stretched glow halo | Phase 14 | Owner-accepted debt 2026-09-26; § Limits item 7 with the measured 0.77x / 0.85x stretch. Verified untouched: `loadKey` unchanged, bake effect unchanged |

### Advisory (New Scope, Unevidenced or Non-Blocking)

| # | Finding | Category | Why Advisory |
|---|---------|----------|--------------|
| 1 | The `'leaves a LIVE Retry control on screen'` test is vacuous — it passes with `onPress={undefined}` | other | Confirmed by mutation. But two OTHER cases in the same file kill the same mutant, so the liveness property is covered; only this assertion is empty. Disagrees with 11-REVIEW's severity |
| 2 | Four properties held by source contracts alone (seed restore, no-wave-write, the phantom latch, the success-path copy clear) | other | The seed restore is genuinely unobservable and 11-09 says so in the source; the phantom latch IS measurable and I measured it holding (0 records after a failed start, and after a subsequent WON mirror) |
| 3 | `runCertWorstCase` has no mode term; with the tier already Mid it freezes a live endless run unrecorded | architectural | Measured. Not record loss — `runEndedRef` stays false so Pause → Menu still records at the wave reached. The documentation half is gap 2; the code half is owner-scoped A-02 residue |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/PlayingHost.tsx` | Funnel inside `startEndlessRun`; atomic failure; `failEndlessStart`; A-02 exit; endless watermark published as `best` | ⚠️ PARTIAL | 1800 lines. Four of five deliverables verified. `setResultBest` retains an ungated campaign writer at :460-477 (gap 1); `applyChrome:929` lacks the `runEndedRef` gate (gap 3) |
| `src/runtime/overlays/ResultOverlay.tsx` | `waveBuildFailureKind` boundary; run-line suppression at Retry time; endless copy | ✓ VERIFIED | 358 lines. Named discriminant with two consumers; `isEndless` forces off the win heading, stars and Next; mutation-tested live Retry |
| `docs/ops/ENDLESS-MODE.md` | Boundary table lists every discarding control; the record-first sentence is true as shipped | ✗ STUB-EQUIVALENT (asserts behaviour the code lacks) | 538 lines. Boundary table and the dated correction are genuinely delivered; two NEW false mechanisms added in § Limits item 2; `Cert WC` missing from the boundary table |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | Behaviour cases for every run boundary | ✓ VERIFIED | 17 cases; drives the real host through its own chrome bridge with real `generate` / `compileGeneratedLevel` |
| `tests/ui/PlayingHost.endless-record.test.tsx` | Real `ResultOverlay` in `result-slot`; failed-start rendering | ✓ VERIFIED | 20 cases; two of them kill the dead-Retry mutant |
| `tests/ui/PlayingHost.endless-host.test.ts` | Source contracts, self-labelled as such | ⚠️ PARTIAL | 21 cases. The WR-04 contract (:229) governs the wrong symbol — `previousBestRef` assignments, not `setResultBest` publications — and explicitly whitelists the region the defect lives in |
| `tests/ui/ResultOverlay.test.tsx` | Copy, line order, suppression | ✓ VERIFIED | 20 cases |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `__DEV__ Endless` Pressable | `store.recordRunEnd` endless arm | `startEndlessRun` → `recordInFlightEndlessRun` → `handleRunEnded` | ✓ WIRED | Measured `{mode:'endless', wave:2, outcome:'abandoned'}`; this link was NOT_WIRED in round 1 |
| `toggleDevLevel` | `handleRunEnded`, then `modeRef = 'campaign'` | `recordInFlightEndlessRun` first, exit second | ✓ WIRED | Records, then the next loss lands on the campaign arm; the compiled-push gate effect is live again |
| `startEndlessRun` failure returns | the rendered tap-Retry copy | `failEndlessStart` → `setMode` + `setResult('lose')` → `GameScreen showResult` → real `ResultOverlay` | ✓ WIRED | Reachable from all three call sites now, including a fresh campaign mount |
| `failEndlessStart` | endless watermarks on the raised overlay | `setResultBest(endlessBestScoreRef)` / `setResultBestWave(endlessBestWaveRef)` | ✓ WIRED | `Best · 0` / `Best wave · 0` on a first run, not the campaign level best |
| `endlessBestScoreRef` | the host `best` prop | `setResultBest` inside `startEndlessRun` | ⚠️ PARTIAL | The endless publication is correct; a SECOND, ungated campaign publication at :460-477 can overwrite it mid-run and while the overlay is mounted (gap 1) |
| `runEndedRef` | every `applyChrome` run-boundary branch | the shared single latch | ⚠️ PARTIAL | Held by the campaign WON, LOST and wave-build-failure branches; NOT by the endless WON branch at :929 (gap 3) |
| `ENDLESS-MODE.md` § boundary table | the shipped run-boundary set | documentation ↔ code | ⚠️ PARTIAL | `Endless` and `Lv` rows added and correct; `Cert WC` absent; two mechanism claims in § Limits item 2 false |
| `waveBuildFailureKind` | body copy AND run-line suppression | one boundary, two consumers | ✓ WIRED | Cannot disagree by construction |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ResultOverlay (endless `Best ·`) | `best` ← `resultBest` | `endlessBestScoreRef` ← merged `recordRunEnd` blob | Yes, but a campaign source can overwrite it | ⚠️ STATIC-CONTAMINATED — measured 4200 → 7777 with the overlay mounted |
| ResultOverlay (endless `Best wave ·`) | `bestWave` ← `resultBestWave` | `endlessBestWaveRef` ← merged blob | Yes | ✓ FLOWING — stayed 9 across the same event; only the score line has a second writer |
| ResultOverlay (`Wave ·` / `Score ·`) | `wave` ← `resultWave`, `score` | `waveRef` snapshot at `handleRunEnded`; chrome mirror | Yes | ✓ FLOWING — suppressed at Retry time by `showRunLines` |
| ResultOverlay (body copy) | `waveBuildFailedWave` | `failEndlessStart` (1) / `applyChrome` (`waveRef+1`) | Yes | ⚠️ HOLLOW after a run ends — a post-end WON mirror rewrites it, flipping the failed-start body to the mid-run wording and rendering `Wave · 0` (gap 3) |
| dev-row `W{n}` readout | `wave` state | `advanceToWave` (`setWave(nextWave)`) | Yes | ⚠️ HOLLOW after a run ends — walks W2→W7 on a recorded, ended run |
| `telemetry.endless.bestWave` | merged watermark | `store.recordRunEnd` endless arm, `Math.max` fold | Yes | ✓ FLOWING — and provably unreachable from the hollow readout above |

### Behavioral Spot-Checks

All run against the real `PlayingHost` through its own chrome bridge, with real `generate`,
real `compileGeneratedLevel` and the real `ResultOverlay` where noted. Probe file created in
`tests/ui/`, executed, and REMOVED; working tree left clean.

| # | Behavior | Result | Status |
|---|----------|--------|--------|
| P1 | WON mirror after LOST at W2 | `afterLost {result:"lose", wave:"W2", recordCalls:1, record:{wave:2}}` → `afterWon {wave:"W3", advanceWaveCalls:1, boardChanged:true, recordCalls:1}` | ✗ FAIL (gap 3) |
| P1b | Four more WON/DOCKED pairs on the ended run | `{wave:"W6", result:"lose", recordCalls:1}` | ✗ FAIL (gap 3) |
| P1c | Can the walked wave reach telemetry via `Menu`? | `{inflatedWave:"W7", recordCallsAfterMenu:0}` | ✓ PASS — record integrity holds |
| P2 | WON mirror after a failed START | `{result:"lose", wave:"W1", mode:"endless", recordCalls:0, advanceWaveCalls:0}` | ✓ PASS on records (no phantom run) |
| P3 | `Cert WC` during a live run, tier `null` | `{recordCalls:1, record:{mode:"endless", wave:2, outcome:"abandoned"}}` | ✓ PASS — the run IS recorded on this branch |
| P4 | Tier button during a live run at W2 | `{wave:"W1", recordCalls:1, record:{wave:2, abandoned}}` | ✓ PASS |
| P5 | `bakeGlowSprites` calls across a tier press | `{bakesBefore:1, bakesAfter:1}` | ✗ FAIL vs the doc (gap 2) |
| P6 | `Cert WC` with the tier ALREADY Mid, live run at W2 | `{wave:"W2", mode:"endless", result:null, recordCalls:0, setActiveCalls:[...,false,false]}` | ✗ FAIL vs the doc (gap 2); advisory 3 on the code |
| P7 | Walked-to-W7 ended run → `Retry` → lose | `{afterRetry:"W1", records:[{mode:"endless", wave:1, outcome:"lose"}]}` | ✓ PASS — no inflation |
| P8 | `best` prop mid-run with a late `getBestForLevel` | `beforeResolve {best:0}` → `afterResolve {mode:"endless", wave:"W2", best:7777}` | ✗ FAIL (gap 1) |
| P9 | `best` prop after `Cert WC` changes `levelId`, synchronous store | `before {best:0}` → `after {mode:"endless", best:5555, wave:"W2"}` | ✗ FAIL (gap 1) — no race needed |
| P10 | `best` prop with the endless Results overlay MOUNTED | `overlayUp {result:"lose", mode:"endless", best:4200, bestWave:9}` → `afterLateCampaignRead {best:7777, bestWave:9}` | ✗ FAIL (gap 1) — rendered, not latent |
| P11 | Failed start, then a WON mirror: body copy | `afterFail {waveBuildFailedWave:1, wave:0}` → `afterWon {waveBuildFailedWave:2, wave:0, recordCalls:0}` | ✗ FAIL (gap 3) — copy flips to "Wave 2 … run saved", `Wave · 0` un-suppresses |
| P12 | Mid-run build failure, then a succeeding WON | `ended {waveBuildFailedWave:3, wave:"W2", recordCalls:1}` → `after {wave:"W3", waveBuildFailedWave:3, advanceWaveCalls:1}` | ✗ FAIL (gap 3) — readout contradicts the overlay |
| M1 | Mutation: `onPress={undefined}` on the endless Retry | `'leaves a LIVE Retry control on screen'` PASSES; two other cases FAIL | ⚠️ advisory 1 — property covered, that test vacuous |
| F1 | `git diff 33123b2..HEAD -- src/core src/levelgen` | empty | ✓ PASS — freeze holds |

**Full suite:** run once, against the M1 mutant, which doubled as the mutation check —
`97 files / 622 tests, 2 failed`, both failures being the two cases that kill the mutant. Clean
baseline (`622 passed`, `typecheck` 0, `lint` 0) taken from the orchestrator's measurement.
Mutation reverted; `git status` confirms `src/runtime/overlays/ResultOverlay.tsx` unmodified.

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repository and no plan declares one. Step 7c:
SKIPPED (no project probes). The behavioural spot-check table above is the substitute, and every
row in it was executed in this process rather than read from a SUMMARY.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| N-END-01 | 11-09, 11-10 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ SATISFIED (with reservation) | `applyChrome:929-945` intercepts endless WON before every run-end branch; `endless.wave-loop.test.ts` and `PlayingHost.endless-run.test.tsx` pass. Reservation: the converse does not hold — an ENDED run still advances (gap 3). The requirement text is about the run not ending early, and that holds |
| N-END-02 | 11-09, 11-10, 11-11 | Endless records stored separately — endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED (storage) / ⚠️ RESERVATION (display) | Write-side firewall verified and not regressed (truth 2). The display side leaks the other way — a campaign best rendered as the endless `Best` (gap 1). Per the scope fence the `[x]` stays and the reservation is routed to the owner; I did not modify REQUIREMENTS.md |
| N-END-03 | 11-09, 11-11 | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ⚠️ PARTIAL — correctly unchecked | Reproducibility half proven headlessly (`endless.determinism.test.ts`). Frame half device-gated and UNMEASURED; `ENDLESS-MODE.md` § Limits item 2 stays OPEN and the `[ ]` in REQUIREMENTS.md is CORRECT, not an omission |

No orphaned requirements: `grep "Phase 11" .planning/REQUIREMENTS.md` maps exactly N-END-01/02/03,
and all three appear in round-2 plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` across all 7 changed files | — | NONE FOUND. Debt-marker gate passes cleanly |
| `app/_components/PlayingHost.tsx` | 460-477 | Unconditional cross-mode state publication (`setResultBest(b)` with no mode term) | 🛑 Blocker | Gap 1 — a campaign number rendered as the endless record |
| `app/_components/PlayingHost.tsx` | 929 | Missing shared-latch term in one branch of an otherwise uniform set | 🛑 Blocker | Gap 3 — an ended run keeps regenerating boards |
| `docs/ops/ENDLESS-MODE.md` | 413, 418 | Documentation asserting a mechanism the code does not implement | 🛑 Blocker | Gap 2 — and it is inside the human discharge procedure |
| `docs/ops/ENDLESS-MODE.md` | 249-257 | Boundary table incomplete (`Cert WC` absent) | ⚠️ Warning | Folded into gap 2 |
| `tests/ui/PlayingHost.endless-record.test.tsx` | 871-892 | Assertion that cannot fail (asserts a pre-existing condition after an action) | ⚠️ Warning | Advisory 1 — property covered elsewhere; mutation-confirmed |
| `tests/ui/PlayingHost.endless-host.test.ts` | 229-283 | Source contract governing an adjacent symbol, whitelisting the region the defect lives in | ⚠️ Warning | Why gap 1 survived; included in gap 1's `missing[]` |
| `app/_components/PlayingHost.tsx` | 1569-1588 | `__DEV__` control with no mode term | ℹ️ Info | Advisory 3 — owner-scoped A-02 residue |

Re-verification evidence gate (#3304): the three blockers above are all evidenced by named,
reproducible measurements executed in this process (P8/P9/P10; P5/P6; P1/P11/P12), and all three
flagged files were git-modified in this round. None rests on unevidenced new scope, so none is
downgraded to advisory.

### Human Verification Required

#### 1. E1 Results-panel overflow (backstop)

**Test:** Render the endless Results panel at a 7-digit score and a 4-digit wave on a real
320px-wide panel; look at the six contract lines and the two CTAs.
**Expected:** No wrap, no clipping.
**Why human:** jsdom computes no layout. The ~28-monospace-character fit is 11-UI-SPEC's own
arithmetic, not a rendering; asserting it would convert a backstop into a false `covered`.
11-09 marks it `verification: backstop` and 11-11 explicitly declines to discharge it.

#### 2. E3 HUD-row overflow (backstop)

**Test:** Render the HUD strip during an endless run at a 7-digit score and a 3-digit combo on
the shipped 48px row.
**Expected:** No wrap, no clipping; score, combo and lives all readable.
**Why human:** Same — no layout engine in any test this repo can run.

#### 3. SC-5 / N-END-03 device reading (standing item)

See `behavior_unverified_items` for the full discharge procedure. One correction to carry into
it: the ops document's claim that the tier button or `Cert WC` re-bakes the glow atlas is FALSE
(gap 2) — the atlas is keyed on brick dimensions alone — so do not discard a reading for that
reason. The do-not-press warning itself still stands for the other, real reasons.

#### 4. Owner decision — N-END-02's `[x]`

**Test:** Read gap 1 and decide whether the display-side leak changes your view of N-END-02.
**Expected:** Either "stays `[x]` — the requirement is about storage, and storage is clean" or
"uncheck until the display leak closes".
**Why human:** The orchestrator's scope fence reserves this to the owner. Recorded and routed,
not acted on.

### Gaps Summary

Three gaps, all closable inside the existing files, and they group into two concerns.

**Concern A — one prop, two writers (gap 1).** `resultBest` is written by the endless run-end
path, by `startEndlessRun`, by `failEndlessStart` — and by the mount-time `getBestForLevel`
effect, which is campaign-only in intent and unconditional in code. 11-11 fixed one of the four
and wrote a contract that can only see the symbol it fixed. The fix is a mode guard on the
effect's publication plus a symmetric republication when endless is exited, and a contract
re-pointed at `setResultBest` call sites rather than `previousBestRef` assignments. This is the
gap that touches the phase goal directly: it is the only one that puts a wrong number in front
of a player.

**Concern B — one latch, one missing branch, and a document that outran the code (gaps 2 and 3).**
`applyChrome` is built around a single `runEndedRef` latch that every run-boundary branch
consults; the endless WON branch does not, so an ended run keeps building boards, walking the
wave and — after a failed start — rewriting the decided failure copy into the mid-run wording
with `Wave · 0` beneath it. It cannot reach telemetry, and I proved that rather than assuming it.
Separately, `ENDLESS-MODE.md` gained two mechanism claims this round that the code does not
implement, both inside the SC-5 discharge procedure; the boundary table is also missing `Cert
WC`, which is the only control that can still leave a live run frozen and unrecorded (recoverable
via Menu, so not loss). Fixing gap 3 is a one-term condition plus three behaviour cases; fixing
gap 2 is a documentation edit plus one table row, and a correction to 11-11-SUMMARY's claim that
it verified the re-bake against source.

**What is NOT a gap, stated so the next planner does not re-open it:** the abandon funnel
(closed at all five callers, measured), the atomic failed start (closed), the A-01 copy on every
entry path (closed, mutation-proven), the Retry-chain inflation (dead, proven from an ended run),
the write-side mode firewall (holds), the `src/core` / `src/levelgen` freeze (empty diff), the
SC-5 OPEN block and N-END-03's unchecked box (both correct), and the `ENDLESS_BRICK_DIMS` halo
(Phase 14, owner-accepted, bake path verified untouched).

---

_Verified: 2026-09-26T16:40:00Z_
_Verifier: Claude (gsd-verifier)_
