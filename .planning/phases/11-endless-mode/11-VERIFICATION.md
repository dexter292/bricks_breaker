---
phase: 11-endless-mode
verified: 2026-09-26T15:56:05Z
status: human_needed
score: 26/28 must-haves verified
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
  - ".planning/phases/11-endless-mode/11-19-PLAN.md"
  - ".planning/phases/11-endless-mode/11-19-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-20-PLAN.md"
  - ".planning/phases/11-endless-mode/11-20-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-21-PLAN.md"
  - ".planning/phases/11-endless-mode/11-21-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "app/_components/certLevelPlan.ts"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/useGameLoop.ts"
  - "src/services/storage/catalog.ts"
  - "tests/runtime.cert-request.test.ts"
  - "tests/ui/GameScreen.test.tsx"
  - "tests/ui/PlayingHost.endless-host.test.ts"
  - "tests/ui/PlayingHost.endless-record.test.tsx"
  - "tests/ui/PlayingHost.endless-retry.test.tsx"
  - "tests/ui/certLevelPlan.test.ts"
covered_digest: "v1:sha256:b778c3926563848e2587fe568c33d8f52a1f4e792ad0e9172e3f91cd76f07978"
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 37/40
  gaps_closed:
    - >-
      Round-5 gap 1 — "No `__DEV__` control arms a one-shot whose own discharge preconditions the
      same change has made unreachable". CLOSED, and closed STRUCTURALLY rather than by a fourth
      conjunct in a third place. The level question is now ONE pure total function,
      `certLevelPlanFor` (`app/_components/certLevelPlan.ts`), returning
      `'force' | 'ready' | 'unreachable'`, consulted exactly once per press and stored
      (`const plan = certLevelPlan();`), with three consumers reading that same value: the level
      half (`if (plan === 'force')`), the arm (`certPendingRef.current = plan !== 'unreachable';`)
      and the deferred-cert effect's self-cancel.
      VERIFIED BY MUTATION IN THIS PROCESS, not by reading. Reverting the arm alone to its
      round-5 form (`certPendingRef.current = modeRef.current !== 'endless';`) and running
      `tests/ui/PlayingHost.endless-retry.test.tsx` turns EXACTLY ONE case RED — `a CAMPAIGN
      press from a mounted lose panel with the tier AUTO arms nothing — the later Lv walk to
      level-03 injects nothing (round-6 gap 1)` — 1 failed / 32 passed. That is the cell-5 defect
      the round-5 verifier reproduced by driven probe, and it is now behaviourally pinned by a
      case rather than by an argument.
      I also re-derived the equivalence the round rests on, term for term rather than taking the
      review's word: `plan === 'force'` holds iff campaign AND `levelId !== 'level-03'` AND
      `!runEnded` — byte-equivalent to the shipped three-term condition, so 11-16's and 11-17's
      behaviour (and the WR-02 campaign `Best ·` case that guards N-END-02) is unchanged. Exactly
      one cell of the 16-cell control cross-product moves, and it is cell 5.
    - >-
      Round-5 gap 2 — "`docs/ops/ENDLESS-MODE.md` contains no false statement about the shipped
      code; every mechanism sentence is backed by a measurement that could observe what it
      asserts". CLOSED for the mechanism claim it was raised on. The false clause ("injects
      directly into a world whose loop is already stopped" / "already-stopped world") measured 6
      occurrences across its four owning files at the round-6 base `6bb18bf` — re-measured by me:
      `docs/ops/ENDLESS-MODE.md` 2, `app/_components/PlayingHost.tsx` 1,
      `tests/ui/PlayingHost.endless-retry.test.tsx` 1, `11-17-SUMMARY.md` 2 — and is now 0 in all
      four. `MEASURED, not derived` is gone from the repo.
      The REPLACEMENT statement I re-derived link by link at source rather than adopting: (1)
      `injectCertWorstCase` holds one statement, `certRequest.value = certRequest.value + 1`
      (`src/runtime/useGameLoop.ts:787`); (2) the sole consumer is
      `if (certRequest.value !== certApplied.value)` at `:440-442`, inside `onFrame`; (3)
      `useFrameCallback(onFrame, false)` at `:685`, so `onFrame` cannot run until `setActive(true)`;
      (4) `certApplied.value =` is assigned exactly once in the file (`:441`), so nothing resets
      it at a run boundary; (5) the last `applyRetryWorldReset(` (`:415`) precedes the consume
      block (`:440`), so a queued load lands BELOW the reset, on the freshly reset world. The
      corrected text says exactly this in both operator-facing locations, names `certRequest` by
      identifier (3 occurrences in the doc, base 0), states the OPERATOR consequence
      ("contaminates the next run", `:514`) and keeps the "restart the app and take the reading
      again" instruction (`:553`). The new instrument `tests/runtime.cert-request.test.ts` pins
      all five links with per-anchor non-vacuity guards and is honest that it reads source and
      cannot produce a frame.
    - >-
      Round-5 advisory 1 — the `showPauseOverlay` `&&` -> `||` mutation survived the ENTIRE
      workspace, and nothing in the repo had a negative render case. CLOSED. `tests/ui/GameScreen.test.tsx`
      now carries `playing + no result: no pause overlay — no Resume, no Paused` and
      `paused + a result: no pause overlay — the result overlay owns the screen`.
      VERIFIED BY MUTATION IN THIS PROCESS: applying
      `!hasLevelError && uiPhase === 'paused' || result == null` to `src/runtime/GameScreen.tsx:110-111`
      and running all of `tests/ui` now reds EXACTLY those two cases (2 failed / 149 passed, 17
      files). The same mutation left 16 files / 142 tests green in round 5. ASSERTION 5 in
      `tests/ui/PlayingHost.endless-host.test.ts` is untouched, as 11-21's prohibition required.
    - >-
      Round-5 record gap — `.planning/REQUIREMENTS.md` carried THREE unticked boxes sitting above
      notes whose first word is `Closed` (N-END-01 one, N-END-02 two), left by the `6bb18bf`
      revert. CLOSED: I ran the coherence gate myself over the current file and it reports 0 such
      pairs. N-END-01 and N-END-02 are `[x]` with round-6 AMENDED notes (the round-5 "last re-arm
      path" clause is corrected and now names the neighbouring cell); N-END-03 is `[ ]` with a
      caveat that explicitly records that round 6 repaired the INSTRUCTIONS for the SC-5 reading
      and did not take it. Exactly one commit touched the file this round (`661af86`).
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05) and
      ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from rounds
      2, 3, 4 and 5.
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
      assumptions A-04 and § Limits item 7 with the measured 0.77x / 0.85x stretch.
      Re-verified untouched this round: `git diff --name-only 6bb18bf..HEAD -- src/` is EMPTY,
      so no bake key, no `loadKey` and no renderer path moved. Carried forward.
