---
phase: 11-endless-mode
plan: 17
subsystem: ui
tags: [react-native, vitest, testing-library, source-contract, mutation-testing, tdd]

# Dependency graph
requires:
  - phase: 11-15
    provides: the hoisted `runEndedRef` latch at the top of `applyChrome`, whose safety argument (must_have truth 6) this plan closes
  - phase: 11-16
    provides: the `certPendingRef` run-mode term and the two live-run campaign cert cases this plan must leave green and unedited
  - phase: 11-12
    provides: the `getBestForLevel` publication guard whose run-ENDED campaign twin (WR-02) this plan closes
provides:
  - "`runCertWorstCase`'s level half is guarded on the run-ended latch — a `Cert WC` press from a mounted campaign Results panel moves no level, calls no `retry()` and produces no `setActive(true)`"
  - "WR-02 closed: a mounted campaign panel's `Best ·` no longer repaints with another level's best"
  - "the harness `getBestForLevel` mock is level-aware (round-3 advisory 1), so a per-level best moving is observable in `PlayingHost.endless-retry.test.tsx` for the first time"
  - "CONTRACT A — a DERIVED re-arm enumeration: two re-runnable greps, eight named members, each classified and each bound to its own site by an assertion"
  - "CONTRACT B — the A2-vacuous four-branch latch loop, repaired to assert the guard SHAPE with an independent count pinned at three"
affects: [phase-14 dev-row removal, phase-14 endless record surface, 11-18]

# Actuals (#2632)
actuals:
  tokens: 7797
  tasks: 3
  commits: 4
  plan_head_before: 884dfdda04afab7cad932752f4165dc531004440

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive an enumeration, never assert it: a safety property over `every path that X` must ship with the re-runnable command that produces the set, and a count that reds when the set moves"
    - "Bind each member's classification to its OWN named site — an aggregate count proves a thing exists somewhere and survives RELOCATION, which is the mutation that isolates binding from counting"
    - "Quote a reachability condition in FULL and name the load-bearing term — a fragment can reach the right answer by a route the source does not support"
    - "Guard rather than reset when the reset shape would duplicate an already-duplicated block"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts

key-decisions:
  - "GUARD, not reset: the level half is gated on the run-ended latch. A reset would have to write the five chrome values as well as clear the latch — a sixth copy of the five near-identical reset blocks WR-06 names as this phase's structural cause — and a clear without those writes leaves a dead run's score and lives on the HUD of a fresh board"
  - "The LEVEL half only. The tier half stays ungated: a real, funnel-covered run boundary, per the owner decision of 2026-09-26 that rejected disabling `Cert WC` while endless"
  - "A2 resolved by REPAIRING the instrument, not by deleting the three record-once guards — they are correct defence-in-depth and post-hoist unreachable in the true direction, so no behavioural test could kill them"
  - "The harness mock's non-`level-03` arm is `0`, not the verifier's suggested `1111` — measured blast radius zero"
  - "`.planning/REQUIREMENTS.md` deliberately untouched; 11-18 owns the checkbox edit gated on this plan's evidence"

patterns-established:
  - "Pattern: a structural gate must strip BOTH `//` and `/** */` before counting — the unfiltered re-arm count on this tree is 6 and the filtered count is 5, because one comment line names the literal in prose"
  - "Pattern: the RELOCATION mutation is the only one that isolates site binding from aggregate counting — if BOTH go red the relocation changed the count and the mutation was performed wrong"

requirements-completed: [N-END-01, N-END-02]
# NOTE: the REQUIREMENTS.md checkbox edit is DEFERRED to 11-18 by this plan's own
# prohibition, and Task 3's gate pins `requirements-touched-this-plan` at 0. This field
# records the requirements this plan's evidence bears on, not a checkbox that was moved.

