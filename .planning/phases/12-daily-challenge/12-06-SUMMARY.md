---
phase: 12-daily-challenge
plan: 06
subsystem: infra
tags: [documentation, ops-policy, validation, nyquist, clock-policy, device-verification]

# Dependency graph
requires:
  - phase: 12-01
    provides: "localDateKey, DAILY_DIFFICULTY, the banned-primitive module rule, the daily arm of RecordRunEndArgs, tests/ui/PlayingHost.daily-run.test.tsx"
  - phase: 12-02
    provides: "nextLocalMidnightMs, representableInstant, the derivation battery and the two-store SC-5 firewall — the measured evidence this document cites"
  - phase: 12-03
    provides: "streakFrom, endedStreakLength, previousDateKey, isValidDateKey, the amended D-16 (currentStreakStart), DAILY_HISTORY_BOUND, DAILY_STREAK_WALK_CAP, max-and-union"
  - phase: 12-04
    provides: "sanitizeDailyRecord and the validate-never-repair posture, tests/daily.clock-policy.test.ts — the guard this document names"
  - phase: 12-05
    provides: "currentDailyStreak, the panel-scoped countdown interval, localTodayRef, tests/ui/DailyResultOverlay.test.tsx"
provides:
  - "docs/ops/DAILY-CHALLENGE.md — N-DAILY-03's written clock policy, and the sole artifact that discharges SC-4"
  - "12-VALIDATION.md closed: 21 real task ids, 8 ticked Wave 0 boxes traced to creating commits, 8 routed manual verifications, a completed sign-off with nyquist_compliant: true"
  - "the phase's only full-suite run observing wave 4's combined output — 107 files / 787 tests, four assert-*.mjs scripts, unfiltered typecheck and lint"
  - "five previously-unrecorded device verifications appended to .planning/WINDOWS.md (entries 20-24)"
affects: [13-achievements, 14-title-and-entry]

# Actuals (#2632) — same estimateTokens scale the plan's `estimate` used.
actuals:
  tokens: 12367
  tasks: 2
  commits: 3
plan_head_before: e4e80bdd3aaf035dca938c9dab1f1f5094a714dd

tech-stack:
  added: []
  patterns:
    - "An ops policy document mirrors its shipped sibling section for section, and states what was NOT obtained in its own front matter"
    - "A validation record's Status column is filled from runs taken on the closed tree, never carried forward from a plan's own report"
    - "Every claim no instrument in the repository can reach is written as an instruction to a person, with the mis-attribution hazard named in the instruction itself"

key-files:
  created:
    - docs/ops/DAILY-CHALLENGE.md
  modified:
    - .planning/phases/12-daily-challenge/12-VALIDATION.md
    - .planning/WINDOWS.md

key-decisions:
  - "`12-VALIDATION.md` `status` stays `draft` while `nyquist_compliant` goes `true`. The lifecycle comment in the file's own front matter assigns `validated` to validate-phase §6, which has not run; flipping a flag that means a different thing would be the exact overstatement the sign-off block exists to prevent. Recorded in the front matter so it reads as a decision, not an oversight."
  - "The sign-off's first line is ticked with a NAMED exception rather than as 14/14: 13 of 14 phase tasks carry an `<automated>` block, and the one that does not is 12-03 Task 1, a `checkpoint:decision` that ships no code and has nothing to sample."
  - "The midday-anchor negative result is written into the ops doc as a preserved measurement rather than omitted, because the rationale it falsifies is the one a later reader would re-derive and 'correct' back."
  - "`max-and-union` is described in the ops doc as lossy with its worked under-count (500/10/410 -> 500 where the truth is 510), never as exact."
  - "WINDOWS entry 14 marked `fixed` after verifying the close mechanically, rather than left open on the grounds that another plan owned it — a ship-blocking ledger carrying a defect that demonstrably no longer exists is itself an inaccuracy."
  - "Five device verifications that existed only in prose were appended to WINDOWS (20-24), so the phase hands over eight ledger-visible human items rather than three."