advisory:
  - finding: >-
      WR-01 — CONFIRMED AT SOURCE, and it is mine as well as the review's.
      `docs/ops/ENDLESS-MODE.md:261` and `:484-485` both still cite the literal expression
      `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'` as what
      `runCertWorstCase` "opens that branch on". Plan 11-19 deleted that expression from the
      function; plan 11-19's OWN new gate pins `runEndedRef` and `modeRef` at ZERO occurrences
      inside that body, so the cited literal is guaranteed absent from the address the doc sends
      the reader to. `certLevelPlan` appears in `docs/` ZERO times (measured). 11-20 edited both
      paragraphs for the queued-load correction and left the citation standing.
    category: other
    reason: >-
      ADVISORY, and I am applying this phase's OWN severity test rather than inventing one. Round
      4 ruled the `level-03`-is-the-default clause advisory because it changed no instruction, no
      measurement and no operator action; round 5 ruled the stopped-world clause a BLOCKER
      because it changed all three. This one changes none of them. The BEHAVIOURAL content of
      both sentences is still exactly true — I verified the predicate is term-for-term equivalent
      to the cited expression, so "the level half fires only when the run has NOT ended, the mode
      is campaign, and the level is not already `level-03`" and the operator consequence drawn
      from it ("a press from a MOUNTED Results overlay moves no level and starts no loop") are
      both correct as shipped. What is stale is a SOURCE POINTER: it tells a maintainer the
      decision is written inline in `runCertWorstCase` when it is written once in
      `app/_components/certLevelPlan.ts`. A maintainer who follows the pointer lands on a
      twenty-line comment at that exact call site that tells them the predicate owns the decision
      and instructs them not to add a term at the call site, so the code self-corrects the doc.
      Under the strictest reading of round-5's truth-15 wording ("no false statement about the
      shipped code") this is a residual falsehood and I am saying so plainly rather than
      redefining the truth; under the consistency test the phase has applied twice it is
      advisory, and I am not sending a seventh round for a pointer.
      WHAT CLOSES IT, one commit: in both places replace the parenthetical citation with
      "`certLevelPlanFor` in `app/_components/certLevelPlan.ts`, whose 20-cell truth table is
      `tests/ui/certLevelPlan.test.ts`", keep the three-term prose (it is true and is what the
      operator needs), and date it beside the superseded citation per this phase's convention.
    evidence_status: "measured at source (grep: the literal present at :261 and :485; certLevelPlan absent from docs/); behavioural content verified correct"
  - finding: >-
      WR-02 — REPRODUCED BY MUTATION IN THIS PROCESS, and the review understates it slightly.
      Deleting `certPendingRef.current = false;` (`app/_components/PlayingHost.tsx:1892`, the
      DISCHARGE clear, above the 50 ms `setTimeout`) leaves the ENTIRE workspace green: 99 files /
      663 tests passed. That deletion stops the one-shot being one-shot — the deferred effect
      would re-enter and re-inject on every subsequent dependency change while `levelId` is
      `level-03` and the tier is Mid. The gate that is supposed to hold it is
      `expect((body.match(/certPendingRef\.current = false/g) ?? []).length).toBeGreaterThanOrEqual(1)`,
      and since 11-19 added the self-cancel clear there are TWO matches, so either one can be
      deleted without moving the count below 1.
    category: architectural
    reason: >-
      ADVISORY, not a gap: the shipped code is CORRECT — both clears are present and the one-shot
      is a one-shot today. This is instrument strength against a hypothetical future edit, on a
      `__DEV__` / `CERT_HARNESS`-only control that no Success Criterion depends on.
      The part worth naming honestly is the assertion MESSAGE: "deleting either leaves a latch
      nothing resets" asserts a discrimination the assertion does not have, which is the same
      class of over-labelling as round 5's `MEASURED, not derived` — the label round 6 was
      commissioned to strike. 11-20's own plan text demonstrates the right discipline three lines
      away (it labels the two identifier counts "REGRESSION gates and not discriminating ones —
      stated plainly rather than presented as evidence they are not"); this one message slipped.
      WHAT CLOSES IT, one commit: replace the `toBeGreaterThanOrEqual(1)` with two assertions that
      each bind a clear to its own site — `.toMatch(/=== 'unreachable'\) \{\s*certPendingRef\.current = false;/)`
      for the self-cancel and `.toMatch(/certPendingRef\.current = false;\s*const t = setTimeout\(/)`
      for the discharge — or with `.toBe(2)` plus a stated reason. Then re-run the deletion; it
      must red.
    evidence_status: "measured (mutation: discharge clear deleted, 99 files / 663 tests green)"
  - finding: >-
      WR-03 — REPRODUCED BY MUTATION IN THIS PROCESS, in a STRONGER form than the review reported.
      The review added a new term to the level half AND to the self-cancel. I added it to the
      LEVEL HALF ALONE — `if (plan === 'force' && !waveAdvanceInFlightRef.current) {` — which is
      round-5 gap 1's exact shape reconstituted with a different identifier, and the whole
      workspace stayed green: 99 files / 663 tests. The review's two-sided version is green too
      (I ran that as well).
      WHY IT ESCAPES. The anti-drift gates are IDENTIFIER-specific (`runEndedRef` 0, `modeRef` 0),
      not SHAPE-specific, so a term built from any other identifier is invisible to them. The ARM
      is exact-literal pinned (`certPendingRef.current = plan !== 'unreachable';`) but the LEVEL
      HALF's gate is a loose regex, `/if\s*\(\s*plan\s*===[\s\S]*?\)\s*\{[\s\S]*?setLevelId\(/`,
      which accepts extra conjuncts freely. Note the asymmetry cuts the wrong way: because the arm
      CANNOT follow, a level half that acquires a term is GUARANTEED to strand an arm.
    category: architectural
    reason: >-
      ADVISORY, and this is the finding I weighed hardest before landing there.
      For it: it is a real residual hole, and "the next change could diverge silently" is exactly
      the standard I would call a gap on.
      Against it, decisively: (a) there is NO present defect — the shipped code is correct and
      gap 1 is behaviourally pinned, which I proved by mutation above; (b) 11-19's declared
      must_have is "neither decision site re-tests the predicate's TERMS inline", and that truth
      is met exactly as written (both counts 0, both discriminating, measured bases 1 and 2) — I
      am not entitled to fail a phase against a contract it never wrote; (c) the structural claim
      the module actually makes — "a fourth term added to THIS BODY reaches every decision site by
      construction" — is TRUE, and the hole is the different case of a term added at a call site
      INSTEAD of in the predicate, against an explicit twenty-line instruction sitting at that
      call site; (d) the blast radius is a `__DEV__` / `CERT_HARNESS`-only control, campaign-side,
      writing no record and reachable by no player in a shipped build. A seventh round to tighten
      one regex is not proportionate when nothing is broken and the fix is three lines.
      WHAT CLOSES IT, one commit, and do it the next time that file is open: change the level-half
      gate to the exact literal `/if \(plan === 'force'\) \{/` with a message saying why extra
      conjuncts are forbidden HERE and belong in the predicate (the arm's gate is already exactly
      this shape and is the model), and re-run the one-sided mutation above; it must red.
    evidence_status: "measured (two mutations, each 99 files / 663 tests green); no present defect"
  - finding: >-
      WR-04 — CONFIRMED AT SOURCE. The self-cancel's comment (`PlayingHost.tsx:1858-1878`) offers
      two mechanisms and neither is true as stated. (1) "a session that goes endless or ends its
      run since the press ... drops the one-shot HERE": `modeRef` and `runEndedRef` are refs and
      are deliberately not deps, and `certLevelPlan`'s only dep is `levelId`, so neither a mode
      change nor a run end re-runs this effect on its own — the drop happens opportunistically,
      on the next change to `levelReady` / `levelError` / `fxReady` / `levelId` / `tierOverride`.
      (2) "the tier-change effect is declared ABOVE this one, so ... its campaign branch has
      already cleared the run-ended latch by the time this body runs": false when the tier was
      already `mid` (the effect returns at `tierOverrideRef.current === tierOverride` and never
      calls `remountDevSession`), and false when `remountDevSession` early-returns on
      `!levelReady || levelError != null || !fxReady` — which sits ABOVE its
      `runEndedRef.current = false;`.
    category: other
    reason: >-
      ADVISORY. Behaviour is fine and I traced why: the self-cancel is evaluated on EVERY run of
      the effect, ahead of the discharge test, so it can never be bypassed on a commit where the
      discharge could fire; and on both real discharge paths the predicate answers `'ready'` from
      the `level-03` test regardless of the latch, so the ordering claim is decorative rather than
      load-bearing. The comment's own NEXT sentence already states that robust reason correctly.
      This is inherited reasoning attached to correct code, in a source comment — no operator
      action, no measurement, no behaviour.
      WHAT CLOSES IT: delete the two mechanism sentences and keep the sentence that is true —
      the predicate answers `'ready'` from the level test regardless of the latch, so a legitimate
      discharge is robust either way — and say plainly that the drop is opportunistic, taken on
      the next dependency change rather than at the moment the session turns.
    evidence_status: "structural, confirmed at source (deps array; tier-effect early return; remountDevSession early return above its clear)"
  - finding: >-
      Carried and re-confirmed, all deliberately out of round-6 scope: (a) five near-identical
      run-boundary reset blocks in `PlayingHost.tsx`, still the structural cause of this phase's
      fix-one-half-leave-the-neighbour pattern and still the right first task for Phase-14 work in
      this file; (b) `runCertWorstCase`'s deps comment still says "setLevelId / setTierOverride
      are stable useState setters" when `setLevelId` is a `useCallback` (pre-existing, commit
      `e20b1f2`); (c) the `Cert WC` cell of the run-boundary table (`ENDLESS-MODE.md:261`) is now
      a single table cell of roughly 1,700 words carrying five dated revisions and is unreadable
      as a table — 11-20 deliberately corrected its content without restructuring it and routed
      the rewrite-versus-patch choice to the owner, which is still open; (d) `codeOnly()` strips
      `//` but not `/** */`, which is why two functions carry a `//`-only formatting constraint.
    category: architectural
    reason: "Re-read this round, each still true, each inert or fail-safe today. Recorded so they are not rediscovered as new."
    evidence_status: "structural only — no failing artifact"
  - finding: >-
      Two lint warnings, both in test code, unchanged since round 3:
      `Array type using 'ReadonlyArray<T>' is forbidden` at
      `tests/ui/PlayingHost.endless-host.test.ts:367` and `:372`.
    category: other
    reason: >-
      Re-measured in this process: `npx eslint` over the seven changed source/test files reports
      0 errors and exactly 2 warnings; `npx tsc --noEmit` exits 0. Cosmetic; `eslint --fix` clears it.
    evidence_status: "measured (eslint 0 errors / 2 warnings, tsc exit 0)"
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready without a
      frame spike that breaks the Mid budget
    test: >-
      Launch a dev build (NOT a `CERT_HARNESS` / profiling build — that one mounts on `level-03`
      and auto-arms the cert injection); arm the perf overlay; press the `Endless` button in the
      `__DEV__` dev row on the playing HUD; play waves 1 through 5; watch each transition
      specifically — the moment the last brick of a board breaks and the next board appears.
      DO NOT PRESS `Cert WC` AT ANY POINT. Round 6 makes the reason for that instruction ACCURATE
      for the first time, and the accurate reason is the stronger one: a press does not spend its
      worst-case load on the run that just ended, it QUEUES the load on `certRequest` and it lands
      on the FIRST FRAME OF YOUR NEXT RUN — including a `Retry` from the panel you are looking at.
      If `Cert WC` is pressed at all, restart the app and take the reading again. `Lv` is safe (an
      explicit exit that ends the run visibly). `docs/ops/ENDLESS-MODE.md` § Limits item 2 now
      states this correctly and no longer needs a verifier's correction carried alongside it — the
      round-5 "world whose loop is already stopped" clause is GONE from the repo (measured 0), and
      the round-4 `level-03`-is-the-default error stays corrected.
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no `[audio] preload soft-fail`
      line in the log mid-run; frame times stay inside the Mid budget across each transition
      (p50 <= 16.7 ms, p95 <= 20 ms). The stretched glow halo on every brick is EXPECTED and
      ACCEPTED (A-04) — not a failure signature.
    why_human: >-
      No automated step in this repo can produce a frame on hardware; nothing here drives a
      Reanimated worklet. Everything proven so far shows only that the bake/audio-preload COLD
      PATH IS NOT ENTERED at a transition — a source argument (the advance block sits ABOVE the
      `simFrozen` computation in `onFrame`, `src/runtime/useGameLoop.ts:446-458`, so a transition
      never stops or restarts the frame callback) plus a jsdom observation. The 0.56 ms
      generate+compile figure is a Node microbenchmark scaled by a 15.5x Hermes ratio from an iOS
      simulator. No round-6 task claimed this half and `N-END-03` correctly stays `[ ]`.
  - truth: >-
      (11-19 truth 8) An arm cannot outlive its own reachability — the deferred-cert effect's
      self-cancel drops `certPendingRef` when the predicate answers `'unreachable'` at discharge
      time
    test: >-
      On a dev build: from a mounted campaign Results panel already at `level-03`, press
      `Cert WC` (this arms legitimately, cell 7), then leave to endless via the `Endless` dev
      button before the deferral discharges, then return to a campaign `level-03` session. The
      one-shot must NOT fire on that later session.
    expected: "Zero worst-case injections on the later session — the arm was dropped, not carried."
    why_human: >-
      MEASURED IN THIS PROCESS: deleting the entire self-cancel clause from
      `app/_components/PlayingHost.tsx` reds exactly ONE case — the SOURCE contract `the
      deferred-cert effect is the predicate's third consumer (round-6 self-cancel)` — and leaves
      662 of 663 behaviour tests GREEN. The clause is pinned at source only; its positive
      direction is unobservable by any harness in this repo, and 11-19-SUMMARY.md says so in its
      own words rather than claiming it proven, which is why this is recorded as present-behaviour-
      unverified rather than as an over-claim. Note that gap 1's closure does NOT depend on it:
      cell 5 stayed green under the same deletion, so the arm fix alone carries the gap.
  - truth: >-
      (Backstop, 11-15 / 11-21) E1 — a 320px Results panel at a 7-digit score and a 4-digit wave
      shows no wrap and no clipping
    test: >-
      On a device or a layout-capable renderer, open an endless Results panel with
      `score = 9999999` and `wave = 1234` and inspect the `Score ·`, `Wave ·`, `Best ·` and
      `Best wave ·` lines at the shipped 320px panel width.
    expected: "Every line renders on one row, fully visible, with no ellipsis and no overflow."
    why_human: >-
      `verification: backstop`. jsdom computes no layout, so this cannot be observed by any test
      this repo can run. 11-UI-SPEC's ~28-monospace-character fit is arithmetic, not a rendering;
      asserting it would convert a backstop into a false `covered`. Abstained, as 11-09, 11-11,
      11-12, 11-15, 11-17 and 11-21 each left it.
  - truth: >-
      (Backstop, 11-21) E3 — a 48px HUD row at a 7-digit score and a 3-digit combo shows no wrap
      and no clipping
    test: "Same, against the playing HUD row at `score = 9999999` and `combo = 137`."
    expected: "The HUD row renders on one line at 48px with no wrap and no clipping."
    why_human: "Same — jsdom computes no layout. Abstained."
