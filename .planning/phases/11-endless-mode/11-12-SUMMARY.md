---
phase: 11-endless-mode
plan: 12
subsystem: ui
tags: [react, react-native, vitest, jsdom, endless-mode, records, tdd]

# Dependency graph
requires:
  - phase: 11-endless-mode (11-11)
    provides: "startEndlessRun no longer publishes previousBestRef (WR-04, the first half of the mode firewall on the display side)"
  - phase: 11-endless-mode (11-10)
    provides: "toggleDevLevel as an explicit A-02 exit from endless — the block this plan adds the republication to"
  - phase: 11-endless-mode (11-08)
    provides: "the endless record display and the GameScreen mock whose result-slot renders the REAL ResultOverlay"
provides:
  - "One mode-aware publication rule for `resultBest`: the getBestForLevel preload effect publishes only while the player is not in endless"
  - "A synchronous campaign-best republication on the endless exit, so no endless watermark stands in as a campaign record"
  - "A driven-render behaviour test that lands a HELD campaign read with the endless Results overlay mounted"
  - "A controllable getBestForLevel test harness (deferCampaignRead) whose default is the previous immediate resolve"
  - "A setResultBest publication-rule source contract over eight named mode-scoped regions"
  - "A non-vacuous A-01 retry-in-place liveness assertion that dies against onPress={undefined}"
affects: [11-13, 11-14, endless mid-run record surface, daily challenge records]

actuals:
  tokens: 49087
  tasks: 3
  commits: 7
  plan_head_before: 098ecebca0151fc4897cb6d327a933b4a0c56e7c

tech-stack:
  added: []
  patterns:
    - "Mode-scoped publication: a ref assignment (cache) and a setState publication (player-visible record) are separate obligations with separate guards"
    - "Deferred-promise test harness whose DEFAULT is byte-for-byte the pre-existing immediate resolve, so no pre-existing case changes"
    - "A source contract must target the symbol that CAUSES the behaviour and must state in its own preamble what counting call sites does not prove"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-record.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Guard the PUBLICATION, never the cache: previousBestRef.current stays unconditional in both preload arms so the campaign best is warm the instant the player exits endless"
  - "Republish the score watermark only on the endless exit — resultBestWave is endless-only and ResultOverlay renders it only in endless"
  - "Keep the previousBestRef WR-04 contract and ADD a setResultBest one rather than replacing it: the cache and the publication are different obligations"
  - "N-END-02 was unticked in Task 1 and re-ticked in Task 3, as two separate commits, so git records what was believed when"

patterns-established:
  - "Falsification-before-belief: each task's new instrument was mutated and observed RED before the plan closed"
  - "Where a source contract is the right instrument, it names the behaviour test that proves the render and says it may not stand in for it"

requirements-completed: [N-END-02]

coverage:
  - id: D1
    description: "A campaign per-level best that resolves at any moment during an endless run — including with the Results overlay mounted — cannot reach the rendered endless `Best ·` line"
    requirement: "N-END-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a campaign per-level best that resolves LATE never reaches the rendered endless `Best ·` (11-12 gap 1)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every setResultBest publication is mode-correct, and the preload effect gates its own (11-12 gap 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Leaving endless through `Lv` republishes the campaign best synchronously — the campaign Best is correct with no storage round trip"
    requirement: "N-END-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#leaving endless through `Lv` republishes the campaign best synchronously, with the storage read still pending (11-12 / IN-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The WR-04 instrument targets setResultBest, the symbol that reaches the overlay, over eight named mode-scoped regions, and declares its own blind spot"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#every setResultBest publication is mode-correct, and the preload effect gates its own (11-12 gap 1)"
        status: pass
      - kind: other
        ref: "falsification: bare setResultBest(previousBestRef.current) added inside startEndlessRun -> contract RED on the endless-source assertion"
        status: pass
    human_judgment: false
  - id: D4
    description: "The A-01 retry-in-place liveness case asserts something the press CAUSES, so it cannot pass against a Retry whose handler was removed"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#leaves a LIVE Retry control on screen, not a decorative one (A-01 retry-in-place)"
        status: pass
      - kind: other
        ref: "falsification: onPress={undefined} on the overlay Retry Pressable -> case RED with 'expected 1 to be greater than 1'"
        status: pass
    human_judgment: false
  - id: D5
    description: "N-END-02's checkbox is correct at the end of the round rather than optimistic — unticked while the leak was open, re-ticked on the round-3 rendered evidence"
    verification:
      - kind: other
        ref: "git log 55d29a4 (untick) .. aeafc45 (re-tick, after npm test green)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A UI-state test at a 7-digit score and a 4-digit wave shows no wrap and no clipping in the shipped 320px Results panel width (11-UI-SPEC E1 overflow)"
    verification: []
    human_judgment: true
    rationale: "Carried-forward BACKSTOP, not discharged by this round. jsdom computes no layout, so `no wrap and no clipping` cannot be observed in any test this repo can run; asserting 11-UI-SPEC's own ~28-monospace-character arithmetic would convert a backstop into a false `covered`."

