---
phase: 07-feedback-neon-vfx-audio
plan: 03
subsystem: feedback
tags: [expo-audio, AudioService, SFX, voice-pools, soft-fail, FX-03, tdd]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: Wave 0 audio.mapping.test.ts stubs + assets/sfx WAVs + expo-audio pin
  - phase: 07-feedback-neon-vfx-audio
    provides: EventCode 2–4,6–9 from Plan 01 (mapped via numeric literals)
provides:
  - Modular services/audio AudioService (preload/playBatch/release)
  - mapEventToSfx + SFX_VOLUME + VOICE_LIMITS
  - createDefaultAudioService soft-fail → memory
  - GREEN tests/audio.mapping.test.ts (mapping + voice reuse)
affects:
  - 07-05 PlayingHost drain wiring
  - runtime eventBridge → AudioService.playBatch

tech-stack:
  added: []
  patterns:
    - Numeric EventCode literals in services (no services→core import)
    - createAudioPlayer pools with oldest-voice reuse at VOICE_LIMITS
    - Soft-fail default factory mirrors storage AsyncStorage pattern

key-files:
  created:
    - src/services/audio/types.ts
    - src/services/audio/mapping.ts
    - src/services/audio/expoAudioService.ts
    - src/services/audio/index.ts
  modified:
    - tests/audio.mapping.test.ts

key-decisions:
  - "EventCode→SFX via numeric literals 2/3/4/6/7/8/9 — no services→core widen"
  - "Injectable createAudioServiceWithPlayers for Vitest; createDefault soft-fails to memory"
  - "PlayerFactory(source, sfxId) so pool tests count per-category voices"

patterns-established:
  - "AudioService seam: preload / playBatch / release; PlayingHost wires later"
  - "VITEST env skips expo-audio require (same soft-fail as storage)"

requirements-completed: [FX-03]

duration: 3min
completed: 2026-09-20
---

# Phase 07 Plan 03: Modular AudioService Summary

**Shipped modular `services/audio` on Expo SDK 57 `expo-audio` with pure EventCode→SFX mapping, fixed voice pools (oldest reuse), and soft-fail preload — GREEN without a device.**

## Performance

- **Duration:** 3min
- **Started:** 2026-09-20T13:23:21Z
- **Completed:** 2026-09-20T13:25:54Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Pure `mapEventToSfx` + `SFX_VOLUME` hierarchy (D-22) + `VOICE_LIMITS` (D-23); mapping file has zero `expo-audio` imports
- Pooled `createAudioPlayer` service with `playsInSilentMode: true`, seekTo(0)+play reuse, idempotent `release`
- Soft-fail `createDefaultAudioService` → memory when native missing; Vitest covers mapping + voice-limit reuse with mock players

## Task Commits

Each task was committed atomically:

1. **Task 1: mapping.ts + AudioService types (RED→GREEN)**
   - `22b5136` (test) — failing FX-03 mapping / volume / selectVoiceIndex expectations
   - `2c30f9f` (feat) — types + mapping + barrel
2. **Task 2: expoAudioService pools + soft-fail (RED→GREEN)**
   - `251bc6c` (test) — failing soft-fail / voice-pool / memory play expectations
   - `14aee5d` (feat) — expoAudioService pools + factory exports + GREEN tests

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/services/audio/types.ts` — `SfxId`, `AudioService`
- `src/services/audio/mapping.ts` — `mapEventToSfx`, `SFX_VOLUME`, `VOICE_LIMITS`, `selectVoiceIndex`
- `src/services/audio/expoAudioService.ts` — pools, memory fallback, default factory
- `src/services/audio/index.ts` — barrel exports
- `tests/audio.mapping.test.ts` — six GREEN tests (zero `it.todo`)

## Decisions Made

- Kept services→core banned: mapping uses EventCode numeric literals with comments
- Used injectable `createAudioServiceWithPlayers` plus memory service for unit tests (no native audio in Vitest)
- Extended factory signature with `sfxId` so warm-all-pools preload still asserts per-category limits

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] PlayerFactory includes sfxId**
- **Found during:** Task 2 (voice-limit test)
- **Issue:** Warming all SFX pools on preload meant a source-only factory counted every category’s players, so `created.length === VOICE_LIMITS.brick_chip` was false
- **Fix:** `PlayerFactory = (source, sfxId) => …`; test counts only `brick_chip` voices
- **Files modified:** `src/services/audio/expoAudioService.ts`, `tests/audio.mapping.test.ts`
- **Verification:** vitest 6/6 green; acceptance greps pass
- **Committed in:** `14aee5d`

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Testability only; runtime pool behavior unchanged.

## Issues Encountered

None

## User Setup Required

None — no external services or secrets.

## Known Stubs

None in this plan’s deliverables. PlayingHost / eventBridge drain wiring deferred to Plan 05 (intentional).

## Threat Flags

None — surfaces match plan threat model (T-07-13 fixed pools; T-07-14 soft-fail; T-07-15 mic stays off; T-07-16 assets via require of `assets/sfx/*.wav`).

## TDD Gate Compliance

- RED: `22b5136` — `test(07-03): add failing test for FX-03 audio mapping`
- GREEN: `2c30f9f` — `feat(07-03): implement FX-03 audio mapping and types`
- RED: `251bc6c` — `test(07-03): add failing test for FX-03 audio voice pools`
- GREEN: `14aee5d` — `feat(07-03): implement FX-03 pooled expo-audio AudioService`

## Self-Check: PASSED

- All audio service files present under `src/services/audio/`
- Commits `22b5136`, `2c30f9f`, `251bc6c`, `14aee5d` present in git log
- `tests/audio.mapping.test.ts` exists with expect assertions, zero `it.todo`
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