patterns-established:
  - "State the narrow true claim over the broad false one: 12-06 T2 is the only full-suite run observing wave 4's combined output, NOT the phase's only npm test."
  - "A device instruction carries its own mis-attribution warning — the E5 row tells the checker to measure the row's pre-existing width first, because the row already clipped before this phase."
  - "Record the instrument beside the verdict: the Status column states it was read for the presence of `passed`, and the file states the measurement showing why neither the exit code nor `skipped` can discriminate."

requirements-completed: [N-DAILY-01, N-DAILY-02, N-DAILY-03]

coverage:
  - id: D1
    description: "docs/ops/DAILY-CHALLENGE.md exists, is git-tracked, carries at least six second-level sections, and cites every decision and requirement the phase exists to record"
    requirement: "N-DAILY-03"
    verification:
      - kind: other
        ref: "grep -cE '^#{2} ' docs/ops/DAILY-CHALLENGE.md -> 7 (floor 6; the shipped ENDLESS-MODE.md analog prints 7)"
        status: pass
      - kind: other
        ref: "per-token citation scan -> D-01:4 D-02:2 D-03:2 D-04:3 D-05:1 D-08:1 D-15:2 D-16:4 N-DAILY-01:1 N-DAILY-02:2 N-DAILY-03:3 — no pair ends in :0"
        status: pass
      - kind: other
        ref: "git ls-files --error-unmatch docs/ops/DAILY-CHALLENGE.md -> tracked; npm run lint -> exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "SC-4 is discharged: the clock policy is an explicit WRITTEN policy stating the backwards case, the forwards case, the deliberate non-distinction of timezone travel, the rejected watermark, the three accepted costs and the stated limits"
    requirement: "N-DAILY-03"
    verification:
      - kind: other
        ref: "the citation and relaunch-mention gates above; grep -ciE 'relaunch|restart' -> 3"
        status: pass
    human_judgment: true
    rationale: "The artifact IS the criterion, and no instrument in this repository can assert that written prose truthfully describes shipped behaviour. The gates prove the decisions are cited and the document is structurally present; whether each paragraph states the shipped rule correctly is a reading a human must do. Every factual claim in the document was sourced from an executed measurement recorded in a sibling SUMMARY or in 12-RESEARCH, and each is labelled in place with the engine that produced it."
  - id: D3
    description: "12-VALIDATION.md carries no placeholder task id, no unticked Wave 0 checkbox, at least 8 manual-verification data rows, and no non-terminating flag in any command"
    verification:
      - kind: other
        ref: "grep -c 'TBD' -> 0 (base 21); grep -cE '^\\- \\[ \\] `tests/' -> 0 (base 8); grep -cE '^\\| ' -> 49 (base 35, floor 38); flag scan -> 0"
        status: pass
      - kind: other
        ref: "manual-table data rows -> 8; rows matching ^| 12-0N-TN | 12-0N | N | -> 21"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every one of the 21 map rows names a task that exists in this phase's plans, and every row's command binds to a real case and passes on the closed tree"
    verification:
      - kind: unit
        ref: "all 21 commands executed on the closed tree; each read for the presence of `passed` — 2,1,1,1,1,1,7,1,18,1,1,24,2,2,1,12,1,11,4,23,1 passed; none printed `failed`"
        status: pass
      - kind: other
        ref: "non-matching control `-t \"zzz-no-such-case\"` -> Tests 18 skipped (18), no `passed`, EXIT 0 — the measurement that makes the binding rule necessary"
        status: pass
      - kind: other
        ref: "task ids cross-checked against the <task> elements of 12-01..12-05: 12-01 has 1 task, 12-02 3, 12-03 3, 12-04 2, 12-05 3 — every cited id exists"
        status: pass
    human_judgment: false
  - id: D5
    description: "The phase gate: the full suite, the four assert-*.mjs scripts, an unfiltered typecheck and a whole-tree lint, over a tree carrying BOTH wave-4 plans' edits at once"
    verification:
      - kind: integration
        ref: "npm test -> exit 0, Test Files 107 passed (107), Tests 787 passed (787), 0 lines matching 'Test Files.*failed'; assert-worklet-closures OK (126 files), assert-level-solvability OK, assert-eas-profiles OK, assert-brand-name OK"
        status: pass
      - kind: other
        ref: "npm run typecheck -> exit 0, 0 lines matching 'error TS'; npm run lint -> exit 0, 3 pre-existing warnings"
        status: pass
    human_judgment: false
  - id: D6
    description: "The eight device and layout verifications no instrument in this repository can observe, each routed to a human with concrete steps"
    verification: []
    human_judgment: true
    rationale: "jsdom performs no layout and vitest runs on Node/V8, so nothing in this suite is evidence about wrap, clipping, safe-area fit, the Android engine, a real OS timezone change, a real midnight rollover, or a played board. All eight are stated as instructions in 12-VALIDATION.md § Manual-Only Verifications and carried in .planning/WINDOWS.md (16-18 and 20-24). A passing render() assertion must not be recorded as covering any of them."
  - id: D7
    description: "The Validation Sign-Off is complete and nyquist_compliant: true is warranted by the evidence recorded beside it"
    verification:
      - kind: other
        ref: "each of the six sign-off lines measured: 13/14 tasks with <automated> (the exception named), longest unsampled run = 1, 8/8 Wave 0 files on disk with creating commits, flag scan 0, latency 9.74s full / 0.35s quick"
        status: pass
    human_judgment: true
    rationale: "Whether an adequate automated sampling rate warrants the compliance flag is the judgment the flag exists to record, and a verifier should re-read it rather than inherit it. The file states explicitly what the flag does NOT claim: eight human items remain open and nyquist compliance is a statement about sampling adequacy for what automation can observe here, not about the phase being fully verified."

