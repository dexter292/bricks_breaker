---
phase: 11-endless-mode
plan: 15
subsystem: ui
tags: [react, react-native, reanimated, vitest, testing-library, endless-mode, run-boundary]

# Dependency graph
requires:
  - phase: 11-endless-mode (11-13)
    provides: the runEndedRef latch inside the endless WON branch, and the three gap-3 behaviour drives this plan retrofits
  - phase: 11-endless-mode (11-12)
    provides: the mode-aware setResultBest publication rule and the mounted-ResultOverlay harness in PlayingHost.endless-record.test.tsx
provides:
  - "applyChrome's runEndedRef guard hoisted to the FIRST statement of the function, above the five mirror-sourced chrome writes"
  - "the endless WON branch's now-unreachable inner latch copy removed — one latch, one test, at the top"
  - "a driven RENDER case on the real ResultOverlay proving an ended endless run keeps Score · 2400 across a straggler WON at 9999"
  - "a driven CAMPAIGN case proving the same preamble defect flipped a lost run's result kind to win, and no longer does"
  - "both sides of the new condition driven in both modes: a live run still takes every mirror's chrome"
  - "an applyChrome source contract that covers the function PREAMBLE and pins the mirror-sourced write count at five"
affects: [phase-11-16, phase-14-endless-resume, phase-12-daily-challenge]

actuals:
  tokens: 68441
  tasks: 3
  commits: 5
plan_head_before: 6008ee59648f501ea6c46c4c783805bd1b80a6e4

tech-stack:
  added: []
  patterns:
    - "Guard-at-the-function-preamble: a run-lifetime latch owns the writes above the branches, not only the branches"
    - "Distinguishable straggler payloads: a post-boundary mirror must carry values the boundary mirror never had, or the drive is structurally blind to the freeze"
    - "Two independent structural instruments over one function: an ordering assertion (which statement is first) plus a count (how many writes exist)"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-record.test.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts

key-decisions:
  - "Took the HOIST, rejected the resultScore/resultLives boundary snapshot — one statement, and it closes the campaign panel by the same edit because the same five writes precede both campaign branches"
  - "REMOVED the endless WON branch's inner latch copy rather than leaving a second, mutation-proof dead test of the same ref"
  - "Re-pointed 11-13's three branch ordering assertions to the function preamble in the SAME contract case, with the tier change disclosed in the test's own comment"
  - "Drive 3's boundary mirror carries lives 2, and the failed-START straggler carries lives 1, so that no frozen-lives assertion is one that already held before the action it follows"
  - ".planning/REQUIREMENTS.md is deliberately untouched: N-END-01 and N-END-02 stay unticked, and the boxes move on round-4 verification evidence, not from inside a gap-closure plan"

patterns-established:
  - "Falsify every new instrument before the plan closes: each new case was observed RED under a stated mutation and GREEN after restoration"
  - "An ordering assertion over source text proves the write rule and never the render; the contract says so in its own words and names the behaviour case that does prove it"

requirements-completed: [N-END-01, N-END-02]

