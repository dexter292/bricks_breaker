---
phase: 09-run-telemetry-storage-v4
plan: 04
subsystem: ui
tags: [telemetry, react-native, reanimated, sharedvalue, run-boundary, wall-clock, expo]

# Dependency graph
requires:
  - phase: 09-01
    provides: GameLoopHandle.runStats (SharedValue<RunStats | null>) + cloneRunStats — the drained per-run counters this plan reads at the run boundary
  - phase: 09-02
    provides: v4 recordRunEnd({ mode, stats }) contract, RunStatsInput, and the defaultRunStatsInput() stub this plan removes
  - phase: 09-03
    provides: single-flight ensureHydrated + hydrated-path recordRunEnd — the ordering constraint this plan preserves (the awaited getBestForLevel on mount stays)
provides:
  - "app/_components/PlayingHost.tsx — real per-run counters flow reducer -> store; the all-zero stub is gone"
  - "handleRunEnded extended to 4 args with outcome 'win' | 'lose' | 'abandoned' — one call site for every run boundary (C2)"
  - "handleMenuPress — THE single abandon funnel, substituted at both pre-existing onMenu call sites, guarded by the shared runEndedRef (T-09-10)"
  - "buildRunStatsInput — field-by-field RunStats -> RunStatsInput mapper keeping rallyCurrent out of the persisted shape and longestRally/bestCombo distinct (D-10)"
  - "Play-only wall clock: a segmented accumulator that banks on pause / OS background / resume countdown, so paused time never enters wallClockMs (D-09)"
affects: [13-achievements, 14-stats-screen, any phase adding a run mode beyond campaign]

actuals:
  tokens: 3200
  tasks: 2
  commits: 3
plan_head_before: 036b879a6d0fc72f1f0ecfb080495f87e47da872

tech-stack:
  added: []
  patterns:
    - "Run-boundary snapshot helper (snapshotRunStats) — one function feeds all three outcomes, so a new outcome can never drift from win/lose"
    - "Segmented wall clock: refs + the existing uiPhase effect, not a timer — zero extra renders, zero hot-path work, and the AppState background transition is covered for free because onOsPause already routes through uiPhase='paused'"
    - "Guard reuse over guard duplication: abandon shares runEndedRef with WON/LOST rather than introducing a second 'already recorded' flag"

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx

key-decisions:
  - "Wall clock measures PLAY time, not elapsed time — the plan's literal `Date.now() - runStartedAtRef.current` would have included paused time and failed the checkpoint's own ~60s-not-~90s criterion"
  - "Monetization hooks (ads/purchases/accounts) deliberately do NOT fire on 'abandoned' — RunEndedPayload stays a win/lose concept so a Menu tap cannot trigger an interstitial"
  - "One snapshotRunStats helper instead of three inline snapshot constructions"

patterns-established:
  - "Pattern: app-layer-only telemetry fields (ticksPlayed, wallClockMs) are assembled at the single mapper, never smuggled into the runtime reducer"

requirements-completed: [N-STAT-01, N-STAT-02]

coverage:
  - id: D1
    description: "PlayingHost records real per-run counters (bricks, per-type pickups, livesLost, longestRally, bestCombo, largestCascade) through the single v4 recordRunEnd call site — the all-zero defaultRunStatsInput() stub is removed"
    requirement: "N-STAT-01"
    verification:
      - kind: unit
        ref: "npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts (44 passed)"
        status: pass
      - kind: other
        ref: "grep -c defaultRunStatsInput app/_components/PlayingHost.tsx == 0; grep for mode: 'campaign' matches inside store.recordRunEnd"
        status: pass
      - kind: other
        ref: "npm run typecheck && npm run lint (both exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exiting to Menu mid-run records exactly one 'abandoned' run through the single onMenu funnel; a run already ended by WON/LOST cannot double-record"
    requirement: "N-STAT-01"
    verification:
      - kind: other
        ref: "grep -c handleMenuPress == 4 (decl + BackHandler call site + GameScreen prop + dep array); zero remaining onMenu={onMenu}; guard is the shared runEndedRef"
        status: pass
    human_judgment: true
    rationale: "Static structure is proven, but the actual flush on RN unmount ordering + AsyncStorage is not observable headlessly (VALIDATION Manual-Only table). Gated by the Task 3 checkpoint — STILL PENDING."
  - id: D3
    description: "wallClockMs measures play time only — a mid-run pause (button or OS background) contributes 0ms, while ticksPlayed stays the separate simulated-time answer"
    requirement: "N-STAT-01"
    verification: []
    human_judgment: true
    rationale: "Requires real elapsed time and a real AppState background transition (VALIDATION Manual-Only table). Gated by the Task 3 checkpoint — STILL PENDING."
  - id: D4
    description: "SC-5 — hashWorld byte-identical, no illegal services/ import from core or runtime, full suite green with zero regressions"
    verification:
      - kind: unit
        ref: "npx vitest run tests/physics.golden-replay.test.ts tests/physics.hash-canonical.test.ts (8 passed)"
        status: pass
      - kind: other
        ref: "npx eslint src/core src/runtime (exit 0)"
        status: pass
      - kind: unit
        ref: "npm test — 81 files / 444 tests passed, 0 todo, all assert scripts clean"
        status: pass
      - kind: other
        ref: "git diff --stat -- src/core (empty working-tree diff)"
        status: pass
    human_judgment: false

