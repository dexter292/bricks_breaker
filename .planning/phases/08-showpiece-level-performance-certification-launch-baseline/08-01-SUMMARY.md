---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 01
subsystem: levels
tags: [level-03, showpiece, loadLevel, PlayingHost, vitest, LVL-04]

requires:
  - phase: 08-showpiece-level-performance-certification-launch-baseline
    provides: Wave 0 it.todo Nyquist stubs for level-03 compile + loadLevel
  - phase: 04-level-format-brick-types
    provides: schema v1 validate→compile pipeline and level-01/02 fixtures
provides:
  - assets/levels/level-03.json Neon Gauntlet three-act showpiece
  - Title→Play default boot via loadLevelById / PlayingHost level-03
  - DEV-only 01→02→03 level cycle (hidden when __DEV__ is false)
affects:
  - 08-02 quality tiers / VFX caps on showpiece play
  - 08-03 worst-case certification scene on level-03
  - 08-06 human play verification of ~2–3 min clear

tech-stack:
  added: []
  patterns:
    - Metro static require per LevelId (no dynamic require)
    - DEV-only Pressable level switch gated on __DEV__

key-files:
  created:
    - assets/levels/level-03.json
  modified:
    - src/runtime/loadLevel.ts
    - app/_components/PlayingHost.tsx
    - tests/levels.compile.test.ts
    - tests/runtime.loadLevel.test.ts

key-decisions:
  - "10×16 Neon Gauntlet layout: Act1 1s → plateau → Act2 2/3 clusters → plateau → Act3 X pocket"
  - "Default LevelId and PlayingHost useState are level-03 (D-06); fixtures 01/02 unchanged (D-05)"

patterns-established:
  - "Showpiece levels stay schema v1 only — density/layout for duration, no drop-rate fields"
  - "DEV level switch cycles all bundled LevelIds; production omits Pressable"

requirements-completed: [LVL-04]

duration: 2min
completed: 2026-09-21
---

# Phase 8 Plan 01: Showpiece Level Default Boot Summary

**Authored `level-03` (Neon Gauntlet) as a three-act schema-v1 showpiece and made Title→Play load it by default through the shared validate→compile pipeline, with a DEV-only 01/02/03 cycle.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-21T08:28:46Z
- **Completed:** 2026-09-21T08:30:46Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created `assets/levels/level-03.json` — 10×16 grid, Act 1→plateau→Act 2→plateau→Act 3 unbreakable pocket; no drop-rate fields
- Green compile fingerprint tests (UNBREAKABLE ≥1, fingerprint ≠ 01/02, cols×rows & brickCount ≤ 256)
- Default `loadLevelById()` / PlayingHost boot is `level-03`; DEV switch cycles all three; `__DEV__` gate retained
- level-01 / level-02 JSON untouched as regression fixtures

## Task Commits

Each task was committed atomically (TDD RED→GREEN):

1. **Task 1 RED: compile fingerprint tests** - `41f9bf2` (test)
2. **Task 1 GREEN: author level-03.json** - `b146fed` (feat)
3. **Task 2 RED: loadLevel default tests** - `5c6bfee` (test)
4. **Task 2 GREEN: default boot + DEV 3-way switch** - `a53988c` (feat)

**Plan metadata:** _(pending final docs commit)_

## Files Created/Modified

- `assets/levels/level-03.json` — Neon Gauntlet showpiece (schema v1, id level-03)
- `src/runtime/loadLevel.ts` — LevelId + Metro require + default `level-03`
- `app/_components/PlayingHost.tsx` — initial levelId level-03; DEV cycle 01→02→03
- `tests/levels.compile.test.ts` — real level-03 compile/fingerprint/cap tests
- `tests/runtime.loadLevel.test.ts` — real default + explicit level-03 load tests

## Decisions Made

- **Layout:** 10×16 with brickW 32 / brickH 14 to fit logical 360 width; Act 3 pocket (`XX......XX` / `X.333333.X` / `XX.3..3.XX`) forces angled play without relying on power-up RNG (D-01, D-04)
- **Boot:** Both `loadLevelById` default arg and PlayingHost `useState` set to `level-03` (D-06)
- **DEV switch:** Ternary cycle replaces binary toggle; Pressable remains under `__DEV__` only (D-07)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None

## Known Stubs

None — Wave 0 `it.todo` entries for level-03 compile and loadLevel were converted to real assertions.

## Threat Flags

None — no new network/auth/file trust boundaries beyond bundled JSON already covered by T-08-01…T-08-05 (validate→compile fail-closed; DEV gate; MAX_BRICKS).

## Next Phase Readiness

- level-03 ready for quality-tier play (Plan 02) and worst-case certification scene (Plan 03)
- Human ~2–3 min clear feel deferred to Plan 06 UAT (D-02)

## Self-Check: PASSED

- FOUND: `assets/levels/level-03.json`
- FOUND: `src/runtime/loadLevel.ts`
- FOUND: `app/_components/PlayingHost.tsx`
- FOUND: `tests/levels.compile.test.ts`
- FOUND: `tests/runtime.loadLevel.test.ts`
- FOUND: commits `41f9bf2`, `b146fed`, `5c6bfee`, `a53988c`
