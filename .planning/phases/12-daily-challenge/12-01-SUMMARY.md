---
phase: 12-daily-challenge
plan: 01
subsystem: storage
tags: [daily-challenge, levelgen, telemetry, react-native, discriminated-union, jsdom]

# Dependency graph
requires:
  - phase: 09-run-telemetry-storage-v4
    provides: the v4 ProgressBlob, `GameMode` already containing `daily`, `byMode.daily` already sanitized, the bounded-collection precedent, and `RecordRunEndArgs` as a discriminated union
  - phase: 10-seeded-board-generator
    provides: `generate(seed: number | string, difficulty)` — deterministic, self-clamping, string-seed-accepting specifically so this phase needs no hashing step
  - phase: 11-endless-mode
    provides: the `__DEV__` temporary-entry pattern, the branch-before-compare run-end funnel, the mode-keyed telemetry constant, and the jsdom host harness this plan's test clones
provides:
  - "`localDateKey(nowMs)` — the local calendar date as `YYYY-MM-DD`, with locale, UTC and fixed-day-in-ms primitives banned in its module"
  - "`DAILY_DIFFICULTY = 10` — the fixed mid-scale difficulty, with its calibration against the generator's published table stated"
  - "`DAILY_TELEMETRY_KEY`, `DailyRecord`, `DailyHistoryEntry`, `defaultDailyRecord`, `TelemetryBlob.daily`"
  - "the `daily` arm of `RecordRunEndArgs` — carries `date`, carries NO `levelId`"
  - "`mergeDailyRecord` (replace-in-place per date) and `mergeDailyRecords` (union by date, ISO sort)"
  - "the daily record write in BOTH hand-mirrored stores, gated to win/lose"
  - "`DailyResultOverlay` — a scalar-props leaf; `ResultOverlay.mode` is NOT widened"
  - "`startDailyRun`, `dailyDateRef`/`dailyDateKey`, the daily arm of `handleRunEnded`, and the `__DEV__` `Daily` control"
affects: [12-02, 12-03, 12-04, 12-05, 12-06, 13-achievements, 14-title-and-entry]

# Actuals (#2632) — same estimateTokens scale the plan's `estimate` used.
actuals:
  tokens: 75066
  tasks: 1
  commits: 1
plan_head_before: 2723b027c4f10485f272ea65010da05c57e40066

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "per-mode pure-policy module under src/services/<mode>/ with a four-section banned-primitive header (copied from src/services/endless/ramp.ts)"
    - "mode-specific record beside the mode-keyed aggregate map, written by exactly one merge function"
    - "compiler-enforced mode firewall: a union arm's ABSENT field is the mechanism, not a runtime guard"
    - "one overlay per mode with scalar-only props, rather than a third arm on an existing overlay"
    - "a source-contract test extended to cover a new mode rather than merely re-anchored"

key-files:
  created:
    - src/services/daily/dateKey.ts
    - src/services/daily/index.ts
    - src/runtime/overlays/DailyResultOverlay.tsx
    - tests/ui/PlayingHost.daily-run.test.tsx
  modified:
    - src/services/storage/types.ts
    - src/services/storage/telemetry.ts
    - src/services/storage/memoryStore.ts
    - src/services/storage/asyncStorageStore.ts
    - src/services/storage/index.ts
    - src/runtime/GameScreen.tsx
    - app/_components/PlayingHost.tsx
    - app/_components/certLevelPlan.ts
    - tests/ui/GameScreen.test.tsx
    - tests/ui/certLevelPlan.test.ts
    - tests/ui/PlayingHost.endless-host.test.ts

