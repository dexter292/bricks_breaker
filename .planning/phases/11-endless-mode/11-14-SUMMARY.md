---
phase: 11-endless-mode
plan: 14
subsystem: ui
tags: [react, dev-tools, endless, docs, ops, tdd, vitest]

# Dependency graph
requires:
  - phase: 11-endless-mode (11-12)
    provides: the getBestForLevel preload guard — the PUBLICATION end of the cross-mode record defect this plan shuts at the TRIGGER end
  - phase: 11-endless-mode (11-13)
    provides: the ended-run latch; its test file must stay green through this plan's change
  - phase: 11-endless-mode (11-11)
    provides: docs/ops/ENDLESS-MODE.md § Limits item 2 and the run-boundary table — the two artifacts this plan corrects and completes
provides:
  - "`runCertWorstCase` gates its `setLevelId` half on the run mode — the last __DEV__ control with no mode term now has one"
  - "two behaviour cases pinning both `tierOverride` branches of `Cert WC` during a live endless run"
  - "an SC-5 discharge procedure with no false mechanism in it: the withdrawn glow-atlas claim is described, dated and replaced by the real `loadKey` keying"
  - "a complete run-boundary table — every control that can end, freeze or restart an endless run now has a row"
  - "the record-first invariant carries its own `Cert WC` counterexample analysis"
  - "11-11-SUMMARY.md's two claims of a verification that did not happen, corrected in place beside the originals"
affects: [phase-14-endless-production-entry, sc5-device-reading, endless-mode-ops-doc]

# Actuals (#2632) — same estimateTokens scale (chars/4 over the realized diff).
actuals:
  tokens: 5682
  tasks: 3
  commits: 6
plan_head_before: 6cea0ef6f7944af75f0aa29b8ade5e313a015dc3

tech-stack:
  added: []
  patterns:
    - "Every __DEV__ control that mutates run-scoped state carries a mode term; `Cert WC` was the last one without"
    - "A mechanism claim written into an operator-facing procedure must be MEASURED in the round that writes it, never inherited from a plan's prose or from a verification report describing pre-fix behaviour"
    - "A SUMMARY that asserted a verification which did not happen is corrected BESIDE the original claim, never repaired in place"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - docs/ops/ENDLESS-MODE.md
    - .planning/phases/11-endless-mode/11-11-SUMMARY.md

key-decisions:
  - "The mode term gates the LEVEL half only. The tier half is deliberately left alone: a tier change is a real, funnel-covered run boundary that `startEndlessRun` already records, and gating it would be the `disable Cert WC while endless` option the owner rejected on 2026-09-26 as inconsistent with how A-02 was resolved for `Lv` next door (an explicit exit, not a dead button)."
  - "The gate is explained in `//` LINE comments only. `codeOnly()` in tests/ui/PlayingHost.endless-host.test.ts strips `//` but not `/** */`, so a block comment here could satisfy or falsify a source contract with prose."
  - "The comment does not restate `setLevelId('level-03')` in prose. Written the obvious way it did, and the plan's own structural gate counted 2 where it requires exactly 1 — the gate measures the literal, so the prose must not reproduce it. Caught by running the gate, not by reading it."
  - "Task 1 Test 1 (`tier UNSET`) turned out to be RED too, not the regression pin the plan expected. Pre-fix the press DID record the run (the verifier's P3 holds) but could NOT reach W1: the level half had already flipped `levelId`, so `fxReady` was false when `startEndlessRun` ran its readiness gate and the restart fell through to `failEndlessStart`. Recorded as measured rather than reconciled against the verifier's pre-fix numbers."
  - "`Cert WC` stays in the SC-5 do-not-press set. The level half was only one of its reasons; it still injects the worst-case ball, particle and shake load onto the board under measurement, which disqualifies any frame time captured across it in BOTH tier branches. Removing it on the strength of the gated level half alone would have been the dropped-hazard failure the plan forbids."
  - "REQUIREMENTS.md was not touched and N-END-03 was not ticked, even though it appears in this plan's `requirements` frontmatter. The SC-5 device half is unmeasured and no task here took, claimed or inferred a reading; `requirements-completed` therefore lists N-END-01 only."

