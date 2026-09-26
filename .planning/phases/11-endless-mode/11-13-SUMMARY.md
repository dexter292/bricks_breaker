---
phase: 11-endless-mode
plan: 13
subsystem: ui
tags: [react-native, endless, run-lifecycle, applychrome, runendedref, tdd, vitest]

# Dependency graph
requires:
  - phase: 11-endless-mode
    provides: "`applyChrome`'s run-boundary branches, the `runEndedRef` abandon funnel (11-07/11-09/11-10), `failEndlessStart` and the A-01 copy (11-09), the rendered-overlay harness in PlayingHost.endless-record.test.tsx (11-09/11-12)"
  - phase: 11-endless-mode
    provides: "11-12's re-pointed WR-04 source contract and the `setResultBest` publication rule this plan must not disturb"
provides:
  - "A `runEndedRef` guard as the FIRST statement of `applyChrome`'s endless WON branch, returning rather than falling through — gap 3 of 11-VERIFICATION.md closed"
  - "A uniform ended-run post-condition across all three ended-run states: LOST, the mid-run wave-build failure, and a failed START"
  - "Four behaviour cases the pre-fix code fails, two of them asserting the player-visible failure copy"
  - "A count-based source contract over every run-boundary branch in `applyChrome`, falsified twice"
affects: [phase-14-endless-promotion, 11-14-ops-record, daily-challenge]

# Actuals (#2632). SCALE DISCLOSURE, because it differs from the template default:
# `estimate.tokens: 62000` in 11-13-PLAN.md is an EXECUTOR-CONTEXT estimate, and the
# sibling summaries 11-11 (50021) and 11-12 (49087) recorded the same scale. Recording
# chars/4 over the realized diff here instead would measure a different thing and make
# the phase's own series uncomparable, so the context scale is kept and the diff figure
# is disclosed alongside it rather than substituted for it.
actuals:
  tokens: 95000              # executor context consumed; estimated, not a harness reading
  diff_tokens: 7021          # chars/4 over the realized diff (28,085 chars, 454+/12-)
  tasks: 3
  commits: 6                 # MEASURED: git rev-list --count <plan_head_before>..HEAD, inclusive of this docs commit (5 task commits + 1 metadata)
  plan_head_before: 5bc8860c8b08172caf59addc4695af30bf21cac4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One latch, every boundary: a run-lifetime latch is consulted by EVERY run-boundary branch, and a count-based source contract enumerates the branches so a fifth cannot be added silently"
    - "Independent structural count as the fifth-branch tripwire: the named enumeration cannot see a branch nobody added to it, so an orthogonal count (`setActive(false)` run-end sites) is pinned beside it"
    - "Disclosed tier change: a test whose observation a fix makes impossible is RE-POINTED at what the fix now guarantees, the tier change is stated in the test's own comment, and the reasoning is recorded beside the replacement contract"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - tests/ui/PlayingHost.endless-record.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts

key-decisions:
  - "The endless WON branch RETURNS on `runEndedRef.current` rather than falling through — a fall-through would hand an endless WON to the campaign WON branch and end a run on a cleared board (the SC-1 violation the branch exists to prevent)"
  - "Task 2 Step B (the WR-04 re-point) executed inside Task 1's RED commit, because Task 1's own `<verify>` chain covers that file and the plan's stated collision makes it red between the two tasks otherwise"
  - "`failEndlessStart` clearing `waveAdvanceInFlightRef` is labelled DEFENCE IN DEPTH in the code, not a live defect fix — Task 1's latch makes the stale value unreadable"
  - "The Task 3 count contract pins an INDEPENDENT structural count (three `setActive(false)` run-end sites) alongside the four-branch enumeration, because an enumeration cannot detect a branch nobody enumerated"
  - "Severity recorded as the VERIFIER settled it, not as 11-REVIEW.md CR-01 opened it: an incoherent ENDED state and a copy defect, not a false record"

patterns-established:
  - "Falsification-as-RED: for a gap-closure plan whose acceptance demands a remove-the-fix-and-confirm-failure run, the TDD RED phase IS that measurement, taken on real pre-fix code rather than on a mutant"
  - "Non-discriminating post-conditions are kept but LABELLED: an assertion that also held pre-fix is annotated as secondary, so the prohibition against vacuous assertions is answered on the page rather than by deletion"

requirements-completed: [N-END-01]

