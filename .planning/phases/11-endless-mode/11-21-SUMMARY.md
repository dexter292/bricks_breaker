---
phase: 11-endless-mode
plan: 21
subsystem: testing
tags: [vitest, react-testing-library, render-gate, requirements-record, mutation-testing]

requires:
  - phase: 11-endless-mode (11-19)
    provides: "`certLevelPlanFor` and its 20-cell truth table, the cell-5 and cell-7 driven cases, and the re-pointed source contract — the instruments N-END-01's round-6 amendment names"
  - phase: 11-endless-mode (11-20)
    provides: "the five-link queued-cert-load contract and the corrected § Limits item 2 — the instruction repair N-END-03's caveat now records as done-without-the-reading"
provides:
  - "tests/ui/GameScreen.test.tsx — two behavioural NEGATIVE render cases for `showPauseOverlay`, the first coverage in the repository of the operator between its two terms"
  - "The round-5 advisory converted from a deferral into a recorded decision, with its rejected alternative and the reason for rejection written where the cases live"
  - ".planning/REQUIREMENTS.md — an Endless Mode block whose boxes and notes agree: 3 incoherent pairs -> 0, N-END-01/02 re-ticked on a round-6 evidence gate, N-END-03 still `[ ]`"
  - "The round-6 record: twelve falsifications, the 16-cell cross-product as shipped, the three recorded decisions, and what round 6 did NOT close"
affects: [phase-14-pause-redesign, sc-5-device-reading, phase-11-round-7-if-any]

actuals:
  tokens: 14900
  tasks: 3
  commits: 3
plan_head_before: 3b93309bdc3a6e9b76aeb76dc2ec1c40dd96e352

tech-stack:
  added: []
  patterns:
    - "Operator coverage is behavioural, not structural: a source gate matching a conjunction as one literal is satisfiable by formatting; a render case that asserts the far end's ABSENCE is not"
    - "An absence assertion carries a positive control in the same case, so 'the component rendered nothing' cannot pass as 'the gate refused'"
    - "A record edit is EVIDENCE-gated, not schedule-gated: the three transcripts run before the file is opened and are committed beside the box they moved"

key-files:
  created:
    - .planning/phases/11-endless-mode/11-21-SUMMARY.md
  modified:
    - tests/ui/GameScreen.test.tsx
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "The round-5 advisory is closed with a NEGATIVE RENDER CASE, not a single-literal source gate: a prettier re-wrap of the `showPauseOverlay` assignment would red a source literal with no behaviour changing, and a source literal cannot tell 'the operator is `&&`' from 'the operator is spelled `&&` on this line'"
  - "ASSERTION 5 in `tests/ui/PlayingHost.endless-host.test.ts` is untouched: it asserts the two TERMS, the new cases assert the OPERATOR between them, and both are wanted"
  - "N-END-01's round-5 clause is AMENDED rather than replaced, and the superseded wording is DESCRIBED rather than quoted — the gate on that file pins the false literal at 0 and the verbatim record lives in git at `6bb18bf`"
  - "N-END-03 stays `[ ]`: round 6 repaired the INSTRUCTIONS for the SC-5 device reading and did not take the reading"
  - "`requirements.mark-complete` was NOT run; REQUIREMENTS.md carries exactly one round-6 commit"

patterns-established:
  - "Pattern 1: when a mutation survives an entire workspace, the fix is a case that OBSERVES the far end, not a gate that reads the near end"
  - "Pattern 2: a plan-stated base is re-measured on the executed tree before it is copied into a record — twice this round the executed tree disagreed with the plan, and both disagreements are reported rather than absorbed"

requirements-completed: [N-END-01, N-END-02]

