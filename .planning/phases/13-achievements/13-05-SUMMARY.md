---
phase: 13-achievements
plan: 05
subsystem: testing
tags: [achievements, documentation, validation, broken-windows, eslint, vitest, safe-area-insets]

# Dependency graph
requires:
  - phase: 13-achievements
    provides: "13-01's tracer (catalog, evaluator, storage field, classifier, ResultOverlay block, the eslint purity block and its `__purity_probe` gate), 13-02's twelve catalog entries and two suites, 13-03's read path and its fourteen cases, 13-04's daily-panel block and classifier battery"
  - phase: 12-daily-challenge
    provides: "`docs/ops/DAILY-CHALLENGE.md` — the shape a phase ops document takes here, including its named accepted costs and its Limits section"
  - phase: 11-endless-mode
    provides: "`docs/ops/ENDLESS-MODE.md`'s Limits precedent, and the on-record rule that the iOS Simulator is not evidence for a device claim"
provides:
  - "`docs/ops/ACHIEVEMENTS.md` — the phase ops document: the catalog, every threshold's stated reasoning, the stored shape, the three-site obligation, eight accepted costs, five flagged assumptions and five Limits"
  - "`docs/ops/PROGRESS-STORAGE.md` extended — the achievements field's shape, its bound with the arithmetic, its degrade table, D-13's no-version-bump, and the three-vs-four write sites"
  - "The phase's authoritative tree-wide gate, run once with all four siblings landed"
  - "`__purity_probe` re-run in BOTH directions — the only evidence D-03 / D-20 are still enforced"
  - "`13-VALIDATION.md` filled in — 26 rows, every command executed, zero `TBD`, three gates that could not fail found and corrected"
  - "WINDOWS #16, #17, #28 and #29 annotated with a reproduction recipe and the consequence of a negative answer, all four left OPEN"
  - "A threshold review prepared as four answerable questions with the scope of a `yes` stated (D-11)"
  - "WINDOWS #32, #33, #34 — this plan's own findings, registered rather than narrated"
affects: [13-UAT, 14-achievements-screen, phase-14-shell, gsd-verify-work, gsd-ship]

# Actuals (#2632) — same estimateTokens scale as the plan's `estimate`: chars/4 over the
# realized diff, NOT a harness token count. MEASURED:
#   git diff 400fc78..HEAD | grep '^+' | wc -c  ->  88 218 chars  ->  22 054
# The plan estimated 52 000 at `confidence: low`. The over-estimate is real and is NOT
# rounded toward the estimate. Cause: the plan priced a 533-line DAILY-CHALLENGE-shaped
# document plus a rewritten validation map plus four ledger annotations; what it got is a
# 501-line document, a 308-line map and four annotations, which is the work it described —
# what it over-counted is how many characters a document of that shape actually costs when
# every number in it is copied from a measurement rather than argued out afresh. The same
# direction 13-02 and 13-03 both recorded, for a third time and a different reason.
actuals:
  tokens: 22054
  tasks: 3
  # MEASURED at SUMMARY-write time with:
  #   git rev-list --count 400fc78bafd7118b91ee782f5c175ca77c3a388c..HEAD  ->  4
  # Four commits for three tasks: Task 3 landed in two, the annotations and then the three
  # ledger appends, because `windows append` re-renders the whole table and mixing that with
  # a hand-authored annotation in one commit would have hidden which change produced which
  # row. This SUMMARY's own metadata commit lands after the count is taken, exactly as in
  # 13-01 through 13-04, so re-running the command after the docs commit returns 5.
  commits: 4
plan_head_before: 400fc78bafd7118b91ee782f5c175ca77c3a388c

# Tech tracking
tech-stack:
  added: []        # zero packages; this plan writes documents and a ledger
  patterns:
    - "A phase ops document that names the ENFORCING command for every control it claims, and says 'nothing enforces this' where nothing does — here, attributing D-03 / D-20 to the `__purity_probe` gate and explicitly NOT to a green `npm run lint`"
    - "A purity gate re-run in BOTH directions at phase close, on a SCRATCH copy of the config, so the number that moves is observed rather than assumed"
    - "A validation map whose every row records the EXECUTED command and that run's own output, with each divergence from the predicted command noted beneath the table"
    - "Annotating an open backstop with a reproduction recipe AND the consequence of a negative answer, instead of closing it or duplicating it under a new id"
    - "Editing `.planning/WINDOWS.md` through the fenced JSON as the sole source of truth and re-rendering the table from it, then proving the 27 untouched rows are byte-identical"

key-files:
  created:
    - docs/ops/ACHIEVEMENTS.md
  modified:
    - docs/ops/PROGRESS-STORAGE.md
    - .planning/phases/13-achievements/13-VALIDATION.md
    - .planning/WINDOWS.md