coverage:
  - id: D1
    description: "After a LOST run boundary, one further WON mirror regenerates no board, does not call advanceWave and does not move the wave readout"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#an endless run that LOST stays ended — one further WON mirror builds no board (gap 3)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The ended run stays ended through a WALK — four further WON/DOCKED pairs move nothing (pre-fix: W6)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#and it stays ended through a WALK — four more WON/DOCKED pairs do not move the wave (gap 3)"
        status: pass
    human_judgment: false
  - id: D3
    description: "After a mid-run wave-build failure ends the run, a later WON that WOULD have succeeded leaves the readout at W2, advanceWave uncalled and waveBuildFailedWave at 3"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a mid-run wave-build failure ENDS the run — a later WON that WOULD have succeeded moves nothing (gap 3, case b)"
        status: pass
    human_judgment: false
  - id: D4
    description: "After a failed START, one WON mirror cannot rewrite the owner-decided tap-Retry copy, and `Wave · 0` is never rendered for a run that never began — asserted on the RENDERED result-slot subtree"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a failed START stays ended — one WON mirror cannot rewrite the decided tap-Retry copy (gap 3, case c)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The wave-build-failure behaviour case was RE-POINTED at the ENDED post-condition and renamed, not deleted, with the tier change disclosed in its own comment"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a wave that cannot be built ENDS the run, records it, and the ended run STAYS ended (WR-04 / gap 3)"
        status: pass
    human_judgment: false
  - id: D6
    description: "SOURCE TIER ONLY — every run-boundary branch in applyChrome references runEndedRef, the endless latch guard precedes the in-flight test and its body is a bare return, and a fifth run-end site reds the count. Proves the TERM IS WRITTEN, never that a branch behaves; D1-D4 are what prove the behaviour."
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every run-boundary branch in applyChrome consults the shared runEndedRef latch (gap 3)"
        status: pass
    human_judgment: false
  - id: D7
    description: "SOURCE TIER ONLY — failEndlessStart assigns both runEndedRef.current and waveAdvanceInFlightRef.current, so the three ended-run states are uniform. Behaviourally unobservable by construction once the latch gates the branch; the contract says so."
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#failEndlessStart leaves the same post-condition as the other two ended-run states (gap 3)"
        status: pass
    human_judgment: false
  - id: D8
    description: "11-UI-SPEC § UI Considerations E3 overflow backstop — a UI-state test at a 7-digit score and a 3-digit combo showing the 48px HUD row neither wrapping nor clipping"
    verification: []
    human_judgment: true
    rationale: "NOT discharged by this plan, per its own flagged assumption. jsdom computes no layout, so `no wrap and no clipping` cannot be observed by any test this repo can run; asserting 11-UI-SPEC's character arithmetic would convert a backstop into a false `covered`. Abstains at verify time."

# Metrics
duration: 9 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 13: An Ended Endless Run Stays Ended Summary

**`applyChrome`'s endless WON branch now opens with a `runEndedRef` guard that returns, closing 11-VERIFICATION.md gap 3 — the wave no longer walks to W6 behind a lose overlay, and a failed start's decided tap-Retry copy can no longer be rewritten into `Wave 2 could not be built — run saved` with `Wave · 0` under it.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-26T09:29:17Z
- **Completed:** 2026-09-26T09:38:20Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **The missing term.** `applyChrome` is built around ONE `runEndedRef` latch that every run-boundary branch consults. The endless WON branch was the single asymmetry: it gated on `modeRef` and `waveAdvanceInFlightRef` only, and the inner `if (!waveAdvanceInFlightRef.current)` guards concurrency, not run lifetime. It now opens with a block-bodied guard on `runEndedRef.current` whose only statement is a bare `return;`.
- **It returns, and the comment says why.** A fall-through would reach the campaign WON branch below, which calls `handleRunEnded` with a `win` outcome and `setResult('win')` on a cleared board — the SC-1 violation the branch was written to prevent. The `//` line comment at the guard carries the measured pre-fix numbers and the verifier's reachability argument, and is a line comment deliberately: `codeOnly()` strips `//` and leaves `/** */` standing, so a block comment naming the latch could have satisfied Task 3's count contract on prose alone.
- **One post-condition for all three ended-run states.** `failEndlessStart` now clears `waveAdvanceInFlightRef.current` alongside `runEndedRef.current = true`. A failed start previously inherited whatever guard value the previous run left behind (11-REVIEW.md IN-02).
- **Four behaviour cases the pre-fix code fails**, all driven through the real host's own chrome bridge, two of them asserting player-visible copy — one of those on the RENDERED `ResultOverlay` subtree rather than a prop.
- **A count contract that catches the next branch that forgets the latch**, falsified twice.
- **A disclosed tier change, not a deletion.** The WR-04 case whose observation Task 1's fix makes impossible was re-pointed and renamed; its old assertion became the ENDED post-condition assertion. Case counts rose in all three test files.

