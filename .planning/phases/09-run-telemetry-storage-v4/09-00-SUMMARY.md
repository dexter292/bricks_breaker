---
phase: 09-run-telemetry-storage-v4
plan: 00
subsystem: testing
tags: [vitest, telemetry, storage, migration, scaffold, nyquist]

# Dependency graph
requires:
  - phase: post-mvp/C2-progress-storage
    provides: ProgressBlob v3 schema, PLAYABLE_LEVEL_ORDER barrel export, parseProgressResult/migrateOrDefault contract
  - phase: post-mvp/E2-balance
    provides: tests/helpers/balanceBot.ts — the headless stepRun harness the integration smoke mirrors
provides:
  - "tests/telemetry.reduce-run-events.test.ts — 18 it.todo cases enumerating every N-STAT-01 counter behavior"
  - "tests/storage.progress-v4.test.ts — 14 it.todo cases enumerating every N-STAT-02 migration/fail-soft/aggregation/ring-buffer behavior"
  - "buildV3Fixture() — the pinned, realistic v3 'existing player' blob shape for Plan 03's round-trip test"
  - "A written acceptance checklist that locks grid-adjacency cascade grouping as the algorithm Plan 01 must satisfy"
affects: [09-01 runStats reducer, 09-02 v4 schema/parse/migrate, 09-03 store round-trip, 09-04 PlayingHost wiring]

actuals:
  tokens: 1923
  tasks: 2
  commits: 2
plan_head_before: eb170750e707be7577312e7aa2c02301cf6d8e16

tech-stack:
  added: []
  patterns:
    - "Wave-0 it.todo scaffold (Phase 04 precedent): test file created before implementation, importing nothing that does not yet exist, so it is green-by-todo and the todo strings become the implementation checklist"
    - "Fixture builders exported from the scaffold file so later-wave plans consume a pinned shape instead of re-inventing one"

key-files:
  created:
    - tests/telemetry.reduce-run-events.test.ts
    - tests/storage.progress-v4.test.ts
  modified: []

key-decisions:
  - "Wrote the cascade it.todo cases against grid-adjacency grouping, not the substep-co-occurrence heuristic still quoted in 09-00-PLAN.md — the plan-check revision (09-CONTEXT notes_for_later_phases, 09-VALIDATION, 09-01-PLAN) rejected the heuristic as overcounting, and largestCascade feeds a Phase 13 achievement trigger where overcount is the harmful direction"
  - "Exported buildV3Fixture() instead of keeping it file-local: a local, uncalled helper raises an @typescript-eslint/no-unused-vars warning, which would dirty the phase's clean-lint baseline for the whole of Waves 1-3"
  - "Added two cascade it.todo cases beyond the plan's three (explicit non-merge regression + non-lattice singleton fallback) so Plan 01's narrow undercount-only fallback path is covered by the checklist"

patterns-established:
  - "Cascade attribution checklist: grouping is by 8-neighbor Chebyshev lattice adjacency, the same rule explodeAtCell uses; substep co-occurrence is explicitly named as the rejected alternative in the todo text so it cannot be re-introduced silently"

requirements-completed: [N-STAT-01, N-STAT-02]

coverage:
  - id: D1
    description: "tests/telemetry.reduce-run-events.test.ts exists, imports no not-yet-existing module, and names every N-STAT-01 counter behavior as an it.todo (18 cases)"
    requirement: N-STAT-01
    verification:
      - kind: unit
        ref: "npx vitest run tests/telemetry.reduce-run-events.test.ts"
        status: pass
      - kind: other
        ref: "grep -c 'it.todo(' tests/telemetry.reduce-run-events.test.ts == 18 (>= 13 required); grep -c '^import' == 1 (exactly 1 required)"
        status: pass
    human_judgment: false
  - id: D2
    description: "tests/storage.progress-v4.test.ts exists with buildV3Fixture() and names every N-STAT-02 behavior as an it.todo (14 cases), leaving the existing v3 suite untouched"
    requirement: N-STAT-02
    verification:
      - kind: unit
        ref: "npx vitest run tests/storage.progress-v4.test.ts"
        status: pass
      - kind: unit
        ref: "npx vitest run tests/storage.progress-v3.test.ts (untouched baseline)"
        status: pass
      - kind: other
        ref: "grep -c 'it.todo(' tests/storage.progress-v4.test.ts == 14 (>= 14 required); grep -c 'function buildV3Fixture' == 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Green baseline preserved: full npm test gate, typecheck and lint all clean with the two scaffolds added"
    verification:
      - kind: integration
        ref: "npm test — 79 test files passed / 403 tests passed, 2 skipped files / 32 todo, exit 0"
        status: pass
      - kind: other
        ref: "npm run typecheck (exit 0); npx eslint on both new files (exit 0, zero warnings)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The it.todo strings are an adequate and complete acceptance checklist for Plans 01-03 — i.e. no N-STAT-01/02 behavior is missing from the list"
    verification: []
    human_judgment: true
    rationale: "Completeness of a requirements checklist is a judgment about scope coverage, not a property any test can assert. The real proof arrives in Waves 1-3, when each todo is turned green; if a behavior was omitted here, only a human reading N-STAT-01/02 against the list can catch it before then."

