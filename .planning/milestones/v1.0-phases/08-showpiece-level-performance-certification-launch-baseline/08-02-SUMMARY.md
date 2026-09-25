---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 02
subsystem: performance
tags: [quality-tiers, expo-device, VfxCaps, trailMax, glowScale, PLT-03]

requires:
  - phase: 08-showpiece-level-performance-certification-launch-baseline
    provides: Wave 0 quality-tier Vitest stubs + expo-device dependency
  - phase: 07-feedback-neon-vfx-audio
    provides: allocateVfx particleCap + intensity dampener + glow atlas blit
provides:
  - resolveQualityTier Low/Mid/High + BUDGETS (Mid≈Pixel 6a)
  - VfxCaps.trailMax + glowScale wired through allocate/draw
  - PlayingHost once-per-mount budget + __DEV__ tier force remount
affects:
  - 08-03 worst-case Mid-tier certification scene
  - 08-06 Pixel 6a gfxinfo Results gate

tech-stack:
  added: []
  patterns:
    - Pure tierFromMemory/BUDGETS testable without RN; readDeviceMemory soft-fails expo-device
    - Tier = hard ceiling; useVfxIntensity dampens within caps
    - DEV tier override remounts VFX pools (no mid-frame typed-array resize)

key-files:
  created:
    - src/runtime/resolveQualityTier.ts
  modified:
    - src/vfx/types.ts
    - src/vfx/trails.ts
    - src/render/recordSprites.ts
    - src/runtime/useGameLoop.ts
    - app/_components/PlayingHost.tsx
    - tests/runtime.quality-tiers.test.ts
    - tests/vfx.particles.test.ts
    - tests/core.purity.test.ts

key-decisions:
  - "BUDGETS low 48/2/0, mid 128/5/1, high 192/5/1 (RESEARCH table)"
  - "modelName /Pixel 6a/i forces mid before memory heuristic (D-13)"
  - "Trail/glow clamp at call sites + VfxState fields; intensity.ts unchanged"

patterns-established:
  - "Quality tiers live in runtime/ only; core purity bans expo-device + resolveQualityTier"
  - "DEV tier UI beside level switch; production auto-select only"

requirements-completed: []  # PLT-03 device evidence pending Plan 06

duration: 3min
completed: 2026-09-21
---

# Phase 8 Plan 02: Quality Tiers + VfxCaps Summary

**Low/Mid/High device quality tiers via expo-device memory bands, with Mid as the Pixel 6a cert baseline and numeric particleCap/trailMax/glowScale wired outside core/.**

> **Ledger note (T8.1):** Quality-tier wiring only — PLT-03 60 FPS device measurement remains Plan 06 / pending.

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-21T12:22:17Z
- **Completed:** 2026-09-21T12:25:18Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- `resolveQualityTier` + `tierFromMemory` + `BUDGETS` (low 48/2/0, mid 128/5/1, high 192/5/1); null/invalid → Low; Pixel 6a modelName → Mid
- Extended `VfxCaps`/`VfxState` with `trailMax` (≥2) and `glowScale` ([0,1]); trails clamped, glow blit skipped at 0
- PlayingHost resolves once per mount, passes `vfxBudget` into `allocateVfx`; `__DEV__`-only Low→Mid→High→Auto cycle remounts session
- Wave 0 quality-tier / particle / purity stubs converted to green asserts; `core/` stays blind

## Task Commits

Each task was committed atomically (TDD RED→GREEN for Task 1):

1. **Task 1 RED: quality-tier + VfxCaps tests** - `d30904d` (test)
2. **Task 1 GREEN: resolver + trail/glow caps** - `5707d10` (feat)
3. **Task 2: PlayingHost wiring + DEV override** - `6cc3575` (feat)

**Plan metadata:** `756bc50` (docs: complete plan)

## Files Created/Modified

- `src/runtime/resolveQualityTier.ts` — QualityTier, BUDGETS, tierFromMemory, resolveQualityTier, readDeviceMemory
- `src/vfx/types.ts` — trailMax/glowScale on VfxCaps + VfxState; allocate clamps
- `src/vfx/trails.ts` — pushTrail respects vfx.trailMax
- `src/render/recordSprites.ts` — glowScale skip/α; trail draw uses vfx.trailMax
- `src/runtime/useGameLoop.ts` — vfxBudget option → allocateVfx; realloc on budget change
- `app/_components/PlayingHost.tsx` — auto tier + DEV override UI
- `tests/runtime.quality-tiers.test.ts` — real memory/BUDGETS/override asserts
- `tests/vfx.particles.test.ts` — particleCap/trailMax/glowScale expects
- `tests/core.purity.test.ts` — D-12 ban on expo-device / resolveQualityTier

## Decisions Made

- **Budgets:** Adopted RESEARCH table verbatim (discretion allowed; Mid cert baseline preserved)
- **Heuristic:** GiB thresholds 4 / 8 with conservative Low default; modelName `/Pixel 6a/i` forces Mid (D-13)
- **Clamp site:** Left `trailLength(intensity)` endpoints intact; min with `vfx.trailMax` at push/draw (tier hard ceiling)
- **Remount:** Budget change nulls Vfx SharedValue + host session reset — no mid-frame pool resize

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None

## Known Stubs

None — Wave 0 `it.todo` entries for quality tiers and particle caps were converted to real assertions.

## Threat Flags

None — DEV override gated on `__DEV__` (T-08-06); core purity extended (T-08-07); High capped at 192 (T-08-08); Pixel 6a model force (T-08-09); no device model logging (T-08-10).

## TDD Gate Compliance

- RED: `d30904d` test(08-02)
- GREEN: `5707d10` feat(08-02)
- No separate refactor commit (not required)

## Next Phase Readiness

- Mid tier budgets ready for Plan 03 scripted worst-case certification on level-03
- Physical Pixel 6a gfxinfo + Results still owed to Plan 06 (PLT-03 measurement half)

## Self-Check: PASSED

- FOUND: `src/runtime/resolveQualityTier.ts`
- FOUND: `src/vfx/types.ts`
- FOUND: `app/_components/PlayingHost.tsx`
- FOUND: commits `d30904d`, `5707d10`, `6cc3575`
