---
phase: 12-daily-challenge
plan: 03
subsystem: storage
tags: [daily, streak, telemetry, vitest, tdd, date-arithmetic]

requires:
  - phase: 12-01
    provides: localDateKey, DAILY_DIFFICULTY, DailyRecord, mergeDailyRecord, the daily arm of RecordRunEndArgs
  - phase: 12-02
    provides: nextLocalMidnightMs, representableInstant, tests/storage.daily-firewall.test.ts (the gate this plan runs)
provides:
  - "src/services/daily/streak.ts — hasResultFor, streakFrom, endedStreakLength (D-01/D-13/D-14/D-17)"
  - "previousDateKey and isValidDateKey on src/services/daily/dateKey.ts"
  - "DailyRecord.longestStreak, .totalDaysPlayed and .currentStreakStart (D-16, amended)"
  - "DAILY_HISTORY_BOUND = 400 and DAILY_STREAK_WALK_CAP = 36525"
  - "write-side bound and the max-and-union reconcile in mergeDailyRecord / mergeDailyRecords"
affects: [12-04, 12-05, 12-06]

actuals:
  tokens: 18778
  tasks: 3
  commits: 5
plan_head_before: 8b6eb6a19a37501cb3fcd8c3aaeac912b7be26c2

tech-stack:
  added: []
  patterns:
    - "Per-mode pure policy module mirroring src/services/endless/ramp.ts, with a four-section doc header"
    - "Derived-beats-carried: a stored scalar is trusted only where the stored dates cannot contradict it"
    - "Tamper fences degrade in the under-reporting direction, never the inflating one"

key-files:
  created:
    - src/services/daily/streak.ts
    - tests/daily.streak.test.ts
    - tests/daily.record.test.ts
  modified:
    - src/services/daily/dateKey.ts
    - src/services/daily/index.ts
    - src/services/storage/types.ts
    - src/services/storage/telemetry.ts
    - src/services/storage/index.ts
    - tests/daily.board.test.ts

key-decisions:
  - "D-16 amended at the blocking checkpoint with developer approval: DailyRecord gains a third stored value, currentStreakStart, a DATE rather than a counter. With only longestStreak and totalDaysPlayed the closing streak could be derived only from the bounded window, so longestStreak saturated at DAILY_HISTORY_BOUND + 1 — MEASURED at 401 for 450 consecutive closes — which defeats D-16's own stated purpose."
  - "max-and-union for the reconcile: longestStreak takes a per-field maximum, totalDaysPlayed takes max(a, b, size of the unioned history). Stated in the doc comment as a contract rather than inherited from the endless analog, which has no count field."
  - "The max-and-union rule is NOT lossless and is not described as such: a trimmed copy reconciled against one holding dates exclusively outside that window under-counts by the overlap. Worked example asserted in the spec."
  - "currentStreakStart is reconciled by derived-beats-carried, not by min(a, b): when the unioned history contains a gap the start is exactly derivable and BOTH stored claims are discarded; only a union that is consecutive end to end lets the earlier claim stand."
  - "DAILY_STREAK_WALK_CAP = 36525 (100 Gregorian years) is a tamper fence, not a streak ceiling. Exceeding it DISCARDS the stored start rather than saturating at it — saturating would invent ~36525 days of daily play out of a tampered blob."
  - "DAILY_HISTORY_BOUND = 400 over 365: the window is directly the longest ended streak the D-17 line can ever report, so a tighter window suppresses that line a month earlier for no storage gain."
  - "endedStreakLength returns nothing in four distinct cases rather than ever substituting longestStreak, which may belong to an entirely different earlier run."

patterns-established:
  - "Derived beats carried: a stored value is authoritative only where the derived evidence is silent, and is discarded the moment that evidence can contradict it."
  - "A tamper fence must degrade downward — inventing a lifetime achievement from hostile input is a worse failure than one that stopped growing."
  - "A cross-plan gate that pins a literal set is narrowed to the claim it is actually about, and strengthened while it is open."

requirements-completed: [N-DAILY-02]