# Metrics
duration: 9 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 06: The Written Clock Policy and the Closed Validation Record Summary

**N-DAILY-03's policy written down as one sentence with its four clock cases, its three accepted costs and its seven stated limits — and a validation record whose 21 rows point at real tasks, whose Status column was measured rather than inherited, and whose eight unreachable claims are instructions to a person rather than boxes a passing `render()` could tick.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-28T04:07:03Z
- **Completed:** 2026-09-28T04:16:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)
- **Suite at close:** **107 files / 787 tests**, `npm test` exit 0 with all four `assert-*.mjs` scripts passing

## Accomplishments

- **SC-4 is discharged by an artifact rather than by an implementation.** `docs/ops/DAILY-CHALLENGE.md` mirrors the shipped `docs/ops/ENDLESS-MODE.md` section for section: a front matter that states plainly what was **not** obtained, the policy as one blockquoted sentence (D-01), one sub-section per clock case (D-02/D-03/D-04/D-05), measured behaviour with **per-row engine provenance**, the two discretionary numbers as judgements, three accepted costs, the flagged assumptions, and seven limits.
- **The document describes what shipped, not what the plans predicted.** Five executions changed the phase's own facts and every one is in the written record: D-16's mid-phase amendment and the 401-for-450 measurement that forced it; the *same* defect re-entering through the read side at 400-vs-450 and the `currentDailyStreak` fix; `max-and-union` stated as **lossy** with its worked under-count; 12-04's refusal to repair on read; the panel-scoped countdown interval and the four host specs that prove the scoping load-bearing; the two date refs and the SC-1 break that collapsing them would cause; `localDateKey(NaN)` returning `0NaN-NaN-NaN`.
- **A measured negative result is preserved rather than quietly dropped.** The midday-anchor rationale written in the plans is **false** — 38 355 real dates across 15 DST-hostile zones over 2024–2030 show **0 differences** between a midnight and a midday anchor. The midday anchor ships anyway for the true reason (twelve hours of slack), with the measurement recorded so a later reader does not "correct" it back.
- **The validation record is now actionable by both an executor and a verifier.** All 21 rows carry a task id verified to exist, a plan and a wave; all 8 Wave 0 boxes are ticked and traced to the plan, task **and commit** that created each file; the manual table grew 5 → 8 rows; and a new section records the two load-bearing gates plus the filter measurement every `-t` row must be read against.
- **The phase gate ran and is green, and its claim is stated narrowly.** This is the first and only full-suite run observing **both** wave-4 plans' edits at once — the first unfiltered typecheck and first `assert-*.mjs` run since wave 3. The file explicitly does **not** claim to be the phase's only `npm test`, because `12-01` and `12-03` both gate on it; that correction is bound by an acceptance criterion and is carried verbatim.
- **Five device verifications that existed only in prose are now ledger entries.** The phase hands over **eight** ledger-visible human items (16–18 layout, 20–24 device) rather than three.

