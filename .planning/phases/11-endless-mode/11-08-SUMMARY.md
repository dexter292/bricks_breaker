---
phase: 11-endless-mode
plan: 08
subsystem: ui
tags: [react-native, endless-mode, records, telemetry, accessibility, vitest, testing-library]

# Dependency graph
requires:
  - phase: 11-endless-mode (plan 07)
    provides: waveBuildFailedWave, recordInFlightEndlessRun, startEndlessRun above onRetry, the decided A-01 Retry-time copy
  - phase: 11-endless-mode (plans 01-06)
    provides: telemetry.endless, mergeEndlessRecord, the endless arm of recordRunEnd, RecordRunEndArgs as a discriminated union
  - phase: 09-progress-store
    provides: evaluatePersonalBest, getSnapshot, the synchronous recordRunEnd return
provides:
  - The FIRST reader of telemetry.endless anywhere in app/ or src/ — the endless Results overlay
  - Per-mode watermark refs selected BEFORE the personal-best comparison, closing gap 2
  - A mode-aware ResultOverlay — endless metric lines, endless Retry a11y label, unreachable win chrome
  - The rendered wave-build-failure body, mid-run and Retry-time, closing 11-07's D8 debt
  - docs/ops/ENDLESS-MODE.md § Limits item 7 — WR-01 recorded as accepted debt with its measured factors
affects: [14-endless-production-chrome]

# Actuals (#2632) — estimateTokens scale (chars/4 over the files actually changed),
# not a harness token count. 207,805 chars across the ten touched files.
actuals:
  tokens: 51951
  tasks: 3
  commits: 3
  plan_head_before: c3a9517f2b486a99ebe525f9e5a4ba86b03897fc

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A per-mode display source is selected BEFORE the comparison that uses it — branching after the compare is what leaked a campaign record onto an endless overlay"
    - "One overlay serves two modes by taking a discriminant prop, so neither mode can reach the other's numbers: everything mode-specific is chosen by the host"
    - "Every new assertion is falsified against a deliberately re-introduced defect before it is accepted — including the test helpers themselves"
    - "A source contract whose shape forbids a required fix is REWRITTEN to keep asserting its property, never deleted to go green"

key-files:
  created:
    - tests/ui/PlayingHost.endless-record.test.tsx
  modified:
    - app/_components/PlayingHost.tsx
    - src/runtime/GameScreen.tsx
    - src/runtime/overlays/ResultOverlay.tsx
    - tests/ui/ResultOverlay.test.tsx
    - tests/ui/GameScreen.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts
    - tests/ui/PlayingHost.endless-retry.test.tsx
    - tests/ui/PlayingHost.endless-run.test.tsx
    - docs/ops/ENDLESS-MODE.md

key-decisions:
  - "The mode branch in handleRunEnded moved ahead of evaluatePersonalBest, and the two arms now each own their own recordRunEnd call — one ternary call site could not express branch-before-compare"
  - "waveBuildFailedWave alone discriminates the two failure bodies: 1 is always Retry-time, >= 2 is always mid-run, because a mid-run failure is waveRef.current + 1 and waveRef is >= 1 from the first successful build. No second flag was added"
  - "ResultOverlay FORCES the lose variant in endless (isWin = kind === 'win' && !isEndless) rather than trusting the caller — a future caller passing stars/onNext in endless cannot put campaign chrome on an endless overlay"
  - "mode/wave/bestWave are REQUIRED props on GameScreenProps and ResultOverlay's Props, not optional-with-default — a defaulted mode would silently render campaign chrome for endless if a call site forgot it"
  - "safeWatermark mirrors the storage layer's safeCounter at the app tier rather than trusting it: the value crosses the persisted-blob -> UI trust boundary and is rendered to the player (T-11-08-03)"
  - "WR-01 recorded, not fixed (owner, 2026-09-26): the bake path is untouched and the SC-5 discharge procedure names the stretched halo as expected and accepted"

patterns-established:
  - "Falsify before accepting — including the test's own helpers: a line-order helper that advanced a cursor past each match was monotonic by construction and green regardless of render order"

requirements-completed: [N-END-02, N-END-03]

