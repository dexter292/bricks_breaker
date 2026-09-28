---
phase: 12-daily-challenge
plan: 02
subsystem: testing
tags: [daily-challenge, vitest, timezone, dst, determinism, discriminated-union, levelgen]

# Dependency graph
requires:
  - phase: 12-daily-challenge
    provides: "plan 12-01's `localDateKey`, `DAILY_DIFFICULTY`, the banned-primitive module rule and its comment-stripped grep gate, the `daily` arm of `RecordRunEndArgs`, and the daily write block in both hand-mirrored stores"
  - phase: 10-seeded-board-generator
    provides: "`generate(seed: number | string, difficulty)` — deterministic, self-clamping, string-seed-accepting; `D_MAX`, read here and never restated"
  - phase: 11-endless-mode
    provides: "`tests/endless.ramp.test.ts` (the pure-policy spec shape) and `tests/storage.endless-firewall.test.ts` (the two-store firewall shape), both near-total copy targets"
provides:
  - "`nextLocalMidnightMs(nowMs)` — the first instant of the next LOCAL calendar day, calendar arithmetic, total over every number"
  - "`localDateKey` and `nextLocalMidnightMs` are both total: no input mints a malformed key or a non-finite boundary"
  - "tests/daily.date-key.test.ts — the N-DAILY-01 derivation battery, TZ-pinned, 9 cases"
  - "tests/daily.board.test.ts — determinism, 731-key distinctness, the no-network source contract, 7 cases"
  - "tests/storage.daily-firewall.test.ts — the SC-5 instrument, 6 cases run against each of the two stores"
  - "the runtime half of SC-5, which 12-01 declared open as gap D6, now executes"
  - "TZ pinning as a repo idiom: capture at module scope, restore in afterEach"
affects: [12-03, 12-04, 12-05, 12-06, 13-achievements]

actuals:
  tokens: 11808
  tasks: 3
  commits: 4
plan_head_before: 35117ec12bcd511ca37fac7370bc1f39b8cfc54c

tech-stack:
  added: []
  patterns:
    - "TZ-pinned spec: `process.env.TZ` captured once at module scope, reassigned per case, restored in `afterEach` — process-global state in a worker vitest reuses across files"
    - "zone-agnostic calendar walk: anchor at LOCAL noon with the local-field `Date` constructor, then step with the module's own next-day arithmetic, so the walk names a date in every ambient zone and pins none"
    - "fingerprint the thing, not its label: distinctness asserted over the playfield because the level file's `id` embeds the hashed seed"
    - "non-vacuity control beside every source-contract grep — the detector is proved to detect before its silence is read as evidence"
    - "a `@ts-expect-error` regression alarm red-proved by stripping the directive and recording the resulting `error TS`"

key-files:
  created:
    - tests/daily.date-key.test.ts
    - tests/daily.board.test.ts
    - tests/storage.daily-firewall.test.ts
  modified:
    - src/services/daily/dateKey.ts
    - src/services/daily/index.ts

key-decisions:
  - "`nextLocalMidnightMs` is calendar arithmetic through the local-field `Date` constructor; the fixed-day-in-milliseconds form stays banned because it was measured skipping 2026-09-06 in Santiago and repeating 2026-11-01 in Havana"
  - "Both daily date functions are total over every number — `localDateKey(NaN)` was minting `0NaN-NaN-NaN`, a key D-14's lexicographic streak walk would sort in as garbage"
  - "Board distinctness is fingerprinted over the playfield, not the whole level file, because `generate` builds `id` from the hashed seed and a whole-file fingerprint cannot falsify the claim"
  - "The six `-t` validation gates bind on the PRESENCE of `passed`, not the ABSENCE of `skipped` — a matching vitest filter still prints a `skipped` count, so the as-written gate was unsatisfiable"
  - "`UNIQUE_DAYS = 731` from 2026-01-01 contains NO leap day (2026 and 2027 are both common years); the leap rollover is covered by a dedicated case rather than by the constant's rationale"
  - "WINDOWS ledger entry 15 stays OPEN: the firewall suite executes `mergeDailyRecord`'s push path, but replace-in-place, `safeCounter` hardening and `mergeDailyRecords`'s union sort remain 12-03's"

