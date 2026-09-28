---
phase: 12-daily-challenge
plan: 04
subsystem: storage
tags: [daily, sanitize-on-read, parse, tamper-fence, clock-policy, vitest, tdd]

requires:
  - phase: 12-01
    provides: localDateKey, DAILY_TELEMETRY_KEY, DailyRecord on TelemetryBlob, the daily arm of RecordRunEndArgs
  - phase: 12-02
    provides: tests/storage.daily-firewall.test.ts, the capture-and-restore process.env.TZ idiom, representableInstant
  - phase: 12-03
    provides: isValidDateKey, previousDateKey, hasResultFor, streakFrom, DAILY_HISTORY_BOUND, the three D-16 members and resolveStreakStart's derived-beats-carried contract
provides:
  - "src/services/storage/parseBlob.ts — sanitizeDailyRecord, sanitizeDailyHistoryEntry, sanitizeStreakStart, wired into sanitizeTelemetry"
  - "The daily record now SURVIVES a serialise/parse round trip — the gap 12-03's handoff named, where telemetry.daily was not read at all and reset on every app open"
  - "tests/daily.clock-policy.test.ts — N-DAILY-03's clock policy pinned as one membership test, with a standing anti-cheat source guard"
  - "The 'invalid key' case on tests/daily.record.test.ts that 12-VALIDATION.md's filter binds to"
affects: [12-05, 12-06]

actuals:
  tokens: 11505
  tasks: 2
  commits: 4
plan_head_before: 39d709e26a65e6391518e9bb0e151a8b694f70aa

tech-stack:
  added: []
  patterns:
    - "Drop-on-invalid for a keyed entry, copying sanitizeRunLogEntry — validate against a closed set, return nothing, let the caller skip"
    - "Bound on read applied AFTER the drop, never before, so padding garbage cannot evict real entries"
    - "A read sanitizer VALIDATES but does not REPAIR: no re-sort, no de-duplication, because repairing a tampered order would inflate a derived number"
    - "Mutation red-proofs for a spec that pins already-shipped behaviour and therefore cannot have a RED phase"

key-files:
  created:
    - tests/daily.clock-policy.test.ts
  modified:
    - src/services/storage/parseBlob.ts
    - tests/storage.progress-v4.test.ts
    - tests/daily.record.test.ts

key-decisions:
  - "sanitizeStreakStart rejects three ways and carries one: an invalid key, an empty surviving history, and a start LATER than the newest surviving date all degrade to '' — but a start OLDER than the oldest surviving date is deliberately CARRIED, because expressing a run longer than the bounded window is the entire reason D-16's amendment stores the field."
  - "The rule mirrors resolveStreakStart's rule 4 in telemetry.ts rather than inventing a second opinion; the walk-cap fence stays where the walk is."
  - "The surviving history is NOT re-sorted and NOT de-duplicated on read. mergeDailyRecord sorts on write, so out-of-order entries are evidence of tampering and the streak walk ends early on them — under-reporting. Sorting here would REPAIR a tampered blob into a longer streak than its own stored order can justify."
  - "The newest key inside sanitizeStreakStart is taken as a MAXIMUM rather than as the last array element, precisely because a tampered blob need not be sorted and the predicate must not depend on an order it cannot trust."
  - "Task 2 ships no source and therefore has no RED phase. Rather than manufacture one, its six cases were proved non-vacuous by four source MUTATIONS, each reverted — which is stronger evidence than a RED commit would have been."
  - "The prohibition (no anti-cheat branch) and 12-03's tampering posture are reconciled exactly as 12-03 reconciled them: discarding a value that cannot be trusted is not a penalty. It degrades to 'no stored result', which is the playable direction. No branch anywhere tells the player anything about their clock."

patterns-established:
  - "Validate, never repair: a read-side sanitizer's job is to drop what it cannot trust, not to normalise it into something that looks trustworthy."
  - "When a spec pins already-shipped behaviour, prove non-vacuity by mutating the source and reverting — a green-on-first-run case otherwise has the same shape as a vacuous one."
  - "Every rejection battery carries a positive control in the same case, so a validator that rejected everything could not pass it."

requirements-completed: []