coincidental_reliance_items: []
human_verification:
  - test: >-
      SC-5 device reading — see `behavior_unverified_items[0]` for the full procedure. This is the
      FIRST round where the procedure carries no verifier correction: the do-not-press warning and
      the "restart the app and take the reading again" instruction are both in the document,
      both survive verbatim, and the reason given for them is now true of the shipped code.
    expected: "p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures."
    why_human: "No automated step in this repo can produce a frame on hardware."
  - test: >-
      The cert self-cancel's positive direction — see `behavior_unverified_items[1]`. Optional,
      and explicitly NOT load-bearing for gap 1: it is belt-and-braces added by 11-19 beyond what
      the gap required, and its absence reds only a source contract.
    expected: "Zero injections on a later campaign level-03 session after an intervening endless detour."
    why_human: "No harness in this repo can observe the positive direction of the drop."
  - test: "E1 / E3 overflow backstops — see `behavior_unverified_items[2]` and `[3]`."
    expected: "No wrap, no clipping, at the stated extreme values."
    why_human: "jsdom computes no layout."
  - test: >-
      FLAGGED PROHIBITION (judgment tier, carried by five consecutive plans and now by 11-20):
      "MUST NOT assert an invariant in `docs/ops/ENDLESS-MODE.md` that the shipped code does not
      hold." Non-authoritative verifier judgement: HELD for the MECHANISM — the round-5 falsehood
      is gone from the repo (measured 0 occurrences across its four owning files, base 6) and its
      replacement is true link by link, which I re-derived at source rather than adopting from the
      SUMMARY. NOT held for one SOURCE POINTER: `:261` and `:485` still cite an expression 11-19
      deleted (advisory WR-01). The behavioural content of both sentences remains true and the
      operator consequence is unchanged, which is why I classified it advisory under this phase's
      own round-4/round-5 severity test rather than as a sixth blocking round.
      The owner decision this asks for is the one round 5 already routed here and 11-20
      deliberately did not take: patch the pointer in place (three lines), or commission the single
      rewrite of § Limits item 2 and the `:261` table cell from source that both have now earned —
      the cell is ~1,700 words carrying five dated revisions.
    expected: "An owner decision: authorise the WR-01 pointer patch as written, or commission the one-time rewrite."
    why_human: "unverified-prohibition — human review recommended. Judgment tier by declaration."
  - test: >-
      FLAGGED PROHIBITIONS (judgment tier, all remaining 11-19, 11-20 and 11-21 statements).
      Verifier judgement, non-authoritative: HELD for all of them, on the evidence in this report.
      Specifically, and each checked rather than assumed: the `Cert WC` TIER half is untouched and
      the control is not disabled (`if (tierOverride !== 'mid')` unchanged, no early return added);
      no sixth run-boundary reset block was added and `runCertWorstCase` still clears no latch
      (`runEndedRef` occurrences in that body = 0, gate green); the level half stays GUARDED rather
      than resetting; every behaviour delta is named with its cell and its measured before/after
      (cell 5, `04:0 | 05:0 | 06:0 | 03:1` pre-fix -> 0 at every step post-fix; cell 7 unchanged at
      1); no instrument was weakened, deleted or re-pointed to make a new one pass — the one pin
      that was MOVED (`runEndedRef` 1 -> 0 inside `runCertWorstCase`) is strictly stronger than
      what it replaced and carries its reason in its own assertion message and in a comment naming
      the measured bases; ASSERTION 5 in `tests/ui/PlayingHost.endless-host.test.ts` is byte-
      unchanged; `git diff --name-only 6bb18bf..HEAD -- src/` is EMPTY so no `src/runtime` behaviour
      moved and no glow-atlas bake key was touched; no superseded claim was erased (every correction
      is dated and describes what it supersedes, with the verbatim record in git at `6bb18bf`, the
      treatment this phase settled on when a discriminating gate pins a false literal at 0); the
      do-not-press and restart instructions survive verbatim and got stronger, not weaker; the SC-5
      OPEN block, the A-04 acceptance and the round-3 glow-atlas withdrawal all survive; no device
      reading was written; N-END-03 is untouched at `[ ]`; `.planning/REQUIREMENTS.md` was touched
      by exactly one commit (`661af86`) and `requirements.mark-complete` was not run.
    expected: "Spot-confirm or overrule the judgement."
    why_human: >-
      unverified-prohibition — human review recommended. Judgment tier by declaration; recorded
      here rather than silently absorbed into the score.