coverage:
  - id: D1
    description: "`showPauseOverlay`'s OPERATOR is observable: an `&&` -> `||` mutation of `src/runtime/GameScreen.tsx:110-111` turns both new cases RED while the pre-existing positive case stays GREEN. Measured base: the same mutation left 16 files / 142 tests of `tests/ui` entirely green."
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/GameScreen.test.tsx#playing + no result: no pause overlay — no Resume, no Paused"
        status: pass
      - kind: unit
        ref: "tests/ui/GameScreen.test.tsx#paused + a result: no pause overlay — the result overlay owns the screen"
        status: pass
      - kind: other
        ref: "mutation `!hasLevelError && uiPhase === 'paused' || result == null` -> exit 1, 6 ok / 2 not ok; both records RED_EVIDENCE_OK (target_test_failed) under `check tdd-red-evidence`; reverted, sha256 unchanged"
        status: pass
    human_judgment: false
  - id: D2
    description: "The absence assertions are non-vacuous: case 2 asserts the result overlay's `Retry level` button IS present in the same render, so the absence above it is the pause gate refusing rather than the screen rendering nothing"
    verification:
      - kind: unit
        ref: "tests/ui/GameScreen.test.tsx#paused + a result: no pause overlay — the result overlay owns the screen"
        status: pass
    human_judgment: false
  - id: D3
    description: "`.planning/REQUIREMENTS.md` is coherent: no `- [ ]` sits above a note whose first bolded word is `Closed`. Measured base 3 by the task's own awk gate; after: 0"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "awk incoherent-pair gate over .planning/REQUIREMENTS.md -> incoherent-pairs=0 (base 3), exit 0"
        status: pass
      - kind: other
        ref: "n-end-01-ticked 1 (base 0); n-end-02-ticked 1 (base 0); n-end-03-unticked 1 (base 1); premature-clause 0 (base 1); round6-amendments 3 (base 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The re-tick is evidence-gated: `npm test` (99 files / 663 tests, 0 failed), `npm run typecheck` and `npm run lint` all ran GREEN before `.planning/REQUIREMENTS.md` was opened, and the three timestamped transcripts are in the commit body"
    requirement: "N-END-02"
    verification:
      - kind: other
        ref: "commit 661af86 body — transcripts dated 2026-09-26T15:27:39Z / 15:27:57Z / 15:28:03Z, all preceding the edit"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exactly one round-6 commit touches `.planning/REQUIREMENTS.md`, and `requirements.mark-complete` was not run"
    verification:
      - kind: other
        ref: "git log --oneline 6bb18bf..HEAD -- .planning/REQUIREMENTS.md -> 1 line (661af86); req-log-status 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nothing under `src/core`, `src/levelgen`, `src/runtime` or plans 11-01..11-18 moved this round"
    verification:
      - kind: other
        ref: "git diff --name-only a20ad36..HEAD -- src/core src/levelgen -> empty; 6bb18bf..HEAD -- src/runtime -> empty; 6bb18bf..HEAD -- 11-0*/11-1[0-8]-PLAN.md -> empty"
        status: pass
    human_judgment: false
  - id: D7
    description: "The N-END-01/N-END-02 re-tick is CORRECT as a claim about the requirements, not merely as a bookkeeping operation"
    verification: []
    human_judgment: true
    rationale: "The gates prove the boxes moved on a green tree with dated notes naming instruments. They cannot prove the round-4 verifier's judgement that these two requirements are satisfied is itself right — no fresh first-principles audit of N-END-01 or N-END-02 was performed in round 5 or round 6, and both notes say so in their own words. A verifier may overrule on that basis without archaeology."
  - id: D8
    description: "The SC-5 device reading — no frame spike outside the Mid budget across an endless wave transition"
    requirement: "N-END-03"
    verification: []
    human_judgment: true
    rationale: "Device-gated and UNMEASURED. No automated step in this repository can produce a frame on hardware. No task in round 6 claimed any part of it; N-END-03's box is deliberately still `[ ]`."

duration: 11 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 21: The Advisory's Decision, and a Record That Agrees With Itself Summary

**The `showPauseOverlay` conjunction acquires the two behavioural negative render cases that make its OPERATOR observable — an `&&` -> `||` mutation that survived all 16 files and 142 tests of `tests/ui` now reds both of them while the positive case stays green — and `.planning/REQUIREMENTS.md` stops contradicting itself: 3 boxes-versus-notes incoherent pairs go to 0, N-END-01 and N-END-02 are re-ticked behind a three-command evidence gate that ran before the file was opened, and N-END-03 stays `[ ]` because round 6 repaired the instructions for the device reading without taking it.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-26T15:21:40Z
- **Completed:** 2026-09-26T15:32:50Z
- **Tasks:** 3
- **Files created/modified:** 5 (1 created, 4 modified)

## Accomplishments