key-decisions:
  - "DAILY_DIFFICULTY = 10 — between level-01's 32 bricks and level-03's 94-brick showpiece on the generator's published table, ~2-minute median clear, and exactly where endless arrives at wave 11"
  - "The daily arm of RecordRunEndArgs carries `date` and no `levelId`, so bestByLevel/unlocked/bestScore are unreachable at compile time rather than merely unwritten"
  - "`telemetryKey` stays ONE `const` ternary expression in both stores — the three-way reaches DAILY_TELEMETRY_KEY and never a date, and the single-expression shape is what keeps the decision inside the gate's anchor"
  - "`GameScreenProps.dailyDateKey` is REQUIRED, not defaulted — a blank default would render `Daily · ` on a real panel"
  - "The compiled-push gate effect gets a SECOND, separate `daily` early return rather than folding into `!== 'campaign'` — the endless guard's exact text is a shipped source contract"
  - "certLevelPlanFor gained a `daily` arm returning `unreachable` for the same reason endless does, and its truth table was widened from 20 to 30 cells rather than left claiming a two-mode domain"

patterns-established:
  - "Banned-primitive module rule enforced by a comment-stripped grep gate, red-proved against a scratch violation before being accepted"
  - "A test-file header that states its analog AND enumerates what it is deliberately not evidence about"
  - "Inverting an analog's assertion where the requirement inverts (endless: two runs differ; daily: same date, same board)"

requirements-completed: [N-DAILY-01, N-DAILY-02, N-DAILY-03]

coverage:
  - id: D1
    description: "Pressing the __DEV__ `Daily` control derives the local calendar date key and generates the board from that key alone — the same date gives the same board, the next date a different one (SC-1)"
    requirement: N-DAILY-01
    verification:
      - kind: e2e
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#the same date gives the same board and a different date gives a different one (SC-1 / N-DAILY-01)"
        status: pass
      - kind: e2e
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#the daily board is derived from the date and clearing it records under the daily arm (N-DAILY-01 / N-DAILY-02 / D-10)"
        status: pass
      - kind: other
        ref: "comment-stripped `startDailyRun` region prints `now:1 seed:0` (control: the shipped `startEndlessRun` analog prints `now:2 seed:2` over its 113-line region)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clearing the daily board writes the result through `recordRunEnd({ mode: 'daily', date, … })` FIRST, then the panel is fed from the returned stored record; a cleared board ENDS the run and never reaches the Phase 11 wave-advance intercept (D-10)"
    requirement: N-DAILY-02
    verification:
      - kind: e2e
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#the daily board is derived from the date and clearing it records under the daily arm (N-DAILY-01 / N-DAILY-02 / D-10)"
        status: pass
    human_judgment: false
  - id: D3
    description: "`RecordRunEndArgs` carries a three-arm union whose `daily` arm has `date: string` and no `levelId`, making the campaign write unreachable at compile time"
    requirement: N-DAILY-03
    verification:
      - kind: e2e
        ref: "tests/ui/PlayingHost.daily-run.test.tsx — `expect(args).not.toHaveProperty('levelId')` under an explicit `args.mode !== 'daily'` narrowing throw"
        status: pass
      - kind: other
        ref: "npm run typecheck (exit 0, no `error TS`) — tsconfig includes tests, so the arm must narrow in BOTH hand-mirrored stores"
        status: pass
    human_judgment: false
  - id: D4
    description: "`byMode.daily` is keyed only by the constant `DAILY_TELEMETRY_KEY`, in both hand-mirrored stores — the D-15 unbounded-map prevention"
    requirement: N-DAILY-03
    verification:
      - kind: other
        ref: "comment-stripped `const telemetryKey = … ;` region prints `const:1 date:0` in memoryStore.ts AND asyncStorageStore.ts (red-proved: the compiling-but-wrong three-way handing `args.date` prints `const:0 date:1`)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The daily policy module contains no locale-formatting, UTC-serialising or fixed-day-in-milliseconds primitive"
    requirement: N-DAILY-01
    verification:
      - kind: other
        ref: "comment-stripped grep over src/services/daily/*.ts for Intl./toLocale/toISOString/86_400_000/86400000 prints 0 (red-proved: prints 2 against a scratch file carrying the constructs, with the same APIs named in its header prose)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A runtime `recordRunEnd` under the daily arm leaves `bestByLevel`, `unlocked` and `bestScore` byte-identical to their pre-call values"
    requirement: N-DAILY-03
    verification: []
    human_judgment: true
    rationale: "The COMPILE-TIME half is proven (D3): `args.levelId` is unreachable on the daily arm and nothing in either store's daily block names bestByLevel/unlocked/bestScore. The RUNTIME byte-identical assertion against both hand-mirrored stores is plan 12-02's declared firewall suite (`tests/storage.daily-firewall.test.ts`) and no test executes it yet."
  - id: D7
    description: "`mergeDailyRecord` replaces a same-date entry in place (D-06), hardens incoming numbers through `safeCounter`, and never mutates its input; `mergeDailyRecords` unions two histories by date and sorts by the ISO key"
    requirement: N-DAILY-02
    verification: []
    human_judgment: true
    rationale: "Typechecked and reachable, but NO executing test covers either function — the daily-run harness mocks the whole storage module, so these bodies never run in the suite. Plan 12-03 declares `tests/daily.record.test.ts` as their guard. Recorded in .planning/WINDOWS.md."
  - id: D8
    description: "`DailyResultOverlay` renders the locked line order (heading → body → `Daily ·` → `Score ·` → `Menu`) with the chrome values copied verbatim, no Retry, no star row and no `Best ·` line"
    verification: []
    human_judgment: true
    rationale: "The host hands it the right props (asserted), but the component's own markup is never mounted: the jsdom harness mocks GameScreen down to its dev-row slot. `tests/ui/DailyResultOverlay.test.tsx` is plan 12-05's. Visual conformance to the UI-SPEC chrome table is a human judgment either way."
  - id: D9
    description: "The `__DEV__` `Daily` control sits immediately right of `Endless`, is fully on-screen and tappable on a 375pt-wide viewport"
    verification:
      - kind: other
        ref: "source position asserted: `Start an endless run` (PlayingHost.tsx:2172) → `Open today's daily challenge` (:2197) → the `W{n}` readout (:2211)"
        status: pass
    human_judgment: true
    rationale: "12-UI-SPEC E5 overflow is an explicit device BACKSTOP. The row's ≈431–475px content width is computed from font metrics, never observed; jsdom performs no layout so nothing in this plan's suite is evidence about it. The row already clips at its two default tier states BEFORE this control was added."

