---
phase: 09-run-telemetry-storage-v4
plan: 03
subsystem: database
tags: [storage, telemetry, asyncstorage, migration, hydration, concurrency, vitest]

# Dependency graph
requires:
  - phase: 09-00
    provides: tests/storage.progress-v4.test.ts it.todo checklist + buildV3Fixture() pinned v3 fixture
  - phase: 09-02
    provides: ProgressBlob v4 schema, parseProgressResult (v4), migrateOrDefault(v4,v3,v2,v1), mergeHighWatermark (v4), telemetry.ts merge helpers — and, as a Rule 3 deviation, the v4 recordRunEnd/cloneBlob/ensureHydrated edits nominally scoped to this plan
provides:
  - "tests/storage.progress-v4.test.ts fully green with zero it.todo (25 cases)"
  - "First direct test coverage of the AsyncStorage-backed ProgressStore: v4-first hydrate chain, v3/v2/v1 fallback, legacy-key preservation, migrate-through-once write, recordRunEnd sync-return + persist"
  - "__createAsyncStorageProgressStoreForTests — injectable-storage seam making the hydrate/migrate/persist chain testable under Vitest"
  - "Single-flight ensureHydrated: overlapping first reads can no longer double-count summed telemetry"
  - "Cold-path recordRunEnd persists the union of disk history and the new run instead of truncating disk telemetry"
affects: [09-04 PlayingHost wiring, 13-achievements, 14-statistics-screen]

actuals:
  tokens: 6369
  tasks: 2
  commits: 4
plan_head_before: 3f2056346481cbbe5f970145e95494d17da15c6d

tech-stack:
  added: []
  patterns:
    - "Injectable-dependency test seam (__create*ForTests) for modules whose production factory probes a native bridge and silently degrades under the test runner"
    - "Single-flight async initialization: memoise the in-flight promise whenever the completion flag can only flip after the first await AND the guarded work is non-idempotent"
    - "Sum-merged state must be hydrated exactly once; max-merged state tolerates re-merge. Version bumps that introduce summed fields must re-audit every merge call site."

key-files:
  created: []
  modified:
    - src/services/storage/asyncStorageStore.ts
    - tests/storage.progress-v4.test.ts

key-decisions:
  - "Plan Task 1 was already satisfied verbatim by 09-02's Rule 3 deviation; rather than redo it, it was verified by its own acceptance greps AND newly covered by six AsyncStorage-level tests that previously did not exist"
  - "Exported __createAsyncStorageProgressStoreForTests rather than following the plan's memoryStore-only workaround for SC-2: createDefaultProgressStore probes the native bridge and falls back to memory under Vitest, so the hydrate/migrate/persist chain had zero coverage. The SC-2 must-have asks for a store re-instantiated from a persisted v4 JSON string; testing the real AsyncStorage path satisfies it honestly. The memory-level round-trip from the plan was ALSO written, so both levels are covered."
  - "The mergeTelemetryBlobs double-count concern is REAL and was fixed, not argued away — a failing test was committed first as evidence (3be2d7c) before the fix (a864f5c)"
  - "Cold-path recordRunEnd now writes late rather than early: an app kill inside the hydration window loses one just-ended run instead of every run ever played"
  - "Test-only export lives on the module (imported directly by the test, as tests/storage.personal-best.test.ts already does) and is deliberately NOT re-exported from the storage barrel — production code must not be able to reach it"

patterns-established:
  - "RED-before-GREEN for deviation fixes: a discovered bug gets its failing test committed as standalone evidence before the fix lands, so the regression is provable from history alone"
  - "Concurrency reachability is argued from real call sites (GameHost title getBest() + SelectScreen getSnapshot() on the F-26 singleton), not asserted abstractly"

requirements-completed: [N-STAT-01, N-STAT-02]

