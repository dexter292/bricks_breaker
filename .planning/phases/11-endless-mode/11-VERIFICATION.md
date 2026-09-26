---
phase: 11-endless-mode
verified: 2026-09-26T20:05:00Z
status: gaps_found
score: 31/33 must-haves verified
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
covered_digest: "v1:sha256:18e7fab634f8005aca32fc67cef2b994920fcd5ecedb2ae7d21e036f36102578"
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 20/23
  gaps_closed:
    - >-
      Round-3 gap 1 — "An endless run that has ENDED leaves a single coherent state: after the
      run boundary has fired, nothing the loop produces moves the run's own numbers — not the
      wave, and not the score, lives or combo the Results overlay is displaying". CLOSED, and
      closed by exactly the one-statement hoist round 3 specified. `if (runEndedRef.current) {
      return; }` is now the FIRST statement of `applyChrome` (PlayingHost.tsx:991-993), above
      `setSimPhaseNum` / `setLives` / `setScore` / `setCombo` / `setStallTier` (:994-998); the
      branch-level copy 11-13 added at the old :976 is REMOVED rather than left as a second,
      dead test. Verified by MUTATION in this process, not by reading: deleting the hoisted
      guard turns NINE cases RED across THREE files — the source contract, the rendered
      `result-slot` case, the failed-START copy case, the LOST case, the WALK case, the
      mid-run-failure case, the WR-04 ended-run case, the CAMPAIGN straggler case and the
      failed-START chrome case. Round-3's measured harm was re-driven and is gone: the mounted
      overlay stays at `Score · 2400 / Best · 2400 / New Record / Lose / Out of lives` across a
      straggler `WON {lives:3, score:9999}`, with host props frozen at `{score:2400, lives:0}`.
      All four of round-3's `missing[]` items were executed: the hoist, the distinguishable
      straggler payload in the three gap-3 drives, the RENDERED sibling in
      `endless-record.test.tsx:697-764`, and the source contract extended to the function
      PREAMBLE (`endless-host.test.ts:716-734, :754-761`).
    - >-
      Round-3 gap 2, the CODE half — "`runCertWorstCase` arms `certPendingRef.current = true`
      on a `defer` whose preconditions 11-14's own mode gate made unreachable". CLOSED, and
      closed by the code fix round 3 said to prefer over the documentation fix.
      `certPendingRef.current = modeRef.current !== 'endless';` (PlayingHost.tsx:1773).
      Verified by MUTATION: reverting the term to `= true` turns THREE cases red — the source
      contract (`endless-host.test.ts:1382`) and BOTH endless sub-branch drives
      (`endless-retry.test.tsx:1600` below `level-03`, and `:1687` already on `level-03`).
      11-16 went past the reported branch: the second endless sub-branch, where the deferral was
      never stranded and DID discharge onto the freshly restarted endless board, was measured
      and is now also suppressed — a deliberate behaviour change the plan states rather than
      slips in. Round-3's P7 walk is now a green regression case rather than a reproduction.
    - >-
      Round-3 gap 2, the DOCUMENTATION half — "ENDLESS-MODE.md:433-435 opens the `Cert WC`
      bullet unconditionally ... The sentence is false for half the control it describes".
      CLOSED. The bullet (:433-442) now scopes the injection claim to the branch it was measured
      true of ("when the forced tier is ALREADY `mid`", `injectCertWorstCase` 0 -> 1, run still
      live) and states explicitly that the other branch "returns at its `defer` branch before
      the injection and injects NOTHING" (0 -> 0), with the correct alternative disqualification
      reason. The stranded one-shot is written down under a DATED "Re-scoped 2026-09-26
      (round 4)" note (:447-462) placed beside the superseded text, covering BOTH sub-branches
      and stating the post-fix measurement (0 at the press, 0 across the `Lv` walk). The
      boundary-table row at :261 carries the same two-branch statement, so the two
      operator-facing locations agree. The do-not-press warning (:426) and the "restart the app
      and take the reading again" instruction (:497) survive verbatim; the round-3 glow-atlas
      withdrawal (:474-489) survives intact; § Limits item 2's device block is still OPEN
      (:414-425) and N-END-03 is still unchecked.
  gaps_remaining: []
  regressions:
    - >-
      NEW this round and introduced BY the hoist. `runCertWorstCase`'s level half
      (PlayingHost.tsx:1742-1745) is a SIXTH path that re-arms the frame loop, and it is the one
      path that does so without clearing `runEndedRef` or writing chrome. 11-15 enumerated FIVE
      reset sites — correctly, they are the five non-`applyChrome` chrome WRITERS — and its own
      safety argument is about every path that "begins or resumes a run", which is the larger
      set. Measured end to end in this process on the real host: CAMPAIGN, tier already Mid,
      level `level-01`, run ENDED at `{score:2400, lives:0, result:'lose'}` -> press `Cert WC`
      -> `setLevelId('level-03')` fires with NO reset -> the compiled-push gate effect
      (PlayingHost.tsx:700-702) calls `retry()` and `setActive(true)` -> a fresh board is live
      behind the still-mounted lose overlay while `runEndedRef` is still true. Post-hoist every
      subsequent mirror is swallowed: a `PLAYING {lives:2, score:555}` moves nothing, and a
      `LOST {lives:0, score:8888}` leaves `recordRunEnd` at 0, `result` at `'lose'` and — the
      part that is strictly new — NO `setActive(false)` at all, so the loop is never stopped.
      Measured with the hoist removed, the same drive repaints 555/2 then 8888/0 and DOES call
      `setActive(false)`. `__DEV__` / `CERT_HARNESS` only, campaign-side, no telemetry and no
      campaign best or star written on either side of the change. See gap 1.
