---
phase: 07-feedback-neon-vfx-audio
plan: 00
subsystem: feedback
tags: [expo-audio, vfx, eslint-boundaries, nyquist, sfx, wave-0]

requires:
  - phase: 06-ui-shell-hud-persistence-platform-seams
    provides: services layer allow-list + PlayingHost cold path seams
provides:
  - expo-audio ~57.0.5 pinned with mic/recording/background disabled
  - runtime→vfx and render→vfx ESLint allow-lists (LC-13/LC-14)
  - eventBridge-only scheduleOnRN exception (LC-07 amendment)
  - seven original placeholder SFX WAVs under assets/sfx/
  - seven Nyquist it.todo stub suites for Plans 01–05
affects:
  - 07-01 through 07-05 (VFX/audio implementation plans)
  - AudioService / eventBridge drain wiring

tech-stack:
  added: [expo-audio@~57.0.5]
  patterns:
    - Wave 0 it.todo stubs before implementation
    - File-scoped ESLint override for single hot-path hop
    - Original procedural WAV placeholders (no third-party samples)

key-files:
  created:
    - assets/sfx/paddle_hit.wav
    - assets/sfx/brick_chip.wav
    - assets/sfx/brick_break.wav
    - assets/sfx/powerup_catch.wav
    - assets/sfx/life_lost.wav
    - assets/sfx/win.wav
    - assets/sfx/lose.wav
    - tests/vfx.trails.test.ts
    - tests/vfx.particles.test.ts
    - tests/vfx.shake.test.ts
    - tests/vfx.intensity.test.ts
    - tests/events.fx.test.ts
    - tests/audio.mapping.test.ts
    - tests/runtime.event-drain.test.ts
  modified:
    - package.json
    - package-lock.json
    - app.json
    - eslint.config.js
    - docs/layer-contract.md
    - .planning/milestones/v1.0-phases/07-feedback-neon-vfx-audio/07-VALIDATION.md

key-decisions:
  - "Installed expo-audio via npx expo install only — never expo-av (T-07-04)"
  - "Mic/recording/background all false in app.json plugin (T-07-01 / D-20)"
  - "scheduleOnRN ban lifted only for src/runtime/eventBridge.ts, not whole runtime/ (T-07-02)"
  - "Original Node-generated mono PCM beeps — distinct filenames for wiring (T-07-03)"

patterns-established:
  - "Wave 0 stub files import only { describe, it } from vitest — no src/vfx or audio yet"
  - "LC-13 runtime→vfx + LC-14 render→vfx documented and ESLint-enforced"

requirements-completed: [FX-01, FX-02, FX-03]

duration: 2min
completed: 2026-09-20
---

# Phase 07 Plan 00: Wave 0 Nyquist + expo-audio Summary

**Pinned expo-audio ~57.0.5 with mic off, opened LC-13/14 VFX boundaries plus eventBridge-only scheduleOnRN exception, and landed seven original SFX placeholders plus seven it.todo Nyquist stubs.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T13:17:51Z
- **Completed:** 2026-09-20T13:19:45Z
- **Tasks:** 2/2
- **Files modified:** 20

## Accomplishments

- Installed SDK 57–compatible `expo-audio` with privacy-safe plugin config (no mic, no Android RECORD_AUDIO, no background playback)
- Extended ESLint layer matrix for `runtime→vfx` / `render→vfx` and documented LC-13/LC-14; narrowed LC-07 exception to `eventBridge.ts` only
- Created seven original short mono WAV placeholders and seven Vitest `it.todo` suites so later plans have automated verify targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-audio + LC-07/vfx boundaries + placeholder SFX** - `b5678d7` (feat)
2. **Task 2: Wave 0 it.todo stubs + VALIDATION.md** - `cb6b669` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `package.json` / `package-lock.json` — `expo-audio ~57.0.5`
- `app.json` — expo-audio plugin with mic/recording/background false
- `eslint.config.js` — vfx allow-lists + eventBridge override
- `docs/layer-contract.md` — LC-13/14 + LC-07 notes amendment
- `assets/sfx/*.wav` — seven original placeholder cues
- `tests/vfx.*.test.ts`, `tests/events.fx.test.ts`, `tests/audio.mapping.test.ts`, `tests/runtime.event-drain.test.ts` — Wave 0 stubs
- `07-VALIDATION.md` — `wave_0_complete: true`, boxes checked, File Exists ✅

## Decisions Made

- Followed plan/threat model exactly: expo-audio only, mic off, file-scoped scheduleOnRN allowlist, original WAVs via Node RIFF writer (sox unavailable)

## Deviations from Plan

None - plan executed exactly as written.

`npx expo install` auto-appended a bare `"expo-audio"` plugin string; Task 1 immediately replaced it with the full mic-off config object required by the plan (planned work, not a deviation).

## Issues Encountered

None

## User Setup Required

None — no external services or secrets.

## Known Stubs

Intentional Wave 0 Nyquist stubs (filled by later Phase 7 plans):

| File | Stub | Reason |
|------|------|--------|
| `tests/vfx.trails.test.ts` | 4× `it.todo` | FX-01 implementation in later plan |
| `tests/vfx.particles.test.ts` | 4× `it.todo` | FX-02 particles |
| `tests/vfx.shake.test.ts` | 4× `it.todo` | FX-02 shake |
| `tests/vfx.intensity.test.ts` | 3× `it.todo` | FX-02 intensity |
| `tests/events.fx.test.ts` | 4× `it.todo` | FX-03 EventCode |
| `tests/audio.mapping.test.ts` | 3× `it.todo` | FX-03 AudioService |
| `tests/runtime.event-drain.test.ts` | 2× `it.todo` | FX-03 drain |

## Threat Flags

None — surfaces match plan threat model (T-07-01…T-07-05 mitigated as specified).

## Next Phase Ready

Plans 01–05 can implement VFX/audio against these stub verify paths without claiming MISSING test files.

## Self-Check: PASSED

- All seven WAV placeholders present under `assets/sfx/`
- All seven stub test files present under `tests/`
- Commits `b5678d7` and `cb6b669` present in git log
- `07-VALIDATION.md` has `wave_0_complete: true`
- STATE.md / ROADMAP.md not modified (orchestrator-owned)