coverage:
  - id: D1
    description: "A `Cert WC` press from a mounted campaign Results panel with the tier already Mid moves no level, calls no `retry()` and produces no `setActive(true)` — the orphaned run that the hoisted latch made unstoppable is closed"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#an ENDED campaign run is not re-armed: a press from the mounted lose panel with the tier already Mid moves no level and starts no loop"
        status: pass
      - kind: other
        ref: "structural gate: level-half-guard=1, tier-half-ungated=1, reset-blocks=5"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-02: a mounted campaign Results panel keeps reading the level it was played on — the `getBestForLevel` publication guard's run-ENDED campaign twin is closed by the same term"
    requirement: "N-END-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#and the same press leaves the mounted campaign panel reading the level it was played on (WR-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The set that `every path that begins or resumes a run` quantifies over is DERIVED by two re-runnable greps, has eight named members, and each member's classification is bound to its own site by an assertion"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every path that re-arms the frame loop is enumerated — five direct sites and three levelId writers (round-5)"
        status: pass
      - kind: other
        ref: "falsification: 4 mutations (arm deleted, level writer deleted, conjunct reverted, clear RELOCATED) each produced the named RED"
        status: pass
    human_judgment: false
  - id: D4
    description: "The A2-vacuous four-branch latch contract is repaired: the three guarded branches assert the guard SHAPE, with an independent count pinned at three; the endless WON branch is stated honestly as owned by the function preamble"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every run-boundary branch in applyChrome consults the shared runEndedRef latch (gap 3)"
        status: pass
      - kind: other
        ref: "falsification: one `if (!runEndedRef.current)` -> `if (true)` — the mutation that left the suite green at 97/645 — now reds the named branch assertion and moves the count to 2"
        status: pass
    human_judgment: false
  - id: D5
    description: "The harness `getBestForLevel` mock is repaired to honour its `id` argument (round-3 advisory 1), with a positive control proving the repair is non-vacuous"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#and the same press leaves the mounted campaign panel reading the level it was played on (WR-02) — positive control: four Lv presses move `best` to 7777"
        status: pass
      - kind: other
        ref: "blast-radius measurement: 30 pass / 0 fail before EDIT 1, 30 pass / 0 fail after"
        status: pass
    human_judgment: false
  - id: D6
    description: "UI-state backstop rows (11-UI-SPEC E1/E3 overflow): a 7-digit score with a 4-digit wave in the 320px Results panel, and a 7-digit score with a 3-digit combo in the 48px HUD row, show no wrap and no clipping"
    verification: []
    human_judgment: true
    rationale: "Recorded as `verification: backstop` in this plan's own must_haves — flat scalars, never asserted by any instrument in this repo. No automated layout measurement exists; a human must look at the rendered panel."

# Metrics
duration: 12 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 17: The Re-Arm Enumeration Summary

**One conjunct closes an unstoppable frame loop behind a mounted Results panel, and the enumeration that missed it becomes two re-runnable greps with eight classified members, each bound to its own site.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-26T13:02:16Z
- **Completed:** 2026-09-26T13:14:04Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **The gap is closed at its cause.** `runCertWorstCase`'s level half was the one caller of the compiled-push gate effect that neither cleared the run-ended latch nor was guarded by it; the seam armed the frame loop on its behalf for a run that was already over, and the orphan's own `LOST` was then swallowed by the same latch so `setActive(false)` was never reached. One leading conjunct — `!runEndedRef.current &&` — makes it three of three without adding a term to the seam.
- **WR-02 closed by the same term**, and the mock that hid it for three rounds is repaired at its root.
- **The instrument that would have caught this now exists.** CONTRACT A derives the re-arm set instead of asserting it, and binds each member to its own named site — so RELOCATING a latch clear reds it while the aggregate count stays at 5.
- **A2 repaired.** The mutation the verifier ran to prove the four-branch loop vacuous — one `if (!runEndedRef.current)` becoming `if (true)`, which left the whole workspace suite green at 97 files / 645 tests — now turns a named assertion RED.

## Task Commits

1. **Task 1 (RED): drive the ENDED campaign run that `Cert WC` re-arms** — `8f75330` (test)
2. **Task 1 (GREEN): gate `Cert WC`'s level half on the run-ended latch** — `62e94cb` (feat)
3. **Task 2: close WR-02 and repair the mock that hid it** — `70d736d` (test)
4. **Task 3: derive the re-arm enumeration, and de-vacuum the latch contract (A2)** — `2b4d080` (test)

