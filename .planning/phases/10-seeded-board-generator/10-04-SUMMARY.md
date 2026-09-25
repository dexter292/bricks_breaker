---
phase: 10-seeded-board-generator
plan: 04
subsystem: levelgen
tags: [winnability, headless-bot, ops-doc, balance, determinism, limits, tdd]

# Dependency graph
requires:
  - phase: 10-seeded-board-generator
    provides: "10-01 — runBotOnLevel(raw, opts, label), the object-taking measurement core, and the winnability it.todo scaffold"
  - phase: 10-seeded-board-generator
    provides: "10-02 — generate(seed, difficulty), the three stages, the printed 21-row schedule table"
  - phase: 10-seeded-board-generator
    provides: "10-03 — both pinned digests, the corrected theorem/ordering/guard story, the 105 000-board mutation table"
  - phase: E2-balance
    provides: "tests/helpers/balanceBot.ts — the headless bot and TICKS_PER_SECOND"
provides:
  - "tests/levelgen.winnability.test.ts — the SC-2 clearability backstop, 30 boards through the real stepRun pipeline"
  - "docs/ops/BOARD-GENERATOR.md — the phase's durable ops record: proof, dials, budget, digests and an honest Limits section"
  - "a measured clear-time distribution over 840 bot runs (p50 108s / p95 259s / p99 416s / worst 1495s, 0 non-wins)"
  - "the A1 blank plan 10-05's device probe fills"
affects: [10-05, 11-endless, 12-daily]

# Actuals (#2632)
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 109e92382aa302b0aa07df66d609142417d0a79e

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate the two jobs a timeout does: maxTicks bounds simulated time so a slow board is never misreported as stuck; the it timeout bounds wall time and is the actual hang guard"
    - "Size a budget constant against a measured population tail, not against the sample it must not fail on"
    - "Record a measured distribution in the ops doc and deliberately NOT assert it, when asserting it would pin uncalibrated tuning constants by proxy"

key-files:
  created:
    - docs/ops/BOARD-GENERATOR.md
  modified:
    - tests/levelgen.winnability.test.ts

key-decisions:
  - "maxTicks raised from the planned 420 to 1800 simulated seconds — 420 sits AT the measured p99 and would false-fail ~1 board in 100"
  - "The clear-time tail is recorded in the ops doc as a Phase 11 balance finding, not asserted as a test, because a clear-time ceiling would pin the dial constants by proxy"
  - "The sample width (30) is pinned by an explicit assertion so a watch-loop edit that thins it fails loudly"
  - "docs/ops/README.md deliberately not updated — it indexes no E1b or E2 phase doc either; adding only this one would be inconsistent"

patterns-established:
  - "When a plan's literal constant is falsified by measurement, widen the measurement first (840 boards here) so the replacement is anchored to a population rather than fitted to the failing sample"

requirements-completed: [N-GEN-02, N-GEN-03]