## Task Commits

1. **Task 1 (tracer, tdd) RED — the ended-run behaviour cases** — `f8e3f47` (test)
2. **Task 1 GREEN — the latch guard in the endless WON branch** — `e4b26f7` (feat)
3. **Task 2 (tdd) RED — cases (b) and (c)** — `8e34ffd` (test)
4. **Task 2 Step A — `failEndlessStart` post-condition** — `b102554` (feat)
5. **Task 3 — the run-boundary count contracts** — `e1e9980` (test)

**Plan metadata:** see the `docs(11-13)` commit that carries this file.

_TDD plan: RED precedes GREEN for both tdd tasks, each RED validated by `gsd_run check tdd-red-evidence`._

## TDD Gate Compliance

| Task | RED | GREEN | REFACTOR | RED verdict |
|------|-----|-------|----------|-------------|
| 1 (tracer, tdd) | `f8e3f47` | `e4b26f7` | — (no cleanup warranted) | `RED_EVIDENCE_OK` — target test failed, exit 1, 3 failed / 16 passed |
| 2 (tdd) | `8e34ffd` | `b102554` | — (one added ref clear) | `RED_EVIDENCE_OK` — target test failed, exit 1, 5 failed / 38 passed |
| 3 (auto, no tdd) | n/a | `e1e9980` | n/a | n/a — a test-only task; falsified by mutation instead |

Both RED records were hand-transcribed from vitest's nested TAP into flat node:test shape before validation, because `check tdd-red-evidence` cannot parse vitest output directly (known repo-level incompatibility: vitest emits no `# tests` summary and nests `not ok` lines, while `tapFailedTestNames` matches unindented only). The transcription is mechanical and the underlying counts are the ones vitest printed; records live in the session scratchpad, deliberately out of the repo.

No gate violation: `test(11-13)` precedes `feat(11-13)` in both cycles.

## Falsification Checks (all three run, as the plan requires)

| Check | Mutation | Result |
|---|---|---|
| Task 1 | The latch guard absent (the genuine pre-fix code, measured in the RED phase) | Both new cases FAIL. Readout at **W3** after one WON mirror with `advanceWave` called once and the board fingerprint changed; **W6** after four WON/DOCKED pairs. The re-pointed WR-04 assertion also fails, `compileCalls` 3 vs 2. |
| Task 2 | Task 1's latch guard removed from a working tree that already had cases (b) and (c) | 5 failed / 38 passed. Case **(b)** at **W3**; case **(c)** with `waveBuildFailedWave` rewritten to **2**, the slot rendering **`Wave 2 could not be built — run saved`** and **`Wave · 0`** present. Guard and test file restored; `git diff --quiet HEAD` confirmed clean afterwards. |
| Task 3 | (a) `runEndedRef.current` deleted from the campaign LOST branch; (b) a fourth `setActive(false)` added to `applyChrome` | (a) reds the per-branch assertion — *"the campaign LOST branch must consult runEndedRef"*. (b) reds the independent count pin — *"expected 4 to be 3"*, proving a fifth run-boundary branch cannot be added silently. Restored; tree clean. |

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — the `runEndedRef` guard as the first statement of `applyChrome`'s endless WON branch (+ its rationale comment); `waveAdvanceInFlightRef.current = false` in `failEndlessStart`.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — three new behaviour cases (LOST + one WON, the four-pair WALK, case (b)); the WR-04 case re-pointed and renamed; `waveBuildFailedWave` added to the `HostProps` read-back type. 17 → 20 cases.
- `tests/ui/PlayingHost.endless-record.test.tsx` — case (c), asserted on the rendered `result-slot` subtree. 22 → 23 cases.
- `tests/ui/PlayingHost.endless-host.test.ts` — the four-branch latch count contract and the `failEndlessStart` uniformity contract. 20 → 22 cases.

## Decisions Made