coverage:
  - id: E1
    description: "The endless Results overlay reads its record from telemetry.endless, never from a campaign level best: Best from bestScore and Best wave from bestWave, both post-merge"
    requirement: N-END-02
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#an endless loss renders the four endless metric lines in contract order (11-UI-SPEC § Endless copy)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#the displayed record is the POST-MERGE value from recordRunEnd, not the pre-run watermark and not the run"
        status: pass
    human_judgment: false
  - id: E2
    description: "No campaign number appears on an endless overlay — the campaign per-level best is absent from the rendered overlay text (T-11-08-01)"
    requirement: N-END-02
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#the campaign level best appears NOWHERE on the endless overlay (gap 2 / T-11-08-01)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the campaign comparison is unreachable from the endless arm (gap 2)"
        status: pass
    human_judgment: false
  - id: E3
    description: "previousBestRef is never written by an endless run: after the run ends, the next startEndlessRun republishes it and it still reads the campaign value (SC-3 / T-11-08-02)"
    requirement: N-END-02
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#an endless run does not write the campaign personal best (T-11-08-02 / WR-02)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the campaign comparison is unreachable from the endless arm (gap 2)"
        status: pass
    human_judgment: false
  - id: E4
    description: "New Record in endless is strict in BOTH watermarks and either is sufficient — equality keeps the previous record (D-11)"
    requirement: N-END-02
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#New Record is strict in BOTH watermarks — equality keeps the previous record (D-11 / N-END-02)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#New Record fires on score alone, one point above the watermark"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#New Record fires on wave alone, with the score exactly at the watermark"
        status: pass
    human_judgment: false
  - id: E5
    description: "No primary record is elected: one badge, one colour, for either record kind (A-08)"
    verification:
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.test.tsx#a record of either kind shows exactly ONE badge, in one style — no primary record is elected (A-08)"
        status: pass
    human_judgment: false
  - id: E6
    description: "Win, All clear, the star row and Next are unreachable on the endless overlay even when a caller supplies stars and onNext (SC-1)"
    verification:
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.test.tsx#the win chrome is unreachable in endless even when stars and onNext are supplied (SC-1)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/GameScreen.test.tsx#result lose in endless: forwards mode, wave, bestWave and the failure body"
        status: pass
    human_judgment: false
  - id: E7
    description: "The endless Retry control announces `Retry endless run from wave 1`; the visible label is unchanged (11-UI-SPEC § Accessibility labels)"
    verification:
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.test.tsx#the Retry control announces the endless action, not a level retry"
        status: pass
    human_judgment: false
  - id: E8
    description: "The wave-build-failure body renders — `Wave 1 could not be built — tap Retry` at Retry time and `Wave {n} could not be built — run saved` mid-run — with all four metric lines intact. This DISCHARGES 11-07's D8 debt"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a Retry that cannot build wave 1 renders the decided tap-Retry body (A-01, D8)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a mid-run wave-build failure renders the run-saved body on the real overlay"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.test.tsx#a Retry-time wave-build failure says tap Retry, never run saved (A-01, retry-in-place)"
        status: pass
    human_judgment: false
  - id: E9
    description: "E1 empty / loading / error: a first endless run renders zeros from defaultEndlessRecord(), the watermarks are seeded at mount and the overlay never blocks on the read, and a storage failure falls soft to the last known values with no error modal"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-run.test.tsx (whole file) — the store mock seeds telemetry.endless zeros and the endless run loop is unaffected"
        status: pass
    human_judgment: true
    rationale: "The zero/seeded paths are exercised, but the storage-FAILURE path (a rejected getSnapshot) has no case of its own — the .catch arm is written and typechecked, not driven. A verifier should either add that case or read the arm."
  - id: E10
    description: "The ops record describes the behaviour that ships: the run-boundary contract, the display-path correction to § Limits item 6, the amended SC-5 discharge procedure, and § Limits item 7 recording WR-01 as accepted debt"
    verification:
      - kind: command
        ref: "grep -c '## Limits' && grep -c 'Discharge procedure' && grep -c '0.77' docs/ops/ENDLESS-MODE.md && grep -c 'bakeGlowSprites(brickW, brickH)' app/_components/PlayingHost.tsx"
        status: pass
      - kind: command
        ref: "grep -cE '^> \\([a-d]\\) ' docs/ops/ENDLESS-MODE.md — still exactly 4 failure signatures"
        status: pass
    human_judgment: false
  - id: E11
    description: "On a dev build: the endless Results panel reads correctly on real hardware — lose heading in destructive red, four metric lines in order and untinted, Retry white-filled above outlined Menu, no star row, no Next, nothing wraps or clips at the 320px panel width, whole panel inside the safe area"
    verification: []
    human_judgment: true
    rationale: "Task 2's <human-check>. No automated step in this repo can produce a frame on hardware or measure a real panel width. workflow.human_verify_mode is end-of-phase, so this is deferred to /gsd-verify-work 11 rather than gated here. Includes the E1 backstop truth (a 7-digit score and a 4-digit wave must not wrap) — the fit is computed, never observed."

