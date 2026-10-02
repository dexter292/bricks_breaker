---
phase: 11-endless-mode
plan: 16
subsystem: ui
tags: [react, dev-harness, cert-harness, endless, ops-docs, tdd]

requires:
  - phase: 11-endless-mode (plan 14)
    provides: the `modeRef.current !== 'endless'` term on `runCertWorstCase`'s LEVEL half, whose other branch this plan repairs
  - phase: 11-endless-mode (plan 15)
    provides: the hoisted `applyChrome` ended-run latch — a hard dependency, untouched here
  - phase: 08-showpiece-level
    provides: `runCertWorstCase`, `certPendingRef`, the deferred-inject effect and the `__DEV__` dev row
provides:
  - "a run-mode term on `runCertWorstCase`'s deferral arm: an endless press arms no one-shot on either endless sub-branch"
  - "`injectCertWorstCase` as a module-level spy in the `useGameLoop` mock — the first instrument in this repo that can count injections"
  - "six driven cases covering every branch of `Cert WC`: endless below level-03, endless already on level-03, endless tier-already-Mid, campaign deferred, campaign direct, plus 11-14's boundary case"
  - "a source contract pinning the arm's run-mode term and 11-14's single level-forcing call, with its own statement of what it cannot prove"
  - "a branch-scoped `Cert WC` injection claim in `docs/ops/ENDLESS-MODE.md`, in both operator-facing locations, dated `Re-scoped 2026-09-26 (round 4)`"
  - "the FIRST measurement of the second endless sub-branch (press while already on `level-03`) taken by any round"
affects: [11-verification-round-4, phase-14-dev-row-removal, sc-5-device-reading]

actuals:
  tokens: 67731
  tasks: 3
  commits: 5
  plan_head_before: 0ff6facd0a0a6ecab983704967622016ff8dcf96

tech-stack:
  added: []
  patterns:
    - "Do not arm a latch whose discharge preconditions the same change has made unreachable — stated at the assignment, in the comment, as a general rule and not only as an incident report"
    - "Measure every branch of a conditional before changing one arm of it, including the branches nobody reported"
    - "A source contract states in its own opening comment what it cannot prove and names the behaviour cases that do"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts
    - docs/ops/ENDLESS-MODE.md

key-decisions:
  - "The review's suggested one-liner was ADOPTED as written but only after both endless sub-branches were measured — and the measurement showed it is NOT a no-op on the second one: pressing `Cert WC` while already on `level-03` discharged a real injection into the freshly restarted endless run pre-fix (1 call), which the term now suppresses. Recorded as a deliberate behaviour change in the code comment, the ops document and here, rather than shipped silently."
  - "Case C1 (the campaign deferral) DOES fire in jsdom — the plan's permitted fallback to a flagged assumption was not needed and was not taken. `must_haves` truth 3 stands as the flat assertion it was written as: measured, exactly one injection, with the level and tier controls both observed to have moved first so the count cannot be a vacuous zero."
  - "`.planning/REQUIREMENTS.md` was deliberately NOT touched, so `requirements-completed` is empty despite the plan declaring `requirements: [N-END-01, N-END-03]`. Commit `0c1270e` reverted those boxes after gaps were found and the plan's own frozen-tree gate requires `requirements-touched-this-round=0`. Round-4 verification moves them, not this executor."
  - "SC-5's device half is NOT discharged. This plan repairs the INSTRUMENT an operator uses to take that reading; it does not take the reading. § Limits item 2 stays OPEN (3 `OPEN` markers, unchanged) and N-END-03 stays unchecked."

patterns-established:
  - "Latch hygiene: an arming assignment and its discharge preconditions belong to one review unit — gating one without the other is what round-3 shipped"
  - "Branch-parity measurement: when a conditional's arms diverge, every arm gets a driven case and the falsification run must show the untouched arms stay GREEN"
  - "Two operator-facing statements of one mechanism are corrected in the same edit and carry the same greppable dated marker, so they cannot drift apart again"

requirements-completed: []