## Task Commits

1. **Task 1: `docs/ops/DAILY-CHALLENGE.md` — N-DAILY-03's written policy** — `1ab51fe` (docs)
2. **Task 2: Close `12-VALIDATION.md` — task ids, Wave 0 checklist, routed manual items** — `3817356` (docs)

**Plan metadata:** the `docs(12-06)` commit carrying this file.

**Commits measured, not narrated:** `git rev-list --count e4e80bd..HEAD` printed **2** at SUMMARY-write time and **3** once this plan's metadata commit landed; the frontmatter records **3**, on the convention 12-03 and 12-04 used. `plan_head_before` is recorded so the count is re-derivable with the same instrument.

## Files Created/Modified

- `docs/ops/DAILY-CHALLENGE.md` — **new**, 414 lines. Seven `##` sections; names `src/services/daily/` and five guarding spec files; cites all eight decisions and all three requirements; the timezone-cache limit is one sentence naming the relaunch boundary with the narrow-don't-delete instruction.
- `.planning/phases/12-daily-challenge/12-VALIDATION.md` — 21 map rows filled and measured, 8 Wave 0 boxes ticked with provenance, manual table 5 → 8 rows, phase wave map, the two-load-bearing-gates section, a measured-latency table, and a completed sign-off.
- `.planning/WINDOWS.md` — entries **20–24** appended (the five device verifications); entry **14** marked `fixed`.

## Decisions Made

The six substantive ones are in the frontmatter. Three deserve the reasoning spelled out:

1. **`status: draft` stays; `nyquist_compliant: true` is set.** These answer different questions and the file's own lifecycle comment says so — `validated` is the marker for "validate-phase §6 ran", and it has not. Setting it would claim a workflow that never executed. The decision is written into the front matter rather than left as an apparent oversight, and the sign-off block below it carries the evidence for the flag that *was* set.
2. **The sign-off's first line is ticked with the exception named.** 13 of 14 phase tasks carry an `<automated>` block; 12-03 Task 1 does not, because it is `<task type="checkpoint:decision" gate="blocking">` and ships no code. Recording "14/14" would have been false, and recording the line as failed would have been misleading about a task that has nothing to sample. The counts are printed in the file so the reader can re-derive the claim.
3. **WINDOWS entry 14 was marked fixed rather than left for its owner.** It claims `sanitizeTelemetry` does not read `telemetry.daily`. Verified mechanically before touching it: `parseBlob.ts` now contains `out.daily = sanitizeDailyRecord(telemetry.daily);`, and the 12-case `sanitizeDailyRecord` block passes. A ship-blocking ledger carrying a defect that demonstrably no longer exists trains a reader to discount the ledger.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's lint gate cites a base that is one warning stale**

- **Found during:** Task 1, at the verify gates
- **Issue:** The `fails_when` states *"MEASURED base today: exit 0 with the final line `✖ 2 problems (0 errors, 2 warnings)`"*. **Measured on this tree: `✖ 3 problems (0 errors, 3 warnings)`.** The third is `tests/daily.date-key.test.ts:100`, landed by 12-02 and already reported as a finding by 12-03, 12-04 and 12-05. The stated base predates 12-02.
- **Fix:** None needed in code — the clause itself says to bind on the **exit code, never on the substring `error`**, and the exit code is 0. This plan introduced zero warnings. Recorded so the disagreement is reported rather than silently absorbed, and the measured base is written into `12-VALIDATION.md` § Two load-bearing commands so the next reader does not rediscover it a fifth time.
- **Files modified:** none — a base-measurement correction
- **Verification:** `npm run lint` exit 0, before and after both tasks

