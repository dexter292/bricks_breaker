---
phase: 03-first-playable-render-input-bricks-lives-pause
plan: 02
subsystem: render
tags: [skia, letterbox, camera, GameCanvas, UI-SPEC, recordFrame]

requires:
  - phase: 03-first-playable-render-input-bricks-lives-pause
    provides: Wave 0 input/freeze scaffold (03-00); spike opaque Picture path
  - phase: 02-headless-core-simulation
    provides: World SoA brick/ball/paddle fields for read-only draw
provides:
  - Uniform makeCamera letterbox into surface (LOGICAL 360×640)
  - UI-SPEC flat color tokens + brickFill(hp, flags)
  - recordFrame draws bricks/paddle/ball with navy field + black bars
  - GameCanvas opaque SkPicture host (+ SpikeCanvas re-export)
affects:
  - 03-03 paddle gesture (camScale invert)
  - 03-05 GameScreen host wiring safe-area content size into onSize

tech-stack:
  added: []
  patterns:
    - Letterbox via translate(ox,oy)+uniform scale before logical field draw
    - Flat Skia fills only — no glow/shadow/blur (D-01)
    - Global recorder tools key `__gameRecorderTools` with spike-key fallback

key-files:
  created:
    - src/render/camera.ts
    - src/render/colors.ts
    - src/render/GameCanvas.tsx
  modified:
    - src/render/recordSprites.ts
    - src/render/SpikeCanvas.tsx

key-decisions:
  - "Paddle X center-based, Y top-of-AABB to match core sweep AABB"
  - "brickFill mirrors UNBREAKABLE bit=1 without importing BrickFlags (keep colors free of core)"
  - "Single SkPicture entity path; defer dirty brick layer split"

patterns-established:
  - "Pattern: makeCamera(safeW,safeH) for all virtual→device uniform scale"
  - "Pattern: GameCanvas opaque + black Fill; letterbox drawn inside Picture"
  - "Pattern: Spike* thin re-export until Plan 05 host rename"

requirements-completed: [PHYS-01, RUN-02]

duration: 2min
completed: 2026-09-20
---

# Phase 03 Plan 02: Letterboxed Playfield Render Summary

**Uniform letterbox camera + UI-SPEC flat colors drawing bricks/paddle/ball into opaque GameCanvas SkPicture**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T04:48:07Z
- **Completed:** 2026-09-20T04:49:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `makeCamera` with non-finite/sub-1 surface fallback (T-03-01)
- Locked UI-SPEC hex tokens (`#1a1a2e` field, HP palette, steel unbreakable) — no cliff cyan
- Replaced non-uniform stretch scale with letterbox translate+uniform scale; draw World SoA read-only
- Renamed canvas host to `GameCanvas` with `SpikeCanvas` compatibility re-export

## Task Commits

Each task was committed atomically:

1. **Task 1: camera.ts + colors.ts per UI-SPEC** — `a7fe57b` (feat)
2. **Task 2: recordFrame entities + GameCanvas rename** — `12206df` (feat)

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/render/camera.ts` — LOGICAL_W/H + makeCamera letterbox math
- `src/render/colors.ts` — FIELD_NAVY / LETTERBOX_BLACK / BALL_PADDLE / brick HP fills + brickFill
- `src/render/recordSprites.ts` — letterboxed entity recordFrame (bricks/paddle/ball)
- `src/render/GameCanvas.tsx` — opaque Canvas + Fill black + Picture
- `src/render/SpikeCanvas.tsx` — re-exports GameCanvas as SpikeCanvas

## Decisions Made

- Paddle draw: `left = paddleX - paddleW/2`, `top = paddleY` (matches core AABB)
- `brickFill` uses local `UNBREAKABLE_BIT = 1` instead of importing core BrickFlags
- Recorder global renamed to `__gameRecorderTools` with one-time read of `__spikeRecorderTools`

## Deviations from Plan

None - plan executed exactly as written.

### Verification note (parallel wave)

Full `npm run test:core` currently fails on Plan 01 RED suites (`stepRun is not a function` in `tests/rules.*.test.ts`). Render acceptance still verified:

- eslint `src/render` clean
- stretch scale gone; `makeCamera` used; `GameCanvas` has `opaque`
- Pre-existing green suites (core smoke/purity/physics/input/freeze) pass with these changes

Not a Plan 02 deviation — Plan 01 TDD RED landed on the shared branch mid-wave.

## Issues Encountered

None for render work. Shared-branch Plan 01 RED gate blocked full `test:core` green until their GREEN commits land.

## Known Stubs

None — recordFrame draws live World SoA; blank-field spike path removed.

## Threat Flags

None — no new network/auth/file surfaces; T-03-01 mitigated via finite size fallback; LC-08 preserved (read-only World).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can invert `cam.scale` for relative-drag pixels→vu
- Plan 05 should pass safe-area content box size into loop/`onSize` (letterbox already correct for any surface box)
- SpikeCanvas re-export can be deleted when hosts rename

## Self-Check: PASSED

- FOUND: `src/render/camera.ts`, `src/render/colors.ts`, `src/render/GameCanvas.tsx`, `src/render/recordSprites.ts`, `src/render/SpikeCanvas.tsx`
- FOUND commits: `a7fe57b`, `12206df`
- No `#00ffaa` in `colors.ts`; no non-uniform stretch scale in `recordSprites.ts`

---
*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Completed: 2026-09-20*