# Metrics
duration: 25 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 08: The endless record display Summary

**The record the endless player sets is now the record the endless player sees: per-mode watermark refs selected before the personal-best comparison, a mode-aware `ResultOverlay` reading `telemetry.endless` post-merge, and `previousBestRef` untouched by any endless run.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-26T04:50:00Z
- **Completed:** 2026-09-26T05:15:00Z
- **Tasks:** 3
- **Files modified:** 10 (1 created)

## Accomplishments

- **Gap 2 is closed.** `handleRunEnded` branches on mode **before** it compares. The old order — `evaluatePersonalBest(runScore, previousBestRef.current)` first, mode branch second — produced all three symptoms at once from one line: the campaign per-level best shown as the endless `Best`, `New Record` firing against an unrelated campaign score, and the endless score written back into the campaign ref where the next run start re-published it. The two arms no longer share a comparison basis.
- **`telemetry.endless` has a reader.** It had none anywhere in `app/` or `src/` — the record an endless player set was the one number never shown to them. The endless Results overlay reads it, post-merge, off the blob `recordRunEnd` returns synchronously rather than from a second racing `getSnapshot()`.
- **`New Record` in endless is strict in both watermarks, and elects neither.** Either one strictly exceeded fires it; equality keeps the previous record (D-11). One badge, one colour, no tint distinguishing the two — which record *is* the record stays Phase 14's decision.
- **The win chrome cannot reach an endless overlay.** SC-1 means an endless run never ends on a cleared board, so the overlay forces the lose variant rather than trusting the caller: a call site that passes `stars: 3` and an `onNext` in endless gets neither a star row nor a `Next` control.
- **11-07's D8 debt is paid.** The owner-decided copy `Wave 1 could not be built — tap Retry` is rendered, asserted at component level, and driven through the real host — press `Retry` with a forced wave-1 compile failure and read the body. The mid-run `run saved` variant too. `waveBuildFailedWave` is read, and 11-07's scoped `eslint-disable` at its declaration is deleted.
- **The ops record matches what ships.** A new run-boundary + record-display section, § Limits item 6 corrected in place under a dated supersession, the SC-5 discharge procedure amended twice, and § Limits item 7 recording WR-01 as accepted debt with its measured factors.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): End-to-end — an endless loss shows the ENDLESS record** — `3aa9b45` (fix)
2. **Task 2: the endless New Record rule, the unreachable win chrome, and the endless a11y label** — `2cfcbbc` (feat)
3. **Task 3: update the ops record to match the contract that now ships** — `38cb42c` (docs)