patterns-established:
  - "TZ pinning with capture-at-module-scope and restore-in-afterEach — a new idiom for this repo, with no in-repo analog"
  - "Pair every absence assertion with a presence assertion, so a dropped write cannot pass the firewall trivially"
  - "Red-prove a source-side gate by mutating a scratch copy and recording both counts, rather than asserting the gate is falsifiable"

requirements-completed: [N-DAILY-01, N-DAILY-03]

coverage:
  - id: D1
    description: "`localDateKey` returns the LOCAL calendar date, not the UTC one, at both edges of a day"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#west of UTC at 23:30 local returns the local calendar date — local not UTC (D-01)"
        status: pass
      - kind: unit
        ref: "tests/daily.date-key.test.ts#east of UTC at 00:30 local returns the local calendar date — local not UTC (D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`localDateKey` returns one and the same string for a fixed instant across five device locales, while the locale route produces several different strings for that same instant"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#is locale invariant: one instant, one key, whatever the device locale says (12-RESEARCH § Finding 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "`nextLocalMidnightMs` is correct on a 23-hour local day where local midnight does not exist (America/Santiago, 2026-09-06 → 2026-09-06T04:00:00.000Z, remainder 1000 ms)"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#resolves a skipped midnight to the first instant that exists on that local day (America/Santiago)"
        status: pass
    human_judgment: false
  - id: D4
    description: "`nextLocalMidnightMs` is correct on a 25-hour local day where local midnight occurs twice (America/Havana, 2026-11-01, measuring 90 000 000 ms)"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#measures a 25 hour day where local midnight occurs twice (America/Havana)"
        status: pass
    human_judgment: false
  - id: D5
    description: "`nextLocalMidnightMs` differs from adding a fixed day in milliseconds on both DST days — the fixed form skips 2026-09-06 in Santiago and repeats 2026-11-01 in Havana"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#is not plus 24h: the fixed-duration form skips a date in Santiago and repeats one in Havana"
        status: pass
    human_judgment: false
  - id: D6
    description: "Month, year and leap-year rollovers of the day-plus-one step are correct across all four boundaries"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#steps month, year and leap-year boundaries correctly — rollover (12-RESEARCH § Finding 3(d))"
        status: pass
    human_judgment: false
  - id: D7
    description: "Neither date function mints a malformed key or a non-finite boundary on degenerate input"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.date-key.test.ts#stays total on degenerate input: no malformed key and no non-finite boundary"
        status: pass
    human_judgment: false
  - id: D8
    description: "The same date key produces a byte-identical board, and 731 consecutive date keys produce 731 distinct playfields whose adjacent pairs differ in more than one cell"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.board.test.ts#the same date key yields a byte-identical board (D-11)"
        status: pass
      - kind: unit
        ref: "tests/daily.board.test.ts#731 consecutive date keys yield 731 distinct boards (SC-1)"
        status: pass
      - kind: unit
        ref: "tests/daily.board.test.ts#consecutive dates are not correlated — the difference is never confined to one cell"
        status: pass
    human_judgment: false
  - id: D9
    description: "No network primitive exists in the daily policy module, whose reachable import set is empty"
    requirement: N-DAILY-01
    verification:
      - kind: unit
        ref: "tests/daily.board.test.ts#no network primitive is reachable from the daily policy module — no network (D-11)"
        status: pass
    human_judgment: false
  - id: D10
    description: "A daily `recordRunEnd` leaves `unlocked`, `bestByLevel`, `bestScore` and `telemetry.endless` byte-identical to their pre-call values, asserted SEPARATELY against the memory store and the AsyncStorage-backed store"
    requirement: N-DAILY-03
    verification:
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#daily firewall — memory store > a daily win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values"
        status: pass
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#daily firewall — AsyncStorage-backed store > a daily win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values"
        status: pass
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#a daily win leaves telemetry.endless byte-identical — the third mode is isolated from the second too (both stores)"
        status: pass
      - kind: other
        ref: "npx vitest run tests/storage.daily-firewall.test.ts --reporter=verbose resolves to exactly 2 distinct suite labels (red-proved: 1 against a scratch copy with the second firewallSuite invocation removed)"
        status: pass
    human_judgment: false
  - id: D11
    description: "The daily write provably LANDS — the date joins the history with its score and outcome, and the aggregate bumps under the constant key"
    requirement: N-DAILY-03
    verification:
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#the same daily win DOES land: the date joins the history and the aggregate bumps under the constant key (both stores)"
        status: pass
    human_judgment: false
  - id: D12
    description: "After 40 distinct daily dates the daily aggregate map still holds exactly one key, the constant, with runsPlayed at 40 — the D-15 / T-12-08 unbounded-map alarm"
    requirement: N-DAILY-03
    verification:
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#the daily aggregate map still holds exactly one key after 40 distinct dates (T-12-08 / D-15) (both stores)"
        status: pass
    human_judgment: false
  - id: D13
    description: "Supplying a campaign field on the `daily` arm of `RecordRunEndArgs` is a compile error, pinned by a live `@ts-expect-error`"
    requirement: N-DAILY-03
    verification:
      - kind: other
        ref: "npm run typecheck (exit 0, no `error TS` line) with the directive present; red-proved by stripping it, which yields `error TS2353: ... 'levelId' does not exist in type '{ mode: \"daily\"; ... }'`"
        status: pass
    human_judgment: false
  - id: D14
    description: "The existing campaign path still unlocks, still writes bestByLevel and still raises bestScore on a store that has already taken a daily write"
    requirement: N-DAILY-03
    verification:
      - kind: integration
        ref: "tests/storage.daily-firewall.test.ts#a campaign win against the same store still unlocks, still writes bestByLevel and still raises bestScore — the gate did not break the existing path (both stores)"
        status: pass
    human_judgment: false
  - id: D15
    description: "The derivation behaves identically under Hermes and under the Android ICU4J engine"
    verification: []
    human_judgment: true
    rationale: "vitest runs on Node/V8, so a green suite is evidence about V8 only. The Hermes evidence is the executed JSI probe recorded in 12-RESEARCH § Findings 2/3/5 (which this suite reproduced exactly on Node 25.6.0); the Android ICU4J engine was never executed at all. Both are device-verification items, stated as explicit non-coverage in the spec header."

