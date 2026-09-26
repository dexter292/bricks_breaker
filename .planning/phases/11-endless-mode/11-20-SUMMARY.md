---
phase: 11-endless-mode
plan: 20
subsystem: testing
tags: [source-contract, vitest, reanimated, sharedvalue, ops-docs, cert-harness]

requires:
  - phase: 11-endless-mode (11-17)
    provides: the four artifacts carrying the falsified mechanism clause, and the measured injection count of 1 that stands
  - phase: 11-endless-mode (11-19)
    provides: the rewritten `runCertWorstCase` comment block (which had already removed one of the six clause occurrences) and the `certLevelPlanFor` predicate the block now describes
provides:
  - "tests/runtime.cert-request.test.ts — a five-link source contract over src/runtime/useGameLoop.ts proving the cert worst-case load is QUEUED on certRequest and applies on the first frame of the next run that arms the loop"
  - "An honest statement of instrument limits: the contract reads source and cannot produce a frame, and every artifact citing it says so"
  - "docs/ops/ENDLESS-MODE.md — both operator-facing locations corrected, with the SC-5 operator consequence (the press contaminates the NEXT run) stated and tied to the existing restart instruction"
  - "The `MEASURED, not derived` label struck from an assertion message where it decorated a stub count"
  - "A recorded decision NOT to change src/runtime, with both reasons and the falsification a future change would owe"
affects: [phase-14-dev-row-removal, sc-5-device-reading, endless-mode-ops]

actuals:
  tokens: 7470
  tasks: 3
  commits: 4
  plan_head_before: da1c35625124d1a9e010ceaede8ebe9370bf3fbf

tech-stack:
  added: []
  patterns:
    - "Source-contract test that states its own observational limits in its header, and is cited by name from every artifact that relies on it"
    - "Index-ordering assertions (indexOf comparisons) with per-anchor non-vacuity guards, so a drifted anchor is RED rather than vacuously green"

key-files:
  created:
    - tests/runtime.cert-request.test.ts
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - .planning/phases/11-endless-mode/11-17-SUMMARY.md
    - docs/ops/ENDLESS-MODE.md

key-decisions:
  - "src/runtime is NOT changed. Clearing certApplied at the retry-reset boundary would make the code match what the round-5 sentences already said, but no harness in this repo can drive onFrame, so the change could not be falsified this round; and because the reset block runs ABOVE the cert block on the same frame, such a reset would also swallow a request issued between a retry() and the next frame — silently disabling the deferred-inject path."
  - "The 1,400-word Cert WC table cell is deliberately NOT restructured (advisory IN-03). A compression would relocate five dated corrections away from where the SC-5 operator reads them, against this phase's beside-not-erase rule; the round-5 verifier routed rewrite-versus-patch to the owner as a human_verification item, and that option stays open."
  - "Superseded clauses are DESCRIBED rather than quoted in all four corrected files, per the round-5 decision in STATE.md: where a discriminating gate pins a false literal at 0, the verbatim record lives in git (6bb18bf) rather than in the file."
  - "Neither N-END-01 nor N-END-03 is ticked by this plan. N-END-03's device half stays unmeasured by plan prohibition; N-END-01's closure is round-5's evidence, and this plan adds none — it repairs an instruction, it does not take a reading."
  - "The corrected PlayingHost paragraph is restored rather than left absent: 11-19 had deleted the round-5 WHAT IT COSTS paragraph wholesale, which removed the false clause but also removed any statement of the cost."

patterns-established:
  - "Instrument-before-correction: the falsifiable contract is built and committed first, then every corrected statement cites it by path."
  - "A correction must name what its instrument CANNOT observe, not only what it can — the round-5 defect was a true-shaped sentence attached to evidence structurally incapable of supporting it."

requirements-completed: []