**Measured:** `git rev-list --count c3a9517..HEAD` = **3** at SUMMARY write. The plan-metadata commit follows this file.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — `endlessBestScoreRef` / `endlessBestWaveRef` seeded once at mount from `getSnapshot().telemetry.endless`; `resultWave` / `resultBestWave` state; `safeWatermark` at module scope; `handleRunEnded` restructured into two arms with the mode branch first and one `recordRunEnd` call per arm; `mode` / `wave` / `bestWave` / `waveBuildFailedWave` threaded to `GameScreen`; 11-07's `eslint-disable` deleted.
- `src/runtime/GameScreen.tsx` — four new props on `GameScreenProps`, forwarded to `ResultOverlay`. No layout change, no new import, no storage import.
- `src/runtime/overlays/ResultOverlay.tsx` — the `mode` discriminant, the two endless metric lines in contract order, the forced lose variant in endless, the endless `Retry` accessibility label, and the wave-build-failure body.
- `tests/ui/PlayingHost.endless-record.test.tsx` — **new.** 9 cases driving the real host into the real overlay.
- `tests/ui/ResultOverlay.test.tsx` — an endless describe block, 8 cases.
- `tests/ui/GameScreen.test.tsx` — base props widened; one forwarding case.
- `tests/ui/PlayingHost.endless-host.test.ts` — the 11-07 `recordRunEnd` source contract rewritten for the two-arm shape, plus a new gap-2 regression fence.
- `tests/ui/PlayingHost.endless-retry.test.tsx`, `tests/ui/PlayingHost.endless-run.test.tsx` — store mocks given `getSnapshot` and a `telemetry.endless` on the `recordRunEnd` return.
- `docs/ops/ENDLESS-MODE.md` — the new section, the item 6 supersession, two discharge-procedure amendments, item 7.

## Decisions Made

**The mode branch moved ahead of the comparison, and one call site became two.** 11-UI-SPEC § Record Display Contract requires branch-before-compare. A single `store.recordRunEnd(` whose argument is a ternary cannot express that — the ternary *is* the branch, and it sits after the compare. Each arm now owns its own call. The 11-07 source contract that pinned the ternary shape was rewritten to keep its property (the arm is chosen by `modeRef`, the endless arm carries the wave, the campaign arm carries `levelId`), not deleted.

**One value discriminates the two failure bodies.** `waveBuildFailedWave === 1` is always Retry-time; `>= 2` is always mid-run. That holds structurally: a mid-run failure sets `waveRef.current + 1`, and `waveRef` is `1` from the first successful build, so mid-run can never produce `1`. 11-07 stored the FAILED wave rather than the last good one precisely so this needed no arithmetic; it also needs no second flag.

**`mode` is a required prop, not optional-with-default.** A defaulted `'campaign'` would render campaign chrome for an endless run if a call site forgot to pass it — silent, and exactly the class of defect this plan exists to close. Required costs two lines in two test fixtures and makes the omission a compile error.

**The overlay forces the lose variant in endless rather than trusting `kind`.** UI-SPEC says the win chrome is "unreachable and must not render" in endless. Gating only on `kind` would make that a caller promise; `isWin = kind === 'win' && !isEndless` makes it a component property.

**`safeWatermark` duplicates `safeCounter`'s semantics at the app tier deliberately.** The value crosses the persisted-blob → UI trust boundary and is rendered straight to the player (T-11-08-03). A hand-edited `telemetry.endless` cannot produce `Best · NaN`, and cannot reach campaign state at all.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] An 11-07 source contract's shape forbade the branch-before-compare fix**

- **Found during:** Task 1
- **Issue:** `tests/ui/PlayingHost.endless-host.test.ts` matched `/store\.recordRunEnd\(([\s\S]*?)\n {6}\);/` and required the extracted argument to contain `modeRef.current === 'endless'` — i.e. it pinned the single-call-site-with-a-ternary shape. The Record Display Contract requires the mode branch to precede `evaluatePersonalBest`, which splits that one call into one per arm.
- **Fix:** Rewrote the contract against the branch structure, keeping all three claims it actually makes (arm selected by `modeRef`; endless arm carries the wave reached; campaign arm still carries `levelId`), and added a non-empty assertion on the extracted endless arm so it cannot pass vacuously. Also **added** a new contract — the gap-2 regression fence — asserting that `evaluatePersonalBest` and any write to `previousBestRef` are unreachable from the endless arm.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** `npx vitest run` — 97 files / 593 tests, 0 failing.
- **Commit:** `3aa9b45`

**2. [Rule 3 - Blocking] Two existing host test store mocks had no `getSnapshot`**

