---
phase: 09-run-telemetry-storage-v4
plan: 02
subsystem: database
tags: [storage, migration, telemetry, asyncstorage, fail-soft, versioning]

# Dependency graph
requires:
  - phase: 09-00
    provides: tests/storage.progress-v4.test.ts it.todo checklist + buildV3Fixture() pinned v3 fixture
  - phase: post-mvp/C2-progress-storage
    provides: ProgressBlob v3 schema, fail-soft parse contract, v1/v2 migrate chain, mergeHighWatermark
provides:
  - "ProgressBlob v4 (telemetry sub-object) with PROGRESS_KEY '@nbb/progress/v4' / PROGRESS_VERSION 4"
  - "TelemetryBlob / TelemetryAggregate / RunLogEntry / RunStatsInput / GameMode / RunOutcome / RECENT_RUNS_BOUND"
  - "parseProgressResult (v4) whose telemetry validation is independent of the progress fields (SC-4)"
  - "migrateOrDefault(v4,v3,v2,v1) extending the untouched v3/v2/v1 chain via the pure v3ToV4"
  - "src/services/storage/telemetry.ts — mergeRunIntoTelemetry / mergeTelemetryBlobs / cloneTelemetryBlob"
  - "The v3-active functions preserved verbatim as parseProgressV3Result / migrateOrDefaultV3 / mergeHighWatermarkV3 / defaultProgressBlobV3 / PROGRESS_KEY_V3"
affects: [09-03 store round-trip, 09-04 PlayingHost wiring, 13-achievements, 14-statistics-screen]

actuals:
  tokens: 17965
  tasks: 3
  commits: 5
plan_head_before: cfed57a9af34eab91a4d081ea501d63e4faab667

tech-stack:
  added: []
  patterns:
    - "Version bump by rename, not rewrite: the previously-bare v3 functions keep their exact bodies under *V3 names and the new bare names carry the active version — mirrors the existing v2→v3 precedent"
    - "Sub-object-independent fail-soft parse: sanitizeTelemetry degrades telemetry alone and can never return status 'corrupt' for the enclosing blob"
    - "Ring-buffer bound enforced on write AND on read — a tampered blob cannot grow recentRuns past RECENT_RUNS_BOUND"

key-files:
  created:
    - src/services/storage/telemetry.ts
  modified:
    - src/services/storage/types.ts
    - src/services/storage/parseBlob.ts
    - src/services/storage/migrateProgress.ts
    - src/services/storage/watermark.ts
    - src/services/storage/index.ts
    - src/services/storage/memoryStore.ts
    - src/services/storage/asyncStorageStore.ts
    - app/_components/PlayingHost.tsx
    - tests/storage.progress-v4.test.ts
    - tests/storage.progress-v3.test.ts
    - tests/storage.progress-v2.test.ts
    - tests/ui/SelectScreen.test.tsx
    - tests/ui/GameHost.test.tsx

key-decisions:
  - "RECENT_RUNS_BOUND = 50: ~120 bytes/entry × 50 ≈ 6KB against the ~2MB Android CursorWindow practical ceiling — three orders of magnitude of headroom, and a round number in the tens per CONTEXT discretion"
  - "The v4 parser reuses the private sanitizeProgressV3 helper (not the v3-gated parseProgressV3Result) for the four shared fields, so the E2 ladder heal stays single-sourced while the version gate differs"
  - "Telemetry counters are sanitized per-field (bad value → 0) rather than whole-sub-object-nuked, so PARTIAL telemetry keeps everything it does have — roadmap SC-4 says 'corrupt or partial'"
  - "Rule 3 deviation: memoryStore/asyncStorageStore/PlayingHost (nominally Plan 03/04 scope) were updated in this plan because the rename breaks their typecheck immediately, and whole-project typecheck is a Task 3 acceptance criterion"
  - "recordRunEnd folds stats into telemetry in the same commit that makes stats a required argument, rather than accepting and silently dropping it"

patterns-established:
  - "Legacy-suffixed migrate sources: every superseded version keeps its key const (PROGRESS_KEY_V2, PROGRESS_KEY_V3) and its parse/migrate/merge functions, never deleted"
  - "Wave-0 it.todo strings are converted to real assertions by the plan that implements the module they describe, leaving store-level todos for the store-level plan"

requirements-completed: [N-STAT-01, N-STAT-02]