coverage:
  - id: D1
    description: "recordRunEnd (v4, mode-aware): win/lose keep the v3 star + unlock gate; abandoned merges score and stats but never awards stars or advances the unlock ladder, while still counting in telemetry (research Assumption A1)"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#recordRunEnd (v4, mode-aware, D-03/D-04) > win/lose behave exactly as v3 (stars/unlock win-gated); abandoned outcome merges score/stats but never touches stars/unlock"
        status: pass
    human_judgment: false
  - id: D2
    description: "Per-run stats fold into BOTH telemetry.lifetime and telemetry.byMode.campaign[levelId]; the blob returned by recordRunEnd is a deep clone that cannot mutate store state"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#recordRunEnd (v4, mode-aware, D-03/D-04) > stats aggregate into both telemetry.lifetime and telemetry.byMode.campaign[levelId]"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sum-vs-max aggregation at the store level: every pickup type and livesLost/bricksBroken/ticks/wallClock SUM, while bestComboEver / longestRallyEver / largestCascadeEver take a running max that a lower later run cannot regress — and combo stays a DISTINCT metric from rally (D-10)"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#recordRunEnd (v4, mode-aware, D-03/D-04) > per-pickup-type and cascade/rally fields aggregate with the correct sum-vs-max semantics (D-07/D-08/D-10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "SC-2 app kill: lifetime and per-(mode, levelId) aggregates survive snapshot -> JSON.stringify -> parseProgressResult -> re-instantiated store, and the relaunched store keeps accumulating on top of the restored counters rather than starting a fresh tally"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#lifetime + per-level aggregates survive an app kill (SC-2) > re-instantiating a store from a previously persisted v4 JSON string reproduces identical lifetime + byMode aggregates"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > recordRunEnd returns the merged blob synchronously and persists it to the v4 key"
        status: pass
    human_judgment: false
  - id: D5
    description: "AsyncStorage hydrate chain reads @nbb/progress/v4 first and falls back v4 -> v3 -> v2 -> v1, writing the healed blob through to the v4 key exactly once while leaving every legacy key on disk (never deleted)"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > reads the v4 key first and never consults the legacy keys when it parses"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > absent v4 migrates through v3 and writes the healed blob to the v4 key, leaving every legacy key on disk"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > corrupt v4 still falls through to the v2 then v1 links"
        status: pass
    human_judgment: false
  - id: D6
    description: "mergeTelemetryBlobs can no longer double-count: hydration is single-flight, so overlapping first reads share one merge, and repeated reads of an already-hydrated store never grow the counters"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > overlapping first reads hydrate once — mergeTelemetryBlobs never double-counts the persisted blob"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > re-reading an already-hydrated store is idempotent — repeated reads never grow the counters"
        status: pass
    human_judgment: false
  - id: D7
    description: "A run recorded before hydration completes persists the UNION of disk history and the new run, instead of overwriting disk telemetry with a blob that never saw it"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#AsyncStorage-backed store: v4 hydrate chain (N-STAT-02) > a run recorded before hydration finishes still persists the UNION of disk history and the new run"
        status: pass
    human_judgment: false
  - id: D8
    description: "Whole-project gates stay clean and the phase boundary holds: src/core, src/runtime and app/ are untouched by this plan"
    verification:
      - kind: other
        ref: "npm test (81 files / 444 tests passing, 0 todo) + npm run typecheck + npm run lint, all exit 0"
        status: pass
      - kind: other
        ref: "git diff --stat 3f20563..HEAD -- src/core src/runtime app  (empty)"
        status: pass
    human_judgment: false

# Metrics
duration: 11 min
completed: 2026-09-25
status: complete
---

# Phase 09 Plan 03: Store Round-Trip + v4 Telemetry Persistence Summary

**Closed out the v4 store contract — and found that the store's sum-merged telemetry could be double-counted by concurrent hydration and silently truncated by a cold-path write, both now proven by failing tests and fixed.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-25T07:38:00Z
- **Completed:** 2026-09-25T07:49:00Z
- **Tasks:** 2 (Task 1 verified-as-already-done, Task 2 executed) + 2 deviation fixes
- **Files modified:** 2

