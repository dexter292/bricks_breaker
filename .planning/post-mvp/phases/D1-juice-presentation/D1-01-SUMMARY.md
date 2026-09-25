---
phase: D1-juice-presentation
plan: 01
subsystem: vfx-render
tags: [vfx, brick-ghosts, paddle-squash, recordSprites, consumeEvents, stepVfx, mid-freeze, golden-replay]

requires:
  - phase: D1-00
    provides: Ghost SoA + paddleSquashT APIs (spawn/step worklets) without World writes
provides:
  - BRICK_BREAK → spawnBrickGhost in consumeEventsForVfx (cascade-inclusive)
  - PADDLE_HIT → punchPaddleSquash (draw-only; paddleW unchanged)
  - stepVfx steps ghosts + squash after particles/shake
  - recordSprites ghost flat fills + squashed paddle under ball LAST
affects: [D1-02, D1-03]

tech-stack:
  added: []
  patterns:
    - Juice consume reads World brick geom; never writes World / hash surface
    - Pure draw helpers (ghostDrawFromLife, paddleSquashDrawSize) unit-tested without Skia
    - Ghosts: flat drawRect only — no glow atlas (D-13 Mid freeze)

key-files:
  created: []
  modified:
    - src/vfx/consumeEvents.ts
    - src/vfx/stepVfx.ts
    - src/vfx/brickGhosts.ts
    - src/vfx/paddleSquash.ts
    - src/vfx/index.ts
    - src/render/recordSprites.ts
    - tests/vfx.brick-ghosts.test.ts
    - tests/vfx.paddle-squash.test.ts

key-decisions:
  - "Ghost draw: scale = 0.85 + 0.15*t, alphaf = t * intensity; flat fill only"
  - "Paddle squash: k≤0.15 widen/shorten about center; source paddleW/H read-only"
  - "Draw order locked: live bricks → ghosts → particles → pickups → paddle → trails → ball"

patterns-established:
  - "Event drain cosmetic hooks after existing burst/shake; PADDLE_HIT is squash-only"
  - "recordSprites juice uses pure helpers imported from src/vfx — no World juice fields"

requirements-completed: [N-FX-01]

duration: 2min
completed: 2026-09-25
---

# Phase D1 Plan 01: Ghost + Squash Consume/Draw Summary

**Wired BRICK_BREAK ghosts and PADDLE_HIT squash through consumeEvents → stepVfx → recordSprites with Mid freeze held and golden-replay green.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-25T02:49:35Z
- **Completed:** 2026-09-25T02:51:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Every `BRICK_BREAK` (incl. 8× cascade) spawns a ghost from brick SoA geom; `spawnBurst` + `punchShake` retained
- `PADDLE_HIT` punches `paddleSquashT` without mutating `paddleW`/`paddleH`
- `stepVfx` decays ghosts + squash; draw path places flat ghost quads after live bricks and squashed paddle before ball LAST
- Golden-replay / hash-canonical / quality-tiers green; Mid `{ particleCap: 128, trailMax: 4, glowScale: 1 }` unchanged; no `hash.ts` diff

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 RED: consume/step failing tests** — `05e4a89` (test)
2. **Task 1 GREEN: wire spawn + step** — `646364e` (feat)
3. **Task 2 RED: draw helper failing tests** — `1056684` (test)
4. **Task 2 GREEN: recordSprites ghosts + squash** — `e9810d0` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/vfx/consumeEvents.ts` — `spawnBrickGhost` on BREAK; `punchPaddleSquash` on PADDLE_HIT
- `src/vfx/stepVfx.ts` — `stepBrickGhosts` + `stepPaddleSquash`
- `src/vfx/brickGhosts.ts` — `ghostDrawFromLife` pure helper
- `src/vfx/paddleSquash.ts` — `paddleSquashDrawSize` + `PADDLE_SQUASH_K_MAX`
- `src/vfx/index.ts` — barrel exports for helpers
- `src/render/recordSprites.ts` — ghost loop + squash paddle draw
- `tests/vfx.brick-ghosts.test.ts` — consume/cascade/stepVfx/draw-helper GREEN
- `tests/vfx.paddle-squash.test.ts` — PADDLE_HIT/World identity/draw-size GREEN

## Decisions Made

- Ghost scale/alpha curve matches RESEARCH sketch (`0.85 + 0.15*t`, alpha=`t`); intensity dampens visual alpha only
- Paddle squash amplitude capped at 0.15; vertical center preserved when height shrinks
- No expo-haptics / PlayingHost (Plans 02–03)

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commits present: `05e4a89`, `1056684`
- GREEN commits present after RED: `646364e`, `e9810d0`

## Known Stubs

None blocking Plan 01 goal. Haptics / PlayingHost remain Plan 02–03 (`tests/haptics.batch-coalesce.test.ts` todos untouched).

## Threat Flags

None — no new network/auth surface; World remains read-only from VFX/render (T-D1-05); ghost cap 16 + flat fill (T-D1-06).

## Self-Check: PASSED

- FOUND: `src/vfx/consumeEvents.ts`, `src/vfx/stepVfx.ts`, `src/render/recordSprites.ts`
- FOUND: `src/vfx/brickGhosts.ts`, `src/vfx/paddleSquash.ts`, ghost/squash tests
- FOUND commits: `05e4a89`, `646364e`, `1056684`, `e9810d0`
- Mid budgets unchanged; `src/core/hash.ts` clean; golden-replay green