**2. [Rule 1 - Bug] The seeded ~70 s feedback-latency figure is stale in both directions**

- **Found during:** Task 2, at the sign-off line "Feedback latency < 70 s"
- **Issue:** `12-VALIDATION.md` was seeded with *"~70 seconds full suite (measured: 99 files / 663 tests at the phase-11 close)"*, and the plan's own `<phase_gate_ownership>` and Task 2 `fails_when` repeat it. The suite is now **107 files / 787 tests** and the measured wall time **fell to 9.74 s** on this machine. Ticking a sign-off line against an estimate that is wrong in both its inputs and its output would have been a box ticked from a document rather than from a run.
- **Fix:** Added a § Measured feedback latency table with the four gates' measured results, left the seeded estimate visible and marked stale rather than silently overwriting it, and stated that the sign-off line is satisfied **by the measurement, not by the estimate**.
- **Files modified:** `.planning/phases/12-daily-challenge/12-VALIDATION.md`
- **Verification:** `npx vitest run tests/daily` → 5 files / 64 tests / 348 ms; `npm test` → 107 files / 787 tests / 9.74 s, exit 0
- **Committed in:** `3817356`

**3. [Rule 2 - Missing Critical] Five of the eight device verifications existed only in prose**

- **Found during:** Task 2, at the broken-windows step
- **Issue:** `.planning/WINDOWS.md` carried the three UI-SPEC layout backstops (16, 17, 18) but **none** of the five research device items — Android engine parity, Android locale invariance, the timezone cache on device, a real midnight rollover, and the fact that no human has played a daily board. Those five lived in `12-RESEARCH.md` and in plan prose only. The ledger is what keeps an unrun verification visible at ship time after a per-phase document scrolls out of context, so five of the phase's eight human items would have been invisible to `/gsd-ship`.
- **Fix:** Appended as entries **20–24**, each carrying the reason no instrument here can reach it. Entry 22 repeats the narrow-don't-delete instruction in the entry text itself, because that is where the person taking the reading will look.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** ledger `open_count` 17 → 21, `total_count` 19 → 24, entries 20–24 present in both the table and the JSON block
- **Committed in:** the plan metadata commit

**4. [Rule 1 - Bug] WINDOWS entry 14 describes a defect that no longer exists**

- **Found during:** Task 2, while reading the ledger
- **Issue:** Entry 14 (`stub`, 12-01) reads *"sanitizeTelemetry does not read telemetry.daily from the raw blob, so a stored daily history is discarded on hydrate (closed by plan 12-04's sanitizeDailyRecord)"*. 12-04 **did** close it and did not mark the entry. The entry names its own closer, so it was carried as open against work that had already landed.
- **Fix:** Verified the close mechanically first — `src/services/storage/parseBlob.ts` contains `out.daily = sanitizeDailyRecord(telemetry.daily);` inside `sanitizeTelemetry`, and `npx vitest run tests/storage.progress-v4.test.ts -t "sanitizeDailyRecord"` prints `12 passed` — then marked it `fixed`.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** `fixed_count` 2 → 3
- **Committed in:** the plan metadata commit

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing-critical)
**Impact on plan:** No scope creep. Two are stale base measurements in the plan's own verification procedure, caught before they could tick a box from a document instead of from a run; two are ledger accuracy — five human items that would have been invisible at ship time, and one entry carried open against work that had landed. Zero packages added; neither `package.json` nor `package-lock.json` was touched. No source file was modified: this plan's realized diff is one new ops document and one planning file, plus the ledger.

## Findings

**The `<phase_gate_ownership>` claim holds exactly as corrected, and it matters.** Both wave-4 plans in fact ran **sequentially on a quiescent tree** and each ran the tree-wide `npm test` anyway as a finding — so this gate was never the only opportunity to catch a combined-tree failure in practice. It remains the only **binding** one, and the only run whose green is recorded as the phase's evidence. That nuance is written into `12-VALIDATION.md` as a parenthetical finding rather than dropped, because a verifier reading only the wave-4 summaries would otherwise see two green full-suite runs and not know whether either was authorised.