coverage:
  - id: D1
    description: "A stratified 30-board sample spanning d = 0 to D_MAX is cleared by the headless bot with zero bricks remaining, through the real applyCompiledLevel/stepRun pipeline"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/levelgen.winnability.test.ts#a stratified 30-board sample across the difficulty range is cleared by the bot (10-04-01)"
        status: pass
      - kind: other
        ref: "Wider scan, 840 boards (40 seeds x 21 difficulties): 0 non-wins, all bricksRemaining === 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The sample is weighted to the top of the difficulty range, where clear time and structural risk are highest (10 seeds at D_MAX against 5 at each of d = 0, 5, 10, 15)"
    requirement: "N-GEN-02"
    verification:
      - kind: unit
        ref: "tests/levelgen.winnability.test.ts — SAMPLE table plus the expect(boards).toBe(30) width pin"
        status: pass
    human_judgment: false
  - id: D3
    description: "A stuck board fails fast and legibly rather than stalling CI — explicit maxTicks plus a 60s it timeout, with every failure message naming seed, difficulty and simulated seconds"
    verification:
      - kind: other
        ref: "Observed RED: \"s=4 d=15 bot outcome (420s): expected 'TIMEOUT' to be 'WON'\" — the message carried all three facts and located the miscalibration immediately"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/ops/BOARD-GENERATOR.md records Lemma 1, Invariant I, the Theorem, the two counterexamples, the three stages, the four dials, the 21-row schedule, the spark arithmetic and both pinned digests"
    requirement: "N-GEN-03"
    verification:
      - kind: other
        ref: "grep: '## Limits' 1, 'N-GEN-01' 1, '^| 20 ' 1, 21 schedule rows, SHA-256 9e3748c8… 1, 0x2e8f6c23 2"
        status: pass
    human_judgment: false
  - id: D5
    description: "The ops record states the 10-03 corrections rather than the superseded story: the half-width mask is sound by theorem, the pre-mirror ordering is the real defect, wouldTouchSteel is the guard and not polish"
    verification: []
    human_judgment: true
    rationale: "A grep proves the words are present; that the argument is stated correctly and would actually steer a future maintainer away from deleting the adjacency rule is a review judgment."
  - id: D6
    description: "The Limits section names A1/Hermes as open with a blank for the device value, names the skipped E2 playtest cohort, names the bot's necessary-not-sufficient status, and records why assert-generated-solvability.mjs deliberately does not exist"
    verification:
      - kind: other
        ref: "grep -c 'A1' => 3; 'playtest cohort' => 1; 'assert-generated-solvability' => 1"
        status: pass
    human_judgment: false
  - id: D7
    description: "The measured clear-time distribution is handed to Phase 11 as a balance finding — p50 108s, p95 259s, p99 416s, worst 1495s of perfect-bot play"
    verification: []
    human_judgment: true
    rationale: "Whether a 1495s perfect-bot clear is too long for a real player is exactly the judgment no instrument in this phase can make — that is why it is recorded rather than asserted."

# Metrics
duration: 18 min
completed: 2026-09-25
status: complete
---

# Phase 10 Plan 04: Winnability Backstop and the Ops Record Summary

**30 generated boards spanning the whole difficulty range are now cleared by the headless bot with zero bricks remaining on every run, on a tick budget that measurement corrected rather than inherited — and `docs/ops/BOARD-GENERATOR.md` records the proof, the dials, both digests and, most importantly, the four things this phase did *not* establish.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-25T20:15Z (local +08:00)
- **Completed:** 2026-09-25T20:33Z (local +08:00)
- **Tasks:** 2 (2 commits)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **SC-2's dynamic claim is now asserted.** The 21 000-board sweep proves every brick is *reachable on paper*; this plan proves a stratified 30 boards are actually **cleared** by the real `applyCompiledLevel` → `stepRun` pipeline, with `bricksRemaining === 0`. Weighted to the top of the range (10 seeds at `D_MAX`, 5 at each of `d = 0, 5, 10, 15`) because that is where clear time and structural risk both peak.
- **The last `it.todo` in Phase 10 is filled.** All four levelgen test files now report `grep -c "it.todo"` → `0`.
- **The plan's tick budget was wrong, and the test caught it on its first run.** 420 simulated seconds failed `s=4 d=15`, which clears fine in 446.2 s. Rather than nudging the constant past the one failing board, the measurement was widened to 840 boards — see below.
- **`docs/ops/BOARD-GENERATOR.md` exists (353 lines)**, carrying Lemma 1, Invariant I, the Theorem, both counterexamples, the three stages, the four dials with the D-08 weight-neutrality correction, the 21-row schedule, the 72-against-128 spark arithmetic, both pinned digests, and a five-item `## Limits`.
- **The record states 10-03's corrections, not the story they replaced.** The half-width-mask check is documented as **sound by theorem** (with the subset/strictly-harder argument spelled out, and an explicit instruction not to hunt it at a wider N); the **pre-mirror ordering** is named as the real defect; and `wouldTouchSteel` is documented as **the guard, not polish**, with the columns-4-and-5 corridor mechanism and an instruction to re-run the ordering mutation before removing it.

## Task Commits

1. **Task 1: the 30-board bot winnability backstop, on a measured tick budget** — `926565c` (test)
2. **Task 2: the board generator ops record, with an honest Limits section** — `2e69be1` (docs)