coverage:
  - id: D1
    description: "The daily record is bounded on READ as well as on write — a blob written by an older build or edited on a rooted device cannot grow the history past DAILY_HISTORY_BOUND (D-15 / T-12-16)."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > trims a history longer than DAILY_HISTORY_BOUND on read — a tampered blob cannot grow the window (T-12-16)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > applies the trailing-window trim AFTER dropping invalid entries, so padding garbage cannot push real dates out of the window"
        status: pass
    human_judgment: false
  - id: D2
    description: "A history entry whose date key is malformed, out of range, oversized or not a string is DROPPED on read, degrading that date to 'no stored result' — the playable direction (T-12-15 / UI-SPEC § Storage-failure)."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > drops a history entry naming an impossible calendar date — month 0 or 13, day 0 or 32, 30 February, and 29 February in a non-leap year"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > drops a 4 000-character date string rather than truncating it or rendering it (T-12-15)"
        status: pass
      - kind: integration
        ref: "tests/daily.record.test.ts#a tampered blob supplying an invalid key (T-12-15 / D-01, 12-04) > drops the entry with an invalid key and leaves that date with no stored result — the playable direction"
        status: pass
    human_judgment: false
  - id: D3
    description: "A broken field in the daily record cannot discard a good sibling field — each of the four members is coerced independently from the default, inheriting sanitizeTelemetry's stated independence contract."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > a partial daily record keeps the fields it does have and coerces the invalid ones (D-16)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > every non-numeric daily scalar shape degrades to 0 without touching its sibling scalar"
        status: pass
    human_judgment: false
  - id: D4
    description: "Daily corruption degrades daily ALONE: campaign bests, stars, unlocks, bestScore and the endless record are provably untouched by a fully corrupt daily record (N-DAILY-03 / SC-5)."
    requirement: "N-DAILY-03"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > a fully corrupt daily record leaves unlocked, bestByLevel, bestScore, stars and the endless record intact (N-DAILY-03 / SC-5)"
        status: pass
      - kind: integration
        ref: "npx vitest run tests/storage.daily-firewall.test.ts -> Test Files 1 passed, both stores green after the read path was wired"
        status: pass
    human_judgment: false
  - id: D5
    description: "An existing v4 blob written before the daily record existed parses with the field defaulted and every campaign field intact — no version bump, no migration."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > an existing v4 blob written before the daily record existed parses with the field defaulted and every campaign field intact — no version bump, no migration"
        status: pass
    human_judgment: false
  - id: D6
    description: "An invalid currentStreakStart degrades in the UNDER-reporting direction, while a start reaching back past the trimmed window is carried — the D-16 amendment's whole purpose."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#sanitizeDailyRecord — bounded on read, every stored key validated (12-04) > degrades an invalid currentStreakStart downward to the empty start, never to one that inflates a streak (D-16 amendment)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Winding the clock backwards to a date that already has a stored result leaves it read-only: the stored result is unchanged and a repeat write replaces rather than appends, with the D-16 scalars unmoved (D-02)."
    requirement: "N-DAILY-03"
    verification:
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#winding the clock backwards (D-02 / N-DAILY-03, 12-04) > backwards: a date that already has a stored result stays read-only, and a repeat write is not a second attempt"
        status: pass
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#winding the clock backwards (D-02 / N-DAILY-03, 12-04) > backwards: with no write, winding the clock cannot change the stored set at all"
        status: pass
    human_judgment: false
  - id: D8
    description: "Winding the clock forwards makes the new date playable and breaks the streak BY ITSELF — 1, not 8 — with no anti-cheat branch anywhere in the code (D-03 / D-04 / D-05)."
    requirement: "N-DAILY-03"
    verification:
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#winding the clock forwards (D-03 / D-04 / D-05 / N-DAILY-03, 12-04) > forwards: a seven-day jump opens the new date and breaks the streak BY ITSELF — 1, not 8"
        status: pass
      - kind: other
        ref: "sed 's://.*::' src/services/daily/*.ts | grep -vE '^\\s*\\*|^\\s*/\\*' | grep -cE '(watermark|highestDate|lastSeenDate|clockTamper)[A-Za-z]*\\s*[:=]' -> 0"
        status: pass
    human_judgment: false
  - id: D9
    description: "The whole clock policy is one rule evaluated as set membership over stored dates (D-01), and timezone travel is that same rule rather than a special case (D-04)."
    requirement: "N-DAILY-03"
    verification:
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#the clock policy is one membership test over stored dates (D-01 / N-DAILY-03, 12-04) > a date is playable if and only if it has no stored result — that is the whole rule"
        status: pass
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#timezone travel is the same rule, not a special case (D-04, 12-04) > the derived local date differs by zone, and whichever one is derived is playable iff it has no stored result"
        status: pass
      - kind: integration
        ref: "tests/daily.clock-policy.test.ts#neither conclusion consulted a clock (SC-3 / D-05, 12-04) > the same stored dates give the same answers under every pinned zone — the policy reads dates, not time"
        status: pass
    human_judgment: false
  - id: D10
    description: "A REAL device clock change and a REAL device timezone change mid-session behave as D-01 describes on hardware."
    verification: []
    human_judgment: true
    rationale: "No test can move a device wall clock or trigger the OS timezone-change notification path; 12-RESEARCH § Finding 4 measured Hermes caching the zone per runtime and routed it to § Device Verification Items #2. vitest runs on Node/V8, so a green suite here is evidence about V8 and about the RULE, not about that cache. Carried by plan 12-06."