- **Found during:** Task 1
- **Issue:** The new mount-time watermark seed calls `store.getSnapshot()`. `PlayingHost.endless-retry.test.tsx` and `PlayingHost.endless-run.test.tsx` mock `createDefaultProgressStore` with a partial object that has no such method, so the effect would throw. `endless-run`'s `recordRunEnd` return also carried no `telemetry` at all.
- **Fix:** Gave both mocks a `getSnapshot` returning zeroed `telemetry.endless`, and gave `endless-run`'s `recordRunEnd` return the same zeroed shape. Both files' existing contracts are unchanged by this — they do not drive the display half.
- **Files modified:** `tests/ui/PlayingHost.endless-retry.test.tsx`, `tests/ui/PlayingHost.endless-run.test.tsx`
- **Verification:** both files pass unchanged in content.
- **Commit:** `3aa9b45`

**3. [Rule 1 - Bug] A `not.toContain` assertion was green for the wrong reason**

- **Found during:** Task 1
- **Issue:** The post-merge case asserted the overlay text did not contain `Best · 900` (the pre-run seed) while the post-merge value was `9001` — and `Best · 9001` *contains* `Best · 900` as a prefix, so the assertion failed on a correct render.
- **Fix:** Switched to exact text-node matching (`queryByText(...)` returns null), which is what the claim actually means, and added the `Best wave · 1` counterpart.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Commit:** `3aa9b45`

**4. [Rule 1 - Bug] The strict-equality New Record case passed against the pre-fix host**

- **Found during:** Task 1, while falsifying the new tests
- **Issue:** Of seven new cases, six failed against a deliberately re-introduced defect and one did not. With the fixture's campaign best of `7777`, the pre-fix `evaluatePersonalBest(2400, 7777)` also reports no record — so "equality keeps the previous record" was green whether or not the strict endless rule existed.
- **Fix:** Set `campaignBest = 0` for that case, with the reason recorded inline. The defective host now *would* fire the badge (`2400 > 0`) while the fixed one must not (`2400` is not `> 2400`). Re-falsified: the case fails against the defect.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Commit:** `3aa9b45`

**5. [Rule 1 - Bug] The line-order helper was monotonic by construction**

- **Found during:** Task 2
- **Issue:** `lineOrder` advanced a cursor past each match before searching for the next, so the returned array was always sorted and the "line order is contract" assertion (`toEqual(sorted)`) was green regardless of what order the component rendered.
- **Fix:** Each `indexOf` now starts from 0 independently, and the assertion walks adjacent pairs. Falsified by swapping the `Wave ·` and `Score ·` lines in the component: the case fails.
- **Files modified:** `tests/ui/ResultOverlay.test.tsx`
- **Commit:** `2cfcbbc`

**6. [Rule 2 - Missing Critical] The Retry-time copy had no host-driven rendering test**

- **Found during:** Task 2
- **Issue:** 11-07 recorded D8 as `human_judgment: true` with "11-08 owes the rendering test". A component-level case proves the string renders from a prop; it does not prove the host ever sets that prop, which is the half 11-07 could not close.
- **Fix:** Added the forced-compile-failure mock to the endless-record harness and two host-driven cases — a mid-run failure (`Wave 2 could not be built — run saved`) and a Retry press that cannot build wave 1 (`Wave 1 could not be built — tap Retry`, overlay still up, `Retry` still live). Writing them immediately exposed a missing `waveBuildFailedWave` forward in the test's own `GameScreen` mock.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Verification:** both fail when the failure body is suppressed in the component.
- **Commit:** `2cfcbbc`

---

**Total deviations:** 6 auto-fixed (2 blocking, 3 bugs, 1 missing critical)
**Impact on plan:** No scope creep. Two were mechanical consequences of the planned restructure; three were honesty repairs to this plan's own new assertions, found by falsifying them rather than trusting a green run; one paid an inherited debt the plan's own success criteria named.

## Known Stubs

None. The `waveBuildFailedWave` stub 11-07 recorded (`.planning/WINDOWS.md` entry 8) is **resolved** — the value is read, rendered and tested, and the `eslint-disable` that kept lint silent is deleted. `npm run lint` is silent without it.

## Authentication Gates

None.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. The threat register's three `mitigate` dispositions are all discharged:

| Threat | Disposition | Where |
|--------|-------------|-------|
| T-11-08-01 spoofing (campaign number as endless record) | mitigated | branch-before-compare; coverage E2 |
| T-11-08-02 tampering (`previousBestRef` written by endless) | mitigated | no endless write-back; coverage E3 |
| T-11-08-05 repudiation (ops record describing dead behaviour) | mitigated | Task 3; coverage E10 |