# Metrics
duration: 10 min
completed: 2026-09-25
status: complete
---

# Phase 9 Plan 4: PlayingHost Run-Boundary Wiring Summary

**The last gap is closed: real reducer counters now reach the v4 store on every run boundary — win, lose, and exit-to-Menu — through one guarded call site, with wall-clock measured as play time rather than elapsed time.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-25T07:52Z
- **Completed:** 2026-09-25T08:02Z
- **Tasks:** 2 of 3 (Task 3 is a human checkpoint — PENDING, see below)
- **Files modified:** 1

## Accomplishments

- **The `defaultRunStatsInput()` stub left by 09-02 is gone.** `PlayingHost` now destructures `runStats` and `world` off `GameLoopHandle`, clones the counters off the SharedValue at the run boundary, and maps them field-by-field into `RunStatsInput`. Every persisted run carries its real bricks/pickups/rally/cascade numbers instead of zeros.
- **Win, lose, and abandon all land on ONE call site.** `handleRunEnded` widened to `(score, 'win' | 'lose' | 'abandoned', livesRemaining, stats)`; `applyChrome`'s WON/LOST branches and the new `handleMenuPress` are its only three callers. No parallel `recordRunEnd` was added (C2 lock honored).
- **Abandon has exactly one detection site.** `handleMenuPress` wraps the `onMenu` prop and was substituted at both pre-existing references — the `BackHandler` effect and the `GameScreen` prop — so the Android hardware-back path and the Pause→Menu path are literally the same code. It reuses the WON/LOST `runEndedRef`, which is what makes double-recording structurally impossible rather than merely unlikely.
- **Wall clock excludes paused time.** A segmented accumulator (`runStartedAtRef` / `runWallClockMsRef` / `wallClockActiveRef`) driven by the existing `uiPhase` effect opens a segment on `'playing'` and banks it on anything else. Because `onOsPause` already routes the AppState background transition through `uiPhase = 'paused'`, backgrounding is covered without a second listener.
- **Every retry is a new run (D-01).** All four run-restart sites (`onRetry`, `goNext`, `toggleDevLevel`, `remountDevSession`) now re-arm the wall clock alongside the existing `runEndedRef` reset; the counters themselves are already zeroed in place by the UI-runtime retry path from 09-01.
- **SC-5 re-verified at the phase level.** Golden-replay and hash-canonical pass unchanged, `eslint src/core src/runtime` is clean (no `services/` leak across the LC-04/LC-09 boundary), and the full gate is **81 files / 444 tests, 0 todo** — exactly the stated baseline, zero regressions.

## Task Commits

1. **Task 1: Wire PlayingHost.tsx end to end** — `9e97167` (feat)
2. **Task 2: Phase-wide SC-5 verification** — no commit (pure verification task, produced no file changes; evidence recorded in this SUMMARY)
3. **Task 3: Manual QA checkpoint** — **NOT RUN — PENDING human verification** (see below)

**Plan metadata:** the `docs(09-04)` commit carrying this SUMMARY.

Measured from `plan_head_before` (`036b879`): the range reads **3** commits — 1 code, 1 docs carrying this SUMMARY, 1 docs carrying the self-check below.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — added the `buildRunStatsInput` mapper and the run-boundary `snapshotRunStats` helper; widened `handleRunEnded`; added `handleMenuPress` and substituted it at both `onMenu` call sites; added the three wall-clock refs plus the segmentation branch in the `uiPhase` effect; re-armed the wall clock at all four run-restart sites; removed the `defaultRunStatsInput` import.

## Decisions Made