key-decisions:
  - "`ACHIEVEMENT_LINES_MAX` stays 2 and all four device backstops stay OPEN — no physical iOS device was available and the Simulator is not acceptable evidence for a safe-area inset claim. The consequence of a non-zero bottom inset is written down instead, naming the two test cases that move with the constant."
  - "WINDOWS #16, #17, #28 and #29 were ANNOTATED with a recipe and a consequence, never closed and never duplicated — no automated step in this repository can discharge a layout claim, and duplicating them would make the ship gate count one debt twice."
  - "`13-VALIDATION.md`'s `nyquist_compliant: true` is SCOPED in the frontmatter to the per-task map and explicitly does not cover the four Manual-Only items; `status` stays `draft` because only `/gsd-validate-phase` may set `validated`."
  - "Two seeded validation rows named cases in the WRONG FILE and were vacuous at exit 0 — corrected to the executed commands, and the finding registered as WINDOWS #33."
  - "`GameScreen`'s achievements threading is recorded as compiler-checked and behaviourally unobserved, marked ⚠️ in the map and filed as WINDOWS #32, rather than given a green tick."

patterns-established:
  - "Evidence attribution: an ops document must name the command whose OUTPUT MOVES with the control, not the command that merely runs beside it."
  - "A `-t` filter written into a planning artifact is a claim that a case with that name exists in that file. Two of twenty were false here, both vacuous at exit 0 — check the file, not just the case name."
  - "A backstop that cannot be discharged is annotated with its recipe and its consequence, then left open. Neither closing it nor re-filing it is honest."