coverage:
  - id: D1
    description: "ProgressBlob v4 schema + defaults: PROGRESS_KEY '@nbb/progress/v4', PROGRESS_VERSION 4, telemetry sub-object, and PROGRESS_KEY_V3 preserved as a legacy migrate-on-read source"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#PROGRESS_KEY / VERSION (v4) > PROGRESS_KEY is @nbb/progress/v4 and PROGRESS_VERSION is 4"
        status: pass
      - kind: other
        ref: "npm run typecheck (whole project, exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseProgressResult (v4) is fail-soft and validates telemetry INDEPENDENTLY — corrupt or partial telemetry degrades telemetry alone and never wipes unlocked/bestByLevel/bestScore (roadmap SC-4 / Pitfall 4)"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#corrupt telemetry sub-object alone degrades ONLY telemetry to defaultTelemetryBlob()"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#partial telemetry keeps the fields it does have and defaults only the missing/invalid ones"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#structurally corrupt top-level JSON degrades the whole blob to defaults and never throws"
        status: pass
    human_judgment: false
  - id: D3
    description: "Migrate chain extends v3→v4 losslessly and the untouched v2/v1 links still run when v4 and v3 are absent or corrupt (SC-3)"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#absent/corrupt v4 + valid v3 (buildV3Fixture) heals into v4 losing zero unlocked/bestByLevel/bestScore entries"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#absent v4 and v3 falls back to the existing v2/v1 chain unchanged"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#corrupt v4 does not prevent the v3 fallback from running"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v3.test.ts + tests/storage.progress-v2.test.ts (the C2 chain, unchanged behavior under *V3 names)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Telemetry merge helpers: cumulative fields sum, *Ever fields max, bestComboEver and longestRallyEver stay distinct (D-10), byMode keys union on merge"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeRunIntoTelemetry sums cumulative fields and maxes the *Ever fields, in lifetime and byMode alike"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeTelemetryBlobs sums cumulative, maxes *Ever, unions byMode keys and bounds recentRuns by timestamp"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeHighWatermark (v4) never lowers progress watermarks and merges telemetry"
        status: pass
    human_judgment: false
  - id: D5
    description: "recentRuns is a bounded ring: never exceeds RECENT_RUNS_BOUND (50), oldest evicted first, entries carry exactly the six D-05 fields with no stats leakage"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#recentRuns never exceeds RECENT_RUNS_BOUND entries; oldest is evicted first (FIFO)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#each entry is the small shape: mode, levelId, outcome, score, ticks, timestamp"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every consumer of the renamed/bumped identifiers found by the whole-repo grep compiles and passes against the v4 shape — both storage suites, both UI suites, both stores, and the PlayingHost call site"
    requirement: N-STAT-02
    verification:
      - kind: other
        ref: "npm run typecheck exit 0; npm run lint exit 0"
        status: pass
      - kind: integration
        ref: "npm test — 80 test files passed / 414 tests passed, 1 skipped file / 22 todo, all assert:* scripts OK"
        status: pass
    human_judgment: false
  - id: D7
    description: "End-to-end durable v4 persistence through a real AsyncStorage round-trip (write → new store instance → identical aggregates)"
    verification: []
    human_judgment: true
    rationale: "This plan ships the type/parse/migrate/watermark/telemetry layer only. The store-level round-trip (SC-2) is Plan 03's deliverable and its it.todo cases are deliberately left un-converted here; a human or Plan 03 must confirm the persisted round-trip on device."

# Metrics
duration: 15 min
completed: 2026-09-25
status: complete
---

# Phase 9 Plan 02: Storage v4 Schema, Fail-Soft Parse & Telemetry Merge Summary

**ProgressBlob v4 with a mode-aware telemetry sub-object, a telemetry-independent fail-soft parser, and a v3→v4 migrate link that reuses the C2 chain verbatim under legacy `*V3` names.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-25T07:20:00Z
- **Completed:** 2026-09-25T07:35:00Z
- **Tasks:** 3
- **Files modified:** 14 (1 created, 13 modified)

## Accomplishments