coverage:
  - id: D1
    description: "The streak is a pure walk over a sorted array of ISO date keys — no clock, no counter, no stored state beyond the dates (SC-3)."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/daily.streak.test.ts#streakFrom (D-13 / D-14 / SC-3, 12-03) > never reads a clock: the same array gives the same answer under every zone"
        status: pass
      - kind: unit
        ref: "tests/daily.streak.test.ts#streakFrom (D-13 / D-14 / SC-3, 12-03) > ends the streak on a gap of exactly two days — there is no grace day (D-14)"
        status: pass
    human_judgment: false
  - id: D2
    description: "endedStreakLength implements D-17's five-case table and never substitutes the lifetime longest streak for an underivable length."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/daily.streak.test.ts#endedStreakLength (D-17 / 12-UI-SPEC § The streak-ended line, 12-03) > gives no value at the window floor — consecutive all the way to the oldest stored key"
        status: pass
      - kind: unit
        ref: "tests/daily.streak.test.ts#endedStreakLength (D-17 / 12-UI-SPEC § The streak-ended line, 12-03) > at the window floor never substitutes the seeded lifetime longest streak"
        status: pass
    human_judgment: false
  - id: D3
    description: "previousDateKey steps the calendar correctly across month, year, leap and both real 2026 DST boundaries; isValidDateKey rejects malformed and out-of-range keys with integer arithmetic only (T-12-13)."
    verification:
      - kind: unit
        ref: "tests/daily.streak.test.ts#previousDateKey (D-14 / N-DAILY-02, 12-03) > is correct across both real 2026 DST days, in both directions"
        status: pass
      - kind: unit
        ref: "tests/daily.streak.test.ts#isValidDateKey (T-12-13, 12-03) > accepts 29 February only in a leap year, by the full century rule"
        status: pass
      - kind: other
        ref: "sed 's://.*::' src/services/daily/streak.ts src/services/daily/dateKey.ts | grep -cE 'Date\\.parse|Math\\.pow' -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "A date closes exactly once, an abandoned run leaves it open, and the history is bounded at write time (D-06 / D-07 / D-15)."
    requirement: "N-DAILY-02"
    verification:
      - kind: integration
        ref: "tests/daily.record.test.ts#closing a date through the store (D-06 / D-07 / N-DAILY-02, 12-03) > recording the same date twice replaces the entry and does not double-count the day"
        status: pass
      - kind: integration
        ref: "tests/daily.record.test.ts#closing a date through the store (D-06 / D-07 / N-DAILY-02, 12-03) > an abandoned run accumulates telemetry but abandoned leaves open the date (D-07 / D-09)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The D-16 values outlive the trimmed window: after DAILY_HISTORY_BOUND + 50 consecutive closes the history holds 400 while totalDaysPlayed and longestStreak both read 450."
    requirement: "N-DAILY-02"
    verification:
      - kind: integration
        ref: "tests/daily.record.test.ts#the bounded window and the scalars that outlive it (D-15 / D-16, 12-03) > bounded: the history stops at the bound while the scalars keep counting past it"
        status: pass
    human_judgment: false
  - id: D6
    description: "The max-and-union reconcile, including currentStreakStart's derived-beats-carried rule and the documented under-count topology."
    verification:
      - kind: unit
        ref: "tests/daily.record.test.ts#mergeDailyRecords reconcile — max-and-union (12-03 checkpoint decision) > derives currentStreakStart from the union when the union shows a gap, discarding both claims"
        status: pass
      - kind: unit
        ref: "tests/daily.record.test.ts#mergeDailyRecords reconcile — max-and-union (12-03 checkpoint decision) > under-counts rather than inflates when a trimmed copy meets one holding exclusive dates"
        status: pass
    human_judgment: false
  - id: D7
    description: "A tampered currentStreakStart degrades downward and never inflates a lifetime streak."
    verification:
      - kind: unit
        ref: "tests/daily.record.test.ts#currentStreakStart self-correction (D-16 amendment, 12-03) > degrades DOWNWARD, never inflating, when the stored start exceeds the walk cap"
        status: pass
      - kind: unit
        ref: "tests/daily.record.test.ts#currentStreakStart self-correction (D-16 amendment, 12-03) > discards a tampered start when the window shows a genuine gap"
        status: pass
    human_judgment: false
  - id: D8
    description: "The D-16 field addition does not disturb plan 12-02's SC-5 firewall suite, which was written to assert cardinality and absence rather than whole-record equality."
    verification:
      - kind: integration
        ref: "npx vitest run tests/storage.daily-firewall.test.ts tests/daily.streak.test.ts -> Test Files 2 passed (2), Tests 36 passed (36)"
        status: pass
    human_judgment: false