_Base for the measured commit count: `109e92382aa302b0aa07df66d609142417d0a79e`; `git rev-list --count 109e923..HEAD` → `2`._

## The tick budget: what measurement changed, and why it mattered

This is the plan's one substantive finding, so it gets the detail.

The plan specified `maxTicks = TICKS_PER_SECOND * 420`, justified as "~1.9x headroom" over RESEARCH §Q7's slowest prototype board (223 s), "while still terminating a genuinely stuck board". **The very first run of the new case failed:**

```
AssertionError: s=4 d=15 bot outcome (420s): expected 'TIMEOUT' to be 'WON'
```

The obvious move — bump the constant until `s=4 d=15` passes — would have fitted the budget to the exact sample it must never fail on. So the scan was widened first: **840 boards, 40 seeds x all 21 difficulties**, at a 3 000 s budget.

| boards | non-wins | p50 | p95 | p99 | worst |
|---|---|---|---|---|---|
| 840 | **0** | 108 s | 259 s | 416 s | **1495 s** (`s=33 d=20`) |

Two conclusions:

**The generator is fine.** Zero non-wins across 840 boards, every one `bricksRemaining === 0`. `s=4 d=15` is a slow board, not a broken one — it clears completely in 446.2 s.

**The planned constant was genuinely miscalibrated, not merely unlucky.** 420 s sits *at the p99*. Shipped as written it would misreport roughly **one board in a hundred** as broken — the kind of gate that gets labelled flaky and then ignored, which is worse than no gate. RESEARCH's 15-run prototype sample simply never saw the tail (its max was 223 s against a true max of 1495 s).

The underlying design error is that the plan gave `maxTicks` two jobs. It bounds *simulated* time; the `it` timeout bounds *wall* time. **The `it` timeout is the hang guard** — even if all 30 boards burned a full 1800 s budget the case costs ~5 s wall, far inside 60 s. So `maxTicks` only ever needed to be high enough that a slow board is not misreported, and being generous with it costs nothing.

Budget is now **1800 simulated seconds**: ~4x the slowest board in the pinned sample (446.2 s) and above the slowest of the 840 measured (1495 s). Both anchors measured, neither inherited.

### The tail is a balance finding, and it is deliberately not asserted

A *perfect* bot — one that never misses — needs 416 s at the p99 and 1495 s on the worst board. Since bot time is a **floor** on human time, boards at that tail are plausibly unfinishable by a real player. That is real information for Phase 11's re-tune and it is recorded in `docs/ops/BOARD-GENERATOR.md` §Limits.

It is **not** turned into an assertion, and that was a deliberate call: pinning a clear-time ceiling would pin the dial constants by proxy, and those constants have no human calibration behind them (the E2 cohort was skipped). Asserting an uncalibrated number would dress a guess up as a contract — precisely the failure mode the `## Limits` section exists to prevent.

## Files Created/Modified

- `docs/ops/BOARD-GENERATOR.md` — **created, 353 lines.** House shape: `#` title, bolded key block (`**Status:**`, `**Requirements:**`, `**Consumers:**`, `**Owner sign-off:**`), `## Why this phase existed`, mechanism, dials, budget, determinism, a what-is-proven table, and `## Limits`. Follows `BALANCE-E2.md`'s front-matter and closing-Limits convention and `LEVEL-VERBS-E1b.md`'s "Why this phase existed" section.
- `tests/levelgen.winnability.test.ts` — **modified.** The single `it.todo` replaced with the live 30-board case. Header retains 10-01's necessary-not-sufficient framing and gains the tail measurement plus the note that a lonely-brick constraint stays unbuilt (now on 840 bot runs of evidence, not 15).

## Decisions Made