---

# Phase 11: Endless Mode — Verification Report (round 6)

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-26T15:56:05Z
**Status:** human_needed
**Re-verification:** Yes — round 6, after plans 11-19, 11-20 and 11-21

## Goal Achievement

### Observable Truths

#### The five ROADMAP Success Criteria

| # | Truth (SC) | Status | Evidence |
|---|------------|--------|----------|
| 1 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ VERIFIED | Regression, and the strongest possible form of one this round: `git diff --name-only 6bb18bf..HEAD -- src/` is **EMPTY**. No simulation, generator, runtime or storage file moved. `tests/endless.wave-loop.test.ts`, `tests/endless.determinism.test.ts` and the `endless-retry` / `endless-host` suites are all inside a green workspace run I executed: **99 files / 663 tests passed** |
| 2 | Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel in code | ✓ VERIFIED | Regression. `docs/ops/ENDLESS-MODE.md:15-29` is the written-down ramp (wave 1 = difficulty 0, +1 per wave, clamped at `D_MAX = 20`, D-01/D-02), explicitly framed as what satisfies SC-2 beyond a correct function; the policy is two pure integer functions in `src/services/endless/ramp.ts` guarded by `tests/endless.ramp.test.ts`. Untouched by round 6 |
| 3 | Endless records stored separately from campaign progress; endless play cannot unlock, lock or alter a campaign level's best or stars | ✓ VERIFIED | Regression, and I checked the one thing round 6 could have disturbed. The storage firewall (`RecordRunEndArgs` discriminated union, `ENDLESS_TELEMETRY_KEY`, `tests/storage.endless-firewall.test.ts`) is untouched — no `src/` change at all. The display firewall's guard, the WR-02 case on the rendered campaign `Best ·`, rides on the cert level half, and I verified the level half is **byte-equivalent** under the new predicate (`plan === 'force'` ⟺ the shipped three-term condition, derived term by term below), so that case is unchanged and green |
| 4 | A seeded endless run is reproducible end to end — same seed and inputs replay to the same wave | ✓ VERIFIED | Regression. `tests/endless.determinism.test.ts` green inside the 663; scope (headless only — a device run is not replayable, no per-tick intent recorder) recorded in ENDLESS-MODE.md and re-stated in every round's flagged assumptions. Untouched by round 6 |
| 5 | Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The source argument holds and is unchanged: the advance block sits ABOVE the `simFrozen` computation in `onFrame` (`src/runtime/useGameLoop.ts:446-458`), so a transition never stops or restarts the frame callback and no `setActive` call is involved. The DEVICE half is unmeasurable in jsdom and no round-6 task claimed it — 11-20 and 11-21 both carry an explicit prohibition against claiming it. Routed to human verification; `N-END-03` correctly stays `[ ]` |