patterns-established:
  - "Falsification as an executed step, not a claim: the mode term was REMOVED, the target case re-run and confirmed failing on the level label, and the term restored — the evidence is in this SUMMARY and in the RED commit."
  - "Measure first, then write the doc. Task 1's measurement table is the ONLY permitted source for every Cert WC mechanism claim in Tasks 2 and 3."

requirements-completed: [N-END-01]

coverage:
  - id: D1
    description: "`runCertWorstCase` carries a mode term: its level-forcing half does not fire while the player is in endless, removing the deterministic, race-free trigger for a cross-mode record publication and the stranded-run freeze it produced"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#with the tier already Mid, Cert WC leaves the endless run live and the level unchanged"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#with the tier UNSET, Cert WC still records the run at the wave it reached and restarts at wave 1 (P3)"
        status: pass
      - kind: other
        ref: "sed-anchored structural gate: certwc-mode-terms=2 (>=1), certwc-setlevel-calls=1"
        status: pass
    human_judgment: false
  - id: D2
    description: "11-12's preload guard and 11-13's run-boundary latch stay green through the change"
    verification:
      - kind: unit
        ref: "npx vitest run tests/ui/PlayingHost.endless-retry.test.tsx tests/ui/PlayingHost.endless-record.test.tsx tests/ui/PlayingHost.endless-host.test.ts — 67/67"
        status: pass
      - kind: integration
        ref: "npm test — 97 files, 633 tests, plus the four assert-*.mjs scripts"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/ops/ENDLESS-MODE.md § Limits item 2 states only mechanisms the shipped code implements: the withdrawn glow-atlas claim is gone file-wide, described rather than reproduced in a dated amendment, and the real `loadKey` keying stands where it did"
    verification:
      - kind: other
        ref: "withdrawn-mechanism-hits=0; donotpress-region-lines=56; donotpress-loadkey-mentions=2; donotpress-certwc-mentions=5; sc5-open-block=1"
        status: pass
    human_judgment: true
    rationale: "The grep gate proves the false wording is absent and the true key is named, but whether a human operator standing at the device reads the rewritten procedure and takes the RIGHT action is a judgment about operator-facing prose that no automated check can make. This is the block the whole gap exists about."
  - id: D4
    description: "The run-boundary table lists every control that can end, freeze or restart an endless run, `Cert WC` included, and the record-first invariant carries the counterexample analysis that lets it survive that row"
    verification:
      - kind: other
        ref: "boundary-table-rows=9; boundary-table-certwc=1"
        status: pass
    human_judgment: false
  - id: D5
    description: "11-11-SUMMARY.md's two assertions of a verification that did not happen each carry a dated correction, with the original text still visible"
    verification:
      - kind: other
        ref: "grep -c 'CORRECTION 2026-09-26' .planning/phases/11-endless-mode/11-11-SUMMARY.md = 2"
        status: pass
    human_judgment: false
  - id: D6
    description: "The SC-5 OPEN block survives intact — still OPEN, still naming the Mid budget and its four failure signatures, still recording the stretched halo as expected and accepted; no reading was taken, claimed or inferred"
    verification:
      - kind: other
        ref: "grep -c 'Device digest: OPEN' = 1; Mid budget line unchanged; N-END-03 still unchecked; REQUIREMENTS.md untouched by this plan"
        status: pass
    human_judgment: true
    rationale: "The gate proves the block was not closed or reworded. That the phase genuinely did not fabricate a device reading is a negative claim about intent that a human should confirm, and the SC-5 device half stays behavior_unverified regardless."

# Metrics
duration: 9 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 14: Cert WC gets a mode term, and the SC-5 procedure stops lying Summary