coverage:
  - id: D1
    description: "Pressing `Cert WC` during an endless run below `level-03` arms nothing — zero injections at the press, and zero across a full `Lv` walk to `level-03` on the campaign session that follows"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#while endless below level-03, Cert WC arms nothing — a later campaign walk to level-03 never injects (gap 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pressing `Cert WC` during an endless run ALREADY on `level-03` also arms nothing — the deferral that would have discharged into the restarted endless run is suppressed"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#while endless already on level-03, Cert WC injects nothing either — the deferral that WOULD have discharged is suppressed (gap 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The CAMPAIGN cert harness is undamaged: a press below `level-03` with the tier unset arms the deferral and discharges it exactly once, with both preconditions observed to have settled first"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a CAMPAIGN press below level-03 still arms the deferral and discharges it exactly once"
        status: pass
    human_judgment: false
  - id: D4
    description: "The CAMPAIGN direct path is undamaged: a press already at `level-03` with the tier Mid injects exactly once with no deferral involved"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a CAMPAIGN press already at level-03 with the tier Mid injects exactly once, with nothing deferred"
        status: pass
    human_judgment: false
  - id: D5
    description: "11-14's freeze fix does not regress: the endless tier-already-Mid press still injects exactly once onto the live board, the run stays live at its wave, the level is unchanged, nothing is recorded and no `setActive(false)` fires"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#with the tier already Mid, Cert WC leaves the endless run live and the level unchanged"
        status: pass
    human_judgment: false
  - id: D6
    description: "The deferral arm is pinned at source — it carries the run-mode term, no bare unconditional arm survives, and 11-14's single level-forcing call is unmoved; the extraction is asserted non-empty first"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#runCertWorstCase parsed — the harness itself is honest"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the pending-cert arm carries the run-mode term (gap 2)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#exactly one level-forcing call remains (11-14 count, unmoved)"
        status: pass
    human_judgment: false
  - id: D7
    description: "An operator reading `docs/ops/ENDLESS-MODE.md` § Limits item 2 is told the truth about `Cert WC` on both branches — the injection claim is scoped to the tier-already-Mid branch, the other branch is stated to inject nothing and to be disqualified for the record-and-restart reason instead"
    requirement: "N-END-03"
    verification:
      - kind: manual_procedural
        ref: "grep gate: round4-markers=2, boundary-table-rows=9, boundary-table-certwc=1, restart-instruction=1, do-not-press-warning=1, open-markers=3, glow-atlas-withdrawal=1"
        status: pass
    human_judgment: true
    rationale: "The gates prove the markers, the counts and that nothing protected was disturbed. They cannot prove that the prose correctly informs a human operator taking the SC-5 reading — that is the judgment the sentence-by-sentence read-through below exists to support, and it is a human's call."
  - id: D8
    description: "The `Cert WC` run-boundary table row says the same thing as § Limits item 2 on both branches and carries the same dated marker, so the two operator-facing locations cannot drift apart"
    verification:
      - kind: manual_procedural
        ref: "grep gate: boundary-table-rows=9, boundary-table-certwc=1, round4-markers=2 (one in each location)"
        status: pass
    human_judgment: true
    rationale: "Sameness of MEANING between two prose statements is not mechanically checkable; the gate only proves both locations were edited in the same commit and both carry the marker."
  - id: D9
    description: "SC-5's device half — no frame spike outside the Mid budget across an endless wave transition — remains UNMEASURED and is not claimed by this plan"
    requirement: "N-END-03"
    verification: []
    human_judgment: true
    rationale: "No automated step in this repo can measure a frame on hardware. § Limits item 2 stays OPEN, `behavior_unverified` stays at 1, and N-END-03's unchecked box is correct. This plan repaired the instrument; it did not take the reading."

duration: 10 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 16: Cert WC's deferral carries a run-mode term Summary

