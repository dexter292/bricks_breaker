---
phase: D1-juice-presentation
plan: 00
subsystem: vfx-haptics
tags: [vfx, soa, brick-ghosts, paddle-squash, haptics, coalesce, vitest, nyquist]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: VfxState SoA particles/shake + audio batch coalesce pattern
  - phase: C2-level-select-stars-replay
    provides: post-MVP shell stable; ceiling §5c PASS precondition
provides:
  - Ghost SoA pool (cap 16) + spawnBrickGhost / stepBrickGhosts worklet APIs
  - Paddle squash scalar punchPaddleSquash / stepPaddleSquash
  - Memory HapticsService with strongest-wins coalesce (4→light, 7→medium)
  - Nyquist Vitest files for Plans 01–03
  - VALIDATION wave_0_complete: true
affects: [D1-01, D1-02, D1-03]

tech-stack:
  added: []
  patterns:
    - VFX ghost pool mirrors particles FIFO without World/hash writes
    - Haptics mapping numeric literals only (no core import) like audio mapping
    - Memory service for Vitest before expo-haptics (Plan 02)

key-files:
  created:
    - src/vfx/brickGhosts.ts
    - src/vfx/paddleSquash.ts
    - src/services/haptics/types.ts
    - src/services/haptics/mapping.ts
    - src/services/haptics/memoryHapticsService.ts
    - src/services/haptics/index.ts
    - tests/vfx.brick-ghosts.test.ts
    - tests/vfx.paddle-squash.test.ts
    - tests/haptics.batch-coalesce.test.ts
  modified:
    - src/vfx/types.ts
    - src/vfx/index.ts
    - .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md

key-decisions:
  - "Ghost pool uses free-slot scan + FIFO oldest eviction (no free-list); cap 16 cascade-safe"
  - "Paddle squash is linear timer decay to 0 (not shake exponential) — simpler draw scale"
  - "Wave 0 haptics = memory only; expo-haptics deferred to Plan 02"

patterns-established:
  - "Juice state lives only on VfxState; callers pass geom snapshots into spawnBrickGhost"
  - "coalesceHapticRank strongest-wins: any 7 → medium; else any 4 → light; else no-op"

requirements-completed: [N-FX-01, N-FX-03]

duration: 2min
completed: 2026-09-25
---

# Phase D1 Plan 00: Juice Wave 0 Contracts Summary

**Locked ghost SoA (cap 16) + paddle squash punch/step APIs and memory haptics strongest-wins coalesce with Nyquist Vitest targets and VALIDATION `wave_0_complete: true`.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-25T02:46:02Z
- **Completed:** 2026-09-25T02:48:19Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Extended `VfxState` / `allocateVfx` with ghost SoA + `paddleSquashT` without touching World / `hash.ts` or Mid particleCap 128
- Shipped `spawnBrickGhost` / `stepBrickGhosts` and `punchPaddleSquash` / `stepPaddleSquash` as `'worklet'` pure APIs with GREEN unit tests
- Shipped `createMemoryHapticsService` + `coalesceHapticRank` (8× break → 1 Light; break+life → 1 Medium; paddle → 0)
- Marked D1-VALIDATION Wave 0 complete; Plan 01–03 `it.todo` stubs reserved

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 RED: Ghost + squash failing tests** — `90ab121` (test)
2. **Task 1 GREEN: Ghost SoA + paddle squash APIs** — `3e68a45` (feat)
3. **Task 2 RED: Haptics coalesce failing tests** — `8a7af9a` (test)
4. **Task 2 GREEN: Memory haptics + VALIDATION Wave 0** — `cfaa8f1` (feat)

**Plan metadata:** _(pending final docs commit)_

## Files Created/Modified

- `src/vfx/types.ts` — `GHOST_CAP_DEFAULT`, ghost SoA fields, `paddleSquashT`
- `src/vfx/brickGhosts.ts` — spawn/step ghost pool
- `src/vfx/paddleSquash.ts` — punch/step squash scalar
- `src/vfx/index.ts` — barrel exports
- `src/services/haptics/*` — types, mapping, memory service, index
- `tests/vfx.brick-ghosts.test.ts` — allocate/spawn/step/cascade GREEN + Plan 01 todos
- `tests/vfx.paddle-squash.test.ts` — punch/step GREEN + Plan 01 todos
- `tests/haptics.batch-coalesce.test.ts` — coalesce GREEN + Plan 02/03 todos
- `D1-VALIDATION.md` — `wave_0_complete: true`, filenames aligned

## Decisions Made

- Ghost eviction: scan for free slot, else FIFO via `ghostOldest` (no free-stack — pool is small)
- Squash decay: linear subtraction by `dt` (matches short 0.1s timer; not shake’s exponential)
- Haptics Wave 0 intentionally has no `expo-haptics` / `useVfxIntensity` / OS query

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commits present: `90ab121`, `8a7af9a`
- GREEN commits present after RED: `3e68a45`, `cfaa8f1`

## Known Stubs

Intentional Plan 01–03 todos (not blocking Wave 0 goal):

| File | Stub | Reason |
|------|------|--------|
| `tests/vfx.brick-ghosts.test.ts` | `it.todo` consumeEvents / recordSprites | Plan 01 |
| `tests/vfx.paddle-squash.test.ts` | `it.todo` PADDLE_HIT / recordSprites | Plan 01 |
| `tests/haptics.batch-coalesce.test.ts` | `it.todo` expo soft-fail / PlayingHost / intensity contract | Plans 02–03 |

## Threat Flags

None — Wave 0 adds no network/auth/OS query surface; coalesce mitigates T-D1-01; VfxState-only mitigates T-D1-02.

## Self-Check: PASSED

- FOUND: `src/vfx/brickGhosts.ts`, `src/vfx/paddleSquash.ts`, `src/services/haptics/memoryHapticsService.ts`
- FOUND: `tests/vfx.brick-ghosts.test.ts`, `tests/vfx.paddle-squash.test.ts`, `tests/haptics.batch-coalesce.test.ts`
- FOUND commits: `90ab121`, `3e68a45`, `8a7af9a`, `cfaa8f1`
- VALIDATION `wave_0_complete: true`
- Mid `PARTICLE_POOL_DEFAULT = 128` unchanged; no `src/core/` diffs