# Metrics
duration: 9 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 12: The record can be wrong on screen — gap 1 closed Summary

**One mode-aware publication rule for `resultBest` (guarded preload effect + synchronous republication on the endless exit), proven by a driven render that lands a HELD campaign read with the real `ResultOverlay` mounted.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-26T09:12:14Z
- **Completed:** 2026-09-26T09:21:23Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **`resultBest` now has exactly ONE mode-aware publication rule.** The mount-time `getBestForLevel` preload effect was `resultBest`'s second writer — it published its campaign result unconditionally with `[store, levelId]` deps and no mode term. Both arms (success and fail-soft) now gate the publication on `modeRef.current !== 'endless'`; both keep the `previousBestRef.current` cache write unconditional.
- **The gap is closed by a DRIVEN RENDER, not a statement count.** A new behaviour case mounts the real host, drives an endless loss so the real `ResultOverlay` is on screen reading `Best · 2400`, then lands a held campaign read with `7777`. It asserts `7777` appears nowhere in `result-slot`, that the slot still reads `Best · 2400`, and that the `host-best` prop probe outside the slot still reads `host-best=2400`.
- **The endless exit republishes the campaign best synchronously.** `toggleDevLevel` now calls `setResultBest(previousBestRef.current)` in its exit block. The case that proves it holds the *next* campaign read pending across the `Lv` press, so only the synchronous path can satisfy it.
- **The WR-04 instrument now watches the symbol that causes the behaviour.** A new contract extracts eight named mode-scoped regions, asserts each is non-empty before any count, then pins sum-equals-total, per-region source correctness, and the preload effect's guard-count/guard-order. Its preamble states that enumerating call sites proves the write rule and never the render, and names the Task 1 behaviour case as what proves the render.
- **The one assertion in this phase that could not fail now discriminates.** The `A-01 retry-in-place` case captures `compileCalls` before the Retry press and asserts a strict increase.
- **`N-END-02` is correct at the end of the round** rather than optimistic — unticked in Task 1 with a dated caveat, re-ticked in Task 3 only after `npm test` went green end to end.

## Task Commits

1. **Task 1 Step A: revert the N-END-02 checkbox** — `55d29a4` (docs)
2. **Task 1 RED: the late campaign read repaints the endless `Best ·`** — `3b1055f` (test)
3. **Task 1 GREEN: mode term on the preload effect** — `e680726` (feat)
4. **Task 2 RED: the endless exit must republish the campaign best (+ A-01 liveness repair)** — `b1d55fd` (test)
5. **Task 2 GREEN: `setResultBest(previousBestRef.current)` in `toggleDevLevel`'s exit** — `41a6411` (feat)
6. **Task 3 Step A: re-point the WR-04 contract at `setResultBest`** — `d0082c9` (test)
7. **Task 3 Step B: re-tick N-END-02 on round-3 rendered evidence** — `aeafc45` (docs)