duration: 19 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 02: SC-1 and SC-5 Instruments Summary

**Three specs and one function: a TZ-pinned derivation battery that pins both real 2026 DST hazard days against absolute instants, a 731-key determinism walk fingerprinted over playfields rather than labels, and a two-store firewall whose every absence assertion is paired with a presence assertion.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-28T01:48:00Z
- **Completed:** 2026-09-28T02:07:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)
- **Suite:** 100 files / 665 tests → **103 files / 693 tests**, `npm test` exit 0

## Accomplishments

- **The two silent SC-1 failure modes now have instruments that can see them.** A locale-derived key is correct on an `en-US` simulator and wrong in Bangkok; a UTC-derived key is a calendar day wrong for a third of every day west of Greenwich. Both are asserted directly — the locale case sweeps five device locales and additionally proves the locale route is genuinely unstable in this ICU build, so the invariance is not vacuous.
- **Both real 2026 DST hazard days are pinned against absolute UTC instants, never a re-derivation.** Santiago's 2026-09-06 has no local midnight and the constructor resolves it to `2026-09-06T04:00:00.000Z` with a remainder of exactly 1000 ms; Havana's 2026-11-01 measures 90 000 000 ms. Every expected value reproduced 12-RESEARCH's executed measurements exactly, and each is paired with the banned fixed-day form as a live control that lands on the wrong date.
- **`nextLocalMidnightMs` shipped test-first, and the RED was verified rather than asserted.** `gsd check tdd-red-evidence` returned `RED_EVIDENCE_OK` on exit 1 / 9 tests / 4 pass / 5 fail, with the named target test among the failures — so the GREEN was authorised by evidence, not by a nonzero exit code.
- **SC-5's runtime half now executes.** 12-01 shipped the mode gate and declared its runtime assertion open as gap D6; six cases run against each of the two hand-mirrored stores close it. The compile-time half is red-proved: stripping the `@ts-expect-error` yields `error TS2353 ... 'levelId' does not exist in type '{ mode: "daily"; … }'`, so `npm run typecheck` exiting 0 is real evidence rather than the absence of one.
- **The D-15 unbounded-map defect has a standing alarm with teeth.** 40 distinct dates leave `byMode.daily` holding exactly one key with `runsPlayed` at 40 — asserting the count *and* the aggregate proves the map is constant-keyed rather than merely small, which a bare key-count could not distinguish.
- **`npx vitest run tests/daily`, the plan's own quick-run command, went from `No test files found, exiting with code 1` to 2 files / 16 tests.**