**The non-matching-filter measurement was reproduced a fifth time and is now written into the validation record itself.** `npx vitest run tests/daily.record.test.ts -t "zzz-no-such-case"` prints `Tests 18 skipped (18)` and **exits 0**. Four prior executors each found their own plan's gates bound on `skipped` and corrected them as Rule 1 deviations. This plan's gates were already correct; the measurement is recorded in `12-VALIDATION.md` § Two load-bearing commands so the *reader of the map* knows a green exit code proves nothing about whether a filtered row ran.

**`docs/ops/PROGRESS-STORAGE.md` is stale at v3 and was deliberately not touched.** It documents the v3 blob and its migration chain; the shipped constant is `PROGRESS_VERSION = 4`. The daily record joins the v4 blob with no version bump, which `docs/ops/DAILY-CHALLENGE.md` states in its own "Why this document exists" section with the no-migration case named as its guard. Updating the storage doc is out of this plan's scope and is **not** a defect this plan introduced — flagged here so it is not mistaken for one.

## TDD Gate Compliance

Not applicable. `gsd_run query phase.tdd-applicable` resolved **false** for this plan and no task carries `tdd="true"`. The plan ships one documentation file and one planning file and adds no source file, so `task.is-behavior-adding` is false for both tasks and the MVP+TDD gate does not fire. No RED phase was manufactured, deliberately: a RED for a document would have to be either a broken source file or an assertion that does not describe anything.

## Broken-windows Ledger

**Five entries appended (20–24)** — the five research device-verification items, each with the reason no instrument in this repository can reach it. **One entry closed (14)** after verifying the close mechanically. No stub, no skipped test and no unrun `<verify>` was introduced: every `<automated>` gate in both tasks was executed and its output is recorded above.

The ledger now carries **eight** open phase-12 human items — 16, 17, 18 (the UI-SPEC layout backstops) and 20, 21, 22, 23, 24 (the device items) — which is the complete set routed by `12-VALIDATION.md` § Manual-Only Verifications, less the inherited Phase 11 glow-halo row that already has its own entry upstream.

## Threat Flags

None. This plan adds no endpoint, no auth path, no file access pattern and no schema at a trust boundary; it modifies no source file at all. Every register row it owns is mitigated:

- **T-12-26** (a written policy omitting its accepted costs) — the practice hole (D-08), the read-failure second attempt and accepted blob tampering are each a named sub-section under § Accepted costs, and the per-decision citation gate proves each is present.
- **T-12-27** (a passing render assertion recorded as having verified a layout claim) — the three layout backstops are manual-table rows with concrete device steps; the document and the validation record each state that jsdom performs no layout; and the validation record carries the measurement showing a non-matching filter exits 0 and reports skipped, so a green exit cannot be read as evidence a filtered row ran.
- **T-12-28** (a sign-off overstating its evidence) — every sign-off line carries the measurement that satisfies it, the one task without an automated verify is named rather than absorbed, and the file states in its own words what the compliance flag does **not** claim.
- **T-12-29** (the timezone-cache limit deleted rather than narrowed after a device check) — stated in the document's Limits section, repeated in the manual-table instruction, and repeated a third time in WINDOWS entry 22, which is where the person taking the reading will be looking.
- **T-12-SC** — zero packages added.

## Issues Encountered

None requiring problem-solving beyond the four deviations. Both stale base measurements (lint warnings, feedback latency) were caught by measuring before ticking rather than by a gate going red, which is why they appear as recorded corrections instead of debugging sessions.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Phase 12 is complete and ready for `/gsd-verify-work`.** The tree is green at 107 files / 787 tests with typecheck and lint exit 0, and nothing in the phase is implicit: the clock policy is a document, the validation record points at real tasks, and every claim this repository's instruments cannot reach is written as an instruction to a person.

**What the verifier owns, and nothing else does — the eight human items, verbatim from `12-VALIDATION.md` § Manual-Only Verifications so they can be routed rather than inferred:**

