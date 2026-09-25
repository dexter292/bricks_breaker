---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 03
subsystem: performance
tags: [certification, gfxinfo, worst-case, PLT-03, DEV-harness, Pixel-6a, Instruments]

requires:
  - phase: 08-showpiece-level-performance-certification-launch-baseline
    provides: resolveQualityTier Mid budgets + PlayingHost DEV tier force
  - phase: 07-feedback-neon-vfx-audio
    provides: spawnBurst / punchShake / allocateVfx particleCap
provides:
  - DEV Cert WC one-shot worst-case on level-03 (balls≥3, near-cap particles, shake)
  - phase8-certification.md protocol + A1 thresholds + empty Results
  - Phase 7 OPEN Pixel debt pointer to phase8-certification.md
affects:
  - 08-04 soak harness (SOAK_HARNESS flag)
  - 08-06 Pixel 6a gfxinfo Results fills

tech-stack:
  added: []
  patterns:
    - One-shot runtime inject via spawnMultiballFromPaddle + spawnBurst + punchShake (no DROP_CHANCE)
    - Cert UI __DEV__-only; CERT_HARNESS env may auto-arm only when __DEV__
    - Production EAS must never set EXPO_PUBLIC_CERT

key-files:
  created: []
  modified:
    - src/devflags.ts
    - src/runtime/useGameLoop.ts
    - app/_components/PlayingHost.tsx
    - docs/phase8-certification.md
    - docs/phase7-vfx-measurement.md

key-decisions:
  - "Cert inject leaves DOCKED via applyServe before multiball so processDocked cannot wipe balls"
  - "Primary trigger is __DEV__ Cert WC Pressable; EXPO_PUBLIC_CERT=1 auto-arms only under __DEV__"
  - "A1 lock: p50≤16.7ms; p95≤20ms OR ≤5% jank; RN Perf Monitor invalid"

patterns-established:
  - "Discrete cert inject on GameLoopHandle — zero per-frame cost when idle"
  - "Deferred inject after level-03 + Mid remount via certPendingRef + short timeout"

requirements-completed: []  # PLT-03 device evidence pending Plan 06

duration: 3min
completed: 2026-09-21
---

# Phase 8 Plan 03: Cert Worst-Case Harness Summary

**DEV-only scripted worst-case on level-03 (Cert WC: ≥3 balls + near Mid particle cap + shake) plus locked A1 gfxinfo/Instruments protocol in phase8-certification.md.**

> **Ledger note (T8.1):** Cert harness + protocol only — PLT-03 pass/fail numbers remain Plan 06 / pending device.

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-21T12:26:20Z
- **Completed:** 2026-09-21T12:29:07Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- `CERT_HARNESS` / `SOAK_HARNESS` flags in `devflags.ts`; Cert UI remains `__DEV__`-gated; production EAS unset
- `injectCertWorstCase` one-shot on `useGameLoop` handle: serve out of DOCKED → multiball ≥3 → particle flood → shake punch
- PlayingHost **Cert WC** forces `level-03` + Mid (remount-aware deferred inject); optional `__DEV__ && CERT_HARNESS` auto-arm
- `docs/phase8-certification.md` authoritative protocol: Pixel 6a Mid mandatory, A1 thresholds, iPhone Instruments, empty Results for Plan 06
- Phase 7 measurement doc points OPEN Pixel debt at phase8-certification.md (not claimed closed)

## Task Commits

Each task was committed atomically:

1. **Task 1: DEV scripted worst-case cert trigger** - `f6ebdba` (feat)
2. **Task 2: phase8-certification protocol + thresholds + Phase 7 pointer** - `c312f75` (docs)

**Plan metadata:** `9234902` (docs: complete plan)

## Files Created/Modified

- `src/devflags.ts` — `CERT_HARNESS` / `SOAK_HARNESS` + production hygiene comments
- `src/runtime/useGameLoop.ts` — `injectCertWorstCase` one-shot (no hot-path work when idle)
- `app/_components/PlayingHost.tsx` — `__DEV__` Cert WC + Mid/level-03 arming
- `docs/phase8-certification.md` — full protocol + A1 + empty Results
- `docs/phase7-vfx-measurement.md` — OPEN debt → phase8-certification.md

## Decisions Made

- Leave DOCKED with `applyServe` before multiball so `processDocked` cannot reset ball count next step
- Prefer Pressable as primary arm; env auto-arm only when `__DEV__ && CERT_HARNESS`
- Document that gate builds need `__DEV__` Cert WC present; never enable on production profile

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Device Results fills are Plan 06.

## Next Phase Readiness

- Plan 04 can consume `SOAK_HARNESS` on GameHost
- Plan 06 can fill empty Results rows using Cert WC + gfxinfo / Instruments steps in `docs/phase8-certification.md`
- PLT-03 protocol ready; pass/fail evidence still OPEN until device runs

## Self-Check: PASSED

- FOUND: `src/devflags.ts`, `docs/phase8-certification.md`, `docs/phase7-vfx-measurement.md`
- FOUND: commits `f6ebdba`, `c312f75`
- No stub patterns in task files that block the plan goal
- Threat surface: DEV cert inject — mitigated by `__DEV__` + no production `EXPO_PUBLIC_CERT` (T-08-11…T-08-15 as planned)

---
*Phase: 08-showpiece-level-performance-certification-launch-baseline*
*Completed: 2026-09-21*