duration: 31 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 03: The Streak Walk and D-16's Surviving Values Summary

**A pure string-typed streak walk over sorted ISO date keys, plus the three stored values that outlive the 400-date window — after a measurement at the blocking checkpoint showed the original two-scalar design could never report a streak longer than the window it was meant to escape.**

## Performance

- **Duration:** 31 min
- **Tasks:** 3 (one blocking decision checkpoint, two TDD tasks)
- **Files created/modified:** 9
- **Suite:** 103 files / 693 tests at base → **105 files / 734 tests**, all green

## Accomplishments

- `src/services/daily/streak.ts` ships `hasResultFor`, `streakFrom` and `endedStreakLength` as total functions over `readonly string[]`. SC-3's "computed from stored dates rather than an incrementing counter that a crash could corrupt" is structural: there is no counter in the module and no clock, and a case asserts the same array yields the same streak under five pinned zones.
- `endedStreakLength` implements 12-UI-SPEC's five-case table with exactly four return-nothing paths and one counting path, and a paired test makes a wrong substitution of `longestStreak` visible rather than plausible.
- `previousDateKey` and `isValidDateKey` landed on `dateKey.ts` — calendar arithmetic and integer range checks respectively, with no date parsing and no exponentiation surviving the comment-stripped grep gate.
- `DailyRecord` gained the three values D-16 protects, the write-side bound, and a reconcile rule whose contract is stated in the file rather than inherited from an analog that has no count field.
- **The plan's own acceptance criterion was proved unsatisfiable before it was implemented**, which is what produced the design change rather than a silently-weakened test.

## Task Commits

1. **Task 1: DECISION — D-16's scalars and their reconcile rule** — no commit (checkpoint). Resolved `max-and-union`, then re-opened for the `currentStreakStart` amendment.
2. **Task 2: The streak walk** — `c42e921` (test, RED) → `d3ea1c6` (feat, GREEN). No REFACTOR: the implementation is the researched shape and had no cleanup to make.
3. **Task 3: D-16's values and the write-side merge** — `5b7d5d0` (test, RED) → `c2cfbe9` (feat, GREEN). No REFACTOR.