## Task Commits

1. **Task 1 (RED): the N-DAILY-01 derivation battery** — `d3f8f8a` (test)
2. **Task 1 (GREEN): `nextLocalMidnightMs`** — `67d75a2` (feat)
3. **Task 2: board determinism and the no-network contract** — `9a59516` (test)
4. **Task 3: the SC-5 two-store firewall** — `e225830` (test)

**Plan metadata:** see the `docs(12-02)` commit that carries this file.

_Tasks 2 and 3 ship no production code and therefore have no GREEN commit — see TDD Gate Compliance below._

## Files Created/Modified

- `tests/daily.date-key.test.ts` — 9 cases. TZ pinned per case, captured once at module scope and restored in `afterEach`; every expected value an absolute UTC instant from the research.
- `tests/daily.board.test.ts` — 7 cases. The 731-key walk uses the module's own `nextLocalMidnightMs`, anchored at local noon so it names a date in any zone; distinctness is over playfields; the no-network claim is a source contract with a non-vacuity control.
- `tests/storage.daily-firewall.test.ts` — 6 cases × 2 stores = 12. `firewallSuite(label, makeStore)` invoked once per store; absence always paired with presence; assertions on cardinality and fields, never a whole-object equality over `telemetry.daily`.
- `src/services/daily/dateKey.ts` — gains `nextLocalMidnightMs` and the shared `representableInstant` normaliser; the header's forward reference became a back reference. Comment-stripped, the module still contains none of `Intl.`, `toLocale`, `toISOString`, `86_400_000`, `86400000`.
- `src/services/daily/index.ts` — re-exports `nextLocalMidnightMs` by name; still no `export *`.

## Decisions Made

- **`representableInstant` uses the runtime's own range check, not a restated `8.64e15`.** `Number.isFinite(new Date(x).getTime())` asks the engine whether it can represent the instant. This is the same refusal the module already makes about the generator's `D_MAX`: a bound belonging to someone else is not ours to copy. The fallback is the epoch, which keeps both functions pure — reading the wall clock here is exactly what the `nowMs` argument exists to prevent.
- **Distinctness is fingerprinted over the playfield; identity is fingerprinted over the whole file.** Both fingerprints exist, and the split is the point: `id` is `gen-${hashSeed.toString(16)}-${d}`, so the whole-file form reports 731 distinct strings the moment 731 keys hash distinctly — it would report success from the label even if all 731 boards were identical. Identity cases legitimately want every field, so they keep the whole-file form.
- **The board walk anchors at local noon with the local-field constructor rather than pinning `TZ`.** An instant expressed in UTC starts the walk a day early or late depending on the machine; pinning a zone would make the file zone-specific for no gain. Local noon on 2026-01-01 is 2026-01-01 everywhere, so the file is zone-agnostic by construction and adds no TZ-restore obligation.
- **WINDOWS ledger entry 15 stays open.** The firewall suite now executes `mergeDailyRecord`'s push path through both real stores, so the entry is no longer fully true — but replace-in-place on a repeated date, the `safeCounter` hardening and `mergeDailyRecords`'s union sort are still unexercised, and those are what 12-03's `tests/daily.record.test.ts` is declared for. Resolving the entry would hide them from the ship gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's six `-t` gates bound on a condition no passing run can meet**