- **The advisory has a decision and an instrument, not a deferral.** Two negative render cases in `tests/ui/GameScreen.test.tsx`, with the measurement, both falsified upstream explanations, and the rejected alternative recorded in a comment above the pair.
- **The operator is now falsifiable.** The verifier's own mutation reds both new cases and leaves the positive case green — the discriminating pair, not merely additive coverage.
- **The requirements file says one thing.** Three incoherent box/note pairs removed; both re-ticks gated on a green workspace measured BEFORE the edit; one commit, one author, `requirements.mark-complete` deliberately not run.
- **The prematurely-worded clause is corrected, not deleted.** N-END-01's round-5 sentence is amended in place with what the case actually covered, what it did not, and how round 6 closed the neighbour.
- **Two plan-stated bases were re-measured and found moved; both are reported rather than absorbed.** See "Measurement corrections" below. This is the phase's signature failure and it does not recur here.

## Task Commits

1. **Task 1: the negative render case nothing in the repo had** — `febb6a0` (test)
2. **Task 2: reconcile REQUIREMENTS.md — boxes and notes that agree** — `661af86` (docs)
3. **Task 3: the round gate and the round-6 record** — this SUMMARY, `.planning/ROADMAP.md` and `.planning/STATE.md` (docs)

Task 1 carries `tdd="true"`; there is no GREEN `feat(11-21)` commit, deliberately — see "TDD Gate Compliance" below.

## The 16-cell control cross-product, as shipped

Carried from `11-19-SUMMARY.md` verbatim, because this is the enumeration N-END-01's amended note now cites and a record that cites a table should carry it. `mode` x `runEnded` x (is it `level-03`) x (is the tier already Mid). `plan()` is `certLevelPlanFor`'s answer; `arm NEW` is `plan !== 'unreachable'`; `arm OLD` was `modeRef.current !== 'endless'`. Thirteen shipped rows — cells 13-16 collapse into one.

| # | mode | run | level | tier | plan() | level half | defer | arm NEW | arm OLD | inject at press | covered by, as shipped |
|---|------|-----|-------|------|--------|-----------|-------|---------|---------|-----------------|------------------------|
| 1 | campaign | live | below-03 | not Mid | force | fires | yes | true | true | 0, then 1 deferred | C1 `a CAMPAIGN press below level-03 still arms the deferral and discharges it exactly once` — green |
| 2 | campaign | live | below-03 | Mid | force | fires | yes | true | true | 0, then 1 deferred | truth table only — same `force` cell as 1, unchanged by construction |
| 3 | campaign | live | level-03 | not Mid | ready | no-op | yes (tier) | true | true | 0, then 1 deferred | truth table only — unchanged |
| 4 | campaign | live | level-03 | Mid | ready | no-op | no | not reached | not reached | 1 direct | C2 `a CAMPAIGN press already at level-03 with the tier Mid injects exactly once, with nothing deferred` — green |
| **5** | **campaign** | **ENDED** | **below-03** | **not Mid** | **unreachable** | **refused** | **yes (tier)** | **false** | **true** | **0, and 0 on the later walk (was 1)** | **NEW — `... with the tier AUTO arms nothing — the later Lv walk to level-03 injects nothing (round-6 gap 1)`. THE ONLY BEHAVIOUR DELTA** |
| 6 | campaign | ENDED | below-03 | Mid | unreachable | refused | no | not reached | not reached | 1 direct | 11-17 `an ENDED campaign run is not re-armed ...` — green |
| 7 | campaign | ENDED | level-03 | not Mid | ready | no-op | yes (tier) | true | true | 0, then 1 deferred | **NEW — `... ALREADY at level-03 with the tier AUTO still injects exactly once (cell 7, unchanged)`** |
| 8 | campaign | ENDED | level-03 | Mid | ready | no-op | no | not reached | not reached | 1 direct | truth table only — unchanged |
| 9 | endless | live | below-03 | not Mid | unreachable | refused | yes (tier) | false | false | 0 | `while endless below level-03, Cert WC arms nothing ...` + `with the tier UNSET, Cert WC still records the run ... (P3)` — green |
| 10 | endless | live | below-03 | Mid | unreachable | refused | no | not reached | not reached | 1 direct | `with the tier already Mid, Cert WC leaves the endless run live and the level unchanged` — green |
| 11 | endless | live | level-03 | not Mid | unreachable | no-op | yes (tier) | false | false | 0 | `while endless already on level-03, Cert WC injects nothing either ...` — green |
| 12 | endless | live | level-03 | Mid | unreachable | no-op | no | not reached | not reached | 1 direct | truth table only — unchanged |
| 13-16 | endless | ENDED | any | any | unreachable | refused/no-op | per tier | false | false | per tier | truth table only — `arm OLD` was already false while endless, so no cell here can change |