coverage:
  - id: D1
    description: "tests/runtime.cert-request.test.ts proves, link by link at source, that the cert worst-case load is queued on certRequest and consumed only inside onFrame"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#link 1: the injector applies nothing — it bumps the request and returns"
        status: pass
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#link 2: the one and only consumer of the request sits inside onFrame"
        status: pass
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#link 3: the frame callback starts inactive, so onFrame cannot run until setActive(true)"
        status: pass
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#link 4: certApplied is assigned exactly once, at the consume site — nothing resets it at a run boundary"
        status: pass
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#link 5: the retry-reset block runs ABOVE the cert consume, so a queued load lands on the freshly reset world"
        status: pass
      - kind: unit
        ref: "tests/runtime.cert-request.test.ts#extraction guard: the injector body was found and is not empty"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the five links is falsifiable: five declared mutations of src/runtime/useGameLoop.ts each turn its named link RED, and each classifies RED_EVIDENCE_OK"
    verification:
      - kind: other
        ref: "gsd check tdd-red-evidence on five persisted tap-flat records (m1..m5) — all RED_EVIDENCE_OK; transcripts in commit 05cb58b"
        status: pass
    human_judgment: false
  - id: D3
    description: "The falsified mechanism clause is at 0 occurrences in all four artifacts this phase owns, and the MEASURED label is struck"
    verification:
      - kind: other
        ref: "grep -cE 'world whose loop is already stopped|already-stopped world' over the four owned files -> 0/0/0/0; grep -c 'MEASURED, not derived' tests/ui/PlayingHost.endless-retry.test.tsx -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The assertion the message decorated is unchanged and the endless-retry suite is intact"
    verification:
      - kind: unit
        ref: "npx vitest run --reporter=tap-flat tests/ui/PlayingHost.endless-retry.test.tsx -> 33 ok, 0 not ok; grep -c 'toHaveBeenCalledTimes(1)' unchanged at 31"
        status: pass
    human_judgment: false
  - id: D5
    description: "docs/ops/ENDLESS-MODE.md states the queue, names certRequest, cites the instrument, spells out the operator consequence, and keeps the restart instruction verbatim"
    verification:
      - kind: other
        ref: "stale-claim 0; certRequest 3 lines; tests/runtime.cert-request.test.ts 2; 'restart the app and take the reading again' 2; 'round 6' 3; 'first frame of the next run' present in both the table row and § Limits item 2; 'contaminates the next run' 2"
        status: pass
    human_judgment: false
  - id: D6
    description: "An SC-5 operator reading the corrected § Limits item 2 before taking the device reading is told the truth about what a Cert WC press does to the run they are about to measure, and acts on it"
    verification: []
    human_judgment: true
    rationale: "Whether the corrected prose actually changes what a human operator DOES at the bench is not observable by any automated gate in this repo. The greps prove the words are present, correct and dated; they cannot prove the instruction lands. The device half of SC-5 remains unmeasured by design."
  - id: D7
    description: "src/runtime behaviour is unchanged, and the decision not to change it is recorded with both reasons and the falsification a future change would owe"
    verification:
      - kind: other
        ref: "git diff --name-only 6bb18bf..HEAD -- src/runtime -> empty; sha256 of src/runtime/useGameLoop.ts unchanged across all five mutations"
        status: pass
    human_judgment: false

duration: 13 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 20: Gap 2 — the queued cert load, and the four sentences that got it wrong Summary

**A five-link source contract over `useGameLoop.ts` proving the `Cert WC` worst-case load is QUEUED on `certRequest` and lands on the first frame of the NEXT run, plus the five corrected statements that now cite it — and the `MEASURED, not derived` label struck from the stub count that could never have seen the mechanism it labelled.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-26T15:05:11Z
- **Completed:** 2026-09-26T15:18:00Z
- **Tasks:** 3
- **Files created/modified:** 5 (1 created, 4 modified)

## Accomplishments