**One mode term in `runCertWorstCase` closes the trigger end of the cross-mode record defect 11-12 guarded at the publication end, and the operator-facing SC-5 discharge procedure is rewritten from measurements taken after that change rather than from a prior round's prose.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-26T09:42:32Z
- **Completed:** 2026-09-26T09:51:16Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **The last `__DEV__` control with no mode term has one.** `runCertWorstCase`'s `setLevelId` half now fires only when `modeRef.current !== 'endless'`. That call was the last deterministic, race-free trigger for a campaign per-level best being published into the endless `best` prop — the defect `11-12` guarded at the publication end. Both ends are now shut.
- **Two behaviour cases pin both `tierOverride` branches** of the control during a live endless run, driven through the real host.
- **The SC-5 discharge procedure no longer tells a human to discard a valid reading for a cause that does not exist.** Two mechanism claims were withdrawn, a dated amendment describes (rather than reproduces) the withdrawn phrasing, and the true keying now stands in its place: `loadKey` is the compiled brick width and height alone, the bake effect's dependency array carries no tier term, and the measured `bakeGlowSprites` call count across a tier press is 1 before and 1 after.
- **Neither control left the do-not-press set.** The tier button still restarts the run under measurement; `Cert WC` still injects the worst-case load onto the board being measured. The warning was narrowed by reason, not by control.
- **The boundary table is complete** and the bolded record-first invariant now carries its own `Cert WC` counterexample analysis, so the next reader finds it already considered.
- **`11-11-SUMMARY.md` says, beside each of its two claims, that the verification it asserted did not happen** — with the original text left visible.

## The measurement table (Task 1 Step C)

Both rows measured on 2026-09-26 against the POST-fix code, from a live endless run at wave 2 on `level-01`, via a throwaway instrumented case run in the real host harness (removed before commit; it is not in the repo).

| | branch A: tier NOT already Mid | branch B: tier already Mid |
|---|---|---|
| `recordRunEnd` calls | **1** | **0** |
| `recordRunEnd` args | `{mode:'endless', wave:2, score:1200, outcome:'abandoned', livesRemaining:3}` | — |
| wave readout before → after | `W2` → **`W1`** | `W2` → **`W2`** |
| `result` after | `null` | `null` |
| `setActive` calls during the press | `[true]` | **none at all** |
| last `setActive` argument | `true` | *(no call)* |
| level-switch label changed? | **no** (`level-01` before and after) | **no** (`level-01` before and after) |
| lives / score after | 3 / 0 (new run) | 3 / 1200 (run continues) |

**Two surprises, recorded as measured rather than reconciled against the verifier's pre-fix numbers:**

1. **Branch A was RED too.** The plan framed Test 1 as a regression pin on the verifier's P3. Pre-fix it failed — not on the record (the funnel *did* fire, one call, `{endless, wave 2, abandoned}`, exactly as P3 says) but on the restart: the level half had already flipped `levelId` to `level-03`, so `fxReady` was false when `startEndlessRun` reached its readiness gate and the restart fell through to `failEndlessStart()`. The readout never reached `W1`. Post-fix it does. So the gate did not merely preserve branch A, it **repaired** it.
2. **Branch B makes no `setActive` call whatsoever** — not `false`, not `true`. Pre-fix the level switch re-entered the bake effect, whose `setActiveRef.current(false)` stopped the frame loop behind a live HUD with nothing recorded. Post-fix the press is inert with respect to the loop.

## Falsification check (run, not claimed)

Required by Task 1's acceptance criteria and executed twice, in both directions:

- **As RED, before the fix existed.** `npx vitest run tests/ui/PlayingHost.endless-retry.test.tsx` → exit 1, 22 tests, 20 pass, 2 fail. Target case *"with the tier already Mid, Cert WC leaves the endless run live and the level unchanged"* failed on its own assertion: `expected <button aria-label="Switch level, current level-03"> to be null`. Classified `RED_EVIDENCE_OK` / `target_test_failed` by `gsd-tools check tdd-red-evidence` (the nested-TAP transcription workaround this repo requires was used; see the project memory note on vitest RED evidence).
- **As an explicit removal, after the fix.** The `modeRef.current !== 'endless' &&` term was deleted from the live tree, the file re-run: both new cases failed again, the target one with the level label reading `level-03` after the press. The term was then restored and the full chain re-run green.

## Task Commits