The one-cell delta derivation is in `11-19-SUMMARY.md` and is not restated here: `arm_new` differs from `arm_old` exactly at **campaign AND run ENDED AND not `level-03`**, and under that conjunction `defer` can only come from the tier half, which requires the tier not already Mid — cell 5 and no other.

## Every falsification run in round 6

Twelve, not the nine this plan declared — see "Measurement corrections" 2. Numbered in the order the mutations were run, across the three waves. Column shape as `11-17-SUMMARY.md` established: mutation / observed failure / reverted.

| ID | Wave / plan | Mutation applied | Observed failure | Reverted |
|---|---|---|---|---|
| F6-01 | 9 / 11-19 T1 | none — the test file written against a module that did not exist yet | `not ok 1 - tests/ui/certLevelPlan.test.ts` — `Cannot find module '../../app/_components/certLevelPlan'` | n/a — recorded as `fixture_or_load_failure` / INVALID_RED, and explicitly NOT used to authorize GREEN |
| F6-02 | 9 / 11-19 T1 | `certLevelPlanFor` written with the endless test evaluated LAST instead of FIRST | `not ok 3 - ... all 20 cells ...` — `cell {mode: endless, run: live, level: level-03} must be 'unreachable': expected 'ready'`; `not ok 4 - ... the two gap-relevant cells ...`. 4 tests / 2 pass / 2 fail | yes — 4 ok, exit 0. `RED_EVIDENCE_OK` |
| F6-03 | 9 / 11-19 T2 | none — the cell-5 case driven against the UNWIRED host (pre-fix measurement) | `not ok 32 - ... tier AUTO arms nothing — the later Lv walk to level-03 injects nothing` — actual `... level-03 inject=1`, expected `inject=0`. 32 / 31 / 1 | n/a — the defect itself. `RED_EVIDENCE_OK` |
| F6-04 | 9 / 11-19 T2 | the deferral arm restored to the mode-only expression, everything else left wired | three named failures: `not ok 58 - ... tier AUTO arms nothing ...` (`level-03 inject=1`); `not ok 25 - ... the pending-cert arm is the predicate's value, not a second expression`; `not ok 23 - ... every path that re-arms the frame loop is enumerated ...` (`ZERO occurrences of the run-mode ref: expected 1 to be 0`) | yes — 58 ok across both files, exit 0 |
| F6-05 | 9 / 11-19 T3 | the run-ended test moved ABOVE the `level-03` test inside the predicate | `not ok 33 - ... ALREADY at level-03 with the tier AUTO still injects exactly once (cell 7, unchanged)` — `expected vi.fn() to be called 1 times, but got 0 times`, while cell 5 (`ok 32`) stayed green | yes — 33 ok, exit 0 |
| F6-06 | 9 / 11-19 T3 | the self-cancel clause deleted from the deferred-cert effect | `not ok 26 - ... the deferred-cert effect is the predicate's third consumer (round-6 self-cancel): expected 0 to be 1` — **and nothing else moved**, which is the measured limit of that clause | yes — exit 0 |
| F6-07 | 10 / 11-20 T1 | the apply helper called inside `injectCertWorstCase`'s body | exit 1, 4 ok / 2 not ok — RED on `link 1`, collaterally `link 2` (call-site count rises to 2) | yes. `RED_EVIDENCE_OK` |
| F6-08 | 10 / 11-20 T1 | a second `applyCertWorstCaseInject(` call site added OUTSIDE `onFrame` | exit 1, 5 ok / 1 not ok — RED on `link 2` | yes. `RED_EVIDENCE_OK` |
| F6-09 | 10 / 11-20 T1 | autostart flipped to `useFrameCallback(onFrame, true)` | exit 1, 4 ok / 2 not ok — RED on `link 3`, and on `link 2`'s own anchor guard (the `, false)` anchor stops resolving — the anti-vacuity guard doing its job) | yes. `RED_EVIDENCE_OK` |
| F6-10 | 10 / 11-20 T1 | a second `certApplied.value = certRequest.value;` added to the retry-reset block | exit 1, 5 ok / 1 not ok — RED on `link 4` | yes. `RED_EVIDENCE_OK` |
| F6-11 | 10 / 11-20 T1 | the cert consume block moved ABOVE the retry-reset block | exit 1, 5 ok / 1 not ok — RED on `link 5` | yes. `RED_EVIDENCE_OK` |
| F6-12 | 11 / 11-21 T1 | `showPauseOverlay` rewritten `!hasLevelError && uiPhase === 'paused' \|\| result == null` (`src/runtime/GameScreen.tsx:110-111`) | exit 1, 6 ok / 2 not ok. `not ok 3 - ... playing + no result: no pause overlay — no Resume, no Paused` and `not ok 4 - ... paused + a result: no pause overlay — the result overlay owns the screen`, both `AssertionError: expected <button …(5)>…(1)</button> to be null`; `ok 2 - ... paused: shows Resume via PauseOverlay accessibility` GREEN, and the other five pre-existing cases green — independently reconfirming the verifier's measurement | yes — sha256 `9b73681e546d19daf1af36113320756893a3cdc155ca1147e7c080597342f26b` before and after; `git diff --name-only 6bb18bf..HEAD -- src/runtime` empty. Both records `RED_EVIDENCE_OK` / `target_test_failed` |