requirements-completed: [N-ACH-01, N-ACH-02, N-ACH-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "`docs/ops/ACHIEVEMENTS.md` exists and records the catalog, every threshold's reasoning, the stored shape, the three-site obligation and the accepted costs — in the shape `docs/ops/DAILY-CHALLENGE.md` gave phase 12"
    requirement: "N-ACH-01"
    verification:
      - kind: other
        ref: "test -f docs/ops/ACHIEVEMENTS.md && grep -c '^## ' docs/ops/ACHIEVEMENTS.md -> 11 (floor 9)"
        status: pass
      - kind: other
        ref: "id coverage extracted from src/services/achievements/catalog.ts -> ids=12 in_doc=12"
        status: pass
      - kind: other
        ref: "grep -nE '\\.(ts|tsx|js|mm|json)x?:[0-9]+' docs/ops/ACHIEVEMENTS.md -> no matches (symbols, never line numbers)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`docs/ops/PROGRESS-STORAGE.md` names the achievements field in the v4 blob, its bound, its degrade rules and the fact that no version bump was taken (D-13)"
    requirement: "N-ACH-02"
    verification:
      - kind: other
        ref: "grep -ci achievements docs/ops/PROGRESS-STORAGE.md -> 11 (base 0)"
        status: pass
      - kind: other
        ref: "grep -cE 'ACHIEVEMENTS\\.md' docs/ops/PROGRESS-STORAGE.md -> 3 (base 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The whole suite is green tree-wide, run once with every earlier plan in waves 1-3 landed"
    requirement: "N-ACH-02"
    verification:
      - kind: other
        ref: "npm run typecheck -> exit 0, `error TS` count 0"
        status: pass
      - kind: other
        ref: "npm run lint -> exit 0, 3 problems (0 errors, 3 warnings) — the measured base"
        status: pass
      - kind: integration
        ref: "npm test -> exit 0, Test Files 112 passed (112), Tests 868 passed | 1 skipped (869), all five assert-*.mjs OK"
        status: pass
      - kind: unit
        ref: "npx vitest run tests/achievements -> Test Files 3 passed (3), Tests 34 passed | 1 skipped (35)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The `src/services/achievements/**` purity block is still IN `eslint.config.js` after four plans have edited the tree (D-03 / D-20) — proved by the probe, not inferred from a green lint"
    requirement: "N-ACH-01"
    verification:
      - kind: other
        ref: "__purity_probe gate -> purity_probe_errors=5 with the shipped config; probe file removed afterwards"
        status: pass
      - kind: other
        ref: "__purity_probe against a SCRATCH eslint.config.js with the block deleted -> purity_probe_errors=0; git diff --exit-code -- eslint.config.js clean, scratch deleted"
        status: pass
    human_judgment: false
  - id: D5
    description: "`13-VALIDATION.md`'s per-task map carries real plan and task ids, real commands and real statuses, and its `nyquist_compliant` flag reflects what was actually run"
    verification:
      - kind: other
        ref: "grep -c 'TBD' .planning/phases/13-achievements/13-VALIDATION.md -> 0"
        status: pass
      - kind: other
        ref: "all 26 rows' commands re-executed 2026-09-28; each row's Status is that run's own output"
        status: pass
    human_judgment: true
    rationale: "The commands are executed and their outputs are measured, but the ATTRIBUTION of each row to a plan and task id was derived by reading the four sibling SUMMARYs, and no command can check that a row is attributed to the right task. A reviewer should spot-check the attribution column against the SUMMARYs, and should read the six correction notes beneath the table."
  - id: D6
    description: "The four device and layout claims are routed to the end-of-phase human batch, and the WINDOWS ledger records the exact recipe and the consequence for each — none silently closed by a passing jsdom run"
    requirement: "N-ACH-03"
    verification:
      - kind: other
        ref: "windows status --raw -> #16, #17, #28, #29 all present, all status open, all carrying a PHASE-13 ANNOTATION; ledger ok: true"
        status: pass
    human_judgment: true
    rationale: "The READINGS themselves are the human's work and none was taken: no physical iOS device was available in this session, the iOS Simulator is not acceptable evidence for a safe-area inset claim (phase 11 established that on the record), and jsdom performs no layout and supplies no safe-area insets. This deliverable is the recipe and the consequence, not the answer. #28 is the binding one and can still change shipped code."
  - id: D7
    description: "The twelve thresholds are prepared for human review as JUDGEMENTS (D-11) — four answerable questions in the ops document, with the scope of a `yes` stated, including that an id rename must happen before any build ships"
    requirement: "N-ACH-01"
    verification: []
    human_judgment: true
    rationale: "D-11 exists precisely because no automated check can tell whether a threshold is at the right height — no human has played this game, so there is no distribution to compare against. Eleven of the twelve have no published anchor. The review is the deliverable's whole point and it is outstanding."
  - id: D8
    description: "`ACHIEVEMENT_LINES_MAX` is 1 or 2, and whichever it is, its two tests agree with it"
    requirement: "N-ACH-03"
    verification:
      - kind: other
        ref: "grep -c 'ACHIEVEMENT_LINES_MAX = [12]' src/runtime/overlays/achievementLines.ts -> 1 (the value is 2)"
        status: pass
      - kind: unit
        ref: "npx vitest run tests/ui/achievementLines.test.ts -t \"caps at two\" -> Tests 2 passed | 11 skipped (13)"
        status: pass
    human_judgment: false

# Metrics
duration: 16 min
completed: 2026-09-28
status: complete
---

# Phase 13 Plan 05: Close the phase — documented, green tree-wide, and honest about what it did not verify Summary

**An ops document in `docs/ops/DAILY-CHALLENGE.md`'s shape that names the enforcing command for every control it claims — including the one place where a green `npm run lint` is NOT the evidence — the phase's only tree-wide gate run once with all four siblings landed at 112 files / 868 passed, the purity block proved still present by a probe run in both directions, a validation map whose twenty seeded rows became twenty-six executed ones with three gates that could not fail found and corrected, and four device claims annotated with a recipe and a consequence and deliberately left OPEN because no device was available and the Simulator is not evidence.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-28T14:56:03Z
- **Completed:** 2026-09-28T15:12:02Z
- **Tasks:** 3 (in 4 commits — see `actuals.commits`)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **The phase is written down, in the shape phase 12 established.** `docs/ops/ACHIEVEMENTS.md` (501 lines, 11 top-level sections) carries the twelve-entry catalog as a table with each entry's name length, what it reads, its D-10 class and its threshold; the one-sentence version of each entry's reasoning; the 5/7 cumulative-vs-skill-gated split; what a later contributor may change freely and the one field they may never change; D-01's single call site with its accepted cost; SC-2's two halves named function by function; the stored shape with `ACHIEVEMENT_UNLOCK_BOUND`'s arithmetic; D-21's inverting degrade pair; D-22's earliest-wins merge with the commutativity measurement that earned it; the measured row budget; **eight named accepted costs**; five flagged assumptions; and five Limits.
- **It states plainly that eleven of the twelve thresholds have no published anchor, and names the one that does.** `endless-wave-10` is the exception and its anchor is a *relationship* — the endless ramp is `wave − 1`, so wave 10 is difficulty 9 and wave 11 is exactly the difficulty every daily board is fixed at. The other eleven carry a reasoning and no anchor, and each says so at its own declaration site.
- **The document attributes D-03 and D-20 to the `__purity_probe` gate and explicitly NOT to a green `npm run lint`.** That distinction is the whole of threat T-13-13: measured on this tree, `npm run lint` exits 0 with the purity block deleted outright, so a document citing lint as the evidence would hand a later phase a gate that does not exist — the failure this project has shipped three times.
- **The tree-wide gate is green, run once, with everything landed.** `npm run typecheck` exit 0 with zero `error TS`; `npm run lint` exit 0 at the base 3 warnings; **`npm test` exit 0 at `Test Files 112 passed (112)` / `Tests 868 passed | 1 skipped (869)`** with all five `assert-*.mjs` scripts OK; `npx vitest run tests/achievements` at 3 files / 34 passed. Against the pre-phase base of 107 files / 798 tests that is **+5 files and +70 tests**, and the single skip is 13-03's plan-mandated memory-store cold-start non-applicability.
- **The purity block survived four plans of edits, and this is measured rather than assumed.** `purity_probe_errors=5` with the shipped config; **`0` on a scratch copy with the block deleted.** Both directions, the shipped `eslint.config.js` never mutated (`git diff --exit-code` clean), the scratch copy and the probe file both removed.
- **The validation map is an evidence index that indexes something.** Twenty seeded rows with sixty `TBD` cells became **twenty-six rows with zero**, every command executed on the landed tree and every Status that run's own output. **Three of the seeded gates could not fail** and are corrected with the reason recorded (two of them named cases in the wrong file and would have printed `Tests 24 skipped (24)` at exit 0). Six rows were added, including one for the merge tiebreak and one for the purity block's own existence.
- **The four unreachable claims are routed to a human with the recipe AND the consequence, and all four are still OPEN.** #28 is the binding one: it records both questions with the second marked as the one that matters (read the bottom safe-area inset, do not infer it from the panel appearing to fit) and states exactly what changes if the answer is no — `ACHIEVEMENT_LINES_MAX` drops to 1, with two named test cases moving in the same change.
- **D-11's threshold review is prepared as four answerable questions**, with the three hardest entries named and reasoned, and the scope of a `yes` stated — a threshold or a name is a free one-file edit and no test pins either, but **an id is permanent and must change before any build ships.**

## Task Commits

1. **Task 1: the ops document, and the v4 blob's new field written down** — `35216e9` (docs)
2. **Task 2: the tree-wide gate, run once with every sibling landed, and the map filled in** — `70f75c7` (docs)
3. **Task 3: the four unreachable claims, each with its recipe — all left OPEN** — `644183e` (docs)
4. **Task 3 (continued): three ledger entries this plan owes** — `723dd21` (docs)

**Plan metadata:** see the `docs(13-05)` commit that carries this SUMMARY.

_Task 3 landed in two commits on purpose: `gsd-tools windows append` re-renders the entire ledger table from its JSON, so folding three appends into the same commit as four hand-authored annotations would have made it impossible to see which change produced which row._

## Files Created/Modified

- `docs/ops/ACHIEVEMENTS.md` **(new, 501 lines)** — the phase ops document. Eleven `## ` sections; every one of the twelve catalog ids present (checked by extracting them from the source, never from a list in the gate); every citation a SYMBOL and not a line number.
- `docs/ops/PROGRESS-STORAGE.md` — one new section beside the existing storage sections: the field's shape, its bound with the arithmetic, the degrade table, D-13's no-bump-no-migration, and the three-compiler-forced-sites-plus-one-that-is-not. One line added to § Not in this doc's scope. The file is **not** restructured; a leading blockquote records that its older sections describe the v3 blob while the telemetry sub-object lives in v4. MEASURED base: `achievements` appeared **zero** times.
- `.planning/phases/13-achievements/13-VALIDATION.md` — 143 → 308 lines. The map filled in and corrected; a new "Bindings measured DURING this phase" table (four ways a gate in this phase was measured unable to fail); § Manual-Only gains a Status column; § Wave 0 boxes ticked with case counts; § Validation Sign-Off ticked with a scoped `nyquist_compliant`; the authoritative gate's five results recorded as a table.
- `.planning/WINDOWS.md` — #16, #17, #28 and #29 annotated and left OPEN; #32, #33 and #34 appended. Edited through the fenced JSON with the table re-rendered from it, verified: the 27 untouched rows byte-identical to HEAD, table/JSON parity on all 34, `ok: true` throughout.

## Decisions Made

See `key-decisions` in the frontmatter. The three a later reader is most likely to undo:

1. **Do not close #16, #17, #28 or #29 on the strength of a green `npm test`.** Nothing automated in this repository can discharge a layout claim. Each entry now says so in its own text, precisely so a later reader finds the prohibition where they would look for the verdict.
2. **Do not "fix" the one skipped test in the tree,** and do not file it in the ledger. `tests/achievements.record.test.ts`'s memory-store cold-start skip is a designed non-applicability with its reason in the test name; the store has no disk, so a second store over the same bytes is the same object in RAM and the case would pass without asserting persistence. The AsyncStorage equivalent runs and passes.
3. **Do not raise `ACHIEVEMENT_LINES_MAX` back to 3 or 4 without the inset reading.** At 375×667 four rows fit with 61px to spare and the whole reduction is a 320×568 artifact — but the 26px that makes even TWO rows legal at 320×568 assumes a bottom inset of zero, and that number has never been read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 3's presence gate calls a `gsd-tools` subcommand that does not exist**

- **Found during:** Task 3 (the WINDOWS presence gate)
- **Issue:** The plan's `<automated>` block runs `gsd-tools windows list | grep -cE "\b(16|17|28|29)\b"` and fails when the count is below 4. There is **no `list` subcommand** — the verb offers `status`, `append`, `waive`, `fixed` only. Run as written, it errored to stderr (suppressed by the gate's own `2>/dev/null`), printed **0**, and therefore **FAILED the gate it was written to pass.** A gate that cannot succeed is the mirror image of the gates corrected in Task 2, and it would have looked like a real regression in the ledger.
- **Fix:** Executed against `windows status --raw` instead, asserting both **presence and open-ness** of the four ids — strictly more than the gate asked for. MEASURED: `present=4 open=4 ids=[16, 17, 28, 29]`. The literal command was also run and its `0` recorded, so the substitution is evidenced rather than asserted.
- **Files modified:** none (a gate-binding correction); registered as WINDOWS #34
- **Verification:** `windows status --raw` → `ok: true`, all four present and `open`
- **Committed in:** `644183e` (the deviation is recorded in that commit's message) and `723dd21` (the ledger entry)

**2. [Rule 1 - Bug] Two seeded validation rows named cases in the WRONG FILE and were vacuous at exit 0**

- **Found during:** Task 2 (executing every command in the map rather than copying it forward)
- **Issue:** The map predicted `npx vitest run tests/achievements.record.test.ts -t "unknown id"` and the same with `-t "degrades alone"`. **Neither case name exists in that file.** The unknown-id drop and the independent-degradation claim both live in `tests/storage.progress-v4.test.ts`, where 13-03 Task 1 put the sanitizer's battery. As written, each would have printed `Tests 24 skipped (24)` and **exited 0** — the exact silent non-binding 13-03 measured through wrong CASE, reached here through wrong FILE, which the phase's own bindings table did not cover. Two further rows were imprecise rather than vacuous: `-t "achievements"` for the D-13 claim matched a whole nine-case describe body, and `-t "timestamp"` swept in three unrelated cases so a green result did not say which claim held.
- **Fix:** All four replaced with the executed commands (`-t "never minted"`, `-t "a fully corrupt achievements field"`, `-t "written before the achievements record existed"`, `-t "unlocks, persists and reports it"`), each re-run and its output recorded, with notes A–C beneath the table naming what was wrong and why the wrong form would have passed.
- **Files modified:** `.planning/phases/13-achievements/13-VALIDATION.md`; registered as WINDOWS #33
- **Verification:** each corrected command executed — `1 passed | 54 skipped (55)`, `1 passed | 54 skipped (55)`, `1 passed | 54 skipped (55)`, `2 passed | 22 skipped (24)`
- **Committed in:** `70f75c7`

**3. [Rule 2 - Missing Critical] Two rows the plan did not name, and one status the plan would have let read green**

- **Found during:** Task 2 (filling the map)
- **Issue:** The plan names four rows to add (`GameScreen.tsx`, `storage/index.ts`, `PlayingHost.daily-run.test.tsx`, `achievements.record.test.ts`). Two more were owed. (a) **D-22's merge tiebreak had no row at all** — and it is the one claim 13-03 records as catchable by no other shipped test, whose specified form was measured *passing against a deliberately inverted merge*. (b) **The purity block's own existence had no row**, and the D-08 lint row does not cover it: a reader could have taken that green lint row as evidence for D-03 / D-20, which is exactly what T-13-13 forbids. Separately, the `GameScreen.tsx` row the plan *did* name would have read a green ✅ on `npm run typecheck`, which overstates it.
- **Fix:** Added both rows. Marked the `GameScreen` row **⚠️** with note J recording the measurement (`grep -cin achiev tests/ui/GameScreen.test.tsx` prints **0**; both panel suites render the overlays directly, not through `GameScreen`), so the claim reads as compiler-checked and behaviourally unobserved. Filed as WINDOWS #32.
- **Files modified:** `.planning/phases/13-achievements/13-VALIDATION.md`, `.planning/WINDOWS.md`
- **Verification:** `-t "earliest"` → `2 passed | 22 skipped (24)`; probe → `purity_probe_errors=5`; ledger `ok: true`
- **Committed in:** `70f75c7`, `723dd21`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking gate-binding, 1 missing critical)
**Impact on plan:** No scope change, no architectural change, and no file beyond the plan's list except the ledger, which the plan already names. All three are corrections to the plan's own **falsifiability** rather than to its intent: one gate could not succeed, two could not fail, and one status would have read green over an unobserved claim. Every other measured base the plan supplied was confirmed exactly — `docs/ops/DAILY-CHALLENGE.md` at 7 `## ` headings, `grep -ci achievements docs/ops/PROGRESS-STORAGE.md` at 0, the id-coverage extraction discriminating at `ids=12 in_doc=12`, `purity_probe_errors` 5-against-0, lint exit 0 at 3 warnings, and `npm test` green.