_No REFACTOR commit on either TDD task: the GREEN implementations are a guard clause and a single call, with no cleanup available that would not be churn._

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — preload effect: both arms gate `setResultBest` on `modeRef.current !== 'endless'`, both keep the `previousBestRef.current` cache write unconditional; `toggleDevLevel`'s exit block gains `setResultBest(previousBestRef.current)`. All explanatory notes are `//` LINE comments, never `/** */` blocks, because `codeOnly()` in the host contract file strips line comments only.
- `tests/ui/PlayingHost.endless-record.test.tsx` — `getBestForLevel` indirected behind a mutable impl (default = the previous immediate resolve) plus `deferCampaignRead()`; a file-level `beforeEach` restores the default across all four describe blocks; two new behaviour cases; the `A-01 retry-in-place` assertion repaired. 20 → 22 cases.
- `tests/ui/PlayingHost.endless-host.test.ts` — new `setResultBest` publication-rule contract. The pre-existing `previousBestRef` WR-04 case is unchanged. 19 → 20 cases.
- `.planning/REQUIREMENTS.md` — `N-END-02` unticked with a dated caveat, then re-ticked with a dated closure bullet. `N-END-01` left checked, `N-END-03` left unchecked with its existing caveat untouched.

## TDD Gate Compliance

Both `tdd="true"` tasks ran a full RED → GREEN cycle with machine-verified RED evidence.

| Task | RED | GREEN | REFACTOR | RED verdict |
|------|-----|-------|----------|-------------|
| 1 | `3b1055f` | `e680726` | — (none needed) | `RED_EVIDENCE_OK` / `target_test_failed` |
| 2 | `b1d55fd` | `41a6411` | — (none needed) | `RED_EVIDENCE_OK` / `target_test_failed` |

- **Task 1 RED:** exit 1, target case failed on its own assertion with the slot reading `Best · 7777` — the verifier's measured `4200 → 7777` reproduced at `2400 → 7777`. 20 pre-existing cases green.
- **Task 2 RED:** exit 1, target case failed with `host-best=2400` — the POST-MERGE endless watermark standing as the campaign best (the funnel records the in-flight run before the exit, so `2400` rather than the pre-run `900` is what stands). 21 other cases green.

**Known-issue workaround applied (recorded, not silent):** `gsd_run check tdd-red-evidence` cannot classify vitest output in this repo — it expects `node:test` summary lines vitest never emits, and its `not ok` matcher is unindented-only while vitest nests under `describe`. Per the standing project note, each RED run's own output was mechanically transcribed into flat `node:test` TAP shape (counts taken verbatim from the vitest summary line) before classification. The transcription helper and both evidence records live in the session scratchpad, deliberately out of the repo.

## Falsification Checks

All three the plan mandated were actually run and observed.

| # | Task | Mutation | Result | Restored clean |
|---|------|----------|--------|----------------|
| 1 | 1 | Removed both `modeRef.current !== 'endless'` guards from the preload effect | **RED** — `1 failed \| 20 passed`, slot read `Best · 7777` | `git status --porcelain app/_components/PlayingHost.tsx` empty; 21/21 green |
| 2 | 2 | `onPress={undefined}` on the endless Retry `Pressable` in `ResultOverlay.tsx` | **RED** — repaired liveness case failed with `expected 1 to be greater than 1`; the two sibling cases the verifier named also failed (3 failed total) | `git status --porcelain src/runtime/overlays/ResultOverlay.tsx` empty; 22/22 green |
| 3 | 3 | Bare `setResultBest(previousBestRef.current);` added inside `startEndlessRun` | **RED** — new contract failed the endless-source assertion; the pre-existing WR-04 case also failed | `git status --porcelain app/_components/PlayingHost.tsx` empty; 20/20 green |

**Falsification 3 fired on a different assertion than the plan predicted, and that is the honest reading.** The plan expected the mutant to trip *sum-equals-total*. It did not, and could not: the injected call sits *inside* the `startEndlessRun` region, so the summed in-region count legitimately still equals the file total. The assertion that caught it is per-region source correctness — "an endless-only region publishing a campaign source", which is verbatim the plan's own parenthetical description of the defect. The contract catches exactly what the plan wanted caught; only the plan's guess about which of its three assertions would fire was wrong.

## Decisions Made

