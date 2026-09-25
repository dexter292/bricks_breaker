---
phase: D1-juice-presentation
plan: 02
subsystem: haptics
tags: [expo-haptics, impactAsync, soft-fail, coalesce, N-FX-03, vitest]

requires:
  - phase: D1-00
    provides: Memory HapticsService + coalesceHapticRank (4→light, 7→medium)
provides:
  - expo-haptics@~57.0.3 SDK pin via npx expo install
  - createExpoHapticsService with injectable impact + strongest-wins ≤1 call/batch
  - createDefaultHapticsService soft-fail probe → memory + __DEV__ warn
affects: [D1-03]

tech-stack:
  added: [expo-haptics@~57.0.3]
  patterns:
    - Soft native probe via requireOptionalNativeModule('ExpoHaptics') mirroring ExpoAudio (VITEST → false)
    - Injectable impactFn for Vitest; production lazy-requires expo-haptics
    - Local ImpactFeedbackStyle string constants avoid loading native entry in unit tests

key-files:
  created:
    - src/services/haptics/expoHapticsService.ts
  modified:
    - package.json
    - package-lock.json
    - src/services/haptics/index.ts
    - tests/haptics.batch-coalesce.test.ts

key-decisions:
  - "ImpactFeedbackStyle Light/Medium mirrored as local string consts for injectable spies (no top-level expo-haptics import)"
  - "createDefaultHapticsService always memory under VITEST; device needs rebuild for real Taptic"
  - "PlayingHost fan-out deferred to Plan 03 (no second scheduleOnRN)"

patterns-established:
  - "Haptics soft-fail = audio soft-fail: probe → warn → memory; try/catch around impactAsync"
  - "D-10 source contract asserts import/require only (comments documenting the ban OK)"

requirements-completed: [N-FX-03]

duration: 2min
completed: 2026-09-25
---

# Phase D1 Plan 02: expo-haptics Native Service Summary

**SDK-pinned `expo-haptics@~57.0.3` with `createExpoHapticsService` strongest-wins coalesce (≤1 `impactAsync`/batch) and `createDefaultHapticsService` soft-fail to memory when ExpoHaptics is missing.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-25T02:52:57Z
- **Completed:** 2026-09-25T02:54:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed `expo-haptics` via `npx expo install` → `~57.0.3` (SDK 57 bundled pin)
- Shipped `createExpoHapticsService` / `createDefaultHapticsService` mirroring audio soft-probe
- GREEN Vitest: 8× break → 1 Light; break+life → 1 Medium; paddle → 0; missing native → memory
- D-10 import contract: no reduce-motion / AccessibilityInfo / expo-battery under `src/services/haptics/`
- Mid `particleCap` 128 unchanged; no privacy-manifest collected-data types; PlayingHost untouched

## Task Commits

Each task was committed atomically (Task 2 TDD RED → GREEN):

1. **Task 1: Pin expo-haptics via npx expo install** — `c3f7975` (chore)
2. **Task 2 RED: failing expo soft-fail + coalesce tests** — `375df9d` (test)
3. **Task 2 GREEN: expoHapticsService soft-fail + coalesce** — `70c2b2a` (feat)

**Plan metadata:** _(docs commit after this SUMMARY)_

## Files Created/Modified

- `package.json` / `package-lock.json` — `expo-haptics: ~57.0.3`
- `src/services/haptics/expoHapticsService.ts` — impact wrapper, soft probe, coalesce
- `src/services/haptics/index.ts` — barrel exports for default/expo factories
- `tests/haptics.batch-coalesce.test.ts` — Plan 02 GREEN; PlayingHost todo retained for Plan 03

## Decisions Made

- Local `ImpactFeedbackStyle` string constants (`'light'` / `'medium'`) match expo enum values so spies work without loading the TS native entry in Node
- Soft-fail probe short-circuits under `process.env.VITEST` (same as audio) — no mock of `expo-modules-core` required for default-factory tests
- Owner must rebuild native binary before device UAT (`npx expo run:ios --device`) — documented, not blocking Plan 02

## Deviations from Plan

None - plan executed exactly as written.

_(Source-contract test initially matched a FORBIDDEN comment naming banned APIs; tightened to import/require patterns and reworded the comment — same GREEN commit, no extra deviation commit.)_

## TDD Gate Compliance

- RED commit present: `375df9d`
- GREEN commit present after RED: `70c2b2a`

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `tests/haptics.batch-coalesce.test.ts` | `it.todo` PlayingHost fan-out | Plan 03 |

## User Setup Required

**Native rebuild required before device UAT** (same class as expo-audio add):

```sh
npx expo run:ios --device
# or
npx expo run:android
```

Without rebuild, `createDefaultHapticsService` soft-falls to memory (no Taptic) with `__DEV__` warn.

## Threat Flags

None new beyond plan register — soft-fail (T-D1-08), coalesce (T-D1-09), no OS query (T-D1-10), no privacy collected-data types (T-D1-11).

## Next Phase Readiness

- Ready for Plan 03: wire `playFromBatch` into PlayingHost existing `playBatch` hop (≤1 `scheduleOnRN`)
- Do not AND with `useVfxIntensity`; ops docs (`HAPTICS.md`) owned by Plan 03

## Self-Check: PASSED

- FOUND: `src/services/haptics/expoHapticsService.ts`, `package.json` expo-haptics `~57.0.3`
- FOUND: `tests/haptics.batch-coalesce.test.ts` (11 passed, 1 todo)
- FOUND commits: `c3f7975`, `375df9d`, `70c2b2a`
- Mid `BUDGETS.mid.particleCap` = 128; `app.config.js` `NSPrivacyCollectedDataTypes: []` unchanged for haptics
