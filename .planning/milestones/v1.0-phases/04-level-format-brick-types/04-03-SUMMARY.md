---
phase: 04-level-format-brick-types
plan: 03
subsystem: render
tags: [damage-cues, hatch, cracks, skia, drawLine, LVL-02, LVL-03, vitest]

requires:
  - phase: 04-level-format-brick-types
    provides: compile/apply + level-01/02 SoA (04-02)
provides:
  - Pure planBrickDamageCues stroke plans (Node-testable)
  - Skia drawLine crack/hatch in recordFrame entity layer
  - Green levels.damage-cues Vitest for LVL-02 stroke counts
affects:
  - 04-04 GameHost load wiring
  - Phase 7 VFX (must not creep here)

tech-stack:
  added: []
  patterns:
    - Pure damageCues in core for unit tests; worklet-local duplicate in recordSprites
    - Flags-first hatch; breakable 0/1/2 strokes for remaining hp ≥3/2/1
    - Stroke cues after fill via canvas.drawLine; no React HP overlays

key-files:
  created:
    - src/core/levels/damageCues.ts
  modified:
    - src/core/index.ts
    - src/render/recordSprites.ts
    - tests/levels.damage-cues.test.ts

key-decisions:
  - "Inlined planBrickDamageCuesLocal in worklet (sync with damageCues.ts) to avoid JS remotes"
  - "Stroke color #E5E7EB width 1.25; hatch = 3 fixed diagonals distinct from hp===1 cracks"

patterns-established:
  - "Pattern: flags & UNBREAKABLE → hatch only; never crack steel"
  - "Pattern: core pure helper for counts; render mirrors geometry with keep-in-sync comment"

requirements-completed: [LVL-02, LVL-03]

duration: 2min
completed: 2026-09-20
---

# Phase 04 Plan 03: Damage Cues & Hatch Summary

**Pure damageCues stroke plans (HP 3/2/1 = 0/1/2 cracks; steel hatch ≥2) unit-tested in Node, with Skia drawLine cues in recordFrame after brick fills**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T07:33:41Z
- **Completed:** 2026-09-20T07:36:04Z
- **Tasks:** 2/2
- **Files modified:** 4 created/modified

## Accomplishments

- Added `planBrickDamageCues` + `BrickCueStroke` (flags-first hatch; dead/≥3 → empty)
- Exported from core barrel; Vitest covers stroke counts, hatch ≠ cracks, AABB ±1px
- Extended `recordFrame` brick loop with stroke-style `drawLine` after fills (D-05…D-08)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): damage-cues tests** - `2f84f63` (test)
2. **Task 1 (GREEN): planBrickDamageCues** - `e960e21` (feat)
3. **Task 2: Skia drawLine crack/hatch** - `bf6e3d6` (feat)

**Plan metadata:** `cafa38f` (docs: complete plan)

## Files Created/Modified

- `src/core/levels/damageCues.ts` — pure stroke-plan helper
- `src/core/index.ts` — barrel exports
- `src/render/recordSprites.ts` — `planBrickDamageCuesLocal` + `drawLine`
- `tests/levels.damage-cues.test.ts` — LVL-02 / LVL-03 stroke assertions

## Decisions Made

- Duplicated geometry in worklet (`planBrickDamageCuesLocal`) rather than importing core helper, matching Phase 3 `brickFillLocal` (avoid JS remotes under worklets)
- Fixed 3-segment hatch and fractional crack insets so all endpoints stay inside brick AABB

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Damage readability ready for playtesting once 04-04 wires GameHost to compiled levels
- No Phase 7 VFX introduced; overlays under `src/runtime/overlays` unchanged (no HP React state)

## Self-Check: PASSED

- FOUND: `src/core/levels/damageCues.ts`
- FOUND: `tests/levels.damage-cues.test.ts`
- FOUND: `src/render/recordSprites.ts`
- FOUND: commits `2f84f63`, `e960e21`, `bf6e3d6`

---
*Phase: 04-level-format-brick-types*
*Completed: 2026-09-20*