duration: 18 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 04: The Read Half of the Daily Firewall Summary

**`sanitizeDailyRecord` wired into the shipped sanitizer chain — four members validated independently, every stored date key checked by integer arithmetic, the window trimmed AFTER the drop, and N-DAILY-03's clock policy pinned as the one membership test it is.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-28T03:14:00Z
- **Completed:** 2026-09-28T03:32:00Z
- **Tasks:** 2 (both TDD)
- **Files created/modified:** 4
- **Suite:** 105 files / 734 tests at base → **106 files / 753 tests**, all green

## Accomplishments

- **The daily record now survives a round trip at all.** `sanitizeTelemetry` did not read `telemetry.daily`, so the whole record — history and all three D-16 members — reset to `defaultDailyRecord()` on every app open. That gap was 12-03's explicit handoff and it is closed; the record absorbed the schema change to **four** members rather than the two this plan was written against.
- **`isValidDateKey` is wired into the read path**, which is the ASVS V5 control for the phase: the persisted blob is the only externally-influenced input, and on a rooted device it is fully attacker-controllable. A 4 000-character date is dropped, not truncated — nothing of it survives anywhere in the parsed record, so nothing of it can reach the panel that renders a stored key verbatim.
- **The trim runs after the drop, and the case proves the ordering rather than asserting it.** 400 real dates followed by 40 pieces of padding garbage: trim-then-drop yields 360 survivors, drop-then-trim yields 400. The case asserts 400 and the exact key list.
- **`currentStreakStart` degrades downward but is not over-fenced.** A start older than the oldest surviving date is *carried*, because expressing a run longer than the bounded window is the entire reason D-16 was amended to store it. Controls for both directions sit in the same case.
- **N-DAILY-03's policy is now an instrument rather than a paragraph** — six cases under pinned zones and an injected clock, driven through a real store, plus a standing source guard against the watermark D-04 and D-05 declined on the record.
- **Task 2's non-vacuity was proved by mutation, not by assertion.** Four source mutations each red exactly the case that should notice them; every one was reverted.

## Task Commits

1. **Task 1: `sanitizeDailyRecord`** — `540e539` (test, RED) → `15111c7` (feat, GREEN). No REFACTOR: the implementation is the three shipped analogs in the same file, so there was no cleanup to make.
2. **Task 2: `tests/daily.clock-policy.test.ts`** — `b8bd017` (test). No RED phase is possible — see § TDD Gate Compliance.

**Commits measured, not narrated:** `git rev-list --count 39d709e..HEAD` printed **3** at SUMMARY-write time and **4** once this plan's own metadata commit landed; the frontmatter records **4**, re-measured after the fact, on the same convention 12-03 used. `plan_head_before` is recorded so the count is re-derivable with the same instrument.

## Files Created/Modified

- `src/services/storage/parseBlob.ts` — `DAILY_OUTCOME_SET`, `sanitizeDailyHistoryEntry`, `sanitizeStreakStart`, `sanitizeDailyRecord`; the `isValidDateKey` import from `../daily`; one line wiring the record into `sanitizeTelemetry` beside the endless record; the `sanitizeTelemetry` doc comment extended to state the daily record's two extra obligations
- `tests/storage.progress-v4.test.ts` — a 12-case `sanitizeDailyRecord` block mirroring the endless-record block case for case
- `tests/daily.record.test.ts` — the `invalid key` case, asserting the drop and the playability consequence together
- `tests/daily.clock-policy.test.ts` — new, 6 cases

**`sanitizeAggregateMap` is untouched.** Verified by extracting the function region before and after the task and running `diff`: byte-identical, 17 lines, no cap. The unbounded-collection hazard it represents was closed upstream in 12-01 by keying `byMode.daily` on a constant; a cap here would paper over a per-date key instead of preventing one and would silently discard campaign level aggregates.