No REFACTOR commit: the source change is a single conjunct in an existing condition; there was nothing to clean up, and the TDD reference commits REFACTOR only on change.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — one leading `!runEndedRef.current &&` conjunct on the level half's existing condition, plus `//`-only comments recording why guard rather than reset, why this half only, what it costs, and the measured pre-fix figures.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — two new driven cases, `HostProps.best?: number`, and a level-aware `getBestForLevel` mock. One deletion in the whole file: the blind mock line.
- `tests/ui/PlayingHost.endless-host.test.ts` — CONTRACT A (new `it`, five assertions, a locally-scoped block-comment stripper, a read-only `src/runtime/GameScreen.tsx` load) and CONTRACT B (the vacuous per-branch loop replaced by a guard-SHAPE assertion plus an independent count of three).

## TDD Gate Compliance

| Gate | Commit | Evidence |
|------|--------|----------|
| RED (Task 1) | `8f75330` | `gsd check tdd-red-evidence` → `RED_EVIDENCE_OK` / `target_test_failed` |
| GREEN (Task 1) | `62e94cb` | 30/30 green in the file; structural gate and `tsc` clean |
| REFACTOR | — | not required; no change to commit |
| RED (Task 2) | — | `RED_EVIDENCE_OK` / `target_test_failed`, measured with Task 1's conjunct temporarily reverted, restored immediately (see transcript below) |
| GREEN (Task 2) | `70d736d` | 31/31 green in the file |

**Harness note, carried from this phase's earlier rounds and re-confirmed here:** `--reporter=tap-flat` emits per-test `ok` / `not ok` lines but NO `# tests` / `# pass` / `# fail` summary, so the checker's first verdict was `INVALID_RED (zero_tests_discovered)` on a run whose target test it had already parsed into `failing_tests`. The summary lines were computed MECHANICALLY from the `ok` / `not ok` line counts and appended — never typed by hand — after which the verdict was `RED_EVIDENCE_OK`. The other two known traps (camelCase keys; the full TAP name including the `tests/…` file prefix) were honoured from the start and did not recur.

## Measured Evidence

### Task 1 STEP A — the RED transcript, verbatim

```
not ok 28 - tests/ui/PlayingHost.endless-retry.test.tsx > PlayingHost — Cert WC carries a mode
  term (gap 1 / gap 2) > an ENDED campaign run is not re-armed: a press from the mounted lose
  panel with the tier already Mid moves no level and starts no loop
  ---
  error:
      name: "AssertionError"
      message: "measured pre-fix: `Switch level, current level-03` — the level half moved the
                level of a run that is over: expected 'Switch level, current level-03' to be
                'Switch level, current level-01' // Object.is equality"
  at: "tests/ui/PlayingHost.endless-retry.test.tsx:1795:7"
  actual: "Switch level, current level-03"
  expected: "Switch level, current level-01"
  ...
```

The case halts at its first assertion, so the remaining pre-fix signals were read with a
throwaway `console.log` probe inserted after the press and removed before the RED commit
(the file was restored from a byte-for-byte backup; the probe appears in no commit):

```
STEPA-PROBE {"lv":"Switch level, current level-03",
             "setActive":[[false],[false],[false],[true]],
             "retry":1,"inject":1,"result":"lose","score":2400,"lives":0,"recordRunEnd":0}
```

This reproduces the verifier's measurement exactly, including `recordRunEnd: 0` — which is
the half of `11-REVIEW` WR-01 the verifier REJECTED and this plan did not inherit. The harm
is the unstoppable loop, not a lost record.

### The measured `injectCertWorstCase` count — the plan's one derived behaviour change

The plan derived that with the level half guarded and the tier already Mid, `defer` stays
false and the press reaches the injector — count 1 — and required this to be MEASURED rather
than assumed, with the measurement as the authority.

> **CORRECTION 2026-09-26 (round 6).** As originally written, this paragraph went one clause
> further than the count supports and named WHERE the load went — it said the press applied it
> into the run that had just ended. That clause is struck. The count of `1` is correct and
> stands; what was wrong was the destination, and the instrument could not have caught it
> (`injectCertWorstCase` is a `vi.fn()` at `tests/ui/PlayingHost.endless-retry.test.tsx:325`, so
> the count can only show that the host reached the injector). What the code does:
> `injectCertWorstCase` bumps `certRequest` (`src/runtime/useGameLoop.ts:787`); the only
> consumer of that counter sits inside `onFrame` (`:440`); the frame loop is stopped on this
> branch; and nothing clears the counter at any run boundary. So the load is **QUEUED**, and it
> applies on the **first frame of the next run that arms the loop** — below the retry-reset
> block, onto the freshly reset world. Pinned link by link in
> `tests/runtime.cert-request.test.ts`. That file reads source and cannot produce a frame, so
> this is a source contract and **not** a frame-level measurement. The superseded clause is
> described rather than quoted because plan 11-20 pins it at 0 occurrences in this file; the
> verbatim original is recoverable from git at `6bb18bf`.