#### The two round-5 gaps — the round-6 commission

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | No `__DEV__` control arms a one-shot whose own discharge preconditions the same change has made unreachable | ✓ VERIFIED | **MUTATION IN THIS PROCESS.** Reverting the arm alone to its round-5 form reds **exactly one** case — `a CAMPAIGN press from a mounted lose panel with the tier AUTO arms nothing — the later Lv walk to level-03 injects nothing (round-6 gap 1)` — 1 failed / 32 passed in `endless-retry`. The defect the round-5 verifier reproduced by driven probe is now held by a case |
| 7 | `docs/ops/ENDLESS-MODE.md` and its three code-adjacent siblings state the cert-press mechanism truthfully, backed by an instrument that can observe what it asserts | ✓ VERIFIED (see advisory WR-01) | The false clause: 6 occurrences at base `6bb18bf` (2/1/1/2 across the four owning files — I re-measured the base in git), **0 now**. `MEASURED, not derived` gone. Replacement re-derived by me link by link at `src/runtime/useGameLoop.ts` (787 bump → 440-442 sole consumer inside `onFrame` → 685 `useFrameCallback(onFrame, false)` → 441 sole `certApplied` write → 415 reset precedes 440). New instrument `tests/runtime.cert-request.test.ts` pins all five with non-vacuity guards. Residual: a stale SOURCE POINTER at `:261`/`:485` — advisory WR-01, behavioural content still true |

#### 11-19 — one predicate, three consumers

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | ONE named predicate decides both halves; `certLevelPlanFor` defined exactly once; consulted exactly once per press through one memo | ✓ VERIFIED | `app/_components/certLevelPlan.ts` exists, is pure (no React, no refs, one type import). `const plan = certLevelPlan();` pinned at exactly 1 by a gate whose measured base was 0 |
| 9 | Neither decision site re-tests the predicate's terms inline — `runEndedRef` = 0 and `modeRef` = 0 inside `runCertWorstCase`; both 0 inside the deferred-cert effect | ✓ VERIFIED | Gates green at `endless-host.test.ts:1538-1544` and `:1678-1684`, with measured bases 1 and 2 stated in the assertion messages and the round-5 pin of `runEndedRef` at EXACTLY 1 deliberately MOVED with its reason recorded — the one pin change this round, and it is strictly stronger than what it replaced |
| 10 | The predicate is exhaustive over its REAL domain, and the domain is derived rather than asserted — 20 cells, level set read at runtime from `PLAYABLE_LEVEL_ORDER` | ✓ VERIFIED | `tests/ui/certLevelPlan.test.ts` imports `PLAYABLE_LEVEL_ORDER` from `src/services/storage/catalog.ts` (5 members, confirmed at source), asserts the table's key list equals it AS A SET, then drives all 2×2×5 cells. A sixth playable level reds the table rather than escaping it |
| 11 | Exactly ONE cell of the 16-cell control cross-product changes behaviour, and it is cell 5 | ✓ VERIFIED | I derived this independently rather than accepting it: `plan === 'force'` ⟺ campaign ∧ `levelId !== 'level-03'` ∧ `!runEnded`, identical to the shipped three-term condition; `plan !== 'unreachable'` ⟺ campaign ∧ (`level-03` ∨ run live), versus the old arm's campaign — they differ only at campaign ∧ ENDED ∧ not-`level-03`, and the arm statement only runs when `defer` is true, which there requires the tier half, i.e. tier not Mid. That is cell 5 and no other |
| 12 | Cell 5 (campaign / ENDED / `level-01` / tier AUTO) is DRIVEN on the real host: the press arms nothing and a four-step `Lv` walk to `level-03` injects nothing at any step | ✓ VERIFIED | The case exists, is green, and reds under the arm-revert mutation I ran. The walk asserts the rendered label at every step, so it cannot pass vacuously short |
| 13 | Cell 7 (campaign / ENDED / already `level-03` / tier AUTO) — the nearest neighbour — still arms and still discharges exactly ONE injection | ✓ VERIFIED | `a CAMPAIGN press from a mounted lose panel ALREADY at level-03 with the tier AUTO still injects exactly once (cell 7, unchanged)`, green. The fix suppresses the stranded arm without disabling the harness where the discharge is genuinely reachable |
| 14 | All eight pre-existing `Cert WC` cases stay green; `it(` in `endless-retry` moves 31 → 33 | ✓ VERIFIED | 33 tests in that file, all green on the unmutated tree; two added, none deleted |
| 15 | An arm cannot outlive its own reachability — the deferred-cert effect's self-cancel | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | The clause is present and correctly placed (ahead of the discharge test, so it cannot be bypassed on a commit where the discharge could fire). But this is a CANCELLATION invariant and presence is not behaviour: **deleting the entire clause reds ONE source contract and leaves 662/663 behaviour tests green** (measured in this process). Source-pinned only. 11-19-SUMMARY says exactly this in its own words (`:47`), so it is an honest limit rather than an over-claim. Gap 1 does not depend on it — cell 5 stayed green under the deletion |