- **The sample width is pinned by `expect(boards).toBe(30)`.** RESEARCH Pitfall 7's failure mode is someone thinning a loop for a watch run and never restoring it; a counter assertion makes that fail loudly instead of quietly reducing the evidence. Same discipline as `SWEEP_SEEDS_FLOOR` in the sweep file.
- **The per-board label is `s=${s} d=${d}` with `(${r.seconds}s)` in the message.** The seconds turned out to be load-bearing, not decorative: `(420s)` in the RED output is what identified the failure as a budget exhaustion rather than a stuck board, immediately.
- **`docs/ops/README.md` was not updated.** Its index covers Milestone A runbooks and the B1/B2/B3/C1 design notes; it indexes **neither** `BALANCE-E2.md` nor `LEVEL-VERBS-E1b.md`, the two docs this one is modelled on. Adding only this phase's record would be inconsistent, and bringing the whole index current is a separate piece of work outside this plan's scope boundary. Flagged under *Deferred Items* below.
- **`## Limits` got a fifth item the plan did not list** — device generation cost is unmeasured (0.4 ms/board in Node, never timed on a handset). Recorded because Phase 11 calls `generate` mid-run, where a hitch would be visible; it is the one remaining "we only measured this on a laptop" claim in the phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree forked from `origin/main` rather than the phase branch**

- **Found during:** Pre-execution base check
- **Issue:** The harness forked this worktree from `8788caa`, so it held no Phase 10 work — no `src/levelgen/`, no `tests/helpers/balanceBot.ts` split, and no `10-04-PLAN.md`.
- **Fix:** `git merge --ff-only 109e92382aa302b0aa07df66d609142417d0a79e`, which succeeded outright as 10-02 and 10-03 both predicted. No merge commit, so the plan base is the orchestrator's HEAD exactly.
- **Verification:** `git rev-parse HEAD^{tree}` equals `git rev-parse 109e923^{tree}` (`f101efab…`) before the first edit. No `reset --hard`, `clean`, `update-ref` or `stash` was used.
- **Committed in:** n/a (fast-forward)

**2. [Rule 1 - Bug] The plan's `maxTicks = 420 s` false-fails a clearable board; raised to 1800 s on measured evidence**

- **Found during:** Task 1, first run
- **Issue:** The plan specifies 420 simulated seconds as the tick budget, citing ~1.9x headroom over RESEARCH's 223 s worst case. The very first run failed `s=4 d=15` with `TIMEOUT` — a board that clears completely in 446.2 s. A widened 840-board scan showed the constant sits at the **p99** of the clear-time distribution (p99 416 s, worst 1495 s), so it would misreport ~1 board in 100 as broken. The plan's own reasoning conflated `maxTicks` (bounds simulated time, prevents false failure) with the `it` timeout (bounds wall time, the actual hang guard).
- **Fix:** `maxTicks = TICKS_PER_SECOND * 1800`. Anchored to two measured numbers — ~4x the slowest board in the pinned sample, and above the slowest of 840 scanned. The 60 s `it` timeout is unchanged and remains the hang guard; worst-case wall cost across all 30 boards is ~5 s even if every one burned the full budget. The provenance and the two-jobs distinction are written into the constant's doc comment so the next reader does not re-derive 420.
- **Files modified:** `tests/levelgen.winnability.test.ts`
- **Verification:** 30/30 WON, `bricksRemaining === 0`, 953 ms. The widening scan itself: 840 boards, 0 non-wins.
- **Committed in:** `926565c`

**3. [Rule 1 - Bug] `array-type` lint warning introduced by the new test, fixed before commit**

- **Found during:** Task 1 acceptance gate
- **Issue:** `ReadonlyArray<{...}>` on the `SAMPLE` constant tripped `@typescript-eslint/array-type`. The repo baseline is **0 warnings** repo-wide (10-03 deviation 4 cleared the last one), so introducing one is a regression against a standard this phase just finished establishing.
- **Fix:** `readonly {...}[]`.
- **Verification:** `npm run lint` reports zero problems repo-wide.
- **Committed in:** `926565c` (fixed before the commit, not after)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** No scope change. Deviation 1 was a precondition for reading the plan at all. Deviation 2 changes one constant against the plan's literal text but serves the plan's stated *intent* ("a tight timeout is what turns a hang into a fast, legible failure") better than the literal value did — and it is the finding the task was built to surface. Deviation 3 preserves a repo-wide standard.

## TDD notes

