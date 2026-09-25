---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 00
subsystem: testing
tags: [expo-device, nyquist, vitest, privacy-manifest, store-docs, wave-0]

requires:
  - phase: 07-feedback-neon-vfx-audio
    provides: VFX/audio test patterns and phase7 measurement docs
provides:
  - expo-device SDK 57 pin for quality-tier memory heuristic
  - Nyquist it.todo stubs for Plans 01–04 verify paths
  - assert-privacy-manifest.mjs fail-closed smoke (Plan 05 fills app.json)
  - docs stubs for phase8 certification + store paperwork
affects:
  - 08-01 level-03 authorship
  - 08-02 quality tiers / VFX caps
  - 08-05 store / privacy manifests

tech-stack:
  added: [expo-device@~57.0.2]
  patterns: [Wave 0 it.todo stubs before feature API; fail-closed assert scripts]

key-files:
  created:
    - scripts/assert-privacy-manifest.mjs
    - docs/phase8-certification.md
    - docs/store/privacy-policy.md
    - docs/store/privacy-policy.html
    - docs/store/play-data-safety.md
    - docs/store/age-rating.md
    - docs/store/name-clearance.md
    - docs/store/originality-attestation.md
    - tests/runtime.quality-tiers.test.ts
    - tests/runtime.loadLevel.test.ts
    - tests/audio.release.test.ts
  modified:
    - package.json
    - package-lock.json
    - tests/levels.compile.test.ts
    - tests/vfx.particles.test.ts
    - .planning/milestones/v1.0-phases/08-showpiece-level-performance-certification-launch-baseline/08-VALIDATION.md

key-decisions:
  - "Pin expo-device via npx expo install only — never react-native-device-info"
  - "Privacy assert exists and fails closed until Plan 05 fills app.json"
  - "Store/privacy stubs marked STATUS:STUB with LIVE_URL: TBD (no fake URL)"

patterns-established:
  - "Wave 0 Nyquist: it.todo stubs so later plans never claim MISSING test files"
  - "Docs stubs with STATUS:STUB — Plan 0N fills markers for certification/store"

requirements-completed: []  # Wave 0 stubs only — harness/protocol/docs; no requirement closure

duration: 2min
completed: 2026-09-21
---

# Phase 8 Plan 00: Wave 0 Nyquist + Install Summary

**Pinned `expo-device@~57.0.2`, added fail-closed privacy assert + certification/store stubs, and landed Vitest `it.todo` Nyquist targets so Plans 01–06 have automated verify paths.**

> **Ledger note (T8.1):** Wave 0 delivered install stubs, cert/store doc scaffolding, and Nyquist targets only — not LVL-04, PLT-03, or PLT-04 closure.

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-21T08:25:44Z
- **Completed:** 2026-09-21T08:27:18Z
- **Tasks:** 2/2
- **Files modified:** 16

## Accomplishments

- Installed SDK 57-pinned `expo-device` (`npx expo install`); no `react-native-device-info`
- Created `scripts/assert-privacy-manifest.mjs` (expected fail until Plan 05 fills `app.json`)
- Authored `docs/phase8-certification.md` + `docs/store/*` stubs with `STATUS: STUB` and `LIVE_URL: TBD`
- Extended/created Nyquist stubs (`levels.compile`, quality-tiers, loadLevel, audio.release, vfx.particles); set `wave_0_complete: true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-device + docs stubs + privacy assert script** - `855e7f0` (feat)
2. **Task 2: Wave 0 Nyquist stubs + VALIDATION.md** - `4d51587` (test)

**Plan metadata:** `d07b317` (docs: complete plan)

## Files Created/Modified

- `package.json` / `package-lock.json` — `expo-device@~57.0.2`
- `scripts/assert-privacy-manifest.mjs` — privacyManifests fail-closed smoke
- `docs/phase8-certification.md` — Results table stub; Pixel 6a Mid; package id
- `docs/store/*` — privacy policy (md+html), Play Data Safety, age rating, name clearance, originality
- `tests/runtime.quality-tiers.test.ts` — PLT-03 tier heuristic todos
- `tests/runtime.loadLevel.test.ts` — LVL-04 default level-03 todos
- `tests/audio.release.test.ts` — soak release idempotency todos
- `tests/levels.compile.test.ts` — level-03 compile todos (01/02 still green)
- `tests/vfx.particles.test.ts` — particleCap/trailMax/glowScale todos
- `08-VALIDATION.md` — Wave 0 boxes + File Exists ✅ for 08-W0-01…05

## Decisions Made

- Expo Device API only via `npx expo install expo-device` (D-10 / AGENTS.md)
- Privacy assert soft-fails by design in Wave 0; Plan 05 owns `app.json` keys
- No invented level-03 JSON — compile stubs are `it.todo` only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external services in Wave 0.

## Known Stubs

Intentional Wave 0 placeholders (Plans 01–05 fill):

| File | Stub | Reason |
|------|------|--------|
| `tests/*.todo` | `it.todo` assertions | Feature API lands later plans |
| `docs/phase8-certification.md` | Empty Results row | Device measurement Plans 03/04 |
| `docs/store/*` | STATUS:STUB / LIVE_URL:TBD | Plan 05 store paperwork |
| `scripts/assert-privacy-manifest.mjs` | exits 1 until keys exist | Plan 05 fills `privacyManifests` |

## Threat Flags

None — no new network endpoints or auth paths; privacy stubs do not claim a live URL.

## Next Phase Readiness

Wave 0 complete. Plan 01 can author level-03 and convert compile todos; Plan 02 can implement quality tiers against stub tests.

## Self-Check: PASSED

- FOUND: `scripts/assert-privacy-manifest.mjs`
- FOUND: `docs/phase8-certification.md`
- FOUND: `docs/store/privacy-policy.md`
- FOUND: `tests/runtime.quality-tiers.test.ts`
- FOUND: `tests/runtime.loadLevel.test.ts`
- FOUND: `tests/audio.release.test.ts`
- FOUND: commit `855e7f0`
- FOUND: commit `4d51587`
- FOUND: `wave_0_complete: true` in 08-VALIDATION.md