- **Found during:** Task 1, before any file was written
- **Issue:** The `fails_when` reads *"any of the six printed summary lines contains the word `skipped`"*. **Measured on the shipped `tests/endless.ramp.test.ts`:** a MATCHING filter prints `Tests  1 passed | 6 skipped (7)` — the word `skipped` is present on every successful filtered run of any file with more than one case. The gate was unsatisfiable, in the same class as the two-store gate the plan checker already caught and rewrote.
- **Fix:** Bound the gate on the **presence of `passed`** instead. Red-proved: a filter matching nothing prints `Tests  9 skipped (9)`, which contains no `passed`, so the corrected form discriminates exactly the property the plan wanted ("the filter bound to a real case"). The `Test Files` line is a second discriminator (`1 passed (1)` vs `1 skipped (1)`).
- **Files modified:** none — this is a verification-procedure correction, not a code change
- **Verification:** all six filters print `N passed`; the non-matching control prints only `skipped`
- **Affects:** Task 2's `no network` gate has the identical defect and the identical correction.

**2. [Rule 1 - Bug] Both daily date functions minted `0NaN-NaN-NaN` on degenerate input**

- **Found during:** Task 1 (the degenerate-input case the plan's `<behavior>` requires)
- **Issue:** `localDateKey(NaN)` returned the string `0NaN-NaN-NaN` and `nextLocalMidnightMs(NaN)` returned `NaN`. The plan's behavior line requires that *"a non-finite `nowMs` never escapes as a malformed key or a non-finite boundary"*, and its action states that if a case reds, the module is wrong, not the case. This is not cosmetic: D-14's streak walk compares stored keys lexicographically and never parses them, so a malformed key sorts into the set as garbage silently, and a non-finite boundary reaches a countdown as a rendered `NaN`.
- **Fix:** A shared `representableInstant` normaliser in `src/services/daily/dateKey.ts`, applied by both functions, plus a final finiteness guard on the boundary for the top of the representable range. Finite inputs behave identically — this is a pure widening.
- **Files modified:** `src/services/daily/dateKey.ts`
- **Verification:** the degenerate case asserts a well-formed key and a finite boundary for `NaN`, `±Infinity` and `1e20`; the banned-primitive grep still finds 0 hits; full suite green
- **Committed in:** `67d75a2`

**3. [Rule 1 - Bug] Task 2's fingerprint as specified could not falsify the claim it guards**

- **Found during:** Task 2
- **Issue:** The plan specifies `JSON.stringify` over the returned level file. `generate` sets `id: gen-${hashSeed.toString(16)}-${d}` (`src/levelgen/generate.ts:326`), so that fingerprint is distinct whenever the *seeds* are distinct — which the research had already measured (731 distinct `hashSeed`). The 731-distinctness case would therefore have passed even if every one of the 731 boards laid out an identical playfield. The instrument reported on the label, not on the thing labelled.
- **Fix:** `playfieldFingerprint` over `{grid, brickTypes, cells}` for every distinctness case, with the reason stated in the file. `boardFingerprint` over the whole file is kept for the same-key identity cases, where every field is genuinely in scope.
- **Files modified:** `tests/daily.board.test.ts`
- **Verification:** 731 distinct playfields confirmed (probed independently before writing); the closest consecutive pair differs in 70 cells
- **Committed in:** `9a59516`

**4. [Rule 2 - Missing Critical] `UNIQUE_DAYS = 731` from 2026-01-01 contains no leap day**

- **Found during:** Task 2
- **Issue:** The plan instructs the constant be declared with the reason *"two years plus one, which covers a leap day"*. It does not: 2026 and 2027 are both common years, and the walk measured here runs 2026-01-01 → 2028-01-01. Writing the plan's rationale verbatim would have shipped a false claim about what the test covers — and left the leap day genuinely uncovered on the board path.
- **Fix:** The constant's comment states the accurate reason (the exact span the research's diffusion replay measured) and names the gap. A dedicated case asserts 2028-02-29 gets its own board, distinct from 2028-02-28 and 2028-03-01, and the date-key file's rollover case already covers the leap *step*.
- **Files modified:** `tests/daily.board.test.ts`
- **Verification:** the leap-day case passes; `localDateKey(new Date(2028,1,29,12,0,0,0))` is `2028-02-29` and its successor is `2028-03-01`
- **Committed in:** `9a59516`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing-critical)
**Impact on plan:** No scope creep. Two are defects in the plan's own verification procedure — a gate that could never go green and a fingerprint that could never go red — caught before they could report a false result. One is a module bug the plan explicitly authorised fixing. One is a factual error in a constant's stated rationale, fixed by stating the truth and closing the gap it revealed. Every file touched is inside `files_modified`; no package was added and neither `package.json` nor `package-lock.json` was modified.