# Metrics
duration: 17 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 01: Daily Challenge Tracer Summary

**One local calendar date played end to end — date key → seeded board → campaign-shaped run → a compiler-enforced `daily` write → a panel fed from the stored record — with every Phase 12 architectural seam under one runnable check.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-28T01:27:42Z
- **Completed:** 2026-09-28T01:45:05Z
- **Tasks:** 1 (`type="tracer"`)
- **Files modified:** 15 (4 created, 11 modified)

## Accomplishments

- **The date→board derivation is pure and locale-proof.** `localDateKey` uses only the plain local getters, and its module bans the ECMA-402 namespace, every locale-formatting `Date` method, the UTC serialiser and fixed-day-in-milliseconds arithmetic — each with the measured failure it prevents named in the header (five different keys across five device locales; a calendar day wrong for a third of every day in Santiago; a date skipped outright and another repeated).
- **SC-5 became a property of the type.** `RecordRunEndArgs` now has three arms; the `daily` arm carries `date` and no `levelId`, so `bestByLevel`, `unlocked` and `bestScore` are unreachable from a daily run rather than merely unwritten — and `tsc` is the gate that says so, in both hand-mirrored stores at once.
- **The D-15 unbounded map is closed at the decision site.** Both stores select `DAILY_TELEMETRY_KEY` on the daily branch of a single three-way `const telemetryKey` expression, and the gate that proves it was red-proved against the exact compiling-but-wrong edit (a three-way handing `args.date` straight through, which the read-side aggregate-map sanitizer would then copy forever with no cap).
- **The two Phase 11 anti-patterns adjacent to this code were both avoided, and both are measured.** `startDailyRun` reads the clock once and never re-mints `runSeedRef` (`now:1 seed:0`, against the shipped `startEndlessRun` analog's `now:2 seed:2`); the `WON` wave-advance intercept stays pinned to endless, so a cleared daily board ends the run instead of silently advancing and leaving the date open forever.
- **The panel is a separate component with scalar props.** `ResultOverlay.mode` was not widened; `DailyResultOverlay`'s entire import surface is `react-native` and `react-native-safe-area-context`, which is SC-5 restated where it is checkable by reading a type instead of tracing a branch.

## Task Commits

1. **Task 1: End-to-end "play today's daily board and see the result"** — `f880fd0` (feat)

_Single-task tracer plan; there is no separate test/refactor commit._

## Files Created/Modified

- `src/services/daily/dateKey.ts` — `localDateKey` + `DAILY_DIFFICULTY`, with the four-section policy header and the banned-primitive rule
- `src/services/daily/index.ts` — named-export barrel, 3 lines, mirroring `src/services/endless/index.ts`
- `src/services/storage/types.ts` — `DAILY_TELEMETRY_KEY`, `DailyRecord`, `DailyHistoryEntry`, `defaultDailyRecord`, `TelemetryBlob.daily`, and the `daily` arm of `RecordRunEndArgs`
- `src/services/storage/telemetry.ts` — `mergeDailyRecord`, `mergeDailyRecords`, and the daily siblings in `cloneTelemetryBlob` / `mergeTelemetryBlobs`
- `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts` — the identical three-way key selection and win/lose-gated record write
- `src/services/storage/index.ts` — the new names exported beside their endless counterparts
- `src/runtime/overlays/DailyResultOverlay.tsx` — the closed-date panel, chrome copied verbatim, star styles deliberately not copied
- `src/runtime/GameScreen.tsx` — `mode` widened, `dailyDateKey` added, and a narrowing route to the daily overlay
- `app/_components/PlayingHost.tsx` — `startDailyRun`, `dailyDateRef` + `dailyDateKey`, the daily arm of `handleRunEnded`, a second compiled-push guard, and the `__DEV__` `Daily` control
- `app/_components/certLevelPlan.ts` — a `daily` arm returning `unreachable`
- `tests/ui/PlayingHost.daily-run.test.tsx` — the two end-to-end cases under jsdom
- `tests/ui/GameScreen.test.tsx`, `tests/ui/certLevelPlan.test.ts`, `tests/ui/PlayingHost.endless-host.test.ts` — widened to cover the new mode (see Deviations)

## Decisions Made

- **`DAILY_DIFFICULTY = 10.`** Taken from the generator's own published table rather than picked: 12 rows, 72 bricks, 116 authored HP at `d = 10`, sitting between `level-01`'s 32 bricks and `level-03`'s 94-brick showpiece, at a ~2-minute median clear, and exactly the difficulty endless reaches at wave 11.
- **`dailyDateKey` on `GameScreenProps` is required, not optional-with-a-default.** An empty-string default is a silent path to rendering `Daily · ` with a blank date; the host always knows the date by the time a daily result exists. The cost is one line in `GameScreen.test.tsx`'s `baseProps`, which is the same trade 11-08 made for `mode`/`wave`/`bestWave`.
- **The compiled-push gate effect got a SECOND early return rather than a widened one.** `if (modeRef.current === 'endless') { return; }` is pinned verbatim by a shipped source contract; collapsing it to `!== 'campaign'` would have deleted the anchor that test reads. One mode, one guard, each falsifiable on its own.
- **The daily arm of `handleRunEnded` publishes nothing to `resultBest`,** and that emptiness is now itself asserted: the daily panel has no `Best ·` line, so any publication from that region would be a record belonging to another mode reaching a panel with nowhere honest to put it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `certLevelPlanFor` could not accept the widened mode**
- **Found during:** Task 1 (host wiring)
- **Issue:** `certLevelPlanFor({ mode: modeRef.current, … })` declares `mode: 'campaign' | 'endless'`. Widening `modeRef` produced `error TS2322` and `npm run typecheck` went red.
- **Fix:** Added a `daily` arm returning `'unreachable'`, as its own statement beside the endless one, with the reason stated: a daily run is on a date-derived generated board, so `levelId` says nothing about it, forcing the session to `level-03` would destroy the live board, and arming a one-shot that can never discharge is the exact stranding round-5 gap 1 was about.
- **Files modified:** `app/_components/certLevelPlan.ts`
- **Verification:** `npm run typecheck` exits 0 with no `error TS`.
- **Committed in:** `f880fd0`

**2. [Rule 2 - Missing Critical] the cert truth table still claimed a two-mode domain**
- **Found during:** Task 1, immediately after deviation 1
- **Issue:** `tests/ui/certLevelPlan.test.ts` enumerates `MODES = ['campaign','endless']` and pins the cell count at 20. Adding a third mode leaves that table silently partial — exactly the hazard its own sibling case guards against for levels ("a level absent from a hand-written list slips past the truth table").
- **Fix:** `MODES` widened to include `daily`, `expectedPlan` gained the matching arm, cell count 20 → 30, and the assertion message now says MODES must stay the full `GameMode` set.
- **Files modified:** `tests/ui/certLevelPlan.test.ts`
- **Verification:** 30 cells drive green.
- **Committed in:** `f880fd0`

**3. [Rule 3 - Blocking] `GameScreen.test.tsx` `baseProps` no longer satisfied `GameScreenProps`**
- **Found during:** Task 1 (GameScreen prop widening)
- **Issue:** `baseProps` returns a full `GameScreenProps` literal; the new required `dailyDateKey` produced `error TS2322`.
- **Fix:** Added `dailyDateKey: ''` with a comment stating why the prop is required rather than defaulted.
- **Files modified:** `tests/ui/GameScreen.test.tsx`
- **Verification:** `npm run typecheck` exits 0.
- **Committed in:** `f880fd0`

**4. [Rule 3 - Blocking] two shipped source contracts in `PlayingHost.endless-host.test.ts` went red**
- **Found during:** Task 1, on the first full `npm test`
- **Issue:** (a) the `setResultBest` mode-correctness case extracts `handleRunEnded`'s endless arm by anchoring on `\n      if (modeRef.current === 'endless') {`; putting the daily arm first made that an `else if`, the region extracted empty, and the case's own non-empty tripwire fired. (b) the loop re-arm enumeration pins `setActive(true)` at exactly 5; `startDailyRun` makes 6, and the assertion message instructs the reader to come to it and prove the sixth site "either clears the run-ended latch on its own synchronous path or is guarded by it".
- **Fix:** Rather than merely re-anchoring, both contracts were extended to cover the new mode. (a) The extractor gained a `runEndedDaily` region and a new `dailyOnly` classification asserting the daily arm publishes NO `setResultBest` at all — the daily panel has no `Best ·` line, so a publication there would be a cross-mode record. (b) The count moved 5 → 6, `startDailyRun` was named in the message and in the members prose (as `1b`, so no existing cross-reference renumbers), and it was added to the assertion-4 loop that BINDS "clears the latch inside its own body, above its own arm" rather than taking it on trust.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** 27/27 pass; the added region is guarded by the file's own non-empty tripwire, so it cannot be vacuously green.
- **Committed in:** `f880fd0`

**5. [Rule 2 - Missing Critical] the compiled-push gate effect would have overwritten a live daily board**
- **Found during:** Task 1 (host wiring)
- **Issue:** That effect early-returns only for endless. Its own comment states the consequence of running during a generated-board run: it overwrites `compiledSv` with the campaign level and calls `retry()`, destroying lives, score and combo. A daily run is on a generated board too, so any `fxReady` / `loadResult` change mid-run would have done exactly that.
- **Fix:** A second, separate `if (modeRef.current === 'daily') { return; }` immediately after the endless one, with the reason and the reason for NOT folding the two together both stated.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm test` green including the source contract that pins the endless guard's exact text.
- **Committed in:** `f880fd0`

**6. [Rule 2 - Missing Critical] pressing `Daily` during a live endless run would have dropped that run**
- **Found during:** Task 1 (`startDailyRun`)
- **Issue:** `startEndlessRun`'s first statement is `recordInFlightEndlessRun()`, and `11-VERIFICATION.md` gap 1 is the post-mortem of what happens when a new entry point skips it: the in-flight run is silently discarded with `recordRunEnd` called zero times. A new mode entry is a new caller with the same obligation.
- **Fix:** `startDailyRun` calls `recordInFlightEndlessRun()` as its first statement, above every gate and write, matching the analog's position and its stated reason.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** the funnel's two existing no-ops make it inert from campaign and from daily; `npm test` green.
- **Committed in:** `f880fd0`

---

**Total deviations:** 6 auto-fixed (3 blocking, 3 missing-critical)
**Impact on plan:** No scope creep. Three are `tsc` refusing to compile the widened mode set; three are prohibitions the adjacent Phase 11 code states in its own comments and which a third mode inherits verbatim. Every source change outside `files_modified` is a single arm or a single guard; every test change widens an existing contract to cover `daily` rather than relaxing it.

## Issues Encountered

None. All seven `<verify>` gates and all ten acceptance criteria passed on first execution after the six deviations above were applied; the full suite went from 663 to 665 tests with no regressions.

## Known Stubs

None in the rendered product — `DailyResultOverlay` carries no placeholder text, no empty slot and no disabled control, and the streak block, badge, countdown and board-failure variant are simply absent rather than stubbed.

Two DECLARED boundaries ship open, both owned by named later plans, and both recorded in `.planning/WINDOWS.md`:

| Gap | Effect today | Owner |
|---|---|---|
| `sanitizeTelemetry` does not read `telemetry.daily` from the raw blob — it starts from `defaultTelemetryBlob()`, so a stored daily history is discarded on hydrate | the panel is correct within a session (it reads the blob `recordRunEnd` returns), but a daily history does not survive an app restart | plan 12-04 (`sanitizeDailyRecord`, declared in its `files_modified`) |
| `mergeDailyRecord` / `mergeDailyRecords` have no executing test — the jsdom harness mocks the whole storage module | the replace-in-place, `safeCounter` and union-sort behaviours are typechecked but unexercised | plan 12-03 (`tests/daily.record.test.ts`) |

Also deliberately out of scope for this tracer, per the plan: the closed-date read path (D-02), the `abandoned` boundaries on Pause/Retry and the dev controls (D-07/D-09), and the on-screen board-failure variant — all plan 12-05 Task 3.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema-at-a-trust-boundary beyond the register's own entries. `T-12-01` (unbounded aggregate map) and `T-12-02` (campaign elevation) are both mitigated and gated as the register prescribes; `T-12-04` (the `__DEV__` entry) uses the required `typeof __DEV__ !== 'undefined' && __DEV__` form. `T-12-SC`: zero packages added — neither `package.json` nor `package-lock.json` was touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 12-02.** `localDateKey` and the module's banned-primitive rule (plus its grep gate) are in place for `nextLocalMidnightMs` to inherit; the `daily` arm and both stores' daily blocks are in place for the SC-5 firewall suite to assert at runtime.
- **Ready for 12-03.** `DailyRecord` has exactly one field, so D-16's max-vs-union reconcile question does not exist yet — it arises only when 12-03's two scalars land, which is where its blocking checkpoint decides it. `mergeDailyRecords` is the one function that will need extending.
- **Ready for 12-04.** `TelemetryBlob.daily` exists and defaults cleanly, so `sanitizeDailyRecord` has a shape to coerce toward and a default to degrade to. This is the plan that closes the persistence gap above.
- **Ready for 12-05.** The panel's line order, the host's mode state and date ref, and the run-end funnel's daily arm are all in place; 12-05 adds lines to the panel and arms to the existing exit paths rather than restructuring either.
- **Concern for the phase verifier:** two of this plan's must-have truths are proven only at compile time or only by source position — the runtime campaign-firewall assertion (D6) and the 375pt dev-row fit (D9). The first is 12-02's declared work; the second is a device backstop the UI-SPEC already marks as unobservable in this suite.

## Self-Check: PASSED

All four created files exist on disk; all eleven modified files carry the changes; commit `f880fd0` is reachable from HEAD; `git rev-list --count 2723b02..HEAD` measures 1 commit, matching `actuals.commits`.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*
