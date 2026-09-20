---
phase: 01-foundation-thread-boundary-spike
plan: 03
subsystem: runtime
tags: [skia, skpicture, useFrameCallback, worklets, fps-harness, overlay, arch-01]

requires:
  - phase: 01-foundation-thread-boundary-spike/01
    provides: Expo SDK 57 shell, Skia 2.12.0, worklets babel, EAS overlay profiles
  - phase: 01-foundation-thread-boundary-spike/02
    provides: Pure core allocateWorld/stepStub, Vitest, ESLint layer boundaries
provides:
  - UI-runtime fixed-timestep useFrameCallback host with runOnUI world allocation
  - Opaque SkPicture sprite harness (~256 default, cliff to 300)
  - Perf overlay drawn into the same picture (EXPO_PUBLIC_PERF_OVERLAY)
  - Thin app/ host mounting SpikeScreen + measurement methodology doc
affects:
  - 01-foundation-thread-boundary-spike plan-04 device builds and FPS gate
  - Later physics/input phases reusing the runtime host

tech-stack:
  added: []
  patterns:
    - World allocated via runOnUI; never constructed on JS thread
    - Module-scope PictureRecorder/Paint/font; one SharedValue<SkPicture> write per frame
    - Overlay flag frozen into worklet closure at mount (not __DEV__)
    - Cliff ramp via discrete Pressable → runOnUI SharedValue write

key-files:
  created:
    - src/devflags.ts
    - src/runtime/constants.ts
    - src/runtime/metrics.ts
    - src/runtime/useSpikeLoop.ts
    - src/runtime/SpikeScreen.tsx
    - src/render/overlayMetrics.ts
    - src/render/recordSprites.ts
    - src/render/recordOverlay.ts
    - src/render/SpikeCanvas.tsx
    - docs/measurement-methodology.md
  modified:
    - app/_layout.tsx
    - app/index.tsx
    - src/core/allocate.ts
    - eslint.config.js
    - docs/layer-contract.md

key-decisions:
  - "Rolling FPS = 1000/mean(interval) over 60 samples; empty SkPicture placeholder avoids null AnimatedProp"
  - "LC-12 allows runtime→render so useSpikeLoop can call recordFrame on the hot path"
  - "allocateWorld uses requested capacity as spriteCount (enables cliff ramp to 300)"

patterns-established:
  - "Pattern A/B/D/F: runOnUI allocate + useFrameCallback step + module-scope SkPicture record + in-picture overlay"
  - "D-14: no runOnJS/scheduleOnRN/setState on the frame path; overlay is Skia text inside the picture"

requirements-completed: [ARCH-01]

duration: 3min
completed: 2026-09-20
---

# Phase 01 Plan 03: FPS Harness Summary

**UI-thread fixed-timestep host with opaque SkPicture sprites (~256), in-picture ms/FPS/substep overlay, and thin Expo host ready for plan 04 device gates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T00:25:25Z
- **Completed:** 2026-09-20T00:28:35Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- `useSpikeLoop` allocates `SpikeWorld` via `runOnUI`, steps with fixed dt in `useFrameCallback`, records one `SkPicture` per frame — no `runOnJS` / `scheduleOnRN` / `setState`
- Opaque `SpikeCanvas` + overlay metrics (ms/frame, rolling FPS, substeps, p95/p99, over-budget, worklet PASS/FAIL) when `EXPO_PUBLIC_PERF_OVERLAY=1`
- Thin `app/` host mounts `SpikeScreen`; cliff-ramp Pressable behind `EXPO_PUBLIC_CLIFF_RAMP`; methodology doc covers D-08 measurement contract

## Task Commits

Each task was committed atomically:

1. **Task 1: Runtime loop — UI-allocated world + fixed timestep + metrics** - `9292751` (feat)
2. **Task 2: SkPicture render path + overlay + thin app host** - `caed0f0` (feat)

**Plan metadata:** (docs commit with this SUMMARY)

## Files Created/Modified