## Accomplishments

- **Zero `it.todo` remain in `tests/storage.progress-v4.test.ts`** — the file went from 18 passing / 4 todo to 25 passing / 0 todo. The four Wave-0 checklist strings are now real assertions covering the win/lose/abandoned outcome matrix, lifetime-vs-byMode fan-out, per-pickup sum-vs-max semantics, and the SC-2 app-kill round trip.
- **The AsyncStorage-backed store now has direct test coverage for the first time.** `createDefaultProgressStore` probes the native bridge and silently falls back to the memory store under Vitest, so every previous "storage" test actually exercised `memoryStore`. A new `__createAsyncStorageProgressStoreForTests` seam plus an in-memory storage double cover the real v4→v3→v2→v1 hydrate chain, legacy-key preservation, migrate-through-once write, and the `recordRunEnd` sync-return/void-persist contract.
- **Resolved the `mergeTelemetryBlobs` double-count question the orchestrator flagged — it was real.** `ensureHydrated` only flipped `hydrated` after its first `await`, so two overlapping first reads both ran the body and both merged the same disk blob. Because telemetry SUMS (unlike the max-merged v3 fields), `runsPlayed` read 10 instead of 5 and the next `persist` wrote the inflated value back permanently. Fixed with single-flight hydration.
- **Found and fixed a second, worse instance of the same hazard.** On the cold path `recordRunEnd` persisted `memory` before hydration had merged the disk blob into it — and because the `getItem` promise was created first, hydration resolved *before* the `setItem` landed. In-memory state ended up correct while disk was overwritten with a blob missing every prior run: the regression test measured persisted `runsPlayed: 1` against 6 expected. Five runs of lifetime counters, destroyed unrecoverably.

## Task Commits

1. **Task 2: Fill tests/storage.progress-v4.test.ts to GREEN** — `61069a7` (test)
2. **Deviation 1 (Rule 1): concurrent-hydration double-count** — `3be2d7c` (test, RED evidence) → `a864f5c` (fix, GREEN)
3. **Deviation 2 (Rule 1): cold-path persist truncates disk telemetry** — `983e129` (fix, test + fix)

**Task 1** produced no commit — see Deviations below.

_Note: the two deviation fixes follow RED-before-GREEN so each regression is provable from history alone._

## Files Created/Modified

- `src/services/storage/asyncStorageStore.ts` — split `ensureHydrated` into a memoising sync wrapper over `hydrateOnce`; made the cold-path `recordRunEnd` write chain behind hydration; exported `AsyncStorageLike` and the `__createAsyncStorageProgressStoreForTests` seam.
- `tests/storage.progress-v4.test.ts` — replaced the last 4 `it.todo` with real assertions and added a 7-case `AsyncStorage-backed store: v4 hydrate chain` describe block (+491 lines).

## Decisions Made

- **Task 1 was verified, not redone.** Plan 09-02 had already applied the whole of Task 1 as its own Rule 3 deviation (the v4 rename broke `memoryStore`/`asyncStorageStore` typecheck immediately). All six of Task 1's acceptance criteria were re-run and pass against the tree as-inherited; rather than rewrite satisfied code, the work was locked down with tests that did not previously exist.
- **Deviated from the plan's SC-2 approach.** Task 2's `<action>` instructed driving the app-kill test at the `memoryStore` level because `createAsyncStorageProgressStoreFrom` is not exported. That workaround leaves the actual persistence path untested, while the plan's own must-have truth asks for aggregates surviving a store "re-instantiated from a persisted v4 JSON string". Exporting a test-only seam satisfies the truth honestly — and is what made both telemetry bugs findable. The plan's memory-level round trip was written too, so both levels are covered.
- **The test seam is not re-exported from the storage barrel.** It is imported directly from the module by the test, matching `tests/storage.personal-best.test.ts`, so production code cannot reach it.
- **Cold-path writes are now deliberately late.** Waiting for hydration means an app kill inside that (millisecond) window loses the one just-ended run. Persisting immediately would instead destroy the entire lifetime history. The asymmetry decides it.