coverage:
  - id: D1
    description: "An ended endless run's mounted Results panel keeps its own numbers — Score · 2400 survives a straggler WON at {lives:3, score:9999}, with Best · 2400 and New Record unchanged beside it"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#an ENDED endless run keeps its own numbers on the mounted overlay — one straggler WON at 9999 repaints nothing (gap 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A run that has NOT ended still takes score, lives, combo, stall tier and sim phase from every mirror — the latch is not a blanket freeze, in either mode"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a LIVE endless run still takes every mirror chrome — the latch freezes only an ENDED run (gap 1)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a LIVE campaign run still takes every mirror chrome (gap 1, the side the latch must not touch)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The CAMPAIGN boundary is covered by the same hoist, proven by a driven case rather than inferred from the shared preamble: a straggler WON after a campaign LOST no longer flips the result kind or the score"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a CAMPAIGN run that LOST keeps its kind and its numbers — a straggler WON flips neither (gap 1)"
        status: pass
    human_judgment: false
  - id: D4
    description: "All three ended-run states freeze their chrome: a zero-lives LOST, a mid-run wave-build failure, and a failed START that writes no chrome of its own"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#an endless run that LOST stays ended — one further WON mirror builds no board (gap 3)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#and it stays ended through a WALK — four more WON/DOCKED pairs do not move the wave (gap 3)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a mid-run wave-build failure ENDS the run — a later WON that WOULD have succeeded moves nothing (gap 3, case b)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a FAILED START stays ended — the one ended state that writes no chrome of its own (gap 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The applyChrome source contract covers the function preamble — the first runEndedRef guard precedes the first mirror-sourced write, and the mirror-sourced write count is pinned at five"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every run-boundary branch in applyChrome consults the shared runEndedRef latch (gap 3)"
        status: pass
      - kind: other
        ref: "positional latch gate — prints applyChrome-start=934 latch-first=991 chrome-first=994, exit 0 (pre-fix: latch-first=976 chrome-first=936, exit 1)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The endless record block and its two action controls are unregressed by the hoist: New Record, Best · n and Best wave · n are unchanged across a straggler, and the A-01 retry-in-place Retry stays LIVE"
    requirement: "N-END-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a Retry that cannot build wave 1 keeps the overlay up with Retry live, and a second press recovers (A-01, retry-in-place)"
        status: pass
      - kind: other
        ref: "npm test — 97 files, 638 tests, all four assert-*.mjs scripts, exit 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "The E1 Results-panel overflow backstop — no wrap and no clipping at a 7-digit score and a 4-digit wave in the shipped 320px panel"
    requirement: "N-END-02"
    verification: []
    human_judgment: true
    rationale: "jsdom computes no layout, so `no wrap and no clipping` cannot be observed in any test this repo can run. Asserting 11-UI-SPEC's own ~28-monospace-character arithmetic would convert a backstop into a false `covered`. Routed to human verification, exactly as 11-09, 11-11 and 11-12 each left it."

# Metrics
duration: 11 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 15: The Ended-Run Chrome Latch Summary

**`applyChrome`'s `runEndedRef` guard hoisted from the first statement of one branch to the first statement of the function, so an ended run's Results panel — endless and campaign alike — stops repainting from straggler mirrors.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-26T11:01:03Z
- **Completed:** 2026-09-26T11:12:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **The hoist.** `if (runEndedRef.current) { return; }` is now the FIRST statement of the `applyChrome` callback body, above the five mirror-sourced writes (sim phase, lives, score, combo, stall tier) that used to open the function. The now-unreachable copy inside the endless WON branch is DELETED, not left standing as a second, mutation-proof test of the same ref.
- **The render is what proves it.** A new case in `tests/ui/PlayingHost.endless-record.test.tsx` mounts the real `ResultOverlay` inside `result-slot` and reads the `Score ·` line out of it. Measured pre-fix, the same drive rendered `Out of lives / Wave · 2 / Score · 9999 / Best · 2400 / Best wave · 2 / New Record` — a self-contradicting overlay. Post-fix it reads `Score · 2400`, and a query for `Score · 9999` inside the slot returns null.
- **The campaign half is DRIVEN, not inferred.** The same five writes precede the campaign WON and LOST branches, and `setResult(...)` sits OUTSIDE each branch's own `if (!runEndedRef.current)` gate — so pre-fix a straggler `WON` after a campaign `LOST` called `setResult('win')` on a lost run. Measured: `expected 'win' to be 'lose'`. The campaign exposure was strictly worse than the endless one; one statement closes both.
- **The three gap-3 drives can now see the chrome.** Every post-boundary mirror in them was re-sending the boundary's own `score: 2400`, which is precisely why they proved the wave half and were structurally blind to this one — the third occurrence of round 2's `previousBestRef` blind-spot shape. They now send `{lives: 3, score: 9999}` and assert the frozen host props.
- **Both sides, both modes.** A live endless run still takes `{lives: 2, score: 1234}`; a live campaign run still takes `{lives: 2, score: 777}`. A guard written as an unconditional early return makes both RED — that is the T-11-32 row, deliberately.
- **The contract covers the part of the function where the defect lived,** and says in its own words that an ordering assertion proves the write rule and never the render.