- **The instrument exists before the corrections that cite it.** `tests/runtime.cert-request.test.ts` asserts each of the five links of the queued-load claim against the shipped source, with a non-empty extraction guard so a drifted anchor is RED rather than vacuously green.
- **Each link is falsifiable, and was falsified.** Five declared mutations of `src/runtime/useGameLoop.ts`, each run and reverted; each turned its named link RED; each classified `RED_EVIDENCE_OK` under `gsd check tdd-red-evidence`.
- **The falsified clause is gone from all four owned artifacts**, described rather than quoted, dated `round 6`, sitting beside what it supersedes. The three `.planning` report files keep their copies as the record of what was believed and what falsified it.
- **The ops document now states the operator consequence**, which is the half that made gap 2 a blocker: a `Cert WC` press from a mounted Results panel contaminates the NEXT run, and a `Retry` from that same panel IS that next run.
- **The accuracy label is struck** from `tests/ui/PlayingHost.endless-retry.test.tsx:1824`, and the assertion it decorated is byte-identical.

## Task Commits

1. **Task 1: the instrument that can actually observe the queueing** — `05cb58b` (test)
2. **Task 2: correct the three code-adjacent statements and strike the MEASURED label** — `8025acb` (docs)
3. **Task 3: the ops doc — both operator-facing locations, and the consequence for the SC-5 reading** — `a768367` (docs)

**Plan metadata:** `d20360c` (docs: complete plan — this SUMMARY, STATE.md, ROADMAP.md, WINDOWS.md)

Measured, not narrated: `git rev-list --count da1c35625124d1a9e010ceaede8ebe9370bf3fbf..HEAD` = **4** — the three task commits above plus the metadata commit that carries this file. `actuals.commits` records 4 for that reason; re-running the same instrument later must agree.

## Files Created/Modified

- `tests/runtime.cert-request.test.ts` — **created.** Five links, one `it(` each, plus the extraction guard. Reads `src/runtime/useGameLoop.ts` with `readFileSync`, strips `//` comments with the same one-line `codeOnly` helper `tests/ui/PlayingHost.endless-host.test.ts` uses.
- `app/_components/PlayingHost.tsx` — a `WHAT IT COSTS` paragraph restored to `runCertWorstCase`'s comment block, corrected and dated. Line comments only.
- `tests/ui/PlayingHost.endless-retry.test.tsx` — `:1824` message replaced; assertion untouched.
- `.planning/phases/11-endless-mode/11-17-SUMMARY.md` — both statements corrected in place, each with a dated `CORRECTION 2026-09-26 (round 6)` block beside the superseded text.
- `docs/ops/ENDLESS-MODE.md` — the `Cert WC` run-boundary table row (`:261`) and § Limits item 2 (now `:505-524`) corrected, with the operator consequence spelled out.

## The claim, and the five recorded falsifications

Green baseline: `npx vitest run --reporter=tap-flat tests/runtime.cert-request.test.ts` → exit 0, **6 ok, 0 not ok**.

| Mutation | What was changed in `src/runtime/useGameLoop.ts` | Result | Verdict |
|---|---|---|---|
| m1 | apply helper called inside the injector body | exit 1, 4 ok / 2 not ok — RED on `link 1` (and collaterally `link 2`, whose call-site count rises to 2) | `RED_EVIDENCE_OK` |
| m2 | a second `applyCertWorstCaseInject(` call site added OUTSIDE `onFrame` | exit 1, 5 ok / 1 not ok — RED on `link 2` | `RED_EVIDENCE_OK` |
| m3 | autostart flipped to `useFrameCallback(onFrame, true)` | exit 1, 4 ok / 2 not ok — RED on `link 3`, and on `link 2`'s own anchor guard (the `, false)` anchor stops resolving — the anti-vacuity guard doing its job) | `RED_EVIDENCE_OK` |
| m4 | a second `certApplied.value = certRequest.value;` added to the retry-reset block | exit 1, 5 ok / 1 not ok — RED on `link 4` | `RED_EVIDENCE_OK` |
| m5 | the cert consume block moved ABOVE the retry-reset block | exit 1, 5 ok / 1 not ok — RED on `link 5` | `RED_EVIDENCE_OK` |