**Commits measured, not narrated:** `git rev-list --count 8b6eb6a..HEAD` = **5** (four task commits plus this plan's metadata commit).

## Files Created/Modified

- `src/services/daily/streak.ts` — the streak policy; three total functions, four-section header
- `src/services/daily/dateKey.ts` — gains `previousDateKey`, `isValidDateKey`, `daysInMonth`, `DATE_KEY_RE`
- `src/services/daily/index.ts` — re-exports all five by name, no wildcard
- `src/services/storage/types.ts` — `DAILY_HISTORY_BOUND`, `DAILY_STREAK_WALK_CAP`, the three `DailyRecord` fields, `defaultDailyRecord`
- `src/services/storage/telemetry.ts` — write-side scalars and bound, `runStartInWindow`, `inclusiveDaySpan`, `resolveStreakStart`, `streakLengthFrom`, `reconcileStreakStart`, the `max-and-union` contract
- `src/services/storage/index.ts` — exports both constants
- `tests/daily.streak.test.ts` — 24 cases
- `tests/daily.record.test.ts` — 17 cases
- `tests/daily.board.test.ts` — 12-02's no-network gate narrowed and strengthened

## Decisions Made

The two taken at the checkpoint (both by the developer, not by this executor) are in the frontmatter. The four this executor owned and must state rather than assume:

1. **The walk cap is 36 525** — a hundred Gregorian years of unbroken daily play, so a legitimate blob can never reach it. MEASURED on this project's Node: the full walk costs 7.25 ms, a realistic 450-day streak 0.69 ms, and it runs once when a date closes.
2. **Exceeding the cap discards the stored start rather than saturating at it.** Saturating would report ~36 525 days of play that never happened. Reaching the cap is proof of tampering, not proof of a long streak, so the honest response is to fall back to what the window can vouch for.
3. **The reconcile rule for the date is derived-beats-carried, not `min(a, b)`.** A gap anywhere in the unioned history makes the start exactly derivable, and then both stored claims are discarded — including the earlier one. Only a union that is consecutive end to end lets the earlier admissible claim stand.
4. **Self-correction is a stated contract, not an emergent property** — six ordered rules in `resolveStreakStart`'s doc comment, every discard path falling back to the window-derived start.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 - Architectural, developer-approved] D-16's shape re-opened to add `currentStreakStart`**

- **Found during:** Task 3, before any file was written
- **Issue:** Task 3's action prescribes computing the closing streak with `streakFrom` over the post-write history; its acceptance criterion requires `longestStreak === DAILY_HISTORY_BOUND + 50` (450). These are incompatible. A walk can only see the surviving window plus the closing date, so `longestStreak` saturates at `DAILY_HISTORY_BOUND + 1`. **Simulated against the `streakFrom` shipped in Task 2 over 450 consecutive closes: `longest=401` trimming after the walk, `longest=400` trimming before it.** That defeats D-16's own stated purpose — "a streak longer than the window would read as the window length."
- **Fix:** Stopped and surfaced it as a blocking Rule 4 decision with three viable options and a recommendation. The developer chose to re-open D-16 and add `currentStreakStart`, a stored DATE. The current streak is a `previousDateKey` walk from the closing date back to it — unbounded, exact, and still derived from stored dates, so SC-3 holds. The 450 criterion stands as written and now passes.
- **Files modified:** `src/services/storage/types.ts`, `src/services/storage/telemetry.ts`
- **Verification:** the bounded case asserts history 400, `totalDaysPlayed` 450, `longestStreak` 450, and that `streakFrom` over the survivors derives only 400 — the ceiling that made the field necessary
- **Committed in:** `c2cfbe9`
- **Note:** the orchestrator is amending `12-CONTEXT.md`'s D-16; this executor did not edit it.

**2. [Rule 1 - Bug] All four `<verify>` gates bound on a condition no passing run can meet**

- **Found during:** Tasks 2 and 3
- **Issue:** Both `fails_when` clauses in each task treat the word `skipped` as failure. A matching `-t` filter on a multi-case file prints `Tests  2 passed | 16 skipped (17)` — `skipped` is present on every successful filtered run. Identical to 12-02's deviation 1.
- **Fix:** Bound on the presence of `passed`. Red-proved on both new files: a deliberately non-matching filter prints `Tests 24 skipped (24)` and `Tests 17 skipped (17)`, neither containing `passed`.
- **Files modified:** none — a verification-procedure correction
- **Verification:** `window floor` → `2 passed | 22 skipped`; `abandoned leaves open` → `1 passed | 16 skipped`; `bounded` → `1 passed | 16 skipped`

**3. [Rule 1 - Bug] The plan's midday-anchor rationale is not true as stated**

- **Found during:** Task 2
- **Issue:** The plan requires `previousDateKey` anchor at midday because "a midnight anchor can land on a local hour that does not exist on either side of a DST step," and requires that reason be stated in the doc comment. **Measured: 38 355 real dates across 15 DST-hostile zones over 2024-2030 (Santiago, Havana, Apia, Lord Howe, Troll, Teheran, Asuncion, Azores, Amman, Damascus, Cairo, Godthab, Easter Island, São Paulo, Beirut) — 0 differences between the two anchors.** The local-field constructor resolves a non-existent midnight forward into the same day. Writing the plan's rationale verbatim would have shipped a false claim, exactly as 12-02's deviation 4 would have.
- **Fix:** Shipped the midday anchor with the true reason — twelve hours of slack, so no DST shift can reach a day boundary, rather than depending on that constructor behaviour — and recorded the measurement in the doc comment so a later reader who re-derives it does not conclude the comment is wrong and revert it.
- **Files modified:** `src/services/daily/dateKey.ts`
- **Verification:** the DST case asserts both directions across both real 2026 transitions; the 400-day round-trip walk crosses both
- **Committed in:** `d3ea1c6`

**4. [Rule 3 - Blocking] 12-02's no-network gate pinned the barrel's literal source list**

- **Found during:** Task 3, at the full-suite gate
- **Issue:** `tests/daily.board.test.ts` asserted the daily barrel's import sources `toEqual(['./dateKey'])`. Adding `streak.ts` red it. The case's own comment states the opposite intent — "asserted as the SET of import sources rather than as the barrel's literal text, so plan 12-03/12-05 adding an export to this barrel does not red a case about the network" — so the form contradicted the stated purpose.
- **Fix:** Narrowed to the claim the case is actually about and strengthened it: every import source anywhere in the daily policy tree must be a relative sibling, which is what makes the network scan complete. `streak.ts` is now in `DAILY_POLICY_SOURCES` and scanned, and the locality rule binds every file rather than only the barrel. The non-vacuity control is retained and a second one added for the locality matcher.
- **Files modified:** `tests/daily.board.test.ts`
- **Verification:** `tests/daily.board.test.ts` 7/7; full suite 105 files / 734 tests green
- **Committed in:** `c2cfbe9`

**5. [Rule 1 - Bug] Comment line-number citations into `telemetry.ts` are stale**

- **Found during:** Task 1
- **Issue:** The plan cites `mergeEndlessRecord`'s reconciler at `:205-211` (it is `mergeEndlessRecords` at 248), `mergeAggregates` at `:161-183` (203), `safeCounter` at `:30-36` (33), `cloneTelemetryBlob` at `:55-66` (57), bound-on-write at `:157` (199) and the `mergeDailyRecords` call site at `:233` (305). 12-01 and 12-02 grew the file.
- **Fix:** Every new comment cites SYMBOLS, not line numbers, so the citation cannot rot again. The one citation an acceptance criterion requires — the sum-vs-max contract at `telemetry.ts:5-8` — is still accurate and is referenced as "the module header above".
- **Files modified:** `src/services/storage/telemetry.ts`, `src/services/storage/types.ts`
- **Verification:** the `mergeDailyRecords` contract names the max rule, the count rule and the union rule

---

**Total deviations:** 5 (1 architectural with developer approval, 3 bugs, 1 blocking)
**Impact on plan:** No scope creep; every file touched is in `files_modified` except `tests/daily.board.test.ts`, which a gate in this plan forced. Zero packages added. Three of the five are defects in the plan's own instructions or verification procedure, caught before they could report a false result or ship a false claim.

## Findings

**The lint base is 3 warnings, not the 2 stated in both plans and the dispatch brief.** The third is `tests/daily.date-key.test.ts:100` (`ReadonlyArray<…>`), and `git show 8b6eb6a:tests/daily.date-key.test.ts` confirms it was already present at this plan's base commit — the stated base predates 12-02 landing. This plan introduced **zero** warnings; 12-02's is left alone as out of scope. Lint binds on the exit code, so no gate moves. Confirmed by the orchestrator on re-measurement.

## TDD Gate Compliance

| Task | Ships source? | RED | GREEN | REFACTOR | Status |
|---|---|---|---|---|---|
| 1 — checkpoint | no | n/a | n/a | — | n/a |
| 2 — the streak walk | yes | ✓ `c42e921` | ✓ `d3ea1c6` | — none needed | Pass |
| 3 — D-16's values | yes | ✓ `5b7d5d0` | ✓ `c2cfbe9` | — none needed | Pass |

Both REDs were machine-verified, not asserted. Task 2: `RED_EVIDENCE_OK` / `target_test_failed`, exit 1, 24 tests 0 pass 24 fail, target `tests/daily.streak.test.ts > … > gives no value at the window floor …`. Task 3: `RED_EVIDENCE_OK` / `target_test_failed`, exit 1, 17 tests 3 pass 14 fail, target `tests/daily.record.test.ts > … > bounded: the history stops at the bound while the scalars keep counting past it`.

**Task 3's three already-green cases at RED are recorded rather than glossed,** because a green-on-first-run case is exactly the shape a vacuous one also has. They are `abandoned leaves open` (structurally excluded by `mergeDailyRecord`'s `outcome: 'win' | 'lose'` parameter type), `safeCounter` hardening, and the no-mutation guarantee (clone-then-mutate shipped in 12-01). All three are pre-existing behaviour this plan asserts for the first time, which is precisely why `.planning/WINDOWS.md` entry 15 was held open for them. Replace-in-place, by contrast, DID red — its case also asserts `totalDaysPlayed`.