# Metrics
duration: 4 min
completed: 2026-09-25
status: complete
---

# Phase 09 Plan 00: Wave-0 Telemetry & Storage-v4 Test Scaffolds Summary

**32 `it.todo` cases across two new Vitest files that enumerate every N-STAT-01 counter and N-STAT-02 migration behavior as a written acceptance checklist, plus a pinned `buildV3Fixture()` v3 blob — all green-by-todo before any implementation exists.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-25T07:10:19Z
- **Completed:** 2026-09-25T07:13:54Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- `tests/telemetry.reduce-run-events.test.ts` — 18 `it.todo` cases in 6 `describe` groups covering ring-walk basics, per-pickup-type counts (D-07), lives-lost-from-events + longest rally (D-10, Pitfall 3), largest explosive cascade (D-08), the read-only/zero-core-mutation contract, and a headless integration smoke mirroring `tests/helpers/balanceBot.ts`. One import (`vitest`), zero `src/` imports — the file is green before `src/runtime/runStats.ts` exists.
- `tests/storage.progress-v4.test.ts` — 14 `it.todo` cases covering the v4 key/version pair, the extended v4→v3→v2→v1 migrate chain, independently-validated telemetry fail-soft (Pitfall 4), mode-aware `recordRunEnd` (D-03/D-04), the bounded `recentRuns` ring (D-05), and SC-2 app-kill survival.
- `buildV3Fixture()` pins the "existing player" v3 blob (3 unlocked, 2 recorded bests, rolled-up title PB) so Plan 03's losslessness round-trip does not invent fixture shape under implementation pressure. Keys derive from `PLAYABLE_LEVEL_ORDER` — no hard-coded level ids, because E2 reordered the campaign once already.
- Locked grid-adjacency cascade grouping into the checklist, correcting a stale instruction in the plan (see Deviations).
- Baseline fully preserved: `npm test` exit 0 at **79 files / 403 tests passed** (unchanged), plus 2 skipped files / 32 todo. `npm run typecheck` and `eslint` clean with zero warnings.

## Task Commits

1. **Task 1: tests/telemetry.reduce-run-events.test.ts — it.todo scaffold (N-STAT-01)** — `7604b6b` (test)
2. **Task 2: tests/storage.progress-v4.test.ts — it.todo scaffold + v3 fixture builder (N-STAT-02)** — `0e6dd79` (test)

_Plan metadata commit recorded separately (docs: complete plan)._

## Files Created/Modified

- `tests/telemetry.reduce-run-events.test.ts` — N-STAT-01 Wave-0 checklist; 18 `it.todo`, 1 import, no assertions yet
- `tests/storage.progress-v4.test.ts` — N-STAT-02 Wave-0 checklist; 14 `it.todo` + exported `buildV3Fixture()`

## Decisions Made

- **Cascade cases assert grid-adjacency, not substep co-occurrence.** 09-00-PLAN.md Task 1 dictates the cheap heuristic and even says "Plan 01 locks this, not the grid-adjacency alternative". That text predates the 2026-09-25 plan-check revision, which reversed the choice in 09-CONTEXT.md (`notes_for_later_phases`), 09-VALIDATION.md ("Wave 0 … incl. the grid-adjacency cascade grouping algorithm") and 09-01-PLAN.md (Task 1, union-find over 8-neighbor lattice cells). Since these `it.todo` strings are by design Plan 01's acceptance checklist, shipping the stale wording would have pointed Plan 01 at an algorithm plan-check rejected.
- **`buildV3Fixture()` is exported.** A file-local, never-called helper produces an `@typescript-eslint/no-unused-vars` warning (verified). Exporting removes it and lets Plan 03 import the fixture directly, which is the stated purpose anyway.
- **Two extra cascade todos added** (explicit non-merge regression; non-lattice singleton fallback) to cover 09-01-PLAN.md Task 1's documented fallback branch, which the plan's original three cases did not reach.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 09-00-PLAN.md Task 1 specifies the cascade algorithm plan-check had already rejected**

- **Found during:** Task 1
- **Issue:** The plan's required `it.todo` strings describe substep-co-occurrence cascade attribution and explicitly instruct "Plan 01 locks this, not the grid-adjacency alternative". 09-CONTEXT.md, 09-VALIDATION.md and 09-01-PLAN.md all state the opposite after the 2026-09-25 plan-check revision: grid-adjacency grouping is the locked primary algorithm, because the heuristic overcounts and `largestCascade` feeds a Phase 13 achievement trigger where firing an unearned unlock is the harmful direction. Plan 00 was evidently not re-revised alongside 01/02. Writing the plan text verbatim would have made the Wave-0 checklist actively contradict the Wave-1 implementation it exists to govern.
- **Fix:** Wrote the `describe('… largest explosive cascade (D-08, grid-adjacency grouping)')` block against the locked algorithm — 8-neighbor Chebyshev adjacency, explosive-flag gating, running max — and named substep co-occurrence inside the todo text as the explicitly rejected alternative so it cannot be silently reintroduced. Added the non-merge regression case and the non-lattice singleton fallback case for 09-01-PLAN.md Task 1's fallback branch.
- **Files modified:** `tests/telemetry.reduce-run-events.test.ts`
- **Verification:** All three Task 1 acceptance criteria still pass (vitest exit 0; 18 `it.todo` ≥ 13; exactly 1 `^import`). Checklist now matches 09-01-PLAN.md Task 1 and 09-VALIDATION.md's Wave-0 row.
- **Committed in:** `7604b6b`