## Decisions Made

The six in the frontmatter are the substantive ones. Three deserve the reasoning spelled out:

1. **Validate, never repair.** The surviving history is not re-sorted and not de-duplicated. It is tempting — `mergeDailyRecord` sorts on write, so sorting on read "restores the invariant". But out-of-order entries can only come from tampering, the streak walk ends early on them (under-reporting), and sorting would turn a tampered order into a *longer* streak than the blob's own stored order can justify. Under-reporting is the direction this phase has taken at every fence.
2. **`sanitizeStreakStart` takes the newest key as a maximum, not as the last element.** That is not defensive style; it is the direct consequence of decision 1. Having refused to sort, the predicate must not then assume an order.
3. **The walk-cap fence stayed in `telemetry.ts`.** A start reaching absurdly far back is bounded by `DAILY_STREAK_WALK_CAP` where the walk lives. Duplicating that check on the read side would create a second opinion that can drift from the first.

**On the plan's unresolved prohibition** (the clock policy must not become an anti-cheat mechanism) **and 12-03's tampering posture** (a value that cannot be trusted is discarded): these are reconciled exactly as 12-03 reconciled them, and the reconciliation is now load-bearing in shipped code. Discarding an untrustworthy value is not a penalty — it degrades to "no stored result", which is the *playable* direction. No branch added by this plan tells the player anything about their clock, and `tests/daily.clock-policy.test.ts` carries the standing guard that keeps it that way.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Four `<verify>` gates bind on a condition no passing run can meet**

- **Found during:** Tasks 1 and 2
- **Issue:** Task 1's first two `fails_when` clauses and Task 2's first two treat the word `skipped` as failure. A *matching* `-t` filter on a multi-case file prints `Tests  1 passed | 17 skipped (18)` — `skipped` is present on every successful filtered run, so a gate bound on it reds on every green. Identical to 12-02's deviation 1 and 12-03's deviation 2, and flagged in the dispatch brief.
- **Fix:** Bound on the presence of `passed`. **Red-proved on this plan's own files:** a deliberately non-matching filter (`-t "zzz-no-such-case"`) against `tests/daily.record.test.ts` prints `Tests  18 skipped (18)` — no `passed` — and **exits 0**, so neither the exit code nor the word `skipped` can discriminate. The `passed` binding does.
- **Files modified:** none — a verification-procedure correction
- **Verification:** `invalid key` → `1 passed | 17 skipped (18)`; `backwards` → `2 passed | 4 skipped (6)`; `forwards` → `1 passed | 5 skipped (6)`

**2. [Rule 2 - Missing Critical] The plan's `<behavior>` for `sanitizeDailyRecord` describes a two-scalar record**

- **Found during:** Task 1, before any file was written
- **Issue:** The plan was authored against `DailyRecord` as `{ history, longestStreak, totalDaysPlayed }`. 12-03's checkpoint amendment added `currentStreakStart`, a stored date key, and it is the one member that can *inflate* a lifetime number — a hostile `0001-01-01` would claim two millennia of daily play. A sanitizer validating only the three documented members would have passed the plan's own acceptance criteria while leaving the single most dangerous field unvalidated.
- **Fix:** Added `sanitizeStreakStart` with the three-rejection / one-carry contract in the frontmatter, and a dedicated case covering both directions. The dispatch brief flagged the schema change, so this was absorbed rather than discovered by a red test.
- **Files modified:** `src/services/storage/parseBlob.ts`, `tests/storage.progress-v4.test.ts`
- **Verification:** the `currentStreakStart` case asserts two carries (in-window and past-window) and eight rejections
- **Committed in:** `15111c7`

**3. [Rule 1 - Bug] Task 2 cannot have a RED phase, and manufacturing one would have been a lie**

- **Found during:** Task 2
- **Issue:** The task is marked `tdd="true"` but its `<files>` names only a test file. Every behaviour it pins was shipped by 12-02 and 12-03, so the spec is green on first run. A RED commit would have required either breaking shipped code or writing an assertion that does not describe the behaviour — both of which defeat what the gate is for.
- **Fix:** Committed as `test(12-04)` with no RED, and proved non-vacuity by **mutation** instead: append-instead-of-replace in `mergeDailyRecord` reds `backwards`; `streakFrom` returning the array length reds `forwards`; a declared `lastSeenDateKey` reds the source guard inside `forwards`; a UTC-serialising `localDateKey` reds the travel case. Each mutation was reverted with `git checkout -- <file>` and a clean control run confirms 6/6 green. Recorded in § TDD Gate Compliance rather than glossed.
- **Files modified:** none beyond the spec itself
- **Verification:** four mutation runs, each redding exactly one case; control run 6 passed (6); `git status` clean afterwards