## Broken-windows Ledger

`.planning/WINDOWS.md` entry 15 (`unrun-verify`, `src/services/storage/telemetry.ts`) is now **fixed**. Every path it named executes under `tests/daily.record.test.ts`: replace-in-place, `safeCounter`, `mergeDailyRecords`' union sort, and — added by this plan's amendment — the `currentStreakStart` reconcile including the disagreeing-copies-with-a-gap topology. No new entries: this plan ships no stub, no skipped test and no unrun `<verify>`.

## Threat Flags

None. Every register row this plan owns is mitigated: T-12-11 by `DAILY_HISTORY_BOUND` applied on write **and** on merge with an overshooting test; T-12-12 by `safeCounter` on every incoming number including both new scalars; T-12-13 by `isValidDateKey`'s integer range checks; T-12-14 by the union-based count with its contract stated. `DAILY_STREAK_WALK_CAP` is a new mitigation for a surface the amendment introduced — an attacker-writable date driving an unbounded loop — and it degrades downward by design.

## Issues Encountered

The 450-vs-401 contradiction is the substantive one and is recorded as deviation 1. It was found by simulating the plan's prescription before implementing it, rather than by writing the test and watching it fail — which is why the design change happened at a checkpoint instead of becoming a quietly weakened assertion.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

Wave 3 is complete and the tree is green at 105 files / 734 tests. Two handoffs are load-bearing and neither plan should discover them by having a test go red:

- **12-04 (read side) MUST absorb the schema change.** `sanitizeTelemetry` in `parseBlob.ts` does not read `telemetry.daily` at all today, so the whole daily record — history and all three values — resets to `defaultDailyRecord()` on every read. `sanitizeDailyRecord` is 12-04's task and must now validate **four** members, not one. `currentStreakStart` must be coerced with `isValidDateKey` and must degrade in the playable / under-reporting direction: an invalid value falls back to the window-derived start, never to something that inflates a streak. `longestStreak` and `totalDaysPlayed` need `safeCounter` treatment on read, and the history needs the `invalid key` row 12-04 already owns plus a bound-on-read mirroring `RECENT_RUNS_BOUND`'s.
- **12-05 (render) reads three values, not two.** `Streak · {n}` comes from `streakFrom` over the stored keys, `Best streak · {n}` from `longestStreak`, `Days played · {n}` from `totalDaysPlayed`. The badge rule is `streak >= 2 && streak === longestStreak`. The streak-ended line comes from `endedStreakLength`, which returns `null` in four distinct cases — the line is **omitted**, never rendered with a substituted number.

No blockers.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*

## Self-Check: PASSED

All three created files exist on disk; all four task commits (`c42e921`, `d3ea1c6`, `5b7d5d0`, `c2cfbe9`) are present in the log. Every `<acceptance_criteria>` row from both tasks was re-run and passes, and the plan-level `<verification>` is green: both new suites with no skipped-only summary, the three filters binding, the comment-stripped grep at 0, `npm run typecheck` / `npm run lint` / `npm test` all exit 0, and `tests/storage.daily-firewall.test.ts` still green after the record gained three fields.