#### 11-20 — the queueing instrument

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 16 | The false clause is at 0 across all four owning files; the three `.planning` REPORT files keep their copies | ✓ VERIFIED | Base re-measured by me in git at `6bb18bf`: 2 + 1 + 1 + 2 = 6. Now 0 in all four. The executor's reported reconciliation (6 at the plan's named base, 0 in `PlayingHost.tsx` on the tree it received, because sibling `07907f3` deleted that paragraph while extracting the predicate) is ACCURATE — I confirmed the commit and the file states |
| 17 | The replacement statement is true link by link, each pinned by a re-runnable assertion | ✓ VERIFIED | Five links re-derived at source by me (see truth 7). `tests/runtime.cert-request.test.ts` holds five `it(` cases plus an extraction guard so a drifted anchor is RED rather than vacuously green |
| 18 | `MEASURED, not derived` is gone; the `toHaveBeenCalledTimes(1)` assertion is kept and only its message moves | ✓ VERIFIED | Repo-wide grep for the phrase returns nothing |
| 19 | § Limits item 2 states the OPERATOR consequence, not only the mechanism; `certRequest` named by identifier in both operator-facing locations | ✓ VERIFIED | `contaminates the next run` at `:514`; `restart the app and take the reading again` intact at `:553`; `certRequest` occurrences in the doc 0 → 3 |
| 20 | `src/runtime` behaviour is NOT changed, and the reason is recorded rather than assumed | ✓ VERIFIED | `git diff --name-only 6bb18bf..HEAD -- src/` is empty. The plan records WHY the tempting `certApplied` reset was not taken (no harness can drive `onFrame`; and it would swallow the deferred-inject path) and flags it for Phase 14 with its two preconditions |
| 21 | Both operator-facing locations agree with each other and neither erases what it supersedes | ✓ VERIFIED (see advisory WR-01) | `:261` and `:484-520` both carry the queued-load correction, dated, describing rather than quoting the superseded wording (the verbatim original in git at `6bb18bf`), consistent with each other. The stale source citation they both also carry is advisory WR-01 — it was created by sibling plan 11-19 and claimed by no plan |

#### 11-21 — the advisory decision and the record

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 22 | The round-5 advisory gets an explicit decision: `showPauseOverlay` acquires a NEGATIVE render case, with the rejected alternative recorded | ✓ VERIFIED | Two new cases in `tests/ui/GameScreen.test.tsx` (`:122`, `:131`) |
| 23 | The negative cases are behavioural and go RED under the operator mutation | ✓ VERIFIED | **MUTATION IN THIS PROCESS:** `&&` → `\|\|` on `GameScreen.tsx:110-111`, all of `tests/ui` → **2 failed / 149 passed**, and the two failures are exactly the new cases. The same mutation left the workspace green in round 5. ASSERTION 5 untouched, as the prohibition required |
| 24 | `.planning/REQUIREMENTS.md` is coherent — no `- [ ]` above a note whose first word is `Closed` | ✓ VERIFIED | I ran the coherence gate over the current file myself: **0 pairs**. The executor's reported base correction (3 such pairs, not the plan's 2 — N-END-02 carries two closure notes) is accurate against the file |
| 25 | N-END-01 and N-END-02 re-ticked on round-6 evidence, each note AMENDED rather than re-stated; the round-5 "last re-arm path" clause corrected | ✓ VERIFIED | `:177-181`. The amendment names the neighbouring cell the round-5 enumeration missed and cites the 20-cell table, the two driven host cases and the re-pointed source contract — every one of which I verified exists and does what the note says |
| 26 | N-END-03 stays `[ ]` with an accurate caveat, gaining one sentence that round 6 repaired the INSTRUCTIONS without taking the reading | ✓ VERIFIED | `:183`. The sentence is true: 11-20 repaired § Limits item 2 and took no reading |
| 27 | The requirements edit is EVIDENCE-GATED, not schedule-gated | ✓ VERIFIED | The SUMMARY records the three transcripts. I re-ran all three independently: `npx vitest run` 99 files / 663 tests passed, `npx tsc --noEmit` exit 0, `npx eslint` 0 errors / 2 carried warnings |
| 28 | `.planning/REQUIREMENTS.md` touched by exactly ONE commit this round; `requirements.mark-complete` not run | ✓ VERIFIED | `git log 6bb18bf..HEAD -- .planning/REQUIREMENTS.md` → `661af86` only |

**Score:** 26/28 truths verified (2 present, behavior-unverified: SC-5's device half and 11-19's self-cancel). The table enumerates the 28 load-bearing truths for this round. Rounds 1–5's remaining must-haves were re-checked as regressions and are all still ✓ — the workspace is green at 99 files / 663 tests (up 15 from round 5's 648) and `git diff -- src/` over the round-6 base is empty, so no behavioural regression surface was even touched.

### Is the N-END-01 / N-END-02 re-tick warranted?

**Yes, on my own evidence, and more comfortably than in round 5.** Both requirements' substance is verified independently above (SC-1 and SC-3). The closure notes name instruments rather than conclusions, they still state plainly that the claim rests on named instruments plus a verifier's judgement and **not** on a fresh first-principles audit, and — the thing round 5 asked for — the round-5 clause calling the tier-already-Mid case "the last re-arm path" has been amended rather than left standing. The amendment says what the case actually covered, names the neighbouring cell that was a live defect, and points at the 16-cell enumeration that now covers both. That is the phase correcting its own record in the requirements file instead of leaving a sixth instance of "correct about the half that was fixed, silent about the neighbour" in the one document a future milestone will read first.

The boxes and the notes now agree in both directions (gate: 0 unticked-above-`Closed` pairs), which was the round-5 record gap.