**4. [Rule 1 - Bug] Three of Task 1's twelve new cases are green at RED**

- **Found during:** Task 1's RED run
- **Issue:** 9 of 12 new v4 cases plus the `invalid key` case red as expected. Three did not: *missing-or-non-object record → default*, *fully corrupt record → siblings intact*, and *no-migration*. All three assert that the daily record equals its default, which was trivially true before the wiring existed because `sanitizeTelemetry` ignored the field entirely.
- **Fix:** Recorded rather than papered over, on the same reasoning 12-03 applied to its own three green-at-RED cases: a green-on-first-run case has exactly the shape a vacuous one also has. These three are not vacuous — after the wiring they exercise the real defaulting path — but they were *not* proof of anything at RED, and saying so is the honest record.
- **Files modified:** none
- **Verification:** RED evidence machine-verified at `64 tests, 54 pass, 10 fail`; post-GREEN `64 passed (64)`

**5. [Rule 3 - Blocking] Both of this plan's requirement IDs are blocked by the shared-ID gate**

- **Found during:** the requirements step
- **Issue:** `N-DAILY-02` and `N-DAILY-03` are also declared by `12-05-PLAN.md` and `12-06-PLAN.md`, neither of which has a SUMMARY yet. `requirements.ready-ids` returns `0/2 requirement(s) ready`.
- **Fix:** `requirements.mark-complete` was **not** run and `requirements-completed` is `[]`. Both IDs become ready when the last declaring plan (12-06) finishes. This is the gate working, not a failure — marking them now would flip them `Complete` while siblings are still running.
- **Files modified:** none
- **Verification:** `gsd-tools query requirements.ready-ids .planning/phases/12-daily-challenge/12-04-PLAN.md N-DAILY-02 N-DAILY-03` → `0/2`

---

**Total deviations:** 5 (3 bugs, 1 missing critical, 1 blocking)
**Impact on plan:** No scope creep — every file touched is in `files_modified`. Zero packages added. Three of the five are defects in the plan's own instructions or verification procedure, caught before they could report a false result: two `<verify>` gates that red on every green, and a `<behavior>` list that would have left the one inflating field unvalidated.

## Findings

**`npm test` was run anyway, and it is green at 106 files / 753 tests, exit 0.** The plan deliberately defers the tree-wide gate to 12-06 Task 2 because this plan shares wave 4 with 12-05 and a full-suite gate would observe a sibling's half-applied edits. That reasoning is sound — but this executor ran **sequentially on a quiescent main working tree** (`git status` showed no 12-05 edits in flight at any point), so the hazard the deferral protects against was not present and the extra evidence is free. The four `assert-*.mjs` scripts pass too. **12-06's gate is still the binding one**; this is a data point, not a substitution.

**Lint is 3 warnings and unchanged.** `npm run lint` exits 0 printing `✖ 3 problems (0 errors, 3 warnings)`, exactly the base 12-03 re-measured. This plan introduced zero warnings.

**The scoped typecheck expression is doing real work even with no sibling running.** It prints `0`, and it prints `0` for the right reason: there are no `error TS` lines at all, filtered or not.

## TDD Gate Compliance

| Task | Ships source? | RED | GREEN | REFACTOR | Status |
|---|---|---|---|---|---|
| 1 — `sanitizeDailyRecord` | yes | ✓ `540e539` | ✓ `15111c7` | — none needed | Pass |
| 2 — the clock-policy spec | **no** | n/a — see below | n/a | — | n/a (test-only) |

**Task 1's RED was machine-verified, not asserted.** `gsd-tools check tdd-red-evidence` returned `RED_EVIDENCE_OK` / `target_test_failed`, exit 1, `64 tests, 54 pass, 10 fail`, target `tests/daily.record.test.ts > a tampered blob supplying an invalid key (T-12-15 / D-01, 12-04) > drops the entry with an invalid key and leaves that date with no stored result — the playable direction`. The evidence record was built from a `--reporter=tap-flat` run with the `# tests` / `# pass` / `# fail` summary lines computed mechanically from the `ok`/`not ok` counts, under `bash`.