**Measured: 1. It matched the derivation.** No assertion was edited and no reconciliation was
needed. (Pre-fix the count was also 1, but by the other route: `defer` was true, so it was the
50 ms deferred injection. The count is the same; the route changed. The route is pinned at
source in `PlayingHost.endless-host.test.ts`, not here.) **11-18 Task 1 should read `1` from
this section.**

### Task 2 EDIT 1 — the mock repair's blast radius

| | Pass | Fail |
|---|---|---|
| `tests/ui/PlayingHost.endless-retry.test.tsx` before EDIT 1 | 30 | 0 |
| after EDIT 1 | 30 | 0 |

**They are equal.** Zero cases moved, which is the whole reason the non-`level-03` arm was
kept at `0` rather than the verifier's suggested `1111`. No existing assertion was edited;
the file's only deletion since the round base is the blind mock line itself.

### Task 2 — the RED transcript

With Task 1's conjunct temporarily reverted:

```
AssertionError: measured pre-fix: 7777 — level-03's best repainted over a level-01 run's
mounted panel: expected 7777 to be 2400 // Object.is equality
```

`best` reads **7777** with the guard reverted and **2400** with it restored. Verdict
`RED_EVIDENCE_OK` / `target_test_failed`; the guard was restored from a byte-for-byte backup
and `git diff` on `app/_components/PlayingHost.tsx` was confirmed empty before proceeding.

### `PLAYABLE_LEVEL_ORDER` — confirmed at source, not trusted from the plan

`src/services/storage/catalog.ts:14-19` holds **five** entries — `level-01`, `level-04`,
`level-05`, `level-06`, `level-03` — with `level-03` **LAST**. Four `Lv` presses reach it from
the default, which is the press count the positive control uses. The plan's sentence was
correct; it was re-derived anyway because the plan said to.

### Task 3 — six falsification mutations, one at a time, each reverted