1. **Task 1 — RED:** `837e67b` (test) — both behaviour cases, failing
2. **Task 1 — GREEN:** `f139295` (feat) — the mode term in `runCertWorstCase`
3. **Task 2:** `17f80f6` (docs) — § Limits item 2 loses its false glow-atlas mechanism
4. **Task 3:** `2210465` (docs) — the `Cert WC` boundary row, the record-first reasoning, both `11-11-SUMMARY.md` corrections

No REFACTOR commit: the change is a single conjunct in an existing condition and there was nothing to clean up.

## TDD Gate Compliance

| Gate | Commit | Status |
|---|---|---|
| RED | `837e67b` `test(11-14): …` | Pass — target test failed on its own assertion, `RED_EVIDENCE_OK` |
| GREEN | `f139295` `feat(11-14): …` | Pass — 67/67 on the three endless host suites |
| REFACTOR | — | Not applicable, no cleanup warranted |

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — one conjunct added to `runCertWorstCase`'s level gate, plus the line-comment block recording why the gate exists, why it costs nothing, and the owner decision behind it
- `tests/ui/PlayingHost.endless-retry.test.tsx` — a new describe block with the two `Cert WC` behaviour cases
- `docs/ops/ENDLESS-MODE.md` — § Limits item 2's do-not-press block rewritten with the withdrawn claim and its dated amendment; the `Cert WC` run-boundary row; the record-first counterexample blockquote
- `.planning/phases/11-endless-mode/11-11-SUMMARY.md` — two `CORRECTION 2026-09-26` notes, originals left intact

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing ones:

- Gate the **level** half only; leave the tier half alone (owner decision 2026-09-26, not re-opened here).
- Line comments only inside `runCertWorstCase`, and no prose restatement of the literal the structural gate counts.
- `Cert WC` stays in the do-not-press set — the injected worst-case load is a hazard in both branches, independent of the level half.
- REQUIREMENTS.md untouched; `N-END-03` stays unchecked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The explanatory comment broke the plan's own structural gate**

- **Found during:** Task 1 (after the GREEN implementation, while running the `<verify>` chain)
- **Issue:** The comment explaining the gate named `setLevelId('level-03')` in prose. The plan's second `<automated>` gate counts that literal inside the `runCertWorstCase` region and requires exactly `1`; it measured `2` and exited non-zero. A gate that counts a literal cannot tell code from prose.
- **Fix:** Reworded the comment to refer to "the level-forcing call below", with an explicit note telling future editors not to restate it. The code is unchanged.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `certwc-mode-terms=2`, `certwc-setlevel-calls=1`, gate exits 0.
- **Committed in:** `f139295` (folded into the GREEN commit, before it was made)

**2. [Documented divergence, not a fix] Test 1 was RED, not a passing regression pin**

- **Found during:** Task 1 (RED phase)
- **Issue:** The plan describes Test 1 as pinning behaviour that "must keep holding". It did not hold pre-fix — see surprise 1 in the measurement table above.
- **Fix:** None needed; the case was left exactly as specified and now passes. The divergence is recorded rather than smoothed over, per the plan's instruction to record surprises rather than reconcile them against the verifier's pre-fix numbers.
- **Verification:** RED evidence record and the post-fix green run, both above.
- **Committed in:** `837e67b` (RED) and `f139295` (GREEN)

**3. [Scope-fence divergence] `requirements-completed` omits `N-END-03`**

