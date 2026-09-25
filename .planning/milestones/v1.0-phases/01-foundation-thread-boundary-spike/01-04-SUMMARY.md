---
phase: 01-foundation-thread-boundary-spike
plan: 04
subsystem: infra
tags: [eas, skia, device-gate, fps, worklets, ad-hoc]

requires:
  - phase: 01-foundation-thread-boundary-spike
    provides: Expo scaffold, core stub, FPS harness (plans 01–03)
provides:
  - EAS development + profiling builds for Android and iOS (Skia 2.12.0)
  - docs/device-gate-results.md with SC-1/SC-2/SC-3 evidence + D-04 debt
  - docs/skia-version-decision.md Confirmed 2.12.0
affects: [phase-02, performance-gates, ARCH-01]

tech-stack:
  added: []
  patterns: [EAS profiling measurement artifacts, SpaceMono useFont HUD, device-gate docs]

key-files:
  created:
    - docs/device-gate-results.md
    - docs/skia-version-decision.md
    - .planning/milestones/v1.0-phases/01-foundation-thread-boundary-spike/01-04-SUMMARY.md
  modified:
    - docs/device-gate-results.md
    - docs/skia-version-decision.md
    - assets/fonts/SpaceMono-Regular.ttf
    - src/render/recordOverlay.ts
    - src/runtime/SpikeScreen.tsx

key-decisions:
  - "Skia 2.12.0 Confirmed — no D-16 fallback"
  - "Android SC-3 FPS deferred with human approval; Pixel 6a re-cert before MVP (D-04)"
  - "UI-thread worklet topology retained — no JS-rAF fallback"

patterns-established:
  - "Measurement APK/IPA labeled not-a-store-RC (T-01-07)"
  - "Production overlay env asserted unset (T-01-01)"

requirements-completed: [ARCH-01]

duration: multi-session
completed: 2026-09-20
---

# Phase 01 Plan 04: Device gate Summary

**EAS builds finished on Skia 2.12.0; iPhone 16 Pro SC-1/SC-2 development PASS; Android SC-3 FPS deferred with human `approved` + D-04 Pixel 6a re-cert debt.**

## Performance

- **Tasks:** 3 (preflight builds, human-verify checkpoint, finalize docs)
- **Files modified:** evidence docs + HUD font fix supporting SC-2 readability

## Accomplishments

- All four EAS artifacts (Android/iOS × development/profiling) finished on Skia 2.12.0
- Physical iPhone 16 Pro: install/launch + `worklet tick PASS` (dev-client + Metro)
- Production `EXPO_PUBLIC_PERF_OVERLAY` unset asserted
- Skia decision doc marked **Confirmed** (fallback unused)
- Android reference + `gfxinfo` SC-3 explicitly deferred — no topology fallback

## Task Commits

1. **Task 1: Preflight builds / stubs** — prior session commits (EAS artifacts recorded in results doc)
2. **Task 2: Human-verify** — resume signal `approved` 2026-09-20 (Android absent acknowledged)
3. **Task 3: Finalize evidence** — this SUMMARY + filled `docs/device-gate-results.md` / `docs/skia-version-decision.md`

HUD readability fix supporting the gate: `f963409` (SpaceMono `useFont`).

## Deviations

- **SC-3 / Android SC-1–SC-2 not measured** — no adb device. Human approved with **Pixel 6a re-certification required before MVP acceptance (D-04)**. Architecture bet unchanged.
- **iOS profiling SC-2** not re-run after HUD font fix — open follow-up when profiling IPA re-installed.

## Verification

- `npx vitest run` — pass (3 tests)
- `npx tsc --noEmit` — pass
- `npm run assert:skia` — `@shopify/react-native-skia@2.12.0 OK`
- `docs/device-gate-results.md` — PASS/DEFERRED + gfxinfo/Instruments tooling noted
- `docs/skia-version-decision.md` — Confirmed 2.12.0

## Next

- Attach Pixel 6a (or D-04 substitute), install profiling APK, capture two `gfxinfo` runs
- Optional: re-install iOS profiling IPA and confirm SC-2 once
- Phase verifier / roadmap advance