`T-11-08-03` (corrupt `telemetry.endless`) stays `accept` as planned, and is additionally hardened by `safeWatermark`. `T-11-08-04` (unbounded wave overflowing the panel) stays `accept` and is the E11 human-check item.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run` (whole workspace) | **97 files / 593 tests, 0 failing** (baseline 96/573; +1 file, +20 cases) |
| `npx vitest run tests/ui` | 16 files, 0 failing |
| `npm run typecheck` | exit 0, no output |
| `npm run lint` | exit 0, no output — **without** 11-07's `eslint-disable` |
| `git diff --name-only c3a9517..HEAD -- src/core src/levelgen` | empty — the Phase 10 freeze holds |
| Bake-path fence (`grep -c "bakeGlowSprites(brickW, brickH)"`) | 1 — the atlas still reads the same locals; WR-01 is recorded, not fixed |
| SC-5 failure signatures still exactly four | `grep -cE '^> \([a-d]\) '` = 4 |
| § Limits item 2 still OPEN, refusal to write an untaken reading intact | both present |
| Record Display Contract rows with an assertion | all five (coverage E1-E4, E6) |
| Every new assertion falsified against a re-introduced defect | yes — 6/7 initially, the 7th fixed (deviation 4) |

## Scope Fences Honoured

- **SC-5 is not claimed and not discharged.** No task measured a frame on hardware. § Limits item 2 stays OPEN, "no device available" stays a valid outcome, and `.planning/STATE.md` § Pending Todos keeps tracking it. Task 3 edited the procedure's *accuracy*, not its status.
- **No Phase 14 reach.** No production endless entry point, no permanent endless record surface, and no primary record elected — both lines render in the same weight and colour under one shared badge.
- **The bake path is untouched.** WR-01 is a recording per the owner's 2026-09-26 decision; no `ENDLESS_BRICK_DIMS` was introduced.
- **`src/core` and `src/levelgen` untouched** across all three commits.

## Issues Encountered

**Three of this plan's own new assertions were initially worthless, and only falsification found them.** Deviations 3, 4 and 5 — a prefix-matching `not.toContain`, a strictness case that a campaign-best fixture made vacuous, and an ordering helper that sorted its own output. The 11-07 caution carried in the dispatch was correct and worth repeating: a green new test proves nothing until it has been watched to fail for the right reason.

**Nothing else.** No authentication gates, no package installs, no architectural decisions.

## Next Phase Readiness

**Phase 11 is code-complete.** Both recorded verification gaps are closed; what remains is device-gated and owner-gated, not buildable:

1. **SC-5 device reading (OPEN).** The standing human-verification item. The discharge procedure in `docs/ops/ENDLESS-MODE.md` § Limits item 2 now warns the reader off the three dev-row controls that would silently kill the frame loop, and tells them the stretched brick halo is expected — so the reading is neither lost to the latch nor discarded over known debt.
2. **Task 2's `<human-check>` (coverage E11).** The Results panel on real hardware — colour, order, tinting, wrap and safe area. `workflow.human_verify_mode` is `end-of-phase`, so it routes to `/gsd-verify-work 11`.
3. **A-02 (WR-02) is an owner decision still owed** — whether entering endless should disable the other `__DEV__` controls, exit back to campaign, or simply be documented as one-way. Written into the ops record as open, with the decision named.
4. **A-04 (WR-01) is decided and recorded** — accepted debt, `ENDLESS_BRICK_DIMS` in Phase 14.

**Suggested next:** `/gsd-verify-work 11`.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `tests/ui/PlayingHost.endless-record.test.tsx` — present on disk
- `src/runtime/overlays/ResultOverlay.tsx` — present on disk
- `src/runtime/GameScreen.tsx` — present on disk
- `app/_components/PlayingHost.tsx` — present on disk
- `docs/ops/ENDLESS-MODE.md` — present on disk
- `.planning/phases/11-endless-mode/11-08-SUMMARY.md` — present on disk
- All three task commits found in `git log`: `3aa9b45`, `2cfcbbc`, `38cb42c`