| # | Mutation | Observed RED | Reverted |
|---|----------|--------------|----------|
| 1 | Deleted `setActive(true);` at the end of the compiled-push gate effect | `FIVE statements arm the frame loop: … A SIXTH means a new path re-arms the loop …: expected 4 to be 5` | ✓ `git diff` empty |
| 2 | Deleted one of the three `setLevelId(` call sites (`goNext`) | `THREE levelId writers: goNext, toggleDevLevel and runCertWorstCase. … A FOURTH carries the same obligation as a sixth arm: expected 2 to be 3` | ✓ `git diff` empty |
| 3 | One `if (!runEndedRef.current)` → `if (true)` (campaign WON) — **the verifier's own A2 mutation** | `the campaign WON branch must carry the record-once guard in its own SHAPE — a negated test on the latch whose body sets the latch and then calls handleRunEnded(. A bare mention of the identifier is not enough…: expected '\n        if (true) {\n          runE…' to match /if \(!runEndedRef\.current\) \{\s*run…/`. Under the same mutation the independent guard-shape count computes **2**, measured directly (the loop assertion fires first, so the count never runs inside the case) | ✓ `git diff` empty |
| 4 | Reverted Task 1's conjunct | CONTRACT A assertion 3: `runCertWorstCase is the third levelId writer and it is GUARDED rather than resetting: the level-forcing call must sit inside a block whose condition OPENS on the negated run-ended latch …: expected '\n    \n    if (\n      !CERT_HARNESS…' to match /if\s*\(\s*!runEndedRef\.current\s*&&[…/` — **AND** Task 1's behaviour case: `expected 'Switch level, current level-03' to be 'Switch level, current level-01'` | ✓ `git diff` empty |
| 5 | **RELOCATED** `onRetry`'s campaign `runEndedRef.current = false;` into `startEndlessRun`'s body at the same indentation — not deleted | **The aggregate gate stayed GREEN at `reset-blocks=5`**, exactly as predicted, while CONTRACT A assertion 4 went RED naming the site: `onRetry must clear the run-ended latch inside its OWN body. The aggregate reset-block count of five would stay at five if this clear were relocated into a neighbouring callback — that is precisely the mutation this assertion exists to catch: expected -1 to be greater than or equal to 0` | ✓ `git diff` empty |
| 6 | Deleted `&& result == null` from `showPauseOverlay` in `src/runtime/GameScreen.tsx` | CONTRACT A assertion 5: `showPauseOverlay must still test \`result == null\`. THIS is the term that excludes an ENDED run … Dropping it silently invalidates member 7 of the enumeration above: expected '\n    !hasLevelError && uiPhase === \…' to match /result == null/` | ✓ `git diff -- src/runtime` empty |

**Mutation 5 is the load-bearing pair.** The plan states that if BOTH the aggregate and the
site binding go red, the relocation changed the count and the mutation was performed wrong;
and that if assertion 4 stays green, the site binding is not bound. Neither happened: the
aggregate read 5 and stayed green, and assertion 4 alone went red naming `onRetry`. That
pairing is the evidence the site binding adds something the aggregate cannot.

`git status` was confirmed clean of every scratch edit, including in
`src/runtime/GameScreen.tsx`, before Task 3 was committed.

### Structural counts, measured after all three tasks

| Count | Value | Required |
|---|---|---|
| `setActive(true);` (comment lines stripped) | 5 | 5 |
| `setActive(true);` **unfiltered** | 6 | — (the reason the gate strips first) |
| `setLevelId(` | 3 | 3 |
| `!runEndedRef.current &&` (the new conjunct) | 1 | 1 |
| `setTierOverride('mid')` (tier half ungated) | 1 | 1 |
| `runEndedRef.current = false;` at four-space indent | 5 | 5 — **no sixth reset block** |
| `if (!runEndedRef.current) {` | 4 | 4 (three in `applyChrome` + the abandon funnel) |
| `uiPhase === 'paused' && result == null` in `GameScreen.tsx` | 1 | 1 |
| `showPauseOverlay ?` render gate | 1 | 1 |
| `bakeGlowSprites(brickW, brickH)` (D-14) | 1 | 1 |
| `git diff a20ad36..HEAD -- src/core src/levelgen` | 0 files | 0 — frozen tree holds |
| `git diff 86c031b..HEAD -- src/runtime` | 0 files | 0 — read-only, as designed |
| `git diff 86c031b..HEAD -- .planning/REQUIREMENTS.md` | 0 lines | 0 — 11-18 owns that edit |

### Plan-level verification

1. `npx vitest run --reporter=tap-flat` over all three sibling files — **82 tests, 0 `not ok`**, with `ok` lines naming all three new cases.
2. `npm test` — **exit 0, 97 files / 648 tests passed** (645 before this plan; +3 new cases). All four assert scripts OK; no line begins `FAIL`.
3. `npm run typecheck` — exit 0, zero `error TS`. `npm run lint` — exit 0, **0 errors, 2 warnings** (the two known `ReadonlyArray<T>` warnings at `PlayingHost.endless-host.test.ts:367` and `:372`, carried unchanged).
4. Structural counts — table above, all as required.
5. Frozen tree — empty.
6. `REQUIREMENTS.md` — untouched.
7. Falsification transcripts — six above, plus the two behaviour-case REDs.
8. `src/runtime/GameScreen.tsx` — unchanged; read by CONTRACT A, written by nothing.

## Decisions Made

- **GUARD rather than RESET.** The reset shape would have to clear the latch *and* write the five chrome values on the same synchronous path — a sixth copy of the five near-identical reset blocks the verifier's WR-06 advisory names as the structural cause of this phase's whole "fix one half, leave the neighbour" pattern. A clear without those writes is worse: it leaves a dead run's score and lives standing on the HUD of a fresh board, which is the other half of the very truth this plan closes.
- **The LEVEL half only.** The tier half stays ungated — a real, funnel-covered run boundary that routes through `remountDevSession`. Gating it would be the "disable `Cert WC` while endless" option the owner rejected on 2026-09-26 as inconsistent with how A-02 resolved `Lv` next door.
- **No term added to the seam.** The compiled-push gate effect keeps no run-ended term of its own: a term there would also gate `goNext` and `toggleDevLevel`, which already reset correctly. It stays the member with no assertion, and CONTRACT A's comment says so explicitly.
- **A2: repair the instrument, do not delete the guards.** The three record-once guards are correct defence-in-depth and post-hoist unreachable in the true direction, so no behavioural test *could* kill them. Deleting live source during gap closure is the scope creep this phase's last two rounds correctly refused. The repaired contract states in its own comment what it does NOT prove, and names the instruments that do: 11-15's preamble ordering assertion, bare-return regex and five-mirror-write count, and the driven cases in the two sibling files.
- **The endless WON branch stated honestly.** It keeps its place in the four-name enumeration and the `.toBe(4)` count — that is the extraction-honesty half and still catches a fifth branch — but its per-branch claim is now the true one: 11-15 deliberately removed its inner guard, so it consults the latch through the function preamble. The old loop passed for it only because its nested wave-build-failure sub-branch supplied the match.
- **Mock arm `0`, not `1111`.** Deliberate deviation from the verifier's suggestion, with the blast radius measured both ways (30/0 → 30/0).
- **`REQUIREMENTS.md` untouched.** 11-18 owns the checkbox edit, gated on this plan's evidence. The standard executor step that marks requirements complete was deliberately NOT run — see Deviations.

## Deviations from Plan

### Auto-fixed Issues

None. No bug, missing-critical or blocking issue arose; nothing needed auto-fixing under Rules 1–3, and no Rule 4 architectural decision was reached.

### Plan-directed departures from the standard executor flow

**1. `requirements.mark-complete` was NOT run**
- **Found during:** the state-update step
- **Issue:** the standard executor flow marks this plan's `requirements: [N-END-01, N-END-02]` complete in `.planning/REQUIREMENTS.md`. This plan's own prohibition forbids it — *"MUST NOT alter the checkbox state of any requirement in .planning/REQUIREMENTS.md in this plan — 11-18 owns that edit, gated on this plan's evidence"* — and Task 3's verification gate pins `requirements-touched-this-plan` at **0**.
- **Resolution:** the plan directive wins. The step was skipped; `.planning/REQUIREMENTS.md` has a zero-line diff since the round base, and the gate passes. The frontmatter `requirements-completed` field records the IDs this plan's evidence bears on, per the SUMMARY template contract — it is not a claim that a checkbox moved.

**2. A throwaway `console.log` probe was used to complete the STEP A transcript**
- **Found during:** Task 1 STEP A
- **Issue:** the plan requires the RED transcript to carry the assertion message *and both values* (`levelSwitchLabel()` and the `setActive` call list). A vitest case halts at its first failing assertion, so the second value was unreachable from the failure output alone.
- **Resolution:** a single `console.log` was inserted after the press, the values read, and the file restored from a byte-for-byte backup before the RED commit. The probe appears in no commit; the RED-evidence record was captured from the restored file.

---

**Total deviations:** 0 auto-fixed. 2 plan-directed departures from the standard executor flow, both recorded above.
**Impact on plan:** none. Every `<acceptance_criteria>` item and every `<verify>` block passes as written.

## Issues Encountered

- **`gsd check tdd-red-evidence` classified a correctly-parsed RED as `INVALID_RED (zero_tests_discovered)`.** `--reporter=tap-flat` emits per-test `ok` / `not ok` lines but no `# tests` / `# pass` / `# fail` summary, so the checker read `tests: 0` while simultaneously listing the target test in its own `failing_tests` array. Resolved by computing the three summary lines mechanically from the `ok` / `not ok` line counts and appending them — never typed by hand. This is a fourth harness trap alongside the three the dispatch already named, and it is worth carrying: it fails *silently* in the same way the other three do, and the misleading part is that the checker has already parsed the right answer when it rejects the record.

## Known Stubs

None. Zero stubs, zero `TODO` / `FIXME` / placeholder strings, zero skipped or `todo` tests introduced across the three changed files, and every `<verify>` block in the plan was run. No entry was appended to `.planning/WINDOWS.md` because there is no defect to record.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The one source change *reduces* surface: it removes a `__DEV__`-only path by which a mounted Results overlay could arm the frame loop.

Every `mitigate` row in the plan's threat register is discharged: **T-11-44** (the unstoppable loop) and **T-11-45** (the spoofed `Best ·`) by the guard plus their two driven cases; **T-11-46** (a safety property asserted over the wrong set) by CONTRACT A's derivation; **T-11-47** (the unfalsifiable contract) by CONTRACT B plus the verifier's own mutation now turning it RED; **T-11-48** (breaking the campaign harness) by the two live-run cases staying green and unedited; **T-11-49** (a sixth reset block) by the gate at 5; **T-11-50** (prose satisfying a structural contract) by the `//`-only discipline plus the exactly-once identifier count; **T-11-52** (claiming SC-5 or moving a checkbox) by the two gates at 0. **T-11-SC** stays accepted — this plan installed no package.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 11-18.** Two things 11-18 should read from this SUMMARY rather than from the plan:

1. **The measured `injectCertWorstCase` count on the ended-run, tier-already-Mid branch is `1`**, matching the plan's derivation. No reconciliation was needed.
2. **`.planning/REQUIREMENTS.md` is untouched**, with the gate measured at 0. The checkbox edit is 11-18's, on this plan's evidence.

**Still open, and NOT claimed here:**

- **SC-5 / the frame-timing half of N-END-03.** No task in this plan produced a frame on hardware. `docs/ops/ENDLESS-MODE.md` § Limits item 2 stays OPEN, `behavior_unverified` stays at 1, and N-END-03's unchecked box remains correct.
- **11-15-SUMMARY.md:177's overstated safety claim** — the line that says the five paths checked were "every path that begins or resumes a run". This plan deliberately did not touch that file; **11-18 owns that correction.**
- **Advisory 1 of round 4** — `ENDLESS-MODE.md` calling `level-03` "the shipped default level". Out of scope here, unchanged.
- **Four advisories recorded rather than fixed**, as the plan directs: the `certPendingRef` ASSIGN-vs-OR side effect (IN-01), the deferred-cert effect consuming its flag before its own timer (WR-05, fails safe), the five duplicated reset blocks (WR-06 — the right first task for Phase-14 work in this file), and `codeOnly()` stripping line but not block comments (IN-02/IN-04, worked around via the `//`-only prohibition). The two `ReadonlyArray<T>` lint warnings also stay.

**Concern worth carrying into Phase 14.** The `Cert WC` press from a mounted campaign Results panel with the tier already Mid reaches the injector — count 1 — while nothing re-arms and nothing is recorded. It is a behaviour, not a no-op, and the dev row that reaches it is scheduled for deletion in Phase 14.

> **CORRECTION 2026-09-26 (round 6).** This paragraph originally named the run that had just
> ended as the destination of that load, and called the outcome benign on the strength of that
> destination. Both halves are withdrawn. The press bumps `certRequest`
> (`src/runtime/useGameLoop.ts:787`), which only `onFrame` consumes (`:440`); the loop is
> stopped here and nothing clears the counter at a run boundary, so the load is **queued** and
> applies on the **first frame of the next run that arms the loop**, below the retry-reset
> block, onto the freshly reset world. The `Retry` named above is that next run — its reset
> runs ABOVE the injection on the same frame rather than after it, so the press contaminates
> the very run an SC-5 operator would go on to measure. Not benign: an instructional hazard,
> now stated as one in `docs/ops/ENDLESS-MODE.md` (the run-boundary table row and § Limits
> item 2). Instrument: `tests/runtime.cert-request.test.ts`, which reads source and cannot
> produce a frame — no claim here is a frame-level measurement. The superseded clause is
> described rather than quoted because plan 11-20 pins it at 0 occurrences in this file; the
> verbatim original is recoverable from git at `6bb18bf`.

## Self-Check: PASSED

- `app/_components/PlayingHost.tsx` — FOUND
- `tests/ui/PlayingHost.endless-retry.test.tsx` — FOUND
- `tests/ui/PlayingHost.endless-host.test.ts` — FOUND
- `.planning/phases/11-endless-mode/11-17-SUMMARY.md` — FOUND
- commit `8f75330` — FOUND
- commit `62e94cb` — FOUND
- commit `70d736d` — FOUND
- commit `2b4d080` — FOUND
- `git rev-list --count 884dfdd..HEAD` — **4**, measured, matching `actuals.commits`

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*
