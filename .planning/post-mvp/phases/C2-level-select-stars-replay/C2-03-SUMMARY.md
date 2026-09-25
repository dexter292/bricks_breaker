---
phase: C2-level-select-stars-replay
plan: 03
subsystem: ui
tags: [levelId, bake-gate, recordRunEnd, Next, ProgressStore-v3, vitest]

requires:
  - phase: C2-level-select-stars-replay
    provides: SelectScreen + ResultOverlay stars/Next + ProgressBlob v3 recordRunEnd (C2-01/02)
provides:
  - Required PlayingHost levelId + controlled onLevelIdChange from GameHost
  - goNext = toggleDevLevel checklist (runEndedRef=false; never setActive true)
  - handleRunEnded → recordRunEnd blob → Results stars + Next gate
  - loadLevelById(id: LevelId) with no default
  - D-03 next-bake behavioral + source contracts GREEN
  - PROGRESS-STORAGE v3 ops + cert-arm / ceiling notes
affects:
  - C2 human device UAT (Task 3)
  - Post-C2 iOS ceiling Cert WC re-run (RELEASE-GATES §6)

tech-stack:
  added: []
  patterns:
    - Controlled levelId from GameHost; gate effect owns setActive(true)
    - Results chrome from recordRunEnd returned blob (no dual getSnapshot)
    - Next mirrors toggleDevLevel exactly including runEndedRef reset

key-files:
  created: []
  modified:
    - app/_components/PlayingHost.tsx
    - app/_components/GameHost.tsx
    - src/runtime/loadLevel.ts
    - tests/runtime.loadLevel.test.ts
    - tests/ui/PlayingHost.next-bake.test.ts
    - tests/ui/PlayingHost.bake-gate.test.ts
    - tests/ui/GameHost.test.tsx
    - docs/ops/PROGRESS-STORAGE.md
    - .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md

key-decisions:
  - "PlayingHost always prefers controlled levelId from GameHost; local state only if onLevelIdChange omitted"
  - "goNext named callback for source-contract matching; body mirrors toggleDevLevel"
  - "Skipped ROADMAP-NEXT.md / STATE.md updates — orchestrator owns those"
  - "REQUIREMENTS-NEXT N-PROG-03 already lives-based — no amend edit needed"

patterns-established:
  - "Four D-15 call sites: required prop; no loadLevel default; CERT force level-03 kept; GameHost CERT bypass Select"
  - "D-03: mock useGameLoop + fake timers assert setActive(true) last after levelId change"

requirements-completed: [N-PROG-04, N-LVL-02, N-PROG-03]

duration: 5min
completed: 2026-09-25
---

# Phase C2 Plan 03: levelId + Next Bake + Ops Docs Summary

**Required `levelId` into PlayingHost, bake-safe Next mirroring `toggleDevLevel`, `recordRunEnd` blob→Results, and Progress v3 ops docs — device UAT still pending**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-25T01:18:23Z
- **Completed:** 2026-09-25T01:22:54Z
- **Tasks:** 2 of 3 (Task 3 human checkpoint not executed)
- **Files modified:** 9

## Accomplishments

- Removed `loadLevelById` default; PlayingHost takes required `levelId` + optional `onLevelIdChange`
- `goNext` resets chrome + `runEndedRef.current = false` then changes levelId only — never `setActive(true)`
- `handleRunEnded` calls `store.recordRunEnd` and drives Results stars + Next from returned blob
- D-03 next-bake + bake-gate source contracts GREEN; full `npm test` green (359)
- Ops: PROGRESS-STORAGE documents v3 / lives stars / Select three-states / cert-arm + ceiling re-run

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing levelId + Next bake tests** - `cb435af` (test)
2. **Task 1 (GREEN): required levelId + Next + recordRunEnd** - `595fab9` (feat)
3. **Task 2: ops docs + validation** - `af65da9` (docs)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — required levelId; goNext; recordRunEnd→stars/Next
- `app/_components/GameHost.tsx` — `onLevelIdChange={setActiveLevelId}`; CERT still passes `level-03`
- `src/runtime/loadLevel.ts` — `loadLevelById(id: LevelId)` no default
- `tests/runtime.loadLevel.test.ts` — length===1 contract
- `tests/ui/PlayingHost.next-bake.test.ts` — source + behavioral setActive-last
- `tests/ui/PlayingHost.bake-gate.test.ts` — goNext source contract
- `tests/ui/GameHost.test.tsx` — required levelId mock
- `docs/ops/PROGRESS-STORAGE.md` — v3 + cert-arm / ceiling ops
- `C2-VALIDATION.md` — Plan 03 automated rows; Manual-Only UAT pending

## Decisions Made

- Controlled levelId from GameHost (CERT forces prop `level-03`; cert force effect kept)
- Orchestrator owns STATE.md / ROADMAP-NEXT.md — not updated in this plan
- SOAK Select-skip note already accurate — left unchanged
- REQUIREMENTS-NEXT N-PROG-03 already matches lives-based amend — no edit

## Deviations from Plan

### Skipped (orchestrator instruction)

**1. ROADMAP-NEXT.md / STATE.md not updated**
- **Found during:** Task 2
- **Issue:** Plan lists ROADMAP-NEXT + executor normally updates STATE; orchestrator said do not touch those
- **Fix:** Skipped; noted here for orchestrator follow-up
- **Files modified:** none
- **Committed in:** n/a

### Auto-fixed Issues

None - code/docs tasks otherwise followed the plan.

---

**Total deviations:** 1 skipped (orchestrator ownership)
**Impact on plan:** Docs/roadmap progress left for orchestrator; code complete.

## Issues Encountered

None

## Checkpoint Status

**Awaiting human device UAT + cert-arm smoke (Task 3).**

Do not mark Manual-Only rows approved until human replies `approved` (or a defect list). Ceiling Cert WC re-run is a separate measurement session after smoke.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Code/docs for C2-03 ready for device UAT (Task 3)
- After approval: mark `C2-VALIDATION.md` `Human UAT: approved YYYY-MM-DD`
- Then schedule one post-C2 ceiling Cert WC re-run (RELEASE-GATES §6)

## Self-Check: PASSED

- FOUND: `app/_components/PlayingHost.tsx`, `src/runtime/loadLevel.ts`, `docs/ops/PROGRESS-STORAGE.md`
- FOUND commits: `cb435af`, `595fab9`, `af65da9`

---
*Phase: C2-level-select-stars-replay*
*Completed: 2026-09-25 (Tasks 1–2; Task 3 pending)*