## Deviations from Plan

### Verified-as-already-done

**0. [Scope] Task 1 was delivered by Plan 09-02**
- **Found during:** Task 1 (`read_first` gate)
- **Issue:** `memoryStore.ts` and `asyncStorageStore.ts` already carried the complete v4 `recordRunEnd`, the `cloneTelemetryBlob` deep copy, the `v: 4` clone literal, the `PROGRESS_KEY_V3` read, the four-argument `migrateOrDefault`, and the `fromV3` migrate-through guard. 09-02's SUMMARY documents this as its own Rule 3 deviation.
- **Action:** Did not redo. Re-ran all six of Task 1's acceptance criteria (all pass) and added six AsyncStorage-level tests that assert the behaviour rather than the code shape.
- **Verification:** `grep` criteria all match; `npm run typecheck` and `npm run lint` exit 0; coverage entries D5 and D4 above.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Concurrent hydration double-counts v4 telemetry**
- **Found during:** Deviation investigation requested by the orchestrator ("decide whether the `mergeTelemetryBlobs` sum is reachable through `recordRunEnd`/`getSnapshot`/`flush`")
- **Issue:** `ensureHydrated()` returns early only on `hydrated`, which is set *after* the first `await AsyncStorage.getItem(...)`. Two overlapping first calls therefore both execute the body and both call `mergeHighWatermark(memory, diskBlob)`. Its telemetry half (`mergeTelemetryBlobs`) SUMS lifetime and per-level counters, so the persisted blob is added to memory twice — and the next `persist` writes the inflated numbers back to disk, compounding on every subsequent fast cold start. The v3 fields are all max-merged, which is why a re-merge was harmless before this phase and is not now.
- **Reachability:** `GameHost`'s title-phase `store.getBest()` and `SelectScreen`'s mount `store.getSnapshot()` run against the same process singleton (F-26). Tapping Play before the first AsyncStorage read resolves puts both in flight. Test measured `runsPlayed` 5 → 10.
- **Fix:** Extracted the body as `hydrateOnce()` and made `ensureHydrated()` a synchronous wrapper that memoises the in-flight promise (`hydrating ??= hydrateOnce()`), so every caller awaits the same hydration. Safe to memoise without clearing: `hydrateOnce` wraps everything in `try/catch` and always leaves `hydrated` true, so it never rejects.
- **Files modified:** `src/services/storage/asyncStorageStore.ts`, `tests/storage.progress-v4.test.ts`
- **Verification:** `tests/storage.progress-v4.test.ts` case "overlapping first reads hydrate once" — committed failing at `3be2d7c`, passing at `a864f5c`. Plus an idempotence case for repeated reads.
- **Committed in:** `3be2d7c` (RED) + `a864f5c` (GREEN)