- `src/devflags.ts` — `PERF_OVERLAY` / `CLIFF_RAMP` from `EXPO_PUBLIC_*` (not `__DEV__`)
- `src/runtime/*` — constants, metrics ring, `useSpikeLoop`, `SpikeScreen`
- `src/render/*` — `recordSprites`, `recordOverlay`, `SpikeCanvas`, overlay metrics view type
- `app/_layout.tsx` / `app/index.tsx` — portrait lock, splash hide, mount spike
- `docs/measurement-methodology.md` — D-08 FPS derivation + dumpsys/Instruments + cliff trigger
- `eslint.config.js` / `docs/layer-contract.md` — LC-12 runtime→render
- `src/core/allocate.ts` — capacity equals spriteCount for cliff ramp

## Decisions Made

- Empty module-scope `SkPicture` as SharedValue initial value so `<Picture>` typing rejects `null`
- Overlay metrics type lives in `src/render/overlayMetrics.ts` so render never imports runtime (LC-03)
- Cliff ramp bumps `spriteTarget` via `runOnUI` from a Pressable outside the frame callback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] Allow runtime → render (LC-12)**
- **Found during:** Task 1
- **Issue:** Plan 02 ESLint boundaries only allowed runtime→core/runtime, but plan 03 / research require `useSpikeLoop` to import `recordFrame` from render
- **Fix:** Extended boundaries policy + documented LC-12 in `docs/layer-contract.md`
- **Files modified:** `eslint.config.js`, `docs/layer-contract.md`
- **Verification:** `npx eslint src/runtime` exits 0 with the import
- **Committed in:** `9292751`

**2. [Rule 2 - Correctness] allocateWorld capacity ceiling blocked cliff ramp**
- **Found during:** Task 1
- **Issue:** `spriteCount = min(cap, DEFAULT_SPRITE_CAP)` capped at 256, so cliff to 300 could not seed sprites
- **Fix:** Use requested capacity as spriteCount; default harness still passes 256
- **Files modified:** `src/core/allocate.ts`
- **Verification:** `npx vitest run` green
- **Committed in:** `9292751`

**3. [Rule 3 - Blocking] React Compiler immutability false positive on SharedValue mutation**
- **Found during:** Task 1
- **Issue:** `react-hooks/immutability` flagged intentional UI-runtime mutations of `world` fields inside `useFrameCallback`
- **Fix:** File-level eslint-disable with rationale (D-14 / Pattern A)
- **Files modified:** `src/runtime/useSpikeLoop.ts`
- **Verification:** `npx eslint src/runtime` exits 0
- **Committed in:** `9292751`

**4. [Rule 1 - Bug] SharedValue&lt;SkPicture | null&gt; rejected by Picture AnimatedProp**
- **Found during:** Task 2
- **Issue:** `tsc` — `null` not assignable to `AnimatedProp<SkPicture>`
- **Fix:** Initialize picture SharedValue with an empty module-scope `SkPicture`
- **Files modified:** `src/runtime/useSpikeLoop.ts`, `src/render/SpikeCanvas.tsx`
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `caed0f0`

**Total deviations:** 4 auto-fixed (2× Rule 2, 1× Rule 3, 1× Rule 1)
**Impact on plan:** Required for compile/lint and D-07 cliff capacity. No gameplay scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None for this plan — overlay/cliff flags are EAS env / local `EXPO_PUBLIC_*`. Plan 04 owns device builds and Apple/EAS credentials.

## Next Phase Readiness

- Ready for plan 04: profiling/release EAS builds, Pixel 6a `dumpsys gfxinfo`, iPhone install/feel
- Harness compiles; hot-path grep clean for `runOnJS`/`scheduleOnRN`
- Do not add gameplay physics yet (D-10 / D-12)

## Self-Check: PASSED

- FOUND: src/devflags.ts, src/runtime/useSpikeLoop.ts, src/runtime/SpikeScreen.tsx, src/render/SpikeCanvas.tsx, src/render/recordSprites.ts, src/render/recordOverlay.ts, app/index.tsx, docs/measurement-methodology.md
- FOUND commits: `9292751`, `caed0f0`
- `npx vitest run`, `npx eslint src/runtime src/render`, `npx tsc --noEmit` exit 0

---
*Phase: 01-foundation-thread-boundary-spike*
*Completed: 2026-09-20*