**N-END-03 stays `[ ]`, correctly.** No round-6 task claimed the device half; two plans carry an explicit prohibition against claiming it; and the note records what round 6 *did* do for it (repaired the instructions) without inflating that into a reading.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/_components/certLevelPlan.ts` | The pure three-way policy, no React, no refs | ✓ VERIFIED | 80 lines, one type import (`LevelId` via `src/runtime/loadLevel`, chosen because `app -> core` is not an allowed boundary edge), three ordered tests each with its recorded reason. Imported and used by `PlayingHost.tsx:67-69` |
| `tests/ui/certLevelPlan.test.ts` | 20-cell exhaustive table, domain derived from the catalog | ✓ VERIFIED | Imports `PLAYABLE_LEVEL_ORDER`, asserts set equality, drives all 20 cells, then names the two gap-relevant cells with their consequence |
| `app/_components/PlayingHost.tsx` | One memo, three consumers, zero inline term tests | ✓ VERIFIED | `certLevelPlan` memo at `:1720-1727`; consumers at `:1741`/`:1836`, `:1838`, `:1879`. Both identifier gates at 0. Gap 1 mutation-pinned |
| `tests/runtime.cert-request.test.ts` | Five links of the queued-load claim, over shipped source | ✓ VERIFIED | New file, 141 lines, 5 `it(` + extraction guard; every link independently re-derived by me at `src/runtime/useGameLoop.ts` |
| `tests/ui/GameScreen.test.tsx` | Negative render cases for the pause-overlay conjunction | ✓ VERIFIED | Two cases, both red under the `&&` → `\|\|` mutation I ran; case 2 carries a positive control (the result overlay's `Retry level` IS present in the same render), so the absence is the gate refusing rather than an empty screen |
| `tests/ui/PlayingHost.endless-host.test.ts` | Re-pointed source contract: one definition, one call, zero inline re-tests | ✓ VERIFIED (level-half gate loose — advisory WR-03) | Both 0-counts discriminating with stated bases. The arm is exact-literal pinned; the level half's gate is a loose regex that accepts extra conjuncts (measured) |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | Cell 5 and cell 7 driven; the `:1824` message corrected | ✓ VERIFIED | 33 tests, all green; cell 5 reds under the arm revert |
| `docs/ops/ENDLESS-MODE.md` | Queued-load correction in both operator-facing locations, operator consequence stated, SC-5 block intact | ✓ VERIFIED (stale source pointer — advisory WR-01) | `:261` and `:484-520` corrected and dated; `contaminates the next run` at `:514`; do-not-press and restart instructions intact at `:553`; SC-2 ramp block and A-04 acceptance untouched |
| `.planning/REQUIREMENTS.md` | Boxes and notes that agree; N-END-03 untouched at `[ ]` | ✓ VERIFIED | 0 incoherent pairs; one commit (`661af86`) |
| `src/` (all) | Out of scope for round 6 — read only | ✓ UNCHANGED | `git diff --name-only 6bb18bf..HEAD -- src/` is empty. Read here because gap 2's mechanism lives in `useGameLoop.ts` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `certLevelPlanFor` (pure) | the `certLevelPlan` memo | `certLevelPlanFor({mode, runEnded, levelId})` reading refs at call time | ✓ WIRED | `:1720-1727`; `levelId` is state and is in the deps, the two refs deliberately are not, with the reason stated |
| the memo | the level half `if (plan === 'force')` | the stored `plan` | ✓ WIRED | Byte-equivalent to the shipped three-term condition (derived term by term). Gate pins the call-site shape, loosely — WR-03 |
| the memo | `certPendingRef.current = plan !== 'unreachable';` | the same stored `plan` | ✓ WIRED AND NOW EXACT-PINNED | **This is the link round 5 broke.** It is now the same value, not a second expression, and it is the one site pinned to an exact literal. Reverting it reds cell 5 |
| the memo | the deferred-cert effect's self-cancel → `certPendingRef` cleared | `certLevelPlan() === 'unreachable'` | ⚠️ WIRED, SOURCE-PINNED ONLY | Present, correctly ordered ahead of the discharge test, deps include `certLevelPlan` so exhaustive-deps guards it. But deleting it leaves 662/663 green — truth 15 |
| `injectCertWorstCase` (`useGameLoop.ts:787`) | `applyCertWorstCaseInject` (`:442`) | `certRequest` consumed only inside `onFrame` | ✓ WIRED, AND NOW CORRECTLY DESCRIBED | The link is real and queued; round 6's correction now says so in all four owning artifacts, pinned by `tests/runtime.cert-request.test.ts` |
| cert level half | `getBestForLevel` preload → `setResultBest` → `Best ·` | `levelId` change past a mounted panel | ✓ CLOSED, UNCHANGED | The level half is byte-equivalent, so the WR-02 case guarding N-END-02's display firewall is unaffected and green |
| `onResume` | `PauseOverlay` | `showPauseOverlay` (`GameScreen.tsx:110-111`) | ✓ WIRED, AND NOW OPERATOR-PINNED | Round 5's `coincidental-reliance` flag on this link is CLEARED: the conjunction's operator is now observable, and the `\|\|` mutation reds two cases |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Results overlay `Best ·` (campaign, mounted) | `resultBest` | `getBestForLevel(levelId)` via `previousBestRef` | Yes — per-level and observably so (repaired mock + positive control, round 5) | ✓ FLOWING |
| Results overlay `Best ·` / `Best wave ·` (endless) | endless watermark refs | `ENDLESS_TELEMETRY_KEY` snapshot at mount | Yes | ✓ FLOWING |
| Cert level decision | `plan` | `certLevelPlanFor(mode, runEnded, levelId)` — one pure call per press | Yes — three consumers read the same value | ✓ FLOWING |
| `Cert WC` worst-case load | `certRequest` → `applyCertWorstCaseInject` | `onFrame` only | Yes, on the next armed frame — and every artifact now says so | ✓ FLOWING (documentation corrected) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Workspace baseline | `npx vitest run` | 99 files / 663 tests passed | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint (7 changed source/test files) | `npx eslint <files>` | 0 errors, 2 carried warnings | ✓ PASS |
| **Gap 1 closed, behaviourally** | revert the arm to `modeRef.current !== 'endless'`, run `endless-retry` | 1 failed / 32 passed — the failure is exactly the cell-5 case | ✓ PASS |
| **Advisory 1 closed, behaviourally** | `&&` → `\|\|` on `showPauseOverlay`, run all of `tests/ui` | 2 failed / 149 passed — both failures are the new negative cases | ✓ PASS |
| Gap 2 clause eliminated | grep the four owning files for the false clause | 0 (base 6, re-measured in git at `6bb18bf`) | ✓ PASS |
| Queued-load chain, re-derived | read `src/runtime/useGameLoop.ts` at 787 / 440-442 / 685 / 441 / 415 | all five links as the correction states | ✓ PASS |
| Requirements coherence | run the unticked-above-`Closed` gate over the current file | 0 pairs | ✓ PASS |
| Self-cancel is behaviour-pinned? | delete the self-cancel clause, run the full suite | 1 failed / 662 passed — the failure is a SOURCE contract | ✗ FAIL (source-only — truth 15) |
| Discharge clear is pinned? | delete `certPendingRef.current = false;` at `:1892`, run the full suite | 99 files / 663 tests GREEN | ✗ FAIL (advisory WR-02) |
| Level half resists a NEW term? | add `&& !waveAdvanceInFlightRef.current` to the level half only, run the full suite | 99 files / 663 tests GREEN | ✗ FAIL (advisory WR-03) |
| Level half + self-cancel, two-sided | the review's WR-03 mutation, run the full suite | 99 files / 663 tests GREEN | ✗ FAIL (advisory WR-03) |

All source mutations were reverted; `git status` is clean apart from the three pre-existing untracked/modified `.planning` files present at session start.

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| — | `find scripts -path '*/tests/probe-*.sh'` | no matches; no PLAN declares a probe script | ? SKIP (this repo's phase gates are vitest cases and `scripts/assert-*.mjs`, all run above) |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| N-END-01 | 11-01/03/04/05/06/07/09/10/13/14/15/16/17/18/19/20/21 | Clearing a board advances in the same run; lives/score/combo carry over; the run ends only at zero lives | ✓ SATISFIED | SC-1 above. `[x]` with a round-6 amended closure note; the re-tick is warranted and the round-5 "last re-arm path" overstatement is corrected |
| N-END-02 | 11-02/05/06/07/08/09/10/11/12/15/17/18/19/21 | Endless records stored separately; endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED | SC-3 above. No `src/` change this round; the display firewall's guard rides on a level half I verified byte-equivalent. `[x]` with a round-6 amended note |
| N-END-03 | 11-01/03/04/05/06/07/08/09/11/14/16/18/20/21 | Seeded endless run reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ? NEEDS HUMAN | Reproducibility half ✓ (SC-4). Frame-budget half device-gated and unmeasured. `[ ]` is correct, and its caveat now records what round 6 did and did not do for it |

**No orphaned requirements:** every ID mapped to Phase 11 in REQUIREMENTS.md is claimed by at least one plan, and every ID in a plan's `requirements` field exists in REQUIREMENTS.md. (`N-GEN-01/02/03` sit immediately above in the file and are Phase 10's, not this phase's.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `docs/ops/ENDLESS-MODE.md` | 261, 485 | Cites a source expression deleted by 11-19; the module that replaced it appears nowhere in `docs/` | 📋 Advisory | WR-01 — behavioural content still true, no operator action changes |
| `tests/ui/PlayingHost.endless-host.test.ts` | 1674-1677 | Assertion message claims a discrimination the `toBeGreaterThanOrEqual(1)` does not have | 📋 Advisory | WR-02 — measured; shipped code correct |
| `tests/ui/PlayingHost.endless-host.test.ts` | 1519-1520 | Level-half gate is a loose regex; accepts extra conjuncts built from any new identifier | 📋 Advisory | WR-03 — measured both ways; no present defect |
| `app/_components/PlayingHost.tsx` | 1858-1878 | Self-cancel comment states two mechanisms, neither true of the code | 📋 Advisory | WR-04 — behaviour correct for a different, correctly-stated reason in the same comment |
| `tests/ui/PlayingHost.endless-host.test.ts` | 367, 372 | `ReadonlyArray<T>` lint warning | ℹ️ Info | Carried, cosmetic |
| `app/_components/PlayingHost.tsx` | 1841-1842 | "stable useState setters" — `setLevelId` is a `useCallback` | ℹ️ Info | Pre-existing (commit `e20b1f2`) |

No `TBD`, `FIXME` or `XXX` marker exists in any file this phase modified (scanned all eight round-6 files).

### Human Verification Required

Five items, in the frontmatter `human_verification` block: the SC-5 device reading (whose written procedure is, for the first time in three rounds, correct as it stands and needs no verifier correction carried alongside it), the cert self-cancel's unobservable positive direction, the two layout backstops, and the two flagged-prohibition decisions. The first prohibition is judgement-tier and I have recorded my non-authoritative verdict for both halves of it rather than absorbing it into the score.

### Gaps Summary

**No gaps. Both round-5 blockers are closed, and closed by evidence I generated rather than read.**

Gap 1 was closed structurally rather than by a fourth conjunct in a third place, which is what round 5 asked for: the level question is now one pure total function with three consumers reading one stored value. I did not take the equivalence on trust — I derived `plan === 'force'` ⟺ the shipped three-term condition term by term, which is what lets 11-16's and 11-17's behaviour and N-END-02's display guard survive unchanged, and I confirmed the single changed cell is cell 5 by the same derivation. Then I ran the mutation: reverting the arm alone reds exactly one case, and it is the cell-5 case. Gap 2's false clause is gone from all four files it owned (base 6 re-measured in git, now 0), its replacement is true at every one of five links I re-read at source, and it has an instrument that pins them and is honest that it reads source rather than producing frames. Round 5's advisory 1 was closed too, and I confirmed by mutation that the `&&`/`||` hole nothing in the repo could see is now covered by two cases.

**The three executors' reported base drifts are accurate.** I checked the one that mattered: the false clause measured 6 at the plan's named base `6bb18bf` and 0 in `PlayingHost.tsx` on the tree the executor actually received, because sibling plan 11-19's commit `07907f3` deleted that paragraph in between. The commit and both file states confirm it. The roadmap tick bases and the vacuous gate counter are reported the same way — stated as measured on the executed tree with the vacuity called out, rather than edited to fit. That is the discipline this phase has been trying to install for six rounds, and it is working.

**What remains, and why I am not sending a seventh round for it.** Four advisories, three of which I measured myself. WR-01 is a stale source pointer whose behavioural content is still true — it changes no instruction, no measurement and no operator action, which is precisely the test this phase applied in round 4 to call a clause advisory and in round 5 to call one blocking. WR-02 and WR-03 are gate strength, not behaviour: the shipped code is correct on both, and the exposure is a hypothetical future edit to a `__DEV__`-only control that writes no record, alters no campaign best or star, and cannot be reached by any player in a shipped build. WR-04 is inherited reasoning attached to correct code, in a comment that states the right reason two sentences later.

I weighed WR-03 hardest, because "the next change could diverge silently" is the standard I would normally call a gap on, and because the asymmetry cuts the wrong way — the arm is exact-pinned, so a level half that acquires a term is *guaranteed* to strand an arm rather than merely allowed to. What decided it: 11-19's declared must_have is that neither site re-tests **the predicate's terms** inline, and that truth is met exactly as written with both counts discriminating against measured bases; the module's own structural claim ("a fourth term added to this body reaches every decision site by construction") is true; and the escape requires an author to add a term at a call site in direct defiance of a twenty-line instruction sitting at that call site telling them not to. A phase does not fail its goal because a gate could be one notch tighter, and all four fixes together are one commit of about thirty lines with no behaviour change — best done the next time someone opens those files, which Phase 14's work on the five reset blocks will require anyway.

**The phase goal is achieved.** A player can start a run that keeps producing boards until they lose, with a record worth chasing: four of the five Success Criteria are verified, the fifth has its automatable half verified and its device half correctly and honestly left open as `N-END-03` `[ ]`, N-END-01 and N-END-02 are ticked on evidence I checked rather than on the notes' own say-so, and the record file and the operator document now agree with each other and with the shipped code on everything that changes what a reader would do. The only thing standing between this phase and `passed` is a frame no machine in this repo can produce.

---

_Verified: 2026-09-26T15:56:05Z_
_Verifier: Claude (gsd-verifier)_