## TDD Gate Compliance

All three tasks carry `tdd="true"`. Only Task 1 ships production code, so only Task 1 has a red-green cycle.

| Task | Ships source? | RED | GREEN | REFACTOR | Status |
|---|---|---|---|---|---|
| 1 — `nextLocalMidnightMs` | yes | ✓ `d3f8f8a` | ✓ `67d75a2` | — none needed | Pass |
| 2 — board determinism | no | n/a | n/a | — | Pass (no-source) |
| 3 — SC-5 firewall | no | n/a | n/a | — | Pass (no-source) |

**Task 1's RED was machine-verified, not asserted.** `gsd check tdd-red-evidence` returned `verdict: RED_EVIDENCE_OK`, `reason: target_test_failed` against exit 1, 9 tests / 4 pass / 5 fail, with target test `tests/daily.date-key.test.ts > nextLocalMidnightMs (…) > resolves a skipped midnight to the first instant that exists on that local day (America/Santiago)` present in the parsed failing set. The four `localDateKey` cases passed in the RED run, which is itself the evidence that 12-01's derivation was already correct and only the day-step was missing. No REFACTOR commit: the implementation is five statements and had no obvious improvement to make.

**Tasks 2 and 3 declare no source file in `<files>` and therefore have no RED gate to satisfy.** A red in either would mean Phase 10's shipped generator or 12-01's shipped mode gate is broken, not that a feature is missing — the TDD reference's "unexpected GREEN" fail-fast rule says to investigate, and the investigation result is that the behaviour exists by design. Both suites went green on first execution. This is recorded rather than glossed, because a green-on-first-run TDD task is exactly the shape a vacuous test also has; the non-vacuity controls in each file (the locale route proved unstable, the network detector proved to detect, the endless record banked non-default before being preserved, the `@ts-expect-error` proved live) are what distinguishes them.

## Issues Encountered

**A prose comment opening with `@ts-expect-error` is a directive.** The explanatory block above Task 3's compile-time case had a `//` line beginning with the token, and TypeScript honours it wherever it sits — so it became a real directive aimed at `store.recordRunEnd({`, which does not error, producing `error TS2578: Unused '@ts-expect-error' directive`. This masqueraded as the regression alarm firing (i.e. as "the daily arm accepts `levelId`"). Rewrote the prose so no `//` line opens with the token, and left a note in the file saying why. The genuine directive was then red-proved: stripping it yields `error TS2353 ... 'levelId' does not exist in type '{ mode: "daily"; … }'`, confirming the compile-time half of SC-5 is genuinely enforced for the daily arm exactly as it is for the endless one.