`src/runtime/useGameLoop.ts` is byte-identical to the round-6 base after all five: sha256 `68f98749b0d88f673533d916953f2a5987dee24748850469e013d39b7aba2e21`, and `git diff --name-only 6bb18bf..HEAD -- src/runtime` is empty.

**Harness notes, for the next round.** `check tdd-red-evidence` takes **camelCase** keys (`exitCode`, `targetTest`); vitest's default `tap` reporter emits file-level results only, so `--reporter=tap-flat` is required; `targetTest` must be the **full TAP name including the `tests/…` file prefix**; and `tap-flat` emits no `# tests` / `# pass` / `# fail` summary, so those three lines must be computed from the `ok` / `not ok` counts and appended before the record is classified. All four traps were hit and cleared.

## Gate readings — before and after

| File | Falsified clause (before → after) | Instrument cited (before → after) |
|---|---|---|
| `docs/ops/ENDLESS-MODE.md` | 2 → **0** | 0 → **2** |
| `app/_components/PlayingHost.tsx` | **0** → 0 (see deviation 1 — base was 1 at `6bb18bf`) | 0 → **1** |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | 1 → **0** | 0 → **1** |
| `.planning/phases/11-endless-mode/11-17-SUMMARY.md` | 2 → **0** | 0 → **2** |

Other gates: `MEASURED, not derived` 1 → **0**; `toHaveBeenCalledTimes(1)` unchanged at **31**; `certRequest` in `ENDLESS-MODE.md` 0 → **3 lines**; `restart the app and take the reading again` 1 → **2** (the original at `:553` verbatim and intact); `round 6` 0 → **3 lines**; `contaminates the next run` 0 → **2**; `first frame of the next run` present in both the table row and § Limits item 2.

`npm test` exit 0: **99 test files, 661 tests, 0 failed** (round-5 base 97, plus 11-19's one and this plan's one). `npm run typecheck` clean. `npm run lint` 0 errors, the two known `ReadonlyArray<T>` warnings only.

## Decisions Made

1. **`src/runtime` is not changed.** Two reasons, both recorded rather than assumed. (a) No test in this repo drives `onFrame` — it is a Reanimated worklet, and `tests/runtime.reset-request.test.ts` exercises the same world helpers by calling them directly for exactly that reason — so a reset added to the retry block could not be falsified this round. (b) Because the reset block runs ABOVE the cert block on the same frame, such a reset would also swallow a request issued between a `retry()` and the next frame, which is precisely the deferred-inject path — silently disabling the harness. **What a future change owes:** a harness that can drive `onFrame`, plus a case proving the deferred-inject path still discharges when its request is issued between a `retry()` and the next frame. `link 4` of the new contract is the tripwire: adding a second `certApplied.value =` assignment reds it and routes the author to the four sentences that must change with it.
2. **The `Cert WC` table cell is not restructured** (advisory IN-03). It is ~1,400 words carrying five dated revisions and is unreadable as a table. Compressing it to one line plus a pointer would relocate those corrections away from where the SC-5 operator reads them, which is the opposite of this phase's beside-not-erase rule; the round-5 verifier routed the rewrite-versus-patch choice to the owner as a `human_verification` item, and it stays open. Recorded, not silently skipped.
3. **Superseded clauses are described, not quoted.** Per the round-5 decision in `STATE.md`: where a discriminating gate pins a false literal at 0 occurrences, the beside-not-erase rule and the gate conflict, and the verbatim record lives in git (`6bb18bf`).
4. **No requirement is ticked.** See deviation 2.

## Deviations from Plan

### 1. [Measurement disagreement, reported not adjusted] `app/_components/PlayingHost.tsx` carried 0 occurrences of the falsified clause, not 1