- **Guard the publication, never the cache.** `previousBestRef.current` stays unconditional in both preload arms. A guarded cache write would make the campaign best stale after every endless run, which `toggleDevLevel`'s republication would then faithfully propagate. The new contract pins this explicitly (`cache-writes === publications`) so a future "tidy-up" cannot move the guard up one line.
- **Republish the score watermark only on the endless exit.** `resultBestWave` is endless-only and `ResultOverlay` renders it only in endless, so republishing it would be noise.
- **Keep the `previousBestRef` WR-04 contract; add rather than replace.** The cache and the publication are different obligations and need different instruments. The old contract was not wrong, only blind.
- **Extract `onRetry`'s and `remountDevSession`'s campaign branches rather than their whole bodies** for the new contract. Taking the whole body would whitelist a future publication added inside their endless early-return branches — the same shape of blindness this plan exists to correct.
- **`modeRef` deliberately not added to the preload effect's dependency array.** It is a ref; adding it would be wrong as well as unnecessary.
- **Two checkbox moves, two commits.** `N-END-02` unticked in Task 1 and re-ticked in Task 3 as separate commits, so the record of what was believed when is recoverable from git (threat `T-11-22`).

## Deviations from Plan

None — plan executed exactly as written. No deviation rule was triggered: no bug, no missing critical functionality, no blocker, no architectural question.

Two factual observations worth recording, neither of which changed what was built:

1. **The pre-fix value in the Task 2 exit case is `2400`, not the `900` the plan's `<behavior>` sketch implied.** `toggleDevLevel` calls `recordInFlightEndlessRun()` first, so the in-flight run is recorded and `handleRunEnded`'s endless arm publishes the POST-MERGE watermark before the exit block runs. The assertion message was corrected to name the measured value rather than the predicted one — a measured-pre-fix note that cites a number nobody measured is the failure mode this round exists to stop.
2. **Falsification 3 fired on assertion 2 rather than assertion 1** — see the Falsification Checks section above.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** none. Every acceptance criterion, every task `<verify>` gate and every plan-level `<verification>` item was executed and passed.

## Verification Results

Plan-level `<verification>`, run end to end after the final task commit:

| Check | Target | Result |
|---|---|---|
| `npm test` (vitest + 4 assert scripts) | green | **exit 0** — 97 files, 625 tests passed |
| `npm run typecheck` | exit 0 | **exit 0** |
| `npm run lint` | exit 0 | **exit 0** |
| `git diff --name-only a20ad36..HEAD -- src/core src/levelgen` | empty | **0 lines** |
| `grep -c "bakeGlowSprites(brickW, brickH)" app/_components/PlayingHost.tsx` | 1 | **1** |
| `docs/ops/ENDLESS-MODE.md` byte-identical to pre-plan | unchanged | **0-line diff vs `098eceb`; not touched** |
| `N-END-01` / `N-END-02` / `N-END-03` boxes | `[x]` / `[x]` / `[ ]` | **1 / 1 / 1** match |
| Case counts, no case deleted | both higher | record **20 → 22**, host **19 → 20**; name-diff vs `098eceb` shows **none removed** |
| Three falsification checks run and recorded | yes | **yes** — see table above |
| Carried-forward items survive | yes | E1 overflow still a `backstop` (coverage `D6`, `human_judgment: true`); the five flagged `$COVERAGE` assumptions recorded once in `11-12-PLAN.md` for this round; all 8 prohibitions still `flagged`/`unverified`; `behavior_unverified: 1` (SC-5) untouched |

Task-level gates:

| Gate | Result |
|---|---|
| Task 1: preload region probe | `preload-guards=2 preload-publications=2 preload-cache-writes=2` (pre-fix this printed `preload-guards=0` and exited 1) |
| Task 1: `n-end-02-unticked` | `1` |
| Task 1: `tests/ui/PlayingHost.endless-record.test.tsx` case count | **21** ≥ 21 required at that point (22 after Task 2) |
| Task 2: `exit-republications` | `1` |
| Task 3: `n-end-02-ticked` / `n-end-03-unticked` / `frozen-tree-diff` / `bake-calls` | `1` / `1` / `0` / `1` |

## Scope Fences — all held

