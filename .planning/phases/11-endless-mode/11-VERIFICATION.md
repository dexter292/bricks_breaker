---
phase: 11-endless-mode
verified: 2026-09-26T21:55:00Z
status: gaps_found
score: 37/40 must-haves verified
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
  - ".planning/phases/11-endless-mode/11-15-PLAN.md"
  - ".planning/phases/11-endless-mode/11-15-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-16-PLAN.md"
  - ".planning/phases/11-endless-mode/11-16-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-17-PLAN.md"
  - ".planning/phases/11-endless-mode/11-17-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-18-PLAN.md"
  - ".planning/phases/11-endless-mode/11-18-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/overlays/ResultOverlay.tsx"
  - "src/runtime/useGameLoop.ts"
  - "tests/ui/PlayingHost.endless-host.test.ts"
  - "tests/ui/PlayingHost.endless-record.test.tsx"
  - "tests/ui/PlayingHost.endless-retry.test.tsx"
  - "tests/ui/ResultOverlay.test.tsx"
covered_digest: "v1:sha256:84f453bfe2fcc715dc9b101c642679993363b4c3240df0117404226a91be90b4"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 31/33
  gaps_closed:
    - >-
      Round-4 gap — "No resume path can be locked out of its own chrome: every path that begins
      or resumes a run clears the latch before re-arming the loop AND writes lives, score,
      combo, stall tier and sim phase itself" (11-15 must_have truth 6, status `partial`).
      CLOSED, by the GUARD shape the round-4 report named as its first `missing[]` option, and
      closed in the way it asked for rather than in a way that merely satisfies the words.
      `app/_components/PlayingHost.tsx:1771-1775` now opens the level half on
      `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`.
      VERIFIED BY MUTATION IN THIS PROCESS, not by reading: deleting the single conjunct at
      `:1772` turns exactly TWO cases RED in
      `tests/ui/PlayingHost.endless-retry.test.tsx` — `an ENDED campaign run is not re-armed:
      a press from the mounted lose panel with the tier already Mid moves no level and starts
      no loop` and `and the same press leaves the mounted campaign panel reading the level it
      was played on (WR-02)` — while the two pre-existing LIVE-run campaign cert cases stay
      GREEN (29 passed / 2 failed in that file). That is both halves of the round-4 demand:
      the new behaviour is pinned, and the byte-for-byte-identical live-run behaviour is
      pinned by its own cases staying green under the same mutation. The verifier's fourth
      `missing[]` item was executed too — the enumeration is now DERIVED (see below) rather
      than asserted.
    - >-
      Round-4 gap, the ENUMERATION half — "Extend 11-15's safety enumeration from chrome
      WRITERS to loop RE-ARM sites, and pin it so a seventh cannot appear silently". CLOSED and
      strictly better than the counting contract the round-4 report suggested. The new case
      `every path that re-arms the frame loop is enumerated — five direct sites and three
      levelId writers (round-5)` (`tests/ui/PlayingHost.endless-host.test.ts:1443+`) counts the
      five `setActive(true)` statements AND the three `setLevelId(` writers, and then BINDS
      three of them to their own function bodies by name with the clear required at a lower
      index than the arm. I ran the mutation the aggregate count cannot see: DELETING
      `onRetry`'s own `runEndedRef.current = false;` at `:1471` and ADDING one inside `goNext`
      holds the file-wide count at exactly 5, and the case still goes RED naming `onRetry`
      ("expected -1 to be greater than or equal to 0"). The site binding is real, not
      decorative.
    - >-
      Round-4 advisory A2 — the four-branch `applyChrome` latch contract is VACUOUS, its
      `.toMatch(/runEndedRef\.current/)` satisfied by the ASSIGNMENT one line below each guard.
      CLOSED. `GUARD_SHAPE` (`tests/ui/PlayingHost.endless-host.test.ts:718-719`) now requires
      the negated test, its latch set and its `handleRunEnded(` call as one shape, plus an
      independent `.toBe(3)` occurrence count. VERIFIED BY MUTATION: turning ONE
      `if (!runEndedRef.current)` (`PlayingHost.tsx:1098`) into `if (true)` — the exact mutation
      that left the workspace green at 97 files / 645 tests in round 4 — now FAILS at
      `tests/ui/PlayingHost.endless-host.test.ts:726`. The endless WON branch is stated
      honestly in its own separate assertion rather than folded into a claim that is false for
      it.
    - >-
      Round-4 gap, the WR-02 sibling and the MOCK that hid it. CLOSED. The
      `getBestForLevel` harness mock honours its `id` argument, and the new WR-02 case carries
      an anti-vacuity POSITIVE CONTROL (four `Lv` presses through `toggleDevLevel` DO move the
      rendered `best` to 7777). Both halves red under the conjunct-removal mutation above, so
      the pass is not the mock being blind again.
    - >-
      Round-4 advisory A1 — ENDLESS-MODE.md calling `level-03` "the shipped default level, so
      the common case". CLOSED, as a dated REPLACEMENT clause rather than a deletion
      (`docs/ops/ENDLESS-MODE.md:455-464`). Re-checked at source in this process:
      `app/_components/GameHost.tsx:68` defaults to `level-01`, `:196` mounts `level-03` only
      under `CERT_HARNESS`, and `level-03` is last in `PLAYABLE_LEVEL_ORDER`. The correction
      states all three and draws the right conclusion (four `Lv` presses, the RARE sub-branch).
    - >-
      Round-4 gap artifact 5 — `11-15-SUMMARY.md:177` asserting a safety property over "every
      path that begins or resumes a run" while reporting five chrome writers. CLOSED. A dated
      `CORRECTION 2026-09-26 (round 5)` block sits BESIDE the original table (which is kept, and
      is correct for the set it enumerates), restates the two-grep derivation, tabulates the
      eight members, and names member 6 as the one a chrome-writer enumeration could not
      structurally have found. This is the treatment the round-4 report asked for.
  gaps_remaining: []
  regressions:
    - >-
      NEW this round and introduced BY the round-5 conjunct. `runCertWorstCase` now arms a cert
      one-shot it has made undischargeable on the CAMPAIGN branch — round-3 gap 2 / WR-01
      reintroduced next door, and in violation of the rule this same function states in prose 34
      lines BELOW the new conjunct (`PlayingHost.tsx:1795-1796`: "do not arm a latch whose
      discharge preconditions the same change has made unreachable"). REPRODUCED BY DRIVEN
      PROBE in this process, both ways. See gap 1.
    - >-
      NEW this round. Three artifacts written by round 5 state that the ENDED-run / tier-Mid
      press "injects directly into a world whose loop is already stopped". The shipped code
      does not do that: the call only bumps a SharedValue request that is consumed exclusively
      inside `onFrame`, which is not running. The load is QUEUED and lands on the first frame of
      the NEXT run. See gap 2.
gaps:
  - truth: >-
      No `__DEV__` control arms a one-shot whose own discharge preconditions the same change has
      made unreachable — the rule this phase learned in round 3, wrote into
      `app/_components/PlayingHost.tsx:1795-1796` in round 4, and must not break in round 5
      (11-18 prohibition "MUST NOT assert an invariant ... that the shipped code does not hold"
      is the documentation twin of the same failure; the code half is this)
    status: failed
    reason: >-
      REPRODUCED BY DRIVEN PROBE ON THE REAL HOST, both ways, through this repo's own
      `endless-retry` harness (scratch file `tests/ui/__probe-cr01.test.tsx`, since deleted;
      `git status` clean). The branch is CAMPAIGN, run ENDED, tier still AUTO — one step away
      from the branch 11-17 did measure (tier already Mid), and covered by no truth, no
      assumption and no case in 11-17.
      POST-ROUND-5 (shipped source). `mountOnly()`, tier left at Auto, level `level-01`,
      `deliverPhase(SIM.LOST, {lives: 0, score: 2400})` -> lose panel mounted. ONE press of
      `Cert WC`: the level half is correctly refused by the new conjunct (`Lv` label stays
      `Switch level, current level-01`) and `injectCertWorstCase` is 0. The TIER half then
      fires (`tierOverride !== 'mid'`), sets `defer = true`, and `:1806` executes
      `certPendingRef.current = modeRef.current !== 'endless'` — which in campaign is TRUE. The
      deferred-cert effect at `:1815-1832` requires `levelId === 'level-03'` AND
      `tierOverride === 'mid'`; the tier term is now satisfied and the LEVEL term has just been
      made unreachable BY THE NEW CONJUNCT. The one-shot is stranded. Walking the `Lv` control
      four steps, exactly as the round-3 verifier walked it:
      `level-04 inject=0 | level-05 inject=0 | level-06 inject=0 | level-03 inject=1`.
      One worst-case injection on a later CAMPAIGN session that never pressed the button.
      PRE-ROUND-5 (the identical probe with the single conjunct at `:1772` removed). At the
      press: `Lv` moves to `level-03`, `injectCertWorstCase` is 1 — the deferral discharged
      PROMPTLY. The subsequent `Lv` walk adds nothing (`inject=1` throughout, total 1).
      SO THE DELTA IS ROUND 5's, AND IT IS EXACTLY THE ROUND-3 DEFECT. Round 5 converted a
      prompt discharge into a stranded one-shot that fires on an unrelated later session. This
      is not a pre-existing condition inherited by the round; it is manufactured by the round's
      own change, in the same function, in the same commit (`62e94cb`) whose comment block
      quotes the rule it breaks.
      WHY A GAP AND NOT AN ADVISORY, held to the standard the last two rounds set for
      themselves. Round 3 raised this precise defect class as a GAP and round 4 closed it as
      one; classifying the same class as advisory the moment it reappears on the neighbouring
      branch would make the phase's own precedent unfalsifiable. It is also the FIFTH
      consecutive instance of this phase's signature failure — the instrument was pointed one
      branch away from the defect: 11-17 enumerated the ENDED-run / tier-ALREADY-Mid
      intersection and never asked what the ENDED-run / tier-AUTO intersection does. And the
      file is git-modified this round, so the re-verification evidence gate is satisfied
      unconditionally; independently, the driven probe above is deterministic reproducible
      evidence in its own right.
      SEVERITY, stated precisely so the closure plan can size it. NO SUCCESS CRITERION FAILS.
      The arming term is `modeRef.current !== 'endless'`, so this is campaign-only; all five
      SCs are about endless, the endless press still arms nothing (verified green:
      `while endless below level-03, Cert WC arms nothing — a later campaign walk to level-03
      never injects (gap 2)`), and SC-3 is untouched — `recordRunEnd` is not called, no campaign
      best or star is written on either side. `runCertWorstCase` early-returns unless `__DEV__`
      or `CERT_HARNESS`, so no player in a shipped build can reach it. The harm is to the
      INSTRUMENT: an operator taking the SC-5 reading in a dev build can leave a live worst-case
      injection armed behind them, and it fires silently four `Lv` presses later.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Line 1806: `certPendingRef.current = modeRef.current !== 'endless';` knows the MODE
          term of the level half's condition but not the RUN-ENDED term that `:1772` added. The
          arming term and the guarded branch have drifted apart within one function — the same
          shape as round 3, where the arming term knew neither.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 1771-1775 / 1795-1796: the new conjunct sits 34 lines ABOVE a comment that
          states the rule it breaks. The comment is correct and the code below it is not, which
          is worse than either alone — a future reader is told the invariant holds.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 1815-1832 / 1703: `certPendingRef` is written at exactly two places — armed at
          `:1806`, cleared at `:1828` on discharge. NOTHING clears it on a run reset, a level
          change, a mode change or an unmount, so a stranded arm survives indefinitely until the
          discharge preconditions happen to line up.
      - path: "tests/ui/PlayingHost.endless-retry.test.tsx"
        issue: >-
          The `Cert WC` describe now holds four campaign/endless cert cases and none of them
          drives ENDED + tier AUTO. `:1766` (ENDED, tier already Mid) and `:1859` (WR-02, same
          setup) both cycle the tier to Mid FIRST, which is exactly what makes the tier half
          no-op and hides the arming path.
      - path: "tests/ui/PlayingHost.endless-host.test.ts"
        issue: >-
          Lines 1520-1523: ASSERTION 3 pins `runEndedRef` occurrences inside `runCertWorstCase`
          at EXACTLY 1. The most direct repair — teaching `:1806` the run-ended term — adds a
          second occurrence and reds this assertion. The count is a legitimate anti-prose gate
          but it is currently also a fix-blocker; the closure plan has to move it deliberately
          and say why, not discover it.
    missing:
      - >-
        Make the arming term agree with the guarded branch. The minimal shape is
        `certPendingRef.current = !runEndedRef.current && modeRef.current !== 'endless';` at
        `:1806`, or equivalently refuse the whole `defer` bookkeeping on an ended run. Whichever
        is chosen, the invariant to state in the comment is the one already written at
        `:1795-1796` — and this time the code must be an instance of it.
      - >-
        Decide, and write down, what a `Cert WC` press from a mounted campaign Results panel
        with the tier AUTO should do at all. Today it still fires `setTierOverride('mid')`,
        which routes through the tier-change effect to `remountDevSession` — a legitimate reset
        path — so the run does restart coherently. Only the arming is wrong. Do not gate the
        tier half (11-17 prohibition 1, owner decision of 2026-09-26).
      - >-
        Raise `tests/ui/PlayingHost.endless-host.test.ts:1520-1523` from 1 to the new count with
        a stated reason in its own message, or restructure so the second mention is the guard
        term rather than a new route. Leaving it at 1 makes the fix un-landable.
      - >-
        Drive the missing intersection as a case next to the three existing cert cases:
        `mountOnly()`, DO NOT touch the tier, `deliverPhase(SIM.LOST, {lives: 0, score: 2400})`,
        assert the panel, press `Cert WC`, then walk `Lv` four times asserting
        `injectCertWorstCase` stays 0 at every step and `levelSwitchLabel()` reaches
        `level-03` (so the walk is not vacuously short). Measured pre-fix, for the `fails_when`:
        `level-04 inject=0 | level-05 inject=0 | level-06 inject=0 | level-03 inject=1`.
      - >-
        Consider clearing `certPendingRef` on the run-boundary reset paths as belt-and-braces,
        so a future fourth branch cannot strand it again. This is the class fix; the term at
        `:1806` is the instance fix.
  - truth: >-
      `docs/ops/ENDLESS-MODE.md` contains no false statement about the shipped code, and every
      mechanism sentence added this round is backed by a measurement that could actually observe
      what it asserts (11-18 must_have truth 1 and truth 6; 11-18 prohibitions 1 and 3)
    status: failed
    reason: >-
      The A1 clause the plan set out to fix IS fixed and I re-checked it at source. What the
      same plan then added in its place is a NEW false mechanism claim, in the same block, about
      the code round 5 changed — the fifth statement of this shape the phase has had to correct,
      and the second time the fixing plan has introduced the next one.
      THE CLAIM, in three operator- and author-facing places:
      `docs/ops/ENDLESS-MODE.md:261` and `:493` — "the press injects directly into a world whose
      loop is already stopped"; `app/_components/PlayingHost.tsx:1760-1761` — the same sentence
      as a source comment; and `tests/ui/PlayingHost.endless-retry.test.tsx:1824` — the same
      sentence as an assertion message, carrying the words "MEASURED, not derived".
      WHY IT IS FALSE, verified link by link at source in this process rather than adopted from
      the review. (1) `injectCertWorstCase` has exactly one statement:
      `certRequest.value = certRequest.value + 1` (`src/runtime/useGameLoop.ts:785-789`). It
      applies nothing. (2) The ONLY consumer of that request is
      `if (certRequest.value !== certApplied.value) { certApplied.value = certRequest.value;
      applyCertWorstCaseInject(...) }` at `src/runtime/useGameLoop.ts:440-444`, which sits
      INSIDE `onFrame`. (3) `onFrame` runs only while the frame callback is active
      (`:685` `useFrameCallback(onFrame, false)`, `:691-694` `setActive`), and this branch's
      whole premise is that `setActive(false)` has already run. (4) A repo-wide grep for
      `certRequest|certApplied` returns six sites and NONE of them resets either value on a run
      reset, a retry, a level change or a mode change. So the request survives, and
      `applyCertWorstCaseInject` executes on the FIRST FRAME OF THE NEXT RUN — below the
      retry-reset block at `:413-439`, i.e. onto the freshly reset world.
      WHY THE MEASUREMENT DID NOT CATCH IT. `injectCertWorstCase` is `vi.fn()` at
      `tests/ui/PlayingHost.endless-retry.test.tsx:325`. A call count on a stub is structurally
      incapable of observing where the load goes; it can only observe that the host called
      something. 11-17's own assumption block required "Task 1 must MEASURE the injection count
      on that branch rather than assume it; if the measurement contradicts this derivation, the
      measurement wins" — the guard was there, and the instrument was too coarse to trip it. The
      label "MEASURED, not derived" is therefore the least accurate part of the sentence.
      WHY A GAP AND NOT AN ADVISORY, on the line round 3 and round 4 drew and I am keeping.
      Round 4 ruled the `level-03`-is-the-default clause ADVISORY because it changed no
      instruction, no measurement and no operator action. This one changes all three. The doc
      tells an SC-5 operator the injection is contained in a dead world; in fact the next run
      the operator starts — including a `Retry` straight from that panel — begins with a
      worst-case load applied on its first frame. That is silent contamination of precisely the
      frame-budget reading SC-5 exists to take, in the document that IS the instrument for
      taking it. It is the same test round 3 applied when it blocked on a false MECHANISM claim
      in this exact block.
    artifacts:
      - path: "docs/ops/ENDLESS-MODE.md"
        issue: >-
          Line 493 (§ Limits item 2, the round-5 "Extended 2026-09-26" note) and line 261 (the
          run-boundary table row) both end the ENDED-run sentence with "the press injects
          directly into a world whose loop is already stopped". Both need the queued-and-lands-
          next-run statement instead, and the operator consequence spelled out.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 1760-1761: the same sentence in the `runCertWorstCase` comment block, presented
          as the cost of the chosen design ("WHAT IT COSTS"). The real cost is larger than
          stated.
      - path: "tests/ui/PlayingHost.endless-retry.test.tsx"
        issue: >-
          Line 1824: the assertion message asserts the mechanism and labels it "MEASURED, not
          derived", against a `vi.fn()` (`:325`) that cannot see it. The assertion itself
          (`toHaveBeenCalledTimes(1)`) is correct and should stay; its message is what is wrong.
      - path: ".planning/phases/11-endless-mode/11-17-SUMMARY.md"
        issue: >-
          Line 207 carries the same claim into the phase record as an observed result.
      - path: "src/runtime/useGameLoop.ts"
        issue: >-
          Lines 334-335, 440-444: `certRequest` / `certApplied` have no reset on any run
          boundary. This is the mechanism that makes the queued request outlive the run that
          created it. Not a defect the round introduced, but it is the fact the round's
          sentences get wrong, and clearing `certApplied` on the retry-reset would make the
          shipped code match what all three artifacts already say.
    missing:
      - >-
        Correct the sentence in all four places, dated and beside the superseded text per this
        phase's own convention: the press does not inject into the stopped world — it bumps
        `certRequest` (`src/runtime/useGameLoop.ts:787`), which only `onFrame` consumes
        (`:440`), so the worst-case load is QUEUED and applies on the first frame of the next
        run that arms the loop.
      - >-
        State the operator consequence explicitly in § Limits item 2, because this is the half
        that matters for SC-5: a `Cert WC` press from a mounted Results panel contaminates the
        NEXT run, including a `Retry` from that same panel. Say whether the reading must be
        restarted, consistent with the existing "restart the app and take the reading again"
        instruction.
      - >-
        Either strike "MEASURED, not derived" from
        `tests/ui/PlayingHost.endless-retry.test.tsx:1824` and say what the count actually
        proves (that the host called the injector, not where the load went), or make it true by
        asserting on `certRequest` / `certApplied` instead of on the stub.
      - >-
        Decide whether the shipped behaviour should match the sentence rather than the reverse.
        Adding `certApplied.value = certRequest.value;` to the retry-reset block in `onFrame`
        (`src/runtime/useGameLoop.ts:413-439`) would drop a stale request at the next run
        boundary and make "the injection does not outlive its run" true of the code. If that is
        taken, it is a `src/runtime` change and needs its own falsification.
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05) and
      ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from rounds
      2, 3 and 4.
  - truth: "A permanent endless record surface, and electing which of bestScore / bestWave is THE record"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 SC-1/SC-2. ENDLESS-MODE.md § Limits item 4 records it, and 11-08 deliberately
      ships the endless Results overlay as the only endless-record reader without electing a
      primary record (A-08). Carried forward unchanged.
  - truth: "Endless bricks draw an unstretched glow halo (ENDLESS_BRICK_DIMS / A-04)"
    addressed_in: "Phase 14"
    evidence: >-
      Owner-decided accepted debt of 2026-09-26, recorded in ENDLESS-MODE.md § Flagged
      assumptions A-04 and § Limits item 7 with the measured 0.77x / 0.85x stretch. Re-verified
      untouched this round — round 5's only `app/` change is the single conjunct at
      `PlayingHost.tsx:1772` plus comments, nowhere near `loadKey` or the bake deps.
      Carried forward.
