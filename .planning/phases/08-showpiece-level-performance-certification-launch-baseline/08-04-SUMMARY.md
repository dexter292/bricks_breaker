---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 04
subsystem: performance
tags: [soak, lifecycle, audio-release, PLT-03, DEV-harness, Title-Playing]

requires:
  - phase: 08-showpiece-level-performance-certification-launch-baseline
    provides: SOAK_HARNESS flag + phase8-certification.md body
  - phase: 07-feedback-neon-vfx-audio
    provides: AudioService release + memory/pooled implementations
provides:
  - DEV soak driver (100 Title↔Playing cycles + 15 min continuous)
  - Green audio.release lifecycle asserts (idempotent pool clear)
  - Soak procedure + empty Results rows for Plan 06
affects:
  - 08-06 device soak human gate fills
  - PlayingHost unmount → audio.release path under soak pressure

tech-stack:
  added: []
  patterns:
    - DEV soak gated by __DEV__ && SOAK_HARNESS; discrete setTimeout only
    - Memory AudioService clears plays/cursors on release for soak asserts

key-files:
  created: []
  modified:
    - tests/audio.release.test.ts
    - src/services/audio/expoAudioService.ts
    - app/_components/GameHost.tsx
    - docs/phase8-certification.md

key-decisions:
  - "Soak dwell 750ms per edge; continuous window 15*60*1000 ms"
  - "Memory release clears plays array so unit asserts prove lifecycle reset"
  - "eas.json production must never set EXPO_PUBLIC_SOAK"

patterns-established:
  - "Shell-phase soak via setState + setTimeout — never useFrameCallback"
  - "Unit audio.release ≠ device soak pass (D-22 human gate remains)"

requirements-completed: []  # PLT-03 device evidence pending Plan 06

duration: 2min
completed: 2026-09-21
---

# Phase 8 Plan 04: DEV Soak Harness Summary

**DEV-only Title↔Playing soak (100 cycles + 15 min continuous) with green audio.release lifecycle asserts and documented device memory/frame-time record fields.**

> **Ledger note (T8.1):** Soak harness + unit asserts only — device soak Results remain Plan 06 / pending.

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-21T12:30:26Z
- **Completed:** 2026-09-21T12:32:45Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Converted Wave 0 `audio.release` todos into real D-20/D-22 tests (memory + pooled players)
- Memory `AudioService.release()` clears plays/cursors; double-release idempotent; post-release playBatch no-ops
- `GameHost` soak driver behind `__DEV__ && SOAK_HARNESS` — discrete timers, cleared on unmount, no hot-path work
- `docs/phase8-certification.md` Soak section: arming, meminfo/Instruments, fail criteria, empty Plan 06 Results
- Production `eas.json` remains free of `EXPO_PUBLIC_SOAK`

## Task Commits

Each task was committed atomically:

1. **Task 1: Automated audio.release / lifecycle asserts** - `8d172b7` (test RED) + `d198e6b` (feat GREEN)
2. **Task 2: GameHost DEV soak driver + docs section** - `0130970` (feat)

**Plan metadata:** `8ece358` (docs: complete plan)

## Files Created/Modified

- `tests/audio.release.test.ts` — release clear, idempotent, post-release soft-fail asserts
- `src/services/audio/expoAudioService.ts` — memory service clears plays/cursors on release
- `app/_components/GameHost.tsx` — DEV soak driver (100 + 15 min)
- `docs/phase8-certification.md` — Soak test procedure + empty Results

## Decisions Made

- 750 ms dwell between Title↔Playing edges (within 500–1000 ms guidance)
- Enhance memory release to clear recorded plays so soak unit asserts prove pool reset, not only a boolean flag
- Keep device soak mandatory human gate; units cover audio release only (D-22)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Memory release now clears plays/cursors**
- **Found during:** Task 1 (TDD RED — asserts expected empty pools after release)
- **Issue:** `createMemoryAudioService().release()` only set a flag; plays array retained history, weakening D-20 lifecycle signal
- **Fix:** Clear `plays` and `cursors` on first release; keep idempotent early-return
- **Files modified:** `src/services/audio/expoAudioService.ts`
- **Verification:** `npm test -- tests/audio.release.test.ts` + mapping tests green
- **Committed in:** `d198e6b` (Task 1 GREEN)

---

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Necessary for meaningful soak lifecycle asserts; no scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Device soak Results fills are Plan 06.

## Next Phase Readiness

- Plan 06 can run device soak with `EXPO_PUBLIC_SOAK=1` + `__DEV__` and fill Soak Results rows
- Audio release unit path is green; final device memory/frame-time review still required (D-22)

## TDD Gate Compliance

- RED: `8d172b7` test(08-04)
- GREEN: `d198e6b` feat(08-04)
- Refactor: not needed

## Self-Check: PASSED

- FOUND: `app/_components/GameHost.tsx`, `tests/audio.release.test.ts`, `docs/phase8-certification.md`
- FOUND: commits `8d172b7`, `d198e6b`, `0130970`
- No `it.todo` remaining; no production `EXPO_PUBLIC_SOAK` in `eas.json`
- Threat surface: DEV soak timers — mitigated by `__DEV__ && SOAK_HARNESS` + unmount clear (T-08-16…T-08-20)

---
*Phase: 08-showpiece-level-performance-certification-launch-baseline*
*Completed: 2026-09-21*