## Findings Worth Carrying Forward

- **The `tests/ui/achievementLines.test.ts` row was ALREADY correctly typed, and saying so is the honest outcome.** The plan asked to correct it from `unit (jsdom)` to `unit (node)`. On the seeded file every such row already read `unit (node)`, and the § Wave 0 bullet already carried the correction with its `certLevelPlan` reasoning. Verified independently rather than trusted: `head -3 … | grep -c 'vitest-environment jsdom'` prints **0** and line 2 of that file reads `@vitest-environment node`. Recorded as verified, **not restated as a fix I did not make** — which is the house rule the phase's own pattern map followed.
- **One correction to the dispatch's own figure.** The three lint warnings are **not** all in `tests/ui/PlayingHost.endless-host.test.ts`. MEASURED: two are (`386:24`, `391:25`) and the third is in `tests/daily.date-key.test.ts` (`106:18`). All three are the same `@typescript-eslint/array-type` rule and the count of 3 is unchanged, so no gate in the phase is affected — but four gates bind against that number and a later reader clearing "the endless-host warnings" would find one left over.
- **`npm test` totals reconcile exactly across the four siblings.** 13-03 measured 111 files / `847 passed | 1 skipped (848)`; 13-04 added 21 cases under `tests/ui/` and predicted a floor of 868 with the same single skip. MEASURED here: 112 files / `868 passed | 1 skipped (869)`. The prediction was exact.
- **`gsd-tools windows append` re-renders the markdown table from the JSON itself.** So a hand-authored annotation made through the JSON survives a later append (verified: all four PHASE-13 annotations intact in both surfaces after three appends). The safe order is JSON-then-render, never a table edit; the 27-row byte-identity check is what proves a re-render did not drift.
- **`requirements.mark-complete` reports `write_set_complete: false` for these ids, and that is pre-existing.** The checkbox surface applied for all three; the traceability surface did not, because `REQUIREMENTS.md` has no traceability rows for `N-*` ids. The checkbox is the only surface for them, and all three now read `[x]`.