**2. [Rule 3 - Blocking] Executor worktree forked from a stale base — the phase-09 directory did not exist**

- **Found during:** Pre-Task 1 setup
- **Issue:** The worktree was created from `de74c1a`, ~90 commits behind `main` (`eb17075`). `.planning/phases/09-run-telemetry-storage-v4/` was absent entirely, so the plan, CONTEXT and VALIDATION files were unreadable, and `src/`/`tests/` predated the C1/C2/D1/D2/E1b/E2 work the 79-file/403-test baseline assumes. This is the known #2649 stale-`origin/HEAD` fork condition; the orchestrator's pre-dispatch base-check did not degrade the dispatch.
- **Fix:** Verified the worktree branch held **zero** local commits and that its HEAD was a strict ancestor of `main`, then `git merge --ff-only eb17075`. A fast-forward with no local commits is non-destructive by construction — nothing is rewritten or discarded — and it aligns the executor base with the orchestrator's HEAD rather than diverging from it. No `reset --hard`, no `git clean`, no `update-ref` was used.
- **Files modified:** none (branch ref only)
- **Verification:** `git merge-base --is-ancestor HEAD main` → true and `git log main..HEAD` → empty, both checked *before* the merge; phase-09 plan files present afterward; `git status --short` clean.
- **Committed in:** n/a (ref fast-forward, no commit created)

**3. [Rule 1 - Bug] File-local `buildV3Fixture()` raised a lint warning**

- **Found during:** Task 2
- **Issue:** The plan asks for a *local* helper, but with every case still `it.todo` the function is never called, so `@typescript-eslint/no-unused-vars` warns — dirtying the clean-lint baseline the phase must hold through Waves 1-3.
- **Fix:** Exported the function (`export function buildV3Fixture()`), which is also what Plan 03 needs in order to consume it.
- **Files modified:** `tests/storage.progress-v4.test.ts`
- **Verification:** `npx eslint tests/storage.progress-v4.test.ts` → exit 0, zero warnings. Acceptance criterion `grep -c "function buildV3Fixture" == 1` still holds.
- **Committed in:** `0e6dd79`

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocker)
**Impact on plan:** No scope creep — both deliverables are exactly the two files the plan names, with the same structure. Deviation 1 is the consequential one: it realigns the Wave-0 acceptance checklist with the post-plan-check locked algorithm, and **09-00-PLAN.md Task 1's cascade wording should be treated as superseded** by 09-01-PLAN.md / 09-VALIDATION.md.

## Issues Encountered

- **Stale worktree base** — see Deviation 2. Resolved by a non-destructive fast-forward; worth flagging to the orchestrator because a sibling Wave-0/Wave-1 executor dispatched from the same stale `origin/HEAD` would hit it identically, and one that did *not* notice would have silently produced work against a 90-commit-old tree.
- No `.planning/WINDOWS.md` ledger exists in this repo, so no broken-windows entries were appended. Note that the 32 `it.todo` entries are **not** defects — they are this plan's contracted deliverable per 09-VALIDATION.md's Wave-0 requirements, and Waves 1-3 turn them green.

## User Setup Required

None — no external service configuration required. No `npm install` this plan.

## Next Phase Readiness

- **Wave 1 unblocked.** 09-01 (`src/runtime/runStats.ts`) and 09-02 (storage v4 schema/parse/migrate) both depend only on 09-00 and have zero file overlap, so they can run in parallel.
- 09-01 Task 1 should read the cascade `it.todo` strings as its acceptance checklist; they now match its own grid-adjacency `<action>` text.
- 09-03 should import `buildV3Fixture` from `tests/storage.progress-v4.test.ts` rather than re-deriving the v3 shape.
- **Carried concern:** any executor dispatched into a worktree for this phase should confirm its base contains `.planning/phases/09-run-telemetry-storage-v4/` before starting.

## Self-Check: PASSED

- `tests/telemetry.reduce-run-events.test.ts` — FOUND on disk
- `tests/storage.progress-v4.test.ts` — FOUND on disk
- Commit `7604b6b` — FOUND in `git log`
- Commit `0e6dd79` — FOUND in `git log`
- `git rev-list --count eb17075..HEAD` → **2** (matches `actuals.commits`)
- Plan `<verification>`: `npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts` → exit 0, 32 todo; `npx vitest run tests/storage.progress-v3.test.ts` → exit 0
- Full gate: `npm test` → exit 0, 79 files / 403 tests passed (baseline preserved)

---
*Phase: 09-run-telemetry-storage-v4*
*Completed: 2026-09-25*