**One boolean term on `runCertWorstCase`'s deferral arm kills the cross-mode one-shot 11-14 stranded, six driven cases now cover every branch of the control, and `docs/ops/ENDLESS-MODE.md` states its injection claim only for the branch it was measured true of — in both operator-facing locations, dated.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-26T11:17:41Z
- **Completed:** 2026-09-26T11:27:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **The hazard is deleted, not described.** `certPendingRef.current = modeRef.current !== 'endless';` — an endless press now arms no deferral at all, so nothing can discharge onto a session that never asked for it.
- **Both endless sub-branches were MEASURED before anything changed**, and the second one contradicted nobody but had never been looked at. See the Step-0 readings below; the plan's derivation for it was confirmed exactly.
- **Six cases in the `Cert WC` describe now cover every branch of the control** — endless below `level-03`, endless already on `level-03`, endless tier-already-Mid, campaign deferred, campaign direct, and 11-14's boundary case.
- **The campaign cert harness was not collateral damage:** C1 and C2 both inject exactly once, and both stay GREEN under the mutation that turns the endless cases red.
- **The ops document's injection sentence is scoped by branch** and the boundary-table row was corrected in the same commit with the same greppable marker.

## Step-0 pre-fix measurements (taken against UNCHANGED source, before Task 1 Step B)

Both readings were taken with the loop mock's `injectCertWorstCase` already converted to a spy (Task 1 Step A) and with the source otherwise untouched. Raw observed values, quoted:

**Sub-branch (i) — endless at W2 on `level-01`, tier Auto** (the verifier's P6/P7, reproduced):

```
{"atPressA":0,"recA":1,
 "argA":"{\"mode\":\"endless\",\"wave\":2,\"score\":1200,\"outcome\":\"abandoned\", ...}",
 "waveA":"W1",
 "walk":["Switch level, current level-04 inject=0",
         "Switch level, current level-05 inject=0",
         "Switch level, current level-06 inject=0",
         "Switch level, current level-03 inject=1"]}
```

Zero injections at the press; the run correctly recorded `{mode:'endless', wave:2, outcome:'abandoned'}` and restarted at `W1`; then **exactly one `injectCertWorstCase` on walk step 4**, on a campaign `level-03` session that never pressed the button. The verifier's reproduction holds to the call.

**Sub-branch (ii) — endless at W2 started from `level-03`, tier Auto** (never measured by any prior round):

```
{"lvBefore":"Switch level, current level-03",
 "tierBefore":"Force quality tier, current Auto mid",
 "atPressB":1,"recB":1,
 "argB":"{\"mode\":\"endless\",\"wave\":2,\"score\":1200,\"outcome\":\"abandoned\", ...}",
 "waveB":"W1","lvAfter":"Switch level, current level-03"}
```

**One injection at the press.** The deferral was NOT stranded here: the tier half's remount restarts the endless run in place, leaves the session on `level-03` with the tier now Mid, and the one-shot discharged the pathological load onto the freshly restarted wave-1 endless board. The plan's derivation — from the consumer effect's preconditions and the shipped default `LevelId` — was confirmed by measurement rather than assumed. **The review's one-liner therefore is not a no-op on this branch; it suppresses a real discharge,** and that is now written down at the assignment, in § Limits item 2, and here.

## Task Commits

1. **Task 1 (RED): make the injection observable + both endless sub-branch cases** — `c431277` (test)
2. **Task 1 (GREEN): the run-mode term on the deferral arm** — `6b7ab63` (feat)
3. **Task 2: campaign cases, the E3 extension and the source contract** — `e54c691` (test)
4. **Task 3: the branch-scoped ops-document correction** — `f81c6b3` (docs)

Task 1 needed no REFACTOR commit — the change is one expression and one comment block.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — `runCertWorstCase`'s `defer` branch arms `certPendingRef` with `modeRef.current !== 'endless'` instead of `true`, with a `//`-only comment carrying both measurements and the general rule. The `return;` after it, the direct `injectCertWorstCase()` below it, the level half, the tier half, the `CERT_HARNESS` early return, the dependency array and the consumer effect are all unchanged.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — `injectCertWorstCase` becomes a module-level `vi.fn()` cleared in all six places the other loop spies are cleared; `settle()`, `levelSwitchLabel()` and `pressLevelSwitch()` helpers; `mountAndStartEndless` takes a `levelId`; four new cases and one extended case.
- `tests/ui/PlayingHost.endless-host.test.ts` — a `runCertWorstCase — the deferral arm (round-4 gap 2)` describe: extraction honesty, the run-mode-term assertion plus a negative assertion that no bare arm survives, and 11-14's level-forcing call count of one.
- `docs/ops/ENDLESS-MODE.md` — the § Limits item 2 `Cert WC` lead-in, a dated `Re-scoped 2026-09-26 (round 4)` sub-note, and the `Cert WC` run-boundary table row.

## TDD Gate Compliance

| Task | RED | GREEN | REFACTOR | Status |
|------|-----|-------|----------|--------|
| 1 | ✓ `c431277` | ✓ `6b7ab63` | — (not needed) | Pass |
| 2 | ✓ (mutation run, `RED_EVIDENCE_OK`) | ✓ `e54c691` | — | Pass |
| 3 | n/a (`type="auto"`, docs) | n/a | n/a | n/a |

**RED evidence records, all verified `RED_EVIDENCE_OK` by `gsd_run check tdd-red-evidence`:**

- Task 1, target `tests/ui/PlayingHost.endless-retry.test.tsx > … > while endless below level-03, Cert WC arms nothing — a later campaign walk to level-03 never injects (gap 2)` — exit 1, 27 tests / 25 pass / 2 fail. Expected 0 injections after the walk; actual exactly 1, on walk step 4.
- Task 1, second target `… > while endless already on level-03, Cert WC injects nothing either …` — same run, exit 1. Expected 0 at the press; actual 1, the deferral discharging into the restarted endless run.
- Task 2, target `tests/ui/PlayingHost.endless-host.test.ts > … > the pending-cert arm carries the run-mode term (gap 2)` — exit 1, 54 tests / 51 pass / 3 fail. Task 2 is test-only and Task 1's fix had already landed, so the RED phase is the mutation run (the same convention 11-15 used).

Method note, carried from 11-15: the checker's TAP parser wants node-`--test` style summary lines, and vitest's default `tap` reporter emits only file-level results (classified `fixture_or_load_failure`). All three records use `--reporter=tap-flat` for genuine per-test `not ok N - …` lines with the three summary counts computed mechanically from that same output. **One further detail learned this round:** `targetTest` must be the FULL TAP test name including the `tests/…` file prefix — the bare `describe > it` name is classified `no_target_test_failure` even when that exact test is in the parsed `failing_tests` list.

## Falsification runs (both mandatory, observed output quoted)

**Task 1 falsification** — mutate `certPendingRef.current = modeRef.current !== 'endless';` back to `certPendingRef.current = true;`, run `npx vitest run tests/ui/PlayingHost.endless-retry.test.tsx`:

```
not ok 26 - … while endless below level-03, Cert WC arms nothing …
    actual:   "… level-06 inject=0 | Switch level, current level-03 inject=1"
    expected: "… level-06 inject=0 | Switch level, current level-03 inject=0"
not ok 27 - … while endless already on level-03, Cert WC injects nothing either …
    message: "measured pre-fix: 1 — the deferral discharged into the freshly restarted
              endless run: expected \"vi.fn()\" to be called +0 times, but got 1 times"
```

Test 1 fails at **exactly one** `injectCertWorstCase` call landing on walk step 4, as the plan required. Test 2 fails at **exactly one** call at the press — matching its Step-0 reading for that branch precisely. Term restored; 27/27 green.

**Task 2 falsification** — same mutation, run across both files:

```
ok      49 - … with the tier UNSET, Cert WC still records the run … (P3)
ok      50 - … with the tier already Mid, Cert WC leaves the endless run live …   <- E3, GREEN
not ok  51 - … while endless below level-03, Cert WC arms nothing …              <- Task 1 Test 1, RED
not ok  52 - … while endless already on level-03, Cert WC injects nothing either  <- Task 1 Test 2, RED
ok      53 - … a CAMPAIGN press below level-03 still arms the deferral …          <- C1, GREEN
ok      54 - … a CAMPAIGN press already at level-03 with the tier Mid …           <- C2, GREEN
not ok  24 - … the pending-cert arm carries the run-mode term (gap 2)             <- source contract, RED
```

C1, C2 and E3 all stay GREEN under the mutation — they are the sides of the condition it does not touch, exactly as required. A campaign case that had gone red there would have been testing the wrong thing. Term restored; 54/54 green.

## Operator read-through of § Limits item 2, sentence by sentence

Read end to end as an operator taking the SC-5 reading would. Each sentence of the `Cert WC` bullet and its sub-bullets, with the measurement that backs it:

**Lead-in (rewritten this task):**

| Sentence | Backing measurement |
|---|---|
| "`Cert WC` is hazardous on **both** of its branches, but the injection claim this bullet used to open with unconditionally is true of only ONE of them" | The contrast between D5 (1 injection) and D1/D2 (0 injections) — the two figures that make the old sentence false for half its subject |
| "when the forced tier is ALREADY `mid` the press **injects the worst-case load onto the board under measurement** — measured `injectCertWorstCase` 0 → 1, with the run still live" | Task 2 case E3: `injectCertWorstCase` at exactly 1, readout still `W2`, level still `level-01`, `recordRunEnd` 0, no `setActive(false)` |
| "that injection alone disqualifies any frame time captured across it, because it is a deliberately pathological frame rather than a wave transition" | Operator JUDGMENT carried verbatim from the pre-existing text, resting on the 0 → 1 measurement above plus what `injectCertWorstCase` is (multi-ball + particles + shake). Not a new mechanism claim; flagged as judgment rather than measurement |
| "When the tier is NOT already `mid` the function **returns at its `defer` branch before the injection and injects NOTHING** (measured 0 → 0)" | Task 1 Test 1 and Test 2: `injectCertWorstCase` at 0 at the press on both endless sub-branches (and 0 at the press pre-fix on sub-branch (i) too) |
| "The reading is disqualified on that branch too, but for the different reason the first sub-bullet below already gives — the run under measurement was recorded `abandoned` and restarted at wave 1" | Task 1 Test 1/Test 2: one `recordRunEnd` with `{mode:'endless', wave:2, outcome:'abandoned'}`, readout back at `W1`, fresh board fingerprint |

**Sub-bullet 1, the tier-not-Mid branch (pre-existing text, re-measured this round):** "the run is recorded `abandoned` … restarted at wave 1 … `W2` → `W1`, `recordRunEnd` called once with `{mode:'endless', wave:2, outcome:'abandoned'}`" — backed by Task 1 Test 1, which reproduces all four figures.

**Sub-bullet 1's `Re-scoped 2026-09-26 (round 4)` note (new this task):**

| Sentence | Backing measurement |
|---|---|
| "Before this round that branch also left an **armed one-shot** behind it. The press injected nothing, as above" | Step-0 sub-branch (i): `atPressA = 0` |
| "Starting **below `level-03`**: 0 injections at the press, and then **exactly one on a later campaign session that never pressed the button**, fired by walking the `Lv` control forward to `level-03`" | Step-0 sub-branch (i) walk trace: `level-04 inject=0 / level-05 inject=0 / level-06 inject=0 / level-03 inject=1` |
| "Starting **already on `level-03`** — the shipped default level … the restarted endless run satisfied the deferral's own preconditions itself and took the injection, one, onto the fresh wave-1 board" | Step-0 sub-branch (ii): `atPressB = 1`, `waveB = W1`, `lvAfter = level-03`. Phase 08 D-06 supplies the "shipped default" fact |
| "Since this round **an endless press arms no deferral at all** … this branch now leaves nothing behind on either: measured **0 injections at the press and 0 across the whole `Lv` walk**" | Task 1 Test 1 (0 at the press, 0 across all four walk steps) and Test 2 (0 at the press), both green post-fix |

**Sub-bullet 2, the tier-already-Mid branch (pre-existing text, unchanged):** "the readout stayed at `W2`, the level-switch control still named `level-01`, `recordRunEnd` was **not** called, the frame loop was **not** stopped … it survives it carrying the injected worst-case load" — every clause backed by Task 2 case E3, which re-measured all five figures including the new injection count of 1.

**No sentence in the bullet or its sub-bullets is left without a backing measurement.** The one that is judgment rather than measurement (the "disqualifies any frame time" inference) is identified as such above and rests on a measured figure.

## Decisions Made

- **Adopt the review's shape, but only after measuring both sub-branches.** The measurement changed what the change MEANS: on the `level-03` sub-branch it suppresses a real discharge rather than clearing a stranded flag. Shipping the one-liner without that measurement would have been a silent behaviour change on the shipped default level.
- **Case C1 fires in jsdom — the flagged-assumption escape hatch was not used.** The plan permitted downgrading C1 to an unprovable-in-jsdom assumption if the consumer effect could not settle. It settles: `settle()` runs the timers three times and both preconditions are observed as rendered labels (`Lv` reads `level-03`, tier reads Mid) BEFORE the count is asserted, so the pass is not vacuous. `must_haves` truth 3 stands as written, verified by behaviour and not by a source count.
- **`requirements-completed` is empty by design.** See key-decisions; the plan's own frozen-tree gate forbids touching `.planning/REQUIREMENTS.md` this round.
- **No REFACTOR commit for Task 1.** The GREEN change is one expression; there was nothing to clean up, and the TDD reference commits REFACTOR only on change.

## Deviations from Plan

None — plan executed exactly as written.

Three plan-permitted branch points were resolved and are recorded rather than treated as deviations:

1. The plan required Step 0 to be MEASURED and said "if the measurement contradicts the derivation, the plan's text is wrong and the measurement wins." It did not contradict it: sub-branch (ii) behaved exactly as derived (1 injection, discharged into the restarted endless run).
2. The plan permitted Case C1 to be recorded as unprovable in jsdom. It proved out; the fallback was not taken.
3. The plan's Task 2 Step A said each new case's comment must name the branch it covers. All four new cases and the E3 extension carry that comment.

## Issues Encountered

- **`gsd_run check tdd-red-evidence` rejected a correct RED record with `no_target_test_failure`.** The record's `targetTest` was the `describe > it` name; the parsed `failing_tests` list contains the same test prefixed with its file path, and the checker compares the full string. Resolved by using the full TAP name. Worth carrying forward — the evidence block already showed the target test failing, so the rejection looked like a harness bug rather than a record defect.
- **`console.log` output from a vitest case is not surfaced by any reporter this run tried** (`tap-flat`, default, `--silent=false`). The Step-0 measurements were extracted instead by forcing a deliberate assertion failure whose `Received` value carried the JSON payload — a throwaway `MEASURE-ONLY` case that was deleted before the RED commit and never entered git history.

## Scope fences — all held

- `applyChrome`, `runEndedRef` and every one of 11-15's new cases — untouched.
- `.planning/REQUIREMENTS.md` — untouched. `requirements-touched-this-round=0`, `n-end-unticked=3`.
- The glow-atlas withdrawal at § Limits item 2, § Limits item 7, the bake path, `ENDLESS_BRICK_DIMS` — untouched. `bake-calls=1`, `glow-atlas-withdrawal=1`.
- The bolded record-first sentence, its 2026-09-26 correction and the `Cert WC` counterexample block — untouched.
- `src/core`, `src/levelgen` — untouched. `frozen-tree-diff=0`.
- The level half, the tier half, the `CERT_HARNESS` early return, the dependency array and the consumer effect of `runCertWorstCase` — untouched.
- No block comment inside `runCertWorstCase`; every comment there is `//`. No literal that Task 2's contract counts (`setLevelId('level-03')`) is restated in prose anywhere inside it — the new comment says "the dev row's level control" and "where the consumer effect wants it" precisely to avoid that, and the gate reads 1.
- The three round-3 advisories (WR-03, the two `ReadonlyArray<T>` lint warnings, `codeOnly()` vs block comments) — NOT fixed, as instructed. The lint run still prints exactly those two warnings and zero errors.
- Plans 11-01 … 11-15 and every existing SUMMARY — untouched.

## Verification results

| Gate | Required | Observed |
|---|---|---|
| `npx vitest run` on both test files | green | 54 passed, 0 failed |
| `npm test` | green | 97 files / **645 tests passed**, all four `assert-*.mjs` OK, exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run lint` | no line containing "error" | `✖ 2 problems (0 errors, 2 warnings)` — the two pre-existing round-3 advisory warnings |
| `mode-termed-arm` | 1 | 1 |
| `loop-mock-uses-spy` | ≥ 1 | 4 |
| `cert-wc-cases` | ≥ 5 (pre-task 2) | 6 |
| `round4-markers` | ≥ 2 | 2 |
| `boundary-table-rows` | 9 | 9 |
| `boundary-table-certwc` | 1 | 1 |
| `restart-instruction` | 1 | 1 |
| `do-not-press-warning` | 1 | 1 |
| `open-markers` | 3 | 3 |
| `glow-atlas-withdrawal` | ≥ 1 | 1 |
| `freeze-git-status` / `req-git-status` | 0 / 0 | 0 / 0 |
| `frozen-tree-diff` | 0 | 0 |
| `requirements-touched-this-round` | 0 | 0 |
| `bake-calls` | 1 | 1 |
| `n-end-unticked` | 3 | 3 |

## Self-Check: PASSED

- `app/_components/PlayingHost.tsx` — FOUND, `mode-termed-arm=1`.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — FOUND, `cert-wc-cases=6`.
- `tests/ui/PlayingHost.endless-host.test.ts` — FOUND, the new describe's three cases pass.
- `docs/ops/ENDLESS-MODE.md` — FOUND, `round4-markers=2`.
- Commits `c431277`, `6b7ab63`, `e54c691`, `f81c6b3` — all FOUND in `git log`.
- `git rev-list --count 0ff6fac..HEAD` = 5 (four task commits plus this plan-metadata commit), matching `actuals.commits`.

## Known Stubs

None. No placeholder value, empty-collection default, TODO or FIXME was introduced by this plan. The one throwaway instrument (the `MEASURE-ONLY` case) was removed before the first commit and is not in git history.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The plan's `mitigate` rows are discharged as follows:

- **T-11-36** (arming on a precondition made unreachable) — Task 1's term; D1, D2 and D6; both falsification runs.
- **T-11-37** (a false operator-facing mechanism claim) — Task 3; D7 and D8; the sentence-by-sentence read-through above.
- **T-11-38** (a deferred injection discharging into a session that never requested it) — D1, whose falsifier is the measured single call on walk step 4.
- **T-11-39** (closing the endless hazard by breaking the campaign harness) — D3 and D4, both required to stay GREEN under the mutation and observed GREEN.
- **T-11-40** (the unenumerated second endless sub-branch) — Step-0 sub-branch (ii), measured for the first time by any round, and D2.
- **T-11-41** (a documentation sentence with no measurement behind it) — the read-through table above; the single judgment sentence is identified as judgment.
- **T-11-42** (a prose comment satisfying a structural contract) — `//`-only throughout `runCertWorstCase`; the counted literal is not restated; the gate reads 1.
- **T-11-43** (closing the SC-5 OPEN block or recording an untaken reading) — `open-markers=3`, `restart-instruction=1`, `n-end-unticked=3`.
- **T-11-SC** stays `accept`: this plan installed no package and ran no package-manager command.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Round-4 gap 2 is closed at both ends.** The code no longer arms a deferral it cannot discharge, on either endless sub-branch, and the ops document states the injection claim only for the branch it was measured true of, in both operator-facing locations.
- **Every branch of `Cert WC` now has a driven case.** A future change to that control that breaks any one of them is red at the introducing commit.
- **Still open, unchanged by this plan:** the SC-5 device frame-budget half of N-END-03. `behavior_unverified` stays at 1, § Limits item 2 stays OPEN, and N-END-03's box stays unchecked. The discharge procedure in that block is now trustworthy on both `Cert WC` branches, which is the whole point of this plan.
- **N-END-01 and N-END-02 remain unticked in `.planning/REQUIREMENTS.md` by design.** Round-4 verification moves them.
- **For the next round:** the `11-UI-SPEC` E5 `error` row is still ⚠ unresolved, and the tier button's behaviour in endless remains defined by consequence (`remountDevSession` → `startEndlessRun`) rather than by contract. No artifact in this phase states an intended contract for it; writing one would be inventing an owner decision.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*