- **Found during:** Task 2 base re-measurement (before any edit).
- **Issue:** The plan's `must_haves.truths[0]` enumerates the clause at **6** occurrences across four files, including **1** in `app/_components/PlayingHost.tsx` at `:1761`, and the plan checker re-measured that base live. On the tree this executor received it measures **0**. Traced: the clause WAS at `PlayingHost.tsx:1761` on the round-6 base tree `6bb18bf`, and commit `07907f3` (plan 11-19, a declared `depends_on` of this plan) deleted the entire round-5 `WHAT IT COSTS` paragraph while extracting `certLevelPlanFor`. The plan's measurement was correct for the tree it named; wave 9 landed in between.
- **Effect on the truth as written:** the enumeration is **5 on the executed tree** (`ENDLESS-MODE.md` 2, `PlayingHost.tsx` 0, `endless-retry.test.tsx` 1, `11-17-SUMMARY.md` 2), not 6. **This SUMMARY reports 5.** Claiming 6 would be exactly this phase's signature failure — a number in the record that the tree does not support.
- **Action taken:** no gate was weakened or widened. Every acceptance criterion and every `<verify>` command in the plan was run **as written** and passed, including the `PlayingHost.tsx` one (target 0, which the file already met). The deeper intent — that the location state the true mechanism and name the instrument — was NOT met by 11-19's deletion, which removed the false clause and any statement of the cost with it. So the paragraph was **restored** with the corrected content, and `grep -c 'tests/runtime.cert-request.test.ts' app/_components/PlayingHost.tsx` moves 0 → 1 as the plan requires.
- **Why this did not halt the plan:** the disagreement is a strictly favourable pre-satisfaction of a post-condition, caused by a declared dependency of this plan, in the direction the plan wanted. Halting would have left the actual blocker — the false mechanism in the document that IS the SC-5 instrument — unclosed. It is reported here and in the executor's return message rather than absorbed.
- **Committed in:** `8025acb`.

### 2. [Plan prohibition honoured over the workflow default] No requirement checkbox was ticked

- **Found during:** the post-plan state update.
- **Issue:** the plan frontmatter declares `requirements: [N-END-01, N-END-03]`, and the default close-out marks those complete. The plan's own `flagged_assumptions` forbid it for N-END-03 ("No task here may tick N-END-03" — the device half of SC-5 stays unmeasured), and this plan contributes no new closing evidence for N-END-01 either: it repairs an instruction, it does not take a reading.
- **Action taken:** `requirements.mark-complete` was not run. `.planning/REQUIREMENTS.md` is untouched — `git diff -- .planning/REQUIREMENTS.md` is empty. `requirements-completed: []` in this SUMMARY's frontmatter states the same thing.
- **Impact:** none on correctness; it prevents a claim the instruments do not support.

### 3. [Gate hygiene, plan-sanctioned] Task 3's line windows re-derived rather than widened

- **Found during:** Task 3 verification.
- **Issue:** the plan flagged its `sed -n '240,275p'` and `sed -n '430,520p'` window gates as position-fragile, since the `:261` insertion shifts § Limits item 2 toward the 520 boundary, and instructed re-deriving rather than widening.
- **Action taken:** windows re-derived post-edit — the table block is `252-262` and § Limits item 2 is `426-553`; both re-derived windows pass. The plan's original windows were then also run unchanged and **also pass** (the table row is still at `:261` and the corrected § Limits sentence landed at `:511`, inside `430,520`). Both readings are recorded so the next round can see the margin: `:511` sits 9 lines inside the upper bound.

---

**Total deviations:** 3 (1 measurement disagreement reported, 1 prohibition honoured, 1 plan-sanctioned gate re-derivation).
**Impact on plan:** no gate weakened, no scope added. The one substantive change is that the `PlayingHost.tsx` correction is an ADDITION (restoring a deleted paragraph with true content) rather than a replacement, because a dependency wave had already deleted the false text.

## TDD Gate Compliance