**A base-measurement disagreement, reported rather than adjusted.** Task 1's `-t` gate cited a measured base that a matching filter cannot satisfy (deviation 1). Reported here as a finding, with the measurement that contradicts it and the corrected, red-proved form.

## Known Stubs

None. The three new spec files and the two modified source files contain no `TODO`, no `FIXME`, no placeholder text, no `.skip(`/`.todo(` and no unrun `<verify>` — every `<verify>` command in the plan was executed and every acceptance criterion checked.

Nothing was appended to `.planning/WINDOWS.md` because this plan opened no window. Existing entry 15 (`mergeDailyRecord` has no executing test) is now **partially** addressed and deliberately left open — see Decisions Made.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema at a trust boundary. This plan's register entries are all mitigated and gated:

| Threat | Disposition | Instrument |
|---|---|---|
| T-12-07 (daily arm reaching campaign state) | mitigated | `tests/storage.daily-firewall.test.ts`, both stores, absence paired with presence |
| T-12-08 (daily aggregate map growing per date) | mitigated | the 40-date cardinality alarm, asserting the key set *and* the aggregate |
| T-12-09 (locale/UTC-derived key) | mitigated | the locale-invariance and local-not-UTC cases, with a live control proving the banned route diverges |
| T-12-10 (a TZ-pinned spec leaking into a shared worker) | mitigated | capture at module scope, restore in `afterEach`; full suite re-run at 103 files confirms no leakage |
| T-12-SC (package installs) | mitigated | zero packages added; `package.json` and `package-lock.json` untouched |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 12-03.** `nextLocalMidnightMs` exists and is proven across both DST hazards, so the streak walk has a correct day-step to build on. The firewall suite deliberately avoids whole-object equality over `telemetry.daily`, so adding D-16's two scalars to `DailyRecord` will not red anything here.
- **Ready for 12-05.** The countdown's only dependency, `nextLocalMidnightMs`, is shipped and total: it can render `expired` but can never render `NaN`, whatever the device clock reports.
- **Partially closes WINDOWS entry 15.** `mergeDailyRecord`'s push path now executes through both real stores. Replace-in-place on a repeated date, the `safeCounter` hardening and `mergeDailyRecords`'s union sort remain unexercised and are still 12-03's `tests/daily.record.test.ts`.
- **Still open from 12-01, untouched here:** the hydrate gap (`sanitizeTelemetry` does not read `telemetry.daily`) is plan 12-04's; the 375pt dev-row fit is a device backstop.
- **Note for the phase verifier on `actuals.tokens`.** This plan measured `11808` using the template's stated instrument — chars/4 over the realized diff (`git diff 35117ec..HEAD`, added lines only, 47 234 chars). Plan 12-01 recorded `75066`, which is **not** on that instrument: its realized diff measured the same way is `14562`. The two figures are not comparable, and this plan's `estimate.tokens: 70000` was set against whatever scale 12-01 used. Calibration should reconcile the instrument before reading either miss.

## Self-Check: PASSED

- All three created files exist on disk (`tests/daily.date-key.test.ts`, `tests/daily.board.test.ts`, `tests/storage.daily-firewall.test.ts`).
- All four task commits are reachable from HEAD (`d3f8f8a`, `67d75a2`, `9a59516`, `e225830`).
- `nextLocalMidnightMs` is exported from `src/services/daily/dateKey.ts` and re-exported by name from the barrel.
- `git rev-list --count 35117ec..HEAD` measures **4**, matching `actuals.commits`; `plan_head_before` is recorded.
- Plan-level verification: all three new specs green with no `skipped` on an unfiltered run; every `12-VALIDATION.md` filter this plan owns binds to a real case; the firewall names both stores under `--reporter=verbose`; `npm run typecheck` exit 0 with no `error TS` line; `npm run lint` exit 0; `npm test` exit 0 at 103 files / 693 tests.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*