- `ProgressBlob` is now v4 under `@nbb/progress/v4`, adding `telemetry` (lifetime aggregate, per-`(mode, levelId)` aggregate, bounded `recentRuns` ring) without changing the meaning of `unlocked` / `bestByLevel` / `bestScore` / `updatedAt`.
- `parseProgressResult` validates `telemetry` through a dedicated `sanitizeTelemetry` that degrades the sub-object alone: a corrupt *or partial* telemetry blob never returns `status: 'corrupt'` and never wipes sibling progress (roadmap SC-4 / research Pitfall 4). Asserted by three dedicated tests.
- The migrate chain gained exactly one link: `migrateOrDefault(v4, v3, v2, v1)` tries the v4 parser, else lifts `migrateOrDefaultV3(v3, v2, v1)` — the untouched C2 chain — through the pure `v3ToV4`. Verified lossless against Wave 0's pinned `buildV3Fixture()`.
- New `src/services/storage/telemetry.ts` provides the three pure merge helpers Plan 03 consumes, with sum-vs-max semantics per D-07/D-08/D-10 and `bestComboEver` / `longestRallyEver` kept as distinct fields.
- `RECENT_RUNS_BOUND = 50` is enforced on write (`mergeRunIntoTelemetry`, `mergeTelemetryBlobs`) **and** on read (`sanitizeTelemetry`), so a tampered blob cannot grow the ring.
- The rename's full blast radius is closed: both storage suites, both UI suites, both stores and the `PlayingHost` call site compile and pass. Whole-project `npm run typecheck` and `npm run lint` are clean for the first time this phase.

## Task Commits

1. **Task 1 (RED): v4 key/version + fail-soft parse checklist** — `0dd715b` (test)
2. **Task 1 (GREEN): v4 schema + telemetry-independent parse** — `ddbbec3` (feat)
3. **Task 2 (RED): migrate chain, recentRuns ring, merge semantics** — `f384aff` (test)
4. **Task 2 (GREEN): v3→v4 link, v4 watermark merge, telemetry.ts** — `e1cbbc3` (feat)
5. **Task 3: every renamed-identifier consumer synced to v4** — `d5995c3` (fix)

_Note: TDD tasks carry a RED test commit followed by the implementation commit._

## Files Created/Modified

- `src/services/storage/telemetry.ts` — **new.** Pure merge helpers: `cloneTelemetryBlob`, `mergeRunIntoTelemetry` (fold one run into lifetime + `byMode[mode][levelId]`, append the six-field log entry, re-bound the ring), `mergeTelemetryBlobs` (sum cumulative, max `*Ever`, union `byMode` keys, sort `recentRuns` by timestamp then bound).
- `src/services/storage/types.ts` — v4 `ProgressBlob`; `TelemetryBlob` / `TelemetryAggregate` / `RunLogEntry` / `RunStatsInput` / `GameMode` / `RunOutcome` / `RECENT_RUNS_BOUND`; `defaultTelemetryBlob` / `defaultTelemetryAggregate` / `defaultRunStatsInput`; v3 preserved as `ProgressBlobV3` / `defaultProgressBlobV3` / `PROGRESS_KEY_V3`; `recordRunEnd` args gain required `mode` + `stats` and a widened `outcome`. Carries the Phase-13 cascade-attribution schema comment on `largestCascadeEver`.
- `src/services/storage/parseBlob.ts` — `parseProgressV3Result` (verbatim v3 body, renamed) plus the new v4 `parseProgressResult` and the private `safeCounter` / `sanitizeAggregate` / `sanitizeRunLogEntry` / `sanitizeAggregateMap` / `sanitizeTelemetry` helpers.
- `src/services/storage/migrateProgress.ts` — `migrateOrDefaultV3` (unchanged behavior), pure `v3ToV4`, new 4-arg `migrateOrDefault`.
- `src/services/storage/watermark.ts` — `mergeHighWatermarkV3` (unchanged body) plus a v4 `mergeHighWatermark` that delegates the four-field max merge to it and merges telemetry separately.
- `src/services/storage/index.ts` — barrel exports for every new and renamed identifier.
- `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts` — v4 `cloneBlob`, v4-then-v3-then-v2-then-v1 hydration, `recordRunEnd` accepts and folds `mode`/`stats`.
- `app/_components/PlayingHost.tsx` — single call site passes `mode: 'campaign'` and a placeholder `defaultRunStatsInput()`.
- `tests/storage.progress-v4.test.ts` — 10 of Wave 0's 14 `it.todo` cases converted to real tests (14 passing, 4 store-level todos left for Plan 03).
- `tests/storage.progress-v3.test.ts`, `tests/storage.progress-v2.test.ts`, `tests/ui/SelectScreen.test.tsx`, `tests/ui/GameHost.test.tsx` — synced to the renamed identifiers / v4 literal shape.

## Decisions Made

