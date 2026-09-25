---
phase: 07-feedback-neon-vfx-audio
plan: 02
subsystem: feedback
tags: [vfx, trails, particles, shake, intensity, stepVfx, audio-batch, FX-01, FX-02, tdd]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: Wave 0 vfx.*.test.ts + runtime.event-drain stubs; EventCode.LIFE_LOST (Plan 01)
provides:
  - Pure deletable src/vfx/ SoA layer (intensity, trails, particles, shake, stepVfx)
  - consumeEventsForVfx + appendEventsForAudio multi-substep batch
  - GREEN Vitest suites for intensity/trails/shake/particles/event-drain
affects:
  - 07-04+ render wiring (trails/particles/shake draw)
  - 07-05 useGameLoop drain (stepVfx + audio batch hop)

tech-stack:
  added: []
  patterns:
    - Cosmetic SoA VFX with typed-array pools; no React/Skia/host RNG
    - stepVfx composer for useGameLoop; pushTrail stays in substep
    - Snapshot events into AudioBatchSoA after each step before clearEvents

key-files:
  created:
    - src/vfx/types.ts
    - src/vfx/intensity.ts
    - src/vfx/trails.ts
    - src/vfx/particles.ts
    - src/vfx/shake.ts
    - src/vfx/stepVfx.ts
    - src/vfx/consumeEvents.ts
    - src/vfx/audioBatch.ts
    - src/vfx/index.ts
  modified:
    - tests/vfx.intensity.test.ts
    - tests/vfx.trails.test.ts
    - tests/vfx.shake.test.ts
    - tests/vfx.particles.test.ts
    - tests/runtime.event-drain.test.ts

key-decisions:
  - "trailLength uses max(2,min(5,round(5*i))) so intensity 0.2→2 (locked assert over broken 3+2*i comment)"
  - "Intensity baked into shakeAmp at punch; stepShake only decays ×0.85"
  - "Audio batch drop-newest on overflow; never grows Int16Array"

patterns-established:
  - "src/vfx is Node-testable and deletable; consumers import barrel only"
  - "consumeEventsForVfx never clears the ring; appendEventsForAudio copies codes only"

requirements-completed: [FX-01, FX-02]

duration: 4min
completed: 2026-09-20
---

# Phase 07 Plan 02: Pure VFX Math + Event Drain Summary

**Deletable `src/vfx/` SoA layer with intensity/trails/particles/shake/`stepVfx`, plus multi-substep `appendEventsForAudio` batching — all GREEN under Vitest with no React/Skia.**

## Performance

- **Duration:** 4min
- **Started:** 2026-09-20T13:23:04Z
- **Completed:** 2026-09-20T13:27:18Z
- **Tasks:** 2/2
- **Files modified:** 14

## Accomplishments

- Implemented FX-01/FX-02 numeric contracts (intensity 0.2/1.0, trail ≥2, pool 128/192, shake cap 2.5 / decay 0.85)
- Exported `stepVfx` composing `stepParticles` + `stepShake` for the Plan 05 game-loop contract
- Event→VFX mapping + fixed-cap audio batch retains codes across `clearEvents` between substeps

## Task Commits

Each task was committed atomically:

1. **Task 1: Intensity + trails + shake + particles + stepVfx (RED→GREEN)**
   - `f305d38` (test) — failing FX-01/FX-02 expects
   - `0ef438b` (feat) — pure VFX math + `stepVfx` barrel
2. **Task 2: consumeEvents + audioBatch multi-substep drain (RED→GREEN)**
   - `278b1e9` (test) — failing event-drain expects
   - `80c811f` (feat) — `consumeEventsForVfx` + `appendEventsForAudio`

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/vfx/types.ts` — `VfxState` SoA + pool/impulse constants + `allocateVfx`
- `src/vfx/intensity.ts` — `intensityFromReduceMotion`, `trailLength`, `clampIntensity`
- `src/vfx/trails.ts` — `pushTrail` per-ball typed-array ring
- `src/vfx/particles.ts` — chip/destroy `spawnBurst` + `stepParticles` with oldest eviction
- `src/vfx/shake.ts` — `punchShake` / `stepShake` / `shakeOffset` (literals 2.5 / 0.85)
- `src/vfx/stepVfx.ts` — frame composer for useGameLoop
- `src/vfx/consumeEvents.ts` — BRICK_HIT→chip, BRICK_BREAK→destroy+1.2, LIFE_LOST→2.0
- `src/vfx/audioBatch.ts` — fixed Int16Array batch, drop-newest overflow
- `src/vfx/index.ts` — deletable barrel including `stepVfx` / consume / audio
- `tests/vfx.*.test.ts` + `tests/runtime.event-drain.test.ts` — zero `it.todo`, 24 green

## Decisions Made

- Used `round(5 * intensity)` for `trailLength` so locked endpoints (1.0→5, 0.2→2) hold; plan comment formula `round(3+2*i)` yields 3 at 0.2
- Shake amplitude scaled by intensity at punch time; decay is intensity-agnostic
- Brick RGB resolved via core-only HP/flags palette (optional callback override)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] trailLength formula mismatched locked asserts**
- **Found during:** Task 1 GREEN
- **Issue:** `Math.round(3 + 2 * 0.2)` = 3, but plan/UI-SPEC require `trailLength(0.2) === 2`
- **Fix:** `Math.max(2, Math.min(5, Math.round(5 * intensity)))`
- **Files modified:** `src/vfx/intensity.ts`
- **Commit:** `0ef438b`

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Correctness-only; endpoints match UI-SPEC / acceptance.

## Issues Encountered

None beyond the trailLength formula mismatch above.

## User Setup Required

None — no external services or secrets.

## Known Stubs

None in this plan's deliverables. Remaining Wave 0 stubs owned by other Phase 7 plans:

| File | Stub | Reason |
|------|------|--------|
| `tests/audio.mapping.test.ts` | may still be Wave 0 / Plan 03 | AudioService mapping |

## Threat Flags

None — particle pool hard-cap, audio batch fixed cap, `clampIntensity`, and banned host RNG match T-07-09…T-07-12.

## TDD Gate Compliance

- RED: `f305d38`, `278b1e9`
- GREEN: `0ef438b`, `80c811f`

## Self-Check: PASSED

- All nine `src/vfx/*` modules present
- All five Vitest suites present with zero `it.todo`
- Commits `f305d38`, `0ef438b`, `278b1e9`, `80c811f` present in git log
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