Task 1 carries `tdd="true"`. The RED gate is satisfied and recorded; there is **no GREEN `feat(11-20)` commit**, deliberately.

| Gate | Commit | Status |
|---|---|---|
| RED | `05cb58b` `test(11-20): pin the cert-request queueing at source` | Present. Five `RED_EVIDENCE_OK` records, one per declared falsification, transcripts in the commit body. |
| GREEN | — | **Absent by design.** The contract is over ALREADY-SHIPPED source, and this plan's prohibition 4 forbids changing `src/runtime`: such a change needs a harness that can drive a frame and this repo has none. An implementation commit would have to be a `src/runtime` edit, which is exactly the failure mode the phase keeps repeating. |
| REFACTOR | — | Not needed; no cleanup pass produced a change. |

Note that the plan's frontmatter is `type: execute`, not `type: tdd`, and `workflow.tdd_mode` is `false` in `.planning/config.json` — so the plan-level gate sequence is not enforced here. This section records the shape anyway, so a future reader does not read the missing `feat` commit as a skipped GREEN.

## Authentication Gates

None.

## Known Stubs

None. No `TODO`, `FIXME`, `.skip(`, `.todo(` or placeholder value was introduced by any of the three commits (`git diff da1c356..HEAD` over the five files: zero matches).

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The plan's register dispositions are discharged as follows: T-11-45 mitigated instructionally and labelled as instructional (the code is unchanged); T-11-46 mitigated (label struck, instrument and its limits named at every corrected location); T-11-47 mitigated (`link 4` pins `certApplied.value =` at one assignment); T-11-48 mitigated (no `src/runtime` change; gate empty); T-11-49 accepted; T-11-SC not applicable — no package-manager install occurs in this plan.

## Issues Encountered

- **The RED-evidence harness has four silent traps and all four fired.** camelCase keys, `--reporter=tap-flat` (the default `tap` reporter emits file-level results only), the full TAP name including the `tests/…` prefix in `targetTest`, and hand-computed `# tests` / `# pass` / `# fail` summary lines. Documented above so the next round pays for them once.
- **A shell-array indexing trap cost one pass.** The first scripted sweep ran under `zsh`, whose arrays are 1-indexed, which shifted every `targetTest` by one and produced four spurious `no_target_test_failure` verdicts plus one `invalid_record` (empty `targetTest`). Re-run under `bash`; all five then classified `RED_EVIDENCE_OK`. No source or test file was affected — only the evidence records.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Gap 2 of round 5 is closed.** An operator reading `docs/ops/ENDLESS-MODE.md` before taking the SC-5 reading is now told what a `Cert WC` press actually does to the run they are about to measure, and that the reading must be restarted.
- **Still open, and NOT claimed here:** the SC-5 device reading itself. No task in this plan produced a frame on hardware, `behavior_unverified` stays at 1, and N-END-03's unchecked box remains correct. This plan repaired the instructions for taking that reading and explicitly did not take it.
- **Carried to Phase 14, with its price stated:** clearing `certApplied` at the retry-reset boundary would make "the injection does not outlive its run" true of the code rather than of the documentation. It needs (a) a harness that can drive `onFrame` and (b) a case proving the deferred-inject path still discharges when its request is issued between a `retry()` and the next frame.
- **Left open for the owner:** advisory IN-03, the legibility of the `Cert WC` table cell. Corrected in content, deliberately not restructured; the rewrite-versus-patch choice remains a `human_verification` item.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `tests/runtime.cert-request.test.ts` — FOUND
- `.planning/phases/11-endless-mode/11-20-SUMMARY.md` — FOUND
- commit `05cb58b` — FOUND
- commit `8025acb` — FOUND
- commit `a768367` — FOUND
- `git rev-list --count da1c356..HEAD` = 4 (3 task commits + the metadata commit carrying this file) — matches `actuals.commits`
- `.planning/REQUIREMENTS.md` — untouched, as decided