## Task Commits

1. **Task 1 (RED): failing render cases for the ended-run chrome latch** — `93988e6` (test)
2. **Task 1 (GREEN): hoist the latch above applyChrome's chrome writes** — `c2c98ac` (feat)
3. **Task 2: give the gap-3 drives eyes for the chrome, and drive the campaign half** — `247038e` (test)
4. **Task 3: extend the applyChrome contract to the function PREAMBLE** — `2784f28` (test)

**Plan metadata:** this commit (docs: complete plan) — a SUMMARY cannot quote its own hash

_No REFACTOR commit: the hoist is one statement and there was nothing to clean up after GREEN._

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — the hoisted guard as `applyChrome`'s first statement, with a `//`-only comment recording the measured pre-fix figures, the five reset sites, the telemetry scope and the rejected snapshot alternative; the inner branch copy removed with a note saying where it went.
- `tests/ui/PlayingHost.endless-record.test.tsx` — two new cases: the driven RENDER on the real overlay, and the live-endless side of the same condition.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — three gap-3 drives retrofitted with distinguishable straggler payloads plus host-prop freeze assertions; a new describe block with the campaign straggler case, the live campaign case and the failed-START case.
- `tests/ui/PlayingHost.endless-host.test.ts` — the `applyChrome` contract extended to the function preamble: re-pointed ordering assertions, an independent write count pinned at five, and the honesty comment naming the round-3 failure.

## The five run-reset sites — checked at source in Task 1

The hoist is only safe if every path that begins or resumes a run clears the latch BEFORE it writes its own chrome. All five were read in the shipped source this task, not copied from `11-VERIFICATION.md`. For each: **the latch clear precedes that site's own chrome writes.**

| # | Site | `runEndedRef.current = false` | its own `setLives/setScore/setCombo/setStallTier/setSimPhaseNum` | clear before write? |
|---|---|---|---|---|
| 1 | `startEndlessRun` | `:1341` | `:1347`–`:1351` | yes (6 lines) |
| 2 | `onRetry` — campaign branch | `:1405` | `:1410`–`:1414` | yes (5 lines) |
| 3 | `goNext` — next-level reset | `:1449` | `:1454`–`:1458` | yes (5 lines) |
| 4 | `toggleDevLevel` — endless exit | `:1555` | `:1560`–`:1564` | yes (5 lines) |
| 5 | `remountDevSession` — campaign branch | `:1603` | `:1608`–`:1612` | yes (5 lines) |

(Line numbers are pre-hoist, i.e. as read during Task 1; the hoist adds ~60 comment lines above them.)

Three further sites latch WITHOUT resetting — `failEndlessStart`, `handleMenuPress` and `recordInFlightEndlessRun` — which is why the hoist had to be safe against "latched, but no reset has run yet". The failed-START case in Task 2 drives exactly that state.

**On the plan-checker's INFO advisory 1 (the sixth frozen statement), verified at source rather than taken on trust.** The hoist also makes `waveAdvanceInFlightRef.current = false` at the "phase is neither WON nor LOST" arm unreachable after the boundary, and Task 2 Case A's WALK drive deliberately delivers four post-boundary DOCKED mirrors. It is benign: `failEndlessStart` (`:1223`), `startEndlessRun` (`:1342`) and `toggleDevLevel` (`:1551`) each clear that ref, and the two reset sites that clear `runEndedRef` without it — `onRetry`'s campaign branch (`:1405`) and `goNext` (`:1449`) — are campaign resets where the endless WON branch (`modeRef.current === 'endless'`) is unreachable. Recorded here so a round-5 reader does not rediscover it as a surprise.

## Falsification — every new instrument observed RED, with the output quoted

**Mutation 1 — delete the hoisted guard** (`app/_components/PlayingHost.tsx:991-993`), then run the three test files:

```
Test Files  3 failed (3)
     Tests  7 failed | 62 passed (69)

AssertionError: the endless WON branch must open with a guard ON the latch, not merely mention it: expected -1 to be greater than or equal to 0
TestingLibraryElementError: Unable to find an element with the text: Score · 2400
AssertionError: measured pre-fix: rewritten to 2, which flips waveBuildFailureKind from start to mid: expected 2 to be 1
AssertionError: the run has ENDED: a repeat WON must not re-enter the branch and attempt another build: expected 3 to be 2
AssertionError: measured pre-fix: the readout had walked to W3 on a run that was already over: expected <div …> to be null
AssertionError: measured pre-fix: four pairs walked the readout to W6 with the lose overlay still up: expected <div …> to be null
AssertionError: measured pre-fix: the readout moved to W3 while the overlay still read the wave-3 failure copy: expected <div …> to be null
```

Seven cases — every case 11-13's mutation M2 killed, PLUS the new render case. The mutation evidence is strictly STRONGER after the move, exactly as `must_haves.assumptions` required.

On the same mutation, against `PlayingHost.endless-retry.test.tsx` alone (TAP, `--reporter=tap-flat`), six cases RED and the LIVE case GREEN:

```
not ok 12 - … a wave that cannot be built ENDS the run, records it, and the ended run STAYS ended (WR-04 / gap 3)
not ok 13 - … an endless run that LOST stays ended — one further WON mirror builds no board (gap 3)
not ok 14 - … and it stays ended through a WALK — four more WON/DOCKED pairs do not move the wave (gap 3)
not ok 15 - … a mid-run wave-build failure ENDS the run — a later WON that WOULD have succeeded moves nothing (gap 3, case b)
not ok 17 - … a CAMPAIGN run that LOST keeps its kind and its numbers — a straggler WON flips neither (gap 1)
ok 18    - … a LIVE campaign run still takes every mirror chrome (gap 1, the side the latch must not touch)
not ok 19 - … a FAILED START stays ended — the one ended state that writes no chrome of its own (gap 1)
```

with the two named signals read directly:

```
AssertionError: measured pre-fix: the kind flipped from lose to WIN …: expected 'win' to be 'lose'
AssertionError: measured pre-fix: 9999 — a run that never started displaying a four-digit score: expected 9999 to be +0
```

**A note on assertion ordering, disclosed rather than glossed.** In the three retrofitted drives the pre-existing wave assertion fires BEFORE the new host-prop assertion, so the run aborts there and the `score: 9999` reading is not printed by those cases. To measure the host-prop channel directly a throwaway scratch probe was inserted at the top of drive 1's post-straggler block under the same mutation, observed, and removed:

```
AssertionError: SCRATCH score: expected 9999 to be 2400
```

**Mutation 2 — move the hoisted guard back below the five writes:**

```
AssertionError: THE gap-1 property: the latch guard must PRECEDE the first mirror-sourced write …: expected 556 to be less than 392
```

**Mutation 3 — add a sixth mirror-sourced write (a duplicate `setCombo(mirror.combo)`):**

```
AssertionError: FIVE mirror-sourced writes in applyChrome …: expected 6 to be 5
```

All three mutations were restored and the tree confirmed byte-identical to the committed source (`git diff --stat -- app/_components/PlayingHost.tsx` empty) before proceeding.

## Verification results

| Gate | Result |
|---|---|
| `npx vitest run` over the four endless UI files | **4 passed, 78 tests** (baseline before this plan: 73) |
| `npm test` (`vitest run` + all four `assert-*.mjs`) | **exit 0** — 97 files, 638 tests |
| `npm run typecheck` | **exit 0** |
| `npm run lint` | **exit 0** — 0 errors, 2 pre-existing `ReadonlyArray<T>` warnings (round-3 advisory 2, out of scope) |
| positional latch gate | `applyChrome-start=934 latch-first=991 chrome-first=994`, **exit 0** (pre-fix: `latch-first=976 chrome-first=936`, exit 1) |
| frozen-tree gate | `freeze-git-status=0 frozen-tree-diff=0 doc-git-status=0 round4-forbidden-paths-touched=0 bake-calls=1 n-end-unticked=3`, **exit 0** |

## Decisions Made