- **Found during:** SUMMARY authoring
- **Issue:** The plan's `requirements` frontmatter lists `[N-END-01, N-END-03]`, and the SUMMARY template requires `requirements-completed` to copy that array verbatim. The plan's own scope fence forbids ticking `N-END-03` — its frame-timing half is the unmeasured SC-5 device reading, and claiming it would be the untaken-reading failure this phase's prohibitions exist to prevent.
- **Fix:** The scope fence wins. `requirements-completed: [N-END-01]`, `.planning/REQUIREMENTS.md` untouched, `requirements.mark-complete` deliberately not run (it would have edited a file the plan's gate asserts is unchanged this round).
- **Verification:** `requirements-touched-this-round=1` (11-12's edit alone), `n-end-03-unticked=1`, `n-end-02-ticked=1`.

---

**Total deviations:** 1 auto-fixed (1 blocking) + 2 documented divergences requiring no code change
**Impact on plan:** None on scope. The auto-fix touched a comment, not behaviour. The two divergences are both cases of recording what was measured instead of what was predicted, which is the discipline this plan was written under.

## Verification Results

| Check | Result |
|---|---|
| `npm test` | **633 passed / 633**, 97 files; all four `assert-*.mjs` scripts OK |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 — 2 pre-existing warnings in `tests/ui/PlayingHost.endless-host.test.ts`, 0 errors |
| `grep -c -- "re-bake" docs/ops/ENDLESS-MODE.md` | **0** |
| do-not-press region | 56 lines; `loadKey` ×2; `Cert WC` ×5; `Lv` ×3 (unchanged from pre-task — named only in the A-02 amendment that removed it, never as a hazard) |
| `grep -c "Device digest: OPEN"` | **1** — Mid budget p50 ≤ 16.7 ms / p95 ≤ 20 ms unchanged, all four failure signatures present, accepted-halo paragraph intact |
| boundary table | **9** `\| `-prefixed lines, one naming `Cert WC` |
| `grep -c "CORRECTION 2026-09-26"` on `11-11-SUMMARY.md` | **2** |
| `git diff --name-only a20ad36..HEAD -- src/core src/levelgen` | **empty** (0 lines) — both trees still frozen |
| `grep -c "bakeGlowSprites(brickW, brickH)"` | **1** — the bake path is untouched |
| `.planning/REQUIREMENTS.md` this round | **1** changed path (11-12's edit); `N-END-01` ✓, `N-END-02` ✓, `N-END-03` ☐ |
| Task 1 structural gate | `certwc-mode-terms=2`, `certwc-setlevel-calls=1` |

## Carried-forward items (all survive this round unchanged)

- **SC-5 / the frame-timing half of `N-END-03`** stays `behavior_unverified: 1`. No reading was taken, claimed or inferred. This plan improved the *instrument* — the discharge procedure — and nothing else about it.
- **`ENDLESS_BRICK_DIMS` / the stretched halo** remains owner-accepted debt for Phase 14. This plan corrected a claim *about* the bake key without touching the bake path.
- **Both overflow backstops** (E1 Results panel, carried in 11-12; E3 HUD row, carried in 11-13) stay backstops. jsdom computes no layout.
- **The five flagged `$COVERAGE` edge-probe rows** stay recorded once, in `11-12-PLAN.md`.
- **11-UI-SPEC § UI Considerations E5 `error`** stays flagged. This plan resolved the `Cert WC` third of it by owner decision; the tier button's behaviour is left as-is (a deliberate, recorded run boundary), and no source artifact states the intended contract for the dev row as a whole.
- **A-02 for `Lv`** is DECIDED and was not re-opened; `Lv` stays out of the do-not-press set.

## Known Stubs

None. No stub, placeholder, skipped test or unrun `<verify>` was introduced by this plan. Every `<verify>` block in all three tasks was executed and its output is recorded in the Verification Results table above.

## Issues Encountered

None beyond the deviations recorded above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 11 round-3 gap closure is complete.** Gap 1's `runCertWorstCase` half (this plan) joins 11-12's publication guard and 11-13's ended-run latch; gap 2 (the document overstating the code) is closed; gap 3 was closed by 11-13.
- **The one thing still open is the SC-5 device reading**, and it is open by design. The discharge procedure a human will follow is now correct for the first time — which was the point of this plan.
- **Phase 14 inherits:** a `runCertWorstCase` whose level half is mode-gated (the dev row it lives on is scheduled for deletion, so the gate retires with it), an `ENDLESS_BRICK_DIMS` fix to make, and a production endless entry to build on `startEndlessRun`, which already owns the record-first invariant.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

All four modified files present on disk; all five commits (`837e67b`, `f139295`, `17f80f6`, `2210465`, `1f46480`) present in `git log`.