advisory:
  - finding: >-
      The round-5 `showPauseOverlay` instrument does NOT catch an `&&` -> `||` mutation of the
      conjunction, and NOTHING ELSE IN THE REPO DOES EITHER. ASSERTION 5
      (`tests/ui/PlayingHost.endless-host.test.ts:1568-1581`) matches `result == null` and
      `uiPhase === 'paused'` as two INDEPENDENT regexes, so both still match when the connecting
      operator flips.
    category: architectural
    reason: >-
      MEASURED IN THIS PROCESS, and it falsifies BOTH upstream statements about it — the
      planner's premise (that a sibling structural gate greps the conjunction as one literal, so
      the mutation would be caught) and 11-REVIEW WR-03's correction (that "the kill comes from
      two pre-existing cases in tests/ui/GameScreen.test.tsx"). I applied
      `!hasLevelError && uiPhase === 'paused' || result == null` to
      `src/runtime/GameScreen.tsx:110-111` and ran the whole of `tests/ui`: 16 files / 142 tests
      ALL GREEN, including `GameScreen.test.tsx` (6/6). The mutation makes the pause overlay
      render during normal play and no test in the workspace sees it —
      `GameScreen.test.tsx:77-85` asserts only the POSITIVE case and there is no negative
      sibling.
      NOT a gap, and the line is worth drawing. 11-17's own declared falsification for this
      member is "`onResume`'s exemption must be RED when `&& result == null` is dropped from
      `showPauseOverlay`" — I ran exactly that and it IS red, failing the round-5 enumeration
      case. The instrument does what its plan claims. The `&&`/`||` hole is a pre-existing
      absence of a negative render case in `GameScreen.test.tsx`, not a phase-11 regression and
      not a must_have. Fix, when someone is in that file: assert the extracted condition against
      one literal, and add a negative case that renders `uiPhase='playing'` and asserts no
      `Resume game` button.
    evidence_status: "measured (mutation, tests/ui 16 files / 142 tests green); pre-existing coverage hole, not a round-5 regression"
  - finding: >-
      `runCertWorstCase`'s comment block claims "setLevelId / setTierOverride are stable useState
      setters" (`app/_components/PlayingHost.tsx:1810-1811`). `setLevelId` is not — it is a
      `useCallback` with `[levelId, onLevelIdChange]` deps at `:252-262`, and it is listed in the
      dependency array immediately below for that reason. Raised as 11-REVIEW IN-02; confirmed
      at source.
    category: other
    reason: >-
      PRE-EXISTING, not round-5 scope: `git log -S` places the sentence in commit `e20b1f2`
      ("fix(D1): lint, zero-alloc draw helpers, mandatory post-D1 Cert"), long before Phase 11.
      The dependency array it justifies is correct either way, so nothing behaves wrongly. One
      word ("stable useState setters" -> "stable setters") clears it.
    evidence_status: "structural only, pre-existing — no failing artifact"
  - finding: >-
      The `Cert WC` row of the run-boundary table (`docs/ops/ENDLESS-MODE.md:261`) is now a
      single table cell of roughly 1,400 words carrying four dated revisions. Raised as
      11-REVIEW IN-03.
    category: other
    reason: >-
      Confirmed by reading. The two-operator-facing-locations rule (11-18 key_link 2) is being
      satisfied by copying the whole of § Limits item 2 into a table cell, which is how it stays
      in sync but is unreadable as a table. When gap 2 above is corrected, the cell should become
      a one-line statement plus a pointer to § Limits item 2 rather than a fifth full restatement.
      Not a gap: nothing in it is false except the clause already carried as gap 2.
    evidence_status: "structural only — legibility, no incorrect content beyond gap 2"
  - finding: >-
      Carried unchanged from round 4, all re-confirmed at source and all deliberately out of
      round-5 scope per 11-17's own assumptions block: (a) the deferred-cert effect
      (`PlayingHost.tsx:1815-1832`) consumes `certPendingRef` BEFORE its own 50 ms timer and
      `clearTimeout`s it on any dependency change, so a change inside the window cancels the
      injection permanently — fails safe; (b) five near-identical run-boundary reset blocks
      (`:1405-1420, :1470-1483, :1514-1524, :1613-1631, :1668-1681`), which remain the structural
      cause of this phase's "fix one half, leave the neighbour" pattern and are the right first
      task for any Phase-14 work in this file; (c) `toggleDevLevel` republishing the outgoing
      level's campaign best (`:1578` before `:1614`) — the MOCK half of round-3 advisory 1 is now
      fixed by 11-17, the structural half is not; (d) `codeOnly()` strips `//` but not `/** */`,
      which is why two functions carry a `//`-only formatting constraint (11-17's CONTRACT A
      works around it with a local `noBlocks()` rather than widening the shared helper).
    category: architectural
    reason: >-
      Each re-read this round and each still true. Recorded so they are not rediscovered as new.
      Note that (a) has acquired a second reason to care: with gap 1 open, a stranded
      `certPendingRef` plus a cancelling dependency change is how an armed one-shot could sit
      indefinitely.
    evidence_status: "structural only — no failing artifact; all four fail safe or are inert today"
  - finding: >-
      Two lint warnings, both in test code, both still present and unchanged since round 3:
      `Array type using 'ReadonlyArray<T>' is forbidden` at
      `tests/ui/PlayingHost.endless-host.test.ts:367` and `:372`.
    category: other
    reason: >-
      Re-measured in this process: `npx eslint` over the four changed source/test files reports
      0 errors and exactly 2 warnings. `npx tsc --noEmit` exits 0. Cosmetic; `eslint --fix`
      clears it.
    evidence_status: "measured (eslint 0 errors / 2 warnings, tsc exit 0), non-blocking by severity"
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready without
      a frame spike that breaks the Mid budget
    test: >-
      Launch a dev build (NOT a `CERT_HARNESS` / profiling build — that one mounts on
      `level-03` and auto-arms the cert injection); arm the perf overlay; press the `Endless`
      button in the `__DEV__` dev row on the playing HUD; play waves 1 through 5; watch each
      transition specifically — the moment the last brick of a board breaks and the next board
      appears. DO NOT PRESS `Cert WC` AT ANY POINT, and this round makes that instruction
      stronger rather than weaker: gap 1 means a press from an ended campaign panel can leave a
      worst-case injection ARMED behind you, and gap 2 means a press on the other branch QUEUES
      a load that lands on the first frame of your NEXT run. If `Cert WC` is pressed at all,
      restart the app and take the reading again. `Lv` is safe (it is an explicit exit that ends
      the run visibly). Carry these corrections to ENDLESS-MODE.md as it stands after round 5:
      the glow-atlas re-bake reason is correctly WITHDRAWN — do not discard a reading for it;
      the round-4 `level-03`-is-the-default error is CORRECTED (advisory A1 closed); but the
      round-5 sentence saying the injection lands "in a world whose loop is already stopped" is
      WRONG (gap 2) — treat the injection as live and contaminating the next run.
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no `[audio] preload soft-fail`
      line in the log mid-run; frame times stay inside the Mid budget across each transition
      (p50 <= 16.7 ms, p95 <= 20 ms). The stretched glow halo on every brick is EXPECTED and
      ACCEPTED (A-04) — not a fifth failure signature.
    why_human: >-
      No automated step in this repo can produce a frame on hardware. Everything proven so far
      shows only that the bake/audio-preload COLD PATH IS NOT ENTERED at a transition — a source
      argument (11-05's D-14 re-key of `loadKey` onto brick dimensions alone) plus a jsdom
      observation. The 0.56 ms generate+compile figure is a Node microbenchmark scaled by a
      15.5x Hermes ratio taken from an iOS simulator. No round-5 task claimed this half, and
      N-END-03 correctly stays `[ ]`.
  - truth: >-
      (Backstop, 11-15) E1 — a 320px Results panel at a 7-digit score and a 4-digit wave shows
      no wrap and no clipping
    test: >-
      On a device or a layout-capable renderer, open an endless Results panel with
      `score = 9999999` and `wave = 1234` and inspect the `Score ·`, `Wave ·`, `Best ·` and
      `Best wave ·` lines at the shipped 320px panel width.
    expected: "Every line renders on one row, fully visible, with no ellipsis and no overflow."
    why_human: >-
      `verification: backstop`. jsdom computes no layout, so this cannot be observed by any test
      this repo can run. 11-UI-SPEC's ~28-monospace-character fit is arithmetic, not a
      rendering; asserting it would convert a backstop into a false `covered`. Abstained, as
      11-09, 11-11, 11-12, 11-15 and 11-17 each left it.
  - truth: >-
      (Backstop) E3 — a 48px HUD row at a 7-digit score and a 3-digit combo shows no wrap and no
      clipping
    test: >-
      Same, against the playing HUD row at `score = 9999999` and `combo = 137`.
    expected: "The HUD row renders on one line at 48px with no wrap and no clipping."
    why_human: "Same — jsdom computes no layout. Abstained."
human_verification:
  - test: >-
      SC-5 device reading — see `behavior_unverified_items[0]` for the full procedure and the
      three corrections to carry into it, one of which is new this round and makes the
      do-not-press warning stricter.
    expected: "p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures."
    why_human: "No automated step in this repo can produce a frame on hardware."
  - test: "E1 / E3 overflow backstops — see `behavior_unverified_items[1]` and `[2]`."
    expected: "No wrap, no clipping, at the stated extreme values."
    why_human: "jsdom computes no layout."
  - test: >-
      FLAGGED PROHIBITION (judgment tier, carried by four consecutive plans and now by 11-18):
      "MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md that the shipped code does not
      hold." Non-authoritative verifier judgement: NOT HELD, and this round it is NOT a judgement
      call — the falsifying evidence is structural and is recorded as gap 2 (the press does not
      inject into the stopped world; the request is queued and lands on the next run's first
      frame). Round 4's A1 falsehood IS corrected; a new one replaced it in the same block. The
      owner decision required here is not whether the clause is wrong but whether a fifth
      correction round is proportionate, or whether the block should be rewritten once from the
      shipped mechanism rather than patched a sixth time.
    expected: "An owner decision: authorise the gap-2 correction as written, or commission a single rewrite of § Limits item 2 and the table row from source."
    why_human: >-
      unverified-prohibition — human review recommended. The prohibition itself is judgment tier;
      the specific falsification backing it this round is not, which is why it also appears as a
      gap rather than only here.
  - test: >-
      FLAGGED PROHIBITIONS (judgment tier, all remaining 11-17 and 11-18 statements). Verifier
      judgement, non-authoritative: HELD for all of them, on the evidence in this report.
      Specifically: the `Cert WC` TIER half is not gated and the control is not disabled
      (`:1779-1782` untouched; the endless tier-half boundary case is green); a press from a LIVE
      campaign run is byte-for-byte unchanged (the two pre-existing cert cases are unedited and
      stay GREEN under the conjunct-removal mutation that reds both new cases); no SIXTH reset
      block was added (`grep -c 'runEndedRef.current = false;'` is 5, unchanged); no latch is
      cleared without its chrome writes; none of 11-15's three mutation-killed assertions was
      deleted, weakened or re-pointed; the three `if (!runEndedRef.current)` record-once guards
      survive and are now pinned by shape and by count; no block comment was added to either
      function; no counted literal is restated in prose inside `runCertWorstCase`; no existing
      `endless-retry` assertion was edited to accommodate the repaired mock (the `0` arm keeps
      every level-01 case byte-identical); `git diff -- src/core src/levelgen` is empty and the
      glow-atlas bake key is untouched; 11-17 did not touch REQUIREMENTS.md and 11-18 touched
      only it plus two docs; no plan 11-01..11-17 was renumbered or superseded; no superseded
      claim was erased (both the ENDLESS-MODE and 11-15-SUMMARY corrections sit beside their
      originals, dated); the do-not-press and "restart the app and take the reading again"
      instructions survive verbatim; the SC-5 OPEN block, the A-04 acceptance and the round-3
      glow-atlas withdrawal all survive; no device reading was written; and N-END-03 is untouched
      at `[ ]` with its caveat intact.
    expected: "Spot-confirm or overrule the judgement."
    why_human: >-
      unverified-prohibition — human review recommended. Judgment tier by declaration; recorded
      here rather than silently absorbed into the score.
---

# Phase 11: Endless Mode — Verification Report (round 5)

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T21:55:00Z
**Status:** gaps_found
**Re-verification:** Yes — round 5, after plans 11-17 and 11-18

## Goal Achievement

### Observable Truths

#### The five ROADMAP Success Criteria

| # | Truth (SC) | Status | Evidence |
|---|------------|--------|----------|
| 1 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ VERIFIED | Regression this round. `tests/endless.wave-loop.test.ts`, `tests/endless.determinism.test.ts` and the `endless-retry` / `endless-run` host suites are all inside the green workspace run (97 files / 648 tests). Round 4's run-ENDED half — the hoisted `applyChrome` latch — is unchanged and still mutation-pinned; round 5 adds the last re-arm path and did not touch the wave loop (`git diff 86c031b..HEAD -- src/core src/levelgen` empty) |
| 2 | Difficulty rises with wave number through the generator's difficulty input, with the ramp written down | ✓ VERIFIED | Regression. `docs/ops/ENDLESS-MODE.md:15-29` is the written-down ramp (wave 1 = difficulty 0, +1 per wave, clamped at `D_MAX = 20`, D-01/D-02); the policy is two pure integer functions in `src/services/endless/ramp.ts` guarded by `tests/endless.ramp.test.ts`. Untouched by round 5 |
| 3 | Endless records stored separately from campaign progress; endless play cannot unlock, lock or alter a campaign level's best or stars | ✓ VERIFIED | Regression plus a round-5 strengthening. Storage firewall (`RecordRunEndArgs` discriminated union, `ENDLESS_TELEMETRY_KEY`, `tests/storage.endless-firewall.test.ts`) unchanged; the round-3 driven render case in `endless-record.test.tsx` unchanged; round 5 closes the run-ENDED campaign twin (WR-02) with a case whose pass is non-vacuous for the first time — the `getBestForLevel` mock now honours its `id` and the case carries a positive control |
| 4 | A seeded endless run is reproducible end to end — same seed and inputs replay to the same wave | ✓ VERIFIED | Regression. `tests/endless.determinism.test.ts` green; scope (headless only; a device run is not replayable, no per-tick intent recorder) is recorded in ENDLESS-MODE.md and re-stated in 11-17's flagged assumptions. Untouched by round 5 |
| 5 | Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The source argument holds and is unchanged: the advance block sits ABOVE the `simFrozen` computation in `onFrame` (`src/runtime/useGameLoop.ts:446-458`), so a transition never stops or restarts the frame callback and no `setActive` call is involved. The DEVICE half is unmeasurable in jsdom and no round-5 task claimed it. Routed to human verification; `N-END-03` correctly stays `[ ]` |

#### Round-4 gap, re-verified in full

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | No path that begins or resumes a run can be locked out of its own chrome, and the set `every` quantifies over is DERIVED rather than asserted (11-15 truth 6; the round-4 gap) | ✓ VERIFIED | Closed by the GUARD shape. `PlayingHost.tsx:1771-1775`. MUTATION: deleting `:1772` reds exactly the two new `endless-retry` cases while the two pre-existing live-run cert cases stay green (29 passed / 2 failed). The enumeration is now mechanical — `setActive(true)` = 5, `setLevelId(` = 3, eight members, each classified |
| 7 | Every member's classification is BOUND TO ITS SITE, not to an aggregate | ✓ VERIFIED | MUTATION: relocating `onRetry`'s `runEndedRef.current = false;` (`:1471`) into `goNext` holds the file-wide count at 5 and still reds ASSERTION 4 by name — "onRetry must clear the run-ended latch inside its OWN body ... expected -1 to be greater than or equal to 0" |
| 8 | `onResume`'s exemption is stated at its FULL source condition and the load-bearing term is named | ✓ VERIFIED (coincidental-reliance) | ASSERTION 5 extracts `showPauseOverlay` from `src/runtime/GameScreen.tsx` and requires BOTH terms. MUTATION: dropping `&& result == null` reds the case, exactly as 11-17 declared. Flagged `coincidental-reliance` / incidental-ordering: it relies on the two terms being conjoined, which nothing asserts — see advisory 1 |
| 9 | The `applyChrome` latch contract is no longer VACUOUS (round-4 advisory A2) | ✓ VERIFIED | MUTATION: `if (!runEndedRef.current)` -> `if (true)` at `PlayingHost.tsx:1098` now FAILS at `tests/ui/PlayingHost.endless-host.test.ts:726` on `GUARD_SHAPE`. The same mutation left round 4 green at 97 files / 645 tests. The contract states its own limits, and the endless WON branch is asserted honestly and separately |
| 10 | A MOUNTED campaign Results panel keeps reading the level it was played on (WR-02), and the mock that hid it is repaired non-vacuously | ✓ VERIFIED | Both halves red under the conjunct-removal mutation; the positive control (four `Lv` presses move `best` to 7777 through the legitimate `toggleDevLevel` reset path) proves the mock is no longer blind |
| 11 | The cert harness's CAMPAIGN behaviour from a LIVE run is byte-for-byte identical | ✓ VERIFIED | `:1737` and `:1782` unedited (`git diff` shows no change inside either case) and GREEN under the same mutation that reds both new cases |
| 12 | Every new instrument is FALSIFIED with a named expected RED signal | ✓ VERIFIED | Four of the six declared falsifications re-run independently in this process (behaviour case, WR-02 case, `if (true)`, clear-relocation, `&& result == null` drop) — all red as declared |

#### Round-5 documentation and record truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | ENDLESS-MODE.md's `level-03` characterisation is corrected (round-4 advisory A1) | ✓ VERIFIED | `docs/ops/ENDLESS-MODE.md:455-464`, dated, a replacement clause not a deletion. Re-checked at source: `GameHost.tsx:68` (`'level-01'`), `:196` (`CERT_HARNESS ? 'level-03' : activeLevelId`), `catalog.ts` `PLAYABLE_LEVEL_ORDER` with `level-03` last |
| 14 | Both operator-facing statements of the `Cert WC` level half carry BOTH terms of its condition | ✓ VERIFIED | `:261` and `:481-486` each state all three terms (`!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`) and agree with each other |
| 15 | `docs/ops/ENDLESS-MODE.md` contains no false statement about the shipped code | ✗ FAILED | Gap 2. The A1 falsehood is gone; a new one about the round-5 mechanism replaced it in the same block, at `:261` and `:493` |
| 16 | `11-15-SUMMARY.md`'s safety claim is corrected in place, beside the table that is right | ✓ VERIFIED | Dated `CORRECTION 2026-09-26 (round 5)` block at `:189+`. The five-row table survives; the correction restates the two-grep derivation, tabulates the eight members and names member 6 as structurally invisible to a chrome-writer enumeration |
| 17 | N-END-01 and N-END-02 are re-ticked with dated closure notes naming instruments, not conclusions; N-END-03 stays unchecked | ✓ VERIFIED | `.planning/REQUIREMENTS.md:177-182`, committed separately (`b3f1397`) so the record of what was believed stays recoverable. See "Is the re-tick warranted?" below |
| 18 | No `__DEV__` control arms a one-shot whose discharge preconditions the same change has made unreachable | ✗ FAILED | Gap 1. Reproduced by driven probe: 0 injections at the press, 1 on a later campaign session four `Lv` presses away. Pre-round-5 the same drive gave 1 at the press and 0 on the walk |

**Score:** 37/40 truths verified (1 present, behavior-unverified). The table above shows the 18 load-bearing truths; the remaining 22 are round-1..4 must-haves re-checked as regressions (all still ✓ — the workspace suite is green at 97 files / 648 tests, up 3 from round 4's 645, and every round-5 change is confined to the four files in the diff).

### Is the N-END-01 / N-END-02 re-tick warranted?

**Yes, on my own evidence, with one thing worth saying out loud.** Both requirements' substance is verified independently above (SC-1 and SC-3), the closure notes name instruments rather than conclusions, they state plainly that the claim rests on the round-4 verifier's judgement plus round-5 instruments and **not** on a fresh first-principles audit, and they point at N-END-03's still-open device half. That is an unusually honest closure note and I would not send it back.

The thing worth saying: N-END-01's note credits `an ENDED campaign run is not re-armed ...` as "the last re-arm path". Gap 1 shows that press still arms something on the neighbouring branch. That does not falsify N-END-01 — the requirement is about the endless wave loop and its zero-lives end, and the stranded one-shot is campaign-side `__DEV__` bookkeeping that touches neither. The box stays `[x]`. But the word "last" is one round premature, and if the closure plan for gap 1 is written it should amend that clause rather than leave a fifth instance of "correct about the half that was fixed, silent about the neighbour" in the requirements file itself.

**N-END-03 stays `[ ]`, correctly.** No round-5 task claimed the device half, and none did.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/PlayingHost.tsx` | Level half guarded on the run-ended latch | ✓ VERIFIED (with gap 1 open in the same function) | `:1772` present and mutation-pinned; `:1806` arming term is gap 1 |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | The ENDED-campaign behaviour case + the WR-02 sibling + the repaired mock | ✓ VERIFIED | Both cases red under the conjunct-removal mutation; positive control present; 31 tests in the file, all green on the unmutated tree |
| `tests/ui/PlayingHost.endless-host.test.ts` | CONTRACT A (re-arm enumeration) + CONTRACT B (de-vacuumed latch contract) | ✓ VERIFIED | Both mutation-killed in this process; 26 tests green |
| `docs/ops/ENDLESS-MODE.md` | A1 corrected; both terms stated; SC-5 block intact | ⚠️ HOLLOW — corrected where asked, newly wrong elsewhere | A1 closed (`:455-464`); both terms stated (`:261`, `:481-486`); SC-5 OPEN block, do-not-press warning and restart instruction all survive verbatim. Gap 2 is at `:261` and `:493` |
| `.planning/phases/11-endless-mode/11-15-SUMMARY.md` | Correction beside the table | ✓ VERIFIED | `:189+`, dated, table kept |
| `.planning/REQUIREMENTS.md` | N-END-01/02 re-ticked with dated notes; N-END-03 untouched | ✓ VERIFIED | `:177-182`; separate commit `b3f1397` |
| `src/runtime/useGameLoop.ts` | Not in scope for round 5 — read only | ✓ UNCHANGED | `git diff 86c031b..HEAD -- src/runtime` empty. Read here because gap 2's mechanism lives in it |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `runCertWorstCase` level half (`PlayingHost.tsx:1776`) | compiled-push gate effect (`:676-702`) | `setLevelId('level-03')` -> `retry(); setActive(true)` | ✓ WIRED AND NOW GUARDED | Driven probe: on an ended campaign run the `Lv` label stays `level-01`, `retry` not called, zero `setActive(true)` |
| `runCertWorstCase` `defer` branch (`:1806`) | deferred-cert effect (`:1815-1832`) | `certPendingRef` one-shot | ✗ NOT_WIRED — armed without a reachable discharge | Gap 1. On the campaign / tier-AUTO branch the arm fires and the `levelId === 'level-03'` precondition has just been made unreachable by `:1772` |
| `injectCertWorstCase` (`useGameLoop.ts:785`) | `applyCertWorstCaseInject` (`:442`) | `certRequest` SharedValue consumed only in `onFrame` | ⚠️ PARTIAL — real, but not what three artifacts say it is | Gap 2. With the loop inactive the request is queued, not applied; nothing resets `certApplied`, so it lands on the next run's first frame |
| `runCertWorstCase` level half | `getBestForLevel` preload (`:459-490`) -> `setResultBest` -> `Best ·` | `levelId` change past a mounted panel | ✓ CLOSED | WR-02 case green; red under conjunct removal; positive control proves observability |
| `onResume` (`:1206-1221`) | `PauseOverlay` | `showPauseOverlay` (`GameScreen.tsx:110-111`) | ✓ WIRED | Both terms asserted by ASSERTION 5; dropping `result == null` reds it. See advisory 1 for what that assertion does not cover |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Results overlay `Best ·` (campaign, mounted) | `resultBest` | `getBestForLevel(levelId)` via `previousBestRef` | Yes — and now observably per-level, the mock having been repaired | ✓ FLOWING |
| Results overlay `Best ·` / `Best wave ·` (endless) | endless watermark refs | `ENDLESS_TELEMETRY_KEY` snapshot at mount | Yes | ✓ FLOWING |
| `Cert WC` worst-case load | `certRequest` -> `applyCertWorstCaseInject` | `onFrame` only | Yes, but on a LATER frame than three artifacts claim | ⚠️ STATIC-IN-DOCS — see gap 2 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Workspace baseline | `npx vitest run` | 97 files / 648 tests passed | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint (4 changed files) | `npx eslint <files>` | 0 errors, 2 carried warnings | ✓ PASS |
| Gap-1 repro, shipped source | driven probe, campaign / ENDED / tier AUTO, press `Cert WC` then 4× `Lv` | `lvAtPress=level-01 injectAtPress=0 walk=04:0 \| 05:0 \| 06:0 \| 03:1 total=1` | ✗ FAIL (defect reproduced) |
| Gap-1 delta, conjunct removed | same probe against the round-4 source | `lvAtPress=level-03 injectAtPress=1 walk=01:1 \| 04:1 \| 05:1 \| 06:1 total=1` | ✗ FAIL (proves round 5 caused the delta) |
| Round-4 gap closed | delete `PlayingHost.tsx:1772`, run `endless-retry` | 2 failed / 29 passed — both new cases red, both live-run cert cases green | ✓ PASS |
| A2 de-vacuumed | `if (!runEndedRef.current)` -> `if (true)` at `:1098`, run `endless-host` | FAIL at `endless-host.test.ts:726` | ✓ PASS |
| Site binding real | relocate `onRetry`'s clear into `goNext` (file count held at 5), run `endless-host` | FAIL naming `onRetry` | ✓ PASS |
| `onResume` exemption pinned | drop `&& result == null` from `showPauseOverlay`, run `endless-host` | FAIL on the re-arm enumeration case | ✓ PASS |
| `showPauseOverlay` operator | `&&` -> `\|\|`, run all of `tests/ui` | 16 files / 142 tests GREEN | ✗ FAIL (mutation survives everywhere — advisory 1) |

All source mutations were reverted and `git status` is clean apart from the three pre-existing untracked/modified `.planning` files present at session start.

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| — | `find scripts -path '*/tests/probe-*.sh'` | no matches; no PLAN declares a probe script | ? SKIP (this repo's phase gates are vitest cases and `scripts/assert-*.mjs`, all run above) |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| N-END-01 | 11-01/03/04/05/06/07/09/10/13/14/15/16/17/18 | Clearing a board advances in the same run; lives/score/combo carry over; the run ends only at zero lives | ✓ SATISFIED | SC-1 above. `[x]` with a dated round-5 closure note; the re-tick is warranted (see caveat on the word "last") |
| N-END-02 | 11-02/05/06/07/08/09/10/11/12/15/17/18 | Endless records stored separately; endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED | SC-3 above, strengthened this round by the non-vacuous WR-02 case. `[x]` with a dated closure note |
| N-END-03 | 11-01/03/04/05/06/07/08/09/11/14/16/18 | Seeded endless run reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ? NEEDS HUMAN | Reproducibility half ✓ (SC-4). Frame-budget half device-gated and unmeasured. `[ ]` is correct |

No orphaned requirements: every ID mapped to Phase 11 in REQUIREMENTS.md is claimed by at least one plan, and every ID in a plan's `requirements` field exists in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/_components/PlayingHost.tsx` | 1806 | Latch armed without the guard term its own branch now carries | 🛑 Blocker | Gap 1 |
| `docs/ops/ENDLESS-MODE.md` | 261, 493 | Mechanism sentence contradicted by the shipped code | 🛑 Blocker | Gap 2 |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | 1824 | Assertion message labelled "MEASURED, not derived" against a `vi.fn()` that cannot observe the claim | 🛑 Blocker | Gap 2 |
| `tests/ui/PlayingHost.endless-host.test.ts` | 367, 372 | `ReadonlyArray<T>` lint warning | ℹ️ Info | Carried, cosmetic |
| `app/_components/PlayingHost.tsx` | 1810 | "stable useState setters" — `setLevelId` is a `useCallback` | ℹ️ Info | Pre-existing (commit `e20b1f2`) |

No `TBD`, `FIXME` or `XXX` marker exists in any file this phase modified.

### Human Verification Required

Four items, in the frontmatter `human_verification` block: the SC-5 device reading (with a stricter do-not-press instruction than round 4 gave, because of gaps 1 and 2), the two layout backstops, and the two flagged-prohibition decisions. The first prohibition is no longer a pure judgement call — its falsification this round is structural and is recorded as gap 2.

### Gaps Summary

**Round 4's gap is genuinely closed, and closed well.** I re-ran five separate mutations rather than reading the summaries, and every one of them behaved as the plan declared: the conjunct is load-bearing, the live-run behaviour is untouched, the vacuous contract is repaired, the site binding survives a relocation the aggregate count cannot see, and the `onResume` exemption is pinned to the term that actually does the work. The enumeration went from asserted to derived, and the two documentation corrections are dated, placed beside what they supersede, and true where round 4 said they were false.

**And round 5 shipped two new defects of exactly the kinds this phase keeps shipping.** Both are one step away from something the round did check, which is now a five-round pattern rather than a coincidence:

1. **Gap 1 is round-3's defect on the neighbouring branch.** 11-17 measured the ENDED-run / tier-ALREADY-Mid intersection thoroughly and never asked what ENDED-run / tier-AUTO does. It arms a one-shot the same conjunct has made undischargeable, breaking a rule the same function states in prose 34 lines below. I reproduced it both ways: 0 at the press and 1 four `Lv` presses later on the shipped tree; 1 at the press and nothing later on the round-4 tree. The round manufactured it.

2. **Gap 2 is a false mechanism claim introduced by the plan that was fixing the previous false mechanism claim in the same block** — the second time that has happened in this phase. The saving detail is that the instrument, not the author, is what failed: `injectCertWorstCase` is a `vi.fn()`, so the count of 1 that the plan correctly insisted on measuring simply cannot see whether the load was applied or queued. It was queued. It lands on the next run, which is the run an SC-5 operator is about to measure.

Neither breaks a Success Criterion — both are `__DEV__` / `CERT_HARNESS` only, campaign-side, with nothing recorded and no campaign best or star written. They are gaps because this phase has twice ruled that this exact defect class is a gap, and because the second one damages the instrument an unmeasured Success Criterion depends on.

**The structural cause is unchanged and is now four rounds old.** `runCertWorstCase` has two independent halves, three conditions and a one-shot, and every round has fixed one term while a sibling term stayed ignorant of the change. The five duplicated reset blocks (advisory 4b) are the same pattern in a different function. The closure plan for gap 1 should fix the class — agree the arming term with the branch, and consider clearing `certPendingRef` at the run-boundary resets — rather than the fourth instance.

One practical constraint for that plan, so it is not discovered mid-flight: `tests/ui/PlayingHost.endless-host.test.ts:1520-1523` pins `runEndedRef` occurrences inside `runCertWorstCase` at exactly 1, which blocks the most direct repair. Move it deliberately, with a reason in its own message.

---

_Verified: 2026-09-26T21:55:00Z_
_Verifier: Claude (gsd-verifier)_