**Task 2 is test-only and is therefore exempt from the behaviour-adding gate** (`task.is-behavior-adding` requires a non-test source file in `<files>`; Task 2 names one test file). It is recorded as `n/a` rather than as a violation, and its non-vacuity is carried by the four mutation red-proofs in deviation 3 — which is stronger evidence than a RED commit, because a RED commit proves one case fails while the mutations prove four *specific* cases each notice the *specific* defect they exist against.

## Broken-windows Ledger

No new entries. This plan ships no stub, no skipped test and no unrun `<verify>` — every gate in both tasks was executed and its output recorded above. The three green-at-RED cases in deviation 4 are not ledger entries: they execute, they assert real behaviour post-GREEN, and they are documented rather than hidden.

## Threat Flags

None. Every register row this plan owns is mitigated and asserted:

- **T-12-15** (oversized / non-ASCII stored date rendered verbatim) — `isValidDateKey` on read with integer range checks and no parse round trip; the 4 000-character case asserts the entry is absent *and* that no 32-character prefix of it survives anywhere in the record.
- **T-12-16** (a tampered blob growing the history past its bound) — trailing-window trim on read, applied after the drop, with the ordering made falsifiable by the 400-real-plus-40-garbage case.
- **T-12-17** (daily corruption cascading into campaign state) — per-field independent coercion from the default; the fully-corrupt case checks `unlocked`, `bestByLevel`, `bestScore`, stars, the endless record and `lifetime` are all intact and that the blob does not read as `corrupt`.
- **T-12-18** (a "helpful" tamper check added later) — the comment-stripped grep over the daily policy tree prints `0`, and the same guard is now a *case* inside `forwards` with its own non-vacuity control, so it fires in CI rather than only in a planner's checklist.
- **T-12-19** (a transient read failure handing a player a second attempt) — accepted, unchanged, and now named in the shipped doc comment rather than only in the UI-SPEC.
- **T-12-SC** — zero packages added.

No new security-relevant surface: this plan adds no endpoint, no auth path, no file access and no schema change. It adds a *control* on an existing trust boundary.

## Issues Encountered

None that required problem-solving beyond the deviations above. The schema change 12-03 made under this plan was flagged in the dispatch brief and absorbed before the first line was written, which is why it appears as a Rule 2 deviation rather than as a debugging session.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

Wave 4's storage half is complete and the tree is green at 106 files / 753 tests. Two handoffs:

- **12-05 (render) can now trust what it reads.** The daily record survives a round trip for the first time, so the panel's three numbers (`streakFrom` over the stored keys, `longestStreak`, `totalDaysPlayed`) are read from persisted state rather than from a record that resets on every app open. Note that a *dropped* entry is indistinguishable from a date never played — that is the intended degradation (UI-SPEC § Storage-failure) and the panel must not try to detect it.
- **12-06 (docs + device verification) owns three things this plan deliberately did not close.** The tree-wide `npm test` gate with the four `assert-*.mjs` scripts (run here as a finding, but 12-06's run is the binding one); the `docs/ops/DAILY-CHALLENGE.md` sentence recording D-01 plus the Pitfall 5 consequence; and the two device-verification items — a real device clock change and a real OS timezone change across a date boundary — which no test in this repo can observe. Coverage entry **D10** is the `human_judgment: true` row carrying them.

No blockers.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*

## Self-Check: PASSED

`tests/daily.clock-policy.test.ts` and this SUMMARY exist on disk; all four commits (`540e539`, `15111c7`, `b8bd017`, and this plan's own metadata commit) are present in the log, and `git rev-list --count 39d709e..HEAD` measures **4**, matching the frontmatter exactly.

Every `<acceptance_criteria>` row from both tasks and the whole plan-level `<verification>` were re-run after the metadata commit:

- `npx vitest run tests/storage.progress-v4.test.ts tests/daily.record.test.ts tests/daily.clock-policy.test.ts` → 3 files / **70 passed (70)**
- the three filters bind to real cases — `invalid key` → `1 passed`, `backwards` → `2 passed`, `forwards` → `1 passed` (bound on `passed`, per deviation 1)
- `sanitizeAggregateMap` extracted by function name → **byte-identical** to its pre-task content by `diff`
- comment-stripped `src/services/daily/*.ts` anti-cheat grep → **0**
- scoped typecheck → **0**; `npx eslint` over this plan's four files → exit **0**
- the eight-file scoped run → 8 files / **132 passed (132)**
- and, as a finding rather than as a required gate, the tree-wide `npm test` → exit **0** at 106 files / 753 tests with all four `assert-*.mjs` scripts passing