## Issues Encountered

- **No device check ran, and that is this plan's defining constraint rather than a failure of it.** No physical iOS device was available, and the iOS Simulator is not acceptable evidence for a safe-area inset claim — phase 11 established that on the record for its own frame-timing claim, and jsdom performs no layout and supplies no insets at all. The plan anticipated this: its `files_modified` lists `src/runtime/overlays/achievementLines.ts` only because a non-zero inset would force the constant down, and with no reading in hand the correct action was to leave the constant at 2 and write the consequence down. That is what happened; the file is untouched.
- **Nothing required an Expo or React Native lookup.** `AGENTS.md` binds changes under `src/runtime/**` or `app/**` to the versioned SDK docs. This plan wrote two documents, a validation map and a ledger; it touched no source file, added no package, imported nothing and rendered nothing. Waves 1–4 already confirmed SDK 57 → RN 0.86.3 against `https://docs.expo.dev/versions/v57.0.0/` and the dispatch says not to re-spend calls on it. No `npm install` or `npx expo install` ran.
- **`state update-progress` and `roadmap update-plan-progress` were both no-ops, correctly.** The former reports `no Progress: line found in STATE.md body` (the frontmatter progress data is unaffected and already reads 42/43); the latter reports `no changes were needed — ROADMAP.md already reflects this phase's plan/summary counts and status`. Both outputs were read rather than discarded; neither was forced.
- **`state add-decision` was called with inline `--summary` and its printed result checked.** All five returned `true`. 13-04 lost three decisions by passing `--summary-file` pointing outside the project root and redirecting stdout to `/dev/null`, where the verb exits 0 while returning `added: false`. One rationale was then reworded to remove a second colon, per the same hazard that has blinded a decision-coverage gate in this repo before.
- **`windows append` was used only to append, never as a capability probe.** 13-04 recorded using it as a probe, writing entry 32 and having to restore the file from HEAD. The read-only check here was `windows status --raw`, run before and after every write.