**2. [Rule 1 - Bug] Cold-path `recordRunEnd` overwrites disk telemetry with a pre-hydration blob**
- **Found during:** Follow-on audit of every `mergeHighWatermark`/`persist` ordering in the same function
- **Issue:** When `recordRunEnd` runs before hydration it kicks `void ensureHydrated()` and then immediately `void persist(memory)`. The `getItem` promise is created first, so hydration resolves before the `setItem` lands: in-memory state ends up correct (run + disk history) while disk is overwritten with a blob that never saw the history. Because telemetry sums rather than maxes, nothing recovers it. Test measured persisted `runsPlayed: 1` against 6 expected — five runs of lifetime counters destroyed.
- **Fix:** Capture `wasHydrated` at entry. The hydrated path (what the hosts actually hit) is unchanged. The cold path chains the write behind hydration (`void ensureHydrated().then(() => persist(memory))`) and persists the union. The synchronous return-before-persist contract (D-10 / F-26) is untouched.
- **Files modified:** `src/services/storage/asyncStorageStore.ts`, `tests/storage.progress-v4.test.ts`
- **Verification:** `tests/storage.progress-v4.test.ts` case "a run recorded before hydration finishes still persists the UNION of disk history and the new run" — confirmed failing before the fix, passing after.
- **Committed in:** `983e129`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs), 1 scope reconciliation (Task 1 pre-delivered by 09-02).
**Impact on plan:** No scope creep. Both fixes are inside `files_modified`, both are data-integrity bugs introduced by this phase's move from max-merged to sum-merged persisted state, and both are covered by regression tests. `src/core`, `src/runtime` and `app/` are untouched, as required.

## Verification Results

| Gate | Result |
|------|--------|
| `npx vitest run tests/storage.progress-v4.test.ts` | 25 passed, 0 todo |
| `npx vitest run tests/storage.progress-v4.test.ts tests/storage.progress-v3.test.ts` | pass |
| `npm test` (full suite) | 81 files / **444 tests passed**, 0 todo (baseline 81 / 433 + 4 todo) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `grep -c "it.todo(" tests/storage.progress-v4.test.ts` | **0** |
| `git diff --stat -- src/core` | empty |
| `git diff --stat -- src/runtime` | empty |
| `git diff --stat -- app` | empty |
| `.planning/STATE.md` / `ROADMAP.md` modified | no (orchestrator owns these) |

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `stats: defaultRunStatsInput()` (all-zero counters) | `app/_components/PlayingHost.tsx` | 473 | Deliberate placeholder left by Plan 09-02 so the tree typechecks. Real counter wiring is **Plan 09-04's** job and was explicitly out of scope here. Until 09-04 lands, every persisted run records zero bricks/pickups/rally — telemetry plumbing is correct but its input is not yet connected. |

No stubs were introduced by this plan.

## Issues Encountered

- **Worktree forked from a stale base.** HEAD was at `de74c1a`, 79 commits behind and predating the phase directory. Confirmed it was a strict ancestor of the orchestrator's `main` with zero local commits, then `git merge --ff-only 3f20563`. No destructive git used.
- **The plan's "before" picture was stale.** 09-02 had already landed Task 1 wholesale. Handled by reading current file state first (per the orchestrator's warning) rather than trusting the plan text.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 09-04 (PlayingHost wiring).** Both `ProgressStore` implementations accept and persist the full v4 `recordRunEnd` contract, the AsyncStorage hydrate chain covers v4→v3→v2→v1 with legacy keys preserved, and the persistence path is now covered by tests rather than assumed.

Two notes for 09-04:

1. **The `defaultRunStatsInput()` stub at `PlayingHost.tsx:473` is yours.** Swap it for real drained counters from `src/runtime/runStats.ts`. Nothing else in the storage layer needs to change.
2. **Keep awaiting a read before the first `recordRunEnd`.** `PlayingHost` already does (`getBestForLevel` on mount, line ~278). That keeps `recordRunEnd` on the hydrated path; the cold path is now correct but writes one hydration-latency later, so the awaited read remains the preferred ordering.

Phase-level: N-STAT-01 and N-STAT-02 are complete at the storage layer. The remaining phase work is the runtime→store handoff in 09-04.

---
*Phase: 09-run-telemetry-storage-v4*
*Completed: 2026-09-25*

## Self-Check: PASSED

- All claimed files exist on disk.
- All five commits (`61069a7`, `3be2d7c`, `a864f5c`, `983e129`, `9643053`) present on `worktree-agent-ac3d36082e3e4a53c`.
- Working tree clean; `commits: 4` measured via `git rev-list --count 3f20563..HEAD` before the SUMMARY commit.