- **Hoist, not snapshot.** The verifier offered a `resultScore` / `resultLives` pair snapshotted at the boundary and handed to `ResultOverlay` in place of the live chrome. Not taken: the hoist is one statement and closes the campaign panel by the same edit, while the snapshot adds two pieces of state every reset path must then maintain and leaves the HUD behind the overlay still repainting from a finished run. The rejected alternative is recorded in the source comment so the choice is auditable.
- **The inner guard is REMOVED, not kept as a second copy.** With the latch at the top, `runEndedRef.current` is always false at the old site, so an inner copy could be killed by no mutation and would contradict the "ONE latch, EVERY boundary" design it was written to serve.
- **`.planning/REQUIREMENTS.md` is untouched.** `requirements-completed` above records what this plan TARGETS; the checkboxes for N-END-01 and N-END-02 stay unticked, as commit `0c1270e` deliberately left them. They move on round-4 verification evidence, not from inside a gap-closure plan. Task 3's gate asserts `n-end-unticked=3` and it passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two planned frozen-lives assertions would have held before the action they follow**

- **Found during:** Task 2 (Cases A and D)
- **Issue:** The plan specifies `{lives: 3, score: 9999}` for every straggler. In the mid-run wave-build-failure drive the boundary is a `WON` whose helper default is ALSO lives 3, and in the failed-START case `failEndlessStart` writes no chrome so the host sits at its mount default of lives 3. In both, a straggler at lives 3 makes the frozen-lives assertion one that is already true before the straggler arrives — the exact shape prohibition 6 of this plan forbids ("MUST NOT write an assertion that already holds before the action it follows").
- **Fix:** Drive 3's boundary `WON` carries `{lives: 2, score: 2400}` and asserts the frozen lives at 2; the failed-START straggler carries `{lives: 1, score: 9999}` and asserts the frozen lives at the value the overlay opened with (3). The score half is unchanged at 9999 in both. The reason is stated in each case's own comment.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`
- **Verification:** Both assertions are discriminating under Mutation 1 — the failed-START case fails directly at `expected 9999 to be +0`, and drive 3 fails on its pre-existing wave assertion with the host-prop pair reachable behind it.
- **Committed in:** `247038e`

**2. [Rule 3 - Blocking] Plan-anticipated transitional RED between Task 1 and Task 3**

- **Found during:** Task 1 (GREEN)
- **Issue:** Task 1's `<verify>` runs `tests/ui/PlayingHost.endless-host.test.ts`, which goes RED the moment the inner guard is removed — `AssertionError: the endless WON branch must open with a guard ON the latch …: expected -1 to be greater than or equal to 0`. The plan's own `<context>` collision 2 predicts this exactly and assigns the repair to Task 3, so the plan contains both "Task 1 must be green on this file" and "Task 3 is what makes it green".
- **Fix:** Resolved in favour of the plan's own acceptance criteria, which scope Task 1's existing-cases obligation to the three BEHAVIOUR files (`endless-record`, `endless-retry`, `endless-run`) and not to `endless-host`. Task 1 was committed with the transitional RED named in its commit message; Task 3 re-pointed the assertions; Task 1's full four-file verify was then re-run and is green at 78 passed. No assertion was deleted or weakened to achieve it.
- **Files modified:** none beyond the planned ones
- **Verification:** `npx vitest run` over all four files — 4 passed, 78 tests.
- **Committed in:** `c2c98ac` (disclosure) and `2784f28` (repair)

**3. [Rule 1 - Bug] The `fails_when` on the lint gate is literally unsatisfiable**

- **Found during:** Task 1 (verification)
- **Issue:** The plan's `fails_when` reads "eslint prints any line containing `error`". `eslint .` always prints `✖ N problems (0 errors, M warnings)` and `0 errors and M warnings potentially fixable`, so a literal grep for `error` matches twice even on a clean run.
- **Fix:** Read as intended — error-LEVEL findings. `npm run lint` exits 0 with **0 errors** and the 2 pre-existing `ReadonlyArray<T>` warnings the plan itself records as out-of-scope advisory 2. No lint configuration was changed.
- **Files modified:** none
- **Verification:** `npm run lint` exit 0; `✖ 2 problems (0 errors, 2 warnings)`.
- **Committed in:** n/a (no code change)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking). **Impact on plan:** All three are faithfulness repairs — two make planned assertions actually discriminate, one resolves an internal ordering contradiction in the plan's own gates without weakening anything. No scope creep; no scope fence crossed.

## Issues Encountered

- **`gsd_run check tdd-red-evidence` cannot read vitest's default output.** Its TAP parser wants node-`--test` summary lines (`# tests`/`# pass`/`# fail`), and vitest's `tap` reporter reports only file-level results. Resolved by running the RED phase with `--reporter=tap-flat` (genuine per-test `not ok N - …` lines) and appending the three summary counts computed mechanically from that same output. Both RED records verify `RED_EVIDENCE_OK`:
  - Task 1 target: `… > an ENDED endless run keeps its own numbers on the mounted overlay — one straggler WON at 9999 repaints nothing (gap 1)`, exit 1, 25 tests / 24 pass / 1 fail.
  - Task 2 target (the RED phase is the mutation run, since Task 2 is test-only and Task 1's fix had already landed): `… > a CAMPAIGN run that LOST keeps its kind and its numbers — a straggler WON flips neither (gap 1)`, exit 1, 19 tests / 13 pass / 6 fail.

## Scope fences — all held

- `docs/ops/ENDLESS-MODE.md` — untouched (11-16 owns it). `round4-forbidden-paths-touched=0`.
- `.planning/REQUIREMENTS.md` — untouched. `n-end-unticked=3`.
- `runCertWorstCase` / `certPendingRef` — untouched.
- `src/core`, `src/levelgen` — untouched. `frozen-tree-diff=0`.
- Bake path / `ENDLESS_BRICK_DIMS` / glow atlas — untouched. `bake-calls=1`.
- 11-12's `setResultBest` rule, its two preload guards and the unconditional `previousBestRef` writes — untouched; the `setResultBest` contract still passes.
- `startEndlessRun`'s funnel placement and `toggleDevLevel`'s exit (A-02) — untouched.
- The three round-3 advisories (WR-03 cross-level best, the two `ReadonlyArray<T>` lint warnings, `codeOnly()` and block comments) — NOT fixed, as instructed.
- Plans 11-01 … 11-14 and every existing SUMMARY — untouched.

## Known Stubs

None. No placeholder value, empty-collection default or TODO was introduced by this plan.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The plan's `T-11-29` through `T-11-33` and `T-11-35` `mitigate` rows are each discharged by a driven case listed in the coverage block above; `T-11-34` stays `accept` and its standing check — `recordRunEnd` at exactly one call across every straggler — is asserted in all five ended-run drives.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Round-3 gap 1 is closed at every producer the plan enumerated: `applyChrome` has ONE `runEndedRef` guard, it is the function's first statement, and the five mirror-sourced writes follow it.
- **11-16 can now describe the code as this plan leaves it.** The relevant facts for `docs/ops/ENDLESS-MODE.md`: the latch is at the top of `applyChrome`, not inside the endless WON branch; it covers the campaign boundary as well as the endless one; and a run that has not ended still takes every mirror's chrome.
- **Still open, unchanged by this plan:** the SC-5 device frame-budget half of N-END-03 (`behavior_unverified: 1`; `docs/ops/ENDLESS-MODE.md` § Limits item 2 stays OPEN and N-END-03's box stays unchecked), and the E1 Results-panel overflow backstop (D7 above), which jsdom cannot observe and which stays routed to human verification.
- **N-END-01 and N-END-02 remain unticked in `.planning/REQUIREMENTS.md` by design.** Round-4 verification is what moves them.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

All four modified files exist on disk. All five commits (`93988e6`, `c2c98ac`, `247038e`, `2784f28`, plus this SUMMARY commit) are present in `git log`. `commits: 5` in the frontmatter is `git rev-list --count 6008ee5..HEAD` measured after this SUMMARY's own commit — the four task commits plus this docs commit.