- `N-END-03` **not** ticked; its existing caveat untouched.
- `docs/ops/ENDLESS-MODE.md` **not touched at all** — the SC-5 OPEN block in § Limits item 2 stands unchanged.
- No write to `src/core` or `src/levelgen` (`0`-line diff from the round-3 base `a20ad36`).
- Bake path and `ENDLESS_BRICK_DIMS` untouched; `bakeGlowSprites(brickW, brickH)` call count still exactly `1`.
- No production endless entry point and no permanent endless record surface added.
- A-02 not re-opened; `toggleDevLevel`'s funnel-first ordering and existing exit writes are byte-identical.
- `runCertWorstCase` unchanged.
- `11-01` … `11-11` not renumbered, rewritten or superseded.
- No package-manager install of any kind (threat `T-11-SC`, disposition `accept`, holds).

## Known Stubs

None. The diff introduces no hardcoded empty values feeding the UI, no placeholder copy, no `TODO`/`FIXME`, and no `.skip(`/`.todo(` — verified by scanning every added line under `app/`, `src/` and `tests/`.

The one outstanding *reservation* is not a stub but a deliberate backstop, carried forward unchanged and already tracked: the E1 Results-panel overflow truth (coverage `D6`). jsdom computes no layout, so it cannot be discharged by any test this repo can run.

## Issues Encountered

- **`gsd_run check tdd-red-evidence` cannot read vitest output.** Worked around by mechanical TAP transcription, documented in full under *TDD Gate Compliance*. This is a known upstream limitation of `@opengsd/gsd-core`, not a property of these tests, and no RED commit was allowed to rest on a self-declared verdict.
- **`waitFor(host-best=…)` cannot be used by any case that holds the campaign read pending.** Both shared mount helpers wait on `host-best=${campaignBest}`, which can never land while the read is deferred. The two new deferral cases wait on `getSnapshot` having been called instead — the sibling chain, which also proves the endless watermarks are seeded rather than merely defaulted. The deferral is off by default for exactly this reason, so no pre-existing case hangs.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Gap 1 of `11-VERIFICATION.md` is closed.** `N-END-02` is `[x]` on round-3 evidence that is a driven render.
- **Ready for `11-13` and `11-14`.** Both were planned against this plan's scope fences and neither depends on anything left open here. `11-14` owns the `runCertWorstCase` mode term, deliberately scoped away from gap 1: gap 1 closes without it, because the preload guard removes the publication that the `setLevelId` trigger was a route into.
- **Still open, unchanged and correctly recorded:** SC-5 / the frame-timing half of `N-END-03` stays `behavior_unverified: 1` with its human discharge procedure and its OPEN block in `docs/ops/ENDLESS-MODE.md` § Limits item 2. `ENDLESS_BRICK_DIMS` / the stretched glow halo remains owner-accepted debt for Phase 14. The E1 and E3 overflow backstops remain backstops.
- **One thing a future reader must not undo:** the `//` line-comment convention at the two guarded preload sites and in `toggleDevLevel`'s exit is load-bearing, not stylistic. `codeOnly()` in `tests/ui/PlayingHost.endless-host.test.ts` strips `//` comments only, so converting any of those notes to a `/** */` block would let prose satisfy or falsify the publication contract.

## Self-Check: PASSED

- Files claimed modified, all present on disk: `app/_components/PlayingHost.tsx`, `tests/ui/PlayingHost.endless-record.test.tsx`, `tests/ui/PlayingHost.endless-host.test.ts`, `.planning/REQUIREMENTS.md`. (`key-files.created` is empty — this plan created no files.)
- All seven task commits found in `git log`: `55d29a4`, `3b1055f`, `e680726`, `b1d55fd`, `41a6411`, `d0082c9`, `aeafc45`.
- `commits: 7` is MEASURED — `git rev-list --count 098ecebca0151fc4897cb6d327a933b4a0c56e7c..HEAD` at SUMMARY time, against the ledger base recorded at plan start.
- `actuals.tokens: 49087` is `estimateTokens` (chars/4) over the four files actually changed (196,348 chars). For a later calibration pass that prefers the narrower basis, the realized diff alone is 27,268 chars → 6,817 tokens. Neither figure has been rounded toward the plan's `estimate.tokens: 65000`.
- All task `<acceptance_criteria>` re-run and passing; all plan-level `<verification>` items re-run and passing (tables above).

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*