## Known Stubs

None. Both documents are complete prose about shipped behaviour, the validation map's every row carries an executed command, and no source file was touched. Five things are deliberately **absent, open or unverified** rather than stubbed, and each is named where a reader will look for it:

- **The four device and layout readings.** OPEN as WINDOWS #16, #17, #28 and #29, each with a reproduction recipe and the consequence of a negative answer, and each stating in its own text that no automated step in this phase discharged it. Routed to the end-of-phase human batch through Task 3's `<verify><human-check>` blocks.
- **The threshold review.** Prepared as four answerable questions in `docs/ops/ACHIEVEMENTS.md` § The catalog and **not answered** — D-11 requires a human, and no human has played this game.
- **`GameScreen`'s achievements threading has no behavioural test.** Filed as WINDOWS #32 with the measurement, and marked ⚠️ rather than ✅ in the map.
- **WINDOWS #27 is not closed and is named as an accepted cost** in the ops document, so the achievements bound is not read as having closed a different collection's uncapped read in a different file.
- **The one skipped test in the tree** is a designed non-applicability with its reason in the test name, deliberately not filed (the ledger's `skipped-test` kind is for a skip *left behind*, and filing this would block `/gsd-ship` on a non-defect).

## Broken-windows Ledger

Three entries appended (`723dd21`), all `open`, ledger validating `ok: true` at **30 open / 0 waived / 4 fixed / 34 total**:

| id | kind | file | What |
|---|---|---|---|
| 32 | `unmet-truth` | `src/runtime/GameScreen.tsx` | The achievements prop threaded to both arms of the `showResult` route has no behavioural test; only typecheck and lint observe it |
| 33 | `unmet-truth` | `13-VALIDATION.md` | Two seeded map rows named cases in the wrong file and were vacuous at exit 0; nothing checks that a `-t` filter in a planning artifact binds |
| 34 | `deviation` | `13-05-PLAN.md` | The plan's presence gate calls `windows list`, which does not exist |

Four entries **annotated and left open** (`644183e`): #16, #17, #28, #29. Nothing was closed, waived or duplicated.

## Threat Model

No flag. The plan's register is discharged as written and this plan adds no surface — it touched no source file.

- **T-13-13 (Repudiation, high, mitigate)** — discharged. Both documents name the ENFORCING command for every control they claim. Specifically: `npm run lint` is named as the only mechanism observing `runtime ↛ services` **and** as unable to observe whether the purity block exists, with the `__purity_probe` gate named as the evidence for D-03 / D-20; `parseBlob.ts` is named as the one `TelemetryBlob` site the compiler does **not** force; `assert-streak-evidence.mjs` is named as **not** covering the achievements merge, citing WINDOWS #26. `13-VALIDATION.md`'s sign-off ticks only true boxes, carries a reason on the one it does not tick, and scopes `nyquist_compliant` in the frontmatter instead of leaving it bare.
- **T-13-14 (Tampering, high, mitigate)** — discharged as far as this phase can. The `human-check` requires the inset be READ rather than inferred; the consequence is stated in WINDOWS #28 and in the ops document, naming the two test cases that move with the constant. The reading itself is deferred to the human batch, so **this phase ships with the assumption outstanding, and both documents say so rather than papering over it.**
- **T-13-02 (DoS, medium, transfer)** — transferred to WINDOWS #27 and named in `docs/ops/ACHIEVEMENTS.md` § Accepted costs as explicitly not closed by the achievements bound.
- **T-13-15 (EoP, medium, transfer)** — transferred to WINDOWS #29 with its Phase 14 due point. Annotated, **left open**, no new window filed.
- **T-13-SC (supply chain, accept)** — holds. No package-manager install ran in this plan or anywhere in this phase; zero packages added.

## Verification Results

| Gate | Result |
|---|---|
| `test -f docs/ops/ACHIEVEMENTS.md && grep -c '^## '` | **11** (floor 9; `DAILY-CHALLENGE.md`'s shape is 7) |
| id-coverage extraction from `catalog.ts` | **`ids=12 in_doc=12`** |
| `grep -ci achievements docs/ops/PROGRESS-STORAGE.md` | **11** (base 0) |
| `grep -cE 'ACHIEVEMENTS\.md' docs/ops/PROGRESS-STORAGE.md` | **3** (base 0) |
| line-number citations in either document | **none** — symbols only |
| `npm run typecheck` | exit **0**, `error TS` count **0** |
| `npm run lint` | exit **0**, `✖ 3 problems (0 errors, 3 warnings)` — the base, bound on the exit code |
| `__purity_probe` (shipped config) | **`purity_probe_errors=5`**; probe file removed |
| `__purity_probe` (scratch config, block deleted) | **`purity_probe_errors=0`**; `git diff --exit-code -- eslint.config.js` clean, scratch deleted |
| `npm test` | exit **0**, `Test Files 112 passed (112)`, `Tests 868 passed \| 1 skipped (869)`, all five `assert-*.mjs` OK |
| `npx vitest run tests/achievements` | `Test Files 3 passed (3)`, `Tests 34 passed \| 1 skipped (35)` |
| `grep -c 'TBD' 13-VALIDATION.md` | **0** |
| WINDOWS presence (plan's literal `windows list`) | **0** — the subcommand does not exist (deviation 1) |
| WINDOWS presence (executed `windows status --raw`) | **`present=4 open=4 ids=[16, 17, 28, 29]`** |
| `grep -c 'ACHIEVEMENT_LINES_MAX = [12]'` | **1** (the value is **2**, unchanged) |
| `grep -ciE "inset" docs/ops/ACHIEVEMENTS.md` | **10** |
| `npm test` after Task 3's edits | exit **0**, same 112 / 869, no `failed` line |
| ledger integrity after all writes | `ok: true`, 30 open / 0 waived / 4 fixed / 34 total; 27 untouched rows byte-identical; table/JSON parity on all 34 |
| The four device claims | **NOT verified, by design.** No device available; the Simulator is not evidence; jsdom performs no layout. All four OPEN and routed to the human batch |

## Self-Check: PASSED

- `docs/ops/ACHIEVEMENTS.md` exists on disk; all three modified files exist and are committed.
- All four commits found in `git log`: `35216e9`, `70f75c7`, `644183e`, `723dd21`.
- `git rev-list --count 400fc78..HEAD` = **4**, matching `actuals.commits`; the docs commit is the fifth and is excluded by the instrument, as the contract specifies.
- Every task `<acceptance_criteria>` item and every plan-level `<verification>` line re-run and reported in the table above, including the ones with no command in a verify block: `ResultOverlay` named as the binding panel with the 458 / 522 / 548 / 554 arithmetic present; eleven-of-twelve-no-anchor stated and the exception named; the compiler-forced site split stated with the parser named as the exception; the merge tiebreak's `mergeDailyRecords` inversion warning present; all four Manual-Only rows retained with a Status naming their WINDOWS id; every ticked sign-off box true and the one untickable box carrying its reason.
- `ACHIEVEMENT_LINES_MAX` is unchanged at 2 and `src/runtime/overlays/achievementLines.ts` is byte-identical to its phase-base state (`git diff` empty for that path).
- All three requirement checkboxes read `[x]` in `REQUIREMENTS.md` (verified by `grep`); the traceability surface did not apply because no such rows exist for `N-*` ids.
- All five decisions present in the working `STATE.md`, each with exactly one colon in its bullet.

## User Setup Required

None — no external service configuration, no new environment variable, no package.

## Next Phase Readiness

**The automated half of phase 13 is complete and green. The human half is not, and it is enumerated.**

What `/gsd-verify-work` and Phase 14 inherit:

- **Four outstanding device and layout readings**, each with a reproduction recipe and the consequence of a negative answer, harvestable from Task 3's `<verify><human-check>` blocks into `13-UAT.md`. **#28 is the binding one and it can still change shipped code**: a non-zero bottom safe-area inset at 320×568pt drops `ACHIEVEMENT_LINES_MAX` to 1, with the `caps at two` case in `tests/ui/achievementLines.test.ts` and the three-name case in `tests/ui/ResultOverlay.achievements.test.tsx` moving in the same change. **#29 is expected to CLIP and confirming that is the correct outcome** — it is D-18's deferral, due at Phase 14, not a defect to file.
- **An unanswered threshold review**, four questions, in `docs/ops/ACHIEVEMENTS.md` § The catalog. The one item with a hard deadline is any **id** change: a shipped id is permanent, so it must move before the first build ships.
- **Phase 14 owns three things this phase deliberately did not take:** the Achievements screen (which reads `telemetry.achievements.unlocked` and D-14's timestamps, in catalog declaration order derived in the host, not in storage), the `maxFontSizeMultiplier` decision across the three shipped components (WINDOWS #29 / D-18), and a surface that actually **lists** a retroactive flood's unlocks — until it exists, accepted cost 1 stands: the player is told one name and a count, and nothing anywhere lists the rest.
- **Three new ledger entries** (#32, #33, #34) and WINDOWS #27 still open. `/gsd-ship` blocks while `open_count > 0`, which is 30.
- `N-ACH-01`, `N-ACH-02` and `N-ACH-03` are marked complete: 13-05 is the last plan declaring them, so the shared-ID gate released all three.

---
*Phase: 13-achievements*
*Completed: 2026-09-28*