gaps:
  - truth: >-
      No resume path can be locked out of its own chrome: every path that begins or resumes a
      run clears the latch before re-arming the loop AND writes lives, score, combo, stall tier
      and sim phase itself (11-15 must_have truth 6; the plan's own T-11-32 risk row, "a hoisted
      guard that locks a NEW run out of its own chrome"; 11-15 prohibition "MUST NOT freeze a
      run that has not ended")
    status: partial
    reason: >-
      The hoist itself is right and I proved it by mutation rather than by reading: nine cases
      across three files go RED when the guard is deleted, including the rendered `result-slot`
      case and the campaign straggler case. Round-3 gap 1 is genuinely closed and every item in
      its `missing[]` was executed. What is NOT true is the safety property 11-15 asserted to
      justify the hoist, and it is false on a path the plan did not enumerate.
      11-15 truth 3 — "`applyChrome` is the only writer that takes them from a mirror, and the
      other five writer sites are the run RESET paths ... No sixth producer exists" — is CORRECT
      and I re-enumerated it at source: `grep 'setScore(|setLives(|setCombo(|setStallTier(|
      setSimPhaseNum('` returns exactly six sites, :994-998 plus :1413, :1476, :1520, :1626,
      :1674. All five reset sites clear `runEndedRef` BEFORE their own chrome writes (:1407,
      :1471, :1515, :1621, :1669). That enumeration is of chrome WRITERS.
      Truth 6 is about a different and larger set — paths that BEGIN OR RESUME A RUN — and
      11-15-SUMMARY.md:177 states plainly that "All five were read in the shipped source this
      task". There is a sixth. The compiled-push gate effect at :676-702 ends in `retry();
      setActive(true);` and fires on any `levelId` change with `modeRef.current === 'campaign'`.
      `goNext` (:1503) and `toggleDevLevel` (:1578) each clear the latch and write chrome
      themselves before triggering it. `runCertWorstCase`'s level half at :1742-1745 does
      neither: `setLevelId('level-03'); defer = true;` and then, with the tier already `mid`,
      an immediate `return` at :1774.
      MEASURED in this process on the real host through this repo's own `endless-retry` harness
      (scratch probe, since deleted; `git status` clean). CAMPAIGN, `mountOnly`, tier cycled to
      Mid, `LOST {lives:0, score:2400}` -> panel `result='lose'`, `score=2400`, `lives=0`,
      `recordRunEnd` 1. Then ONE press of `Cert WC`:
      `Lv` label moves `level-01` -> `level-03`; `retry()` 1; `setActive` calls
      `[[false],[false],[false],[true]]`; `injectCertWorstCase` 1; `result` still `'lose'`.
      A fresh board is now being simulated behind a mounted Results overlay for a run that is
      over. Then `PLAYING {lives:2, score:555}` -> host stays `{2400, 0}`. Then
      `LOST {lives:0, score:8888}` -> host stays `{2400, 0}`, `result` stays `'lose'`,
      `recordRunEnd` stays 0, and `setActive(false)` is NEVER called.
      THE DELTA THE HOIST CAUSED, measured both ways rather than argued. With the hoisted guard
      removed, the identical drive gives `{555, 2}` then `{8888, 0}` and a trailing
      `setActive(false)`. So the hoist did not create the orphaned run — the missing reset at
      :1742-1745 predates this phase — but it converted a visible, self-terminating incoherence
      into a SILENT one that never stops the frame loop. `11-REVIEW.md` WR-01 reports this; I
      reproduced it rather than adopting it, and one of its clauses does NOT hold: "a loss on
      that hidden run reaches no telemetry" was already true before the hoist
      (`handleRunEnded` sits behind `if (!runEndedRef.current)` at :1098/:1105 in both
      versions, and `recordRunEnd` measured 0 in both). The genuinely new harm is the
      unstoppable loop, not the lost record.
      THE SAME PATH IS ALSO THE ONLY REACHABILITY FOR WR-02, so it is folded in here rather
      than raised twice. The `getBestForLevel` publication guard at :476/:486 tests the MODE,
      and the defect class 11-12's own comment describes ("repainted a MOUNTED Results
      overlay's `Best ·`") has a run-ENDED campaign twin. It needs a `levelId` change that does
      not clear `result`, and :1742-1745 is the only such writer in the file. Measured with a
      level-aware `getBestForLevel` mock (the shipped harness mock ignores its `id`, which is
      why no existing case can see it): the mounted campaign panel's `best` goes 2400 -> 7777
      across the press — level-03's best displayed over a level-01 run. One reset closes both.
      SEVERITY, scoped to the same standard round 3 applied to its own two gaps. NO SUCCESS
      CRITERION FAILS: all five SCs are about endless, and the endless side of this control is
      clean — `modeRef.current !== 'endless'` makes the level half unreachable while endless
      (mutation-pinned), and the tier half routes through `remountDevSession` ->
      `startEndlessRun`, which clears the latch. SC-3 is untouched: nothing is written, no
      campaign best or star changes, `recordRunEnd` stays 0. `runCertWorstCase` early-returns
      unless `__DEV__` or `CERT_HARNESS`, `GameHost` is the only other `levelId` writer and it
      only echoes PlayingHost's own `onLevelIdChange`, so no player in a shipped build can
      reach any of this. The state is also recoverable — the overlay's `Retry` still routes
      through `onRetry`, which clears the latch.
      WHY IT IS A GAP AND NOT AN ADVISORY, stated once. It is a round-4 plan's own must_have
      truth, falsified by a reproducible drive, in a file this round git-modified, and it is the
      FOURTH consecutive occurrence of this phase's signature failure — the instrument pointed
      one symbol away from the defect. 11-15 wrote the case for the side of the condition it
      thought was at risk (`'a LIVE campaign run still takes every mirror chrome'`,
      endless-retry.test.tsx:1243, a run with NO boundary delivered) and 11-16 wrote both
      campaign cert cases from a LIVE run too (:1737 with the tier UNSET so the remount resets
      everything, and :1782 with nothing to defer). The one combination that breaks it —
      ENDED run, tier ALREADY Mid, level below `level-03` — is the intersection none of the
      three cases covers.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 1742-1745: `runCertWorstCase`'s level half calls `setLevelId('level-03')` and
          returns, without `runEndedRef.current = false` and without the five chrome writes
          every other run-(re)start site performs. It is the only one of the three `setLevelId`
          call sites (:1503 `goNext`, :1578 `toggleDevLevel`, :1743) that omits the reset, and
          the compiled-push gate effect at :676-702 then arms the loop on its behalf.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 676-702: the gate effect ends in `retry(); setActive(true);` with no
          `runEndedRef` term of its own. It is the seam where "a levelId change" becomes "a run
          starts", and it trusts each caller to have reset first. Two of three do.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Lines 476/486: the `setResultBest` publication guard is a MODE test. Its run-ENDED
          twin (a late per-level read repainting a MOUNTED campaign panel's `Best ·`) is
          reachable only through :1743 and was measured at 2400 -> 7777. Closing the reset above
          closes this too; guarding the publication on `runEndedRef` as well would be the
          belt-and-braces alternative.
      - path: "tests/ui/PlayingHost.endless-retry.test.tsx"
        issue: >-
          Lines 1243 (live campaign chrome), 1737 and 1782 (both campaign cert routes) are all
          driven from a run with NO boundary delivered, or with the tier unset so the remount
          resets. None can see an ENDED campaign run being re-armed. Same blind-spot shape as
          round 2's `previousBestRef` count and round 3's branch enumeration.
      - path: ".planning/phases/11-endless-mode/11-15-SUMMARY.md"
        issue: >-
          Line 177 asserts the safety argument over "every path that begins or resumes a run"
          and then reports checking five. The five it checked are the chrome writers, which is a
          different set. The claim is honest about what was read and wrong about what it covers.
    missing:
      - >-
        Give `runCertWorstCase`'s level half the same reset every other run-(re)start performs,
        or refuse to fire it on an ended run. Minimal shape, matching how :1503 and :1578 both
        do it: inside the `if (modeRef.current !== 'endless' && levelId !== 'level-03')` block,
        clear `runEndedRef.current = false` and `setResult(null)` before `setLevelId`, or guard
        the block with `if (!runEndedRef.current && ...)` so a press from a mounted Results
        overlay does nothing at all. Prefer whichever keeps the cert harness's campaign
        behaviour from a LIVE run byte-for-byte identical — that is pinned by :1737 and :1782
        and must stay green.
      - >-
        Drive the exact combination, in the `Cert WC` describe next to the two existing campaign
        cases: `mountOnly()`, cycle the tier to Mid, `deliverPhase(SIM.LOST, {lives:0,
        score:2400})`, assert the panel is up, then press `Cert WC`. Assert `setActive` records
        no `true` after the press (or that `runEndedRef` was cleared and the panel dismissed —
        whichever the fix elects), then deliver `LOST {lives:0, score:8888}` and assert the
        outcome is coherent. Measured pre-fix: `retry()` 1, `setActive(true)`, `result` still
        `'lose'`, host frozen at `{2400, 0}`, `recordRunEnd` 0, and no `setActive(false)` ever.
      - >-
        Add the `Best ·` sibling for WR-02 while the harness is open, and fix the mock that
        hides it: `getBestForLevel: (id) => Promise.resolve(id === 'level-03' ? 7777 : 1111)`.
        Assert the mounted campaign panel still reads the level it was played on. Measured
        pre-fix: 2400 -> 7777. This is round-3 advisory 1's mock defect and this case's
        precondition, so fix it once.
      - >-
        Extend 11-15's safety enumeration from chrome WRITERS to loop RE-ARM sites, and pin it
        so a seventh cannot appear silently. A source contract in
        `tests/ui/PlayingHost.endless-host.test.ts` counting `setActive(true)` call sites
        (currently five: :702, :1218, :1420, :1483, :1681) would have sent 11-15's author to
        :702 and from there to :1743.
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05) and
      ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from rounds
      2 and 3.
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
      untouched this round — the round-4 diff to `app/` is two non-comment lines and neither is
      near `loadKey` or the bake deps. Carried forward.
advisory:
  - finding: >-
      ENDLESS-MODE.md calls `level-03` "the shipped default level, so the common case" inside
      the round-4 re-scope note it added to § Limits item 2. It is not the default. The shipped
      default is `level-01` (`app/_components/GameHost.tsx:68`,
      `const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01')`); `level-03` is
      the mount level ONLY under `CERT_HARNESS` (`GameHost.tsx:196`,
      `levelId={CERT_HARNESS ? 'level-03' : activeLevelId}`), and in
      `src/services/storage/catalog.ts:14-19` `level-03` is LAST in `PLAYABLE_LEVEL_ORDER` —
      four `Lv` presses from the default. So the SC-5 operator following the documented
      procedure ("launch a dev build", no `CERT_HARNESS`) is told the RARE sub-branch is the
      common one. Raised by 11-REVIEW WR-04; verified at source here.
    category: other
    reason: >-
      Advisory and not a gap, and the line is worth drawing precisely because round 3 drew it
      the other way. Round 3 blocked on a false MECHANISM claim — the doc said the press injects
      when on half the branches it does not, which could change what an operator concludes about
      a reading. This is a frequency characterization attached to a sub-branch that, after this
      round's code fix, behaves identically to its sibling (0 injections, 0 armed, on both), in
      a passage whose stated purpose is to explain why the sub-branch had to be measured at all.
      No instruction, no measurement and no operator action changes. It is recorded rather than
      waved through because it is a false statement about the shipped code introduced by the
      plan that was fixing the previous false statement about the shipped code in the same
      block — the fourth occurrence of this phase's pattern. Fix is one clause: delete "the
      shipped default level, so the common case" or replace it with "the `CERT_HARNESS` mount
      level, and the last entry in `PLAYABLE_LEVEL_ORDER`".
    evidence_status: "verified at source (GameHost.tsx:68/:196, catalog.ts:14-19); no runtime failure, no operator-action change"
  - finding: >-
      The four-branch loop in the `applyChrome` source contract
      (`tests/ui/PlayingHost.endless-host.test.ts:697-702`) is VACUOUS. Its
      `.toMatch(/runEndedRef\.current/)` is satisfied by the `runEndedRef.current = true;`
      ASSIGNMENT that sits one line below each guard (PlayingHost.tsx:1077-1078, :1098-1099,
      :1105-1106), not by the guard. Reproduced by MUTATION in this process: replacing all three
      remaining `if (!runEndedRef.current)` with `if (true)` leaves the whole workspace suite
      green at 97 files / 645 tests. Raised by 11-REVIEW WR-03.
    category: architectural
    reason: >-
      Confirmed exactly as reported, and it is worse than "weak": after the hoist those three
      guards are UNREACHABLE in the true direction — control cannot pass :991 with
      `runEndedRef.current` true — so no behavioural test COULD kill them. The assertion is
      unfalsifiable rather than merely under-powered. Not a gap: the guards are correct
      defence-in-depth, and the instruments that actually pin gap 1 are the three 11-15 ADDED,
      all of which are mutation-killed (the ordering assertion at :716-734, the bare-return
      regex at :741-745, the five-mirror-write count at :754-761). Durable fix is to make the
      loop test the GUARD rather than a mention — `/if \(!runEndedRef\.current\)/` — or to say
      in the case's own comment that the three inner guards are now dead by construction and
      the contract pins their presence only.
  - finding: >-
      `runCertWorstCase`'s new term ASSIGNS rather than ORs: `certPendingRef.current =
      modeRef.current !== 'endless'` (PlayingHost.tsx:1773). An endless press with the tier
      unset therefore DISARMS a deferral a previous campaign press had armed. Raised by
      11-REVIEW IN-01; confirmed at source.
    category: other
    reason: >-
      Structurally confirmed. Arguably the desired behaviour (a stale one-shot is exactly what
      round-3 gap 2 was about) and it is `__DEV__` / `CERT_HARNESS` only, but it is an
      undocumented side effect of a line whose comment describes only the arming case. One
      sentence in the comment, or `certPendingRef.current ||= modeRef.current !== 'endless'` if
      the campaign arm is meant to survive.
    evidence_status: "structural only — no failing artifact; both behaviours are defensible"
  - finding: >-
      The deferred-cert effect (PlayingHost.tsx:1782-1806) sets `certPendingRef.current = false`
      BEFORE its 50 ms `setTimeout`, and its own cleanup `clearTimeout`s that timer. Any
      dependency change inside the window cancels the injection permanently — the flag is
      already consumed. Raised by 11-REVIEW WR-05; confirmed at source.
    category: other
    reason: >-
      Pre-existing, untouched by round 4, `__DEV__` / `CERT_HARNESS` only, and it fails in the
      safe direction (a missed injection, never a spurious one). Recorded so it is not
      rediscovered. Move the `= false` inside the timeout callback if it is ever worth fixing.
    evidence_status: "structural only — no deterministic failing artifact; fails safe"
  - finding: >-
      Five near-identical run-boundary reset blocks (PlayingHost.tsx:1405-1420, :1470-1483,
      :1514-1524, :1613-1631, :1668-1681), each ~14 lines of the same clears and chrome writes.
      Raised by 11-REVIEW WR-06.
    category: architectural
    reason: >-
      This is the structural cause of gap 1 and of the phase's whole "fix one half, leave the
      neighbour" pattern: the invariant lives in five copies plus one omission, so it cannot be
      enumerated by reading one place. A single `resetRunChrome()` helper would have made
      :1743's omission visible as the absence of a call. Not a gap — refactoring five live reset
      paths during gap closure is exactly the scope creep this round's plans correctly refused —
      but it is the right first task for any Phase-14 work in this file.
    evidence_status: "structural only — no failing artifact"
  - finding: >-
      `toggleDevLevel` republishes the OUTGOING level's campaign best as the INCOMING level's
      `Best` (`setLevelId` at :1578 precedes `setResultBest(previousBestRef.current)` at :1614
      inside one synchronous callback). Carried unchanged from round 3 advisory 1.
    category: architectural
    reason: >-
      Structurally re-confirmed; untouched this round and deliberately out of scope per 11-15's
      own assumptions block. Campaign-to-campaign, `result` is set to `null` in the same commit
      so nothing renders it today, and the harness mock ignores its `id` so no case can see it.
      The mock fix is now also a precondition of gap 1's WR-02 case, so fix it once, there.
    evidence_status: "structural only — nothing renders the value today"
  - finding: >-
      Two lint warnings, both in test code, both still present:
      `Array type using 'ReadonlyArray<T>' is forbidden` at
      tests/ui/PlayingHost.endless-host.test.ts:367 and :372. Carried from round 3 advisory 2.
    category: other
    reason: >-
      Re-measured in this process: `npx eslint` over the four changed source/test files reports
      0 errors and exactly 2 warnings, unchanged from round 3. `npx tsc --noEmit` exits 0.
      Cosmetic; `eslint --fix` clears it.
    evidence_status: "measured (eslint, tsc), non-blocking by severity"
  - finding: >-
      `applyChrome` (PlayingHost.tsx:934-993) and `runCertWorstCase` (:1706-1741) both carry a
      formatting constraint imposed by a test regex — `//` line comments only, because
      `codeOnly()` in tests/ui/PlayingHost.endless-host.test.ts:28-30 strips line comments but
      not block comments. `applyChrome` now opens with ~58 lines of comment above its first
      statement. Round 3 advisory 3 (11-REVIEW IN-02) plus 11-REVIEW IN-04.
    category: architectural
    reason: >-
      Both halves re-confirmed at source. The constraint is honestly disclosed at each call
      site, but the burden belongs on the instrument: strip block comments in `codeOnly()` as
      well, then delete the constraint from both functions. The comment volume is a consequence
      of the same rule — the rationale has nowhere else to live that the contract cannot see.
    evidence_status: "structural only — no failure exists today"
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready without
      a frame spike that breaks the Mid budget
    test: >-
      Launch a dev build (NOT a `CERT_HARNESS` / profiling build — that one mounts on
      `level-03` and auto-arms the cert injection); arm the perf overlay; press the `Endless`
      button in the `__DEV__` dev row on the playing HUD; play waves 1 through 5; watch each
      transition specifically — the moment the last brick of a board breaks and the next board
      appears. Do not press the tier button or `Cert WC` during the reading. `Lv` is safe (it is
      an explicit exit that ends the run visibly). Three corrections to carry into the procedure
      as ENDLESS-MODE.md stands after round 4: the glow-atlas re-bake reason is correctly
      WITHDRAWN — do not discard a reading for it; the `Cert WC` injection claim is now
      correctly scoped and the stranded one-shot round 3 found is CLOSED in code and documented
      as closed, so `Cert WC` no longer leaves anything behind on the branch it used to; but the
      note calling `level-03` "the shipped default level" is wrong (the default is `level-01` —
      advisory 1), which changes nothing you do.
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
      15.5x Hermes ratio taken from an iOS simulator. No round-4 task claimed this half.
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
      11-09, 11-11, 11-12 and 11-15 each left it.
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
      three corrections to carry into it.
    expected: "p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures."
    why_human: "No automated step in this repo can produce a frame on hardware."
  - test: "E1 / E3 overflow backstops — see `behavior_unverified_items[1]` and `[2]`."
    expected: "No wrap, no clipping, at the stated extreme values."
    why_human: "jsdom computes no layout."
  - test: >-
      FLAGGED PROHIBITION (judgment tier, 11-16 prohibition 1, carried through four consecutive
      plans): "MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md that the shipped code
      does not hold." Non-authoritative verifier judgement: NOT CLEARLY HELD. Every MECHANISM
      claim in § Limits item 2 is now true and measured — the two round-2 falsehoods and the
      round-3 falsehood are all gone, and the round-4 re-scope is accurate on both branches. One
      factual claim about the shipped code is false: `level-03` is called "the shipped default
      level" (advisory 1). Read the `Cert WC` bullet at ENDLESS-MODE.md:433-462 and the boundary
      row at :261 against `GameHost.tsx:68`/:196 and decide whether that clause clears the
      prohibition or has to be corrected before the phase ships.
    expected: "An owner decision: accept as advisory, or send back a one-clause correction."
    why_human: >-
      unverified-prohibition — human review recommended. Judgment tier; the prohibition is about
      prose fidelity, which no test in this repo can adjudicate.
  - test: >-
      FLAGGED PROHIBITIONS (judgment tier, all remaining 11-15 and 11-16 statements). Verifier
      judgement, non-authoritative: HELD for all of them, on the evidence in this report.
      Specifically: the latch does not freeze a live run (`endless-retry.test.tsx:1243`,
      `endless-record.test.tsx:766+`, and the panel opening at 2400/0); no test was deleted or
      weakened (the three re-pointed 11-13 ordering assertions are re-pointed in the same case
      with the tier change disclosed in its comment, and the mutation evidence is strictly
      stronger after the move — 6 red before, 9 red now); no source contract stands in for a
      drivable property (the render is proved in `result-slot`); `Cert WC` is neither disabled
      nor is its tier half gated; the campaign cert harness still arms and discharges exactly
      once (`:1737`, `:1782`); the do-not-press and restart instructions survive verbatim; the
      round-3 corrections are dated and placed beside the superseded text; no passing device
      reading was written; `git diff -- src/core src/levelgen` is empty; and REQUIREMENTS.md
      checkboxes were not touched by either plan.
    expected: "Spot-confirm or overrule the judgement."
    why_human: >-
      unverified-prohibition — human review recommended. Judgment tier by declaration; recorded
      here rather than silently absorbed into the score.
---

# Phase 11: Endless Mode Verification Report

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T20:05:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure round 4 (plans 11-15, 11-16). This report REPLACES the round-3 report; its gap list is superseded.

## Goal Achievement

**Both round-3 gaps are genuinely closed, and closed by the exact instruments round 3 demanded.
The phase's five Success Criteria all hold to the extent anything in this repository can show
them. What blocks is narrower than either round-3 gap and it is the round's own regression: the
hoist that closed gap 1 is safe on five of the six paths that re-arm the frame loop, and 11-15
asserted it was safe on all of them after checking a different set.**

*Gap 1 is closed and it is the most heavily pinned change in the phase.* `if
(runEndedRef.current) { return; }` is the first statement of `applyChrome` (PlayingHost.tsx:991),
above the five mirror-sourced writes at :994-998, and 11-13's branch-level copy is removed rather
than left standing as a dead second test. I did not take this from the SUMMARY. I deleted the
guard and watched NINE cases go red across THREE files — the source contract, the rendered
`result-slot` case, the campaign straggler case, the failed-START chrome case, the failed-START
copy case, the LOST case, the WALK case, the mid-run-failure case and the WR-04 ended-run case —
then restored it. Round 3's measured harm is gone: the mounted overlay holds `Score · 2400 /
Best · 2400 / New Record / Lose / Out of lives` across a straggler `WON {lives:3, score:9999}`,
with host props frozen at `{2400, 0}`. All four of round 3's `missing[]` items were executed,
including the two instrument repairs — the straggler payload in the three gap-3 drives is now
distinguishable from the boundary mirror's, and the source contract reaches the function preamble
with two independent assertions (an ordering and a five-write count).

*The other side of the condition is proven too, which is what makes this a latch and not a
freeze.* A live campaign run still takes `{lives:2, score:777}` from a mirror
(`endless-retry.test.tsx:1243`), and the boundary mirror itself still writes the run's real final
numbers — the panel can only open at 2400/0 because the guard let that mirror through. The plan
named this risk as its own T-11-32 row and wrote a case for it.

*Gap 2 is closed at both halves, and the code half went past the branch it was reported on.*
`certPendingRef.current = modeRef.current !== 'endless'` (:1773) is mutation-killed: reverting it
to `= true` turns three cases red, including the end-to-end walk that round 3 had to reproduce by
hand. 11-16 then measured the SECOND endless sub-branch nobody had — a press while already on
`level-03`, where the deferral was never stranded and did discharge onto the restarted endless
board — and suppressed it too, saying so rather than slipping it in. The document half is the
strongest documentation work in the phase: the injection claim is scoped to the branch it was
measured true of, the other branch is stated to inject nothing, the stranded one-shot is written
down under a dated re-scope note beside the superseded text, the boundary-table row agrees with
§ Limits item 2, and the do-not-press warning, the restart instruction, the glow-atlas withdrawal
and the SC-5 OPEN block all survive intact.

*What blocks instead is the round's own regression, and it is the fourth occurrence of this
phase's signature failure.* 11-15's safety argument is that "every path that begins or resumes a
run clears the latch before re-arming the loop AND writes chrome". It then enumerated five sites
and read them at source. Those five are the chrome WRITERS — that enumeration is correct and I
re-derived it by grep. The set the truth is about is larger. The compiled-push gate effect at
:676-702 ends in `retry(); setActive(true);` and fires on any campaign `levelId` change;
`goNext` and `toggleDevLevel` each reset before triggering it, and `runCertWorstCase`'s level
half at :1742-1745 does not. I verified `11-REVIEW.md` WR-01 against the source and then measured
it: from a mounted campaign lose panel with the tier already Mid, one press of `Cert WC` moves the
level, calls `retry()`, calls `setActive(true)` and leaves a fresh board being simulated behind a
Results overlay for a run that is over — and post-hoist every mirror it produces is swallowed,
including its loss, which never even stops the loop. I measured the same drive with the guard
removed: pre-hoist that run repainted the HUD and called `setActive(false)` on its loss. So the
hoist did not create the orphan; it silenced it and removed its only self-termination. WR-02 is
the same press seen at the `Best ·` line — I reproduced the campaign panel going `Best · 2400` ->
`Best · 7777` after the level moves, using a level-aware mock the shipped harness does not have.
One reset closes both.

*Scoped honestly, because it decides whether this is a blocker or an advisory, and I want the
reasoning visible.* No Success Criterion fails: all five are about endless, and the endless side
of this control is clean and mutation-pinned. Nothing reaches telemetry, no campaign best or star
moves, and `recordRunEnd` measured 0 on both sides of the hoist — so `11-REVIEW.md`'s framing
that this bears on SC-1 and SC-3 does not survive checking. It is `__DEV__` / `CERT_HARNESS` only
and the state is recoverable by pressing `Retry`. It blocks for one reason, the same reason round
3 gave for its smaller gap: it is a round-4 plan's own must_have truth, falsified by a
reproducible drive, in a file this round modified, and it is the intersection that all three
campaign cases written for this control step around — live run, or tier unset, never both ended
and already Mid. This phase has now shipped four consecutive rounds in which the instrument was
pointed one symbol away from the defect, and the correct response to the fourth is the same as
to the first three.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC-1 / N-END-01) Clearing a board advances to the next generated one in the same run; lives, score and combo carry; the run ends only at zero lives | ✓ VERIFIED | `applyChrome:1000-1088` intercepts endless WON ahead of every run-end branch and returns; `endless.wave-loop.test.ts` + `PlayingHost.endless-run.test.tsx` pass in the clean 645-test suite. The ENDED converse is now closed at BOTH the wave and the chrome — truths 11 and 15 |
| 2 | (SC-2) Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel | ✓ VERIFIED | `src/services/endless/ramp.ts` + `tests/endless.ramp.test.ts`; `ENDLESS-MODE.md` § The wave → difficulty ramp documents it including the clamp rationale (D-01). Untouched for two rounds |
| 3 | (SC-3 / N-END-02, storage) Endless records stored separately; `previousBestRef` is never written by an endless run; campaign bests, stars and unlocks untouched | ✓ VERIFIED | `PlayingHost.tsx:721-812` — the mode branch precedes `evaluatePersonalBest`; `previousBestRef.current = best` exists only in the campaign arm (:812). Regression check: the round-4 diff to `app/` is TWO non-comment lines (`git diff 0c1270e..HEAD`), neither in this region |
| 4 | (SC-4 / N-END-03, headless half) A seeded endless run is reproducible end to end | ✓ VERIFIED | `tests/endless.determinism.test.ts` + `tests/levelgen.determinism.test.ts` pass; § Limits item 1 correctly scopes the claim to a fixed input policy and refuses the device-replay reading |
| 5 | (SC-5 / N-END-03, device half) Wave transitions do not stall the loop — no frame spike outside the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Device-gated and scope-fenced by both round-4 plans. § Limits item 2 stays OPEN (:414-425); N-END-03's unchecked box is CORRECT. See `behavior_unverified_items` |
| 6 | (11-12, carried) `resultBest` has exactly ONE mode-aware publication rule | ✓ VERIFIED (regression) | Guards intact at `PlayingHost.tsx:476`/`:486` wrapping `setResultBest` at `:477`/`:487`; cache assignments still unconditional at `:469`/`:485`. Untouched by the round-4 diff. (Its run-ENDED campaign twin is a different defect — gap 1) |
| 7 | (11-12, carried) The campaign per-level best cache stays warm while endless is live | ✓ VERIFIED (regression) | `:469` / `:485` unconditional; the `setResultBest` contract still asserts assignment count equals publication count |
| 8 | (11-12, carried) Leaving endless through `Lv` republishes the campaign best synchronously | ✓ VERIFIED (regression) | `toggleDevLevel:1614`. The case holds the next storage read PENDING across the press, so only the synchronous path satisfies it |
| 9 | (11-12, carried) The WR-04 contract targets `setResultBest` and states what counting call sites does NOT prove | ✓ VERIFIED (regression) | `endless-host.test.ts:329-464`, unchanged |
| 10 | (11-12, carried) The A-01 retry-in-place liveness case asserts something the press CAUSES | ✓ VERIFIED (regression) | `endless-record.test.tsx` asserts `compileCalls` strictly increases across the press; still green |
| 11 | (11-13 / round-3 gap 3, wave half) After the run boundary, no branch regenerates a board, calls `advanceWave()` or moves the wave number | ✓ VERIFIED | Now enforced by the hoisted latch. RE-KILLED this round: deleting it turns the LOST case, the WALK case, the mid-run-failure case and the WR-04 ended-run case red — the same four 11-13 pinned, plus five more |
| 12 | (11-13, carried) The endless WON branch RETURNS rather than falling through to the campaign WON branch | ✓ VERIFIED | `return;` at `:1088`, with the SC-1 reasoning in the source comment |
| 13 | (11-13, carried) All three ended-run states leave the same post-condition including the wave-advance guard | ✓ VERIFIED (regression) | `failEndlessStart` sets `runEndedRef.current = true` AND `waveAdvanceInFlightRef.current = false`; pinned at source by `endless-host.test.ts` |
| 14 | (11-13, carried) A failed START keeps the owner-decided Retry-time copy — a later WON cannot rewrite `waveBuildFailedWave` 1 → 2 | ✓ VERIFIED | Case `'a failed START stays ended — one WON mirror cannot rewrite the decided tap-Retry copy (gap 3, case c)'`; red under the round-4 mutation |
| 15 | **(11-15 truth 1 / round-3 gap 1)** An ENDED endless run leaves a single coherent state — the latch covers the CHROME, not only the branch | ✓ VERIFIED | `PlayingHost.tsx:991-993` above `:994-998`. MUTATION-KILLED: 9 cases red across 3 files. Re-driven here: slot holds `Score · 2400 / Best · 2400 / New Record / Lose / Out of lives` across a `WON {3, 9999}`; host props `{2400, 0}`; `recordRunEnd` 1 |
| 16 | (11-15 truth 2) `applyChrome` has ONE latch and it is the FIRST statement of the FUNCTION | ✓ VERIFIED | `:991` is the first statement; the `:976` branch copy is deleted with a source note saying where it went. Pinned by the ordering assertion at `endless-host.test.ts:716-734` and the bare-return regex at `:741-745`, both red under mutation |
| 17 | (11-15 truth 3) The freeze reaches EVERY producer of the five chrome values; no sixth chrome producer exists | ✓ VERIFIED | Re-enumerated by grep, not read from the plan: exactly six writer sites — `:994-998` plus reset sites `:1413`, `:1476`, `:1520`, `:1626`, `:1674`. Pinned by the five-mirror-write count at `endless-host.test.ts:754-761` |
| 18 | (11-15 truth 4) The freeze covers the CAMPAIGN boundary, proven by a driven case rather than argued from shared source | ✓ VERIFIED | `endless-retry.test.tsx:1207` — a campaign LOST at 2400 then `WON {3, 9999}` keeps `result='lose'`, `score=2400`, `lives=0`. Red under mutation, and it catches the extra campaign harm (`setResult` sits outside the branch gate, so pre-fix the KIND flipped too) |
| 19 | (11-15 truth 5) The other side of the condition: a run that has NOT ended still takes every mirror, and the boundary mirror itself writes the final numbers | ✓ VERIFIED | `endless-retry.test.tsx:1243` (live campaign takes `{2, 777}`); `endless-record.test.tsx:702-718` (the panel opens at 2400 because the LOST mirror was let through). A blanket freeze would make both red |
| 20 | **(11-15 truth 6)** No resume path can be locked out of its own chrome — every path that begins or resumes a run clears the latch before re-arming the loop AND writes chrome | ✗ FAILED | Six such paths exist, not five. `runCertWorstCase:1742-1745` re-arms via the gate effect `:700-702` without clearing `runEndedRef` or writing chrome. MEASURED: ended campaign run + tier Mid + `Cert WC` → `retry()` 1, `setActive(true)`, panel still `'lose'`, then a `LOST {0, 8888}` moves nothing and never calls `setActive(false)`. See gap 1 |
| 21 | (11-15 truth 7) The three gap-3 drives are made CAPABLE of seeing the chrome half | ✓ VERIFIED | All three now deliver `WON {lives:3, score:9999}` against a boundary at `{lives:0, score:2400}` and assert `hostProps.current` stays frozen. Round-3's blind-spot item closed |
| 22 | (11-15 truth 8) The RENDERED sibling exists where the real `ResultOverlay` is mounted in `result-slot` | ✓ VERIFIED | `endless-record.test.tsx:697-764` — asserts `Score · 2400` present AND `Score · 9999` absent inside `result-slot`, plus `Best · 2400`, `New Record`, `Lose`, `Out of lives`. Red under mutation. No source contract stands in for it |
| 23 | (11-15 truth 9) The `applyChrome` source contract covers the function PREAMBLE and states in its own comment that ordering proves the WRITE RULE and never the RENDER | ✓ VERIFIED | `endless-host.test.ts:606-640` states it and names the render case by title; `:716-734` (ordering, both indices asserted found first), `:741-745` (bare return), `:754-761` (five-write count). All three red under mutation. (The older four-branch loop in the same case is vacuous — advisory 2) |
| 24 | (11-15 truth 11) Nothing this fix touches reaches telemetry | ✓ VERIFIED | `recordRunEnd` asserted at exactly 1 across the straggler in all five ended-run drives; re-measured independently in the gap-1 probe (0 further calls on an orphaned run too) |
| 25 | **(11-16 truth 1 / round-3 gap 2, code)** `runCertWorstCase` never arms a deferral whose preconditions it has just made unreachable | ✓ VERIFIED | `:1773`. MUTATION-KILLED: `= true` turns 3 cases red, including `'while endless below level-03, Cert WC arms nothing — a later campaign walk to level-03 never injects'` (`endless-retry.test.tsx:1600`), which is round-3's hand-run P7 turned into a regression case |
| 26 | (11-16 truth 2) The fix is evaluated on BOTH endless sub-branches, and the second one's behaviour change is stated rather than slipped in | ✓ VERIFIED | `endless-retry.test.tsx:1600` (below `level-03`) and `:1687` (already on `level-03` — the sub-branch where the deferral DID discharge). Both red under mutation; the deliberate change is written in the source comment at `:1765-1770` and in the ops doc |
| 27 | (11-16 truth 3) The CAMPAIGN cert harness still arms and still discharges exactly once | ✓ VERIFIED | `endless-retry.test.tsx:1737` (press below `level-03`, tier unset → arms, then `Lv` and tier settle → exactly 1 injection) and `:1782` (already at `level-03` + Mid → 1 direct injection, nothing deferred). Independently re-driven in the gap-1 probe: `injectCertWorstCase` 1 on the campaign path |
| 28 | (11-16 truth 4) The `Cert WC` tier-already-Mid endless branch keeps injecting on the live board — 11-14's freeze fix is not regressed | ✓ VERIFIED | `endless-retry.test.tsx:1525-1583` — level unchanged, `W2` unchanged, board fingerprint unchanged, `result` null, `recordRunEnd` 0, zero `setActive(false)`, `injectCertWorstCase` 1 |
| 29 | **(11-16 truths 5+6 / round-3 gap 2, docs)** An operator reading § Limits item 2 is told the truth about `Cert WC` on BOTH branches, and the boundary-table row says the same thing | ✓ VERIFIED | `ENDLESS-MODE.md:433-442` scopes the injection claim to tier-already-Mid (0→1, run live) and states the other branch injects NOTHING (0→0) with the correct alternative disqualification reason; `:447-462` is the dated round-4 re-scope of the stranded one-shot covering both sub-branches with post-fix measurements; `:261` carries the same two-branch statement. Each claim cross-checked against the mutation-pinned cases above |
| 30 | (11-16 truth 7) The do-not-press warning and the restart instruction survive verbatim | ✓ VERIFIED | `:426` ("Do not press the tier button or `Cert WC` during the reading") and `:497` ("restart the app and take the reading again") are present and unedited in the round-4 diff |
| 31 | (11-16 truth 8) The correction is DATED and placed beside the superseded text rather than erasing it | ✓ VERIFIED | "**Re-scoped 2026-09-26 (round 4)**" at `:447` and in the `:261` row; the round-3 glow-atlas withdrawal (`:474-489`) is untouched beneath it. Same treatment this document and `BOARD-GENERATOR.md` § Limits item 2 already use |
| 32 | (11-16 truth 9) The SC-5 OPEN block survives intact; N-END-03 stays unchecked and no task claimed the device half | ✓ VERIFIED | `:414-425` still OPEN with the Mid budget and its four failure signatures; `.planning/REQUIREMENTS.md:180` still `[ ]`; `git diff 0c1270e..HEAD -- src/core src/levelgen` is EMPTY |
| 33 | (11-15 truth 10 / 11-16 truth 10) Every new instrument is FALSIFIED before the round closes — a wrong-but-passing test is visible rather than assumed away | ✓ VERIFIED | Both mutations re-driven in THIS process rather than read from a SUMMARY: deleting the hoisted guard → 9 red across 3 files; reverting the cert mode term → 3 red across 2 files. Each restored and the suite re-run clean at 97 files / 645 tests |
| 34 | (Backstop) E1 — 320px Results panel at a 7-digit score / 4-digit wave shows no wrap and no clipping | ? insufficient_spec | `verification: backstop`. jsdom computes no layout; the ~28-character fit is 11-UI-SPEC's arithmetic, not a rendering. Abstained → human |
| 35 | (Backstop) E3 — 48px HUD row at a 7-digit score / 3-digit combo shows no wrap and no clipping | ? insufficient_spec | Same. Abstained → human |

**Score:** 31/33 truths verified (1 present, behaviour-unverified; backstop truths 34-35 route to
human and are excluded from the denominator).

Counted: verified = 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23,
24, 25, 26, 27, 28, 29, 30, 31, 32, 33 → 31. Failed = 20. Behaviour-unverified = 5. Human /
insufficient_spec = 34, 35. Round-3 score was 20/23; the denominator grew because both round-4
plans authored new truths across their `must_haves`, merged here with the five roadmap Success
Criteria and the round-3 truths carried forward as regression checks.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Production endless entry point | Phase 14 | Phase 14 SC-1 'Title offers campaign, endless and daily as distinct entries'; the `__DEV__` Pressable carries a delete-in-14 comment |
| 2 | Permanent endless record surface; electing a primary record | Phase 14 | Phase 14 SC-1/SC-2; § Limits item 4; 11-08 A-08 deliberately refuses to elect |
| 3 | `ENDLESS_BRICK_DIMS` / the stretched glow halo | Phase 14 | Owner-accepted debt 2026-09-26; § Limits item 7 with the measured 0.77x / 0.85x stretch. Re-verified untouched |

**Gap 1 was tested against this filter and NOT deferred.** Phase 14 SC-5 — "Navigation between
modes cannot leave a run mounted in the background consuming frame time" — is the closest match
in the milestone and it is the same harm class as the unstopped loop. It is not the same trigger:
gap 1 is a dev-row cert press from a mounted campaign Results panel, not navigation between
modes, and no Phase 14 success criterion mentions the dev row or the cert harness. The claim that
Phase 14 deletes the dev row comes from source comments and plan text, not from the roadmap. Step
9b says be conservative when matching, so this stays a gap.

### Advisory (New Scope, Unevidenced or Non-Blocking)

| # | Finding | Category | Why Advisory |
|---|---------|----------|--------------|
| 1 | ENDLESS-MODE.md calls `level-03` "the shipped default level, so the common case"; the default is `level-01` (11-REVIEW WR-04) | other | VERIFIED false at source (`GameHost.tsx:68`/`:196`, `catalog.ts:14-19`). Not a mechanism claim, attached to a sub-branch that now behaves identically to its sibling; no instruction, measurement or operator action changes. Raised rather than waived because it is the fourth occurrence of the pattern |
| 2 | The four-branch loop in the `applyChrome` contract is vacuous — the regex matches the assignment, not the guard (11-REVIEW WR-03) | architectural | REPRODUCED: three `if (!runEndedRef.current)` → `if (true)` leaves 97 files / 645 tests green. Worse than weak — post-hoist those guards are unreachable in the true direction, so no test COULD kill them. The three assertions 11-15 ADDED are all mutation-killed, so gap 1 is pinned regardless |
| 3 | `certPendingRef.current = modeRef.current !== 'endless'` assigns rather than ORs, disarming a campaign deferral (11-REVIEW IN-01) | other | Structurally confirmed. Arguably correct behaviour, `__DEV__` only, but undocumented at a line whose comment describes only the arming case |
| 4 | The deferred-cert effect consumes `certPendingRef` before its 50 ms timer, whose own cleanup can cancel it (11-REVIEW WR-05) | other | Confirmed at `:1782-1806`. Pre-existing, untouched this round, `__DEV__` only, fails in the safe direction |
| 5 | Five duplicated run-boundary reset blocks (11-REVIEW WR-06) | architectural | The structural cause of gap 1 and of the phase's whole fix-one-half pattern. Refactoring five live reset paths during gap closure would be the scope creep both round-4 plans correctly refused |
| 6 | `toggleDevLevel` publishes the OUTGOING level's campaign best as the INCOMING level's `Best` | architectural | Carried from round 3 advisory 1, re-confirmed at `:1578` vs `:1614`. Its mock fix is now a precondition of gap 1's WR-02 case — fix it once, there |
| 7 | Two `ReadonlyArray<T>` lint warnings in `endless-host.test.ts:367, :372` | other | Re-measured: 0 errors / 2 warnings on the changed set; `tsc --noEmit` exit 0. Unchanged from round 3 |
| 8 | Two functions carry a `//`-only comment constraint imposed by `codeOnly()`; `applyChrome` now opens with ~58 comment lines | architectural | Round 3 advisory 3 + 11-REVIEW IN-04, both confirmed. The burden belongs on the instrument, not on every future author |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/PlayingHost.tsx` | The latch hoisted above the chrome writes; the cert deferral carrying a mode term | ⚠️ PARTIAL | 1986 lines. Both round-4 changes are present, minimal (TWO non-comment lines in the whole round) and both mutation-pinned. One residual: `runCertWorstCase:1742-1745` re-arms the loop without resetting the run, which the hoist made silent (gap 1) |
| `docs/ops/ENDLESS-MODE.md` | Only mechanisms the code implements; both `Cert WC` branches stated truthfully in both operator-facing locations; SC-5 block OPEN | ✓ VERIFIED | 607 lines. Every mechanism claim in § Limits item 2 now holds and each was cross-checked against a mutation-pinned case. One non-mechanism factual slip (`level-03` as "the shipped default") — advisory 1 |
| `tests/ui/PlayingHost.endless-host.test.ts` | The `applyChrome` contract extended to the PREAMBLE; the cert deferral arm pinned at source | ✓ VERIFIED | 1401 lines. Ordering + bare-return + five-write count all red under mutation; `:1382` pins the mode term. The pre-existing four-branch loop is vacuous (advisory 2) but is not what pins gap 1 |
| `tests/ui/PlayingHost.endless-record.test.tsx` | The RENDERED gap-1 sibling with the real `ResultOverlay` in `result-slot` | ✓ VERIFIED | 1572 lines. `:697-764` asserts both the presence of `Score · 2400` and the ABSENCE of `Score · 9999` inside the slot, plus the record block and the heading. Red under mutation |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | Distinguishable straggler payloads; the campaign straggler case; both endless and both campaign cert branches | ⚠️ PARTIAL | 1814 lines, +505 this round. Eight of the nine mutation-killed cases live here. Blind to gap 1 by construction: all three campaign-side cert/chrome cases are driven from a LIVE run or with the tier unset |
| `src/runtime/overlays/ResultOverlay.tsx` | `waveBuildFailureKind` boundary; endless copy; live Retry | ✓ VERIFIED | Untouched this round; still green |
| `src/runtime/GameScreen.tsx` | Hands the overlay the run's numbers | ✓ VERIFIED | Untouched. Still passes LIVE `score` / `lives` (:188-197), which is now SAFE: round 3 rated this the second half of gap 1's exposure, and the hoist closes it at the producer. The rejected snapshot alternative is recorded in the source comment |
| `.planning/REQUIREMENTS.md` | Checkboxes that match the evidence | ⚠️ UNDERSTATED | N-END-01 and N-END-02 are `[ ]` (reverted by 0c1270e), and both round-4 plans correctly fenced themselves off from this file by prohibition. On round-4 evidence both are SATISFIED — see Requirements Coverage. N-END-03 `[ ]` is CORRECT |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| the chrome mirror bridge (`useAnimatedReaction` → `runOnJS(applyChrome)`) | `applyChrome`'s first statement | the hoisted latch | ✓ WIRED | `:991` precedes `:994`. Round 3 rated this NOT_WIRED; mutation-killed at 9 cases |
| `runEndedRef` | the run's own CHROME (`score` / `lives` / `combo` / stall tier / phase) | the hoisted latch | ✓ WIRED | The round-3 NOT_WIRED link is closed. Re-measured on the rendered overlay |
| `runEndedRef` | every `applyChrome` run-boundary BRANCH | reachability, not a second test | ✓ WIRED (by construction) | Control cannot reach a branch with the latch set. The three inner `if (!runEndedRef.current)` guards are now dead defence-in-depth — advisory 2 |
| host `score` / `lives` state | the mounted endless `ResultOverlay` | `GameScreen:188-197` | ✓ FLOWING | Live props, but the only mirror-sourced producer is now frozen after the boundary. Measured stable at 2400/0 across a straggler |
| `runCertWorstCase`'s `defer` | `certPendingRef` → the deferred-inject effect | the mode term at `:1773` | ✓ WIRED (severed while endless, by design) | Round 3 rated this NOT_WIRED while endless. Both endless sub-branches now arm nothing; both campaign routes still discharge exactly once |
| `runCertWorstCase`'s tier half | `setTierOverride('mid')` → the tier effect → `remountDevSession` → `startEndlessRun` | unchanged, deliberately | ✓ WIRED | A real, funnel-covered run boundary. Not gated — the owner rejected disabling the control on 2026-09-26 |
| `runCertWorstCase`'s LEVEL half | `setLevelId` → the compiled-push gate effect → `retry()` + `setActive(true)` | — | ✗ NOT_WIRED to the run reset | The gate effect arms the loop; nothing on this path clears `runEndedRef` or writes chrome. Five of the six loop re-arm callers reset first; this one does not. Gap 1 |
| `store.getBestForLevel(levelId)` | the host `best` prop | the mode-gated preload effect | ⚠️ PARTIAL | Endless leak closed (round 3) and not regressed. The run-ENDED campaign twin is open and reachable only through the link above — measured 2400 → 7777. Folded into gap 1 |
| `ENDLESS-MODE.md` § Limits item 2 | the `Cert WC` boundary-table row at `:261` | documentation ↔ documentation | ✓ WIRED | Both now carry the same two-branch statement with the same measured figures |
| `ENDLESS-MODE.md` § Limits item 2 | the SC-5 human operator | the discharge procedure | ✓ WIRED | Every mechanism claim cross-checked against a mutation-pinned case. One non-mechanism slip (advisory 1) folded into the human-verification item's procedure text so the operator carries the correction |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| ResultOverlay (`Score ·`) | `score` (live host chrome) | `applyChrome:996`, gated by `:991` | Yes | ✓ FLOWING — round 3's HOLLOW rating is closed. Re-measured: `Score · 2400` holds across a `WON {3, 9999}`; `Score · 9999` absent from `result-slot` |
| ResultOverlay (endless `Best ·`) | `best` ← `resultBest` | `endlessBestScoreRef` / merged `recordRunEnd` blob | Yes | ✓ FLOWING — `best` is written at `handleRunEnded` and never by `applyChrome`; unchanged across every straggler drive |
| ResultOverlay (campaign `Best ·`) | `best` ← `resultBest` | `getBestForLevel` preload, mode-gated only | Yes | ⚠️ STALE-SWAPPABLE on one ENDED-run path — measured 2400 → 7777 when `Cert WC` moves the level under a mounted panel. Gap 1 |
| ResultOverlay (endless `Best wave ·`) | `bestWave` ← `resultBestWave` | `endlessBestWaveRef` ← merged blob | Yes | ✓ FLOWING |
| ResultOverlay (`Wave ·`) | `wave` ← `resultWave` | `waveRef` snapshot at `handleRunEnded` | Yes | ✓ FLOWING — frozen at the boundary, and the readout behind it frozen with it |
| ResultOverlay (body copy) | `waveBuildFailedWave` | `failEndlessStart` (1) / `applyChrome` (`waveRef+1`) | Yes | ✓ FLOWING — the latch stops a post-end WON rewriting 1 → 2 |
| dev-row `W{n}` readout | `wave` state | `advanceToWave` | Yes | ✓ FLOWING — does not walk on an ended run |
| `telemetry.endless.bestWave` / `bestScore` | merged watermark | `store.recordRunEnd` endless arm, `Math.max` fold | Yes | ✓ FLOWING — re-measured unreachable from any post-boundary mirror, and unreachable from the gap-1 orphan run too (`recordRunEnd` 0) |

### Behavioural Spot-Checks

All run in THIS process against the real `PlayingHost`, through its own chrome bridge, with real
`generate`, real `compileGeneratedLevel` and the real `ResultOverlay` mounted where noted. One
scratch probe file was created in `tests/ui/`, executed, and REMOVED; `git status` shows no source
or test file modified.

| # | Behaviour | Result | Status |
|---|-----------|--------|--------|
| P1 | Full workspace suite, run ONCE | `97 files / 645 tests, 645 passed` (round 3: 633) | ✓ PASS |
| P2 | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| P3 | `npx eslint` on the 4 changed source/test files | 0 errors, 2 warnings (both carried from round 3) | ⚠️ advisory 7 |
| P4 | `git diff a20ad36..HEAD -- src/core src/levelgen` | empty | ✓ PASS — the freeze holds |
| P5 | `git diff 0c1270e..HEAD -- app/_components/PlayingHost.tsx`, comments stripped | exactly TWO changes: the hoisted guard added / the branch copy removed; `certPendingRef.current = true` → `= modeRef.current !== 'endless'` | ✓ PASS — minimal and auditable |
| M1 | **Mutation** — delete the hoisted `if (runEndedRef.current) { return; }` (`:991-993`) | 9 failed across 3 files: the `applyChrome` contract; the rendered `result-slot` case; the failed-START copy case; the WR-04 ended-run case; the LOST case; the WALK case; the mid-run-failure case; the CAMPAIGN straggler case; the failed-START chrome case | ✓ KILLED — gap 1's fix is pinned harder than 11-13's was (6 → 9) |
| M2 | **Mutation** — revert `certPendingRef.current` to `= true` | 3 failed across 2 files: the source contract at `endless-host.test.ts:1382`; both endless sub-branch drives at `endless-retry.test.tsx:1600` and `:1687` | ✓ KILLED — gap 2's code half is pinned |
| M3 | **Mutation (WR-03 check)** — replace all three remaining `if (!runEndedRef.current)` with `if (true)` (`:1077`, `:1098`, `:1105`) | 97 files / 645 tests, ALL GREEN | ✗ SURVIVED — the four-branch loop is vacuous; advisory 2. Expected, since the hoist makes those guards unreachable-with-true |
| P6 | **WR-01 drive (post-hoist)** — campaign, tier cycled to Mid, `LOST {0, 2400}`, then press `Cert WC` | `Lv` label `level-01` → `level-03`; `retry()` 1; `setActive` `[[false],[false],[false],[true]]`; `inject` 1; `result` still `'lose'`; host `{2400, 0}` | ✗ FAIL (gap 1) — a live sim behind a mounted Results overlay for a finished run |
| P7 | …then deliver `PLAYING {2, 555}` and `LOST {0, 8888}` to that orphan run | host stays `{2400, 0}`; `result` stays `'lose'`; `recordRunEnd` 0; **no `setActive(false)` at all** | ✗ FAIL (gap 1) — the run cannot be seen, recorded, or stopped |
| P8 | **WR-01 delta drive (hoist removed)** — the identical sequence | host goes `{555, 2}` then `{8888, 0}`; `recordRunEnd` still 0; `setActive(false)` IS called on the loss | ✓ MEASURED — isolates what the hoist caused (silence + no stop) from what predates it (no telemetry) |
| P9 | **WR-02 drive** — same press with `getBestForLevel: (id) => id === 'level-03' ? 7777 : 1111` | mounted campaign panel `best` 2400 → 7777 | ✗ FAIL (gap 1, folded) — level-03's best over a level-01 run |
| P10 | `Cert WC` in endless, tier already Mid (11-14 freeze regression check) | `endless-retry.test.tsx:1525` green: level unchanged, `W2` unchanged, board unchanged, `recordRunEnd` 0, zero `setActive(false)`, `inject` 1 | ✓ PASS |
| P11 | `Cert WC` campaign routes (11-16 truth 3 regression check) | `:1737` and `:1782` green; independently re-measured `inject` 1 in the P6 probe | ✓ PASS |
| P12 | Debt-marker gate over all 5 changed source/doc/test files | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` → zero hits | ✓ PASS |
| P13 | Chrome-writer enumeration by grep (11-15 truth 3 independent check) | exactly 6 sites: `:994-998` + `:1413`, `:1476`, `:1520`, `:1626`, `:1674` | ✓ PASS |
| P14 | Loop re-arm enumeration by grep (the check 11-15 did NOT do) | 5 `setActive(true)` sites: `:702`, `:1218`, `:1420`, `:1483`, `:1681`. `:702` is the gate effect, callable from `:1503`, `:1578` and `:1743` — and only the first two reset | ✗ FAIL (gap 1) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repository and no plan declares one. Step 7c:
SKIPPED (no project probes). The behavioural spot-check table above is the substitute, and every
row in it was executed in this process rather than read from a SUMMARY or a review.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| N-END-01 | 11-15, 11-16 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ SATISFIED | Both halves of the post-condition are now closed and both are mutation-pinned: the WAVE half by 11-13 and re-killed here (truth 11), the CHROME half by 11-15 (truths 15-19, 21-24), with the rendered proof in `result-slot`. The forward direction is unchanged and green. The `[ ]` in REQUIREMENTS.md, reverted by 0c1270e after round-3 gaps, is now UNDERSTATED — on this round's evidence it should be `[x]`. Gap 1 does not touch this requirement: it is campaign-side and no wave, board or run-end is affected |
| N-END-02 | 11-15 (regression only) | Endless records stored separately — endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED | Storage firewall re-verified and not regressed (truth 3); the round-4 diff to `app/` is two non-comment lines, neither in the record path. The round-3 display fix is intact (truths 6-9) and `best` is asserted unchanged across every straggler drive. The `[ ]` reverted by 0c1270e is UNDERSTATED — it should be `[x]`. Gap 1's WR-02 half is CAMPAIGN-to-campaign: no endless run is involved and nothing is written, so it does not touch this requirement's text |
| N-END-03 | 11-16 | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ⚠️ PARTIAL — correctly unchecked | Reproducibility half proven headlessly (truth 4). Frame half device-gated and UNMEASURED; § Limits item 2 stays OPEN and the `[ ]` is CORRECT, not an omission. Round 4's contribution was to the INSTRUMENT (the ops doc), which is now truthful on every mechanism it states — truth 29 |

No orphaned requirements: `grep "N-END-0" .planning/REQUIREMENTS.md` maps exactly N-END-01/02/03,
and all three appear across round-4 plan frontmatter (11-15 → N-END-01, N-END-02; 11-16 →
N-END-01, N-END-03).

**On the two reverted checkboxes.** Both round-4 plans carry an explicit prohibition against
touching `.planning/REQUIREMENTS.md` and both honoured it — verified in the round-4 diff, which
does not include that file. On the evidence in this report N-END-01 and N-END-02 are both
satisfied and the boxes should move to `[x]` with a dated round-4 closure note naming the
mutations that pin them (M1 for N-END-01's chrome half, the intact round-3 guards for N-END-02).
I am recording that judgement rather than making the edit: the verifier does not commit, and the
phase is `gaps_found`, so the closure note should be written by whichever plan closes gap 1.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` across all 5 changed files | — | NONE FOUND. Debt-marker gate passes cleanly |
| `app/_components/PlayingHost.tsx` | 1742-1745 | A state transition that re-arms the loop without the reset every sibling performs | 🛑 Blocker | Gap 1 — an orphaned live run behind a finished run's overlay, silent and unstoppable |
| `app/_components/PlayingHost.tsx` | 676-702 | A shared re-arm seam (`retry(); setActive(true)`) that trusts each caller to have reset first; two of three do | 🛑 Blocker | Gap 1 — the seam where the missing reset becomes a running sim |
| `tests/ui/PlayingHost.endless-host.test.ts` | 697-702 | An assertion satisfied by the assignment it is meant to distinguish from the guard | ⚠️ Warning | Advisory 2 — vacuous for all four branches; proven by mutation M3 |
| `docs/ops/ENDLESS-MODE.md` | 451 | A factual claim about the shipped configuration that the code contradicts | ⚠️ Warning | Advisory 1 — `level-03` is not the default; operator told the rare sub-branch is common |
| `app/_components/PlayingHost.tsx` | 1773 | A one-shot flag ASSIGNED where the surrounding comment describes only arming | ⚠️ Warning | Advisory 3 — an endless press silently disarms a campaign deferral |
| `app/_components/PlayingHost.tsx` | 1795-1799 | A latch consumed before the timer it guards, whose cleanup can cancel that timer | ⚠️ Warning | Advisory 4 — pre-existing, fails safe |
| `app/_components/PlayingHost.tsx` | 1405-1420, 1470-1483, 1514-1524, 1613-1631, 1668-1681 | Five copies of one invariant | ⚠️ Warning | Advisory 5 — the structural cause of gap 1 |
| `app/_components/PlayingHost.tsx` | 1578 / 1614 | Cross-level state publication from a per-mount cache | ⚠️ Warning | Advisory 6 — carried from round 3, latent until Phase 14 |
| `tests/ui/PlayingHost.endless-host.test.ts` | 367, 372 | Lint warnings carried from round 3 | ℹ️ Info | Advisory 7 |
| `app/_components/PlayingHost.tsx` | 934-993, 1706-1741 | Source formatting constrained by a test's parser; ~58 comment lines above the first statement | ℹ️ Info | Advisory 8 |

**Re-verification evidence gate (#3304):** the two blocker rows are one finding and it is
NEW-SCOPE — it is not in round-3's `gaps:` list. It therefore requires deterministic evidence to
block, and it has it: P6, P7 and P9 are named, reproducible drives executed in this process
against the real host, and P8 isolates the delta the round itself introduced by re-running the
same drive with the hoist removed. `app/_components/PlayingHost.tsx` was git-modified this round
(commits `c2c98ac`, `6b7ab63`), so the flagged file also satisfies the modification limb
independently. Neither limb rests on inference. The eight advisories above are new scope with no
deterministic failing artifact — advisories 1, 2 and 3 are verified true at source or by mutation
but none produces a runtime failure — so they are recorded and excluded from the score, and none
reverts a completed must-have.

### Human Verification Required

#### 1. SC-5 device reading (carried; `behavior_unverified` = 1)

**Test:** Launch a dev build — **not** a `CERT_HARNESS` / profiling build, which mounts on
`level-03` and auto-arms the cert injection. Arm the perf overlay. Press `Endless` in the
`__DEV__` dev row. Play waves 1 through 5, watching each transition specifically. Do not press
the tier button or `Cert WC`. `Lv` is safe — it is an explicit, visible exit.
**Expected:** No black playfield at a transition; no audio hiccup; no `[audio] preload soft-fail`
mid-run; p50 ≤ 16.7 ms and p95 ≤ 20 ms across each transition. The stretched glow halo is
EXPECTED and ACCEPTED (A-04).
**Why human:** No automated step in this repo can produce a frame on hardware.
**Carry three corrections into the procedure:** the glow-atlas re-bake reason is correctly
WITHDRAWN — do not discard a reading for it; the `Cert WC` stranded one-shot round 3 found is now
CLOSED in code, so that branch leaves nothing behind (0 injections at the press, 0 across a `Lv`
walk); and the doc's note calling `level-03` "the shipped default level" is wrong — the default is
`level-01` — which changes nothing you do.

#### 2. E1 / E3 overflow backstops (carried)

**Test:** Render the 320px Results panel at `score = 9999999`, `wave = 1234`, and the 48px HUD row
at `score = 9999999`, `combo = 137`, on a device or a layout-capable renderer.
**Expected:** Every line on one row, fully visible, no ellipsis, no overflow.
**Why human:** `verification: backstop`. jsdom computes no layout, and 11-UI-SPEC's
~28-monospace-character fit is arithmetic rather than a rendering.

#### 3. Flagged prohibition — ENDLESS-MODE.md fidelity (judgment tier, fourth consecutive plan)

**Test:** Read the `Cert WC` bullet at `ENDLESS-MODE.md:433-462` and the boundary row at `:261`
against `GameHost.tsx:68`/`:196` and `catalog.ts:14-19`.
**Expected:** An owner decision on whether "the shipped default level, so the common case" clears
the prohibition "MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md that the shipped code
does not hold", or has to be corrected first.
**Why human:** unverified-prohibition — human review recommended. Verifier judgement,
non-authoritative: **NOT CLEARLY HELD.** Every mechanism claim in the block is now true and
measured; one factual claim about the shipped configuration is not.

#### 4. Flagged prohibitions — all remaining 11-15 and 11-16 statements (judgment tier)

**Test:** Spot-confirm the verifier's non-authoritative judgement, recorded in the frontmatter:
**HELD** for every remaining prohibition, each with a named artifact in this report.
**Why human:** unverified-prohibition — human review recommended. Judgment tier by declaration;
recorded rather than silently absorbed into the score.

### Gaps Summary

One gap, and it is narrower than either of round 3's. Both round-3 gaps are closed, closed by the
instruments round 3 named, and re-proved here by mutation rather than by reading: nine cases die
when the hoisted latch is deleted, three when the cert mode term is reverted. Every item in both
round-3 `missing[]` lists was executed, including the two instrument repairs that had let the
previous round pass while the defect sat above the code it was counting. The documentation round
is the strongest in the phase.

What blocks is the round's own regression, and it is the fourth consecutive instance of this
phase's one recurring failure: the safety property was asserted over a set the author did not
enumerate. 11-15's hoist is correct and its five-site check is correct for the set it checked —
the chrome writers. The truth it wrote is about the paths that begin or resume a run, and there
are six of those. `runCertWorstCase`'s level half moves the level and returns; the compiled-push
gate effect then calls `retry()` and `setActive(true)` on its behalf, with `runEndedRef` still
latched. From a mounted campaign lose panel with the tier already Mid, one dev-row press therefore
leaves a fresh board being simulated behind a finished run's overlay — and post-hoist that run
cannot be seen, cannot be recorded, and is never stopped, because the loss that would have called
`setActive(false)` now returns at the top of `applyChrome`. I measured it both ways to separate
what the hoist caused from what predates it: the lost telemetry is older than this round, the
silence and the unstoppable loop are not. `11-REVIEW.md` WR-01's claim that this reaches SC-1 and
SC-3 does not hold — it is campaign-side, writes nothing, and no player in a shipped build can
reach it.

It is a gap rather than an advisory on the same reasoning round 3 used for its own smaller gap: a
round-4 plan's own must_have truth, falsified by a reproducible drive, in a file this round
modified, at the one intersection all three campaign cases written for this control step around.
The fix is the reset every sibling call site already performs, plus the one drive that would have
caught it — and, while that harness is open, the level-aware `getBestForLevel` mock that closes
WR-02 and round-3 advisory 1's blind spot in the same edit.

---

_Verified: 2026-09-26T20:05:00Z_
_Verifier: Claude (gsd-verifier)_