Plan frontmatter is `type: execute`, so the plan-level gate sequence does not apply. Task 1 carries `tdd="true"`; Task 2 does not.

**Task 1's RED was real and unforced.** Under the `task.is-behavior-adding` predicate the task is exempt — `<files>` names one test file, no source — so a manufactured RED would have been theatre. None was needed: the case as specified **failed on its first run**, on its own assertion, for a substantive reason.

| Task | RED evidence |
|---|---|
| 1 | 1 test discovered, 1 failing: `s=4 d=15 bot outcome (420s): expected 'TIMEOUT' to be 'WON'`. No collection error, no todo skipped. |

That failure was the plan's tick budget, not the generator — so GREEN came from correcting the constant rather than from changing any production code. `src/**` is byte-unchanged across this entire plan, which is the honest summary of what Task 1 was: a measurement that found its own instrument miscalibrated.

No REFACTOR commit: the GREEN needed no cleanup, and the TDD contract commits REFACTOR only on change.

## Issues Encountered

- **Vitest suppresses `console.log` under this repo's reporter config** — the same thing 10-02 and 10-03 both hit. The 840-board scan therefore wrote its results to the scratchpad via `node:fs` from a throwaway test under `tests/__scratch__/`, which was deleted afterwards. `git status --porcelain` is empty and `tests/__scratch__/` does not exist in `HEAD`. Still worth a one-line `vitest.config.ts` fix at some point; still repo-wide and outside this plan's scope.
- **No Expo API is reachable from this plan's files.** `AGENTS.md` pins Expo SDK 57 and requires consulting the versioned docs before writing code touching Expo APIs. Confirmed by inspection rather than assumed: `tests/levelgen.winnability.test.ts` imports only `vitest`, `../src/levelgen` and `./helpers/balanceBot`; the other file is Markdown. No doc lookup was required.

## Deferred Items

- **`docs/ops/README.md` is stale** (`Cập nhật: 2026-09-24`) and indexes neither `BALANCE-E2.md`, `LEVEL-VERBS-E1b.md`, nor now `BOARD-GENERATOR.md`. Out of scope here — the fix is to bring the whole index current, not to add one row. Whoever next touches that file should sweep all three.

## Known Stubs

None. `docs/ops/BOARD-GENERATOR.md` is complete prose with one **intentional** blank — the on-device u32 fingerprint under `## Limits`, explicitly labelled *(to be filled by plan 10-05)* and paired with the expected value. That blank is the artefact of A1 being genuinely unmeasured; filling it with a guess is exactly what the section exists to prevent.

Phase 10 now has **zero** `it.todo` entries across all four levelgen test files (`sweep`, `determinism`, `schedule`, `winnability`), down from the 8 that stood after 10-02.

`.planning/WINDOWS.md` was again not created, for the reason 10-01 and 10-02 both recorded: it does not exist in this repo, and seeding a shared new `.planning/` file from inside a worktree is a merge hazard.

## Threat Flags

None. The two files touched are a test and a Markdown document. No network, filesystem-write, credential or user-input surface is added; the bot reads no file (`grep -c readLevelFile` → 0, it plays generated objects). `src/**` is byte-unchanged.

Threat register dispositions discharged by this plan:

| Threat ID | Mitigation | Status |
|---|---|---|
| T-10-18 | structurally unclearable board reaching Phase 11 | **mitigated** — 30-board stratified sample asserting `WON` + `bricksRemaining === 0`, plus a 840-board confirming scan with 0 non-wins |
| T-10-19 | bot hang masking a defect | **mitigated** — explicit `maxTicks` plus the 60 s `it` timeout; the RED run demonstrated the fast-legible-failure path end to end |
| T-10-20 | an unmeasured assumption recorded as a fact | **mitigated** — `## Limits` names A1 open (with a blank, not a guess), the skipped cohort, the bot's necessary-not-sufficient status, the deliberate `.mjs` omission, and unmeasured device cost |
| T-10-SC | npm/pip/cargo installs | **accepted, not triggered** — zero packages installed |

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run tests/levelgen.winnability.test.ts` | **1 passed**, 953 ms (budget: 60 s) |
| Boards played end to end | **30** (plus 840 in the throwaway calibration scan) |
| `grep -c "it.todo" tests/levelgen.winnability.test.ts` | `0` |
| `grep -c "runBotOnLevel" tests/levelgen.winnability.test.ts` | `3` (≥ 1 required) |
| `grep -c "readLevelFile" tests/levelgen.winnability.test.ts` | `0` (required) |
| `git status --porcelain assets/levels` | empty |
| `test -f docs/ops/BOARD-GENERATOR.md` | present, 353 lines |
| `grep -c "## Limits" docs/ops/BOARD-GENERATOR.md` | `1` |
| `grep -c "A1" docs/ops/BOARD-GENERATOR.md` | `3` |
| `grep -c "assert-generated-solvability" docs/ops/BOARD-GENERATOR.md` | `1` |
| `grep -c "playtest cohort" docs/ops/BOARD-GENERATOR.md` | `1` |
| `grep -c "^\| 20 " docs/ops/BOARD-GENERATOR.md` | `1` |
| Schedule rows present | `21` (d = 0..20) |
| Both digests present | SHA-256 `9e3748c8…` ✅ · u32 `0x2e8f6c23` ✅ |
| `grep -c "N-GEN-01" docs/ops/BOARD-GENERATOR.md` | `1` |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, **0 warnings** repo-wide |
| `npx eslint src/levelgen` | exit 0 |
| `npm test` (full gate incl. the 4 assert scripts) | **exit 0** — 87 files passed / **486 passed, 0 todo**, 9.68 s |
| `git diff --name-only 64a0b0c..HEAD -- src/core` | empty (phase base, not `origin/main`) |
| `git diff --name-only 109e923..HEAD -- .planning/STATE.md .planning/ROADMAP.md` | empty |
| `git diff --name-only 109e923..HEAD` | exactly 2 files |
| `git status --porcelain` | empty |

Suite moved from the baseline exactly as expected: 86 passed + 1 skipped → **87 passed**, and 485 + 1 todo → **486 passed, 0 todo**, as the winnability file's single todo became a live case.

## Next Phase Readiness

- **Plan 10-05 (the `__DEV__` device probe) is unblocked and now has a named landing site.** `docs/ops/BOARD-GENERATOR.md` §Limits item 1 carries an explicit blank for the on-device u32 next to the expected `0x2e8f6c23` = `781151267`. Filling it in is the last act that discharges A1.
- **A1 remains the phase's one open assumption, and it is the only thing standing between this generator and Phase 12.** Every determinism claim in the ops record is currently **scoped to V8** — four processes, two module pipelines, all of them Node. If Hermes diverges, daily challenge compares scores on boards that were never the same board.
- **Phase 11 inherits two concrete things.** (a) Dial re-tuning is cheap by construction: envelopes make monotonicity structural and no test pins a literal, so change numbers in `src/levelgen/schedule.ts` freely — but *not* candidate ordering, the PRNG, or the stage sequence, any of which rewrites every board for every seed. (b) The clear-time tail measured here (p99 416 s, worst 1495 s of *perfect* play) is the first quantitative signal that the top of the range may be too long, and it is the natural input to that re-tune.
- **Phase 10's test debt is zero.** All four levelgen files are todo-free; the phase's contracts are asserted rather than scaffolded.

## Self-Check: PASSED

- Both key files verified present on disk (`[ -f ]`): `docs/ops/BOARD-GENERATOR.md`, `tests/levelgen.winnability.test.ts`.
- Both task commits verified reachable from HEAD: `926565c`, `2e69be1`.
- `commits: 2` is **measured** via `git rev-list --count 109e92382aa302b0aa07df66d609142417d0a79e..HEAD`, not narrated.
- Every task-level acceptance criterion re-run and passing; the plan-level `<verification>` block re-run and clean.
- Working tree clean; no changes to `STATE.md`, `ROADMAP.md`, or `src/core/**` (measured against the phase base `64a0b0c`, not `origin/main`).

---
*Phase: 10-seeded-board-generator*
*Completed: 2026-09-25*