1. **Android engine parity on a DST day.** On an Android device or emulator, set the system zone to `America/Santiago` and the date to 2026-09-05 23:58 local. Confirm the app's daily date advances to `2026-09-06` at 01:00 local and the countdown reads roughly two minutes beforehand. The desktop harness ran only the Apple slice; the Android engine is a separate compilation against a different time-zone database.
2. **Android locale invariance.** On a physical Android device, set a non-Gregorian locale and confirm the rendered daily date is unchanged. The five-locale measurement was taken on the Apple slice.
3. **The per-runtime timezone cache, on device.** With the app foregrounded, change the device timezone across a date boundary (two zones roughly a day apart) and observe whether the rendered daily date changes without an app relaunch. **If it does change, the Limits paragraph in `docs/ops/DAILY-CHALLENGE.md` should be narrowed — not deleted.**
4. **A real local-midnight rollover.** Leave the Daily Result panel open across local midnight on a physical device. Confirm the countdown never renders a negative value, that the line is omitted at or below zero, and that the date re-derives.
5. **Panel horizontal fit at extreme values.** With a 7-digit score, a 4-digit streak and a 5-digit days-played on the shipped 320px panel, confirm no wrap and no clipping. (UI-SPEC E1 backstop.)
6. **Panel vertical fit.** On a 320 × 568 pt viewport with the fully-populated 11-row panel, confirm the `Menu` control is visible without scrolling and the panel sits inside the safe area. (UI-SPEC authored backstop.)
7. **Dev row reachability.** On a 375 pt-wide viewport, confirm the `Daily` control is fully on-screen and tappable. Note first whether the row already clips before `Daily` is considered — it is computed to be past that width in its two default tier states — so the observation is attributed correctly. (UI-SPEC E5 backstop.)
8. **One real daily board, played.** Play a full daily board to a win and to a loss on consecutive days and confirm the streak, the best streak and the days-played figures move as the policy document says they do. **No human has played a daily board at the point this phase completes, and the ops document says so in its own front matter.**

**For Phase 13 (achievements over daily play):** `TelemetryBlob.daily` carries the bounded history plus the three surviving members, and `byMode.daily` accumulates every attempt including runs that did not close the date (D-09). Read the current streak through `currentDailyStreak`, never through `streakFrom` over the stored keys — the second under-reports past the window and is the defect 12-05 caught.

**For Phase 14 (Meta Shell):** the `__DEV__` `Daily` control, the dev row it sits in, and the `PauseOverlay` `mode` prop's `'daily'` arm are the surfaces to replace or delete. The Daily Result panel itself is production and stays. Deleting the dev row also retires the E5 backstop (ledger entry 18).

**One carried concern, not a blocker:** `docs/ops/PROGRESS-STORAGE.md` still documents the v3 blob while the shipped constant is `PROGRESS_VERSION = 4`. Pre-existing and out of this phase's scope; noted so it is not attributed to the daily work.

No blockers.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `docs/ops/DAILY-CHALLENGE.md`, `12-VALIDATION.md` and this SUMMARY all exist on disk; the ops document is git-tracked (`git ls-files --error-unmatch` exit 0).
- Both task commits (`1ab51fe`, `3817356`) are reachable from HEAD.
- `git rev-list --count e4e80bd..HEAD` measures the commits recorded in `actuals`; `plan_head_before` is recorded so the count is re-derivable with the same instrument.
- Every `<acceptance_criteria>` row from both tasks was executed: 7 `##` sections (floor 6), all 11 citation tokens non-zero, `relaunch|restart` count 3, `TBD` count 0 (base 21), unticked Wave 0 count 0 (base 8), table rows 49 (base 35, floor 38), non-terminating-flag scan 0, 21 rows matching the `12-NN-TN` id pattern, 8 manual-table data rows.
- Plan-level `<verification>` green end to end: `npm test` exit 0 at 107 files / 787 tests with all four `assert-*.mjs` scripts passing, `npm run typecheck` exit 0 with 0 `error TS` lines, `npm run lint` exit 0. All 21 map commands executed and each read for the presence of `passed`; the non-matching control printed `18 skipped (18)` with no `passed` and exit 0.
- The eight human-check items are recorded verbatim under § Next Phase Readiness so the verifier can route them rather than infer them.