- **Ring bound = 50.** ~120 bytes/entry × 50 ≈ 6KB versus the ~2MB Android CursorWindow practical ceiling (research A3). Enforcing it on read as well as write costs nothing and closes T-09-06 against a tampered blob.
- **Per-field telemetry sanitisation, not all-or-nothing.** Roadmap SC-4 says "corrupt **or partial**", so an unparseable single counter degrades to `0` while its siblings survive; only a structurally non-object `telemetry` falls back to `defaultTelemetryBlob()` wholesale.
- **The v4 parser reuses `sanitizeProgressV3`,** the private sanitiser, rather than duplicating `sanitizeUnlocked`/`sanitizeLevelBest` call sequences. The plan's ban was on routing through `parseProgressV3Result` (which gates on `v === 3`); the private helper keeps the E2 ladder heal single-sourced.
- **`recordRunEnd` folds `stats` immediately.** Making `stats` required while ignoring it would have shipped a silent data-loss path; the fold is one call per store and removes the stub.
- **Wave-0 todos were converted only where this plan owns the module.** The four store-level todos (`recordRunEnd (v4, mode-aware)`, SC-2 app-kill round-trip) remain `it.todo` for Plan 03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `memoryStore.ts` / `asyncStorageStore.ts` broke typecheck on the rename**