- **Wall clock = play time, not elapsed time.** See Deviation 1 — the plan's literal expression and its own acceptance criterion disagreed, and VALIDATION decided it.
- **`'abandoned'` does not fire the monetization hooks.** `RunEndedPayload.outcome` is typed `'win' | 'lose'`. Widening it would have made an exit-to-Menu a monetizable "run ended" event — i.e. an interstitial on a Menu tap. Narrowing at the call site instead leaves the platform contract untouched and keeps abandon purely a telemetry concept.
- **One `snapshotRunStats` helper, not three inline constructions.** The plan sketched the snapshot inline at each branch. A single helper means a fourth outcome cannot silently diverge from the other three; `cloneRunStats(runStats.value)` still appears verbatim (the plan's `key_links` pattern), just once.
- **`readRunWallClockMs` is non-destructive.** Reading the clock at a run boundary does not close the live segment, so the WON branch (which fires while `uiPhase` is still `'playing'`) reports the full run without special-casing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's wall-clock expression included paused time, contradicting its own acceptance criterion**

- **Found during:** Task 1
- **Issue:** The plan's `<action>` specifies `Date.now() - runStartedAtRef.current` as `wallClockMs`. That is *elapsed* time: a 30s pause adds 30000ms. Task 3's own `how-to-verify` requires the opposite — "should read approximately 60 seconds (±5s), not approximately 90 seconds" for play-30s / pause-30s / play-30s — and 09-VALIDATION.md row 09-04-03 states "Wall-clock play time excludes pause". Shipping the literal expression would have built a feature guaranteed to fail its own checkpoint.
- **Fix:** Replaced the single start-stamp with a segmented accumulator: `runStartedAtRef` (start of the live segment), `runWallClockMsRef` (banked segments), `wallClockActiveRef` (is a segment open). The existing `uiPhase` effect opens a segment on `'playing'` and banks it on `'paused'` / `'countdown'`. `readRunWallClockMs()` returns banked + live. Pause, OS background (already routed through `uiPhase='paused'` by `onOsPause`), and the 3-2-1 resume countdown are all excluded.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm run typecheck` / `npm run lint` clean; the behavior itself is the subject of the pending Task 3 checkpoint (it is not headlessly observable — that is precisely why VALIDATION marks it manual-only).
- **Committed in:** `9e97167`

**2. [Rule 3 - Blocker] `useRef(Date.now())` fails the project's `react-hooks/purity` lint rule**

- **Found during:** Task 1
- **Issue:** The plan specifies `const runStartedAtRef = useRef(Date.now());`. `eslint .` rejects it: "Cannot call impure function during render — `Date.now` is an impure function." The commit would have been blocked.
- **Fix:** Seeded the ref with `0` instead. The seed is provably never read: `wallClockActiveRef` starts `false`, so `readRunWallClockMs()` ignores `runStartedAtRef` until the `uiPhase` effect stamps a real `Date.now()` when the first segment opens. Documented inline so a future reader does not "restore" the impure seed.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm run lint` exits 0.
- **Committed in:** `9e97167`

**3. [Rule 2 - Missing critical] `'abandoned'` would have been passed to a `'win' | 'lose'` platform payload**

- **Found during:** Task 1
- **Issue:** `handleRunEnded` forwards `outcome` into `RunEndedPayload` (`src/services/platform/types.ts`), typed `outcome: 'win' | 'lose'`. Widening `handleRunEnded` to accept `'abandoned'` made this a type error. The obvious "fix" — widening `RunEndedPayload` — would have silently turned every exit-to-Menu into an ad/purchase/account run-ended event.
- **Fix:** Guarded the three `platform.*.onRunEnded(payload)` calls with `if (outcome !== 'abandoned')`, which also narrows the type. `src/services/platform/**` is untouched.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm run typecheck` exits 0; full suite green.
- **Committed in:** `9e97167`

### Structural (non-behavioral)

**4. Single `snapshotRunStats` helper rather than three inline snapshots** — documented under Decisions Made. The `key_links` pattern `cloneRunStats\(runStats\.value\)` still matches, and all acceptance-criteria greps pass.

---

**Total deviations:** 3 auto-fixed (1× Rule 1, 1× Rule 2, 1× Rule 3) + 1 structural.
**Impact on plan:** All three were necessary — two were hard blockers (lint, typecheck) and one was a correctness bug that would have shipped a feature failing its own checkpoint. No scope creep: only `app/_components/PlayingHost.tsx` was modified, exactly as `files_modified` declares.

## Issues Encountered

**SC-5 holds behaviorally, but NOT literally — and the cause is outside this plan.**

The plan's Task 2 gate is the working-tree diff of `src/core`. That is **empty** — Task 2 passes as written, and no plan in this phase has uncommitted core changes.

However, widening the check to the whole phase *history* (phase-directory base `8052d44^` through HEAD) finds one hit:

```
 src/core/rules/brickDamage.ts | 159 ++++++++++++++++++++++++------------------
```

The change is carried by commit **`3f20563` — "chore(09): mark Wave 1 complete in ROADMAP and STATE"**, an orchestrator bookkeeping commit whose own message asserts that the core diff was empty. No plan SUMMARY in this phase (09-00 / 09-01 / 09-02 / 09-03) claims it, and `brickDamage.ts` was otherwise last touched by `1306999` (phase B, explosive bricks), well before phase 09. The most likely explanation is that a pre-existing working-tree modification in the main checkout was swept into that chore commit.

The change itself is a **recursion → explicit-stack refactor of `applyBrickHpDamage`**, inlining `explodeAtCell` because the worklets Babel plugin cannot resolve two mutually-calling worklets ("whichever is declared second is still `undefined` when the first one's `__closure` is built").

**I did not revert it**, deliberately:

- It is a worklet-correctness fix. Reverting it would plausibly reintroduce a UI-runtime `undefined is not a function` crash on explosive cascades — a Rule 4 architectural call, not an executor auto-fix, and outside this plan's scope boundary.
- Its behavior is covered and green: `tests/physics.explosive.test.ts` plus golden-replay and hash-canonical all pass, and the full suite is at the exact stated baseline. So SC-5's *intent* ("hashWorld and core simulation are untouched" / byte-identical) holds.
- What fails is SC-5's *letter* ("`src/core/**` has zero changed lines across the whole phase"), and it fails because of a bookkeeping commit, not because a phase-09 plan reached into core.

**This needs a human decision at phase close:** either accept the change as pre-existing work that was mis-attributed to phase 09, or split it out into its own commit/phase so the SC-5 ledger is honest.

## Human Checkpoint: PENDING

**Task 3 (`checkpoint:human-verify`, gate `blocking`) has NOT been performed.** It cannot be — it requires a simulator or device, and the executor must not fake it. Its automated regression companion IS green (`tests/telemetry.reduce-run-events.test.ts` + `tests/storage.progress-v4.test.ts`, 44 passed).

Two behaviors await a human, both from 09-VALIDATION.md's Manual-Only Verifications table:

**1. Abandoned-run flush on exit-to-Menu (N-STAT-01 / D-02)**
Launch on a simulator or device. Start a level, break several bricks, catch at least one power-up, then **Pause → Menu**. Re-enter the same level and inspect the persisted state (`store.getSnapshot()` under `__DEV__`, or a debugger). Expect **exactly one** `abandoned` entry appended to `telemetry.recentRuns`, with `bricksBroken > 0` and a `pickup*` count matching what you caught. Then repeat using the **Android hardware back button** from mid-run specifically — it must also record exactly one abandoned run. Not zero, not two.

**2. Wall clock excludes pause (N-STAT-01 / D-09)**
Start a level. Play ~30s, Pause and wait ~30s, Resume, play ~30s more, then lose or win. The recorded `wallClockMs` should read **≈60s (±5s), not ≈90s**. `ticksPlayed` reflects only simulated time and will differ from both readings — that is expected per D-09, not a bug.

**Resume signal:** "approved" if both match, otherwise describe what you observed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

All automated work for phase 09 is complete: the runtime reducer (09-01), the v4 store and its hydration fixes (09-02 / 09-03), and this wiring layer now form a closed path from event ring to persisted blob. `npm test`, `npm run typecheck`, and `npm run lint` are all clean at 81 files / 444 tests / 0 todo.

Two things gate declaring the phase done:

1. **The Task 3 human checkpoint above** — abandon-flush and wall-clock-excludes-pause are the phase's only unverified behaviors.
2. **The `src/core/rules/brickDamage.ts` attribution question** under Issues Encountered.

Downstream, 13-achievements can now read `largestCascade` and 14-stats-screen can read the lifetime aggregates from real data rather than zeros.

## Self-Check: PASSED

- `app/_components/PlayingHost.tsx` — FOUND on disk
- `.planning/phases/09-run-telemetry-storage-v4/09-04-SUMMARY.md` — FOUND on disk
- Commit `9e97167` (feat, Task 1) — FOUND in history
- Commit `dfaf49f` (docs, this SUMMARY) — FOUND in history
- Commit count from `plan_head_before` `036b879` to HEAD — **3**, matching `actuals.commits`
- Task 1 acceptance criteria: `handleMenuPress` occurrences = 4 (≥4 required); `onMenu={onMenu}` occurrences = 0; `runStartedAtRef.current = Date.now()` occurrences = 5 (≥4 required); `mode: 'campaign'` present inside `store.recordRunEnd`; typecheck 0; lint 0 — all PASS
- Task 2 acceptance criteria: working-tree core diff empty; golden-replay + hash-canonical 8/8; `eslint src/core src/runtime` 0; `npm test` 81 files / 444 tests / 0 todo; typecheck 0 — all PASS
- Task 3 acceptance criteria: **NOT MET — awaiting human**. Its automated companion (telemetry + storage suites, 44 passed) is green; the two manual checks are unperformed by design.

---
*Phase: 09-run-telemetry-storage-v4*
*Completed: 2026-09-25*