`src/runtime` and `src/core` / `src/levelgen` are byte-identical to their round-6 bases after all twelve.

## The corrected locations from 11-20, with their before/after counts

Re-measured in this plan by `git show`-ing each file at the round-6 base and at the tree 11-20 actually received, rather than copied from plan prose.

| File | False clause at `6bb18bf` | at `da1c356` (11-20's actual base) | now | Instrument cited: base -> now |
|---|---|---|---|---|
| `docs/ops/ENDLESS-MODE.md` | 2 | 2 | **0** | 0 -> **2** |
| `app/_components/PlayingHost.tsx` | 1 | **0** | 0 | 0 -> **1** |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | 1 | 1 | **0** | 0 -> **1** |
| `.planning/phases/11-endless-mode/11-17-SUMMARY.md` | 2 | 2 | **0** | 0 -> **2** |
| **Total** | **6** | **5** | **0** | 0 -> **6** |

Also: `MEASURED, not derived` 1 -> **0** in `tests/ui/PlayingHost.endless-retry.test.tsx`, with the assertion it decorated byte-identical.

**The sixth location was not corrected by 11-20 — it was deleted by 11-19.** `07907f3` (`feat(11-19): read both cert decision sites from one predicate call`) removed the whole round-5 `WHAT IT COSTS` paragraph from `PlayingHost.tsx` while extracting `certLevelPlanFor`, taking the false clause and any statement of the cost with it. 11-20 restored the paragraph with corrected content, which is why the citation count there moves 0 -> 1. Both numbers are true of different trees; neither is a correction of the other.

## Measurement corrections

Two plan-stated bases moved between plan time and execution time. Both are reported here rather than edited to fit, because a number in the record that the tree does not support is this phase's signature failure.

**1. The false-clause enumeration is 6 at `6bb18bf` and 5 at `da1c356`.** This plan's Task 3 `<action>` says "the six corrected locations from 11-20 ... summing to 6". 11-20's executor measured 5 and said so. Re-measured independently here by `git show` at both commits: **both are right, of different trees** (table above). The record states 5 as the number 11-20 corrected and 6 as the number standing at the round-6 base, with the deleting commit named.

**2. The declared falsification count of nine is an undercount, not an error of direction.** The plan declares "at least nine: three from 11-19, five from 11-20 Task 1, one from 11-21 Task 1". `11-19-SUMMARY.md` records **six** transcripts, not three (four mutations and two REDs, one of which is an INVALID_RED load failure recorded as non-gating). Twelve rows are recorded above rather than nine; the gate's threshold is `>= 9` and is satisfied with margin. Recording nine would have required silently dropping three transcripts that exist.

**3. Two of this plan's roadmap bases had already moved.** The plan measured `roadmap-round6-ticked=0`, `roadmap-round6-unticked=3`. Waves 9 and 10 each ran `roadmap update-plan-progress` and ticked their own lines, so at execution time the measured base was **2 ticked / 1 unticked**. This task therefore ticked one line (`11-21`), not three, and the gate's `roadmap-dependency-plans-ticked = 2` assertion was **already true before this task ran** — it is vacuous on this tree and is reported as such rather than counted as evidence. The two counters that were NOT vacuous are `roadmap-round6-ticked` (2 -> 3) and the pair on the `:108` count line.

**4. The `:108` count line had also drifted — into exactly the half-edit state the plan warned about.** The plan quotes it as reading `**Plans:** 21 plans — 18 executed (...)`. At execution time it read `**Plans:** 20/21 plans executed — 18 executed (...)`: `roadmap update-plan-progress` had moved the HEADLINE twice while leaving `18 executed` standing in the body — the same failure `5001dbd` committed in round 5 and which this plan cites as its precedent. The full prescribed replacement line was written, headline and breakdown together, and the breakdown sums to the headline: 6+2+3+3+2+2+3 = 21.

## Files Created/Modified

- `tests/ui/GameScreen.test.tsx` — two negative render cases added immediately after the positive `paused:` case, plus the decision comment above the pair (the measurement, both falsified upstream explanations, the rejected alternative and why it was rejected). 6 -> 8 cases, none deleted, none edited.
- `.planning/REQUIREMENTS.md` — five changed lines, all inside `:177-183`. N-END-01 and N-END-02 to `[x]` with dated round-6 amendments; N-END-01's premature clause corrected; N-END-03 unchanged except one accuracy sentence.
- `.planning/ROADMAP.md` — `11-21-PLAN.md` ticked; the `:108` count line rewritten in full.
- `.planning/STATE.md` — position, decisions, session.
- `.planning/phases/11-endless-mode/11-21-SUMMARY.md` — *created.* This file.

## The three recorded decisions

**1. No `src/runtime` change, and both of its reasons.** (11-20, re-affirmed here by the empty diff.) Clearing `certApplied` at the retry-reset boundary would make "the injection does not outlive its run" true of the code rather than of the documentation. It was not done because (a) no test in this repository drives `onFrame` — it is a Reanimated worklet — so the change could not be falsified this round; and (b) the reset block runs ABOVE the cert block on the same frame, so such a reset would also swallow a request issued between a `retry()` and the next frame, silently disabling the deferred-inject path. What a future change owes: a harness that can drive `onFrame`, plus a case proving the deferred-inject path still discharges under that timing. `link 4` of `tests/runtime.cert-request.test.ts` is the tripwire.

**2. No restructure of the `Cert WC` table cell** (advisory IN-03). The cell is ~1,400 words carrying five dated revisions and is unreadable as a table. Compressing it to one line plus a pointer would relocate those corrections away from where the SC-5 operator reads them, against this phase's beside-not-erase rule. Corrected in content, deliberately not restructured; the rewrite-versus-patch choice stays an open `human_verification` item for the owner.

**3. The negative render case over a single-literal source gate.** The rejected alternative was to extend the structural gate to match the whole `showPauseOverlay` conjunction as one literal. Rejected for two reasons: a prettier re-wrap of that assignment would red it with no behaviour changing, and a source literal cannot distinguish "the operator is `&&`" from "the operator is spelled `&&` on this line". A render case cannot be satisfied by formatting. ASSERTION 5 stays exactly as 11-17 left it — it asserts the two TERMS, the new cases assert the OPERATOR — and both are wanted.

## What round 6 did NOT close

Four items, all still `human_verification`, none of them claimed by any round-6 task:

1. **The SC-5 device reading.** No frame spike outside the Mid budget across an endless wave transition, waves 1-5. Device-gated and UNMEASURED. Round 6 repaired the INSTRUCTIONS for taking it (11-20: `docs/ops/ENDLESS-MODE.md` § Limits item 2 and the `:261` table row now state that a `Cert WC` press contaminates the NEXT run) and did not take the reading. N-END-03's box is still `[ ]` and its caveat now says exactly this. The three places carrying the open reading — `.planning/REQUIREMENTS.md` N-END-03, `docs/ops/ENDLESS-MODE.md` § Limits item 2, `.planning/STATE.md` § Pending Todos — were re-read this round and agree.
2. **The E1 overflow backstop.** A 7-digit score and a 4-digit wave in the shipped 320px Results panel: no wrap, no clipping. jsdom computes no layout.
3. **The E3 overflow backstop.** The 48px HUD row at a 7-digit score and a 3-digit combo: no wrap, no clipping. Same reason.
4. **The two flagged-prohibition judgement items.** The first is no longer a pure judgement call — its round-5 falsification was structural and was carried as gap 2, now closed — but the owner decision it asks for (authorise the gap-2 correction as written, or commission a single rewrite of § Limits item 2 from source) is untaken. The second, the broad 11-17/11-18 prohibition set, remains a verifier judgement to spot-confirm or overrule.

## The round's own honest limit

Round 6 changed the SHAPE of the cert-level decision so that a future term reaches every consumer: one predicate, three call sites, and zero-count gates that red when a term is added at a call site instead of at the predicate. That claim is pinned by source contracts and a truth table whose domain is derived from `PLAYABLE_LEVEL_ORDER` at runtime. It is **not** a proof that no fourth consumer will ever be added — nothing in this repository can prove that, and the gates would not see a consumer that consults neither the predicate nor its terms. What they would see is a consumer that re-tests the terms inline, which is the failure mode all five previous rounds actually committed.

The same limit applies to this plan's own contribution. Two negative render cases make one operator observable. They do not make the other four chrome gates in `GameScreen.tsx` (`showPauseChrome`, `showCountdown`, `showResult`, `showStall`) observable, and no measurement in this round says whether those carry the same hole. That is a stated absence, not an implied all-clear.

## Decisions Made

Recorded in "The three recorded decisions" above, plus:

- **N-END-01's superseded clause is described, not quoted.** The first draft of the round-6 amendment re-introduced the false literal while explaining that it was being retired, which moved the plan's own `premature-clause` gate from 0 back to 1. Caught by running the gate, not by reading it — the same lesson 11-17 recorded. The amendment now describes the retired wording and points at `6bb18bf` for the verbatim text.
- **`requirements.mark-complete` was not run** and this plan's metadata commit excludes `.planning/REQUIREMENTS.md`: either would produce a second commit on that file and break the one-commit discipline (threats T-11-22 / T-11-53). `requirements-commits` measured at exactly 1.

## Deviations from Plan

**None in substance — no gate was weakened, widened or skipped.** Every acceptance criterion and every `<verify>` command was run as written. Four measured bases disagreed with the plan's prose and all four are reported above under "Measurement corrections" rather than absorbed: the false-clause enumeration (6 vs 5, both true of different trees), the falsification count (12 recorded against a declared 9, satisfying `>= 9`), the roadmap tick bases (2/1, not 0/3, making one gate counter vacuous), and the `:108` line's actual text.

**Total deviations:** 0 auto-fixed. **Impact on plan:** none. The plan executed as written against bases that had moved under it; the record states the tree, not the plan.

## Verification Results

| Gate | Declared | Measured | Result |
|------|----------|----------|--------|
| `tests/ui/GameScreen.test.tsx` | exit 0, 8 `ok` (base 6) | exit 0, 8 ok, 0 not ok | PASS |
| `resume-absence-assertions` | >= 2 (base 0) | 2 | PASS |
| `resume-presence-assertions` | >= 1 (base 1) | 1 (unmoved) | PASS |
| `screen-git-status` / `src-runtime-touched` | 0 / 0 | 0 / 0 | PASS |
| `n-end-01-ticked` / `n-end-02-ticked` | 1 / 1 (bases 0 / 0) | 1 / 1 | PASS |
| `n-end-03-unticked` | 1 (base 1) | 1 | PASS |
| `premature-clause` | 0 (base 1) | 0 | PASS |
| `round6-amendments` | >= 3 (base 0) | 3 | PASS |
| `incoherent-pairs` | 0 (base 3) | 0, exit 0 | PASS |
| `req-log-status` / `requirements-commits` | 0 / exactly 1 (base 0) | 0 / 1 | PASS |
| `npm test` | exit 0, >= 99 files, no `^FAIL` | exit 0, 99 files / 663 tests, 0 failed, 0 `^FAIL` | PASS |
| `npm run typecheck` | exit 0 | exit 0 | PASS |
| `npm run lint` | exit 0 | exit 0 (0 errors; the 2 known `ReadonlyArray<T>` warnings remain) | PASS |
| `freeze-status` / `frozen-tree-diff` (a20ad36) | 0 / 0 | 0 / 0 | PASS |
| `runtime-status` / `src-runtime-touched` (6bb18bf) | 0 / 0 | 0 / 0 | PASS |
| `plans-git-status` / `prior-plans-touched` | 0 / 0 | 0 / 0 | PASS |
| `round6-plans-present` | 3 | 3 | PASS |
| `falsification-rows` | >= 9 (base 0) | 12 | PASS |
| `cross-product-rows` | >= 13 | 13+ | PASS |
| `roadmap-dependency-plans-ticked` | 2 | 2 (**vacuous** — already 2 before this task; see correction 3) | PASS |
| `roadmap-round6-ticked` / `-unticked` | 3 / 0 (bases 2 / 1 as measured) | 3 / 0 | PASS |
| `roadmap-plans-line-executed` / `-pending` | 1 / 0 (bases 0 / 1) | 1 / 0 | PASS |

## TDD Gate Compliance

Task 1 carries `tdd="true"`. The RED gate is satisfied and recorded; there is **no GREEN `feat(11-21)` commit**, deliberately.

| Gate | Commit | Status |
|---|---|---|
| RED | `febb6a0` `test(11-21): the negative render case nothing in the repo had` | Present. Both new cases classified `RED_EVIDENCE_OK` / `target_test_failed` under the declared operator mutation; transcript in the commit body. |
| GREEN | — | **Absent by design.** The behaviour under test is already shipped and correct; the defect was the absence of an observer, not the absence of behaviour. This plan's own gate requires `src/runtime` to be byte-identical, so an implementation commit would violate it. |
| REFACTOR | — | Not needed. |

`workflow.tdd_mode` is `false` in `.planning/config.json` and the plan's frontmatter is `type: execute`, so the plan-level gate sequence is not enforced here. Recorded anyway, following 11-20's precedent, so the missing `feat` commit is not read as a skipped GREEN.

## Authentication Gates

None.

## Known Stubs

None. No `TODO`, `FIXME`, `.skip(`, `.todo(` or placeholder value was introduced by any commit in this plan.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. Register dispositions: T-11-50 mitigated (evidence gate ran before the file was opened, transcripts in the commit body and above, `incoherent-pairs` 0 from a measured base of 3); T-11-51 mitigated (two behavioural negative cases, each RED under the operator mutation, the positive case proven green under the same mutation); T-11-52 mitigated (mutation reverted, sha256 identical, the frozen core / `src/runtime` / prior-plans triple re-checked in one pass); T-11-53 mitigated (`requirements-commits` exactly 1, `requirements.mark-complete` not run, diff confined to `:177-183`); T-11-54 accepted; T-11-SC not applicable — no package-manager install occurs in this plan.

## Issues Encountered

- **A gate that pins a false literal at 0 forbids quoting the literal you are retiring.** The first draft of N-END-01's round-6 amendment explained the correction by naming the retired phrase, which moved `premature-clause` from 0 to 1. Fixed by describing the retired wording and pointing at `6bb18bf`. Caught by running the gate, not by reading it.
- **`${PIPESTATUS[0]}` does not survive this harness's shell invocation.** Exit codes for `npm test` / `typecheck` / `lint` were captured by running each command with output redirected and reading `$?` directly. No gate result depended on the unreliable reading.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Round 6 is closed on both of its gaps** (11-19 gap 1, 11-20 gap 2) plus the round-5 advisory, and the requirements record no longer contradicts itself in either direction.
- **Still open and NOT claimed:** the SC-5 device reading, the two layout backstops, and the two flagged-prohibition judgement items. All four are `human_verification`; none moved this round.
- **For a round 7, if there is one:** the honest limit above is the premise to start from. The cert-level decision's shape is fixed and its cross-product enumerated; what is not proven is that no consumer will be added that consults neither the predicate nor its terms. The four other chrome gates in `GameScreen.tsx` have not been measured for the same operator hole this plan closed in the fifth.
- **Deletable without cost if Phase 14 redesigns pause:** the two new `GameScreen.test.tsx` cases. They close a pre-existing coverage absence opportunistically and no phase-11 `must_have` depends on them.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `.planning/phases/11-endless-mode/11-21-SUMMARY.md` — FOUND
- `tests/ui/GameScreen.test.tsx` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND
- `.planning/ROADMAP.md` — FOUND
- `.planning/STATE.md` — FOUND
- commit `febb6a0` — FOUND
- commit `661af86` — FOUND
- `git rev-list --count 3b93309..HEAD` = 3 (2 task commits + the metadata commit carrying this file) — matches `actuals.commits`
- `.planning/REQUIREMENTS.md` carries exactly ONE round-6 commit (`661af86`) and is untouched by this metadata commit