- **The guard returns; it does not fall through.** Stated in the code, pinned by Task 3's bare-`return;` assertion and by the pre-existing SC-1 precedence contract, which both go red on a fall-through.
- **Severity as the verifier settled it.** 11-REVIEW.md CR-01 rates this CRITICAL; the verifier downgraded it on proof that every path clearing `runEndedRef` routes through a wave-1 restart or a campaign exit, so no walked wave can reach `telemetry.endless.bestWave`. The code comment carries that argument so the next reader inherits the reasoning rather than the label.
- **`failEndlessStart`'s clear is labelled defence-in-depth in the source.** Task 1's latch makes the stale value unreadable; what the clear removes is the asymmetry, not a live defect. Calling it a fix would have been a small lie in a comment that will outlive this plan.
- **Task 3 pins an independent structural count.** A named enumeration of four branches cannot detect a fifth branch nobody added to it. The three `setActive(false)` run-end sites are orthogonal to the enumeration and move when a real run boundary is added.
- **Non-discriminating assertions are kept and labelled.** Cases (b) and (c) each assert a `recordRunEnd` post-condition that also held pre-fix (the latch always blocked the *record*; the defect was the walk and the copy). Rather than drop them or pretend they discriminate, each carries a comment saying it is secondary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2 Step B executed inside Task 1's RED commit**

- **Found during:** Task 1 (the plan's own `<context>` names this collision and assigns it to Task 2)
- **Issue:** Task 1's `<verify>` chain runs `npx vitest run tests/ui/PlayingHost.endless-retry.test.tsx`, and Task 1's fix makes the existing WR-04 case's `compileCalls` assertion unreachable by design. Leaving Step B for Task 2 would have left that file RED across the whole of Task 1's verification gate — i.e. Task 1 could not pass its own gate.
- **Fix:** The WR-04 re-point and rename landed in Task 1's RED commit `f8e3f47`, where it is *also* a correct RED case (pre-fix, `compileCalls` rises by one; post-fix it does not). Task 2's remaining Steps A, C and D executed as written, and Task 2's acceptance criteria were re-verified against the re-pointed case.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`
- **Verification:** Task 1's verify chain green (39/39 across both files); the re-pointed case fails under both falsification mutations.
- **Committed in:** `f8e3f47`

**2. [Rule 3 - Blocking] `waveBuildFailedWave` added to the retry file's `HostProps` type**

- **Found during:** Task 2 (case (b))
- **Issue:** The plan requires case (b) to assert `waveBuildFailedWave` stays 3, but `tests/ui/PlayingHost.endless-retry.test.tsx`'s `HostProps` read-back type did not declare the prop, so the assertion would not typecheck.
- **Fix:** Added `waveBuildFailedWave?: number | null;` to that file's `HostProps`, with a comment pointing at the rendered assertion in the sibling record file so nobody mistakes the prop read-back for render coverage.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`
- **Verification:** `npm run typecheck` exits 0; `npx eslint` on both test files clean.
- **Committed in:** `8e34ffd`

**3. [Deviation — process, no code impact] The RED phase IS the Task 1 falsification run**

- **Found during:** Task 1
- **Issue:** The plan's acceptance criterion asks the executor to *remove* the new guard after implementing it and confirm the new cases fail. Under TDD the cases were written first, so that exact measurement was taken on real pre-fix code rather than on a mutant.
- **Fix:** Reported as the falsification evidence (see the table above). Task 2's falsification was additionally run as a literal remove-and-restore mutation, and Task 3's twice, so two of the three are literal mutations and all three are recorded with measured values.
- **Files modified:** none
- **Verification:** `git diff --quiet HEAD -- app/_components/PlayingHost.tsx` confirmed clean after every restore.
- **Committed in:** n/a (process)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking), 1 process note.
**Impact on plan:** No scope change and no scope creep. Every task's `<action>`, `<acceptance_criteria>` and `<verify>` chain was executed; only the commit boundary of Step B moved, for a reason the plan itself anticipated.

## Verification Results

| Plan `<verification>` item | Result |
|---|---|
| `npm test` green end to end (vitest + four assert scripts) | **PASS** — 97 files / **631 tests** passed, exit 0; all four `assert-*.mjs` OK |
| `npm run typecheck` exits 0 | **PASS** |
| `npm run lint` exits 0 | **PASS** (2 pre-existing warnings, 0 errors — untouched, out of scope) |
| `git diff --name-only a20ad36..HEAD -- src/core src/levelgen` empty | **PASS** — `frozen-tree-diff=0` |
| `grep -c "bakeGlowSprites(brickW, brickH)"` is exactly 1 | **PASS** — `bake-calls=1` |
| `docs/ops/ENDLESS-MODE.md` untouched | **PASS** — `ops-doc-touched=0` |
| `.planning/REQUIREMENTS.md` untouched | **PASS** — not in this plan's diff |
| Case counts rose in all three test files; no case deleted | **PASS** — 17→20, 22→23, 20→22. The one name that changed is the WR-04 RENAME the plan mandates. |
| All three falsification checks run and recorded | **PASS** — see the table above |
| Task 2 gate `failstart-guard-clears` is 1 | **PASS** |
| Carried-forward items survive | **PASS** — the E3 backstop is still a backstop (D8 above, `human_judgment: true`), the five flagged `$COVERAGE` assumptions stay recorded in `11-12-PLAN.md` and are not repeated or resolved here, every prohibition stays `flagged`/`unverified`, and `behavior_unverified: 1` (SC-5) is untouched |