- **Found during:** Task 3 (whole-project typecheck)
- **Issue:** The plan scoped both files to Plan 03, but the v4 bump breaks them immediately and unavoidably: `cloneBlob` returns a `v: 3` literal against a `v: 4` type, `migrateOrDefault` is now 4-arg, and both `recordRunEnd` implementations are incompatible with the widened interface. Task 3's own acceptance criterion requires whole-project `npm run typecheck` to exit 0, so the break could not be deferred.
- **Fix:** Minimal v4 adaptation — `cloneBlob` emits `v: 4` with a cloned telemetry blob; hydration reads `PROGRESS_KEY` (v4) then falls back through `PROGRESS_KEY_V3` into the 4-arg `migrateOrDefault`, with the migrate-through write now also firing for a v3 source (otherwise an existing v3 player's data would never be rewritten under the v4 key); `recordRunEnd` takes `mode`/`stats` and folds the run via `mergeRunIntoTelemetry` instead of dropping the new argument.
- **Files modified:** src/services/storage/memoryStore.ts, src/services/storage/asyncStorageStore.ts
- **Verification:** `npm run typecheck` exit 0; `npm test` green (414 passing)
- **Committed in:** `d5995c3`

**2. [Rule 3 - Blocking] `app/_components/PlayingHost.tsx` broke typecheck on the required `mode` / `stats` args**

- **Found during:** Task 3 (whole-project typecheck)
- **Issue:** The plan's consumer table assigns this file to Plan 04 while simultaneously requiring whole-project typecheck to pass at the end of Task 3 — internally inconsistent. The single `store.recordRunEnd({...})` call site is missing the two newly-required properties.
- **Fix:** The call site passes `mode: 'campaign'` (the only mode this phase writes, D-04) and `stats: defaultRunStatsInput()` — an all-zero placeholder, with a comment naming Plan 04 as the owner of the real N-STAT-01 reducer output. A new `defaultRunStatsInput()` helper was added to `types.ts` for this and for test ergonomics. No data is lost by the placeholder: nothing produces real per-run stats until Plan 01/04 land.
- **Files modified:** app/_components/PlayingHost.tsx, src/services/storage/types.ts
- **Verification:** `npm run typecheck` exit 0; `tests/ui/PlayingHost.*` suites pass
- **Committed in:** `d5995c3` (types.ts helper in `ddbbec3`)

**3. [Rule 2 - Missing Critical] Wave-0 `it.todo` cases for this plan's own modules were converted to real tests**

- **Found during:** Task 1 / Task 2 (both tasks carry `tdd="true"`, but the plan assigned every v4 assertion to Plan 03's file)
- **Issue:** Task 3 deletes the `PROGRESS_KEY / VERSION` and `recordRunEnd` blocks from `tests/storage.progress-v3.test.ts`, and the orchestrator brief requires a test asserting the SC-4 "corrupt **or partial**" contract. Leaving both un-covered until Plan 03 would have shipped v4 parse/migrate/merge with zero assertions and a net coverage loss.
- **Fix:** Converted 10 of the 14 Wave-0 `it.todo` cases — the ones describing modules this plan implements — into real RED-then-GREEN tests, and added a merge-semantics block asserting sum-vs-max and the `bestComboEver`/`longestRallyEver` distinction (CONTEXT D-10). The four store-level todos are untouched.
- **Files modified:** tests/storage.progress-v4.test.ts
- **Verification:** `npx vitest run tests/storage.progress-v4.test.ts` — 14 passed, 4 todo
- **Committed in:** `0dd715b`, `f384aff` (RED) and `ddbbec3`, `e1cbbc3` (GREEN)

**4. [Rule 3 - Blocking] Barrel exports landed with the tasks that introduced them, not all in Task 3**

- **Found during:** Task 1
- **Issue:** The plan put every barrel export in Task 3, but Tasks 1 and 2 verify through tests that import from the barrel — so their GREEN step was unreachable without it.
- **Fix:** `index.ts` gained the type-layer exports in the Task 1 commit and the migrate/watermark/telemetry exports in the Task 2 commit. The final export surface is exactly what Task 3 specifies.
- **Files modified:** src/services/storage/index.ts
- **Verification:** barrel re-read against the Task 3 export list — all identifiers present
- **Committed in:** `ddbbec3`, `e1cbbc3`

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 missing-critical)
**Impact on plan:** All four were forced by the plan's own Task 3 acceptance criterion (whole-project typecheck) colliding with its file-scoping table. No architectural change, no new dependency, no scope creep beyond the files the rename provably breaks. The two files nominally owned by Plan 03 received the minimum adaptation needed to compile plus the one-line telemetry fold that avoids a silent data-loss stub; Plan 03's actual deliverable (the persisted v4 round-trip and its store-level tests) is untouched and still open.

## Known Stubs

| File | Line | Stub | Resolved by |
|------|------|------|-------------|
| `app/_components/PlayingHost.tsx` | ~467 | `stats: defaultRunStatsInput()` — an all-zero placeholder passed to `recordRunEnd`; real per-run counters do not exist until the N-STAT-01 reducer lands | Plan 09-04 (PlayingHost wiring), which owns this file |

This stub records zero telemetry for campaign runs until Plan 04 wires the reducer. It is not a data-loss regression — no component produces real run counters yet (Plan 01 builds the reducer, Plan 04 connects it). `mode: 'campaign'` is already correct and needs no change.

Four `it.todo` cases remain in `tests/storage.progress-v4.test.ts` (`recordRunEnd (v4, mode-aware)` ×3 and the SC-2 app-kill round-trip ×1). They are Plan 03's checklist by design, not skipped coverage for this plan.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or trust-boundary schema change beyond the v4 blob already covered by the plan's threat register (T-09-04 through T-09-07, T-09-13, all mitigated or accepted as planned).

## Issues Encountered

- **The worktree forked from a stale base**, ~79 commits behind the orchestrator's `main` HEAD and predating the entire `09-run-telemetry-storage-v4` phase directory. Resolved exactly as the brief prescribes: confirmed zero local commits and a clean tree, then `git merge --ff-only cfed57a9af34eab91a4d081ea501d63e4faab667`. No rewrite, no reset, no clean.
- **`npm test` reports one fewer skipped file than the Wave-0 baseline** (80 passed / 1 skipped vs 79 / 2). This is not a regression: vitest counts an all-`it.todo` file as skipped, and `tests/storage.progress-v4.test.ts` now has real passing tests. `tests/telemetry.reduce-run-events.test.ts` remains the one all-todo file, pending Plan 01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for Plan 03.** The type/parse/migrate/watermark/telemetry layer is complete and barrel-exported; `mergeRunIntoTelemetry` / `mergeTelemetryBlobs` / `cloneTelemetryBlob` are the entry points it was specified to call, and `buildV3Fixture()` is already consumed by a passing lossless-migration test it can extend.
- **Note for Plan 03:** the two store files are already v4-shaped and already fold telemetry on `recordRunEnd`. Plan 03's remaining work is the persisted round-trip (SC-2), the store-level `recordRunEnd` cases (win/lose/abandoned semantics against the v4 blob), and the four `it.todo`s left in the v4 suite.
- **Note for Plan 04:** replace `defaultRunStatsInput()` at `PlayingHost.tsx` with the real reducer output. The call site's `mode`, `outcome` and blob handling already satisfy the v4 contract.
- **Concern (design, not a defect):** `mergeTelemetryBlobs` **sums** lifetime counters between memory and disk, per this plan's locked semantics. That is correct for the hydrate-once flow the stores use today, but it would double-count if a future caller merged two blobs that share history. Plan 03 should confirm the store never re-merges an already-hydrated disk blob.

## Self-Check

- [x] `src/services/storage/telemetry.ts` exists on disk
- [x] Commits `0dd715b`, `ddbbec3`, `f384aff`, `e1cbbc3`, `d5995c3` all present in `git log`
- [x] `git diff --stat cfed57a..HEAD -- src/core` empty; no `src/runtime/**` file touched
- [x] No file deletions in the plan's diff (`git diff --diff-filter=D` empty)
- [x] `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` exit 0 (80 files / 414 tests passing, 22 todo)

## Self-Check: PASSED

---
*Phase: 09-run-telemetry-storage-v4*
*Completed: 2026-09-25*