### Plan `<success_criteria>`

- After any of the three run-end boundaries, no further mirror regenerates a board, calls `advanceWave()` or moves the wave number — **met** (D1-D4).
- The decided failed-start copy survives a post-end WON mirror and `Wave · 0` is never rendered for a run that never began — **met** (D4, rendered).
- All three ended-run states leave the same post-condition — **met** (D7 at the source tier, which is the only tier that can still see it).
- The guard-release claim that lost its behavioural observation is re-stated at the source tier with the tier change disclosed in the test, and no case was deleted — **met** (D5; case counts rose).
- A fifth run-boundary branch added without the latch turns the new contract red — **met**, falsified by mutation.

## Scope Fences Honoured

`N-END-03` not ticked. `N-END-02`'s 11-12 state untouched. `docs/ops/ENDLESS-MODE.md` untouched (11-14 owns the ops record and must describe the code as this plan leaves it). `runCertWorstCase` untouched. The bake path and `ENDLESS_BRICK_DIMS` untouched. No write to `src/core` or `src/levelgen`. A-02, the `startEndlessRun` funnel placement and `toggleDevLevel`'s exit all untouched and still green. `11-01`…`11-12` not renumbered, rewritten or superseded.

`.planning/REQUIREMENTS.md` is deliberately NOT edited by this plan — `requirements-completed: [N-END-01]` above is the verbatim copy of the plan's `requirements` field, and the requirement box stays as 11-12 left it. Ticking it is 11-14's call, once the ops record describes the shipped code.

## Known Stubs

None. No stub, placeholder, skipped test or unrun `<verify>` was introduced. Every `<verify>` command in the plan was executed and its printed values are recorded above.

## Threat Flags

None. The four mitigations the plan's threat register assigns to this plan (T-11-24 Tampering, T-11-25 Spoofing, T-11-26 Elevation of privilege, T-11-27 Repudiation) are all implemented and pinned; T-11-28 stays `accept` and no new path from a walked wave to `telemetry.endless.bestWave` was opened. No new network endpoint, auth path, file access pattern or schema change at a trust boundary was introduced — the whole diff is one guard, one ref clear and test code.

## Issues Encountered

- `gsd_run check tdd-red-evidence` cannot classify vitest output in this repo (no `# tests` summary line; nested `not ok` lines that its unindented-only matcher misses). Resolved as the repo's standing workaround: the same run's TAP was mechanically transcribed into flat node:test shape with the real counts appended, and both records then validated `RED_EVIDENCE_OK`. The records were kept in the session scratchpad, out of the repo. Its input schema is camelCase (`exitCode`, `targetTest`) — snake_case keys silently classify as `invalid_record`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 3 of `11-VERIFICATION.md` is closed with behaviour evidence at both the counter and the copy, and with a count contract standing guard over the branch set.
- **11-14 is unblocked and now has a fixed target to describe.** It owns `docs/ops/ENDLESS-MODE.md`, `runCertWorstCase` and the `Cert WC` rows, and must describe `applyChrome` as this plan leaves it: four run-boundary branches, all consulting `runEndedRef`, with the endless WON branch returning on it. The `MUST NOT assert an invariant in docs/ops/ENDLESS-MODE.md that the shipped code does not hold` prohibition now has a different — and stronger — invariant available to it than it did an hour ago.
- **Still open, unchanged and correctly so:** SC-5 / the frame-timing half of `N-END-03` stays `behavior_unverified: 1`; the OPEN block in `docs/ops/ENDLESS-MODE.md` § Limits item 2 stays OPEN and `N-END-03`'s box stays unchecked. The E3 HUD-row overflow backstop is NOT discharged (jsdom computes no layout) and abstains to human verification at verify time. `ENDLESS_BRICK_DIMS` / the stretched glow halo remains owner-accepted Phase 14 debt.
- No blockers.

## Self-Check: PASSED

All five modified/created files present on disk. All six commits (`f8e3f47`, `e4b26f7`, `8e34ffd`, `b102554`, `e1e9980`, `c1051f1`) resolve in `git log --all`. `git rev-list --count 5bc8860..HEAD` = 6, matching the `actuals.commits` above.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*
